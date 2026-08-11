"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Person = { id: string; full_name?: string | null; name?: string | null; nickname?: string | null; player_type?: string | null };
type EventRow = { event_id: string; title: string };
type Consent = {
  id: string;
  player_id?: string | null;
  event_id?: string | null;
  subject_label_snapshot?: string | null;
  subject_type: string;
  guardian_name?: string | null;
  guardian_contact?: string | null;
  consent_scopes: string[];
  consent_status: string;
  capture_method: string;
  captured_at?: string | null;
  effective_from?: string | null;
  expires_at?: string | null;
  evidence_reference?: string | null;
  restrictions?: string | null;
  withdrawal_reason?: string | null;
  correction_notes?: string | null;
  private_notes?: string | null;
  legacy_self_attested?: boolean;
  governed_media_subject_count?: number;
  updated_at: string;
};

type ConsentForm = {
  player_id: string;
  event_id: string;
  subject_label_snapshot: string;
  subject_type: string;
  guardian_name: string;
  guardian_contact: string;
  consent_scopes: string[];
  consent_status: string;
  capture_method: string;
  captured_at: string;
  effective_from: string;
  expires_at: string;
  evidence_reference: string;
  restrictions: string;
  withdrawal_reason: string;
  correction_notes: string;
  private_notes: string;
};

const emptyForm: ConsentForm = {
  player_id: "", event_id: "", subject_label_snapshot: "", subject_type: "adult", guardian_name: "", guardian_contact: "", consent_scopes: [], consent_status: "pending", capture_method: "admin_record", captured_at: "", effective_from: "", expires_at: "", evidence_reference: "", restrictions: "", withdrawal_reason: "", correction_notes: "", private_notes: "",
};

const scopes = [
  ["photo_use", "Photos"], ["video_use", "Video"], ["audio_use", "Audio"], ["promotional_use", "Promotional"], ["website_use", "Website"], ["social_media_use", "Social media"], ["internal_archive", "Internal archive"], ["all_media", "All media"],
];

function personName(person?: Person | null) {
  return person?.full_name || person?.name || person?.nickname || "Unknown person";
}

function toLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toForm(consent: Consent): ConsentForm {
  return {
    player_id: consent.player_id || "", event_id: consent.event_id || "", subject_label_snapshot: consent.subject_label_snapshot || "", subject_type: consent.subject_type || "adult", guardian_name: consent.guardian_name || "", guardian_contact: consent.guardian_contact || "", consent_scopes: consent.consent_scopes || [], consent_status: consent.consent_status || "pending", capture_method: consent.capture_method === "legacy_status" ? "admin_record" : consent.capture_method || "admin_record", captured_at: toLocal(consent.captured_at), effective_from: toLocal(consent.effective_from), expires_at: toLocal(consent.expires_at), evidence_reference: consent.evidence_reference || "", restrictions: consent.restrictions || "", withdrawal_reason: consent.withdrawal_reason || "", correction_notes: consent.correction_notes || "", private_notes: consent.private_notes || "",
  };
}

