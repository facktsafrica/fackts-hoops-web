"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TEAM_CAPABILITIES, TEAM_CAPABILITY_LABELS, TEAM_PLAN_PRESETS, type TeamCapability } from "@/lib/team-portal/capabilities";

type JsonRecord = Record<string, any>;
type PortalAdminData = {
  teams: JsonRecord[];
  subscriptions: JsonRecord[];
  memberships: JsonRecord[];
  queues: Record<string, JsonRecord[]>;
  channels: JsonRecord[];
};

const input = "admin-control w-full rounded-xl border border-blue-400/15 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400";
const button = "rounded-xl bg-orange-500 px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-orange-400 disabled:opacity-50";

export default function TeamPortalsAdminPage() {
  const [data, setData] = useState<PortalAdminData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [plan, setPlan] = useState<keyof typeof TEAM_PLAN_PRESETS>("training_partner");
  const [status, setStatus] = useState("active");
  const [capabilities, setCapabilities] = useState<TeamCapability[]>([...TEAM_PLAN_PRESETS.training_partner.capabilities]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [credentials, setCredentials] = useState<JsonRecord | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/team-portals", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) {
      setData(payload);
      setTeamId((current) => current || payload.teams?.[0]?.id || "");
    } else setMessage(payload.error || "Team portals could not be loaded.");
  }, []);

  useEffect(() => { void load(); }, [load]);

  const team = data?.teams.find((item) => item.id === teamId);
  const subscription = data?.subscriptions.find((item) => item.team_id === teamId);
  const memberships = data?.memberships.filter((item) => item.team_id === teamId) || [];
  const channel = data?.channels.find((item) => item.team_id === teamId);

  useEffect(() => {
    if (subscription) {
      setPlan(subscription.plan_code in TEAM_PLAN_PRESETS ? subscription.plan_code : "training_partner");
      setStatus(subscription.status || "paused");
      setCapabilities(subscription.enabled_capabilities || []);
    } else {
      setPlan("training_partner"); setStatus("paused"); setCapabilities([...TEAM_PLAN_PRESETS.training_partner.capabilities]);
    }
  }, [subscription]);

  const teamQueues = useMemo(() => Object.fromEntries(Object.entries(data?.queues || {}).map(([key, rows]) => [key, rows.filter((item) => item.team_id === teamId)])), [data, teamId]);

  async function post(body: JsonRecord) {
    setWorking(true); setMessage("");
    const response = await fetch("/api/admin/team-portals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, team_id: teamId }) });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || (response.ok ? "Saved." : "Update failed."));
    if (payload.credentials) setCredentials(payload.credentials);
    setWorking(false);
    if (response.ok) await load();
  }

  function changePlan(value: keyof typeof TEAM_PLAN_PRESETS) {
    setPlan(value);
    setCapabilities([...TEAM_PLAN_PRESETS[value].capabilities]);
  }

  if (!data) return <main className="admin-page-shell min-h-screen p-5 text-white sm:p-8"><div className="admin-panel mx-auto max-w-xl p-8 text-center"><p className="admin-eyebrow">Team Partner Portals</p><h1 className="mt-3 text-3xl font-black">Loading control plane…</h1><p className="mt-3 text-sm text-slate-400">{message}</p></div></main>;

  return <main className="admin-page-shell min-h-screen p-4 text-white sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="admin-hero-panel p-6 sm:p-8"><p className="admin-eyebrow">Partnership operations</p><div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="admin-title">Team Partner Portals</h1><p className="admin-subtitle mt-3 max-w-4xl">Activate exact team capabilities, issue controlled accounts, approve public-facing changes, and connect high-tier YouTube production without granting administrator rights.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Teams" value={data.teams.length}/><Metric label="Accounts" value={data.memberships.filter((item) => item.status === "active").length}/><Metric label="Pending" value={Object.values(data.queues).flat().length}/><Metric label="YouTube" value={data.channels.filter((item) => item.status === "connected").length}/></div></div></header>
      {message ? <div className="mt-5 rounded-xl border border-orange-400/25 bg-orange-500/10 p-4 text-sm text-orange-100">{message}</div> : null}

      <section className="admin-panel mt-6 p-5 sm:p-6"><label className="block text-[9px] font-black uppercase tracking-[.15em] text-slate-500">Team workspace</label><select value={teamId} onChange={(event) => { setTeamId(event.target.value); setCredentials(null); }} className={`${input} mt-3 max-w-xl`}>{data.teams.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.verification_status}</option>)}</select>{team ? <div className="mt-5 flex flex-wrap items-center gap-3"><span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-[9px] font-black uppercase text-blue-200">Permanent team</span><span className="rounded-full bg-orange-500/15 px-3 py-1.5 text-[9px] font-black uppercase text-orange-200">{plan.replaceAll("_", " ")}</span><a href={`/teams/${team.slug}`} target="_blank" rel="noreferrer" className="text-xs font-black text-orange-300">Public profile ↗</a></div> : null}</section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <section className="admin-panel p-5 sm:p-6"><p className="admin-eyebrow">Subscription authority</p><h2 className="mt-2 text-2xl font-black">Plan and exact capabilities</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={plan} onChange={(event) => changePlan(event.target.value as keyof typeof TEAM_PLAN_PRESETS)} className={input}>{Object.entries(TEAM_PLAN_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className={input}><option value="trial">Trial</option><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{TEAM_CAPABILITIES.map((capability) => <label key={capability} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${capabilities.includes(capability) ? "border-emerald-400/25 bg-emerald-500/10" : "border-white/10 bg-black/15"}`}><input type="checkbox" checked={capabilities.includes(capability)} disabled={capability === "portal_view"} onChange={(event) => setCapabilities((current) => event.target.checked ? [...current, capability] : current.filter((item) => item !== capability))}/><span className="text-xs font-black">{TEAM_CAPABILITY_LABELS[capability]}</span></label>)}</div><button disabled={working || !teamId} onClick={() => void post({ action: "update_subscription", plan_code: plan, status, enabled_capabilities: capabilities })} className={`${button} mt-5`}>Activate selected access</button><p className="mt-4 text-xs leading-5 text-slate-500">Player-profile capability means “submit profile requests.” Only Super Admin can approve or edit the official player record.</p></section>

        <section className="admin-panel p-5 sm:p-6"><p className="admin-eyebrow">Controlled identity</p><h2 className="mt-2 text-2xl font-black">Issue team login</h2><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "issue_account", email: form.get("email"), display_name: form.get("display_name"), role: form.get("role") }); }} className="mt-5 grid gap-3"><input name="display_name" placeholder="Account holder name" className={input}/><input name="email" type="email" required placeholder="Dedicated team email" className={input}/><select name="role" className={input}><option value="owner">Owner</option><option value="manager">Manager</option><option value="coach">Coach</option><option value="statistician">Statistician</option><option value="media">Media team</option><option value="viewer">Viewer</option></select><button disabled={working} className={button}>Create or reset login</button></form>{credentials ? <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4"><p className="text-xs font-black uppercase text-emerald-200">Copy these details now</p><p className="mt-3 break-all text-sm">Email: {credentials.email}</p><p className="mt-2 break-all text-sm">Temporary password: {credentials.temporary_password}</p><p className="mt-2 break-all text-sm">Login: {credentials.login_url}</p></div> : null}<div className="mt-6 grid gap-3">{memberships.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4"><div><p className="text-sm font-black">{member.display_name || member.invited_email || "Team account"}</p><p className="mt-1 text-[9px] font-black uppercase text-slate-500">{member.role} · {member.status}</p></div>{member.status === "active" ? <button onClick={() => void post({ action: "revoke_account", membership_id: member.id })} className="text-[9px] font-black uppercase text-red-300">Revoke</button> : null}</div>)}{!memberships.length ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-500">No team login issued.</p> : null}</div></section>
      </div>

      <section className="admin-panel mt-6 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="admin-eyebrow">High-tier production</p><h2 className="mt-2 text-2xl font-black">YouTube connection</h2><p className="mt-2 text-sm text-slate-400">{channel ? `${channel.channel_title || "YouTube"} · ${channel.status}` : "No channel connected for this team."}</p></div><a href={`/api/team-portal/youtube/connect?team_id=${encodeURIComponent(teamId)}`} className={button}>{channel ? "Reconnect as Super Admin" : "Connect team YouTube"}</a></div></section>

      <section className="admin-panel mt-6 p-5 sm:p-6"><p className="admin-eyebrow">Governance queues</p><h2 className="mt-2 text-2xl font-black">Review team submissions</h2><div className="mt-6 grid gap-6 lg:grid-cols-2">{Object.entries(teamQueues).map(([queue, rows]) => <div key={queue} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><h3 className="font-black uppercase">{queue}</h3><span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[9px] font-black text-orange-200">{rows.length}</span></div><div className="mt-4 grid gap-3">{rows.map((item) => <ReviewRow key={item.id} queue={queue} item={item} working={working} onDecision={(decision, noPeople = false) => void post({ action: "review_submission", queue, id: item.id, decision, no_identifiable_people_confirmed: noPeople })}/>) }{!rows.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">Queue clear</p> : null}</div></div>)}</div></section>
    </div>
  </main>;
}

