"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  registeredTeamIds: string[];
  registeredTeamSlugs: string[];
};

export type GameTeamDirectoryItem = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  logoUrl: string;
  city: string;
  currentCompetition: string;
  verified: boolean;
  totalGames: number;
  liveGames: number;
  upcomingGames: number;
  completedGames: number;
  postponedGames: number;
  wins: number;
  losses: number;
  draws: number;
  formats: string[];
  competitions: string[];
  latestGame: {
    id: string;
    opponent: string;
    result: "W" | "L" | "D" | null;
    score: string;
    dateLabel: string;
    contextLabel: string;
  } | null;
  nextGame: {
    id: string;
    opponent: string;
    dateLabel: string;
    status: PublicGameStatus;
    contextLabel: string;
  } | null;
};

type ExplorerView = "teams" | "competitions" | "all";

const TEAMS_PER_PAGE = 15;
const COMPETITIONS_PER_PAGE = 12;
const GAMES_PER_PAGE = 20;

const statusOptions: { value: "all" | PublicGameStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Final" },
  { value: "postponed", label: "Postponed" },
];

const categoryOrder: Record<GameCategory, number> = {
  league: 1,
  competition: 2,
  court_takeover: 3,
  event: 4,
  one_on_one: 5,
  friendly: 6,
  other: 7,
};

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

