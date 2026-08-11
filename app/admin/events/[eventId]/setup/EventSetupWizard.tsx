"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";

const stages = [
  { key: "organizer_event", label: "Organizer and Event" },
  { key: "competition_format", label: "Competition Format" },
  { key: "teams_participants", label: "Teams / Participants" },
  { key: "schedule", label: "Schedule" },
  { key: "services", label: "Services" },
  { key: "branding", label: "Branding" },
  { key: "publish", label: "Publish" },
] as const;

type StageKey = (typeof stages)[number]["key"];
type GenericRow = Record<string, unknown>;

type EntryForm = {
  id?: string;
  setup_key: string;
  entry_type: "team" | "person";
  team_id: string;
  player_id: string;
  display_name_snapshot: string;
  division: string;
  entry_status: string;
};

type GameForm = {
  id?: string;
  setup_key: string;
  title: string;
  competition_name: string;
  home_team_name: string;
  away_team_name: string;
  game_format: string;
  game_stage: string;
  game_date: string;
  venue: string;
  court: string;
  status: string;
};

type DeliverableForm = {
  id?: string;
  setup_key: string;
  service_type: string;
  title: string;
  description: string;
  due_at: string;
  deliverable_status: string;
};

type SetupResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  validation_errors?: Array<{ code: string; message: string; stage: StageKey }>;
  event?: GenericRow;
  progress?: GenericRow | null;
  entries?: GenericRow[];
  games?: GenericRow[];
  deliverables?: GenericRow[];
  teams?: GenericRow[];
  people?: GenericRow[];
};

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400";

