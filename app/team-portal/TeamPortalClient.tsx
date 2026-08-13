"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { TEAM_CAPABILITY_LABELS, type TeamCapability } from "@/lib/team-portal/capabilities";

type JsonRecord = Record<string, any>;
type PortalData = {
  portal: { team: JsonRecord; membership: JsonRecord; subscription: JsonRecord; capabilities: TeamCapability[] };
  roster: JsonRecord[];
  training: JsonRecord[];
  games: JsonRecord[];
  media_summary: JsonRecord;
  branding_submissions: JsonRecord[];
  media_submissions: JsonRecord[];
  stat_submissions: JsonRecord[];
  profile_requests: JsonRecord[];
  broadcast_channel: JsonRecord | null;
  broadcasts: JsonRecord[];
  league_memberships: JsonRecord[];
  leaderboard_links: JsonRecord[];
};

const tabs = [
  ["command", "Command Centre"],
  ["training", "Training"],
  ["team", "Team & Players"],
  ["media", "Media Readiness"],
  ["stats", "Stats Desk"],
  ["live", "Live Studio"],
] as const;

const input = "w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--club-accent)]";
const button = "rounded-xl bg-[var(--club-accent)] px-5 py-3 text-xs font-black uppercase tracking-[.08em] text-white shadow-lg transition hover:brightness-110 disabled:opacity-50";

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function Status({ ready, pending }: { ready: boolean; pending: boolean }) {
  return <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${ready ? "bg-emerald-500/20 text-emerald-300" : pending ? "bg-orange-500/20 text-orange-200" : "bg-red-500/15 text-red-300"}`}>{ready ? "Ready" : pending ? "In review" : "Missing"}</span>;
}

function safeColor(value: unknown, fallback: string) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export default function TeamPortalClient({ teamId }: { teamId: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("command");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [encoder, setEncoder] = useState<{ ingestion_address: string; stream_name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/team-portal?team_id=${encodeURIComponent(teamId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) setData(payload as PortalData);
    else setMessage(payload.error || "Team portal could not be loaded.");
    setLoading(false);
  }, [teamId]);

  useEffect(() => { void load(); }, [load]);

  const has = (capability: TeamCapability) => data?.portal.capabilities.includes(capability) || false;
  const team = data?.portal.team;
  const primaryColor = safeColor(team?.primary_color, "#0B1F3A");
  const accentColor = safeColor(team?.secondary_color, "#F58220");
  const portalStyle = {
    "--club-primary": primaryColor,
    "--club-accent": accentColor,
  } as CSSProperties;
  const missingActions = useMemo(() => data?.games.flatMap((game) => [
    !game.poster.ready && !game.poster.pending ? { game, role: "poster", label: "poster" } : null,
    !game.full_game.ready && !game.full_game.pending ? { game, role: "full_game", label: "full game" } : null,
  ]).filter(Boolean) as Array<{ game: JsonRecord; role: string; label: string }> || [], [data]);

  async function post(body: JsonRecord, successTab?: typeof tab) {
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/team-portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, team_id: teamId }) });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || (response.ok ? "Saved." : "Update failed."));
    setWorking(false);
    if (response.ok) { if (successTab) setTab(successTab); await load(); }
    return { response, payload };
  }

  async function upload(form: HTMLFormElement) {
    setWorking(true);
    setMessage("");
    const body = new FormData(form);
    body.set("team_id", teamId);
    const response = await fetch("/api/team-portal/upload", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || (response.ok ? "Uploaded." : "Upload failed."));
    setWorking(false);
    if (response.ok) { form.reset(); await load(); }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.assign("/team-portal/login");
  }

  if (loading && !data) return <main className="grid min-h-screen place-items-center bg-[#030b1a] text-white"><div className="rounded-3xl border border-white/10 bg-slate-950 p-8 text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Team intelligence</p><p className="mt-3 text-2xl font-black">Opening workspace…</p></div></main>;
  if (!data || !team) return <main className="grid min-h-screen place-items-center bg-[#030b1a] px-4 text-white"><div className="max-w-lg rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center"><h1 className="text-2xl font-black">Portal unavailable</h1><p className="mt-3 text-sm text-red-100">{message}</p><Link href="/team-portal/login" className="mt-5 inline-block font-black text-orange-300">Return to login</Link></div></main>;

  return (
    <main className="min-h-screen bg-[#030b1a] text-white" style={portalStyle}>
      <header className="relative overflow-hidden border-b border-white/15">
        {team.cover_image_url ? <img src={team.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${primaryColor} 4%, ${primaryColor}ed 52%, #030b1ae8 100%)` }} />
        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl">{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-contain p-1" /> : <span className="text-2xl font-black" style={{ color: accentColor }}>{String(team.short_name || team.name).slice(0, 2).toUpperCase()}</span>}</div>
              <div><p className="text-[9px] font-black uppercase tracking-[.22em]" style={{ color: accentColor }}>FACKTS Club Intelligence</p><h1 className="mt-2 text-4xl font-black uppercase leading-none sm:text-5xl">{team.name}</h1><p className="mt-2 text-sm text-slate-300">Registered club workspace · {data.portal.membership.role} access</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><Link href={`/teams/${team.slug}`} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black">Public profile</Link><button onClick={logout} className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs font-black text-red-200">Logout</button></div>
          </div>
          <div className="mt-7 flex gap-2 overflow-x-auto pb-1">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={tab === key ? { backgroundColor: accentColor } : undefined} className={`shrink-0 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.1em] ${tab === key ? "text-white shadow-lg" : "border border-white/10 bg-black/25 text-slate-300"}`}>{label}</button>)}</div>
        </div>
      </header>

      {message ? <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6 lg:px-8"><div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 px-5 py-4 text-sm text-orange-100">{message}</div></div> : null}

      {tab === "command" ? <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Roster" value={data.roster.length} /><Metric label="Training" value={data.training.length} /><Metric label="Games" value={data.games.length} /><Metric label="Media gaps" value={data.media_summary.missing_posters + data.media_summary.missing_full_games} tone="orange" /><Metric label="In review" value={data.media_summary.pending + data.stat_submissions.filter((item) => item.status === "pending").length} /></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <Panel eyebrow="Next best actions" title="What needs attention">
            {missingActions.length ? <div className="mt-5 grid gap-3">{missingActions.slice(0, 8).map((item) => <button key={`${item.game.id}-${item.role}`} onClick={() => setTab("media")} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/25 p-4 text-left"><div><p className="text-sm font-black">Add {item.label}</p><p className="mt-1 text-xs text-slate-500">{item.game.title}</p></div><span className="text-xs font-black text-orange-300">Fix →</span></button>)}</div> : <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">All linked games have posters and full-game coverage, or submissions are already in review.</p>}
          </Panel>
          <Panel eyebrow="Competition intelligence" title="Leaderboards">
            <p className="mt-3 text-sm leading-6 text-slate-400">The club appears in the public portal and standings for every league, season and division assigned by FACKTS.</p>
            <div className="mt-5 grid gap-3">{data.leaderboard_links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl border border-white/15 bg-white/[.04] p-4 text-sm font-black text-[var(--club-accent)]">{link.title} →</Link>)}</div>
          </Panel>
        </div>
        <div className="mt-6"><Panel eyebrow="Club access" title="Workspace permissions"><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(TEAM_CAPABILITY_LABELS) as TeamCapability[]).map((capability) => <div key={capability} className={`rounded-xl border p-4 ${has(capability) ? "border-emerald-400/20 bg-emerald-500/10" : "border-white/10 bg-black/20 opacity-60"}`}><p className="text-sm font-black">{TEAM_CAPABILITY_LABELS[capability]}</p><p className={`mt-2 text-[9px] font-black uppercase ${has(capability) ? "text-emerald-300" : "text-slate-500"}`}>{has(capability) ? "Active" : "Controlled upgrade or role"}</p></div>)}</div></Panel></div>
      </section> : null}

      {tab === "training" ? <Feature capability="training_manage" active={has("training_manage")} title="Training workspace">
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <Panel eyebrow="New session" title="Plan training"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "create_training", title: form.get("title"), session_date: form.get("session_date"), venue: form.get("venue"), focus_area: form.get("focus_area"), summary: form.get("summary") }, "training"); event.currentTarget.reset(); }} className="mt-5 grid gap-3"><input name="title" required placeholder="Session title" className={input}/><input name="session_date" required type="datetime-local" className={input}/><input name="focus_area" placeholder="Focus area" className={input}/><input name="venue" placeholder="Venue" className={input}/><textarea name="summary" rows={4} placeholder="Session plan or summary" className={input}/><button disabled={working} className={button}>Save session</button></form></Panel>
          <Panel eyebrow="Development calendar" title={`${data.training.length} sessions`}><div className="mt-5 grid gap-3">{data.training.map((session) => <article key={session.id} className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-black">{session.title}</p><p className="mt-1 text-xs text-slate-500">{formatDate(session.session_date)} · {session.venue || "Venue TBA"}</p></div><Status ready={session.submission_status === "published"} pending={session.submission_status === "pending"}/></div><p className="mt-3 text-sm text-slate-400">{session.focus_area || session.summary || "Development session"}</p><form onSubmit={(event) => { event.preventDefault(); void upload(event.currentTarget); }} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="kind" value="training"/><input type="hidden" name="training_id" value={session.id}/><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="min-w-0 flex-1 text-xs text-slate-400"/><button disabled={working} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase">Attach image</button></form></article>)}{!data.training.length ? <Empty text="No team training sessions have been added yet."/> : null}</div></Panel>
        </div>
      </Feature> : null}

      {tab === "team" ? <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <Feature capability="roster_manage" active={has("roster_manage")} title="Roster management" compact><Panel eyebrow="Public team roster" title="Add team member"><p className="mt-3 text-sm leading-6 text-slate-400">The player will appear on this club’s public roster. This does not create an official FACKTS player profile.</p><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "add_roster_member", display_name: form.get("display_name"), nickname: form.get("nickname"), jersey_number: form.get("jersey_number"), position: form.get("position") }); event.currentTarget.reset(); }} className="mt-5 grid gap-3"><input name="display_name" required placeholder="Player name" className={input}/><div className="grid grid-cols-2 gap-3"><input name="nickname" placeholder="Nickname" className={input}/><input name="jersey_number" placeholder="Jersey #" className={input}/></div><input name="position" placeholder="Position" className={input}/><button disabled={working} className={button}>Add to team roster</button></form></Panel></Feature>
        <Panel eyebrow="Team people" title={`${data.roster.length} active roster records`}><div className="mt-5 grid gap-3 sm:grid-cols-2">{data.roster.map((member) => <article key={member.id} className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="font-black">{member.display_name}</p><p className="mt-1 text-xs uppercase text-slate-500">{member.position || member.role || "Player"}{member.jersey_number ? ` · #${member.jersey_number}` : ""}</p><div className="mt-3 flex flex-wrap gap-3">{has("player_profile_request") ? <button onClick={() => { const bio = window.prompt(`Profile notes for ${member.display_name}`); if (bio) void post({ action: "request_player_profile", roster_member_id: member.id, position: member.position, bio }); }} className="text-[9px] font-black uppercase text-[var(--club-accent)]">Request official profile →</button> : <span className="text-[9px] font-black uppercase text-slate-600">Official profiling locked</span>}<button onClick={() => { if (window.confirm(`Remove ${member.display_name} from the active team roster?`)) void post({ action: "remove_roster_member", roster_member_id: member.id }); }} className="text-[9px] font-black uppercase text-red-300">Remove</button></div></article>)}{!data.roster.length ? <Empty text="No active team roster records yet."/> : null}</div></Panel>
      </div></section> : null}

      {tab === "media" ? <Feature capability="media_submit" active={has("media_submit")} title="Media readiness">
        <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
          <div className="grid gap-6"><Panel eyebrow="Team identity" title="Hero & logo uploads"><p className="mt-3 text-sm leading-6 text-slate-400">Uploads remain private until Super Admin approves the public change.</p>{has("branding_submit") ? <div className="mt-5 grid gap-4">{["hero", "logo"].map((kind) => <form key={kind} onSubmit={(event) => { event.preventDefault(); void upload(event.currentTarget); }} className="rounded-xl border border-white/10 bg-black/25 p-4"><input type="hidden" name="kind" value={kind}/><p className="mb-3 text-xs font-black uppercase">{kind === "hero" ? "Hero page image" : "Team logo"}</p><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="w-full text-xs text-slate-400"/><button disabled={working} className={`${button} mt-3`}>Upload {kind}</button></form>)}</div> : <Locked label="Branding uploads"/>}</Panel>
          <Panel eyebrow="Team photos" title="Upload gallery image"><form onSubmit={(event) => { event.preventDefault(); void upload(event.currentTarget); }} className="mt-5 grid gap-3"><input type="hidden" name="kind" value="gallery"/><input name="title" required placeholder="Photo title" className={input}/><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="w-full text-xs text-slate-400"/><button disabled={working} className={button}>Upload team photo</button></form></Panel>
          <Panel eyebrow="Link coverage" title="Full game or highlight"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "submit_media_url", owner_type: "game", owner_id: form.get("game_id"), title: form.get("title"), url: form.get("url"), thumbnail_url: form.get("thumbnail_url"), link_role: form.get("link_role") }, "media"); event.currentTarget.reset(); }} className="mt-5 grid gap-3"><select name="game_id" required className={input}><option value="">Choose game</option>{data.games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}</select><select name="link_role" className={input}><option value="full_game">Full game</option><option value="highlight">Highlight</option></select><input name="title" required placeholder="Media title" className={input}/><input name="url" type="url" required placeholder="YouTube or approved source URL" className={input}/><input name="thumbnail_url" type="url" placeholder="Optional thumbnail URL" className={input}/><button disabled={working} className={button}>Send for review</button></form></Panel></div>
          <Panel eyebrow="Game coverage audit" title="Posters, full games & highlights"><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-white/10 text-[9px] uppercase tracking-[.1em] text-slate-500"><tr><th className="pb-3 pr-4">Game</th><th className="pb-3 pr-4">Poster</th><th className="pb-3 pr-4">Full game</th><th className="pb-3 pr-4">Highlights</th><th className="pb-3">Action</th></tr></thead><tbody>{data.games.map((game) => <tr key={game.id} className="border-b border-white/[.06]"><td className="py-4 pr-4"><p className="font-black">{game.title}</p><p className="mt-1 text-xs text-slate-600">{formatDate(game.game_date)}</p></td><td className="py-4 pr-4"><Status {...game.poster}/></td><td className="py-4 pr-4"><Status {...game.full_game}/></td><td className="py-4 pr-4"><Status {...game.highlights}/></td><td className="py-4">{!game.poster.ready && !game.poster.pending ? <form onSubmit={(event) => { event.preventDefault(); void upload(event.currentTarget); }} className="flex max-w-xs items-center gap-2"><input type="hidden" name="kind" value="poster"/><input type="hidden" name="game_id" value={game.id}/><input type="hidden" name="title" value={`${game.title} poster`}/><input name="file" type="file" accept="image/*" required className="w-32 text-[9px] text-slate-500"/><button disabled={working} className="rounded-lg bg-orange-500 px-3 py-2 text-[8px] font-black text-black">Upload poster</button></form> : <Link href={`/games/${game.id}`} className="text-[9px] font-black uppercase text-orange-300">Open game →</Link>}</td></tr>)}</tbody></table>{!data.games.length ? <Empty text="No games are linked to this permanent team yet."/> : null}</div></Panel>
        </div>
      </Feature> : null}

      {tab === "stats" ? <Feature capability="stats_submit" active={has("stats_submit")} title="Verified stats desk"><div className="grid gap-6"><div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><Panel eyebrow="League result" title="Submit a game result"><p className="mt-3 text-sm leading-6 text-slate-400">Approved results update the public team record and league table. FACKTS verifies every result before publication.</p>{data.league_memberships.length ? <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "submit_game_result", league_id: form.get("league_id"), opponent_name: form.get("opponent_name"), game_date: form.get("game_date"), venue: form.get("venue"), team_score: form.get("team_score"), opponent_score: form.get("opponent_score"), notes: form.get("notes") }, "stats"); event.currentTarget.reset(); }} className="mt-5 grid gap-3"><select name="league_id" required className={input}><option value="">Choose league</option>{data.league_memberships.map((membership) => <option key={membership.id} value={membership.league_id}>{membership.leagues?.name || "League"} · {membership.division}</option>)}</select><input name="opponent_name" required placeholder="Opponent team" className={input}/><div className="grid grid-cols-2 gap-3"><input name="game_date" required type="datetime-local" className={input}/><input name="venue" placeholder="Venue" className={input}/></div><div className="grid grid-cols-2 gap-3"><input name="team_score" required type="number" min="0" placeholder={`${team.name} score`} className={input}/><input name="opponent_score" required type="number" min="0" placeholder="Opponent score" className={input}/></div><textarea name="notes" rows={3} placeholder="Evidence, scorer sheet or correction note" className={input}/><button disabled={working} className={button}>Send result for verification</button></form> : <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-500">Super Admin must place this team in a league before league results can be submitted.</div>}</Panel><Panel eyebrow="Public standings" title="Your leaderboards"><p className="mt-3 text-sm leading-6 text-slate-400">Only approved final results affect these tables.</p><div className="mt-5 grid gap-3">{data.leaderboard_links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl border border-white/10 bg-black/25 p-4 font-black text-[var(--club-accent)]">{link.title} →</Link>)}</div></Panel></div><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><Panel eyebrow="Player game line" title="Submit player stats"><p className="mt-3 text-sm leading-6 text-slate-400">Team entries are evidence for review. Official player records remain under Super Admin verification.</p><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "submit_stats", game_id: form.get("game_id"), player_name: form.get("player_name"), points: form.get("points"), rebounds: form.get("rebounds"), assists: form.get("assists"), steals: form.get("steals"), blocks: form.get("blocks"), notes: form.get("notes") }, "stats"); event.currentTarget.reset(); }} className="mt-5 grid gap-3"><select name="game_id" required className={input}><option value="">Choose game</option>{data.games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}</select><input name="player_name" required placeholder="Player name" className={input}/><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{["points","rebounds","assists","steals","blocks"].map((field) => <input key={field} name={field} type="number" min="0" placeholder={field.slice(0,3).toUpperCase()} className={input}/>)}</div><textarea name="notes" rows={3} placeholder="Source or correction note" className={input}/><button disabled={working} className={button}>Submit player line</button></form></Panel><Panel eyebrow="Review history" title={`${data.stat_submissions.length} submissions`}><div className="mt-5 grid gap-3">{data.stat_submissions.map((submission) => { const resultSubmission = submission.stat_payload?.submission_type === "game_result"; return <article key={submission.id} className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><p className="font-black">{resultSubmission ? `vs ${submission.stat_payload?.opponent_name || "Opponent"}` : submission.stat_payload?.player_name || "Stat submission"}</p><Status ready={submission.status === "approved"} pending={submission.status === "pending"}/></div><p className="mt-2 text-xs text-slate-500">{resultSubmission ? `${submission.stat_payload?.league_name || "League"} · ${submission.stat_payload?.team_score}–${submission.stat_payload?.opponent_score}` : `PTS ${submission.stat_payload?.points ?? "—"} · REB ${submission.stat_payload?.rebounds ?? "—"} · AST ${submission.stat_payload?.assists ?? "—"}`}</p></article>; })}{!data.stat_submissions.length ? <Empty text="No result or stat submissions yet."/> : null}</div></Panel></div></div></Feature> : null}

      {tab === "live" ? <Feature capability="broadcast_manage" active={has("broadcast_manage")} title="YouTube Live Studio"><div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]"><Panel eyebrow="Secure channel" title={data.broadcast_channel ? data.broadcast_channel.channel_title || "YouTube connected" : "Connect YouTube"}><p className="mt-3 text-sm leading-6 text-slate-400">OAuth credentials stay encrypted on the server. Teams never receive Super Admin access.</p><a href={`/api/team-portal/youtube/connect?team_id=${encodeURIComponent(teamId)}`} className={`${button} mt-5 inline-flex`}>{data.broadcast_channel ? "Reconnect channel" : "Connect YouTube channel"}</a></Panel><Panel eyebrow="Game, training or show" title="Schedule broadcast"><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setWorking(true); const response = await fetch("/api/team-portal/youtube/broadcast", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ team_id: teamId, title: form.get("title"), description: form.get("description"), scheduled_start: form.get("scheduled_start"), broadcast_type: form.get("broadcast_type"), game_id: form.get("game_id") || null, training_session_id: form.get("training_session_id") || null, privacy_status: form.get("privacy_status") }) }); const payload = await response.json().catch(() => ({})); setMessage(payload.message || payload.error || "Broadcast request finished."); if (response.ok) { setEncoder(payload.encoder); await load(); } setWorking(false); }} className="mt-5 grid gap-3"><input name="title" required placeholder="Broadcast title" className={input}/><input name="scheduled_start" required type="datetime-local" className={input}/><select name="broadcast_type" className={input}><option value="game">Live game</option><option value="training">Training stream</option><option value="show">Team broadcast / show</option></select><select name="game_id" className={input}><option value="">Game (when applicable)</option>{data.games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}</select><select name="training_session_id" className={input}><option value="">Training session (when applicable)</option>{data.training.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}</select><select name="privacy_status" className={input}><option value="unlisted">Unlisted</option><option value="private">Private</option><option value="public">Public</option></select><textarea name="description" rows={3} placeholder="Description" className={input}/><button disabled={working || !data.broadcast_channel} className={button}>Create YouTube broadcast</button></form>{encoder ? <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4"><p className="text-xs font-black uppercase text-red-200">Shown once — copy into your encoder</p><p className="mt-3 break-all text-xs text-slate-300">Server: {encoder.ingestion_address}</p><p className="mt-2 break-all text-xs text-slate-300">Stream key: {encoder.stream_name}</p></div> : null}</Panel></div></Feature> : null}
    </main>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "orange" }) { return <div className="rounded-2xl border border-white/10 bg-slate-950 p-5"><p className={`text-3xl font-black ${tone === "orange" ? "text-[var(--club-accent)]" : "text-white"}`}>{value}</p><p className="mt-2 text-[8px] font-black uppercase tracking-[.14em] text-slate-600">{label}</p></div>; }
function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <section className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5 sm:p-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">{eyebrow}</p><h2 className="mt-2 text-2xl font-black uppercase">{title}</h2>{children}</section>; }
function Feature({ capability, active, title, children, compact = false }: { capability: TeamCapability; active: boolean; title: string; children: React.ReactNode; compact?: boolean }) { if (!active) return <section className={compact ? "" : "mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8"}><div className="rounded-[1.5rem] border border-white/15 bg-white/[.04] p-7"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">Access unavailable</p><h2 className="mt-2 text-2xl font-black uppercase">{title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{TEAM_CAPABILITY_LABELS[capability]} is not enabled for this account role or controlled upgrade. Super Admin can review the access level.</p></div></section>; return <section className={compact ? "" : "mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8"}>{children}</section>; }
function Locked({ label }: { label: string }) { return <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-center text-xs font-black uppercase text-slate-500">{label} requires Super Admin activation</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">{text}</div>; }
