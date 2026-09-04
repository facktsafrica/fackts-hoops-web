"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TeamGame } from "@/lib/hoops/teamProfiles";

type TeamGameExtended = TeamGame & {
  status?: string | null;
  game_status?: string | null;
  game_format?: string | null;
  format?: string | null;
  competition_format?: string | null;
  division?: string | null;
};

type TeamGameStatus = "live" | "upcoming" | "completed" | "postponed" | "cancelled";

const PER_PAGE = 20;

const statusOptions: Array<{ value: "all" | TeamGameStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Final" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
];

function clean(value?: string | null) {
  return String(value || "").trim();
}

function compact(value?: string | null) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function gameStatus(game: TeamGameExtended): TeamGameStatus {
  const raw = clean(game.status || game.game_status).toLowerCase();
  if (raw === "live") return "live";
  if (raw === "postponed") return "postponed";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  if (raw === "completed" || raw === "final" || raw === "finished") return "completed";
  if (raw === "upcoming" || raw === "scheduled") return "upcoming";
  if (game.result) return "completed";
  return "upcoming";
}

function gameFormat(game: TeamGameExtended) {
  const direct = clean(game.game_format || game.format || game.competition_format);
  const source = [direct, game.competition_name, game.title].filter(Boolean).join(" ");
  const normalized = compact(source);

  if (normalized.includes("1v1") || normalized.includes("oneonone") || normalized.includes("facktskings")) return "1v1";
  if (normalized.includes("3v3") || normalized.includes("3x3")) return "3v3";
  if (normalized.includes("5v5") || normalized.includes("5x5") || normalized.includes("league")) return "5v5";
  return direct || "Basketball";
}

function dateValue(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: TeamGameStatus) {
  if (status === "live") return "border-red-300/45 bg-red-500 text-white";
  if (status === "upcoming") return "border-blue-300/30 bg-blue-500/15 text-blue-200";
  if (status === "completed") return "border-emerald-300/30 bg-emerald-500/15 text-emerald-200";
  if (status === "postponed") return "border-amber-300/30 bg-amber-500/15 text-amber-200";
  return "border-zinc-400/20 bg-zinc-500/10 text-zinc-300";
}

