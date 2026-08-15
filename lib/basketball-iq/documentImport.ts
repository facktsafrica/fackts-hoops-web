import { inflateRawSync } from "node:zlib";

export type ImportedStatRow = {
  player_name: string;
  jersey_number?: string;
  roster_member_id?: string | null;
  player_id?: string | null;
  points: number;
  rebounds: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes: number;
  two_made: number;
  two_attempted: number;
  three_made: number;
  three_attempted: number;
  ft_made: number;
  ft_attempted: number;
  plus_minus: number;
};

type ZipEntry = { path: string; data: Buffer };

const HEADER_ALIASES: Record<string, string> = {
  player: "player_name",
  playername: "player_name",
  name: "player_name",
  athlete: "player_name",
  fullname: "player_name",
  jersey: "jersey_number",
  jerseyno: "jersey_number",
  number: "jersey_number",
  no: "jersey_number",
  pts: "points",
  point: "points",
  points: "points",
  reb: "rebounds",
  rebounds: "rebounds",
  totalrebounds: "rebounds",
  oreb: "offensive_rebounds",
  offreb: "offensive_rebounds",
  offensiverebounds: "offensive_rebounds",
  dreb: "defensive_rebounds",
  defreb: "defensive_rebounds",
  defensiverebounds: "defensive_rebounds",
  ast: "assists",
  assists: "assists",
  stl: "steals",
  steals: "steals",
  blk: "blocks",
  blocks: "blocks",
  to: "turnovers",
  tov: "turnovers",
  turnovers: "turnovers",
  pf: "fouls",
  foul: "fouls",
  fouls: "fouls",
  min: "minutes",
  mins: "minutes",
  minutes: "minutes",
  twopm: "two_made",
  twomade: "two_made",
  twoptmade: "two_made",
  twofga: "two_attempted",
  twopa: "two_attempted",
  twoattempted: "two_attempted",
  twoptattempted: "two_attempted",
  twopma: "two_pair",
  twoptma: "two_pair",
  threepm: "three_made",
  threemade: "three_made",
  threeptmade: "three_made",
  threepa: "three_attempted",
  threeattempted: "three_attempted",
  threeptattempted: "three_attempted",
  threepma: "three_pair",
  threeptma: "three_pair",
  ftm: "ft_made",
  freethrowsmade: "ft_made",
  fta: "ft_attempted",
  freethrowsattempted: "ft_attempted",
  ftma: "ft_pair",
  plusminus: "plus_minus",
  pm: "plus_minus",
};

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function unzip(buffer: Buffer): ZipEntry[] {
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("The Office document is not a readable ZIP package.");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < entryCount && cursor + 46 <= buffer.length; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const path = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");
    cursor += 46 + fileNameLength + extraLength + commentLength;
    if (!path || path.endsWith("/") || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) continue;
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(start, start + compressedSize);
    if (method === 0) entries.push({ path, data: Buffer.from(compressed) });
    else if (method === 8) entries.push({ path, data: inflateRawSync(compressed) });
  }
  return entries;
}

function columnIndex(reference: string) {
  const letters = reference.replace(/[^A-Z]/gi, "").toUpperCase();
  let output = 0;
  for (const letter of letters) output = output * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, output - 1);
}

function xlsxText(buffer: Buffer) {
  const entries = unzip(buffer);
  const byPath = new Map(entries.map((entry) => [entry.path, entry.data.toString("utf8")]));
  const sharedXml = byPath.get("xl/sharedStrings.xml") || "";
  const shared = Array.from(sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((match) =>
    decodeXml(Array.from(match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((text) => text[1]).join(""))
  );
  const sheetPath = Array.from(byPath.keys()).filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path)).sort()[0];
  if (!sheetPath) throw new Error("No worksheet was found in this Excel file.");
  const xml = byPath.get(sheetPath) || "";
  const rows: string[] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const reference = attrs.match(/\br="([^"]+)"/)?.[1] || String.fromCharCode(65 + cells.length);
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] || "";
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
        ?? Array.from(body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((item) => item[1]).join("");
      const value = type === "s" ? shared[Number(raw)] ?? "" : decodeXml(raw || "");
      cells[columnIndex(reference)] = value.replace(/[\r\n\t]+/g, " ").trim();
    }
    rows.push(cells.map((cell) => cell || "").join("\t"));
  }
  return rows.join("\n");
}

function docxText(buffer: Buffer) {
  const xml = unzip(buffer).find((entry) => entry.path === "word/document.xml")?.data.toString("utf8");
  if (!xml) throw new Error("No readable Word document body was found.");
  const tableRows = Array.from(xml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)).map((row) =>
    Array.from(row[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)).map((cell) =>
      decodeXml(Array.from(cell[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((text) => text[1]).join(" ")).trim()
    ).join("\t")
  );
  if (tableRows.length) return tableRows.join("\n");
  return Array.from(xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)).map((paragraph) =>
    decodeXml(Array.from(paragraph[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((text) => text[1]).join(" ")).trim()
  ).filter(Boolean).join("\n");
}

async function pdfText(buffer: Buffer) {
  const [pdfjs, pdfWorker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker ||= pdfWorker;
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = new Map<number, Array<{ x: number; right: number; text: string }>>();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = Math.round(Number(item.transform?.[5] || 0) / 2) * 2;
        const current = lines.get(y) || [];
        const x = Number(item.transform?.[4] || 0);
        current.push({ x, right: x + Number(item.width || 0), text: item.str.trim() });
        lines.set(y, current);
      }
      pages.push(Array.from(lines.entries())
        .sort(([left], [right]) => right - left)
        .map(([, items]) => items.sort((left, right) => left.x - right.x).reduce((line, item, index, sorted) => {
          if (!index) return item.text;
          const gap = item.x - sorted[index - 1].right;
          return `${line}${gap > 12 ? "\t" : " "}${item.text}`;
        }, ""))
        .join("\n"));
    }
  } finally {
    await document.destroy();
  }

  return pages.filter(Boolean).join("\n");
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/2/g, "two").replace(/3/g, "three").replace(/\+/g, "plus").replace(/-/g, "").replace(/[^a-z0-9]/g, "");
}

