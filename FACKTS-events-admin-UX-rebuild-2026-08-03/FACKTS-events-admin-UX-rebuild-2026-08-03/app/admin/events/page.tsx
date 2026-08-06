"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventCase = { id: string; event_id: string; title: string; slug: string; summary: string | null; start_date: string | null; end_date: string | null; venue: string | null; location: string | null; status: string; photo_count: number; is_public: boolean };
type RecordType = "team" | "person" | "result" | "partner" | "media" | "gallery" | "award" | "consent" | "prize";
type RecordRow = { id: string; event_id: string; record_type: RecordType; title: string; subtitle: string | null; details: string | null; division: string | null; team_name: string | null; opponent_name: string | null; score_for: number | null; score_against: number | null; url: string | null; image_url: string | null; status: string; is_public: boolean };
type RecordForm = { record_type: RecordType; title: string; subtitle: string; details: string; division: string; team_name: string; opponent_name: string; score_for: string; score_against: string; url: string; image_url: string; status: string; is_public: boolean };
type FieldKey = keyof Pick<RecordForm, "title" | "subtitle" | "details" | "division" | "team_name" | "opponent_name" | "score_for" | "score_against" | "url" | "image_url">;
type FieldSpec = { key: FieldKey; label: string; placeholder?: string; type?: string; wide?: boolean; textarea?: boolean };

const emptyRecord: RecordForm = { record_type: "team", title: "", subtitle: "", details: "", division: "", team_name: "", opponent_name: "", score_for: "", score_against: "", url: "", image_url: "", status: "draft", is_public: false };
const privateTypes = new Set<RecordType>(["consent", "prize"]);

