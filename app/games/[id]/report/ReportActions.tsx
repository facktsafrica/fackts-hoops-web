"use client";

import Link from "next/link";
import { useState } from "react";
import type { jsPDF as JsPDF } from "jspdf";

export type DownloadableGameReport = {
  title: string;
  competition: string;
  stage: string;
  format: string;
  status: string;
  verification: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  dateTime: string;
  venue: string;
  updatedAt: string;
  periods: Array<{ label: string; home: number | null; away: number | null }>;
  stats: Array<{
    name: string;
    team: string;
    points: number;
    threePointers: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
    plusMinus: number;
  }>;
};

const NAVY: [number, number, number] = [11, 31, 58];
const ORANGE: [number, number, number] = [249, 115, 22];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "fackts-game-report";
}

function fitText(pdf: JsPDF, value: string, maxWidth: number) {
  if (pdf.getTextWidth(value) <= maxWidth) return value;

  let shortened = value;
  while (shortened.length > 1 && pdf.getTextWidth(`${shortened}...`) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }

  return `${shortened}...`;
}

function drawFooter(pdf: JsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageNumber = pdf.getNumberOfPages();

  pdf.setDrawColor(226, 232, 240);
  pdf.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...SLATE);
  pdf.text("FACKTS HOOPS - BASKETBALL, DOCUMENTED PROPERLY", 12, pageHeight - 5.5);
  pdf.text(`PAGE ${pageNumber}`, pageWidth - 12, pageHeight - 5.5, { align: "right" });
}

function drawBoxScoreHeader(pdf: JsPDF, y: number) {
  const columns = [
    { label: "PLAYER", width: 48, align: "left" as const },
    { label: "TEAM", width: 42, align: "left" as const },
    ...["PTS", "3PM", "REB", "AST", "STL", "BLK", "TO", "PF", "+/-"].map((label) => ({
      label,
      width: 18,
      align: "center" as const,
    })),
  ];

  pdf.setFillColor(...NAVY);
  pdf.rect(12, y, 252, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...WHITE);

  let x = 12;
  columns.forEach((column) => {
    const textX = column.align === "left" ? x + 2 : x + column.width / 2;
    pdf.text(column.label, textX, y + 5.2, { align: column.align });
    x += column.width;
  });

  return y + 8;
}

