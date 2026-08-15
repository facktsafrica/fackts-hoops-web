"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CORE_TEAM_CAPABILITIES,
  normalizeTeamPlan,
  TEAM_CAPABILITY_LABELS,
  TEAM_PLAN_PRESETS,
  TEAM_UPGRADE_CAPABILITIES,
  type TeamCapability,
  type TeamPlanCode,
} from "@/lib/team-portal/capabilities";

type JsonRecord = Record<string, any>;
type AdminTab = "access" | "leagues" | "reviews" | "broadcast";

type PortalAdminData = {
  teams: JsonRecord[];
  subscriptions: JsonRecord[];
  memberships: JsonRecord[];
  queues: Record<string, JsonRecord[]>;
  channels: JsonRecord[];
  leagues: JsonRecord[];
  league_memberships: JsonRecord[];
  games: JsonRecord[];
  roster_members: JsonRecord[];
};

const input = "admin-control min-h-12 w-full rounded-xl border border-blue-400/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400";
const primaryButton = "min-h-12 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[.06em] text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "min-h-11 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-xs font-black text-white transition hover:border-orange-400/50 disabled:opacity-50";

const sections: Array<{ key: AdminTab; label: string; hint: string }> = [
  { key: "access", label: "Access & accounts", hint: "Core portal and team logins" },
  { key: "leagues", label: "League placement", hint: "Season and division" },
  { key: "reviews", label: "Review queue", hint: "Stats, media and branding" },
  { key: "broadcast", label: "Live production", hint: "YouTube connection" },
];