const sections: Record<RecordType, { label: string; singular: string; icon: string; description: string; accent: string; fields: FieldSpec[]; statuses: string[] }> = {
  team: { label: "Teams & rosters", singular: "team", icon: "TEAM", description: "Register participating teams, coaches, categories and roster information.", accent: "from-blue-500/25 to-cyan-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Team name", placeholder: "e.g. Usiku SACCO" }, { key: "image_url", label: "Team logo URL", placeholder: "https://..." }, { key: "subtitle", label: "Head coach", placeholder: "Coach's full name" }, { key: "division", label: "Category / division", placeholder: "Men, Women, Youth..." }, { key: "team_name", label: "Roster summary", placeholder: "e.g. 12 registered players", wide: true }, { key: "details", label: "Team notes", placeholder: "Captain, roster notes or verification details", textarea: true, wide: true },
  ] },
  person: { label: "People & officials", singular: "person", icon: "CREW", description: "Record referees, table officials, organisers, coaches and contributors.", accent: "from-violet-500/25 to-fuchsia-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Full name", placeholder: "Person's name" }, { key: "subtitle", label: "Event role", placeholder: "Referee, MC, organiser..." }, { key: "division", label: "Role group", placeholder: "Officials, production, operations..." }, { key: "team_name", label: "Team / organisation", placeholder: "If applicable" }, { key: "image_url", label: "Profile image URL", placeholder: "https://...", wide: true }, { key: "details", label: "Contribution / assignment", placeholder: "What they handled during the event", textarea: true, wide: true },
  ] },
  result: { label: "Results", singular: "result", icon: "SCORE", description: "Enter verified matchups exactly as they appeared on the scoresheet.", accent: "from-orange-500/30 to-amber-400/5", statuses: ["draft", "pending", "verified", "published", "hidden"], fields: [
    { key: "division", label: "Round / stage", placeholder: "Group A, semifinal, final..." }, { key: "title", label: "Match label", placeholder: "e.g. Men's Final" }, { key: "team_name", label: "Team A", placeholder: "Home / first team" }, { key: "opponent_name", label: "Team B", placeholder: "Away / second team" }, { key: "score_for", label: "Team A score", type: "number" }, { key: "score_against", label: "Team B score", type: "number" }, { key: "subtitle", label: "Game date / court", placeholder: "Optional fixture note", wide: true }, { key: "details", label: "Verification note", placeholder: "Scoresheet reference or correction note", textarea: true, wide: true },
  ] },
  partner: { label: "Partners", singular: "partner", icon: "BRAND", description: "Recognise organisations by their actual contribution to the event.", accent: "from-emerald-500/25 to-teal-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Organisation", placeholder: "Partner name" }, { key: "division", label: "Partner category", placeholder: "Venue, medical, media..." }, { key: "subtitle", label: "Contribution", placeholder: "Venue host, medical support...", wide: true }, { key: "image_url", label: "Official logo URL", placeholder: "https://..." }, { key: "url", label: "Website / social link", placeholder: "https://..." }, { key: "details", label: "Recognition note", placeholder: "Describe the support accurately", textarea: true, wide: true },
  ] },
  media: { label: "Media library", singular: "media item", icon: "PLAY", description: "Publish highlights, interviews, speeches and promotional videos.", accent: "from-rose-500/25 to-orange-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Media title", placeholder: "Clear public-facing title" }, { key: "subtitle", label: "Media category", placeholder: "Highlight, interview, speech..." }, { key: "division", label: "Platform", placeholder: "YouTube, Instagram, TikTok..." }, { key: "url", label: "Video / media URL", placeholder: "https://..." }, { key: "image_url", label: "Thumbnail URL", placeholder: "https://...", wide: true }, { key: "details", label: "Caption / description", placeholder: "What viewers will see", textarea: true, wide: true },
  ] },
  gallery: { label: "Photo gallery", singular: "photo", icon: "PHOTO", description: "Curate approved photographs rather than uploading the entire archive.", accent: "from-sky-500/25 to-indigo-400/5", statuses: ["draft", "verified", "published", "hidden", "restricted"], fields: [
    { key: "title", label: "Photo title", placeholder: "Short descriptive title" }, { key: "division", label: "Gallery category", placeholder: "Day 1, teams, action, awards..." }, { key: "image_url", label: "Photo URL", placeholder: "https://...", wide: true }, { key: "subtitle", label: "Photographer / credit", placeholder: "Optional credit" }, { key: "url", label: "External album link", placeholder: "Optional" }, { key: "details", label: "Caption and clearance note", placeholder: "Caption plus any usage restriction", textarea: true, wide: true },
  ] },
  award: { label: "Awards", singular: "award", icon: "AWARD", description: "Record champions, finalists and individual recognitions.", accent: "from-yellow-500/25 to-orange-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Award title", placeholder: "Champion, MVP, top scorer..." }, { key: "subtitle", label: "Recipient", placeholder: "Player or team" }, { key: "team_name", label: "Recipient's team", placeholder: "If applicable" }, { key: "division", label: "Category / division", placeholder: "Men, Women, Youth..." }, { key: "image_url", label: "Award image URL", placeholder: "https://...", wide: true }, { key: "details", label: "Award note", placeholder: "Performance or verification note", textarea: true, wide: true },
  ] },
  consent: { label: "Consent register", singular: "consent record", icon: "LOCK", description: "Private media-clearance register. These records can never appear publicly.", accent: "from-slate-500/25 to-blue-400/5", statuses: ["pending", "verified", "restricted", "withdrawn"], fields: [
    { key: "title", label: "Participant / subject", placeholder: "Full name or consent reference" }, { key: "division", label: "Person category", placeholder: "Adult, minor, team group..." }, { key: "subtitle", label: "Consent type", placeholder: "Photo, video, promotional use..." }, { key: "team_name", label: "Team / guardian reference", placeholder: "Where applicable" }, { key: "url", label: "Consent document reference", placeholder: "Private file link or reference", wide: true }, { key: "details", label: "Restrictions / notes", placeholder: "Guardian, permitted use, withdrawal details", textarea: true, wide: true },
  ] },
  prize: { label: "Prize settlement", singular: "prize record", icon: "KES", description: "Private financial tracker for promised, paid and outstanding prizes.", accent: "from-green-500/25 to-emerald-400/5", statuses: ["pending", "part-paid", "settled", "disputed"], fields: [
    { key: "title", label: "Prize / award", placeholder: "e.g. Men's champions" }, { key: "subtitle", label: "Recipient", placeholder: "Team or player" }, { key: "team_name", label: "Team", placeholder: "If applicable" }, { key: "division", label: "Payment reference", placeholder: "Invoice, voucher or internal reference" }, { key: "score_for", label: "Amount promised (KES)", type: "number" }, { key: "score_against", label: "Amount paid (KES)", type: "number" }, { key: "details", label: "Settlement notes", placeholder: "Balance, payment date or follow-up", textarea: true, wide: true },
  ] },
};

