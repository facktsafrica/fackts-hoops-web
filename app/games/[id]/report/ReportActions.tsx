"use client";

import Link from "next/link";

export default function ReportActions({ gameId }: { gameId: string }) {
  return (
    <div className="print:hidden flex flex-wrap gap-2">
      <Link href={`/games/${gameId}`} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[.1em] text-slate-800">
        Back to match centre
      </Link>
      <button type="button" onClick={() => window.print()} className="rounded-xl bg-[#0B1F3A] px-5 py-3 text-xs font-black uppercase tracking-[.1em] text-white">
        Print / Save PDF
      </button>
    </div>
  );
}