function number(value: string | undefined, allowNegative = false) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || (!allowNegative && parsed < 0)) return 0;
  return parsed;
}

function pair(value: string | undefined) {
  const match = String(value || "").match(/(-?\d+(?:\.\d+)?)\s*[-/]\s*(-?\d+(?:\.\d+)?)/);
  return match ? [Math.max(0, Number(match[1])), Math.max(0, Number(match[2]))] : [0, 0];
}

function splitLine(line: string, delimiter: string) {
  if (delimiter !== ",") return line.split(delimiter).map((cell) => cell.trim());
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(current.trim()); current = ""; }
    else current += character;
  }
  cells.push(current.trim());
  return cells;
}

function parseRows(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let headerIndex = -1;
  let delimiter = "\t";
  let fields: string[] = [];
  for (let index = 0; index < Math.min(lines.length, 30); index += 1) {
    const candidates = ["\t", ",", ";", "|"].map((candidate) => ({ candidate, cells: splitLine(lines[index], candidate) }));
    const best = candidates.sort((a, b) => b.cells.length - a.cells.length)[0];
    const mapped = best.cells.map((cell) => HEADER_ALIASES[normalizeHeader(cell)] || "");
    if (mapped.includes("player_name") && mapped.filter(Boolean).length >= 3) {
      headerIndex = index;
      delimiter = best.candidate;
      fields = mapped;
      break;
    }
  }
  if (headerIndex < 0) return [] as ImportedStatRow[];

  const output: ImportedStatRow[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const cells = splitLine(line, delimiter);
    const record: Record<string, string> = {};
    fields.forEach((field, index) => { if (field) record[field] = cells[index] || ""; });
    const playerName = String(record.player_name || "").trim();
    if (!playerName || /^(total|team)$/i.test(playerName)) continue;
    const [twoPairMade, twoPairAttempted] = pair(record.two_pair);
    const [threePairMade, threePairAttempted] = pair(record.three_pair);
    const [ftPairMade, ftPairAttempted] = pair(record.ft_pair);
    const offensiveRebounds = number(record.offensive_rebounds);
    const defensiveRebounds = number(record.defensive_rebounds);
    const twoMade = number(record.two_made) || twoPairMade;
    const twoAttempted = number(record.two_attempted) || twoPairAttempted;
    const threeMade = number(record.three_made) || threePairMade;
    const threeAttempted = number(record.three_attempted) || threePairAttempted;
    const ftMade = number(record.ft_made) || ftPairMade;
    const ftAttempted = number(record.ft_attempted) || ftPairAttempted;
    output.push({
      player_name: playerName.slice(0, 180),
      jersey_number: String(record.jersey_number || "").trim().slice(0, 24) || undefined,
      points: number(record.points) || twoMade * 2 + threeMade * 3 + ftMade,
      rebounds: number(record.rebounds) || offensiveRebounds + defensiveRebounds,
      offensive_rebounds: offensiveRebounds,
      defensive_rebounds: defensiveRebounds,
      assists: number(record.assists),
      steals: number(record.steals),
      blocks: number(record.blocks),
      turnovers: number(record.turnovers),
      fouls: number(record.fouls),
      minutes: number(record.minutes),
      two_made: twoMade,
      two_attempted: Math.max(twoMade, twoAttempted),
      three_made: threeMade,
      three_attempted: Math.max(threeMade, threeAttempted),
      ft_made: ftMade,
      ft_attempted: Math.max(ftMade, ftAttempted),
      plus_minus: number(record.plus_minus, true),
    });
  }
  return output;
}

export async function parseStatDocument(buffer: Buffer, fileName: string, mimeType: string) {
  const extension = fileName.toLowerCase().split(".").pop() || "";
  const warnings: string[] = [];
  let extracted = "";
  if (["csv", "tsv", "txt"].includes(extension) || mimeType.startsWith("text/")) extracted = buffer.toString("utf8");
  else if (extension === "xlsx") extracted = xlsxText(buffer);
  else if (extension === "docx") extracted = docxText(buffer);
  else if (extension === "pdf") {
    extracted = await pdfText(buffer);
    if (extracted.trim()) warnings.push("PDF text was extracted using its embedded font mapping. Confirm every player and value before saving.");
    else warnings.push("This PDF is image-only, scanned, or contains no readable text. Upload CSV/XLSX for automatic rows, or enter the attached scorer sheet in the review grid.");
  } else if (["xls", "doc"].includes(extension)) {
    warnings.push(`Legacy .${extension} files are stored as evidence but cannot be extracted safely. Save as .${extension === "xls" ? "xlsx" : "docx"} or CSV for automatic rows.`);
  } else {
    warnings.push("This file type was stored but is not supported for automatic stat extraction.");
  }

  const rows = extracted ? parseRows(extracted) : [];
  if (!rows.length && extracted.trim()) warnings.push("Readable text was found, but no structured player table matched. Include Player plus at least two stat columns such as PTS, REB and AST; the original file remains attached as evidence.");
  return {
    rows,
    warnings,
    extraction_status: rows.length ? (warnings.length ? "partial" : "parsed") : "review_required",
  } as const;
}