const sectionOrder = Object.keys(sections) as RecordType[];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventCase[]>([]);
  const [selected, setSelected] = useState("");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<RecordType>("team");
  const [form, setForm] = useState<RecordForm>(emptyRecord);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading event workspace...");
  const [showEventEditor, setShowEventEditor] = useState(false);

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase.from("event_case_studies").select("*").order("created_at", { ascending: false });
    if (error) return setMessage(`Events could not load: ${error.message}`);
    const rows = (data || []) as EventCase[];
    setEvents(rows); setSelected((value) => value || rows[0]?.event_id || ""); setMessage("");
  }, []);
  const loadRecords = useCallback(async () => {
    if (!selected) return;
    const { data, error } = await supabase.from("event_records").select("*").eq("event_id", selected).order("sort_order").order("created_at");
    if (error) return setMessage(error.message);
    setRecords((data || []) as RecordRow[]);
  }, [selected]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const active = events.find((item) => item.event_id === selected);
  const visible = useMemo(() => records.filter((row) => row.record_type === tab), [records, tab]);
  const config = sections[tab];

  function switchTab(next: RecordType) { setTab(next); setEditingId(null); setForm({ ...emptyRecord, record_type: next, status: sections[next].statuses[0] }); }
  function update(key: FieldKey, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const payload = { title: String(data.get("title") || ""), summary: String(data.get("summary") || ""), venue: String(data.get("venue") || ""), location: String(data.get("location") || ""), start_date: String(data.get("start_date") || "") || null, end_date: String(data.get("end_date") || "") || null, photo_count: Number(data.get("photo_count") || 0), status: String(data.get("status") || "draft"), is_public: data.get("is_public") === "on", updated_at: new Date().toISOString() };
    const { error } = await supabase.from("event_case_studies").update(payload).eq("event_id", selected);
    setMessage(error ? error.message : "Event details saved."); if (!error) loadEvents();
  }

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return setMessage(`Add the ${config.fields[0].label.toLowerCase()} first.`);
    const payload = { ...form, event_id: selected, title: form.title.trim(), score_for: form.score_for === "" ? null : Number(form.score_for), score_against: form.score_against === "" ? null : Number(form.score_against), is_public: privateTypes.has(tab) ? false : form.is_public };
    const query = editingId ? supabase.from("event_records").update(payload).eq("id", editingId) : supabase.from("event_records").insert(payload);
    const { error } = await query;
    setMessage(error ? error.message : editingId ? `${config.singular} updated.` : `${config.singular} added.`);
    if (!error) { setEditingId(null); setForm({ ...emptyRecord, record_type: tab, status: config.statuses[0] }); loadRecords(); }
  }

  function edit(row: RecordRow) {
    setEditingId(row.id); setForm({ record_type: row.record_type, title: row.title, subtitle: row.subtitle || "", details: row.details || "", division: row.division || "", team_name: row.team_name || "", opponent_name: row.opponent_name || "", score_for: row.score_for?.toString() || "", score_against: row.score_against?.toString() || "", url: row.url || "", image_url: row.image_url || "", status: row.status, is_public: row.is_public });
    document.getElementById("record-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function remove(id: string) { if (!window.confirm(`Delete this ${config.singular}?`)) return; const { error } = await supabase.from("event_records").delete().eq("id", id); setMessage(error ? error.message : `${config.singular} deleted.`); if (!error) loadRecords(); }

  return <main className="min-h-screen bg-[#050b18] px-3 py-5 text-white sm:px-6 sm:py-8">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-blue-950 via-slate-950 to-orange-950/50 p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300 sm:text-xs">FACKTS operations</p><h1 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">Events control centre</h1><p className="mt-3 max-w-2xl text-sm text-slate-300">Build the event record, publish its story and protect private operational information.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">{active ? <Link href={`/events/${active.slug}`} target="_blank" className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-5 py-3 text-center text-xs font-black uppercase text-orange-200">Preview public page</Link> : null}<button onClick={() => setShowEventEditor((value) => !value)} className="rounded-xl bg-white px-5 py-3 text-xs font-black uppercase text-slate-950">{showEventEditor ? "Close event setup" : "Edit event setup"}</button></div>
        </div>
      </header>

      {message ? <button onClick={() => setMessage("")} className="mt-4 w-full rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-left text-sm text-blue-100">{message}</button> : null}

      <section className="mt-5">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Active event</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{events.map((item) => <button key={item.id} onClick={() => setSelected(item.event_id)} className={`rounded-2xl border p-4 text-left transition ${selected === item.event_id ? "border-orange-400 bg-orange-500/15 shadow-lg shadow-orange-950/30" : "border-white/10 bg-slate-900/80 hover:border-blue-400/40"}`}><span className="block text-sm font-black uppercase leading-tight">{item.title}</span><span className="mt-2 block text-xs text-slate-400">{item.start_date || "Date pending"} · {item.venue || "Venue pending"}</span></button>)}</div>
      </section>

      {showEventEditor && active ? <EventEditor active={active} saveEvent={saveEvent} /> : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <nav className="grid grid-cols-2 gap-2 self-start sm:grid-cols-3 lg:sticky lg:top-5 lg:grid-cols-1">
          {sectionOrder.map((type) => { const item = sections[type]; const count = records.filter((row) => row.record_type === type).length; return <button key={type} onClick={() => switchTab(type)} className={`min-h-20 rounded-2xl border p-3 text-left transition lg:min-h-0 lg:p-4 ${tab === type ? "border-orange-400 bg-orange-500 text-black" : "border-white/10 bg-slate-900 text-slate-200 hover:border-white/25"}`}><span className="block text-[9px] font-black tracking-[.18em] opacity-70">{item.icon}</span><span className="mt-1 block text-xs font-black uppercase leading-tight">{item.label}</span><span className="mt-1 block text-[10px] opacity-70">{count} records</span></button>; })}
        </nav>

        <div className="min-w-0">
          <section id="record-editor" className={`scroll-mt-5 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${config.accent} via-slate-950 to-slate-950 p-4 sm:p-7`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{config.icon} workspace</p><h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">{config.label}</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">{config.description}</p></div>{privateTypes.has(tab) ? <span className="self-start rounded-full border border-slate-500/40 bg-slate-800 px-3 py-2 text-[10px] font-black uppercase text-slate-300">Private register</span> : null}</div>

            <form onSubmit={saveRecord} className="mt-6 grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => <PurposeField key={field.key} spec={field} value={form[field.key]} set={(value) => update(field.key, value)} />)}
              <label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Workflow status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 h-12 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold normal-case text-white outline-none focus:border-orange-400">{config.statuses.map((status) => <option key={status} value={status}>{status.replace("-", " ")}</option>)}</select></label>
              {!privateTypes.has(tab) ? <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="h-5 w-5 accent-orange-500" /><span>Show on public event page</span></label> : <div className="flex min-h-12 items-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs text-slate-400">Protected: never shown publicly</div>}
              <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm({ ...emptyRecord, record_type: tab, status: config.statuses[0] }); }} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase">Cancel edit</button> : null}<button className="rounded-xl bg-orange-500 px-6 py-3 text-xs font-black uppercase text-black hover:bg-orange-400">{editingId ? `Update ${config.singular}` : `Add ${config.singular}`}</button></div>
            </form>
          </section>

          <RecordList tab={tab} rows={visible} edit={edit} remove={remove} />
        </div>
      </div>
    </div>
  </main>;
}