function ReviewRow({ queue, item, working, onDecision }: { queue: string; item: JsonRecord; working: boolean; onDecision: (decision: "approve" | "reject", noPeople?: boolean) => void }) {
  const title = item.title || item.media_assets?.title || item.asset_type || item.stat_payload?.player_name || item.requested_changes?.display_name || "Team submission";
  return <article className="rounded-xl border border-white/10 bg-slate-950/65 p-4"><p className="text-sm font-black">{title}</p><p className="mt-2 break-all text-xs leading-5 text-slate-500">{item.file_url || item.media_assets?.url || item.focus_area || item.stat_payload?.notes || item.requested_changes?.bio || "Review the submitted record."}</p>{item.file_url || item.media_assets?.url ? <a href={item.file_url || item.media_assets?.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[9px] font-black uppercase text-orange-300">Open asset ↗</a> : null}<div className="mt-4 flex gap-2"><button disabled={working} onClick={() => onDecision("approve", queue === "media" ? window.confirm("Confirm OK only when no identifiable people appear. Cancel means player subjects/consents must already be recorded.") : false)} className="rounded-lg bg-emerald-500 px-3 py-2 text-[9px] font-black uppercase text-black">Approve</button><button disabled={working} onClick={() => onDecision("reject")} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase text-red-200">Reject</button></div></article>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[7px] font-black uppercase tracking-[.12em] text-slate-600">{label}</p></div>; }
