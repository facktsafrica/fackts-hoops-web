"use client";

import { useState } from "react";

export type PdfReportData = {
  title: string;
  summary: string;
  format: string;
  category: string;
  date: string;
  venue: string;
  metrics: { value: string; label: string }[];
  finals: { division: string; winner: string; score: string }[];
  results: { stage: string; match: string; score: string }[];
  awards: { title: string; recipient: string; division: string }[];
  teams: string[];
  partners: { title: string; detail: string }[];
  people: string[];
  mediaSummary: string;
  generatedOn: string;
};

function safeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fackts-event";
}

export default function ReportActions({ eventTitle, reportData }: { eventTitle: string; reportData: PdfReportData }) {
  const [downloading, setDownloading] = useState(false);
  const [linkStatus, setLinkStatus] = useState<"idle" | "copied" | "error">("idle");

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const navy: [number, number, number] = [7, 27, 58];
      const orange: [number, number, number] = [249, 115, 22];
      const ink: [number, number, number] = [15, 23, 42];
      const muted: [number, number, number] = [71, 85, 105];
      const line: [number, number, number] = [226, 232, 240];
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 0;
      let sectionNumber = 0;

      const text = (value: string, x: number, top: number, options?: { size?: number; bold?: boolean; color?: [number, number, number]; maxWidth?: number; align?: "left" | "center" | "right" }) => {
        pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
        pdf.setFontSize(options?.size ?? 9);
        pdf.setTextColor(...(options?.color ?? ink));
        pdf.text(value, x, top, { maxWidth: options?.maxWidth, align: options?.align });
      };
      const footer = () => {
        pdf.setDrawColor(...line);
        pdf.line(margin, 284, pageWidth - margin, 284);
        text("FACKTS HOOPS EVENT ARCHIVE", margin, 289, { size: 6.5, bold: true, color: muted });
        text(`PAGE ${pdf.getNumberOfPages()}`, pageWidth - margin, 289, { size: 6.5, bold: true, color: muted, align: "right" });
      };
      const newPage = () => {
        if (pdf.getNumberOfPages() > 0 && y > 0) footer();
        pdf.addPage();
        y = 18;
      };
      const ensure = (height: number) => { if (y + height > 278) newPage(); };
      const heading = (title: string) => {
        ensure(16);
        sectionNumber += 1;
        text(String(sectionNumber).padStart(2, "0"), margin, y + 4, { size: 8, bold: true, color: orange });
        text(title.toUpperCase(), margin + 10, y + 4, { size: 12, bold: true, color: navy });
        pdf.setDrawColor(...line);
        pdf.line(margin, y + 8, pageWidth - margin, y + 8);
        y += 15;
      };
      const wrapped = (value: string, width: number, size = 8.5) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(size);
        return pdf.splitTextToSize(value || "-", width) as string[];
      };

      // Replace jsPDF's initial blank page with the designed cover/report header.
      pdf.setFillColor(...navy);
      pdf.roundedRect(0, 0, pageWidth, 70, 0, 0, "F");
      pdf.setFillColor(...orange);
      pdf.rect(0, 69, pageWidth, 2, "F");
      text("FACKTS HOOPS  •  OFFICIAL EVENT REPORT", margin, 14, { size: 7, bold: true, color: [253, 186, 116] });
      const titleLines = pdf.splitTextToSize(reportData.title.toUpperCase(), contentWidth) as string[];
      text(titleLines.join("\n"), margin, 29, { size: titleLines.length > 2 ? 21 : 25, bold: true, color: [255, 255, 255], maxWidth: contentWidth });
      const titleBottom = 29 + titleLines.length * (titleLines.length > 2 ? 8 : 9);
      text(reportData.summary, margin, Math.min(61, titleBottom + 8), { size: 8.5, color: [226, 232, 240], maxWidth: contentWidth });

      const facts = [["FORMAT", reportData.format], ["CATEGORY", reportData.category], ["DATE", reportData.date], ["VENUE", reportData.venue]];
      const factWidth = contentWidth / 4;
      facts.forEach(([label, value], index) => {
        const x = margin + index * factWidth;
        if (index) { pdf.setDrawColor(...line); pdf.line(x, 75, x, 97); }
        text(label, x + 3, 80, { size: 6, bold: true, color: [148, 163, 184] });
        const lines = wrapped(value, factWidth - 6, 7.5).slice(0, 3);
        text(lines.join("\n"), x + 3, 87, { size: 7.5, bold: true, color: navy, maxWidth: factWidth - 6 });
      });
      pdf.setDrawColor(...line); pdf.line(margin, 101, pageWidth - margin, 101);
      y = 110;

      heading("Event at a glance");
      const metricGap = 3;
      const metricWidth = (contentWidth - metricGap * 3) / 4;
      reportData.metrics.forEach((metric, index) => {
        const x = margin + index * (metricWidth + metricGap);
        pdf.setFillColor(...navy); pdf.roundedRect(x, y, metricWidth, 22, 2, 2, "F");
        text(metric.value, x + 4, y + 10, { size: 16, bold: true, color: orange });
        text(metric.label.toUpperCase(), x + 4, y + 16, { size: 5.5, bold: true, color: [203, 213, 225], maxWidth: metricWidth - 8 });
      });
      y += 30;

      if (reportData.finals.length) {
        heading("Champions and finals");
        for (let i = 0; i < reportData.finals.length; i += 2) {
          ensure(29);
          reportData.finals.slice(i, i + 2).forEach((item, column) => {
            const cardWidth = (contentWidth - 4) / 2;
            const x = margin + column * (cardWidth + 4);
            pdf.setFillColor(255, 247, 237); pdf.setDrawColor(254, 215, 170); pdf.roundedRect(x, y, cardWidth, 24, 2, 2, "FD");
            text(item.division.toUpperCase(), x + 4, y + 6, { size: 6, bold: true, color: [194, 65, 12] });
            text(item.winner.toUpperCase(), x + 4, y + 13, { size: 11, bold: true, color: navy, maxWidth: cardWidth - 8 });
            text(item.score, x + 4, y + 20, { size: 7.5, bold: true, color: ink, maxWidth: cardWidth - 8 });
          });
          y += 28;
        }
      }

      if (reportData.results.length) {
        heading("Verified results");
        const rowHeight = 8;
        const drawTableHeader = () => {
          pdf.setFillColor(...navy); pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
          text("STAGE", margin + 3, y + 5.2, { size: 6.5, bold: true, color: [255, 255, 255] });
          text("MATCH", margin + 47, y + 5.2, { size: 6.5, bold: true, color: [255, 255, 255] });
          text("SCORE", pageWidth - margin - 3, y + 5.2, { size: 6.5, bold: true, color: [255, 255, 255], align: "right" });
          y += 8;
        };
        drawTableHeader();
        reportData.results.forEach((row, index) => {
          if (y + rowHeight > 278) { newPage(); heading("Verified results - continued"); drawTableHeader(); }
          if (index % 2) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, y, contentWidth, rowHeight, "F"); }
          text(row.stage, margin + 3, y + 5.3, { size: 7, bold: true, maxWidth: 40 });
          text(row.match, margin + 47, y + 5.3, { size: 7, maxWidth: 103 });
          text(row.score, pageWidth - margin - 3, y + 5.3, { size: 7, bold: true, align: "right" });
          pdf.setDrawColor(...line); pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
          y += rowHeight;
        });
        y += 7;
      }

      if (reportData.awards.length) {
        heading("Awards and recognition");
        for (let i = 0; i < reportData.awards.length; i += 2) {
          ensure(22);
          reportData.awards.slice(i, i + 2).forEach((award, column) => {
            const cardWidth = (contentWidth - 4) / 2;
            const x = margin + column * (cardWidth + 4);
            pdf.setDrawColor(...line); pdf.roundedRect(x, y, cardWidth, 18, 2, 2, "S");
            text(award.title.toUpperCase(), x + 4, y + 5.5, { size: 6, bold: true, color: [194, 65, 12] });
            text(award.recipient, x + 4, y + 11, { size: 8.5, bold: true, color: navy, maxWidth: cardWidth - 8 });
            if (award.division) text(award.division, x + 4, y + 15.5, { size: 6.5, color: muted });
          });
          y += 22;
        }
      }

      const proseSection = (title: string, value: string) => {
        const lines = wrapped(value, contentWidth, 8.5);
        ensure(18 + lines.length * 4.2);
        heading(title);
        text(lines.join("\n"), margin, y, { size: 8.5, color: muted, maxWidth: contentWidth });
        y += lines.length * 4.2 + 8;
      };
      if (reportData.teams.length) proseSection("Participating teams", reportData.teams.join("  •  "));
      if (reportData.partners.length) proseSection("Partners", reportData.partners.map(item => `${item.title}${item.detail ? ` - ${item.detail}` : ""}`).join("  •  "));
      if (reportData.people.length) proseSection("Officials and contributors", reportData.people.join("  •  "));
      proseSection("Media record", reportData.mediaSummary);

      ensure(18);
      pdf.setFillColor(248, 250, 252); pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
      text("GENERATED FROM THE FACKTS HOOPS EVENT ARCHIVE", margin + 4, y + 6, { size: 6.5, bold: true, color: muted });
      text(reportData.generatedOn, pageWidth - margin - 4, y + 6, { size: 6.5, bold: true, color: muted, align: "right" });
      footer();
      pdf.save(`${safeFileName(eventTitle)}-event-summary.pdf`);
    } catch (error) {
      console.error("Event report PDF download failed", error);
      window.alert("The PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function shareReport() {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: `${eventTitle} - Event Summary`, url });
      else { await navigator.clipboard.writeText(url); setLinkStatus("copied"); window.setTimeout(() => setLinkStatus("idle"), 2500); }
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      try { await navigator.clipboard.writeText(url); setLinkStatus("copied"); window.setTimeout(() => setLinkStatus("idle"), 2500); }
      catch { setLinkStatus("error"); }
    }
  }

  return <div className="report-actions flex flex-wrap gap-3">
    <button type="button" onClick={downloadPdf} disabled={downloading} className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase text-black disabled:cursor-wait disabled:opacity-60">{downloading ? "Generating PDF..." : "Download PDF"}</button>
    <button type="button" onClick={() => window.print()} className="rounded-xl border border-blue-900/20 bg-white px-5 py-3 text-xs font-black uppercase text-blue-950">Print summary</button>
    <button type="button" onClick={shareReport} className="rounded-xl border border-blue-900/20 bg-blue-950 px-5 py-3 text-xs font-black uppercase text-white">{linkStatus === "copied" ? "Link copied" : linkStatus === "error" ? "Copy failed" : "Share / copy link"}</button>
  </div>;
}