function EventEditor({ active, saveEvent }: { active: EventCase; saveEvent: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-900 p-4 sm:p-7"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Event setup</p><h2 className="mt-1 text-xl font-black uppercase">Core public information</h2></div><form key={active.id} onSubmit={saveEvent} className="mt-5 grid gap-4 sm:grid-cols-2"><BasicField name="title" label="Event title" value={active.title} wide /><BasicArea name="summary" label="Public event summary" value={active.summary || ""} /><BasicField name="start_date" label="Start date" type="date" value={active.start_date || ""} /><BasicField name="end_date" label="End date" type="date" value={active.end_date || ""} /><BasicField name="venue" label="Venue" value={active.venue || ""} /><BasicField name="location" label="Location" value={active.location || ""} /><BasicField name="photo_count" label="Archived photograph count" type="number" value={String(active.photo_count || 0)} /><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Publication status<select name="status" defaultValue={active.status} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold"><input name="is_public" type="checkbox" defaultChecked={active.is_public} className="h-5 w-5 accent-orange-500" /> Show event publicly</label><button className="rounded-xl bg-white px-5 py-3 text-xs font-black uppercase text-slate-950 sm:col-span-2 sm:justify-self-end">Save event setup</button></form></section>;
}

function PurposeField({ spec, value, set }: { spec: FieldSpec; value: string; set: (value: string) => void }) {
  const classes = `text-[10px] font-black uppercase tracking-[.14em] text-slate-400 ${spec.wide ? "sm:col-span-2" : ""}`;
  const inputClasses = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium normal-case text-white outline-none placeholder:text-slate-600 focus:border-orange-400";
  return <label className={classes}>{spec.label}{spec.textarea ? <textarea rows={4} value={value} placeholder={spec.placeholder} onChange={(e) => set(e.target.value)} className={inputClasses} /> : <input type={spec.type || "text"} value={value} placeholder={spec.placeholder} onChange={(e) => set(e.target.value)} className={`${inputClasses} h-12`} />}</label>;
}

function RecordList({ tab, rows, edit, remove }: { tab: RecordType; rows: RecordRow[]; edit: (row: RecordRow) => void; remove: (id: string) => void }) {
  const config = sections[tab];
  return <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-4 sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Saved records</p><h3 className="mt-1 text-xl font-black uppercase">{config.label}</h3></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black">{rows.length}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{rows.map((row) => <article key={row.id} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${config.accent} via-slate-950 to-slate-950 p-4`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black uppercase">{row.title}</p><p className="mt-1 text-sm text-slate-400">{recordSummary(tab, row)}</p></div><span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[9px] font-black uppercase text-slate-300">{row.status}</span></div>{row.details ? <p className="mt-3 line-clamp-2 text-xs text-slate-500">{row.details}</p> : null}<div className="mt-4 flex gap-2"><button onClick={() => edit(row)} className="flex-1 rounded-xl border border-blue-400/40 px-3 py-2 text-xs font-black uppercase text-blue-200">Edit</button><button onClick={() => remove(row.id)} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-black uppercase text-red-200">Delete</button></div></article>)}{!rows.length ? <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-slate-500 md:col-span-2">No {config.label.toLowerCase()} saved yet. Use the purpose-built form above.</div> : null}</div></section>;
}