function buildPdf(pdf: JsPDF, report: DownloadableGameReport) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setProperties({
    title: `${report.title} - FACKTS Hoops Game Report`,
    subject: `${report.competition} official game record`,
    author: "FACKTS Hoops",
    creator: "FACKTS Hoops",
  });

  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageWidth, 39, "F");
  pdf.setTextColor(253, 186, 116);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("FACKTS HOOPS  /  OFFICIAL GAME RECORD", 12, 11);
  pdf.setTextColor(...WHITE);
  pdf.setFontSize(22);
  pdf.text(fitText(pdf, report.title.toUpperCase(), pageWidth - 74), 12, 25);
  pdf.setFontSize(8);
  pdf.setTextColor(203, 213, 225);
  pdf.text(fitText(pdf, `${report.competition}  /  ${report.stage}  /  ${report.format}`, pageWidth - 74), 12, 32);
  pdf.setFillColor(...ORANGE);
  pdf.roundedRect(pageWidth - 54, 9, 42, 21, 2, 2, "F");
  pdf.setTextColor(...NAVY);
  pdf.setFontSize(7);
  pdf.text(report.status.toUpperCase(), pageWidth - 33, 15, { align: "center" });
  pdf.setFontSize(17);
  pdf.text(`${report.homeScore ?? "-"} - ${report.awayScore ?? "-"}`, pageWidth - 33, 25, { align: "center" });

  pdf.setTextColor(...NAVY);
  pdf.setFontSize(15);
  pdf.text(fitText(pdf, report.homeTeam.toUpperCase(), 91), 12, 52);
  pdf.text(fitText(pdf, report.awayTeam.toUpperCase(), 91), pageWidth - 12, 52, { align: "right" });
  pdf.setTextColor(...ORANGE);
  pdf.setFontSize(8);
  pdf.text(report.verification.toUpperCase(), pageWidth / 2, 52, { align: "center" });

  pdf.setFillColor(...LIGHT);
  pdf.roundedRect(12, 59, pageWidth - 24, 18, 2, 2, "F");
  const info = [
    ["DATE AND TIME", report.dateTime],
    ["VENUE", report.venue],
    ["RECORD UPDATED", report.updatedAt],
  ];
  const infoWidth = (pageWidth - 28) / 3;
  info.forEach(([label, value], index) => {
    const x = 16 + infoWidth * index;
    pdf.setTextColor(...ORANGE);
    pdf.setFontSize(6.5);
    pdf.text(label, x, 65);
    pdf.setTextColor(...SLATE);
    pdf.setFontSize(8);
    pdf.text(fitText(pdf, value, infoWidth - 7), x, 71.5);
  });

  let y = 86;
  if (report.periods.length) {
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(11);
    pdf.text("SCORE BY PERIOD", 12, y);
    y += 4;

    const labelWidth = 52;
    const periodWidth = Math.min(24, (pageWidth - 24 - labelWidth - 24) / report.periods.length);
    const totalWidth = labelWidth + periodWidth * report.periods.length + 24;
    pdf.setFillColor(...LIGHT);
    pdf.rect(12, y, totalWidth, 7, "F");
    pdf.setTextColor(...SLATE);
    pdf.setFontSize(6.5);
    pdf.text("TEAM", 14, y + 4.7);
    report.periods.forEach((period, index) => {
      pdf.text(period.label.toUpperCase(), 12 + labelWidth + periodWidth * index + periodWidth / 2, y + 4.7, { align: "center" });
    });
    pdf.text("TOTAL", 12 + totalWidth - 12, y + 4.7, { align: "center" });
    y += 7;

    [
      { team: report.homeTeam, scores: report.periods.map((period) => period.home), total: report.homeScore },
      { team: report.awayTeam, scores: report.periods.map((period) => period.away), total: report.awayScore },
    ].forEach((row) => {
      pdf.setDrawColor(226, 232, 240);
      pdf.line(12, y + 7, 12 + totalWidth, y + 7);
      pdf.setTextColor(...NAVY);
      pdf.setFontSize(7.5);
      pdf.text(fitText(pdf, row.team.toUpperCase(), labelWidth - 5), 14, y + 4.8);
      pdf.setTextColor(...SLATE);
      row.scores.forEach((score, index) => {
        pdf.text(String(score ?? "-"), 12 + labelWidth + periodWidth * index + periodWidth / 2, y + 4.8, { align: "center" });
      });
      pdf.setTextColor(...ORANGE);
      pdf.text(String(row.total ?? "-"), 12 + totalWidth - 12, y + 4.8, { align: "center" });
      y += 7;
    });
    y += 8;
  }

  pdf.setTextColor(...NAVY);
  pdf.setFontSize(11);
  pdf.text("PLAYER BOX SCORE", 12, y);
  pdf.setTextColor(...SLATE);
  pdf.setFontSize(7);
  pdf.text(`${report.stats.length} STAT LINES`, pageWidth - 12, y, { align: "right" });
  y = drawBoxScoreHeader(pdf, y + 4);

  if (!report.stats.length) {
    pdf.setFillColor(...LIGHT);
    pdf.rect(12, y, 252, 13, "F");
    pdf.setTextColor(...SLATE);
    pdf.setFontSize(8);
    pdf.text("Individual statistics were not captured for this game and have not been estimated.", 15, y + 8);
  } else {
    report.stats.forEach((row, index) => {
      if (y + 7 > pageHeight - 13) {
        drawFooter(pdf);
        pdf.addPage();
        y = 14;
        pdf.setTextColor(...NAVY);
        pdf.setFontSize(11);
        pdf.text("PLAYER BOX SCORE - CONTINUED", 12, y);
        y = drawBoxScoreHeader(pdf, y + 4);
      }

      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(12, y, 252, 7, "F");
      }

      const values = [
        row.points,
        row.threePointers,
        row.rebounds,
        row.assists,
        row.steals,
        row.blocks,
        row.turnovers,
        row.fouls,
        row.plusMinus > 0 ? `+${row.plusMinus}` : row.plusMinus,
      ];
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.setTextColor(...NAVY);
      pdf.text(fitText(pdf, row.name.toUpperCase(), 44), 14, y + 4.8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...SLATE);
      pdf.text(fitText(pdf, row.team, 38), 62, y + 4.8);
      values.forEach((value, valueIndex) => {
        if (valueIndex === 0) pdf.setTextColor(...ORANGE);
        else pdf.setTextColor(...SLATE);
        pdf.text(String(value), 111 + valueIndex * 18, y + 4.8, { align: "center" });
      });
      y += 7;
    });
  }

  drawFooter(pdf);
}

export default function ReportActions({ gameId, report }: { gameId: string; report: DownloadableGameReport }) {
  const [downloadState, setDownloadState] = useState<"idle" | "working" | "error">("idle");

  async function downloadPdf() {
    setDownloadState("working");

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      buildPdf(pdf, report);
      pdf.save(`${safeFilename(`${report.homeTeam}-vs-${report.awayTeam}`)}-game-report.pdf`);
      setDownloadState("idle");
    } catch (error) {
      console.error("Could not generate the game report PDF.", error);
      setDownloadState("error");
    }
  }

  return (
    <div className="print:hidden flex flex-wrap justify-end gap-2">
      <Link href={`/games/${gameId}`} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[.1em] text-slate-800">
        Back to match centre
      </Link>
      <button type="button" onClick={() => window.print()} className="rounded-xl border border-[#0B1F3A] bg-white px-5 py-3 text-xs font-black uppercase tracking-[.1em] text-[#0B1F3A]">
        Print report
      </button>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={downloadState === "working"}
        className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[.1em] text-black transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60"
      >
        {downloadState === "working" ? "Preparing PDF..." : downloadState === "error" ? "Try download again" : "Download PDF"}
      </button>
      {downloadState === "error" ? <p className="w-full text-right text-xs font-bold text-red-700">The PDF was not created. Please try once more.</p> : null}
    </div>
  );
}
