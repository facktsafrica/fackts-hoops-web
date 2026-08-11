"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventCase = { id: string; event_id: string; title: string; slug: string; summary: string | null; start_date: string | null; end_date: string | null; venue: string | null; location: string | null; poster_url: string | null; hero_image_url: string | null; status: string; photo_count: number; is_public: boolean; event_type: string; age_category: string; deletion_protected: boolean; organizer_name?: string | null; organizer_logo_url?: string | null; organizer_description?: string | null; organizer_url?: string | null };
type RecordType = "team" | "person" | "result" | "partner" | "media" | "gallery" | "award" | "consent" | "prize";
type RecordRow = { id: string; event_id: string; record_type: RecordType; title: string; subtitle: string | null; details: string | null; division: string | null; team_name: string | null; opponent_name: string | null; score_for: number | null; score_against: number | null; url: string | null; image_url: string | null; status: string; is_public: boolean; metadata?: Record<string, unknown> | null };
type RecordForm = { record_type: RecordType; title: string; subtitle: string; details: string; division: string; team_name: string; opponent_name: string; score_for: string; score_against: string; url: string; image_url: string; status: string; is_public: boolean; day: string; game_number: string; walkover: boolean };
type FieldKey = keyof Pick<RecordForm, "title" | "subtitle" | "details" | "division" | "team_name" | "opponent_name" | "score_for" | "score_against" | "url" | "image_url">;
type FieldSpec = { key: FieldKey; label: string; placeholder?: string; type?: string; wide?: boolean; textarea?: boolean; options?: string[] };

const emptyRecord: RecordForm = { record_type: "team", title: "", subtitle: "", details: "", division: "", team_name: "", opponent_name: "", score_for: "", score_against: "", url: "", image_url: "", status: "draft", is_public: false, day: "", game_number: "", walkover: false };
const privateTypes = new Set<RecordType>(["consent", "prize"]);
const imageRecordTypes = new Set<RecordType>(["team", "person", "partner", "media", "gallery", "award"]);
const EVENT_IMAGE_BUCKET = "event-images";
const EVENT_TYPES = ["1v1", "2v2", "3v3", "5v5", "Dunk Contest", "Skills Challenge", "Shooting Contest", "Creators League", "Camp / Clinic", "Other"];
const AGE_CATEGORIES = ["Open", "Under 10", "Under 12", "Under 14", "Under 16", "Under 18", "University / College", "Creators", "Corporate", "Masters", "Other"];

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || `event-image-${Date.now()}.jpg`;
}

function normalizeHostedImageUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  const pathMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const queryMatch = url.match(/[?&]id=([^&]+)/i);
  const id = pathMatch?.[1] || (url.includes("drive.google.com") ? queryMatch?.[1] : "");
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : url;
}

