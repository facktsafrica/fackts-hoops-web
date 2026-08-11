export type ParsedRosterFile = {
  fileType: "csv" | "xlsx";
  headers: string[];
  rows: Record<string, string>[];
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_ZIP_ENTRY_BYTES = 12 * 1024 * 1024;

function uniqueHeaders(values: string[]) {
  const used = new Map<string, number>();
  return values.map((value, index) => {
    const base = value.trim() || `column_${index + 1}`;
    const count = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), count + 1);
    return count ? `${base}_${count + 1}` : base;
  });
}

function rowsFromMatrix(matrix: string[][]): ParsedRosterFile["rows"] {
  const firstRow = matrix.findIndex((row) => row.some((value) => value.trim()));
  if (firstRow < 0) return [];
  const headers = uniqueHeaders(matrix[firstRow].map((value) => value.trim()));
  return matrix
    .slice(firstRow + 1, firstRow + 1 + MAX_ROWS)
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""])));
}

function parseDelimited(value: string) {
  const delimiter = value.split(/\r?\n/, 1)[0]?.includes("\t") ? "\t" : ",";
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && value[index + 1] === "\n") index += 1;
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    matrix.push(row);
  }
  return matrix;
}

type ZipEntry = {
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function zipDirectory(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let endOffset = -1;
  for (let offset = Math.max(0, buffer.byteLength - 65_557); offset <= buffer.byteLength - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) endOffset = offset;
  }
  if (endOffset < 0) throw new Error("This Excel file is not a valid XLSX archive.");

  const entries = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder();
  const directory = new Map<string, ZipEntry>();

  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("The XLSX directory is damaged.");
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    if (uncompressedSize > MAX_ZIP_ENTRY_BYTES) throw new Error("The XLSX workbook contains an oversized worksheet.");
    directory.set(name, { compression, compressedSize, uncompressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return directory;
}

async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer);
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new Error("The XLSX worksheet entry is damaged.");
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(buffer.slice(start, start + entry.compressedSize));
  if (entry.compression === 0) return compressed;
  if (entry.compression !== 8) throw new Error("This XLSX compression method is not supported.");
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const inflated = new Uint8Array(await new Response(stream).arrayBuffer());
  if (inflated.byteLength > MAX_ZIP_ENTRY_BYTES) throw new Error("The XLSX worksheet expands beyond the safe limit.");
  return inflated;
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return letters.split("").reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function parseXlsx(buffer: ArrayBuffer) {
  const directory = zipDirectory(buffer);
  const decoder = new TextDecoder();
  const sharedEntry = directory.get("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedEntry) {
    const xml = new DOMParser().parseFromString(decoder.decode(await readZipEntry(buffer, sharedEntry)), "application/xml");
    for (const item of Array.from(xml.getElementsByTagName("si"))) {
      shared.push(Array.from(item.getElementsByTagName("t")).map((node) => node.textContent ?? "").join(""));
    }
  }

  const sheetName = Array.from(directory.keys()).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort()[0];
  if (!sheetName) throw new Error("The XLSX workbook has no readable worksheet.");
  const sheetEntry = directory.get(sheetName);
  if (!sheetEntry) throw new Error("The first XLSX worksheet could not be opened.");
  const sheet = new DOMParser().parseFromString(decoder.decode(await readZipEntry(buffer, sheetEntry)), "application/xml");
  const matrix: string[][] = [];

  for (const rowNode of Array.from(sheet.getElementsByTagName("row")).slice(0, MAX_ROWS + 1)) {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const index = columnIndex(cell.getAttribute("r") ?? "A1");
      const type = cell.getAttribute("t");
      const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      const inline = Array.from(cell.getElementsByTagName("t")).map((node) => node.textContent ?? "").join("");
      row[index] = type === "s" ? shared[Number(raw)] ?? "" : type === "inlineStr" ? inline : raw;
    }
    matrix.push(row.map((value) => value ?? ""));
  }
  return matrix;
}

export async function parseRosterFile(file: File): Promise<ParsedRosterFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Roster files must be 5 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv" || extension === "tsv") {
    const matrix = parseDelimited(await file.text());
    const first = matrix.find((row) => row.some((value) => value.trim())) ?? [];
    const rows = rowsFromMatrix(matrix);
    if (!rows.length) throw new Error("The CSV contains no roster rows.");
    return { fileType: "csv", headers: uniqueHeaders(first), rows };
  }
  if (extension === "xlsx") {
    const matrix = await parseXlsx(await file.arrayBuffer());
    const first = matrix.find((row) => row.some((value) => value.trim())) ?? [];
    const rows = rowsFromMatrix(matrix);
    if (!rows.length) throw new Error("The XLSX workbook contains no roster rows on its first sheet.");
    return { fileType: "xlsx", headers: uniqueHeaders(first), rows };
  }
  if (extension === "xls") {
    throw new Error("Legacy .xls files are not supported. Save the workbook as .xlsx and upload it again.");
  }
  throw new Error("Choose a CSV or XLSX roster file.");
}