export default function TeamPortalsAdminPage() {
  const [data, setData] = useState<PortalAdminData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [tab, setTab] = useState<AdminTab>("access");
  const [plan, setPlan] = useState<TeamPlanCode>("club_core");
  const [status, setStatus] = useState("active");
  const [capabilities, setCapabilities] = useState<TeamCapability[]>([...TEAM_PLAN_PRESETS.club_core.capabilities]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [credentials, setCredentials] = useState<JsonRecord | null>(null);
  const [statImportId, setStatImportId] = useState("");
  const [statGameId, setStatGameId] = useState("");
  const [statRows, setStatRows] = useState<JsonRecord[]>([]);
  const [statWarnings, setStatWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/team-portals", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) {
      setData(payload);
      setTeamId((current) => current || payload.teams?.[0]?.id || "");
    } else {
      setMessage(payload.error || "Club portals could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const team = data?.teams.find((item) => item.id === teamId);
  const subscription = data?.subscriptions.find((item) => item.team_id === teamId);
  const memberships = data?.memberships.filter((item) => item.team_id === teamId) || [];
  const activeAccounts = memberships.filter((item) => item.status === "active");
  const channel = data?.channels.find((item) => item.team_id === teamId);
  const leagueMemberships = data?.league_memberships.filter((item) => item.team_id === teamId) || [];
  const teamGames = data?.games.filter((game) => game.home_team_id === teamId || game.away_team_id === teamId) || [];
  const teamRoster = data?.roster_members.filter((member) => member.team_id === teamId) || [];

  useEffect(() => {
    const selectedPlan = normalizeTeamPlan(subscription?.plan_code);
    setPlan(selectedPlan);
    setStatus(subscription?.status || "active");
    setCapabilities(subscription?.enabled_capabilities?.length
      ? Array.from(new Set([...CORE_TEAM_CAPABILITIES, ...subscription.enabled_capabilities])) as TeamCapability[]
      : [...TEAM_PLAN_PRESETS[selectedPlan].capabilities]);
  }, [subscription]);

  const teamQueues = useMemo(
    () => Object.fromEntries(
      Object.entries(data?.queues || {}).map(([key, rows]) => [key, rows.filter((item) => item.team_id === teamId)])
    ),
    [data, teamId]
  );
  const pendingForTeam = Object.values(teamQueues).flat().length;

  async function post(body: JsonRecord) {
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/admin/team-portals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, team_id: teamId }),
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || (response.ok ? "Saved." : "Update failed."));
    if (body.action === "issue_account") setCredentials(payload.credentials || null);
    setWorking(false);
    if (response.ok) await load();
  }

  async function uploadTeamStats(form: HTMLFormElement) {
    setWorking(true);
    setMessage("");
    const formData = new FormData(form);
    formData.set("team_id", teamId);
    formData.set("game_id", statGameId);
    const response = await fetch("/api/admin/team-portals/stats/import", { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || "Import finished.");
    setWorking(false);
    if (response.ok) {
      setStatImportId(payload.import?.id || "");
      setStatRows(payload.rows || []);
      setStatWarnings(payload.warnings || []);
      form.reset();
    }
  }

  async function saveTeamStats() {
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/admin/team-portals/stats/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ team_id: teamId, game_id: statGameId, import_id: statImportId, rows: statRows }),
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || "Team stats update finished.");
    setWorking(false);
    if (response.ok) {
      setStatImportId("");
      setStatRows([]);
      setStatWarnings([]);
      await load();
    }
  }

  function changePlan(value: TeamPlanCode) {
    setPlan(value);
    setCapabilities([...TEAM_PLAN_PRESETS[value].capabilities]);
  }

  if (!data) {
    return <main className="admin-page-shell min-h-screen p-5 text-white sm:p-8"><div className="admin-panel mx-auto max-w-xl p-8 text-center"><p className="admin-eyebrow">Club portals</p><h1 className="mt-3 text-3xl font-black">Loading team control…</h1><p className="mt-3 text-sm text-slate-400">{message}</p></div></main>;
  }

  return (
    <main className="admin-page-shell min-h-screen p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="admin-hero-panel overflow-hidden p-6 sm:p-8">
          <p className="admin-eyebrow">Team operations</p>
          <div className="mt-3 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="admin-title">Club Portals</h1>
              <p className="admin-subtitle mt-3 max-w-4xl">Every registered team receives its own controlled workspace for roster, stats, league standings, training, media and public team identity. Super Admin keeps verification and publishing authority.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Registered teams" value={data.teams.length} />
              <Metric label="Active accounts" value={data.memberships.filter((item) => item.status === "active").length} />
              <Metric label="Pending review" value={Object.values(data.queues).flat().length} />
              <Metric label="Public leagues" value={data.leagues.filter((item) => item.is_public !== false).length} />
            </div>
          </div>
        </header>

        {message ? <div role="status" className="mt-5 rounded-xl border border-orange-400/25 bg-orange-500/10 p-4 text-sm text-orange-100">{message}</div> : null}

        <section className="admin-panel mt-6 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.15em] text-slate-500">Registered team record</span>
              <select value={teamId} onChange={(event) => { setTeamId(event.target.value); setCredentials(null); setStatGameId(""); setStatImportId(""); setStatRows([]); setStatWarnings([]); }} className={`${input} mt-3`}>
                {data.teams.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.verification_status}</option>)}
              </select>
            </label>
            {team ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-500/15 px-3 py-2 text-[9px] font-black uppercase text-emerald-200">Core portal included</span><span className="rounded-full bg-blue-500/15 px-3 py-2 text-[9px] font-black uppercase text-blue-200">{activeAccounts.length} active login{activeAccounts.length === 1 ? "" : "s"}</span><a href={`/teams/${team.slug}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-orange-300">Public club ↗</a></div> : null}
          </div>
        </section>

        <nav className="sticky top-0 z-30 mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#071326]/95 p-2 shadow-2xl backdrop-blur lg:grid-cols-4" aria-label="Club portal administration">
          {sections.map((section) => (
            <button key={section.key} type="button" onClick={() => setTab(section.key)} className={`rounded-xl px-3 py-3 text-left transition ${tab === section.key ? "bg-orange-500 text-slate-950" : "bg-white/[.03] text-slate-300 hover:bg-white/[.07]"}`}>
              <span className="block text-[10px] font-black uppercase">{section.label}</span>
              <span className={`mt-1 hidden text-[8px] font-bold sm:block ${tab === section.key ? "text-slate-800" : "text-slate-600"}`}>{section.key === "reviews" && pendingForTeam ? `${pendingForTeam} waiting · ` : ""}{section.hint}</span>
            </button>
          ))}
        </nav>

        {tab === "access" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
            <section className="admin-panel p-5 sm:p-6">
              <p className="admin-eyebrow">Club entitlement</p>
              <h2 className="mt-2 text-2xl font-black">Core access and upgrades</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Roster, stats, leaderboards, training, club branding and media are standard for registered teams. Only official profile requests and Live Studio are paid or specially approved upgrades.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {CORE_TEAM_CAPABILITIES.map((capability) => <Capability key={capability} capability={capability} active fixed />)}
              </div>

              <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-500/[.06] p-4">
                <p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">Optional upgrades</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {TEAM_UPGRADE_CAPABILITIES.map((capability) => (
                    <label key={capability} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${capabilities.includes(capability) ? "border-emerald-400/30 bg-emerald-500/10" : "border-white/10 bg-black/20"}`}>
                      <input type="checkbox" checked={capabilities.includes(capability)} onChange={(event) => setCapabilities((current) => event.target.checked ? [...current, capability] : current.filter((item) => item !== capability))} className="h-4 w-4 accent-orange-500" />
                      <span className="text-xs font-black">{TEAM_CAPABILITY_LABELS[capability]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label><span className="mb-2 block text-[9px] font-black uppercase text-slate-500">Access package</span><select value={plan} onChange={(event) => changePlan(event.target.value as TeamPlanCode)} className={input}>{Object.entries(TEAM_PLAN_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
                <label><span className="mb-2 block text-[9px] font-black uppercase text-slate-500">Upgrade status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className={input}><option value="active">Active</option><option value="trial">Trial</option><option value="paused">Paused upgrades</option><option value="expired">Expired upgrades</option><option value="cancelled">Cancelled upgrades</option></select></label>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{TEAM_PLAN_PRESETS[plan].description} Pausing upgrades does not lock the core club portal.</p>
              <button disabled={working || !teamId} onClick={() => void post({ action: "update_subscription", plan_code: plan, status, enabled_capabilities: capabilities })} className={`${primaryButton} mt-5 w-full sm:w-auto`}>Save club access</button>
            </section>

            <section className="admin-panel p-5 sm:p-6">
              <p className="admin-eyebrow">Team identity</p>
              <h2 className="mt-2 text-2xl font-black">Assign team access</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Use the person’s existing portal email when they work for more than one club. Their current password stays unchanged and the portal adds a club selector.</p>
              <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "issue_account", email: form.get("email"), display_name: form.get("display_name"), role: form.get("role"), reset_password: form.get("reset_password") === "on" }); }} className="mt-5 grid gap-3">
                <input name="display_name" required placeholder="Account holder name" className={input} />
                <input name="email" type="email" required placeholder="Official team email" className={input} />
                <select name="role" defaultValue="manager" className={input}><option value="owner">Club owner</option><option value="manager">Team manager</option><option value="coach">Coach</option><option value="statistician">Statistician</option><option value="media">Media team</option><option value="viewer">Viewer</option></select>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300"><input name="reset_password" type="checkbox" className="h-4 w-4 accent-orange-500"/><span>Reset this person’s password and show new temporary credentials</span></label>
                <button disabled={working} className={primaryButton}>Assign team access</button>
              </form>

              {credentials ? <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4"><p className="text-xs font-black uppercase text-emerald-200">Copy these details now</p><p className="mt-3 break-all text-sm">Email: {credentials.email}</p><p className="mt-2 break-all text-sm">Temporary password: {credentials.temporary_password}</p><p className="mt-2 break-all text-sm">Login: {credentials.login_url}</p></div> : null}

              <div className="mt-6 grid gap-3">
                {memberships.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4"><div><p className="text-sm font-black">{member.display_name || member.invited_email || "Team account"}</p><p className="mt-1 text-[9px] font-black uppercase text-slate-500">{member.invited_email} · {member.role} · {member.status}</p></div>{member.status === "active" ? <button onClick={() => void post({ action: "revoke_account", membership_id: member.id })} className="text-[9px] font-black uppercase text-red-300">Revoke</button> : null}</div>)}
                {!memberships.length ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-500">No team login issued yet.</p> : null}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "leagues" ? (
          <section className="admin-panel mt-6 p-5 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <p className="admin-eyebrow">Public league network</p>
                <h2 className="mt-2 text-2xl font-black">Place this team correctly</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">A team may belong to different leagues or divisions across seasons. Each active placement adds the club to that league’s public portal and leaderboard.</p>
                <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "assign_league", league_id: form.get("league_id"), season_label: form.get("season_label"), division: form.get("division"), membership_status: form.get("membership_status") }); }} className="mt-5 grid gap-3">
                  <select name="league_id" required className={input}><option value="">Choose league</option>{data.leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select>
                  <div className="grid grid-cols-2 gap-3"><input name="season_label" required placeholder="Season, e.g. 2026/27" className={input} /><input name="division" required placeholder="Division, e.g. Division 1" className={input} /></div>
                  <select name="membership_status" defaultValue="active" className={input}><option value="active">Active</option><option value="promoted">Promoted</option><option value="relegated">Relegated</option><option value="inactive">Inactive</option><option value="withdrawn">Withdrawn</option></select>
                  <button disabled={working} className={primaryButton}>Save league placement</button>
                </form>
              </div>

              <div>
                <div className="flex items-center justify-between"><div><p className="admin-eyebrow">Current placements</p><h3 className="mt-2 text-xl font-black">League memberships</h3></div><a href="/leagues" target="_blank" rel="noreferrer" className={secondaryButton}>Open leagues ↗</a></div>
                <div className="mt-5 grid gap-3">
                  {leagueMemberships.map((membership) => <article key={membership.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-lg font-black">{membership.leagues?.name || "League"}</p><p className="mt-2 text-xs font-bold uppercase text-slate-500">{membership.season_label} · {membership.division} · {membership.status}</p></div><div className="flex gap-2"><a href={`/leagues/${membership.leagues?.slug}`} target="_blank" rel="noreferrer" className={secondaryButton}>Public portal ↗</a><button disabled={working} onClick={() => void post({ action: "remove_league", membership_id: membership.id })} className="min-h-11 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs font-black text-red-200">Remove</button></div></article>)}
                  {!leagueMemberships.length ? <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">This team has not been placed in a league yet.</p> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "reviews" ? (
          <section className="admin-panel mt-6 p-5 sm:p-6">
            <p className="admin-eyebrow">Governance queues</p>
            <h2 className="mt-2 text-2xl font-black">Review club submissions</h2>
            <p className="mt-3 text-sm text-slate-400">Team submissions remain unverified and private until Super Admin approves them.</p>
            <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-500/[.05] p-5">
              <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
                <div><p className="admin-eyebrow">Super Admin upload</p><h3 className="mt-2 text-xl font-black">Add a team box score</h3><p className="mt-3 text-sm leading-6 text-slate-400">Upload CSV, Excel, a text-based PDF or Word scorer sheet for the selected club. Extracted rows remain in the governed review queue until approved.</p><form onSubmit={(event) => { event.preventDefault(); void uploadTeamStats(event.currentTarget); }} className="mt-5 grid gap-3"><select value={statGameId} onChange={(event) => { setStatGameId(event.target.value); setStatImportId(""); setStatRows([]); }} required className={input}><option value="">Choose assigned game</option>{teamGames.map((game) => <option key={game.id} value={game.id}>{game.game_title || game.title || `${game.home_team_name} vs ${game.away_team_name}`}</option>)}</select><input name="file" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.docx,.doc" required className="rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-slate-300"/><button disabled={working || !statGameId} className={primaryButton}>Extract team stats</button></form>{!teamGames.length ? <p className="mt-3 text-xs text-red-200">This club has no canonical assigned games yet.</p> : null}</div>
                <div><div className="flex items-center justify-between gap-3"><div><p className="admin-eyebrow">Review grid</p><h3 className="mt-2 text-xl font-black">{statRows.length} extracted player rows</h3></div>{statRows.length ? <button disabled={working || statRows.some((row) => !row.roster_member_id)} onClick={() => void saveTeamStats()} className={primaryButton}>Save to review queue</button> : null}</div>{statWarnings.length ? <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">{statWarnings.join(" ")}</div> : null}<div className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto">{statRows.map((row, index) => <div key={`${row.player_name}-${index}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[1.3fr_.7fr_1fr]"><div><p className="text-xs font-black">{row.player_name || "Imported player"}</p><p className="mt-1 text-[9px] text-slate-500">PTS {row.points || 0} · REB {row.rebounds || 0} · AST {row.assists || 0}</p></div><select value={row.roster_member_id || ""} onChange={(event) => setStatRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, roster_member_id: event.target.value, player_id: teamRoster.find((member) => member.id === event.target.value)?.player_id || null } : item))} className={input}><option value="">Match roster player</option>{teamRoster.map((member) => <option key={member.id} value={member.id}>{member.display_name}{member.jersey_number ? ` · #${member.jersey_number}` : ""}</option>)}</select><div className="grid grid-cols-3 gap-1">{[["points", "PTS"], ["rebounds", "REB"], ["assists", "AST"]].map(([field, label]) => <label key={field}><span className="text-[7px] font-black text-slate-500">{label}</span><input type="number" min="0" value={row[field] || 0} onChange={(event) => setStatRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, [field]: Number(event.target.value) } : item))} className={`${input} min-h-9 px-2 py-1`}/></label>)}</div></div>)}{!statRows.length ? <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-600">Upload a scorer sheet to review its player rows here.</p> : null}</div></div>
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {Object.entries(teamQueues).map(([queue, rows]) => <div key={queue} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><h3 className="font-black uppercase">{queue}</h3><span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[9px] font-black text-orange-200">{rows.length}</span></div><div className="mt-4 grid gap-3">{rows.map((item) => <ReviewRow key={item.id} queue={queue} item={item} working={working} onDecision={(decision, noPeople = false) => void post({ action: "review_submission", queue, id: item.id, decision, no_identifiable_people_confirmed: noPeople })} />)}{!rows.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">Queue clear</p> : null}</div></div>)}
            </div>
          </section>
        ) : null}

        {tab === "broadcast" ? (
          <section className="admin-panel mt-6 p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="admin-eyebrow">Controlled premium upgrade</p><h2 className="mt-2 text-2xl font-black">YouTube Live Studio</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Connect an approved club channel for live games, training streams or team broadcasts. OAuth credentials remain encrypted and never give the club Executive Admin rights.</p><p className="mt-3 text-sm font-black text-white">{channel ? `${channel.channel_title || "YouTube"} · ${channel.status}` : "No YouTube channel connected."}</p></div>
              <a href={`/api/team-portal/youtube/connect?team_id=${encodeURIComponent(teamId)}`} className={primaryButton}>{channel ? "Reconnect YouTube" : "Connect team YouTube"}</a>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Capability({ capability, active, fixed = false }: { capability: TeamCapability; active: boolean; fixed?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${active ? "border-emerald-400/20 bg-emerald-500/10" : "border-white/10 bg-black/20"}`}><div><p className="text-xs font-black">{TEAM_CAPABILITY_LABELS[capability]}</p><p className="mt-1 text-[8px] font-black uppercase text-emerald-300">{fixed ? "Included for registered teams" : active ? "Active" : "Inactive"}</p></div><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-xs font-black text-black">✓</span></div>;
}

function ReviewRow({ queue, item, working, onDecision }: { queue: string; item: JsonRecord; working: boolean; onDecision: (decision: "approve" | "reject", noPeople?: boolean) => void }) {
  const sessionSubmission = item.stat_payload?.submission_type === "team_stat_session";
  const title = item.title || item.media_assets?.title || item.asset_type || (item.stat_payload?.submission_type === "game_result" ? `vs ${item.stat_payload?.opponent_name || "Opponent"}` : sessionSubmission ? `Complete box score · ${item.stat_payload?.player_rows || 0} players` : item.stat_payload?.player_name) || item.requested_changes?.display_name || "Club submission";
  const detail = item.stat_payload?.submission_type === "game_result" ? `${item.stat_payload?.league_name || "League"} · ${item.stat_payload?.team_score}–${item.stat_payload?.opponent_score} · ${item.stat_payload?.game_date || "Date pending"}` : sessionSubmission ? `${item.stat_payload?.mode || "Team"} capture · ${item.stat_payload?.linked_official_players || 0} linked official players · game ${item.game_id}` : item.file_url || item.media_assets?.url || item.focus_area || item.stat_payload?.notes || item.requested_changes?.bio || "Review the submitted record.";
  return <article className="rounded-xl border border-white/10 bg-slate-950/65 p-4"><p className="text-sm font-black">{title}</p><p className="mt-2 break-all text-xs leading-5 text-slate-500">{detail}</p>{item.file_url || item.media_assets?.url ? <a href={item.file_url || item.media_assets?.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[9px] font-black uppercase text-orange-300">Open asset ↗</a> : null}<div className="mt-4 flex gap-2"><button disabled={working} onClick={() => onDecision("approve", queue === "media" ? window.confirm("Confirm OK only when no identifiable people appear. Cancel means player subjects and consents must already be recorded.") : false)} className="rounded-lg bg-emerald-500 px-3 py-2 text-[9px] font-black uppercase text-black">Approve</button><button disabled={working} onClick={() => onDecision("reject")} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase text-red-200">Reject</button></div></article>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-xl font-black">{value}</p><p className="mt-1 truncate text-[7px] font-black uppercase tracking-[.12em] text-slate-600">{label}</p></div>;
}
