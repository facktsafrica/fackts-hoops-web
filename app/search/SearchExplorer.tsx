"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const RECENT_SEARCHES_KEY = "fackts-hoops-recent-searches";

type SearchGroup =
  | "Players"
  | "Teams"
  | "Games"
  | "Competitions"
  | "Events"
  | "Media"
  | "Partners";

type SearchResult = {
  id: string;
  type: string;
  group: SearchGroup;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string;
};

type SearchPayload = {
  query?: string;
  results?: SearchResult[];
  totals?: Partial<Record<SearchGroup, number>>;
};

type Filter = "All" | SearchGroup;

const GROUPS: SearchGroup[] = [
  "Players",
  "Teams",
  "Games",
  "Competitions",
  "Events",
  "Media",
  "Partners",
];

const POPULAR_DESTINATIONS = [
  {
    label: "FACKTS Kings",
    description: "1v1 matchups, standings and results",
    href: "/competitions/fackts-kings",
    group: "Competition",
  },
  {
    label: "Court Takeovers",
    description: "Takeover games, rankings and future divisions",
    href: "/competitions/court-takeovers",
    group: "Competition",
  },
  {
    label: "Player Directory",
    description: "Official players, guest hoopers and competition players",
    href: "/players",
    group: "Players",
  },
  {
    label: "Media Network",
    description: "Full games, highlights, interviews and stories",
    href: "/media",
    group: "Media",
  },
];

const groupTone: Record<SearchGroup, string> = {
  Players: "bg-blue-500/15 text-blue-200",
  Teams: "bg-cyan-500/15 text-cyan-200",
  Games: "bg-orange-500/15 text-orange-200",
  Competitions: "bg-violet-500/15 text-violet-200",
  Events: "bg-emerald-500/15 text-emerald-200",
  Media: "bg-rose-500/15 text-rose-200",
  Partners: "bg-amber-500/15 text-amber-200",
};

function readRecentSearches() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === "string").slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

