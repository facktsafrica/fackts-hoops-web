"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOGO_SRC = "/fackts-hoops-logo.png";

type NavItem = {
  label: string;
  href: string;
  activePaths?: string[];
  highlight?: boolean;
};

type ContentResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

const mainItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Player Login / Portal", href: "/player", highlight: true },
  { label: "Admin Login", href: "/admin/login" },
  { label: "Official Players", href: "/players" },
  { label: "Events", href: "/events" },
  { label: "Merch", href: "/merch" },
  { label: "Media", href: "/media" },
];

const courtTakeoverItems: NavItem[] = [
  {
    label: "Court Takeover Home",
    href: "/court-takeover",
    activePaths: ["/court-takeover"],
    highlight: true,
  },
  { label: "Games", href: "/games" },
  { label: "1-on-1 Battles", href: "/one-on-one" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Guest Hoopers", href: "/guest-hoopers" },
  { label: "Guest Leaders", href: "/guest-leaderboards" },
  { label: "Rosters", href: "/rosters" },
];

const workWithUsItems: NavItem[] = [
  { label: "Book Coverage", href: "/book-coverage", highlight: true },
  { label: "Player Application", href: "/player-application", highlight: true },
  { label: "Partners", href: "/partners" },
  { label: "Partner With Us", href: "/partner" },
  { label: "Contact Us", href: "/contact" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isAdminPage = pathname.startsWith("/admin");
  const allItems = [...mainItems, ...courtTakeoverItems, ...workWithUsItems];
  const pageResults = search.trim()
    ? allItems.filter((item) =>
        `${item.label} ${item.href}`.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setContentResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = response.ok ? await response.json() : { results: [] };
        setContentResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setContentResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  function clearSearch() {
    setSearch("");
    setContentResults([]);
    setSearching(false);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function isActive(item: NavItem) {
    if (item.href === "/") return pathname === "/";

    const pathsToCheck = item.activePaths ?? [item.href];

    return pathsToCheck.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  }

  function linkClass(item: NavItem) {
    const active = isActive(item);

    if (item.highlight && active) {
      return "rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-black shadow-lg shadow-orange-950/30";
    }

    if (item.highlight) {
      return "rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-orange-400";
    }

    if (active) {
      return "rounded-2xl bg-orange-500/15 px-4 py-3 text-center text-sm font-black text-orange-300 ring-1 ring-orange-500/40";
    }

    return "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-center text-sm font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300";
  }

  if (isAdminPage) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <img
                src={LOGO_SRC}
                alt="FACKTS Hoops"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-black leading-tight text-white md:text-xl">
                FACKTS Hoops
              </div>
              <div className="truncate text-[11px] text-slate-400 md:text-xs">
                Basketball. Culture. Data.
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/player"
              className="hidden rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200 transition hover:bg-blue-500 hover:text-white sm:inline-flex md:px-4 md:text-sm"
            >
              Player Login
            </Link>

            <Link
              href="/admin/login"
              className="hidden rounded-full border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300 sm:inline-flex md:px-4 md:text-sm"
            >
              Admin Login
            </Link>

            <Link
              href="/court-takeover"
              className="hidden rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-300 transition hover:bg-orange-500 hover:text-black xl:inline-flex"
            >
              Court Takeover
            </Link>

            <Link
              href="/book-coverage"
              className="hidden rounded-full bg-orange-500 px-5 py-2 text-sm font-black text-black transition hover:bg-orange-400 2xl:inline-flex"
            >
              Book Coverage
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open site menu"
              aria-expanded={open}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
            >
              <span className="sr-only">Open site menu</span>
              <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black">
            <div className="border-b border-slate-800 p-5">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    <img
                      src={LOGO_SRC}
                      alt="FACKTS Hoops"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xl font-black text-white">
                      FACKTS Hoops
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      Basketball. Culture. Data.
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close site menu"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 text-xl font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="sticky -top-5 z-10 -mx-1 mb-5 bg-slate-950 px-1 pb-3 pt-1">
                <label htmlFor="site-search" className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                  Search the app
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 focus-within:border-orange-400">
                  <span aria-hidden="true" className="text-slate-500">⌕</span>
                  <input
                    ref={searchInputRef}
                    id="site-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Players, games, events, media…"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600"
                  />
                  {search ? (
                    <button type="button" onClick={clearSearch} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 text-base font-black text-slate-300 transition hover:bg-orange-500 hover:text-black" aria-label="Clear search">×</button>
                  ) : null}
                </div>
              </div>

              {search.trim() ? (
                <section>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                    Quick results
                  </div>
                  <div className="mt-3 grid gap-2">
                    {pageResults.map((item) => (
                      <Link
                        key={`page-${item.href}`}
                        href={item.href}
                        onClick={() => { setOpen(false); setSearch(""); }}
                        className={linkClass(item)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {contentResults.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => { setOpen(false); clearSearch(); }}
                        className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition hover:border-orange-400"
                      >
                        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">{item.type}</span>
                        <span className="mt-1 block text-sm font-black text-white">{item.title}</span>
                        {item.subtitle ? <span className="mt-0.5 block text-xs text-slate-400">{item.subtitle}</span> : null}
                      </Link>
                    ))}
                    {searching ? <div className="px-4 py-3 text-center text-xs font-bold text-slate-500">Searching players, games, 1v1s and events…</div> : null}
                    {!searching && !pageResults.length && !contentResults.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                        No match found. Try a player, nickname, team, event, game or partner.
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : <>
              <section>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                  Main
                </div>

                <div className="mt-3 grid gap-2">
                  {mainItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={linkClass(item)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="mt-6">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                  Court Takeover Portal
                </div>

                <div className="mt-3 grid gap-2">
                  {courtTakeoverItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={linkClass(item)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="mt-6">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                  Work With Us
                </div>

                <div className="mt-3 grid gap-2">
                  {workWithUsItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={linkClass(item)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
              </>}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
