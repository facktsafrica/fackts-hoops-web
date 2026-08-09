"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AdminLogoutButton from "./AdminLogoutButton";

const adminItems = [
  ["Control Room", "/admin"],
  ["Players", "/admin/players"],
  ["Public Player Profiles", "/admin/player-profiles"],
  ["Teams", "/admin/teams"],
  ["Player Applications", "/admin/player-applications"],
  ["Player Accounts", "/admin/player-access"],
  ["Games", "/admin/games"],
  ["Player Stats", "/admin/stats"],
  ["Scheduling", "/admin/calendar"],
  ["Events", "/admin/events"],
  ["1-on-1 Battles", "/admin/one-on-one"],
  ["Ticker / Site Notice", "/admin/ticker"],
  ["Guest Hoopers", "/admin/guest-hoopers"],
  ["Guest Game Stats", "/admin/guest-game-stats"],
  ["Rosters", "/admin/rosters"],
  ["App Notifications", "/admin/notifications"],
  ["Partners", "/admin/partners"],
] as const;

export default function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[80] border-b border-slate-800 bg-slate-950/95 text-white shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/admin" className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
              FACKTS Hoops
            </p>
            <p className="truncate text-lg font-black">Admin Control Room</p>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            aria-expanded={open}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white transition hover:border-orange-400 hover:text-orange-300"
          >
            <span className="sr-only">Open admin menu</span>
            <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
              <span className="h-0.5 w-full rounded-full bg-current" />
              <span className="h-0.5 w-full rounded-full bg-current" />
              <span className="h-0.5 w-full rounded-full bg-current" />
            </span>
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close admin menu overlay"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
                  Admin Only
                </p>
                <p className="mt-1 text-xl font-black">Control Menu</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close admin menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 text-xl font-black text-slate-200 hover:border-orange-400 hover:text-orange-300"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-2">
                {adminItems.map(([label, href]) => {
                  const active =
                    href === "/admin"
                      ? pathname === href
                      : pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                        active
                          ? "border-orange-500/50 bg-orange-500/15 text-orange-200"
                          : "border-slate-800 bg-slate-900 text-slate-200 hover:border-orange-400/60"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-5">
              <Link
                href="/"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-200"
              >
                View Site
              </Link>
              <AdminLogoutButton />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
