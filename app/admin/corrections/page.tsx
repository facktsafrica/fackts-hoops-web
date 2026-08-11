"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Change = {
  id: string;
  field_path: string;
  previous_value: unknown;
  proposed_value: unknown;
  change_status: string;
  applied_at?: string | null;
};

type CorrectionRequest = {
  id: string;
  entity_type: string;
  entity_id: string;
  correction_status: string;
  summary: string;
  requester_name?: string | null;
  requested_by_admin_profile_id?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  applied_at?: string | null;
  created_at: string;
  updated_at: string;
  changes: Change[];
};

type Profile = { id: string; display_name?: string | null; email?: string | null; role?: string | null };
type FieldMap = Record<string, Record<string, string>>;

const entityLabels: Record<string, string> = {
  stat: "Statistic", game: "Game", player: "Person", event: "Event", team: "Team", media: "Media asset",
};

function workflowLabel(status: string) {
  return ({ open: "Requested", triaged: "Under review", in_progress: "Approved — ready to apply", resolved: "Applied", rejected: "Rejected", cancelled: "Cancelled" } as Record<string, string>)[status] || status;
}

function statusClass(status: string) {
  if (status === "resolved") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (status === "rejected" || status === "cancelled") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  if (status === "in_progress") return "border-blue-400/30 bg-blue-400/10 text-blue-100";
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export default function CorrectionsAdminPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fields, setFields] = useState<FieldMap>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entity_type: "stat", entity_id: "", field_path: "points", proposed_value: "", reason: "" });
  const [statusFilter, setStatusFilter] = useState("active");
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/corrections", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Corrections could not be loaded.");
    else { setRequests(result.requests ?? []); setProfiles(result.profiles ?? []); setFields(result.fields ?? {}); setMessage(""); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const entityType = params.get("entity_type");
    const entityId = params.get("entity_id");
    const timer = window.setTimeout(() => {
      if (entityType || entityId) {
        const defaultField = ({ stat: "points", game: "home_score", player: "full_name", event: "title", team: "name", media: "title" } as Record<string, string>)[entityType || ""] || "";
        setForm((current) => ({ ...current, ...(entityType ? { entity_type: entityType, field_path: defaultField } : {}), ...(entityId ? { entity_id: entityId } : {}) }));
        setShowForm(true);
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = new Set(["open", "triaged", "in_progress"]);
    return requests.filter((request) => {
      const statusMatches = statusFilter === "all" || (statusFilter === "active" ? active.has(request.correction_status) : request.correction_status === statusFilter);
      const haystack = [request.summary, request.entity_type, request.entity_id, request.requester_name, ...request.changes.map((change) => change.field_path)].join(" ").toLowerCase();
      return statusMatches && (entityFilter === "all" || request.entity_type === entityFilter) && (!query || haystack.includes(query));
    });
  }, [entityFilter, requests, search, statusFilter]);

  const counts = useMemo(() => ({ requested: requests.filter((item) => item.correction_status === "open").length, review: requests.filter((item) => item.correction_status === "triaged").length, approved: requests.filter((item) => item.correction_status === "in_progress").length, applied: requests.filter((item) => item.correction_status === "resolved").length }), [requests]);

  function setEntity(value: string) {
    setForm((current) => ({ ...current, entity_type: value, field_path: Object.keys(fields[value] ?? {})[0] || "" }));
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const response = await fetch("/api/admin/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Correction request could not be created.");
    else { setMessage(result.message || "Correction requested."); setShowForm(false); setForm({ entity_type: "stat", entity_id: "", field_path: "points", proposed_value: "", reason: "" }); await load(); }
    setSaving(false);
  }

  async function act(request: CorrectionRequest, action: "review" | "approve" | "reject" | "apply") {
    setActingId(request.id); setMessage("");
    const response = await fetch("/api/admin/corrections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: request.id, action, review_notes: reviewNotes[request.id] || "" }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Correction action failed.");
    else { setMessage(result.message || "Correction updated."); await load(); }
    setActingId("");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Controlled data changes</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Data Corrections</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Requested → under review → approved or rejected → applied. Current and proposed values remain immutable evidence, and application fails if the target changed meanwhile.</p></div><button onClick={() => setShowForm(true)} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black">Request correction</button></header>

        {showForm ? <form onSubmit={createRequest} className="rounded-3xl border border-orange-400/25 bg-zinc-950 p-5 sm:p-7"><div className="flex justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-orange-300">New request</p><h2 className="mt-1 text-2xl font-black">Preserve current and proposed values</h2></div><button type="button" onClick={() => setShowForm(false)} className="text-sm font-black text-zinc-400">Close</button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-zinc-300">Record type<select value={form.entity_type} onChange={(event) => setEntity(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3">{Object.keys(fields).map((value) => <option key={value} value={value}>{entityLabels[value] || value}</option>)}</select></label><label className="text-sm font-bold text-zinc-300">Exact record ID<input value={form.entity_id} onChange={(event) => setForm({ ...form, entity_id: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3" /></label><label className="text-sm font-bold text-zinc-300">Field<select value={form.field_path} onChange={(event) => setForm({ ...form, field_path: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3">{Object.keys(fields[form.entity_type] ?? {}).map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="text-sm font-bold text-zinc-300">Proposed value<input value={form.proposed_value} onChange={(event) => setForm({ ...form, proposed_value: event.target.value })} placeholder={fields[form.entity_type]?.[form.field_path] === "boolean" ? "true or false" : "Replacement value"} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3" /></label><label className="md:col-span-2 text-sm font-bold text-zinc-300">Reason and evidence summary<textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black px-3 py-3" /></label></div><button disabled={saving} className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-50">{saving ? "Capturing current value…" : "Submit correction request"}</button></form> : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Requested", counts.requested], ["Under review", counts.review], ["Approved", counts.approved], ["Applied", counts.applied]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-zinc-950 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section>
        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5"><div className="grid gap-3 md:grid-cols-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search target, field or reason" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="active">Active queue</option><option value="all">All statuses</option><option value="open">Requested</option><option value="triaged">Under review</option><option value="in_progress">Approved</option><option value="resolved">Applied</option><option value="rejected">Rejected</option></select><select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="all">All record types</option>{Object.keys(fields).map((value) => <option key={value} value={value}>{entityLabels[value] || value}</option>)}</select></div></section>
        {message ? <p className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">{message}</p> : null}

        {loading ? <p className="rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center text-zinc-500">Loading correction queue…</p> : filtered.length ? <section className="space-y-4">{filtered.map((request) => {
          const reviewer = profileById.get(request.reviewed_by || "");
          return <article key={request.id} className="rounded-3xl border border-white/10 bg-zinc-950 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass(request.correction_status)}`}>{workflowLabel(request.correction_status)}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase text-zinc-400">{entityLabels[request.entity_type] || request.entity_type}</span></div><h2 className="mt-3 text-xl font-black">{request.summary}</h2><p className="mt-1 text-xs text-zinc-500">Target: {request.entity_id} · Requested by {request.requester_name || "Admin"}</p></div><p className="text-xs text-zinc-600">{new Date(request.created_at).toLocaleString("en-KE")}</p></div><div className="mt-4 grid gap-3">{request.changes.map((change) => <div key={change.id} className="grid gap-3 rounded-2xl bg-black p-4 md:grid-cols-[0.6fr,1fr,1fr,auto]"><div><p className="text-[10px] font-black uppercase text-zinc-600">Field</p><p className="mt-1 font-black">{change.field_path.replaceAll("_", " ")}</p></div><div><p className="text-[10px] font-black uppercase text-zinc-600">Previous</p><p className="mt-1 break-all text-sm text-rose-200">{displayValue(change.previous_value)}</p></div><div><p className="text-[10px] font-black uppercase text-zinc-600">Proposed</p><p className="mt-1 break-all text-sm text-emerald-200">{displayValue(change.proposed_value)}</p></div><span className="self-start rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-zinc-400">{change.change_status}</span></div>)}</div>{reviewer ? <p className="mt-3 text-xs text-zinc-500">Reviewer: {reviewer.display_name || reviewer.email} · {request.review_notes || "No review note"}</p> : null}{["open", "triaged", "in_progress"].includes(request.correction_status) ? <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4"><textarea value={reviewNotes[request.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Review notes (required for rejection)" className="min-h-20 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm" /><div className="mt-3 flex flex-wrap gap-2">{request.correction_status === "open" ? <button disabled={actingId === request.id} onClick={() => void act(request, "review")} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">Move under review</button> : null}{["open", "triaged"].includes(request.correction_status) ? <button disabled={actingId === request.id} onClick={() => void act(request, "approve")} className="rounded-xl bg-blue-400 px-3 py-2 text-xs font-black text-black">Approve</button> : null}{request.correction_status === "in_progress" ? <button disabled={actingId === request.id} onClick={() => void act(request, "apply")} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black">Apply transactionally</button> : null}<button disabled={actingId === request.id} onClick={() => void act(request, "reject")} className="rounded-xl border border-rose-400/25 px-3 py-2 text-xs font-black text-rose-200">Reject</button></div></div> : null}</article>;
        })}</section> : <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-10 text-center"><h2 className="text-xl font-black">No corrections match</h2><p className="mt-2 text-sm text-zinc-500">The selected queue is clear.</p></div>}
      </div>
    </main>
  );
}
