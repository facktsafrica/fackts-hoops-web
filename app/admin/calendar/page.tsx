"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type CalendarStatus = "upcoming" | "completed" | "postponed" | "cancelled";

type CalendarEvent = {
  id: string;
  title: string;
  event_type?: string | null;
  event_format?: string | null;
  opponent_or_partner?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  description?: string | null;
  status?: string | null;
  is_featured?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CalendarForm = {
  title: string;
  event_type: string;
  event_format: string;
  opponent_or_partner: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  location: string;
  poster_url: string;
  description: string;
  status: CalendarStatus;
  is_featured: boolean;
};

const emptyForm: CalendarForm = {
  title: "",
  event_type: "Court Take Over",
  event_format: "1v1",
  opponent_or_partner: "",
  event_date: "",
  start_time: "",
  end_time: "",
  venue: "",
  location: "",
  poster_url: "",
  description: "",
  status: "upcoming",
  is_featured: false,
};

const eventTypes = [
  "Court Take Over",
  "Friendly Game",
  "Tournament",
  "Open Run",
  "Media Day",
  "School Showcase",
  "Community Clinic",
  "Training Session",
  "Partnership Event",
  "Other",
];

const eventFormats = [
  "1v1",
  "2v2",
  "3v3",
  "5v5",
  "Mixed Format",
  "Training",
  "Showcase",
  "Media",
  "Community",
  "Other",
];

function normalizeStatus(value?: string | null): CalendarStatus {
  const status = (value || "").toLowerCase().trim();

  if (status === "completed") return "completed";
  if (status === "postponed") return "postponed";
  if (status === "cancelled") return "cancelled";

  return "upcoming";
}

function formatDate(value?: string | null) {
  if (!value) return "No date added";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "No date added";

  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const [hour, minute] = value.split(":");
  if (!hour || !minute) return value;

  const date = new Date();
  date.setHours(Number(hour));
  date.setMinutes(Number(minute));

  return date.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusClass(status?: string | null) {
  const cleanStatus = normalizeStatus(status);

  if (cleanStatus === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (cleanStatus === "postponed") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200";
  }

  if (cleanStatus === "cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-orange-500/30 bg-orange-500/10 text-orange-200";
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [form, setForm] = useState<CalendarForm>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aDate = `${a.event_date || "9999-12-31"} ${
        a.start_time || "23:59"
      }`;
      const bDate = `${b.event_date || "9999-12-31"} ${
        b.start_time || "23:59"
      }`;

      return aDate.localeCompare(bDate);
    });
  }, [events]);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((data || []) as CalendarEvent[]);
    setLoading(false);
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target;

    if (type === "checkbox") {
      const checked = (event.target as HTMLInputElement).checked;

      setForm((current) => ({
        ...current,
        [name]: checked,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePosterChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setPosterFile(file);
  }

  function resetForm() {
    setForm(emptyForm);
    setPosterFile(null);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
  }

  function startEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setPosterFile(null);
    setMessage("");
    setErrorMessage("");

    setForm({
      title: event.title || "",
      event_type: event.event_type || "Court Take Over",
      event_format: event.event_format || "1v1",
      opponent_or_partner: event.opponent_or_partner || "",
      event_date: event.event_date || "",
      start_time: event.start_time ? event.start_time.slice(0, 5) : "",
      end_time: event.end_time ? event.end_time.slice(0, 5) : "",
      venue: event.venue || "",
      location: event.location || "",
      poster_url: event.poster_url || "",
      description: event.description || "",
      status: normalizeStatus(event.status),
      is_featured: Boolean(event.is_featured),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadPoster() {
    if (!posterFile) return form.poster_url;

    const fileExt = posterFile.name.split(".").pop() || "png";
    const fileName = `calendar-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("calendar-posters")
      .upload(fileName, posterFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("calendar-posters")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const posterUrl = await uploadPoster();

      const payload = {
        title: form.title.trim(),
        event_type: form.event_type.trim() || null,
        event_format: form.event_format.trim() || null,
        opponent_or_partner: form.opponent_or_partner.trim() || null,
        event_date: form.event_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        venue: form.venue.trim() || null,
        location: form.location.trim() || null,
        poster_url: posterUrl || null,
        description: form.description.trim() || null,
        status: form.status,
        is_featured: form.is_featured,
        updated_at: new Date().toISOString(),
      };

      if (!payload.title) {
        throw new Error("Event title is required.");
      }

      if (editingId) {
        const { error } = await supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", editingId);

        if (error) throw new Error(error.message);

        setMessage("Calendar event updated successfully.");
      } else {
        const { error } = await supabase.from("calendar_events").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) throw new Error(error.message);

        setMessage("Calendar event added successfully.");
      }

      resetForm();
      await loadEvents();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    const confirmed = window.confirm("Delete this calendar event from the app?");

    if (!confirmed) return;

    setDeletingId(eventId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      setErrorMessage(error.message);
      setDeletingId(null);
      return;
    }

    setMessage("Calendar event deleted successfully.");
    setDeletingId(null);
    await loadEvents();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Admin Panel
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Calendar & Events
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Add Court Take Over dates, 1v1 battles, 3v3 events, school
                showcases, media days, and all upcoming FACKTS activities.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Admin Home
              </Link>

              <Link
                href="/calendar"
                className="rounded-full border border-orange-400/40 bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
              >
                View Calendar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[430px_1fr] lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                {editingId ? "Editing Event" : "New Event"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {editingId ? "Update Calendar Item" : "Add Calendar Item"}
              </h2>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-4">
            <Field label="Title">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. FACKTS vs Juja Basketball League"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Event Type">
                <select
                  name="event_type"
                  value={form.event_type}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Format">
                <select
                  name="event_format"
                  value={form.event_format}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                >
                  {eventFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Opponent / Partner">
              <input
                name="opponent_or_partner"
                value={form.opponent_or_partner}
                onChange={handleChange}
                placeholder="e.g. Juja Basketball League, State House Girls"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Date">
                <input
                  type="date"
                  name="event_date"
                  value={form.event_date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </Field>

              <Field label="Start Time">
                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </Field>

              <Field label="End Time">
                <input
                  type="time"
                  name="end_time"
                  value={form.end_time}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue">
                <input
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="e.g. JKUAT Court"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                />
              </Field>

              <Field label="Location">
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Juja"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              <Field label="Featured">
                <label className="flex h-[46px] items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-zinc-300">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={form.is_featured}
                    onChange={handleChange}
                    className="h-4 w-4 accent-orange-500"
                  />
                  Show as featured
                </label>
              </Field>
            </div>

            <Field label="Poster Upload">
              <input
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-black file:text-black"
              />
            </Field>

            <Field label="Current Poster URL">
              <input
                name="poster_url"
                value={form.poster_url}
                onChange={handleChange}
                placeholder="Poster URL appears here after upload"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />

              {form.poster_url ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <img
                    src={form.poster_url}
                    alt="Calendar poster"
                    className="h-48 w-full object-cover"
                  />
                </div>
              ) : null}
            </Field>

            <Field label="Description">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the event, match format, call time, or important notes."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Calendar Changes"
                  : "Add Calendar Event"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Calendar Database
              </p>

              <h2 className="mt-1 text-2xl font-black">Existing Events</h2>
            </div>

            <button
              type="button"
              onClick={loadEvents}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
              Loading calendar events...
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
              No calendar events added yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.map((event) => (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-black"
                >
                  {event.poster_url ? (
                    <div className="h-56 w-full overflow-hidden bg-zinc-900">
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {normalizeStatus(event.status)}
                      </span>

                      {event.is_featured ? (
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
                          Featured
                        </span>
                      ) : null}

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase text-zinc-300">
                        {event.event_format || "Format"}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white">
                      {event.title}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-zinc-400">
                      {event.event_type || "Event"}
                      {event.opponent_or_partner
                        ? ` • ${event.opponent_or_partner}`
                        : ""}
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                      {formatDate(event.event_date)}
                      {event.start_time ? ` • ${formatTime(event.start_time)}` : ""}
                      {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {[event.venue, event.location].filter(Boolean).join(" • ") ||
                        "No venue/location added"}
                    </p>

                    {event.description ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                        {event.description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(event)}
                        className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteEvent(event.id)}
                        disabled={deletingId === event.id}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>

      {children}
    </label>
  );
}