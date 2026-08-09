"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminGuestStatsLauncher() {
  const pathname = usePathname();

  if (pathname !== "/admin") {
    return null;
  }

  return (
    <section className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-orange-500/30 bg-slate-900 p-4 shadow-xl shadow-black/20 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Guest Stats Layer
              </div>

              <h2 className="mt-1 text-xl font-black md:text-2xl">
                Feed Guest Game Stats
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add points, rebounds, assists, blocks, steals, 3PM and plus/minus
                for guest hoopers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/guest-game-stats"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Open Guest Game Stats
              </Link>

              <Link
                href="/competitions/fackts-kings#standings"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                View Guest Leaders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
