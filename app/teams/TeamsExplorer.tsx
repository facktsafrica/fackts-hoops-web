"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamDirectoryItem } from "@/lib/hoops/teamProfiles";

function clean(value?: string | null) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function typeLabel(value?: string | null) {
  return clean(value).replace(/_/g, " ") || "Basketball team";
}

export default function TeamsExplorer({ teams }: { teams: TeamDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [location, setLocation] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const types = useMemo(
    () => [...new Set(teams.map((team) => clean(team.profile.team_type)).filter(Boolean))].sort(),
    [teams]
  );
  const locations = useMemo(
    () => [...new Set(teams.map((team) => clean(team.profile.city)).filter(Boolean))].sort(),
    [teams]
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return teams.filter(({ profile }) => {
      const haystack = [
        profile.name,
        profile.short_name,
        profile.organization_name,
        profile.city,
        profile.country,
        profile.team_type,
        profile.division,
        profile.current_competition,
      ].join(" ").toLowerCase();
      return (
        (!needle || haystack.includes(needle)) &&
        (type === "all" || clean(profile.team_type) === type) &&
        (location === "all" || clean(profile.city) === location) &&
        (!verifiedOnly || profile.verification_status === "verified")
      );
    });
  }, [location, query, teams, type, verifiedOnly]);

  const reset = () => {
    setQuery("");
    setType("all");
    setLocation("all");
    setVerifiedOnly(false);
  };

  return (
    <section id="team-directory" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Team directory</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">Official team spaces</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Search permanent organizations—not a duplicated list of every team that ever entered an event.</p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[.15em] text-zinc-600">{filtered.length} of {teams.length} teams</span>
      </div>

      <div className="mt-7 grid gap-3 rounded-[1.5rem] border border-white/10 bg-black/35 p-4 backdrop-blur sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-[8px] font-black uppercase tracking-[.14em] text-zinc-500">Search teams</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, competition or location" className={controlClass} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[8px] font-black uppercase tracking-[.14em] text-zinc-500">Team type</span>
          <select value={type} onChange={(event) => setType(event.target.value)} className={controlClass}>
            <option value="all">All team types</option>
            {types.map((item) => <option key={item} value={item}>{typeLabel(item)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-[8px] font-black uppercase tracking-[.14em] text-zinc-500">Location</span>
          <select value={location} onChange={(event) => setLocation(event.target.value)} className={controlClass}>
            <option value="all">All locations</option>
            {locations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-white/10 bg-slate-950 px-4 text-[9px] font-black uppercase tracking-[.1em] text-zinc-300">
          <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="h-4 w-4 accent-orange-500" />
          Verified only
        </label>
      </div>

      {filtered.length ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((team) => <TeamCard key={team.profile.slug} team={team} />)}
        </div>
      ) : (
        <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/15 bg-black/35 px-6 py-12 text-center">
          <p className="text-lg font-black uppercase">No permanent team matches</p>
          <p className="mt-2 text-sm text-zinc-500">Try a broader search or clear the filters.</p>
          <button type="button" onClick={reset} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-[9px] font-black uppercase tracking-[.13em] text-black">Clear filters</button>
        </div>
      )}
    </section>
  );
}

function TeamCard({ team }: { team: TeamDirectoryItem }) {
  const { profile, latestGame, performance } = team;
  const verified = profile.verification_status === "verified";
  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/90 shadow-[0_24px_70px_rgba(0,0,0,.28)] transition duration-300 hover:-translate-y-1 hover:border-orange-400/45">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0b1f3a]">
        {profile.cover_image_url ? <img src={profile.cover_image_url} alt={`${profile.name} basketball`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="h-full bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.32),transparent_38%),linear-gradient(135deg,#102a4c,#050b16)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b16] via-black/25 to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] backdrop-blur ${verified ? "border-emerald-300/35 bg-emerald-500/20 text-emerald-200" : "border-white/15 bg-black/55 text-zinc-300"}`}>
          {verified ? "✓ Verified team" : "Team profile"}
        </span>
        <div className="absolute inset-x-4 bottom-4 flex items-end gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-[#0b1f3a] shadow-xl">
            {profile.logo_url ? <img src={profile.logo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-black text-orange-300">{(profile.short_name || profile.name).slice(0, 2).toUpperCase()}</span>}
          </span>
          <div className="min-w-0 pb-1">
            <h3 className="break-words text-2xl font-black uppercase leading-none">{profile.name}</h3>
            <p className="mt-2 truncate text-[9px] font-black uppercase tracking-[.12em] text-orange-300">{typeLabel(profile.team_type)}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold text-zinc-400">{[profile.city, profile.country].filter(Boolean).join(", ") || "Location not listed"}</p>
          {profile.current_competition ? <span className="max-w-[48%] rounded-md bg-blue-500/10 px-2 py-1 text-right text-[8px] font-black uppercase leading-3 text-blue-300">{profile.current_competition}</span> : null}
        </div>

        <div className="mt-4 grid grid-cols-4 divide-x divide-white/10 rounded-xl border border-white/10 bg-black/35 py-3 text-center">
          <CardStat value={team.rosterCount} label="Players" />
          <CardStat value={team.gameCount} label="Games" />
          <CardStat value={team.leagueCount} label="Leagues" />
          <CardStat value={`${Math.round(performance.winPercentage)}%`} label="Win rate" />
        </div>

        <div className="mt-4 min-h-[5.25rem] rounded-xl border border-white/[.08] bg-white/[.025] p-3">
          {latestGame ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">Latest recorded game · {formatDate(latestGame.game_date)}</p>
                <p className="mt-2 truncate text-sm font-black">vs {latestGame.opponent_name || "Opponent"}</p>
                <p className="mt-1 truncate text-[9px] font-bold uppercase text-zinc-500">{latestGame.competition_name || "Basketball game"}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-grid h-7 w-7 place-items-center rounded-full text-[10px] font-black ${latestGame.result === "W" ? "bg-emerald-500 text-black" : latestGame.result === "L" ? "bg-red-500 text-white" : "bg-white/10 text-white"}`}>{latestGame.result || "–"}</span>
                <p className="mt-2 text-lg font-black">{latestGame.team_score ?? "–"}–{latestGame.opponent_score ?? "–"}</p>
              </div>
            </div>
          ) : <p className="py-4 text-center text-xs text-zinc-600">No team result published yet.</p>}
        </div>

        <Link href={`/teams/${profile.slug}`} className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-4 text-[10px] font-black uppercase tracking-[.13em] text-black transition hover:bg-orange-400">
          Open team profile
        </Link>
      </div>
    </article>
  );
}

function CardStat({ value, label }: { value: string | number; label: string }) {
  return <div className="min-w-0 px-1"><p className="truncate text-base font-black text-white">{value}</p><p className="mt-1 truncate text-[7px] font-black uppercase tracking-[.08em] text-zinc-600">{label}</p></div>;
}

const controlClass = "h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-400";