function resultClass(result: "W" | "L" | "D" | null) {
  if (result === "W") return "bg-emerald-500 text-black";
  if (result === "L") return "bg-red-500 text-white";
  return "bg-white/10 text-white";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function scoreLabel(game: GameDirectoryItem) {
  if (game.homeScore === null || game.awayScore === null) return "VS";
  return `${game.homeScore}–${game.awayScore}`;
}

function pageSlice<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

export default function GamesExplorer({
  games,
  teams,
}: {
  games: GameDirectoryItem[];
  teams: GameTeamDirectoryItem[];
}) {
  const [view, setView] = useState<ExplorerView>("teams");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PublicGameStatus>("all");
  const [category, setCategory] = useState("all");
  const [context, setContext] = useState("all");
  const [format, setFormat] = useState("all");
  const [team, setTeam] = useState("all");
  const [year, setYear] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [teamPage, setTeamPage] = useState(1);
  const [competitionPage, setCompetitionPage] = useState(1);
  const [gamePage, setGamePage] = useState(1);

  const categories = useMemo(() => unique(games.map((game) => game.categoryLabel)), [games]);
  const contexts = useMemo(() => unique(games.map((game) => game.contextLabel)), [games]);
  const formats = useMemo(() => unique(games.map((game) => game.formatBucket)), [games]);
  const gameTeams = useMemo(
    () => unique(games.flatMap((game) => [game.homeTeam, game.awayTeam])),
    [games],
  );
  const years = useMemo(
    () => unique(games.map((game) => game.year)).sort((a, b) => b.localeCompare(a)),
    [games],
  );

  const counts = useMemo(
    () =>
      games.reduce(
        (result, game) => {
          result.all += 1;
          result[game.status] += 1;
          return result;
        },
        { all: 0, live: 0, upcoming: 0, completed: 0, postponed: 0, cancelled: 0 },
      ),
    [games],
  );

  const filteredTeams = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return teams.filter((item) => {
      if (!needle) return true;
      return [
        item.name,
        item.shortName,
        item.city,
        item.currentCompetition,
        ...item.formats,
        ...item.competitions,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, teams]);

  const competitionGroups = useMemo(() => {
    const records = new Map<
      string,
      {
        key: string;
        label: string;
        category: GameCategory;
        categoryLabel: string;
        games: GameDirectoryItem[];
      }
    >();

    games.forEach((game) => {
      const key = game.contextKey || `${game.category}:${game.contextLabel}`;
      const existing = records.get(key);

      if (existing) {
        existing.games.push(game);
        return;
      }

      records.set(key, {
        key,
        label: game.contextLabel,
        category: game.category,
        categoryLabel: game.categoryLabel,
        games: [game],
      });
    });

    return Array.from(records.values()).sort(
      (left, right) =>
        categoryOrder[left.category] - categoryOrder[right.category] ||
        left.label.localeCompare(right.label),
    );
  }, [games]);

  const filteredCompetitionGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return competitionGroups;

    return competitionGroups.filter((group) =>
      [
        group.label,
        group.categoryLabel,
        ...group.games.flatMap((game) => [
          game.homeTeam,
          game.awayTeam,
          game.competition,
          game.formatBucket,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [competitionGroups, query]);

  const filteredGames = useMemo(() => {
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

      return (
        matchesSearch &&
        (status === "all" || game.status === status) &&
        (category === "all" || game.categoryLabel === category) &&
        (context === "all" || game.contextLabel === context) &&
        (format === "all" || game.formatBucket === format) &&
        (team === "all" || game.homeTeam === team || game.awayTeam === team) &&
        (year === "all" || game.year === year)
      );
    });
  }, [category, context, format, games, query, status, team, year]);

  useEffect(() => setTeamPage(1), [query]);
  useEffect(() => setCompetitionPage(1), [query]);
  useEffect(() => setGamePage(1), [query, status, category, context, format, team, year]);

  const pagedTeams = pageSlice(filteredTeams, teamPage, TEAMS_PER_PAGE);
  const pagedCompetitions = pageSlice(
    filteredCompetitionGroups,
    competitionPage,
    COMPETITIONS_PER_PAGE,
  );
  const pagedGames = pageSlice(filteredGames, gamePage, GAMES_PER_PAGE);

  const teamPages = Math.max(1, Math.ceil(filteredTeams.length / TEAMS_PER_PAGE));
  const competitionPages = Math.max(
    1,
    Math.ceil(filteredCompetitionGroups.length / COMPETITIONS_PER_PAGE),
  );
  const gamePages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));

  function resetGameFilters() {
    setStatus("all");
    setCategory("all");
    setContext("all");
    setFormat("all");
    setTeam("all");
    setYear("all");
  }

  function clearEverything() {
    setQuery("");
    resetGameFilters();
  }

  function openCompetitionGames(label: string) {
    setView("all");
    setQuery("");
    setStatus("all");
    setCategory("all");
    setContext(label);
    setFormat("all");
    setTeam("all");
    setYear("all");
    setGamePage(1);
    window.requestAnimationFrame(() => {
      document.getElementById("game-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <section className="relative z-20 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/95 p-3 shadow-[0_28px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-5">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5">
            <ViewButton
              active={view === "teams"}
              onClick={() => setView("teams")}
              title="Teams"
              subtitle={`${teams.length} registered`}
            />
            <ViewButton
              active={view === "competitions"}
              onClick={() => setView("competitions")}
              title="Competitions"
              subtitle={`${competitionGroups.length} contexts`}
            />
            <ViewButton
              active={view === "all"}
              onClick={() => setView("all")}
              title="All Games"
              subtitle={`${games.length} records`}
            />
          </div>

          <label htmlFor="game-search" className="sr-only">
            Search the game explorer
          </label>
          <div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 focus-within:border-orange-400/60">
            <span aria-hidden="true" className="text-xl text-orange-300">⌕</span>
            <input
              id="game-search"
              value={query}
              onChange={(input) => setQuery(input.target.value)}
              placeholder={
                view === "teams"
                  ? "Search a team, competition or location"
                  : view === "competitions"
                    ? "Search a league, competition, event or format"
                    : "Search a team, competition, venue or game"
              }
              className="min-w-0 flex-1 bg-transparent py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          {view === "all" ? (
            <>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] transition ${
                      status === option.value
                        ? "border-orange-400 bg-orange-500 text-black"
                        : "border-white/10 bg-white/[.035] text-zinc-300 hover:border-orange-400/50"
                    }`}
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
                More filters <span>{filtersOpen ? "−" : "+"}</span>
              </button>

              <div className={`${filtersOpen ? "grid" : "hidden"} mt-3 gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-5`}>
                <FilterSelect label="Game type" value={category} onChange={setCategory} options={categories} />
                <FilterSelect label="Competition" value={context} onChange={setContext} options={contexts} />
                <FilterSelect label="Format" value={format} onChange={setFormat} options={formats} />
                <FilterSelect label="Team" value={team} onChange={setTeam} options={gameTeams} />
                <FilterSelect label="Year" value={year} onChange={setYear} options={years} />
              </div>
            </>
          ) : (
            <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-[.11em] text-zinc-600">
              {view === "teams"
                ? "Default view · game records stay attached to their registered teams"
                : "Competition view · the same games grouped by league, event or FACKTS competition"}
            </p>
          )}
        </div>
      </section>

      <section id="game-directory" className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8">
        {view === "teams" ? (
          <TeamDirectory
            teams={pagedTeams}
            total={filteredTeams.length}
            page={teamPage}
            pages={teamPages}
            onPage={setTeamPage}
          />
        ) : null}

        {view === "competitions" ? (
          <CompetitionDirectory
            groups={pagedCompetitions}
            total={filteredCompetitionGroups.length}
            page={competitionPage}
            pages={competitionPages}
            onPage={setCompetitionPage}
            onOpenGames={openCompetitionGames}
          />
        ) : null}

        {view === "all" ? (
          <AllGamesDirectory
            games={pagedGames}
            total={filteredGames.length}
            page={gamePage}
            pages={gamePages}
            onPage={setGamePage}
            onReset={clearEverything}
          />
        ) : null}
      </section>
    </>
  );
}

function TeamDirectory({
  teams,
  total,
  page,
  pages,
  onPage,
}: {
  teams: GameTeamDirectoryItem[];
  total: number;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div>
      <DirectoryHeading
        eyebrow="Team-first game directory"
        title="Choose a team. Open its game record."
        text="This page stays usable even when FACKTS has hundreds of teams and thousands of games. Each team owns the games it actually participated in; leagues and competitions simply classify those same game records."
        count={`${total} ${total === 1 ? "team" : "teams"}`}
      />

      {teams.length ? (
        <div className="mt-7 overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/75">
          <div className="hidden grid-cols-[minmax(240px,1.4fr)_130px_minmax(190px,1fr)_minmax(190px,1fr)_120px] gap-4 border-b border-white/10 bg-white/[.035] px-5 py-3 text-[8px] font-black uppercase tracking-[.14em] text-zinc-600 lg:grid">
            <span>Team</span>
            <span>Game record</span>
            <span>Latest final</span>
            <span>Next game</span>
            <span className="text-right">Open</span>
          </div>
          <div className="divide-y divide-white/[.07]">
            {teams.map((item) => (
              <TeamRow key={item.id} team={item} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="No team matches that search" text="Try the team name, competition, city or format." />
      )}

      <Pagination page={page} pages={pages} onPage={onPage} />
    </div>
  );
}

function TeamRow({ team }: { team: GameTeamDirectoryItem }) {
  const record = `${team.wins}-${team.losses}${team.draws ? `-${team.draws}` : ""}`;

  return (
    <article className="grid gap-4 px-4 py-5 transition hover:bg-white/[.025] sm:px-5 lg:grid-cols-[minmax(240px,1.4fr)_130px_minmax(190px,1fr)_minmax(190px,1fr)_120px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#0B1F3A] text-xs font-black text-orange-300">
          {team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(team.shortName)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black uppercase text-white">{team.name}</h3>
            {team.verified ? <span className="text-[7px] font-black uppercase tracking-[.1em] text-emerald-300">✓ Verified</span> : null}
          </div>
          <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[.08em] text-zinc-500">
            {[team.city, team.currentCompetition].filter(Boolean).join(" · ") || "Registered team"}
          </p>
          {team.formats.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {team.formats.slice(0, 3).map((item) => (
                <span key={item} className="rounded-md border border-white/10 bg-white/[.035] px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] text-zinc-400">{item}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/[.07] bg-black/25 p-2 text-center lg:grid-cols-2">
        <MiniStat value={team.totalGames} label="Games" />
        <MiniStat value={record} label="W-L" />
        <MiniStat value={team.liveGames} label="Live" tone={team.liveGames ? "red" : "muted"} />
        <MiniStat value={team.upcomingGames} label="Next" tone={team.upcomingGames ? "blue" : "muted"} />
      </div>

      <div className="min-w-0 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
        <p className="text-[7px] font-black uppercase tracking-[.13em] text-zinc-600">Latest final</p>
        {team.latestGame ? (
          <Link href={`/games/${team.latestGame.id}`} className="mt-2 flex items-center gap-2 hover:text-orange-200">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-black ${resultClass(team.latestGame.result)}`}>
              {team.latestGame.result || "–"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black">{team.latestGame.score} vs {team.latestGame.opponent}</span>
              <span className="mt-0.5 block truncate text-[8px] font-bold uppercase text-zinc-600">{team.latestGame.dateLabel}</span>
            </span>
          </Link>
        ) : <p className="mt-2 text-xs text-zinc-600">No final result yet.</p>}
      </div>

      <div className="min-w-0 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
        <p className="text-[7px] font-black uppercase tracking-[.13em] text-zinc-600">Next game</p>
        {team.nextGame ? (
          <Link href={`/games/${team.nextGame.id}`} className="mt-2 block hover:text-orange-200">
            <span className="block truncate text-xs font-black">vs {team.nextGame.opponent}</span>
            <span className="mt-1 block truncate text-[8px] font-bold uppercase text-zinc-600">{team.nextGame.dateLabel}</span>
          </Link>
        ) : <p className="mt-2 text-xs text-zinc-600">No fixture published.</p>}
      </div>

      <div className="lg:text-right">
        <Link
          href={`/teams/${team.slug}?tab=results`}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-orange-500 px-4 text-[8px] font-black uppercase tracking-[.11em] text-black transition hover:bg-orange-400"
        >
          Team games →
        </Link>
      </div>
    </article>
  );
}

function CompetitionDirectory({
  groups,
  total,
  page,
  pages,
  onPage,
  onOpenGames,
}: {
  groups: Array<{
    key: string;
    label: string;
    category: GameCategory;
    categoryLabel: string;
    games: GameDirectoryItem[];
  }>;
  total: number;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onOpenGames: (label: string) => void;
}) {
  return (
    <div>
      <DirectoryHeading
        eyebrow="Competition view"
        title="One game record, seen in competition context."
        text="League, Court Takeover, FACKTS Kings and other competition pages do not create separate games. They group the same match records by competition, season and format."
        count={`${total} ${total === 1 ? "context" : "contexts"}`}
      />

      {groups.length ? (
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const live = group.games.filter((game) => game.status === "live").length;
            const upcoming = group.games.filter((game) => game.status === "upcoming").length;
            const finals = group.games.filter((game) => game.status === "completed").length;
            const groupFormats = unique(group.games.map((game) => game.formatBucket));
            const latest = [...group.games]
              .filter((game) => game.status === "completed")
              .sort((a, b) => new Date(b.gameDate || 0).getTime() - new Date(a.gameDate || 0).getTime())[0];

            return (
              <article key={group.key} className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-5 transition hover:border-orange-400/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">{group.categoryLabel}</p>
                    <h3 className="mt-2 break-words text-xl font-black uppercase leading-tight">{group.label}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[8px] font-black uppercase text-zinc-400">{group.games.length} games</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[.07] bg-black/25 p-2 text-center">
                  <MiniStat value={live} label="Live" tone={live ? "red" : "muted"} />
                  <MiniStat value={upcoming} label="Upcoming" tone={upcoming ? "blue" : "muted"} />
                  <MiniStat value={finals} label="Final" tone={finals ? "green" : "muted"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {groupFormats.map((item) => (
                    <span key={item} className="rounded-md border border-white/10 px-2 py-1 text-[7px] font-black uppercase tracking-[.09em] text-zinc-500">{item}</span>
                  ))}
                </div>

                <div className="mt-4 min-h-12 border-t border-white/[.07] pt-3">
                  <p className="text-[7px] font-black uppercase tracking-[.13em] text-zinc-600">Latest final</p>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-300">
                    {latest ? `${latest.homeTeam} ${scoreLabel(latest)} ${latest.awayTeam}` : "No final score yet"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenGames(group.label)}
                  className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-[8px] font-black uppercase tracking-[.11em] text-black transition hover:bg-orange-400"
                >
                  View these games →
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No competition matches that search" text="Try a league name, event, format or team." />
      )}

      <Pagination page={page} pages={pages} onPage={onPage} />
    </div>
  );
}

function AllGamesDirectory({
  games,
  total,
  page,
  pages,
  onPage,
  onReset,
}: {
  games: GameDirectoryItem[];
  total: number;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <DirectoryHeading
        eyebrow="Complete record"
        title="All games, when you actually need them."
        text="This is the power-user view. Compact rows and pagination replace the old wall of oversized cards, so thousands of records remain searchable without becoming a scrolling problem."
        count={`${total} ${total === 1 ? "game" : "games"}`}
      />

      {games.length ? (
        <div className="mt-7 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/80">
          <div className="hidden grid-cols-[120px_minmax(250px,1.4fr)_minmax(210px,1fr)_115px_95px] gap-4 border-b border-white/10 bg-white/[.035] px-5 py-3 text-[8px] font-black uppercase tracking-[.14em] text-zinc-600 lg:grid">
            <span>Status / date</span>
            <span>Matchup</span>
            <span>Context</span>
            <span>Format</span>
            <span className="text-right">Open</span>
          </div>
          <div className="divide-y divide-white/[.07]">
            {games.map((game) => (
              <CompactGameRow key={game.id} game={game} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/75 px-6 py-12 text-center">
          <p className="text-lg font-black uppercase text-white">No game matches those filters.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Clear the filters to return to the full game record.</p>
          <button type="button" onClick={onReset} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-[9px] font-black uppercase tracking-[.13em] text-black">Clear filters</button>
        </div>
      )}

      <Pagination page={page} pages={pages} onPage={onPage} />
    </div>
  );
}

function CompactGameRow({ game }: { game: GameDirectoryItem }) {
  return (
    <article className="grid gap-4 px-4 py-4 transition hover:bg-white/[.025] sm:px-5 lg:grid-cols-[120px_minmax(250px,1.4fr)_minmax(210px,1fr)_115px_95px] lg:items-center">
      <div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[.1em] ${statusClass(game.status)}`}>{game.statusLabel}</span>
        <p className="mt-2 text-[9px] font-bold text-zinc-500">{game.dateLabel}</p>
      </div>

      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <p className="truncate text-sm font-black uppercase">{game.homeTeam}</p>
          <p className="whitespace-nowrap text-lg font-black text-white">{scoreLabel(game)}</p>
          <p className="truncate text-right text-sm font-black uppercase">{game.awayTeam}</p>
        </div>
        <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.08em] text-zinc-600">{game.venue || game.location}</p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-black uppercase text-orange-200">{game.contextLabel}</p>
        <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.08em] text-zinc-600">{game.categoryLabel}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 lg:block">
        <span className="inline-flex rounded-md border border-white/10 bg-white/[.035] px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] text-zinc-400">{game.formatBucket}</span>
        {game.verified ? <span className="ml-0 inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-[7px] font-black uppercase text-emerald-300 lg:ml-1">Verified</span> : null}
      </div>

      <div className="lg:text-right">
        <Link href={`/games/${game.id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 text-[8px] font-black uppercase tracking-[.1em] text-orange-200 transition hover:bg-orange-500 hover:text-black">Match centre →</Link>
      </div>
    </article>
  );
}

function DirectoryHeading({
  eyebrow,
  title,
  text,
  count,
}: {
  eyebrow: string;
  title: string;
  text: string;
  count: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">{eyebrow}</p>
        <h2 className="mt-2 max-w-4xl text-3xl font-black uppercase leading-none sm:text-5xl">{title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">{text}</p>
      </div>
      <span className="shrink-0 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">{count}</span>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-xl px-3 py-3 text-left transition ${active ? "bg-orange-500 text-black" : "text-zinc-300 hover:bg-white/[.05]"}`}
    >
      <span className="block truncate text-[10px] font-black uppercase tracking-[.11em]">{title}</span>
      <span className={`mt-1 block truncate text-[7px] font-bold uppercase tracking-[.08em] ${active ? "text-black/60" : "text-zinc-600"}`}>{subtitle}</span>
    </button>
  );
}

function MiniStat({
  value,
  label,
  tone = "normal",
}: {
  value: string | number;
  label: string;
  tone?: "normal" | "red" | "blue" | "green" | "muted";
}) {
  const tones = {
    normal: "text-white",
    red: "text-red-300",
    blue: "text-blue-300",
    green: "text-emerald-300",
    muted: "text-zinc-600",
  };

  return (
    <div className="min-w-0 px-1">
      <p className={`truncate text-sm font-black ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 truncate text-[6px] font-black uppercase tracking-[.08em] text-zinc-600">{label}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2">
      <span className="block text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">{label}</span>
      <select value={value} onChange={(input) => onChange(input.target.value)} className="mt-1 w-full bg-transparent text-xs font-bold text-white outline-none">
        <option value="all" className="bg-slate-950">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option} className="bg-slate-950">{option}</option>)}
      </select>
    </label>
  );
}

function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 sm:justify-end">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
        className="rounded-lg border border-white/10 px-4 py-2 text-[8px] font-black uppercase tracking-[.1em] text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ← Previous
      </button>
      <span className="text-[8px] font-black uppercase tracking-[.1em] text-zinc-600">Page {page} of {pages}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(Math.min(pages, page + 1))}
        className="rounded-lg border border-white/10 px-4 py-2 text-[8px] font-black uppercase tracking-[.1em] text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Next →
      </button>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/70 px-6 py-12 text-center">
      <p className="text-lg font-black uppercase text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}
