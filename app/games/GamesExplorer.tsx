"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicGameStatus } from "@/lib/hoops/gamePresentation";
import type { GameCategory } from "@/lib/hoops/gameContext";

export type GameDirectoryItem = {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: PublicGameStatus;
  statusLabel: string;
  gameDate: string | null;
  dateLabel: string;
  year: string;
  venue: string;
  location: string;
  competition: string;
  category: GameCategory;
  categoryLabel: string;
  contextKey: string;
  contextLabel: string;
  eventTitle: string;
  eventSlug: string;
  gameFormat: string;
  formatBucket: string;
  stage: string;
  imageUrl: string;
  verificationLabel: string;
  verified: boolean;
  hasStats: boolean;
  rosterCount: number;
  mediaCount: number;
};

const statusOptions: { value: "all" | PublicGameStatus; label: string }[] = [
  { value: "all", label: "All games" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Final" },
  { value: "postponed", label: "Postponed" },
];

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function statusClass(status: PublicGameStatus) {
  if (status === "live") return "border-red-300/50 bg-red-500 text-white";
  if (status === "upcoming") return "border-blue-300/35 bg-blue-500/20 text-blue-100";
  if (status === "completed") return "border-emerald-300/30 bg-emerald-500/15 text-emerald-200";
  if (status === "postponed") return "border-amber-300/30 bg-amber-500/15 text-amber-200";
  return "border-rose-300/30 bg-rose-500/15 text-rose-200";
}

export default function GamesExplorer({ games }: { games: GameDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PublicGameStatus>("all");
  const [event, setEvent] = useState("all");
  const [category, setCategory] = useState("all");
  const [context, setContext] = useState("all");
  const [format, setFormat] = useState("all");
  const [team, setTeam] = useState("all");
  const [year, setYear] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const events = useMemo(
    () => unique(games.map((game) => game.eventTitle || game.competition)),
    [games]
  );
  const categories = useMemo(
    () => unique(games.map((game) => game.categoryLabel)),
    [games]
  );
  const contexts = useMemo(
    () => unique(games.map((game) => game.contextLabel)),
    [games]
  );
  const formats = useMemo(
    () => unique(games.map((game) => game.formatBucket)),
    [games]
  );
  const teams = useMemo(
    () => unique(games.flatMap((game) => [game.homeTeam, game.awayTeam])),
    [games]
  );
  const years = useMemo(
    () => unique(games.map((game) => game.year)).sort((a, b) => b.localeCompare(a)),
    [games]
  );

  const counts = useMemo(
    () =>
      games.reduce(
        (result, game) => {
          result.all += 1;
          result[game.status] += 1;
          return result;
        },
        { all: 0, live: 0, upcoming: 0, completed: 0, postponed: 0, cancelled: 0 }
      ),
    [games]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return games.filter((game) => {
      const matchesSearch =
        !needle ||
        [
          game.title,
          game.homeTeam,
          game.awayTeam,
          game.competition,
          game.eventTitle,
          game.categoryLabel,
          game.contextLabel,
          game.venue,
          game.location,
          game.stage,
        ].some((value) => value.toLowerCase().includes(needle));

      const gameEvent = game.eventTitle || game.competition;

      return (
        matchesSearch &&
        (status === "all" || game.status === status) &&
        (category === "all" || game.categoryLabel === category) &&
        (context === "all" || game.contextLabel === context) &&
        (format === "all" || game.formatBucket === format) &&
        (event === "all" || gameEvent === event) &&
        (team === "all" || game.homeTeam === team || game.awayTeam === team) &&
        (year === "all" || game.year === year)
      );
    });
  }, [category, context, event, format, games, query, status, team, year]);

  function reset() {
    setQuery("");
    setStatus("all");
    setEvent("all");
    setCategory("all");
    setContext("all");
    setFormat("all");
    setTeam("all");
    setYear("all");
  }

  return (
    <>
      <section className="relative z-20 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/95 p-3 shadow-[0_28px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-5">
          <label htmlFor="game-search" className="sr-only">
            Search games
          </label>
          <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 focus-within:border-orange-400/60">
            <span aria-hidden="true" className="text-xl text-orange-300">⌕</span>
            <input
              id="game-search"
              value={query}
              onChange={(input) => setQuery(input.target.value)}
              placeholder="Search a team, event, competition or venue"
              className="min-w-0 flex-1 bg-transparent py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300" aria-label="Clear game search">
                ×
              </button>
            ) : null}
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] transition ${status === option.value ? "border-orange-400 bg-orange-500 text-black" : "border-white/10 bg-white/[.035] text-zinc-300 hover:border-orange-400/50"}`}
              >
                {option.label} <span className="ml-1 opacity-70">{counts[option.value]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/[.08] bg-white/[.025] px-4 py-3 text-[10px] font-black uppercase tracking-[.14em] text-zinc-300 sm:hidden"
          >
            Context, team and date filters <span>{filtersOpen ? "−" : "+"}</span>
          </button>

          <div className={`${filtersOpen ? "grid" : "hidden"} mt-3 gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4`}>
            <FilterSelect label="Game type" value={category} onChange={setCategory} options={categories} />
            <FilterSelect label="Context" value={context} onChange={setContext} options={contexts} />
            <FilterSelect label="Format" value={format} onChange={setFormat} options={formats} />
            <FilterSelect label="Event" value={event} onChange={setEvent} options={events} />
            <FilterSelect label="Team" value={team} onChange={setTeam} options={teams} />
            <FilterSelect label="Year" value={year} onChange={setYear} options={years} />
          </div>
        </div>
      </section>

      <section id="game-directory" className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Verified basketball records</p>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">Every game in context.</h2>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-zinc-500">
            {filtered.length} {filtered.length === 1 ? "game" : "games"} found
          </p>
        </div>

        {filtered.length ? (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        ) : (
          <div className="mt-7 rounded-[2rem] border border-dashed border-white/15 bg-slate-950/75 px-6 py-14 text-center">
            <p className="text-lg font-black uppercase text-white">No game matches those filters.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Clear the filters to return to the complete game record.</p>
            <button type="button" onClick={reset} className="mt-5 rounded-full bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-black">
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function GameCard({ game }: { game: GameDirectoryItem }) {
  const scored = game.homeScore !== null && game.awayScore !== null;

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 shadow-[0_18px_60px_rgba(0,0,0,.25)] transition hover:-translate-y-1 hover:border-orange-400/50">
      <Link href={`/games/${game.id}`} className="block h-full">
        <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.25),transparent_35%),linear-gradient(135deg,#0f172a,#020617)]">
          {game.imageUrl ? (
            <img src={game.imageUrl} alt={game.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          ) : (
            <div className="h-full bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top opacity-45" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
          <span className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] shadow-lg ${statusClass(game.status)}`}>
            {game.statusLabel}
          </span>
          <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white backdrop-blur">
            {game.gameFormat}
          </span>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-200">{game.contextLabel}</p>
            <p className="mt-1 text-xs font-bold text-zinc-200">{game.dateLabel}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <TeamName name={game.homeTeam} />
            <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">{scored ? "Score" : "Matchup"}</p>
              <p className="mt-1 whitespace-nowrap text-2xl font-black text-white">
                {scored ? `${game.homeScore}–${game.awayScore}` : "VS"}
              </p>
            </div>
            <TeamName name={game.awayTeam} align="right" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 border-y border-white/[.07] py-4 text-xs">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">Venue</p>
              <p className="mt-1 truncate font-bold text-zinc-200">{game.venue || game.location}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">Record</p>
              <p className={`mt-1 font-bold ${game.verified ? "text-emerald-300" : "text-zinc-300"}`}>{game.verificationLabel}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[.1em]">
            {game.hasStats ? <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-blue-200">Box score</span> : null}
            {game.rosterCount ? <span className="rounded-full bg-white/[.06] px-3 py-1.5 text-zinc-300">{game.rosterCount} rostered</span> : null}
            {game.mediaCount ? <span className="rounded-full bg-orange-500/15 px-3 py-1.5 text-orange-200">{game.mediaCount} media</span> : null}
            <span className="ml-auto text-orange-300">Open match centre →</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function TeamName({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`mb-2 flex ${align === "right" ? "justify-end" : "justify-start"}`}>
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#0B1F3A] text-[10px] font-black text-orange-300">
          {name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
        </span>
      </div>
      <p className="break-words text-xs font-black uppercase leading-4 text-white sm:text-sm">{name}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2">
      <span className="block text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">{label}</span>
      <select value={value} onChange={(input) => onChange(input.target.value)} className="mt-1 w-full bg-transparent text-xs font-bold text-white outline-none">
        <option value="all" className="bg-slate-950">All {label.toLowerCase()}s</option>
        {options.map((option) => <option key={option} value={option} className="bg-slate-950">{option}</option>)}
      </select>
    </label>
  );
}