function statusLabel(status: TeamGameStatus) {
  if (status === "completed") return "Final";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function resultClass(result?: string | null) {
  if (result === "W") return "bg-emerald-500 text-black";
  if (result === "L") return "bg-red-500 text-white";
  return "bg-white/10 text-white";
}

function score(game: TeamGame) {
  if (game.team_score == null || game.opponent_score == null) return "VS";
  return `${game.team_score}–${game.opponent_score}`;
}

export default function TeamGamesExplorer({ games }: { games: TeamGame[] }) {
  const extendedGames = games as TeamGameExtended[];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TeamGameStatus>("all");
  const [format, setFormat] = useState("all");
  const [page, setPage] = useState(1);

  const formats = useMemo(
    () => [...new Set(extendedGames.map(gameFormat).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [extendedGames],
  );

  const counts = useMemo(
    () => extendedGames.reduce(
      (record, game) => {
        record.all += 1;
        record[gameStatus(game)] += 1;
        return record;
      },
      { all: 0, live: 0, upcoming: 0, completed: 0, postponed: 0, cancelled: 0 },
    ),
    [extendedGames],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return [...extendedGames]
      .filter((game) => {
        const matchesSearch = !needle || [
          game.title,
          game.opponent_name,
          game.competition_name,
          game.venue,
          game.division,
          gameFormat(game),
        ].some((value) => clean(value).toLowerCase().includes(needle));

        return matchesSearch &&
          (status === "all" || gameStatus(game) === status) &&
          (format === "all" || gameFormat(game) === format);
      })
      .sort((a, b) => {
        const priority: Record<TeamGameStatus, number> = {
          live: 0,
          upcoming: 1,
          completed: 2,
          postponed: 3,
          cancelled: 4,
        };
        const statusDiff = priority[gameStatus(a)] - priority[gameStatus(b)];
        if (statusDiff) return statusDiff;
        if (gameStatus(a) === "upcoming" || gameStatus(a) === "live") {
          return dateValue(a.game_date) - dateValue(b.game_date);
        }
        return dateValue(b.game_date) - dateValue(a.game_date);
      });
  }, [extendedGames, format, query, status]);

  useEffect(() => setPage(1), [format, query, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="mt-7">
      <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3 sm:p-4">
        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 focus-within:border-orange-400/55">
          <span className="text-orange-300">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search opponent, competition, venue or format"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
          />
          {query ? <button type="button" onClick={() => setQuery("")} className="text-zinc-500">×</button> : null}
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`shrink-0 rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] transition ${status === option.value ? "border-orange-400 bg-orange-500 text-black" : "border-white/10 bg-white/[.03] text-zinc-400"}`}
            >
              {option.label} <span className="ml-1 opacity-65">{counts[option.value]}</span>
            </button>
          ))}
        </div>

        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFormat("all")}
            className={`shrink-0 rounded-lg border px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] ${format === "all" ? "border-blue-300/40 bg-blue-500/15 text-blue-200" : "border-white/10 text-zinc-500"}`}
          >
            All formats
          </button>
          {formats.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFormat(item)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] ${format === item ? "border-blue-300/40 bg-blue-500/15 text-blue-200" : "border-white/10 text-zinc-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-[.12em] text-zinc-600">{filtered.length} {filtered.length === 1 ? "game" : "games"}</p>
        <p className="text-[8px] font-bold uppercase tracking-[.1em] text-zinc-700">20 per page</p>
      </div>

      {visible.length ? (
        <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/75">
          <div className="hidden grid-cols-[115px_minmax(230px,1.3fr)_minmax(190px,1fr)_95px_95px] gap-4 border-b border-white/10 bg-white/[.035] px-5 py-3 text-[8px] font-black uppercase tracking-[.13em] text-zinc-600 lg:grid">
            <span>Status / date</span>
            <span>Opponent</span>
            <span>Competition</span>
            <span>Format</span>
            <span className="text-right">Open</span>
          </div>
          <div className="divide-y divide-white/[.07]">
            {visible.map((game) => {
              const currentStatus = gameStatus(game);
              const formatLabel = gameFormat(game);

              return (
                <article key={game.id} className="grid gap-4 px-4 py-4 transition hover:bg-white/[.025] sm:px-5 lg:grid-cols-[115px_minmax(230px,1.3fr)_minmax(190px,1fr)_95px_95px] lg:items-center">
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[.1em] ${statusClass(currentStatus)}`}>{statusLabel(currentStatus)}</span>
                    <p className="mt-2 text-[8px] font-bold text-zinc-600">{formatDate(game.game_date)}</p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {game.result ? <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-black ${resultClass(game.result)}`}>{game.result}</span> : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase">vs {game.opponent_name || "Opponent"}</p>
                        <p className="mt-1 text-lg font-black text-white">{score(game)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase text-orange-200">{game.competition_name || "Team game"}</p>
                    <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.08em] text-zinc-600">{[game.division, game.venue].filter(Boolean).join(" · ") || "Game record"}</p>
                  </div>

                  <div>
                    <span className="inline-flex rounded-md border border-white/10 bg-white/[.035] px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] text-zinc-400">{formatLabel}</span>
                  </div>

                  <div className="lg:text-right">
                    {game.game_id ? (
                      <Link href={`/games/${game.game_id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 text-[8px] font-black uppercase tracking-[.1em] text-orange-200 transition hover:bg-orange-500 hover:text-black">Match centre →</Link>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-[.1em] text-zinc-700">Team record</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[1.4rem] border border-dashed border-white/15 bg-black/25 px-6 py-10 text-center">
          <p className="text-sm font-black uppercase">No games match those filters.</p>
          <button type="button" onClick={() => { setQuery(""); setStatus("all"); setFormat("all"); }} className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-[8px] font-black uppercase tracking-[.1em] text-black">Clear filters</button>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 sm:justify-end">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-white/10 px-4 py-2 text-[8px] font-black uppercase text-zinc-300 disabled:opacity-30">← Previous</button>
          <span className="text-[8px] font-black uppercase text-zinc-600">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="rounded-lg border border-white/10 px-4 py-2 text-[8px] font-black uppercase text-zinc-300 disabled:opacity-30">Next →</button>
        </div>
      ) : null}
    </div>
  );
}
