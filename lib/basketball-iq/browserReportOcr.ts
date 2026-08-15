"use client";

import { parseBasketballReportOcr, type BasketballReportOcrResult, type OcrRosterMember } from "@/lib/basketball-iq/reportOcr";

type Progress = (message: string) => void;

async function renderPage(document: { getPage: (pageNumber: number) => Promise<any> }, pageNumber: number) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2.8 });
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not prepare the PDF page for OCR.");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export async function readBasketballReportPdf(
  file: File,
  roster: OcrRosterMember[],
  onProgress: Progress,
): Promise<BasketballReportOcrResult> {
  const [pdfjs, tesseract] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("tesseract.js"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  if (document.numPages < 5) {
    await document.destroy();
    throw new Error("This report needs at least five pages to locate the match and both team tables.");
  }

  const worker = await tesseract.createWorker("eng", 1, {
    logger(message) {
      if (message.status === "recognizing text") onProgress(`Reading report · ${Math.round(Number(message.progress || 0) * 100)}%`);
    },
  });
  await worker.setParameters({
    tessedit_pageseg_mode: tesseract.PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1",
  });
  const output: Record<string, string> = {};
  try {
    const selected = [1, 3, 4, 5];
    for (let index = 0; index < selected.length; index += 1) {
      const pageNumber = selected[index];
      onProgress(`Reading report page ${index + 1} of ${selected.length}…`);
      const canvas = await renderPage(document, pageNumber);
      const result = await worker.recognize(canvas);
      output[`page${pageNumber}`] = result.data.text || "";
      canvas.width = 1;
      canvas.height = 1;
    }
  } finally {
    await worker.terminate();
    await document.destroy();
  }
  return parseBasketballReportOcr({
    page1: output.page1 || "",
    page3: output.page3 || "",
    page4: output.page4 || "",
    page5: output.page5 || "",
  }, roster, file.name);
}