export default function SearchExplorer({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totals, setTotals] = useState<Partial<Record<SearchGroup, number>>>({});
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim();

  useEffect(() => {
    setRecentSearches(readRecentSearches());
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      const clearTimer = window.setTimeout(() => {
        setResults([]);
        setTotals({});
        setSearchedQuery("");
        setLoading(false);
        setSearchError(false);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(false);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalizedQuery)}&limit=80`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search request failed");
        const payload = (await response.json()) as SearchPayload;
        if (controller.signal.aborted) return;
        setResults(Array.isArray(payload.results) ? payload.results : []);
        setTotals(payload.totals || {});
        setSearchedQuery(normalizedQuery);
        setFilter("All");
        const nextUrl = `/search?q=${encodeURIComponent(normalizedQuery)}`;
        window.history.replaceState(window.history.state, "", nextUrl);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setTotals({});
          setSearchedQuery(normalizedQuery);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  const visibleResults = useMemo(
    () => (filter === "All" ? results : results.filter((item) => item.group === filter)),
    [filter, results]
  );

  function rememberSearch(term: string) {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    const next = [
      cleanTerm,
      ...recentSearches.filter(
        (item) => item.toLocaleLowerCase() !== cleanTerm.toLocaleLowerCase()
      ),
    ].slice(0, 6);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Search remains usable without local storage.
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedQuery.length < 2) return;
    rememberSearch(normalizedQuery);
    inputRef.current?.focus();
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setTotals({});
    setFilter("All");
    setSearchedQuery("");
    setSearchError(false);
    window.history.replaceState(window.history.state, "", "/search");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function clearHistory() {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // The visible history is already cleared.
    }
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#020712] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(249,115,22,.22),transparent_28%),radial-gradient(circle_at_88%_65%,rgba(37,99,235,.2),transparent_32%),linear-gradient(135deg,#020617_0%,#071b35_52%,#020617_100%)]" />
        <div className="absolute inset-0 opacity-[.055] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="inline-flex rounded-full border border-orange-400/35 bg-orange-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[.22em] text-orange-300">
            FACKTS Search Network
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[.93] tracking-[-.045em] sm:text-6xl lg:text-7xl">
            Find the record.<br />
            <span className="text-orange-400">Follow the story.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            One search across players, permanent teams, games, competitions, events,
            connected media and FACKTS partners.
          </p>

          <form onSubmit={submitSearch} className="mt-8 max-w-4xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[.08] p-2 shadow-2xl shadow-black/25 backdrop-blur-xl focus-within:border-orange-400/60 sm:p-3">
              <SearchIcon />
              <label htmlFor="fackts-search-page" className="sr-only">
                Search FACKTS Hoops
              </label>
              <input
                ref={inputRef}
                id="fackts-search-page"
                value={query}
                onChange={(event) => setQuery(event.target.value.slice(0, 80))}
                placeholder="Search Liam, a team, game, event or video…"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-500 sm:px-2 sm:text-lg"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-lg text-zinc-300 transition hover:border-orange-400/50 hover:text-white"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
              <button
                type="submit"
                className="hidden min-h-11 shrink-0 rounded-xl bg-orange-500 px-6 text-[10px] font-black uppercase tracking-[.12em] text-black transition hover:bg-orange-400 sm:inline-flex sm:items-center"
              >
                Search
              </button>
            </div>
          </form>
          <p className="mt-3 text-[9px] font-bold uppercase tracking-[.12em] text-zinc-600">
            Type at least two characters · Results update automatically
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {normalizedQuery.length < 2 ? (
          <DiscoveryState
            recentSearches={recentSearches}
            onSelect={setQuery}
            onClearHistory={clearHistory}
          />
        ) : (
          <div>
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  Search intelligence
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-4xl">
                  {loading && !searchedQuery ? "Searching FACKTS…" : `Results for “${searchedQuery || normalizedQuery}”`}
                </h2>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-zinc-600">
                {loading ? "Updating…" : `${results.length} connected records`}
              </p>
            </div>

            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Search result categories">
              <FilterButton
                label="All"
                count={results.length}
                active={filter === "All"}
                onClick={() => setFilter("All")}
              />
              {GROUPS.map((group) => (
                <FilterButton
                  key={group}
                  label={group}
                  count={totals[group] || 0}
                  active={filter === group}
                  onClick={() => setFilter(group)}
                />
              ))}
            </div>

            {searchError ? (
              <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-500/10 px-6 py-10 text-center">
                <p className="text-base font-black uppercase">Search could not load</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  Keep the search term in place and try again in a moment.
                </p>
              </div>
            ) : visibleResults.length ? (
              <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleResults.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    onSelect={() => rememberSearch(normalizedQuery)}
                  />
                ))}
              </div>
            ) : !loading ? (
              <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/15 bg-white/[.025] px-6 py-14 text-center">
                <p className="text-base font-black uppercase">
                  {filter === "All" ? "No matching record" : `No ${filter.toLowerCase()} found`}
                </p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  Try a nickname, team alias, competition, venue or media title. You can
                  also clear the search and start again.
                </p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-5 rounded-full bg-orange-500 px-5 py-3 text-[9px] font-black uppercase tracking-[.12em] text-black"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <LoadingGrid />
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function DiscoveryState({
  recentSearches,
  onSelect,
  onClearHistory,
}: {
  recentSearches: string[];
  onSelect: (value: string) => void;
  onClearHistory: () => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-[1.5rem] border border-white/10 bg-[#07162b] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">
              Continue exploring
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase">Recent searches</h2>
          </div>
          {recentSearches.length ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="shrink-0 text-[9px] font-black uppercase tracking-[.1em] text-zinc-500 hover:text-orange-300"
            >
              Clear
            </button>
          ) : null}
        </div>

        {recentSearches.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2.5 text-xs font-black text-zinc-200 transition hover:border-orange-400/50 hover:text-orange-300"
              >
                {item}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-zinc-500">
            Your recent searches will stay here on this device so you can return to a
            player, team, game or story quickly.
          </p>
        )}
      </div>

      <div>
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">
          Popular destinations
        </p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Start with the FACKTS network
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {POPULAR_DESTINATIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:border-orange-400/45 hover:bg-white/[.055]"
            >
              <p className="text-[8px] font-black uppercase tracking-[.16em] text-orange-300">
                {item.group}
              </p>
              <h3 className="mt-2 text-lg font-black uppercase">{item.label}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p>
              <span className="mt-4 inline-flex text-[9px] font-black uppercase tracking-[.12em] text-zinc-300 transition group-hover:text-orange-300">
                Open record →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2.5 text-[9px] font-black uppercase tracking-[.1em] transition ${
        active
          ? "bg-orange-500 text-black"
          : "border border-white/10 bg-white/[.04] text-zinc-400 hover:border-orange-400/40 hover:text-white"
      }`}
    >
      {label} <span className="ml-1 opacity-70">{count}</span>
    </button>
  );
}

function ResultCard({ item, onSelect }: { item: SearchResult; onSelect: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className="group flex min-h-32 items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#07101f] p-4 transition hover:-translate-y-0.5 hover:border-orange-400/45"
    >
      <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-blue-950 via-slate-950 to-orange-950/70">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-xl font-black text-orange-300">{item.title.slice(0, 1)}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[7px] font-black uppercase tracking-[.12em] ${groupTone[item.group]}`}>
          {item.type}
        </span>
        <span className="mt-2 block line-clamp-2 text-base font-black uppercase leading-tight text-white">
          {item.title}
        </span>
        {item.subtitle ? (
          <span className="mt-2 block line-clamp-2 text-[11px] leading-5 text-zinc-500">
            {item.subtitle}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-lg text-zinc-600 transition group-hover:translate-x-1 group-hover:text-orange-300">
        →
      </span>
    </Link>
  );
}

function LoadingGrid() {
  return (
    <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading search results">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex min-h-32 animate-pulse items-center gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="h-20 w-20 shrink-0 rounded-xl bg-white/[.06]" />
          <div className="flex-1">
            <div className="h-3 w-20 rounded bg-white/[.07]" />
            <div className="mt-3 h-4 w-4/5 rounded bg-white/[.07]" />
            <div className="mt-3 h-3 w-2/3 rounded bg-white/[.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="ml-2 h-5 w-5 shrink-0 text-orange-300 sm:h-6 sm:w-6"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
