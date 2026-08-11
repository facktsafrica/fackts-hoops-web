"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  canAdmin,
  type AdminCapability,
} from "@/lib/admin/permissions";
import { useAdminPermission } from "./AdminPermissionContext";
import AdminLogoutButton from "./AdminLogoutButton";

type AdminNavItem = {
  label: string;
  href: string;
  capability?: AdminCapability;
  phase1?: boolean;
};

const operationalItems: AdminNavItem[] = [
  { label: "Control Room", href: "/admin" },
  { label: "People & Players", href: "/admin/players", capability: "players", phase1: true },
  { label: "Events", href: "/admin/events", capability: "events", phase1: true },
  { label: "Create Event", href: "/admin/events/new", capability: "events", phase1: true },
  { label: "Games", href: "/admin/games", capability: "games", phase1: true },
  { label: "Rosters", href: "/admin/rosters", capability: "rosters", phase1: true },
  { label: "Game Statistics", href: "/admin/stats", capability: "stats", phase1: true },
  { label: "Consent & Releases", href: "/admin/consents", capability: "consents", phase1: true },
  { label: "Data Corrections", href: "/admin/corrections", capability: "corrections", phase1: true },
  { label: "Reports", href: "/admin/reports", capability: "reports", phase1: true },
  { label: "Users & Permissions", href: "/admin/users", capability: "admin_users", phase1: true },
];

const existingItems: AdminNavItem[] = [
  { label: "Teams", href: "/admin/teams", capability: "teams" },
  { label: "FACKTS Team", href: "/admin/team", capability: "team_members" },
  { label: "Player Applications", href: "/admin/player-applications", capability: "applications" },
  { label: "Player Accounts", href: "/admin/player-access", capability: "player_access" },
  { label: "Scheduling", href: "/admin/calendar", capability: "calendar" },
  { label: "1-on-1 Battles", href: "/admin/one-on-one", capability: "one_on_one" },
  { label: "Match Previews", href: "/admin/match-previews", capability: "match_previews" },
  { label: "Media Stories", href: "/admin/media-stories", capability: "media_stories" },
  { label: "Roster Announcements", href: "/admin/roster-announcements", capability: "roster_announcements" },
  { label: "App Notifications", href: "/admin/notifications", capability: "notifications" },
  { label: "Partners", href: "/admin/partners", capability: "partners" },
  { label: "Ticker / Site Notice", href: "/admin/ticker", capability: "ticker" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { profile, readOnly } = useAdminPermission();

  const permittedOperationalItems = useMemo(
    () =>
      operationalItems.filter(
        (item) =>
          (!item.capability || canAdmin(profile, item.capability)) &&
          !(readOnly && item.href === "/admin/events/new")
      ),
    [profile, readOnly]
  );
  const permittedExistingItems = useMemo(
    () =>
      existingItems.filter(
        (item) => !item.capability || canAdmin(profile, item.capability)
      ),
    [profile]
  );

  function renderItem(item: AdminNavItem) {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition ${
          active
            ? "border-orange-500/50 bg-orange-500/15 text-orange-100"
            : "border-slate-800 bg-slate-900 text-slate-200 hover:border-orange-400/60"
        }`}
      >
        <span>{item.label}</span>
        {item.phase1 ? (
          <span className="rounded-full bg-orange-500/15 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-orange-300">
            Core
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-[80] border-b border-slate-800 bg-slate-950/95 text-white shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/admin" className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
              FACKTS Hoops
            </p>
            <p className="truncate text-lg font-black">Admin Operations</p>
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
                  Authorized tools
                </p>
                <p className="mt-1 text-xl font-black">Operations Menu</p>
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
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Operational core
              </p>
              <div className="grid gap-2">
                {permittedOperationalItems.map(renderItem)}
              </div>

              {permittedExistingItems.length ? (
                <>
                  <p className="mb-3 mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Existing tools
                  </p>
                  <div className="grid gap-2">
                    {permittedExistingItems.map(renderItem)}
                  </div>
                </>
              ) : null}
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
