"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { canAdmin, type AdminCapability } from "@/lib/admin/permissions";
import { useAdminPermission } from "./AdminPermissionContext";
import AdminLogoutButton from "./AdminLogoutButton";

type AdminNavItem = {
  label: string;
  href: string;
  code: string;
  capability?: AdminCapability;
  writeOnly?: boolean;
};

type AdminNavGroup = { label: string; items: AdminNavItem[] };

const groups: AdminNavGroup[] = [
  {
    label: "Executive intelligence",
    items: [
      { label: "Control Room", href: "/admin", code: "CR" },
      { label: "Reports", href: "/admin/reports", code: "RP", capability: "reports" },
      { label: "Scheduling", href: "/admin/calendar", code: "SC", capability: "calendar" },
    ],
  },
  {
    label: "Event operations",
    items: [
      { label: "Events & Competitions", href: "/admin/events", code: "EV", capability: "events" },
      { label: "Create Event", href: "/admin/events/new", code: "+", capability: "events", writeOnly: true },
      { label: "Games", href: "/admin/games", code: "GM", capability: "games" },
      { label: "Rosters", href: "/admin/rosters", code: "RS", capability: "rosters" },
      { label: "Game Statistics", href: "/admin/stats", code: "ST", capability: "stats" },
      { label: "Consent & Releases", href: "/admin/consents", code: "CN", capability: "consents" },
      { label: "Data Corrections", href: "/admin/corrections", code: "DC", capability: "corrections" },
    ],
  },
  {
    label: "FACKTS Kings",
    items: [
      { label: "Kings Battles", href: "/admin/one-on-one", code: "K1", capability: "one_on_one" },
      { label: "Competition Profiles", href: "/admin/competitions", code: "CP", capability: "one_on_one" },
      { label: "Match Previews", href: "/admin/match-previews", code: "MP", capability: "match_previews" },
    ],
  },
  {
    label: "People & organization",
    items: [
      { label: "People & Players", href: "/admin/players", code: "PL", capability: "players" },
      { label: "Teams", href: "/admin/teams", code: "TM", capability: "teams" },
      { label: "Team Partner Portals", href: "/admin/team-portals", code: "TP", capability: "admin_users" },
      { label: "Player Applications", href: "/admin/player-applications", code: "PA", capability: "applications" },
      { label: "Player Accounts", href: "/admin/player-access", code: "AC", capability: "player_access" },
      { label: "FACKTS Team", href: "/admin/team", code: "FT", capability: "team_members" },
      { label: "Users & Permissions", href: "/admin/users", code: "UP", capability: "admin_users" },
    ],
  },
  {
    label: "Content & growth",
    items: [
      { label: "Media Centre", href: "/admin/media", code: "MC", capability: "media" },
      { label: "Homepage Player of Game", href: "/admin/highlights", code: "PG", capability: "highlights" },
      { label: "Media Stories", href: "/admin/media-stories", code: "MS", capability: "media_stories" },
      { label: "Roster Announcements", href: "/admin/roster-announcements", code: "RA", capability: "roster_announcements" },
      { label: "App Notifications", href: "/admin/notifications", code: "NT", capability: "notifications" },
      { label: "Email Notifications", href: "/admin/email", code: "EM", capability: "email" },
      { label: "Partners", href: "/admin/partners", code: "PR", capability: "partners" },
      { label: "Ticker / Site Notice", href: "/admin/ticker", code: "TK", capability: "ticker" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function readableRole(value?: string | null) {
  return String(value || "administrator")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { profile, readOnly } = useAdminPermission();

  const permittedGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              (!item.capability || canAdmin(profile, item.capability)) &&
              !(readOnly && item.writeOnly)
          ),
        }))
        .filter((group) => group.items.length),
    [profile, readOnly]
  );

  function renderNavigation() {
    return (
      <nav className="admin-executive-scrollbar flex-1 overflow-y-auto px-3 py-5">
        {permittedGroups.map((group) => (
          <section key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      active
                        ? "border-orange-400/35 bg-orange-500/10 text-white shadow-[inset_3px_0_0_#f97316]"
                        : "border-transparent text-slate-400 hover:border-blue-400/15 hover:bg-blue-400/[0.06] hover:text-white"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-black tracking-[0.08em] ${active ? "border-orange-400/35 bg-orange-500/15 text-orange-200" : "border-slate-700/80 bg-slate-900/80 text-slate-500 group-hover:text-blue-200"}`}>
                      {item.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    );
  }

  function renderFooter() {
    return (
      <div className="border-t border-blue-400/10 p-4">
        <div className="mb-3 rounded-xl border border-blue-400/10 bg-blue-400/[0.04] p-3">
          <p className="truncate text-xs font-black text-white">
            {profile?.display_name || profile?.email || "FACKTS Administrator"}
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-300/70">
            {readOnly ? "Read-only · " : ""}{readableRole(profile?.role)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/" className="rounded-xl border border-blue-400/15 px-3 py-2.5 text-center text-xs font-black text-slate-300 transition hover:border-orange-400/40 hover:text-white">
            View Site
          </Link>
          <AdminLogoutButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-[90] hidden w-[17.5rem] flex-col border-r border-blue-400/10 bg-[#030b1a]/95 text-white shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex print:hidden">
        <Link href="/admin" className="border-b border-blue-400/10 px-5 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-slate-950 shadow-lg shadow-orange-950/30">FH</span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-orange-300">FACKTS Hoops</span>
              <span className="mt-1 block truncate text-lg font-black tracking-tight">Executive Admin</span>
            </span>
          </div>
        </Link>
        {renderNavigation()}
        {renderFooter()}
      </aside>

      <header className="sticky top-0 z-[80] border-b border-blue-400/10 bg-[#030b1a]/95 text-white shadow-xl shadow-black/20 backdrop-blur-xl lg:hidden print:hidden">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-xs font-black text-slate-950">FH</span>
            <span className="min-w-0">
              <span className="block truncate text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">FACKTS Hoops</span>
              <span className="block truncate text-base font-black">Executive Admin</span>
            </span>
          </Link>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" aria-expanded={open} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.06] text-white">
            <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
              <span className="h-0.5 w-full rounded-full bg-current" />
              <span className="h-0.5 w-full rounded-full bg-current" />
              <span className="h-0.5 w-full rounded-full bg-current" />
            </span>
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm lg:hidden print:hidden">
          <button type="button" aria-label="Close admin menu overlay" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full" />
          <aside className="absolute right-0 top-0 flex h-full w-[min(92vw,24rem)] flex-col border-l border-blue-400/15 bg-[#030b1a] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-400/10 p-5">
              <div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-300">FACKTS Hoops</p><p className="mt-1 text-xl font-black">Executive Menu</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close admin menu" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/15 text-2xl text-slate-300">×</button>
            </div>
            {renderNavigation()}
            {renderFooter()}
          </aside>
        </div>
      ) : null}
    </>
  );
}