function rowKey(prefix: string, id?: unknown) {
  if (id) return `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function text(value: unknown) {
  return String(value ?? "");
}

function record(value: unknown): GenericRow {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GenericRow)
    : {};
}

function toLocalDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`text-sm font-bold text-zinc-300 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

export default function EventSetupWizard({ eventId }: { eventId: string }) {
  const { readOnly } = useAdminPermission();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<SetupResponse["validation_errors"]>([]);
  const [activeStage, setActiveStage] = useState<StageKey>("organizer_event");
  const [eventRecord, setEventRecord] = useState<GenericRow>({});
  const [progress, setProgress] = useState<GenericRow>({});
  const [teams, setTeams] = useState<GenericRow[]>([]);
  const [people, setPeople] = useState<GenericRow[]>([]);
  const [eventForm, setEventForm] = useState({ title: "", organizer_name: "", organizer_description: "", organizer_url: "", event_type: "5v5", age_category: "Open", summary: "", start_date: "", end_date: "", venue: "", location: "" });
  const [formatForm, setFormatForm] = useState({ competition_name: "", format: "5v5", participant_mode: "team", divisions: "Open", rules_notes: "" });
  const [entries, setEntries] = useState<EntryForm[]>([]);
  const [games, setGames] = useState<GameForm[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableForm[]>([]);
  const [noServices, setNoServices] = useState(false);
  const [branding, setBranding] = useState({ poster_url: "", hero_image_url: "", organizer_logo_url: "", brand_notes: "", branding_confirmed: false });

  const hydrate = useCallback((result: SetupResponse) => {
    const event = result.event ?? {};
    const setupProgress = result.progress ?? {};
    const metadata = record(setupProgress.metadata);
    const format = record(metadata.competition_format);
    const services = record(metadata.services);
    const brand = record(metadata.branding);
    setEventRecord(event);
    setProgress(setupProgress);
    setTeams(result.teams ?? []);
    setPeople(result.people ?? []);
    setEventForm({
      title: text(event.title), organizer_name: text(event.organizer_name), organizer_description: text(event.organizer_description), organizer_url: text(event.organizer_url), event_type: text(event.event_type) || "5v5", age_category: text(event.age_category) || "Open", summary: text(event.summary), start_date: text(event.start_date), end_date: text(event.end_date), venue: text(event.venue), location: text(event.location),
    });
    setFormatForm({
      competition_name: text(format.competition_name) || text(event.title),
      format: text(format.format) || text(event.event_type) || "5v5",
      participant_mode: text(format.participant_mode) || "team",
      divisions: Array.isArray(format.divisions) ? format.divisions.map(text).join("\n") : "Open",
      rules_notes: text(format.rules_notes),
    });
    setEntries((result.entries ?? []).filter((entry) => entry.entry_status !== "withdrawn").map((entry) => ({
      id: text(entry.id), setup_key: text(entry.setup_key) || rowKey("entry", entry.id), entry_type: entry.entry_type === "person" ? "person" : "team", team_id: text(entry.team_id), player_id: text(entry.player_id), display_name_snapshot: text(entry.display_name_snapshot), division: text(entry.division), entry_status: text(entry.entry_status) || "pending",
    })));
    setGames((result.games ?? []).filter((game) => game.status !== "cancelled").map((game) => ({
      id: text(game.id), setup_key: text(game.setup_key) || rowKey("fixture", game.id), title: text(game.title || game.game_title), competition_name: text(game.competition_name), home_team_name: text(game.home_team_name), away_team_name: text(game.away_team_name), game_format: text(game.game_format) || text(event.event_type) || "5v5", game_stage: text(game.game_stage) || "Game", game_date: toLocalDateTime(game.game_date || game.date), venue: text(game.venue), court: text(game.court), status: text(game.status) || "upcoming",
    })));
    setDeliverables((result.deliverables ?? []).filter((item) => item.deliverable_status !== "cancelled").map((item) => ({
      id: text(item.id), setup_key: text(item.setup_key) || rowKey("deliverable", item.id), service_type: text(item.service_type), title: text(item.title), description: text(item.description), due_at: toLocalDateTime(item.due_at), deliverable_status: text(item.deliverable_status) || "planned",
    })));
    setNoServices(services.no_services_required === true);
    setBranding({ poster_url: text(event.poster_url), hero_image_url: text(event.hero_image_url), organizer_logo_url: text(event.organizer_logo_url), brand_notes: text(brand.brand_notes), branding_confirmed: brand.branding_confirmed === true });
    const current = text(setupProgress.current_stage) as StageKey;
    if (stages.some((stage) => stage.key === current)) setActiveStage(current);
    setValidationErrors((setupProgress.validation_errors as SetupResponse["validation_errors"]) ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/events/setup?event_id=${encodeURIComponent(eventId)}`, { cache: "no-store" });
    const result = (await response.json().catch(() => ({}))) as SetupResponse;
    if (!response.ok || !result.ok) setMessage(result.error || "Event setup could not be loaded.");
    else { hydrate(result); setMessage(""); }
    setLoading(false);
  }, [eventId, hydrate]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const completed = useMemo(() => new Set((progress.completed_stages as string[]) ?? []), [progress.completed_stages]);

  function stageData(stage: StageKey, publish = false) {
    if (stage === "organizer_event") return eventForm;
    if (stage === "competition_format") return { ...formatForm, divisions: formatForm.divisions.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) };
    if (stage === "teams_participants") return { entries };
    if (stage === "schedule") return { games };
    if (stage === "services") return { deliverables, no_services_required: noServices };
    if (stage === "branding") return branding;
    return { publish };
  }

  async function saveStage(complete: boolean, publish = false) {
    setSaving(true);
    setMessage("");
    setValidationErrors([]);
    const response = await fetch("/api/admin/events/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, stage: activeStage, complete, data: stageData(activeStage, publish) }),
    });
    const result = (await response.json().catch(() => ({}))) as SetupResponse;
    if (!response.ok || !result.ok) {
      setMessage(result.error || "This stage could not be saved.");
      setValidationErrors(result.validation_errors ?? []);
    } else {
      hydrate(result);
      setMessage(result.message || "Saved.");
    }
    setSaving(false);
  }

  function updateEntry(index: number, key: keyof EntryForm, value: string) {
    setEntries((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, [key]: value } : entry));
  }

  function updateGame(index: number, key: keyof GameForm, value: string) {
    setGames((current) => current.map((game, rowIndex) => rowIndex === index ? { ...game, [key]: value } : game));
  }

  function updateDeliverable(index: number, key: keyof DeliverableForm, value: string) {
    setDeliverables((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, [key]: value } : item));
  }

  if (loading) {
    return <main className="min-h-screen bg-black px-4 py-28 text-center text-zinc-400">Loading event setup…</main>;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/admin/events" className="text-sm font-black text-orange-300 hover:text-orange-200">← Events Admin</Link>
              <h1 className="mt-3 text-3xl font-black">{text(eventRecord.title) || "Event setup"}</h1>
              <p className="mt-2 text-sm text-zinc-500">{eventId} · Private draft workflow with server validation</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Readiness</p>
              <p className="mt-1 font-black capitalize text-orange-200">{text(progress.validation_status || "needs_review").replace("_", " ")}</p>
            </div>
          </div>
        </header>

        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7" aria-label="Event setup stages">
          {stages.map((stage, index) => (
            <button key={stage.key} onClick={() => { setActiveStage(stage.key); setMessage(""); setValidationErrors([]); }} className={`rounded-2xl border p-3 text-left text-xs font-black transition ${activeStage === stage.key ? "border-orange-400 bg-orange-400/10 text-orange-100" : completed.has(stage.key) ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-200" : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/20"}`}>
              <span className="block text-[10px] uppercase tracking-wider opacity-60">Stage {index + 1}</span>
              <span className="mt-1 block">{stage.label}</span>
            </button>
          ))}
        </nav>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Stage {stages.findIndex((stage) => stage.key === activeStage) + 1} of 7</p>
            <h2 className="mt-2 text-2xl font-black">{stages.find((stage) => stage.key === activeStage)?.label}</h2>
          </div>

          {readOnly ? <p className="mb-5 rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 text-sm text-blue-100">Read-only access: setup data is visible, but editing and publishing controls are disabled.</p> : null}

          <fieldset disabled={readOnly} className="min-w-0 disabled:opacity-70">

          {activeStage === "organizer_event" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event title" wide><input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} className={inputClass} /></Field>
              <Field label="Organizer" wide><input value={eventForm.organizer_name} onChange={(event) => setEventForm({ ...eventForm, organizer_name: event.target.value })} className={inputClass} /></Field>
              <Field label="Event format"><input value={eventForm.event_type} onChange={(event) => setEventForm({ ...eventForm, event_type: event.target.value })} className={inputClass} /></Field>
              <Field label="Age category"><input value={eventForm.age_category} onChange={(event) => setEventForm({ ...eventForm, age_category: event.target.value })} className={inputClass} /></Field>
              <Field label="Start date"><input type="date" value={eventForm.start_date} onChange={(event) => setEventForm({ ...eventForm, start_date: event.target.value })} className={inputClass} /></Field>
              <Field label="End date"><input type="date" value={eventForm.end_date} onChange={(event) => setEventForm({ ...eventForm, end_date: event.target.value })} className={inputClass} /></Field>
              <Field label="Venue"><input value={eventForm.venue} onChange={(event) => setEventForm({ ...eventForm, venue: event.target.value })} className={inputClass} /></Field>
              <Field label="Location"><input value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} className={inputClass} /></Field>
              <Field label="Organizer website"><input value={eventForm.organizer_url} onChange={(event) => setEventForm({ ...eventForm, organizer_url: event.target.value })} className={inputClass} /></Field>
              <Field label="Organizer description"><textarea value={eventForm.organizer_description} onChange={(event) => setEventForm({ ...eventForm, organizer_description: event.target.value })} className={`${inputClass} min-h-24`} /></Field>
              <Field label="Event summary" wide><textarea value={eventForm.summary} onChange={(event) => setEventForm({ ...eventForm, summary: event.target.value })} className={`${inputClass} min-h-28`} /></Field>
            </div>
          ) : null}

          {activeStage === "competition_format" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Competition name" wide><input value={formatForm.competition_name} onChange={(event) => setFormatForm({ ...formatForm, competition_name: event.target.value })} className={inputClass} /></Field>
              <Field label="Format"><input value={formatForm.format} onChange={(event) => setFormatForm({ ...formatForm, format: event.target.value })} placeholder="5v5, 3v3, 1v1…" className={inputClass} /></Field>
              <Field label="Participant mode"><select value={formatForm.participant_mode} onChange={(event) => setFormatForm({ ...formatForm, participant_mode: event.target.value })} className={inputClass}><option value="team">Teams</option><option value="person">Individuals</option><option value="mixed">Mixed</option></select></Field>
              <Field label="Divisions — one per line" wide><textarea value={formatForm.divisions} onChange={(event) => setFormatForm({ ...formatForm, divisions: event.target.value })} className={`${inputClass} min-h-28`} /></Field>
              <Field label="Rules and format notes" wide><textarea value={formatForm.rules_notes} onChange={(event) => setFormatForm({ ...formatForm, rules_notes: event.target.value })} className={`${inputClass} min-h-28`} /></Field>
            </div>
          ) : null}

          {activeStage === "teams_participants" ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 text-sm text-blue-100">Choose a canonical team/person when known. A typed snapshot remains unlinked and is never name-merged automatically.</p>
              {entries.map((entry, index) => (
                <div key={entry.setup_key} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-6">
                  <select value={entry.entry_type} onChange={(event) => updateEntry(index, "entry_type", event.target.value)} className={inputClass.replace("mt-2 ", "")}><option value="team">Team</option><option value="person">Person</option></select>
                  <select value={entry.entry_type === "team" ? entry.team_id : entry.player_id} onChange={(event) => {
                    const id = event.target.value;
                    const source = entry.entry_type === "team" ? teams.find((team) => text(team.id) === id) : people.find((person) => text(person.id) === id);
                    updateEntry(index, entry.entry_type === "team" ? "team_id" : "player_id", id);
                    if (source) updateEntry(index, "display_name_snapshot", text(source.name || source.full_name || source.nickname));
                  }} className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`}>
                    <option value="">Unlinked / external</option>
                    {(entry.entry_type === "team" ? teams : people).map((option) => <option key={text(option.id)} value={text(option.id)}>{text(option.name || option.full_name || option.nickname)}</option>)}
                  </select>
                  <input value={entry.display_name_snapshot} onChange={(event) => updateEntry(index, "display_name_snapshot", event.target.value)} placeholder="Display name" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <button onClick={() => setEntries((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-black text-rose-200 hover:bg-rose-400/10">Remove</button>
                  <input value={entry.division} onChange={(event) => updateEntry(index, "division", event.target.value)} placeholder="Division" className={`md:col-span-3 ${inputClass.replace("mt-2 ", "")}`} />
                  <select value={entry.entry_status} onChange={(event) => updateEntry(index, "entry_status", event.target.value)} className={`md:col-span-3 ${inputClass.replace("mt-2 ", "")}`}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="waitlisted">Waitlisted</option></select>
                </div>
              ))}
              <button onClick={() => setEntries((current) => [...current, { setup_key: rowKey("entry"), entry_type: formatForm.participant_mode === "person" ? "person" : "team", team_id: "", player_id: "", display_name_snapshot: "", division: formatForm.divisions.split(/[\n,]+/)[0]?.trim() || "", entry_status: "pending" }])} className="rounded-xl border border-orange-300/30 px-4 py-2.5 text-sm font-black text-orange-200 hover:bg-orange-400/10">Add participant</button>
            </div>
          ) : null}

          {activeStage === "schedule" ? (
            <div className="space-y-4">
              {games.map((game, index) => (
                <div key={game.setup_key} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-6">
                  <input value={game.home_team_name} onChange={(event) => updateGame(index, "home_team_name", event.target.value)} placeholder="Home / side A" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <input value={game.away_team_name} onChange={(event) => updateGame(index, "away_team_name", event.target.value)} placeholder="Away / side B" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <input type="datetime-local" value={game.game_date} onChange={(event) => updateGame(index, "game_date", event.target.value)} className={inputClass.replace("mt-2 ", "")} />
                  <button onClick={() => setGames((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-black text-rose-200">Remove</button>
                  <input value={game.game_stage} onChange={(event) => updateGame(index, "game_stage", event.target.value)} placeholder="Stage / round" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <input value={game.venue} onChange={(event) => updateGame(index, "venue", event.target.value)} placeholder="Venue" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <input value={game.court} onChange={(event) => updateGame(index, "court", event.target.value)} placeholder="Court" className={inputClass.replace("mt-2 ", "")} />
                  <select value={game.status} onChange={(event) => updateGame(index, "status", event.target.value)} className={inputClass.replace("mt-2 ", "")}><option value="upcoming">Upcoming</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select>
                </div>
              ))}
              <button onClick={() => setGames((current) => [...current, { setup_key: rowKey("fixture"), title: "", competition_name: formatForm.competition_name, home_team_name: "", away_team_name: "", game_format: formatForm.format, game_stage: "Game", game_date: "", venue: eventForm.venue, court: "", status: "upcoming" }])} className="rounded-xl border border-orange-300/30 px-4 py-2.5 text-sm font-black text-orange-200 hover:bg-orange-400/10">Add fixture</button>
            </div>
          ) : null}

          {activeStage === "services" ? (
            <div className="space-y-4">
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black p-4 text-sm font-bold text-zinc-300"><input type="checkbox" checked={noServices} onChange={(event) => setNoServices(event.target.checked)} /> No event services or deliverables are required</label>
              {deliverables.map((item, index) => (
                <div key={item.setup_key} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-6">
                  <input value={item.service_type} onChange={(event) => updateDeliverable(index, "service_type", event.target.value)} placeholder="Service type" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <input value={item.title} onChange={(event) => updateDeliverable(index, "title", event.target.value)} placeholder="Deliverable title" className={`md:col-span-2 ${inputClass.replace("mt-2 ", "")}`} />
                  <input type="datetime-local" value={item.due_at} onChange={(event) => updateDeliverable(index, "due_at", event.target.value)} className={inputClass.replace("mt-2 ", "")} />
                  <button onClick={() => setDeliverables((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-black text-rose-200">Remove</button>
                  <textarea value={item.description} onChange={(event) => updateDeliverable(index, "description", event.target.value)} placeholder="Description, owner or evidence expectation" className={`md:col-span-5 ${inputClass.replace("mt-2 ", "")} min-h-20`} />
                  <select value={item.deliverable_status} onChange={(event) => updateDeliverable(index, "deliverable_status", event.target.value)} className={inputClass.replace("mt-2 ", "")}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="ready_for_review">Ready for review</option></select>
                </div>
              ))}
              <button onClick={() => { setNoServices(false); setDeliverables((current) => [...current, { setup_key: rowKey("deliverable"), service_type: "", title: "", description: "", due_at: "", deliverable_status: "planned" }]); }} className="rounded-xl border border-orange-300/30 px-4 py-2.5 text-sm font-black text-orange-200 hover:bg-orange-400/10">Add deliverable</button>
            </div>
          ) : null}

          {activeStage === "branding" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Poster URL" wide><input value={branding.poster_url} onChange={(event) => setBranding({ ...branding, poster_url: event.target.value })} className={inputClass} /></Field>
              <Field label="Hero image URL" wide><input value={branding.hero_image_url} onChange={(event) => setBranding({ ...branding, hero_image_url: event.target.value })} className={inputClass} /></Field>
              <Field label="Organizer logo URL" wide><input value={branding.organizer_logo_url} onChange={(event) => setBranding({ ...branding, organizer_logo_url: event.target.value })} className={inputClass} /></Field>
              <Field label="Brand notes" wide><textarea value={branding.brand_notes} onChange={(event) => setBranding({ ...branding, brand_notes: event.target.value })} className={`${inputClass} min-h-24`} /></Field>
              <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-white/10 bg-black p-4 text-sm font-bold text-zinc-300"><input type="checkbox" checked={branding.branding_confirmed} onChange={(event) => setBranding({ ...branding, branding_confirmed: event.target.checked })} className="mt-1" /> Branding has been reviewed. No participant media is made public here; participant consent is governed separately.</label>
            </div>
          ) : null}

          {activeStage === "publish" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-black p-4"><p className="text-xs font-black uppercase text-zinc-500">Completed stages</p><p className="mt-2 text-3xl font-black">{Array.from(completed).filter((stage) => stage !== "publish").length}/6</p></div>
                <div className="rounded-2xl bg-black p-4"><p className="text-xs font-black uppercase text-zinc-500">Participants</p><p className="mt-2 text-3xl font-black">{entries.length}</p></div>
                <div className="rounded-2xl bg-black p-4"><p className="text-xs font-black uppercase text-zinc-500">Fixtures</p><p className="mt-2 text-3xl font-black">{games.length}</p></div>
              </div>
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Publishing is a server-controlled transition. It only succeeds when every prior stage is complete and current operational records pass validation.</p>
              <div className="flex flex-wrap gap-3">
                <button disabled={saving} onClick={() => void saveStage(true, false)} className="rounded-xl border border-white/15 px-5 py-3 font-black hover:border-orange-300/50 disabled:opacity-50">Validate and keep private</button>
                <button disabled={saving} onClick={() => void saveStage(true, true)} className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-black hover:bg-emerald-300 disabled:opacity-50">Validate and publish</button>
              </div>
            </div>
          ) : null}

          {validationErrors?.length ? (
            <div className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4">
              <p className="font-black text-rose-100">Resolve before continuing</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-100">{validationErrors.map((error, index) => <li key={`${error.code}-${index}`}>{error.message}</li>)}</ul>
            </div>
          ) : null}
          {message ? <p className="mt-6 rounded-xl border border-white/10 bg-black p-3 text-sm text-zinc-300">{message}</p> : null}

          {activeStage !== "publish" ? (
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <button disabled={saving} onClick={() => void saveStage(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-zinc-300 hover:border-orange-300/40 disabled:opacity-50">Save draft</button>
              <button disabled={saving} onClick={() => void saveStage(true)} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-black hover:bg-orange-400 disabled:opacity-50">{saving ? "Saving…" : "Save and continue"}</button>
            </div>
          ) : null}
          </fieldset>
        </section>
      </div>
    </main>
  );
}