function statusClass(status: string) {
  if (status === "approved") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (["withdrawn", "rejected", "expired"].includes(status)) return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400";

export default function ConsentsAdminPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [form, setForm] = useState<ConsentForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/consents", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Consent records could not be loaded.");
    else { setConsents(result.consents ?? []); setPeople(result.people ?? []); setEvents(result.events ?? []); setMessage(""); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const eventsById = useMemo(() => new Map(events.map((event) => [event.event_id, event])), [events]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return consents.filter((consent) => {
      const person = peopleById.get(consent.player_id || "");
      const event = eventsById.get(consent.event_id || "");
      const haystack = [consent.subject_label_snapshot, personName(person), event?.title, consent.evidence_reference].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (statusFilter === "all" || consent.consent_status === statusFilter) && (typeFilter === "all" || consent.subject_type === typeFilter) && (eventFilter === "all" || consent.event_id === eventFilter);
    });
  }, [consents, eventFilter, eventsById, peopleById, search, statusFilter, typeFilter]);

  const counts = useMemo(() => ({ total: consents.length, approved: consents.filter((item) => item.consent_status === "approved").length, pending: consents.filter((item) => item.consent_status === "pending").length, withdrawn: consents.filter((item) => item.consent_status === "withdrawn").length }), [consents]);

  function update<K extends keyof ConsentForm>(key: K, value: ConsentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(""); setForm(emptyForm); setShowForm(true); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(consent: Consent) {
    setEditingId(consent.id); setForm(toForm(consent)); setShowForm(true); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleScope(scope: string) {
    update("consent_scopes", form.consent_scopes.includes(scope) ? form.consent_scopes.filter((item) => item !== scope) : [...form.consent_scopes, scope]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const response = await fetch("/api/admin/consents", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), ...form }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage([result.error, ...(result.errors ?? []).slice(1)].filter(Boolean).join(" "));
    else { setMessage(result.message || "Consent saved."); setShowForm(false); setEditingId(""); setForm(emptyForm); await load(); }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Private governed records</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Consent & Releases</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Consent is never inferred from participation. Evidence-backed scope, dates, guardian details, withdrawals and corrections control governed media publication.</p></div>
          <button onClick={startCreate} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black hover:bg-orange-400">Add consent record</button>
        </header>

        {showForm ? (
          <form onSubmit={save} className="rounded-3xl border border-orange-400/25 bg-zinc-950 p-5 sm:p-7">
            <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-orange-300">{editingId ? "Update governed record" : "New governed record"}</p><h2 className="mt-1 text-2xl font-black">Consent details</h2></div><button type="button" onClick={() => setShowForm(false)} className="text-sm font-black text-zinc-400">Close</button></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-zinc-300">Canonical person<select value={form.player_id} onChange={(event) => { update("player_id", event.target.value); const person = peopleById.get(event.target.value); if (person) update("subject_label_snapshot", personName(person)); }} className={inputClass}><option value="">Choose person</option>{people.map((person) => <option key={person.id} value={person.id}>{personName(person)} · {person.player_type || "person"}</option>)}</select></label>
              <label className="text-sm font-bold text-zinc-300">Event scope<select value={form.event_id} onChange={(event) => update("event_id", event.target.value)} className={inputClass}><option value="">All events / not event-specific</option>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select></label>
              <label className="text-sm font-bold text-zinc-300">Subject label<input value={form.subject_label_snapshot} onChange={(event) => update("subject_label_snapshot", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-bold text-zinc-300">Subject type<select value={form.subject_type} onChange={(event) => update("subject_type", event.target.value)} className={inputClass}><option value="adult">Adult</option><option value="minor">Minor</option><option value="guardian">Guardian</option><option value="team_group">Team / group</option><option value="official">Official</option><option value="volunteer">Volunteer</option><option value="other">Other</option></select></label>
              {form.subject_type === "minor" ? <><label className="text-sm font-bold text-zinc-300">Guardian name<input value={form.guardian_name} onChange={(event) => update("guardian_name", event.target.value)} className={inputClass} /></label><label className="text-sm font-bold text-zinc-300">Guardian contact/reference<input value={form.guardian_contact} onChange={(event) => update("guardian_contact", event.target.value)} className={inputClass} /></label></> : null}
              <label className="text-sm font-bold text-zinc-300">Status<select value={form.consent_status} onChange={(event) => update("consent_status", event.target.value)} className={inputClass}><option value="pending">Pending</option><option value="approved">Approved</option><option value="restricted">Restricted</option><option value="withdrawn">Withdrawn</option><option value="expired">Expired</option><option value="rejected">Rejected</option></select></label>
              <label className="text-sm font-bold text-zinc-300">Capture method<select value={form.capture_method} onChange={(event) => update("capture_method", event.target.value)} className={inputClass}><option value="admin_record">Admin record</option><option value="document">Document</option><option value="digital_form">Digital form</option><option value="application">Application</option><option value="other">Other</option></select></label>
              <label className="text-sm font-bold text-zinc-300">Consent date<input type="datetime-local" value={form.captured_at} onChange={(event) => update("captured_at", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-bold text-zinc-300">Evidence reference<input value={form.evidence_reference} onChange={(event) => update("evidence_reference", event.target.value)} placeholder="Private document ID or secure reference" className={inputClass} /></label>
              <label className="text-sm font-bold text-zinc-300">Effective from<input type="datetime-local" value={form.effective_from} onChange={(event) => update("effective_from", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-bold text-zinc-300">Expires at<input type="datetime-local" value={form.expires_at} onChange={(event) => update("expires_at", event.target.value)} className={inputClass} /></label>
              <fieldset className="md:col-span-2 rounded-2xl border border-white/10 bg-black p-4"><legend className="px-2 text-sm font-black text-zinc-300">Explicit usage scopes</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{scopes.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300"><input type="checkbox" checked={form.consent_scopes.includes(value)} onChange={() => toggleScope(value)} />{label}</label>)}</div></fieldset>
              <label className="md:col-span-2 text-sm font-bold text-zinc-300">Restrictions<textarea value={form.restrictions} onChange={(event) => update("restrictions", event.target.value)} className={`${inputClass} min-h-20`} /></label>
              {form.consent_status === "withdrawn" ? <label className="md:col-span-2 text-sm font-bold text-rose-200">Withdrawal reason<textarea value={form.withdrawal_reason} onChange={(event) => update("withdrawal_reason", event.target.value)} className={`${inputClass} min-h-20 border-rose-400/30`} /></label> : null}
              <label className="md:col-span-2 text-sm font-bold text-zinc-300">Correction notes<textarea value={form.correction_notes} onChange={(event) => update("correction_notes", event.target.value)} className={`${inputClass} min-h-20`} /></label>
              <label className="md:col-span-2 text-sm font-bold text-zinc-300">Private notes<textarea value={form.private_notes} onChange={(event) => update("private_notes", event.target.value)} className={`${inputClass} min-h-20`} /></label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><button disabled={saving} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-50">{saving ? "Saving…" : "Save governed record"}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-5 py-3 font-black text-zinc-300">Cancel</button></div>
          </form>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["All records", counts.total], ["Approved", counts.approved], ["Pending", counts.pending], ["Withdrawn", counts.withdrawn]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-zinc-950 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search person, event or evidence" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm xl:col-span-2" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="all">All statuses</option>{["pending", "approved", "restricted", "withdrawn", "expired", "rejected"].map((value) => <option key={value}>{value}</option>)}</select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="all">All subject types</option>{["adult", "minor", "guardian", "team_group", "official", "volunteer", "other"].map((value) => <option key={value}>{value}</option>)}</select><select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="all">All event scopes</option>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select></div></section>

        {message ? <p className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">{message}</p> : null}
        {loading ? <p className="rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center text-zinc-500">Loading private consent register…</p> : filtered.length ? <section className="grid gap-4 xl:grid-cols-2">{filtered.map((consent) => {
          const person = peopleById.get(consent.player_id || ""); const event = eventsById.get(consent.event_id || "");
          return <article key={consent.id} className="rounded-3xl border border-white/10 bg-zinc-950 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass(consent.consent_status)}`}>{consent.consent_status}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase text-zinc-400">{consent.subject_type.replace("_", " ")}</span>{consent.legacy_self_attested ? <span className="rounded-full border border-amber-400/25 px-2.5 py-1 text-[11px] font-black uppercase text-amber-200">Legacy — review only</span> : null}</div><h2 className="mt-3 text-xl font-black">{personName(person) || consent.subject_label_snapshot}</h2><p className="mt-1 text-sm text-zinc-500">{event?.title || "Not event-specific"}</p></div><button onClick={() => startEdit(consent)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/40">Review / edit</button></div><div className="mt-4 flex flex-wrap gap-2">{consent.consent_scopes.length ? consent.consent_scopes.map((scope) => <span key={scope} className="rounded-lg bg-black px-2 py-1 text-xs text-zinc-400">{scope.replaceAll("_", " ")}</span>) : <span className="text-sm text-rose-200">No usage scope approved</span>}</div><p className="mt-4 text-sm text-zinc-400">Evidence: {consent.evidence_reference || "Not recorded"}</p><p className="mt-1 text-xs text-zinc-600">Governed media subject links: {consent.governed_media_subject_count || 0}</p>{consent.consent_status === "withdrawn" && consent.withdrawal_reason ? <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">Withdrawal: {consent.withdrawal_reason}</p> : null}</article>;
        })}</section> : <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-10 text-center"><h2 className="text-xl font-black">No consent records match</h2><p className="mt-2 text-sm text-zinc-500">Adjust filters or add a governed record.</p></div>}
      </div>
    </main>
  );
}
