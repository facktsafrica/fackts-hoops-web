"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  parseBasketballReportOcr,
  type BasketballReportOcrResult,
  type OcrRosterMember,
} from "@/lib/basketball-iq/reportOcr";

type Progress = (message: string) => void;

async function extractNativePageText(page: any) {
  const textContent = await page.getTextContent();

  let output = "";

  for (const item of textContent.items || []) {
    if (!item || typeof item.str !== "string") {
      continue;
    }

    output += item.str;

    if (item.hasEOL) {
      output += "\n";
    } else {
      output += " ";
    }
  }

  return output
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function renderPage(
  document: {
    getPage: (pageNumber: number) => Promise<any>;
  },
  pageNumber: number,
) {
  const page =
    await document.getPage(
      pageNumber,
    );

  const viewport =
    page.getViewport({
      scale: 2.8,
    });

  const canvas =
    window.document.createElement(
      "canvas",
    );

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      },
    );

  if (!context) {
    throw new Error(
      "This browser could not prepare the PDF page for OCR.",
    );
  }

  canvas.width =
    Math.ceil(
      viewport.width,
    );

  canvas.height =
    Math.ceil(
      viewport.height,
    );

  await page.render({
    canvasContext:
      context,
    viewport,
  }).promise;

  return canvas;
}

function hasUsefulResult(
  result: BasketballReportOcrResult,
) {
  return Boolean(
    result.match &&
      result.home_rows.length &&
      result.away_rows.length,
  );
}

function totalTextLength(
  pages: string[],
) {
  return pages.reduce(
    (sum, page) =>
      sum +
      page.replace(
        /\s/g,
        "",
      ).length,
    0,
  );
}

export async function readBasketballReportPdf(
  file: File,
  roster: OcrRosterMember[],
  onProgress: Progress,
): Promise<BasketballReportOcrResult> {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  pdfjs.GlobalWorkerOptions.workerSrc =
    new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

  const loadingTask =
    pdfjs.getDocument({
      data:
        new Uint8Array(
          await file.arrayBuffer(),
        ),
    });

  const document =
    await loadingTask.promise;

  const nativePages:
    string[] = [];

  try {
    /*
     * FIRST CHOICE:
     * Read the PDF's own text layer.
     *
     * There is deliberately NO minimum-page rule.
     * A valid basketball report can be one page,
     * two pages, five pages, or many pages.
     */
    for (
      let pageNumber = 1;
      pageNumber <=
      document.numPages;
      pageNumber += 1
    ) {
      onProgress(
        `Reading PDF text · page ${pageNumber} of ${document.numPages}`,
      );

      const page =
        await document.getPage(
          pageNumber,
        );

      nativePages.push(
        await extractNativePageText(
          page,
        ),
      );
    }

    const nativeResult =
      parseBasketballReportOcr(
        nativePages,
        roster,
        file.name,
      );

    /*
     * If native PDF text already gave us a matchup
     * and both team tables, stop here.
     * This is faster and more reliable than OCR.
     */
    if (
      hasUsefulResult(
        nativeResult,
      )
    ) {
      return {
        ...nativeResult,
        warnings: [
          "Report read from the PDF text layer. Review player matching and figures before submission.",
          ...nativeResult.warnings,
        ],
      };
    }

    /*
     * Some PDFs expose only fragments of their text.
     * If enough useful content was extracted to create
     * a reviewable import, keep it rather than rejecting
     * the whole file.
     */
    const nativeTextSize =
      totalTextLength(
        nativePages,
      );

    if (
      nativeResult.match &&
      nativeTextSize >= 500 &&
      (
        nativeResult.home_rows.length ||
        nativeResult.away_rows.length
      )
    ) {
      return {
        ...nativeResult,
        warnings: [
          "The PDF text layer was partially readable. Review the detected team tables carefully before submission.",
          ...nativeResult.warnings,
        ],
      };
    }

    /*
     * FALLBACK:
     * The PDF is probably scanned/image-based.
     * OCR only now.
     *
     * We OCR sequentially and keep checking whether
     * the game + both team tables have already been
     * found. This avoids blindly requiring pages
     * 1, 3, 4 and 5.
     */
    onProgress(
      "PDF text was not sufficient · starting OCR fallback",
    );

    const tesseract =
      await import(
        "tesseract.js"
      );

    const worker =
      await tesseract.createWorker(
        "eng",
        1,
        {
          logger(message) {
            if (
              message.status ===
              "recognizing text"
            ) {
              onProgress(
                `OCR reading · ${Math.round(
                  Number(
                    message.progress ||
                      0,
                  ) * 100,
                )}%`,
              );
            }
          },
        },
      );

    await worker.setParameters({
      tessedit_pageseg_mode:
        tesseract.PSM
          .SINGLE_BLOCK,
      preserve_interword_spaces:
        "1",
    });

    const ocrPages =
      Array.from(
        {
          length:
            document.numPages,
        },
        () => "",
      );

    let bestResult =
      nativeResult;

    try {
      for (
        let pageNumber = 1;
        pageNumber <=
        document.numPages;
        pageNumber += 1
      ) {
        /*
         * If a page already had substantial native text,
         * reuse it. Otherwise OCR the rendered page.
         */
        if (
          nativePages[
            pageNumber - 1
          ]?.replace(
            /\s/g,
            "",
          ).length >= 250
        ) {
          ocrPages[
            pageNumber - 1
          ] =
            nativePages[
              pageNumber - 1
            ];
        } else {
          onProgress(
            `OCR report page ${pageNumber} of ${document.numPages}`,
          );

          const canvas =
            await renderPage(
              document,
              pageNumber,
            );

          const result =
            await worker.recognize(
              canvas,
            );

          ocrPages[
            pageNumber - 1
          ] =
            result.data
              .text || "";

          canvas.width = 1;
          canvas.height = 1;
        }

        bestResult =
          parseBasketballReportOcr(
            ocrPages,
            roster,
            file.name,
          );

        if (
          hasUsefulResult(
            bestResult,
          )
        ) {
          break;
        }
      }
    } finally {
      await worker.terminate();
    }

    return {
      ...bestResult,
      warnings: [
        "Image-based or partially unreadable PDF processed with OCR fallback. Review every player match and statistic before submission.",
        ...bestResult.warnings,
      ],
    };
  } finally {
    await document.destroy();
  }
}