"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const LOGO_SRC = "/fackts-hoops-logo.png";
const RECENT_SEARCHES_KEY = "fackts-hoops-recent-searches";

type NavItem = {
  label: string;
  href: string;
  activePaths?: string[];
};

type ContentResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

const primaryItems: NavItem[] = [
  { label: "Events", href: "/events" },
  { label: "Games", href: "/games" },
  { label: "Teams", href: "/teams" },
  {
    label: "Players",
    href: "/players",
    activePaths: ["/players", "/guest-hoopers"],
  },
  { label: "Media", href: "/media" },
  { label: "Merch", href: "/merch" },
  { label: "Partners", href: "/partners" },
];

const competitionItems: NavItem[] = [
  {
    label: "All Competitions",
    href: "/competitions",
    activePaths: ["/competitions"],
  },
  {
    label: "FACKTS Kings",
    href: "/competitions/fackts-kings",
    activePaths: ["/competitions/fackts-kings", "/one-on-one", "/leaderboards", "/guest-leaderboards"],
  },
  {
    label: "Court Takeovers",
    href: "/competitions/court-takeovers",
    activePaths: ["/competitions/court-takeovers", "/court-takeover"],
  },
  {
    label: "Court Takeovers Leaderboard",
    href: "/competitions/court-takeovers#leaderboards",
  },
];

const mobileItems: NavItem[] = [
  { label: "Home", href: "/" },
  ...primaryItems,
];

