"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LOGO_SRC = "/fackts-hoops-logo.png";

type NavItem = {
  label: string;
  href: string;
  activePaths?: string[];
  highlight?: boolean;
};

const mainItems: NavItem[] = [
  { label: "Home", href: "/" },
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
              href="/court-takeover"
              className="hidden rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-300 transition hover:bg-orange-500 hover:text-black md:inline-flex"
            >
              Court Takeover
            </Link>

            <Link
              href="/book-coverage"
              className="hidden rounded-full bg-orange-500 px-5 py-2 text-sm font-black text-black transition hover:bg-orange-400 sm:inline-flex"
            >
              Book Coverage
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300 md:px-5 md:text-sm"
            >
              Menu
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
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
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
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}