function recordSummary(tab: RecordType, row: RecordRow) {
  if (tab === "result") return `${row.team_name || "Team A"} ${row.score_for ?? "–"} — ${row.score_against ?? "–"} ${row.opponent_name || "Team B"}`;
  if (tab === "prize") return `${row.subtitle || "Recipient pending"} · KES ${row.score_against ?? 0} paid of ${row.score_for ?? 0}`;
  if (tab === "partner") return row.subtitle || row.division || "Contribution pending";
  if (tab === "media") return [row.subtitle, row.division].filter(Boolean).join(" · ") || "Media details pending";
  if (tab === "team") return [row.division, row.subtitle].filter(Boolean).join(" · ") || "Team details pending";
  return row.subtitle || row.division || "Details pending";
}

function BasicField({ name, label, value, type = "text", wide = false }: { name: string; label: string; value: string; type?: string; wide?: boolean }) { return <label className={`text-[10px] font-black uppercase tracking-[.14em] text-slate-400 ${wide ? "sm:col-span-2" : ""}`}>{label}<input name={name} type={type} defaultValue={value} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white" /></label>; }
function BasicArea({ name, label, value }: { name: string; label: string; value: string }) { return <label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 sm:col-span-2">{label}<textarea name={name} defaultValue={value} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm normal-case text-white" /></label>; }
