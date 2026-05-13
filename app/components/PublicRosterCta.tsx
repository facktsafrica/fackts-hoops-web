"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function getGameIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "games" && parts[1]) {
    return parts[1];
  }

  return "";
}

export default function PublicRosterCta() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isGamesPage = pathname === "/games";
  const isGameDetailPage = pathname.startsWith("/games/");

  if (!isGamesPage && !isGameDetailPage) {
    return null;
  }

  const gameId = getGameIdFromPath(pathname);

  const href = isGameDetailPage && gameId ? `/rosters/${gameId}` : "/rosters";

  const label = isGameDetailPage ? "Squad List" : "Game Squads";

  const headline = isGameDetailPage
    ? "The squad list is out."
    : "Squads are dropping before tip-off.";

  const description = isGameDetailPage
    ? "See who is suiting up, who starts, and who is coming off the bench."
    : "Check confirmed players, starters, bench, and the latest squad announcements.";

  const buttonText = isGameDetailPage ? "View Squad" : "View Squads";

  return (
    <section className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-orange-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/30 px-4 py-3 shadow-lg shadow-black/20">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
            {label}
          </div>

          <div className="mt-1 text-sm font-black text-white md:text-base">
            {headline}
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-400 md:text-sm">
            {description}
          </div>
        </div>

        <Link
          href={href}
          className="shrink-0 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-orange-400"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}