async function uploadEventImage(file: File, eventId: string, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
  const filePath = `${eventId}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).upload(filePath, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from(EVENT_IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;
}

const sections: Record<RecordType, { label: string; singular: string; icon: string; description: string; accent: string; fields: FieldSpec[]; statuses: string[] }> = {
  team: { label: "Teams & rosters", singular: "team", icon: "TEAM", description: "Create the public team profile, upload its hero image and enter the official player roster.", accent: "from-blue-500/25 to-cyan-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Team name", placeholder: "e.g. Usiku SACCO" }, { key: "image_url", label: "Team hero photo / logo", placeholder: "Upload the team photo used on cards and champion features", wide: true }, { key: "subtitle", label: "Head coach / team lead", placeholder: "Coach or team lead's full name" }, { key: "division", label: "Category / division", placeholder: "Select a category", options: ["Men", "Women", "Mixed", "Youth Boys", "Youth Girls", "Other"] }, { key: "team_name", label: "Roster headline", placeholder: "e.g. Official 12-player tournament roster", wide: true }, { key: "details", label: "Player roster — one player per line", placeholder: "#4 Player Name — Guard\n#8 Player Name — Forward\n#12 Player Name — Center", textarea: true, wide: true },
  ] },
  person: { label: "People & officials", singular: "person", icon: "CREW", description: "Record referees, table officials, organisers, coaches and contributors.", accent: "from-violet-500/25 to-fuchsia-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Full name", placeholder: "Person's name" }, { key: "subtitle", label: "Event role", placeholder: "Select their role", options: ["Referee", "Table Official", "Coach", "Team Manager", "MC / Announcer", "Event Coordinator", "Media Crew", "Medical Support", "Security", "Volunteer", "Contributor", "Other"] }, { key: "division", label: "Role group", placeholder: "Select a group", options: ["Match Officials", "Teams & Coaching", "Event Operations", "Media & Production", "Medical & Safeguarding", "Security", "Partners & Contributors", "Other"] }, { key: "team_name", label: "Team / organisation", placeholder: "If applicable" }, { key: "image_url", label: "Profile image URL", placeholder: "https://...", wide: true }, { key: "details", label: "Contribution / assignment", placeholder: "What they handled during the event", textarea: true, wide: true },
  ] },
  result: { label: "Results", singular: "result", icon: "SCORE", description: "Enter verified matchups exactly as they appeared on the scoresheet.", accent: "from-orange-500/30 to-amber-400/5", statuses: ["draft", "pending", "verified", "published", "hidden"], fields: [
    { key: "division", label: "Round / stage", placeholder: "Select the match stage", options: ["Group Stage", "Round of 16", "Quarterfinal", "Semifinal", "Third-place Playoff", "Final", "Friendly / Exhibition", "Other"] }, { key: "title", label: "Match label", placeholder: "e.g. Men's Final" }, { key: "team_name", label: "Team A", placeholder: "Home / first team" }, { key: "opponent_name", label: "Team B", placeholder: "Away / second team" }, { key: "score_for", label: "Team A score", type: "number" }, { key: "score_against", label: "Team B score", type: "number" }, { key: "subtitle", label: "Game date / court", placeholder: "Optional fixture note", wide: true }, { key: "details", label: "Verification note", placeholder: "Scoresheet reference or correction note", textarea: true, wide: true },
  ] },
  partner: { label: "Partners", singular: "partner", icon: "BRAND", description: "Recognise organisations by their actual contribution to the event.", accent: "from-emerald-500/25 to-teal-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Organisation", placeholder: "Partner name" }, { key: "division", label: "Partner category", placeholder: "Select partner category", options: ["Venue Partner", "Medical Partner", "Media Partner", "Insurance Partner", "Merchandise Partner", "Security Partner", "Community Partner", "Technical Partner", "Sponsor", "Supporting Partner", "Other"] }, { key: "subtitle", label: "Contribution", placeholder: "Venue host, medical support...", wide: true }, { key: "image_url", label: "Official logo URL", placeholder: "https://..." }, { key: "url", label: "Website / social link", placeholder: "https://..." }, { key: "details", label: "Recognition note", placeholder: "Describe the support accurately", textarea: true, wide: true },
  ] },
  media: { label: "Media library", singular: "media item", icon: "PLAY", description: "Publish highlights, interviews, speeches and promotional videos.", accent: "from-rose-500/25 to-orange-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Media title", placeholder: "Clear public-facing title" }, { key: "subtitle", label: "Media category", placeholder: "Select media category", options: ["Game Highlights", "Full Game", "Interview", "Speech", "Press Conference", "Event Recap", "Promotional Video", "Short-form Clip", "Other"] }, { key: "division", label: "Platform", placeholder: "Select platform", options: ["YouTube", "Instagram", "TikTok", "Facebook", "X / Twitter", "FACKTS Website", "Google Drive", "Other"] }, { key: "url", label: "Video / media URL", placeholder: "https://..." }, { key: "image_url", label: "Thumbnail URL", placeholder: "https://...", wide: true }, { key: "details", label: "Caption / description", placeholder: "What viewers will see", textarea: true, wide: true },
  ] },
  gallery: { label: "Photo gallery", singular: "photo", icon: "PHOTO", description: "Curate approved photographs rather than uploading the entire archive.", accent: "from-sky-500/25 to-indigo-400/5", statuses: ["draft", "verified", "published", "hidden", "restricted"], fields: [
    { key: "title", label: "Photo title", placeholder: "Short descriptive title" }, { key: "division", label: "Gallery category", placeholder: "Select gallery category", options: ["Event Atmosphere", "Crowd", "Team Photos", "Game Action", "Officials", "Partners", "Speeches & Interviews", "Awards", "Behind the Scenes", "Other"] }, { key: "image_url", label: "Photo URL", placeholder: "https://...", wide: true }, { key: "subtitle", label: "Photographer / credit", placeholder: "Optional credit" }, { key: "url", label: "External album link", placeholder: "Optional" }, { key: "details", label: "Caption and clearance note", placeholder: "Caption plus any usage restriction", textarea: true, wide: true },
  ] },
  award: { label: "Awards", singular: "award", icon: "AWARD", description: "Record champions, finalists and individual recognitions.", accent: "from-yellow-500/25 to-orange-400/5", statuses: ["draft", "verified", "published", "hidden"], fields: [
    { key: "title", label: "Award title", placeholder: "Select award", options: ["Champions", "Runners-up", "Third Place", "Most Valuable Player", "Top Scorer", "Best Defensive Player", "Best Coach", "Fair Play Award", "Other"] }, { key: "subtitle", label: "Recipient", placeholder: "Player or team" }, { key: "team_name", label: "Recipient's team", placeholder: "If applicable" }, { key: "division", label: "Category / division", placeholder: "Select a category", options: ["Men", "Women", "Mixed", "Youth Boys", "Youth Girls", "Overall", "Other"] }, { key: "image_url", label: "Award image URL", placeholder: "https://...", wide: true }, { key: "details", label: "Award note", placeholder: "Performance or verification note", textarea: true, wide: true },
  ] },
  consent: { label: "Consent register", singular: "consent record", icon: "LOCK", description: "Private media-clearance register. These records can never appear publicly.", accent: "from-slate-500/25 to-blue-400/5", statuses: ["pending", "verified", "restricted", "withdrawn"], fields: [
    { key: "title", label: "Participant / subject", placeholder: "Full name or consent reference" }, { key: "division", label: "Person category", placeholder: "Select person category", options: ["Adult", "Minor", "Team / Group", "Official", "Volunteer", "Other"] }, { key: "subtitle", label: "Consent type", placeholder: "Select permitted use", options: ["Photo Use", "Video Use", "Photo & Video Use", "Promotional Use", "Internal Archive Only", "Guardian Consent", "Restricted Use", "Other"] }, { key: "team_name", label: "Team / guardian reference", placeholder: "Where applicable" }, { key: "url", label: "Consent document reference", placeholder: "Private file link or reference", wide: true }, { key: "details", label: "Restrictions / notes", placeholder: "Guardian, permitted use, withdrawal details", textarea: true, wide: true },
  ] },
  prize: { label: "Prize settlement", singular: "prize record", icon: "KES", description: "Private financial tracker for promised, paid and outstanding prizes.", accent: "from-green-500/25 to-emerald-400/5", statuses: ["pending", "part-paid", "settled", "disputed"], fields: [
    { key: "title", label: "Prize / award", placeholder: "e.g. Men's champions" }, { key: "subtitle", label: "Recipient", placeholder: "Team or player" }, { key: "team_name", label: "Team", placeholder: "If applicable" }, { key: "division", label: "Payment reference", placeholder: "Invoice, voucher or internal reference" }, { key: "score_for", label: "Amount promised (KES)", type: "number" }, { key: "score_against", label: "Amount paid (KES)", type: "number" }, { key: "details", label: "Settlement notes", placeholder: "Balance, payment date or follow-up", textarea: true, wide: true },
  ] },
};

const sectionOrder = Object.keys(sections) as RecordType[];

export default function LegacyEventContentPage() {
  const [events, setEvents] = useState<EventCase[]>([]);
  const [selected, setSelected] = useState("");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<RecordType>("team");
  const [form, setForm] = useState<RecordForm>(emptyRecord);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading event workspace...");
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventSaveMessage, setEventSaveMessage] = useState("");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

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
  useEffect(() => { const timer = window.setTimeout(() => void loadEvents(), 0); return () => window.clearTimeout(timer); }, [loadEvents]);
  useEffect(() => { const timer = window.setTimeout(() => void loadRecords(), 0); return () => window.clearTimeout(timer); }, [loadRecords]);

  const active = events.find((item) => item.event_id === selected);
  const visible = useMemo(() => records.filter((row) => row.record_type === tab), [records, tab]);
  const config = sections[tab];

  function switchTab(next: RecordType) { setTab(next); setEditingId(null); setForm({ ...emptyRecord, record_type: next, status: sections[next].statuses[0] }); }
  function update(key: FieldKey, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingEvent) return;
    const data = new FormData(event.currentTarget);
    setCreatingEvent(true); setMessage("Creating event...");
    try {
      const response = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: data.get("title"), event_type: data.get("event_type"), age_category: data.get("age_category"), organizer_name: data.get("organizer_name"), summary: data.get("summary") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event could not be created.");
      const created = result.event as EventCase;
      setEvents((current) => [created, ...current]); setSelected(created.event_id); setRecords([]); setShowCreateEvent(false); setShowEventEditor(true); setMessage("New event created. Complete its setup, then add teams, results, media and partners.");
      event.currentTarget.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Event could not be created."); }
    finally { setCreatingEvent(false); }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || savingEvent) return;

    const data = new FormData(event.currentTarget);
    const payload = { title: String(data.get("title") || "").trim(), summary: String(data.get("summary") || "").trim(), event_type: String(data.get("event_type") || "5v5"), age_category: String(data.get("age_category") || "Open"), organizer_name: String(data.get("organizer_name") || "").trim() || null, organizer_logo_url: normalizeHostedImageUrl(String(data.get("organizer_logo_url") || "")) || null, organizer_description: String(data.get("organizer_description") || "").trim() || null, organizer_url: String(data.get("organizer_url") || "").trim() || null, venue: String(data.get("venue") || "").trim(), location: String(data.get("location") || "").trim(), poster_url: normalizeHostedImageUrl(String(data.get("poster_url") || "")) || null, hero_image_url: normalizeHostedImageUrl(String(data.get("hero_image_url") || "")) || null, start_date: String(data.get("start_date") || "") || null, end_date: String(data.get("end_date") || "") || null, photo_count: Number(data.get("photo_count") || 0), status: String(data.get("status") || "draft"), is_public: data.get("is_public") === "on", deletion_protected: data.get("deletion_protected") === "on", updated_at: new Date().toISOString() };

    if (!payload.title) {
      setEventSaveMessage("Event title is required.");
      return;
    }

    setSavingEvent(true);
    setEventSaveMessage("Saving event setup...");

    try {
      const response = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selected, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event setup could not save.");
      const saved = result.event as EventCase;

      setEvents((current) => current.map((item) => item.event_id === selected ? saved as EventCase : item));
      setEventSaveMessage("Event setup saved successfully.");
      setMessage("Event setup saved successfully.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown save error.";
      setEventSaveMessage(`Event setup could not save: ${reason}`);
      setMessage(`Event setup could not save: ${reason}`);
    } finally {
      setSavingEvent(false);
    }
  }

  async function publishEvent() {
    if (!selected || !active || savingEvent) return;
    setSavingEvent(true);
    setEventSaveMessage("Publishing event...");
    try {
      const response = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selected, status: "published", is_public: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event could not be published.");
      const published = result.event as EventCase;
      setEvents((current) => current.map((item) => item.event_id === selected ? published : item));
      setEventSaveMessage("Event published. It is now visible on the public Events page.");
      setMessage("Event published successfully.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown publish error.";
      setEventSaveMessage(`Event could not be published: ${reason}`);
      setMessage(`Event could not be published: ${reason}`);
    } finally {
      setSavingEvent(false);
    }
  }

  async function deleteEvent() {
    if (!active || deletingEvent) return;
    const confirmationTitle = window.prompt(
      `Delete “${active.title}” and all of its teams, results, media and records?\n\nType the exact event title to confirm:`,
    );
    if (confirmationTitle === null) return;
    if (confirmationTitle.trim() !== active.title) {
      setMessage("Event not deleted: the title did not match exactly.");
      return;
    }

    setDeletingEvent(true);
    setMessage("Deleting event and its linked records...");
    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: active.event_id, confirmation_title: confirmationTitle.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event could not be deleted.");

      const remaining = events.filter((item) => item.event_id !== active.event_id);
      setEvents(remaining);
      setSelected(remaining[0]?.event_id || "");
      setRecords([]);
      setShowEventEditor(false);
      setEventSaveMessage("");
      setMessage(`“${active.title}” and all of its linked records were deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Event could not be deleted.");
    } finally {
      setDeletingEvent(false);
    }
  }

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return setMessage(`Add the ${config.fields[0].label.toLowerCase()} first.`);
    const { day, game_number, walkover, ...recordFields } = form;
    const existingMetadata = editingId ? records.find((row) => row.id === editingId)?.metadata || {} : {};
    const metadata = tab === "result" ? { ...existingMetadata, day: day === "" ? null : Number(day), game_number: game_number === "" ? null : Number(game_number), round: form.division || null, walkover } : existingMetadata;
    const payload = { ...recordFields, metadata, image_url: normalizeHostedImageUrl(form.image_url), event_id: selected, title: form.title.trim(), score_for: form.score_for === "" ? null : Number(form.score_for), score_against: form.score_against === "" ? null : Number(form.score_against), is_public: privateTypes.has(tab) ? false : form.is_public };
    const query = editingId ? supabase.from("event_records").update(payload).eq("id", editingId) : supabase.from("event_records").insert(payload);
    const { error } = await query;
    setMessage(error ? error.message : editingId ? `${config.singular} updated.` : `${config.singular} added.`);
    if (!error) { setEditingId(null); setForm({ ...emptyRecord, record_type: tab, status: config.statuses[0] }); loadRecords(); }
  }

  function edit(row: RecordRow) {
    setEditingId(row.id); setForm({ record_type: row.record_type, title: row.title, subtitle: row.subtitle || "", details: row.details || "", division: row.division || "", team_name: row.team_name || "", opponent_name: row.opponent_name || "", score_for: row.score_for?.toString() || "", score_against: row.score_against?.toString() || "", url: row.url || "", image_url: row.image_url || "", status: row.status, is_public: row.is_public, day: String(row.metadata?.day || ""), game_number: String(row.metadata?.game_number || ""), walkover: Boolean(row.metadata?.walkover) });
    document.getElementById("record-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function remove(id: string) { if (!window.confirm(`Delete this ${config.singular}?`)) return; const { error } = await supabase.from("event_records").delete().eq("id", id); setMessage(error ? error.message : `${config.singular} deleted.`); if (!error) loadRecords(); }

  return <main className="min-h-screen bg-[#050b18] px-3 py-5 text-white sm:px-6 sm:py-8">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-blue-950 via-slate-950 to-orange-950/50 p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300 sm:text-xs">FACKTS operations</p><h1 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">Events control centre</h1><p className="mt-3 max-w-2xl text-sm text-slate-300">Build the event record, publish its story and protect private operational information.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{active ? <Link href={`/events/${active.slug}?preview=admin`} target="_blank" className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-5 py-3 text-center text-xs font-black uppercase text-orange-200">Preview event page</Link> : null}{active && (active.status !== "published" || !active.is_public) ? <button type="button" onClick={publishEvent} disabled={savingEvent} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black uppercase text-slate-950 disabled:opacity-50">{savingEvent ? "Publishing..." : "Publish event now"}</button> : active ? <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-center text-xs font-black uppercase text-emerald-300">Published publicly</span> : null}<button onClick={() => setShowCreateEvent((value) => !value)} className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase text-black">{showCreateEvent ? "Cancel new event" : "+ Create new event"}</button>{active ? <button onClick={() => setShowEventEditor((value) => !value)} className="rounded-xl bg-white px-5 py-3 text-xs font-black uppercase text-slate-950">{showEventEditor ? "Close event setup" : "Edit event setup"}</button> : null}{active && !active.deletion_protected ? <button type="button" onClick={deleteEvent} disabled={deletingEvent} className="rounded-xl border border-red-400/50 bg-red-500/10 px-5 py-3 text-xs font-black uppercase text-red-200 disabled:opacity-50">{deletingEvent ? "Deleting event..." : "Delete this event"}</button> : active ? <span className="rounded-xl border border-slate-500/40 bg-slate-800 px-5 py-3 text-center text-xs font-black uppercase text-slate-300">Deletion protected</span> : null}</div>
        </div>
      </header>

      {active ? <div className="mt-4 flex justify-end"><Link href={`/events/${active.slug}/report`} target="_blank" className="w-full rounded-xl border border-blue-400/40 bg-blue-500/10 px-5 py-3 text-center text-xs font-black uppercase text-blue-200 sm:w-auto">Download event summary</Link></div> : null}
      {message ? <button onClick={() => setMessage("")} className="mt-4 w-full rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-left text-sm text-blue-100">{message}</button> : null}

      {showCreateEvent ? <section className="mt-5 rounded-[1.75rem] border border-orange-400/30 bg-gradient-to-br from-orange-500/15 via-slate-950 to-blue-950 p-4 sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">New basketball event</p><h2 className="mt-2 text-2xl font-black uppercase">Create the event workspace</h2><form onSubmit={createEvent} className="mt-5 grid gap-4 sm:grid-cols-2"><BasicField name="title" label="Event title" value="" wide /><BasicField name="organizer_name" label="Organizer name" value="FACKTS Africa" wide /><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Basketball format<select name="event_type" defaultValue="5v5" className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white">{EVENT_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Age / league category<select name="age_category" defaultValue="Open" className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white">{AGE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label><BasicArea name="summary" label="Short event description" value="" /><button disabled={creatingEvent} className="min-h-12 rounded-xl bg-orange-500 px-6 py-3 text-xs font-black uppercase text-black disabled:opacity-50 sm:col-span-2 sm:justify-self-end">{creatingEvent ? "Creating..." : "Create event"}</button></form></section> : null}

      <section className="mt-5">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Active event</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{events.map((item) => <button key={item.id} onClick={() => setSelected(item.event_id)} className={`rounded-2xl border p-4 text-left transition ${selected === item.event_id ? "border-orange-400 bg-orange-500/15 shadow-lg shadow-orange-950/30" : "border-white/10 bg-slate-900/80 hover:border-blue-400/40"}`}><span className="block text-sm font-black uppercase leading-tight">{item.title}</span><span className="mt-2 block text-[10px] font-black uppercase text-orange-300">{item.event_type || "5v5"} · {item.age_category || "Open"}</span><span className="mt-1 block text-xs text-slate-400">{item.start_date || "Date pending"} · {item.venue || "Venue pending"}</span></button>)}</div>
      </section>

      {showEventEditor && active ? <EventEditor active={active} saveEvent={saveEvent} saving={savingEvent} saveMessage={eventSaveMessage} /> : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <nav className="grid grid-cols-2 gap-2 self-start sm:grid-cols-3 lg:sticky lg:top-5 lg:grid-cols-1">
          {sectionOrder.map((type) => { const item = sections[type]; const count = records.filter((row) => row.record_type === type).length; return <button key={type} onClick={() => switchTab(type)} className={`min-h-20 rounded-2xl border p-3 text-left transition lg:min-h-0 lg:p-4 ${tab === type ? "border-orange-400 bg-orange-500 text-black" : "border-white/10 bg-slate-900 text-slate-200 hover:border-white/25"}`}><span className="block text-[9px] font-black tracking-[.18em] opacity-70">{item.icon}</span><span className="mt-1 block text-xs font-black uppercase leading-tight">{item.label}</span><span className="mt-1 block text-[10px] opacity-70">{count} records</span></button>; })}
        </nav>

        <div className="min-w-0">
          <section id="record-editor" className={`scroll-mt-5 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${config.accent} via-slate-950 to-slate-950 p-4 sm:p-7`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{config.icon} workspace</p><h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">{config.label}</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">{config.description}</p></div>{privateTypes.has(tab) ? <span className="self-start rounded-full border border-slate-500/40 bg-slate-800 px-3 py-2 text-[10px] font-black uppercase text-slate-300">Private register</span> : null}</div>

            <form onSubmit={saveRecord} className="mt-6 grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => <PurposeField key={field.key} spec={field} value={form[field.key]} set={(value) => update(field.key, value)} eventId={selected} folder={tab} onMessage={setMessage} allowUpload={field.key === "image_url" && imageRecordTypes.has(tab)} />)}
              {tab === "result" ? <><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Tournament day<input type="number" min="1" value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })} placeholder="e.g. 3" className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium normal-case text-white outline-none placeholder:text-slate-600 focus:border-orange-400" /></label><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Game number<input type="number" min="1" value={form.game_number} onChange={(event) => setForm({ ...form, game_number: event.target.value })} placeholder="Official sequence" className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium normal-case text-white outline-none placeholder:text-slate-600 focus:border-orange-400" /></label><label className="flex min-h-12 items-center gap-3 rounded-xl border border-orange-400/25 bg-orange-500/[.06] px-4 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={form.walkover} onChange={(event) => setForm({ ...form, walkover: event.target.checked })} className="h-5 w-5 accent-orange-500" /><span>Record this result as a walkover (WO)</span></label></> : null}
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

function EventEditor({ active, saveEvent, saving, saveMessage }: { active: EventCase; saveEvent: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; saveMessage: string }) {
  const [posterUrl, setPosterUrl] = useState(active.poster_url || "");
  const [heroUrl, setHeroUrl] = useState(active.hero_image_url || "");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>, field: "poster" | "hero") {
    const file = event.target.files?.[0]; if (!file) return;
    try { setUploading(field); setUploadMessage(""); const publicUrl = await uploadEventImage(file, active.event_id, field); if (field === "poster") setPosterUrl(publicUrl); else setHeroUrl(publicUrl); setUploadMessage("Image uploaded. Save event setup to keep it."); }
    catch (error) { setUploadMessage(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(null); event.target.value = ""; }
  }
  return <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-900 p-4 sm:p-7"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Event setup</p><h2 className="mt-1 text-xl font-black uppercase">Core public information</h2></div><form key={active.id} noValidate onSubmit={saveEvent} className="mt-5 grid gap-4 sm:grid-cols-2"><BasicField name="title" label="Event title" value={active.title} wide /><BasicArea name="summary" label="Public event summary" value={active.summary || ""} /><BasicField name="organizer_name" label="Organizer name" value={active.organizer_name || ""} /><BasicField name="organizer_url" label="Organizer website / social link" type="url" value={active.organizer_url || ""} /><BasicField name="organizer_logo_url" label="Organizer logo URL" type="url" value={active.organizer_logo_url || ""} wide /><BasicArea name="organizer_description" label="About the organizer" value={active.organizer_description || ""} /><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Basketball format<select name="event_type" defaultValue={active.event_type || "5v5"} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white">{EVENT_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Age / league category<select name="age_category" defaultValue={active.age_category || "Open"} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white">{AGE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label><ImageSourceField name="poster_url" label="Event poster" value={posterUrl} set={setPosterUrl} uploading={uploading === "poster"} onFile={(event) => upload(event, "poster")} /><ImageSourceField name="hero_image_url" label="Event cover / hero photo" value={heroUrl} set={setHeroUrl} uploading={uploading === "hero"} onFile={(event) => upload(event, "hero")} /><BasicField name="start_date" label="Start date" type="date" value={active.start_date || ""} /><BasicField name="end_date" label="End date" type="date" value={active.end_date || ""} /><BasicField name="venue" label="Venue" value={active.venue || ""} /><BasicField name="location" label="Location" value={active.location || ""} /><BasicField name="photo_count" label="Archived photograph count" type="number" value={String(active.photo_count || 0)} /><label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Publication status<select name="status" defaultValue={active.status} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm normal-case text-white"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold"><input name="is_public" type="checkbox" defaultChecked={active.is_public} className="h-5 w-5 accent-orange-500" /> Show event publicly</label><label className="flex min-h-12 items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold sm:col-span-2"><input name="deletion_protected" type="checkbox" defaultChecked={active.deletion_protected} className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" /><span><span className="block">Protect event from deletion</span><span className="mt-1 block text-xs font-normal text-slate-400">When enabled, the Delete button is disabled until an admin turns protection off and saves.</span></span></label>{uploadMessage ? <p className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 text-xs text-blue-100 sm:col-span-2">{uploadMessage}</p> : null}{saveMessage ? <p role="status" aria-live="polite" className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 text-sm font-bold text-blue-100 sm:col-span-2">{saveMessage}</p> : null}<button type="submit" disabled={Boolean(uploading) || saving} className="min-h-12 rounded-xl bg-white px-5 py-3 text-xs font-black uppercase text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 sm:justify-self-end">{saving ? "Saving event setup..." : "Save event setup"}</button></form></section>;
}

function PurposeField({ spec, value, set, eventId, folder, onMessage, allowUpload }: { spec: FieldSpec; value: string; set: (value: string) => void; eventId: string; folder: string; onMessage: (value: string) => void; allowUpload: boolean }) {
  const classes = `text-[10px] font-black uppercase tracking-[.14em] text-slate-400 ${spec.wide ? "sm:col-span-2" : ""}`;
  const inputClasses = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium normal-case text-white outline-none placeholder:text-slate-600 focus:border-orange-400";
  const customValue = spec.options && value && !spec.options.includes(value) ? value : "";
  const [uploading, setUploading] = useState(false);
  async function upload(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; try { setUploading(true); onMessage("Uploading image..."); const publicUrl = await uploadEventImage(file, eventId, folder); set(publicUrl); onMessage("Image uploaded. Save the record to keep it."); } catch (error) { onMessage(error instanceof Error ? error.message : "Image upload failed."); } finally { setUploading(false); event.target.value = ""; } }
  if (allowUpload) return <ImageSourceField label={spec.label.replace(/ URL$/i, "")} value={value} set={set} uploading={uploading} onFile={upload} wide={spec.wide} />;
  return <label className={classes}>{spec.label}{
    spec.options ? <select value={value} onChange={(e) => set(e.target.value)} className={`${inputClasses} h-12 appearance-none cursor-pointer`}>
      <option value="">{spec.placeholder || `Select ${spec.label.toLowerCase()}`}</option>
      {customValue ? <option value={customValue}>{customValue} (existing)</option> : null}
      {spec.options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select> : spec.textarea ? <textarea rows={4} value={value} placeholder={spec.placeholder} onChange={(e) => set(e.target.value)} className={inputClasses} /> : <input type={spec.type || "text"} value={value} placeholder={spec.placeholder} onChange={(e) => set(e.target.value)} className={`${inputClasses} h-12`} />
  }</label>;
}

function ImageSourceField({ name, label, value, set, uploading, onFile, wide = false }: { name?: string; label: string; value: string; set: (value: string) => void; uploading: boolean; onFile: (event: ChangeEvent<HTMLInputElement>) => void; wide?: boolean }) {
  return <div className={`${wide ? "sm:col-span-2" : ""}`}><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</p><div className="mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-3">{value ? <img src={normalizeHostedImageUrl(value)} alt={`${label} preview`} className="mb-3 h-36 w-full rounded-xl bg-slate-900 object-cover" /> : <div className="mb-3 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-600">No image selected</div>}<label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-orange-500 px-4 text-center text-xs font-black uppercase text-black hover:bg-orange-400"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} disabled={uploading} className="sr-only" />{uploading ? "Uploading..." : "Upload image"}</label><div className="my-3 flex items-center gap-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-600"><span className="h-px flex-1 bg-slate-800" />or use a hosted link<span className="h-px flex-1 bg-slate-800" /></div><input name={name} type="url" value={value} onChange={(event) => set(event.target.value)} onBlur={() => set(normalizeHostedImageUrl(value))} placeholder="Paste Google Drive or image URL" className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400" /><p className="mt-2 text-[10px] normal-case leading-4 text-slate-500">For Drive: set the image to “Anyone with the link”, then paste its share link here.</p></div></div>;
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