const searchablePages: NavItem[] = [
  ...mobileItems,
  ...competitionItems,
  { label: "Book Tournament Coverage", href: "/book-coverage" },
  { label: "Player Sign In", href: "/player" },
  { label: "Player Application", href: "/player-application" },
  { label: "Contact FACKTS", href: "/contact" },
];

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function AccountIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function PublicHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isAdminPage = pathname.startsWith("/admin");

  const normalizedSearch = search.trim().toLowerCase();
  const pageResults = useMemo(
    () =>
      normalizedSearch
        ? searchablePages.filter((item) =>
            `${item.label} ${item.href}`.toLowerCase().includes(normalizedSearch)
          )
        : [],
    [normalizedSearch]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMenuOpen(false);
      setSearchOpen(false);
      setSearch("");
      setContentResults([]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]"
        );
        setRecentSearches(Array.isArray(stored) ? stored.slice(0, 5) : []);
      } catch {
        setRecentSearches([]);
      }

      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    const query = search.trim();

    if (query.length < 2) {
      const clearTimer = window.setTimeout(() => {
        setContentResults([]);
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const payload = response.ok ? await response.json() : { results: [] };
        setContentResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setContentResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  function isActive(item: NavItem) {
    if (item.href === "/") return pathname === "/";

    return (item.activePaths ?? [item.href]).some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  }

  function rememberSearch(value: string) {
    const cleanValue = value.trim();
    if (!cleanValue) return;

    const next = [
      cleanValue,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== cleanValue.toLowerCase()
      ),
    ].slice(0, 5);

    setRecentSearches(next);

    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Search still works when storage is unavailable.
    }
  }

  function openSearch() {
    setMenuOpen(false);
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
    setContentResults([]);
  }

  function selectResult(label?: string) {
    rememberSearch(search.trim() || label || "");
    closeSearch();
  }

  if (isAdminPage) return null;

  const competitionsActive = competitionItems.some(isActive);
  const hasSearchResults = pageResults.length > 0 || contentResults.length > 0;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="mr-auto flex min-w-0 shrink-0 items-center gap-3"
            aria-label="FACKTS Hoops home"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-[#0B1F3A] shadow-sm">
              <img
                src={LOGO_SRC}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-[15px] font-black uppercase leading-none tracking-[-0.02em] text-[#0B1F3A]">
                FACKTS Hoops
              </span>
              <span className="mt-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Competition · Stats · Media
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary navigation">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-[13px] font-bold transition ${
                  isActive(item)
                    ? "bg-[#0B1F3A] text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#0B1F3A]"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="group relative">
              <button
                type="button"
                aria-haspopup="menu"
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-bold transition ${
                  competitionsActive
                    ? "bg-[#0B1F3A] text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#0B1F3A]"
                }`}
              >
                Competitions
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180"
                >
                  <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
                </svg>
              </button>

              <div className="invisible absolute right-0 top-full z-20 w-64 translate-y-2 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-950/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#F58220]">
                  FACKTS competitions
                </p>
                {competitionItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-[#0B1F3A] transition hover:bg-slate-100"
                  >
                    {item.label}
                    <ArrowIcon />
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="ml-1 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search FACKTS Hoops"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0B1F3A] transition hover:border-[#F58220] hover:text-[#F58220]"
            >
              <SearchIcon />
            </button>

            <Link
              href="/book-coverage"
              className="hidden rounded-lg bg-[#F58220] px-4 py-3 text-center text-xs font-black text-white shadow-sm transition hover:bg-[#dc6d10] md:inline-flex"
            >
              Book Tournament Coverage
            </Link>

            <Link
              href="/player"
              aria-label="Player account"
              className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-[#0B1F3A] transition hover:border-[#0B1F3A] lg:inline-flex"
            >
              <AccountIcon />
              <span className="hidden 2xl:inline">Account</span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open site menu"
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F3A] text-white transition hover:bg-[#102A4C] xl:hidden"
            >
              <span className="flex w-[18px] flex-col gap-1.5" aria-hidden="true">
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[100] transition duration-300 ${
          menuOpen ? "visible" : "invisible delay-300"
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label="Close site menu"
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 h-full w-full bg-[#0B1F3A]/70 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={`absolute right-0 top-0 flex h-full w-[min(90vw,390px)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex min-w-0 items-center gap-3"
            >
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#0B1F3A]">
                <img src={LOGO_SRC} alt="" className="h-full w-full object-cover" />
              </span>
              <span>
                <span className="block text-sm font-black uppercase text-[#0B1F3A]">
                  FACKTS Hoops
                </span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Basketball, documented properly
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-2xl leading-none text-[#0B1F3A]"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <button
              type="button"
              onClick={openSearch}
              className="mb-5 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-[#F3F6F9] px-4 py-3 text-left text-sm font-semibold text-slate-500 transition hover:border-[#F58220]"
            >
              <SearchIcon className="h-5 w-5 text-[#0B1F3A]" />
              Search events, teams, players…
            </button>

            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Explore
            </p>
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {mobileItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold transition ${
                    isActive(item)
                      ? "bg-[#0B1F3A] text-white"
                      : "text-[#182230] hover:bg-[#F3F6F9]"
                  }`}
                >
                  {item.label}
                  <ArrowIcon className="h-4 w-4 opacity-60" />
                </Link>
              ))}
            </nav>

            <div className="my-5 h-px bg-slate-200" />

            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Competitions
            </p>
            <div className="grid gap-1">
              {competitionItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold transition ${
                    isActive(item)
                      ? "bg-[#0B1F3A] text-white"
                      : "text-[#182230] hover:bg-[#F3F6F9]"
                  }`}
                >
                  {item.label}
                  <ArrowIcon className="h-4 w-4 opacity-60" />
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 p-5">
            <Link
              href="/book-coverage"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-lg bg-[#F58220] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#dc6d10]"
            >
              Book Tournament Coverage
            </Link>
            <Link
              href="/player"
              onClick={() => setMenuOpen(false)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#0B1F3A] px-5 py-3 text-sm font-black text-[#0B1F3A]"
            >
              <AccountIcon />
              Sign in
            </Link>
          </div>
        </aside>
      </div>

      <div
        className={`fixed inset-0 z-[120] overflow-y-auto bg-[#0B1F3A]/85 px-4 py-5 backdrop-blur-md transition duration-200 sm:px-6 sm:py-10 ${
          searchOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
        aria-hidden={!searchOpen}
      >
        <button
          type="button"
          aria-label="Close search"
          onClick={closeSearch}
          className="absolute inset-0 h-full w-full cursor-default"
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-label="Search FACKTS Hoops"
          className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <SearchIcon className="h-6 w-6 shrink-0 text-[#F58220]" />
              <label htmlFor="fackts-global-search" className="sr-only">
                Search events, games, teams, players and media
              </label>
              <input
                ref={searchInputRef}
                id="fackts-global-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events, games, teams, players and media"
                className="min-w-0 flex-1 bg-transparent py-2 text-base font-semibold text-[#182230] outline-none placeholder:text-slate-400 sm:text-lg"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0B1F3A] text-xl text-white"
              >
                ×
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
            {!normalizedSearch ? (
              <div>
                {recentSearches.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Recent searches
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRecentSearches([]);
                          try {
                            window.localStorage.removeItem(RECENT_SEARCHES_KEY);
                          } catch {
                            // Clearing the visible list is enough.
                          }
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-[#F58220]"
                      >
                        Clear history
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recentSearches.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSearch(item)}
                          className="rounded-lg border border-slate-200 bg-[#F3F6F9] px-3 py-2 text-sm font-bold text-[#0B1F3A] hover:border-[#F58220]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F3F6F9] p-5">
                    <p className="text-sm font-black text-[#0B1F3A]">
                      Find the basketball record you need.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Search by event, competition, player name, nickname, team,
                      game or media title.
                    </p>
                  </div>
                )}

                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Popular destinations
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Events", href: "/events" },
                    { label: "Teams", href: "/teams" },
                    { label: "Players", href: "/players" },
                    { label: "Competitions", href: "/competitions" },
                    { label: "FACKTS Kings", href: "/competitions/fackts-kings" },
                    { label: "Court Takeovers", href: "/competitions/court-takeovers" },
                    { label: "Court Takeovers Leaderboard", href: "/competitions/court-takeovers#leaderboards" },
                    { label: "Merchandise", href: "/merch" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => selectResult(item.label)}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-[#0B1F3A] hover:border-[#F58220]"
                    >
                      {item.label}
                      <ArrowIcon />
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Search results
                  </p>
                  {searching ? (
                    <span className="text-xs font-bold text-[#F58220]">
                      Searching…
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2">
                  {pageResults.map((item) => (
                    <Link
                      key={`page-${item.href}`}
                      href={item.href}
                      onClick={() => selectResult(item.label)}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-[#F58220] hover:bg-orange-50"
                    >
                      <span>
                        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#F58220]">
                          Page
                        </span>
                        <span className="mt-1 block text-sm font-black text-[#0B1F3A]">
                          {item.label}
                        </span>
                      </span>
                      <ArrowIcon className="h-5 w-5 text-[#0B1F3A]" />
                    </Link>
                  ))}

                  {contentResults.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => selectResult(item.title)}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-[#F58220] hover:bg-orange-50"
                    >
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#F58220]">
                          {item.type}
                        </span>
                        <span className="mt-1 block truncate text-sm font-black text-[#0B1F3A]">
                          {item.title}
                        </span>
                        {item.subtitle ? (
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>
                      <ArrowIcon className="h-5 w-5 shrink-0 text-[#0B1F3A]" />
                    </Link>
                  ))}
                </div>

                {!searching && !hasSearchResults ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-[#F3F6F9] px-5 py-8 text-center">
                    <p className="text-sm font-black text-[#0B1F3A]">
                      No matching record found.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try a player nickname, team, event, game or partner name.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
