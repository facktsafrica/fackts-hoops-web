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

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  registration_deadline?: string | null;
  notes?: string | null;
  is_public?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Availability = {
  id: string;
  participant_source: string;
  participant_id: string;
  participant_name: string;
  availability_type: "weekly" | "game" | "event";
  weekday: string;
  game_id: string;
  event_id: string;
  status: "available" | "not_available";
  preferred_time?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Matchup = {
  id: string;
  matchup_status: "suggested" | "approved" | "rejected" | "deleted";
  matchup_source: "availability" | "manual";
  event_id: string;
  weekday: string;
  player_one_source: string;
  player_one_id: string;
  player_one_name: string;
  player_two_source: string;
  player_two_id: string;
  player_two_name: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  venue?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Game = {
  id: string;
  title?: string | null;
  game_title?: string | null;
  opponent?: string | null;
  opponent_name?: string | null;
  team_name?: string | null;
  game_date?: string | null;
  date?: string | null;
  venue?: string | null;
  location?: string | null;
  status?: string | null;
  is_upcoming?: boolean | null;
};

type EventForm = {
  title: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  venue: string;
  location: string;
  poster_url: string;
  registration_deadline_date: string;
  registration_deadline_time: string;
  notes: string;
  is_public: boolean;
  is_active: boolean;
};

const emptyForm: EventForm = {
  title: "",
  event_type: "court_takeover",
  event_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  venue: "",
  location: "",
  poster_url: "",
  registration_deadline_date: "",
  registration_deadline_time: "",
  notes: "",
  is_public: true,
  is_active: true,
};

const eventTypes = [
  { label: "Court Takeover", value: "court_takeover" },
  { label: "General Event", value: "event" },
  { label: "Training", value: "training" },
  { label: "Media Day", value: "media_day" },
  { label: "Other", value: "other" },
];

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function formatEventType(value?: string | null) {
  return String(value ?? "event").replaceAll("_", " ");
}

function combineDateTime(date: string, time: string) {
  if (!date) return null;
  return `${date}T${time || "00:00"}:00+03:00`;
}

function getDatePart(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimePart(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDeadline(value?: string | null) {
  if (!value) return "No deadline";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";

  return date.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventLocation(event: CalendarEvent) {
  return [event.venue, event.location].filter(Boolean).join(" • ") || "Venue TBA";
}

function getGameTitle(game: Game) {
  return game.game_title || game.title || "FACKTS Game";
}

function getOpponent(game: Game) {
  return game.opponent || game.opponent_name || game.team_name || "Opponent TBA";
}

function getGameDate(game: Game) {
  return game.game_date || game.date || null;
}

function getGameLocation(game: Game) {
  return [game.venue, game.location].filter(Boolean).join(" • ") || "Venue TBA";
}

function isUpcomingGame(game: Game) {
  const status = normalize(game.status);

  if (status === "completed" || status === "played" || status === "final") {
    return false;
  }

  if (status === "cancelled" || status === "postponed") {
    return false;
  }

  if (game.is_upcoming === false) return false;

  const gameDate = getGameDate(game);
  if (!gameDate) return true;

  const date = new Date(gameDate);
  if (Number.isNaN(date.getTime())) return true;

  return date.getTime() >= Date.now() - 1000 * 60 * 60 * 24;
}

function isRegistrationClosed(event: CalendarEvent) {
  if (!event.registration_deadline) return false;

  const deadline = new Date(event.registration_deadline);
  if (Number.isNaN(deadline.getTime())) return false;

  return Date.now() > deadline.getTime();
}

function makePairings(rows: Availability[]) {
  const unique = new Map<string, Availability>();

  for (const row of rows) {
    const key = `${row.participant_source}:${row.participant_id}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  const cleanRows = Array.from(unique.values());
  const pairings: [Availability, Availability][] = [];

  for (let i = 0; i < cleanRows.length; i += 2) {
    if (cleanRows[i] && cleanRows[i + 1]) {
      pairings.push([cleanRows[i], cleanRows[i + 1]]);
    }
  }

  return pairings;
}

function samePair(matchup: Matchup, pair: [Availability, Availability]) {
  const a = pair[0];
  const b = pair[1];

  const direct =
    matchup.player_one_source === a.participant_source &&
    matchup.player_one_id === a.participant_id &&
    matchup.player_two_source === b.participant_source &&
    matchup.player_two_id === b.participant_id;

  const reverse =
    matchup.player_one_source === b.participant_source &&
    matchup.player_one_id === b.participant_id &&
    matchup.player_two_source === a.participant_source &&
    matchup.player_two_id === a.participant_id;

  return direct || reverse;
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const upcomingGames = games.filter(isUpcomingGame);

  const weeklyAvailability = availability.filter(
    (row) => row.availability_type === "weekly" && row.status === "available"
  );

  const weeklyGroups = weekdays.map((day) => {
    const rows = weeklyAvailability.filter((row) => row.weekday === day);

    return {
      day,
      rows,
      pairings: makePairings(rows),
    };
  });

  const approvedMatchups = matchups.filter(
    (matchup) => matchup.matchup_status === "approved"
  );

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aTime = a.event_date ? new Date(a.event_date).getTime() : 0;
      const bTime = b.event_date ? new Date(b.event_date).getTime() : 0;

      return aTime - bTime;
    });
  }, [events]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoadingPage(true);
    setErrorMessage("");

    const [eventsResult, availabilityResult, matchupsResult, gamesResult] =
      await Promise.all([
        supabase
          .from("fackts_calendar_events")
          .select("*")
          .order("event_date", { ascending: true }),

        supabase
          .from("fackts_availability")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("fackts_matchups")
          .select("*")
          .neq("matchup_status", "deleted")
          .order("created_at", { ascending: false }),

        supabase.from("games").select("*").order("game_date", { ascending: true }),
      ]);

    const errors = [
      eventsResult.error?.message,
      availabilityResult.error?.message,
      matchupsResult.error?.message,
      gamesResult.error?.message,
    ].filter(Boolean);

    if (errors.length > 0) {
      setErrorMessage(errors.join(" | "));
    }

    setEvents((eventsResult.data ?? []) as CalendarEvent[]);
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setMatchups((matchupsResult.data ?? []) as Matchup[]);
    setGames((gamesResult.data ?? []) as Game[]);

    setLoadingPage(false);
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
      title: event.title ?? "",
      event_type: event.event_type ?? "court_takeover",
      event_date: getDatePart(event.event_date),
      start_time: getTimePart(event.event_date),
      end_date: getDatePart(event.end_date),
      end_time: getTimePart(event.end_date),
      venue: event.venue ?? "",
      location: event.location ?? "",
      poster_url: event.poster_url ?? "",
      registration_deadline_date: getDatePart(event.registration_deadline),
      registration_deadline_time: getTimePart(event.registration_deadline),
      notes: event.notes ?? "",
      is_public: event.is_public ?? true,
      is_active: event.is_active ?? true,
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

    if (error) throw new Error(error.message);

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
        event_type: form.event_type,
        event_date: combineDateTime(form.event_date, form.start_time),
        end_date: combineDateTime(
          form.end_date || form.event_date,
          form.end_time
        ),
        venue: form.venue.trim() || null,
        location: form.location.trim() || null,
        poster_url: posterUrl || null,
        registration_deadline: combineDateTime(
          form.registration_deadline_date,
          form.registration_deadline_time
        ),
        notes: form.notes.trim() || null,
        is_public: form.is_public,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (!payload.title) {
        throw new Error("Event title is required.");
      }

      if (editingId) {
        const { error } = await supabase
          .from("fackts_calendar_events")
          .update(payload)
          .eq("id", editingId);

        if (error) throw new Error(error.message);

        setMessage("Calendar event updated successfully.");
      } else {
        const { error } = await supabase
          .from("fackts_calendar_events")
          .insert(payload);

        if (error) throw new Error(error.message);

        setMessage("Calendar event added successfully.");
      }

      resetForm();
      await loadAdminData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    const confirmed = window.confirm("Delete this calendar event?");

    if (!confirmed) return;

    setWorkingId(eventId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("fackts_calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      setErrorMessage(error.message);
      setWorkingId(null);
      return;
    }

    setMessage("Calendar event deleted.");
    setWorkingId(null);
    await loadAdminData();
  }

  async function closeRegistration(eventId: string) {
    const confirmed = window.confirm("Close registration for this event now?");

    if (!confirmed) return;

    setWorkingId(eventId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("fackts_calendar_events")
      .update({
        registration_deadline: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (error) {
      setErrorMessage(error.message);
      setWorkingId(null);
      return;
    }

    setMessage("Registration closed.");
    setWorkingId(null);
    await loadAdminData();
  }

 async function approveMatchup(day: string, pair: [Availability, Availability]) {
  const existing = matchups.find(
    (matchup) => matchup.matchup_status !== "deleted" && samePair(matchup, pair)
  );

  if (existing) {
    setMessage("This matchup already exists.");
    return;
  }

  const workingKey = `${day}-${pair[0].id}-${pair[1].id}`;

  setWorkingId(workingKey);
  setMessage("");
  setErrorMessage("");

  const now = new Date().toISOString();

  const { data: matchupData, error: matchupError } = await supabase
    .from("fackts_matchups")
    .insert({
      matchup_status: "approved",
      matchup_source: "availability",
      event_id: "",
      weekday: day,
      player_one_source: pair[0].participant_source,
      player_one_id: pair[0].participant_id,
      player_one_name: pair[0].participant_name,
      player_two_source: pair[1].participant_source,
      player_two_id: pair[1].participant_id,
      player_two_name: pair[1].participant_name,
      scheduled_time: pair[0].preferred_time || pair[1].preferred_time || null,
      venue: "",
      notes: "Approved from weekly availability pool.",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (matchupError || !matchupData) {
    setErrorMessage(matchupError?.message || "Failed to approve matchup.");
    setWorkingId(null);
    return;
  }

  const oneOnOnePayload: any = {
    calendar_matchup_id: matchupData.id,

    match_title: `${pair[0].participant_name} vs ${pair[1].participant_name}`,
    match_type: "1v1",
    court: null,

    participant_type:
      pair[0].participant_source === "guest_hoopers"
        ? "guest_hooper"
        : "fackts_player",
    fackts_player_id:
      pair[0].participant_source === "players" ? pair[0].participant_id : null,
    guest_hooper_id:
      pair[0].participant_source === "guest_hoopers"
        ? pair[0].participant_id
        : null,
    participant_name: pair[0].participant_name,

    opponent_type:
      pair[1].participant_source === "guest_hoopers"
        ? "guest_hooper"
        : "fackts_player",
    opponent_player_id:
      pair[1].participant_source === "players" ? pair[1].participant_id : null,
    opponent_guest_hooper_id:
      pair[1].participant_source === "guest_hoopers"
        ? pair[1].participant_id
        : null,
    opponent_name: pair[1].participant_name,

    match_date: null,
    venue: null,
    location: null,

    points_scored: 0,
    points_allowed: 0,
    result: "pending",
    status: "upcoming",

    notes: `Approved from calendar availability for ${day}. Admin should update poster, date, venue, match number, and final details.`,
    poster_url: null,
    video_url: null,
    highlight_url: null,

    created_at: now,
    updated_at: now,
  };

  const { data: oneOnOneData, error: oneOnOneError } = await supabase
    .from("guest_one_on_one_stats")
    .insert(oneOnOnePayload)
    .select("id")
    .single();

  if (oneOnOneError || !oneOnOneData) {
    await supabase
      .from("fackts_matchups")
      .update({
        matchup_status: "deleted",
        updated_at: now,
      })
      .eq("id", matchupData.id);

    setErrorMessage(
      oneOnOneError?.message ||
        "Approved matchup, but failed to create 1v1 battle."
    );
    setWorkingId(null);
    return;
  }

  await supabase
    .from("fackts_matchups")
    .update({
      one_on_one_stat_id: oneOnOneData.id,
      updated_at: now,
    })
    .eq("id", matchupData.id);

  setMessage("1v1 matchup approved and added as a pending battle.");
  setWorkingId(null);
  await loadAdminData();
}

  async function deleteMatchup(matchupId: string) {
  const confirmed = window.confirm(
    "Delete this matchup? If it came from calendar approval, the pending 1v1 battle will also be removed."
  );

  if (!confirmed) return;

  setWorkingId(matchupId);
  setMessage("");
  setErrorMessage("");

  const matchup = matchups.find((item) => item.id === matchupId) as any;

  if (matchup?.one_on_one_stat_id) {
    await supabase
      .from("guest_one_on_one_stats")
      .delete()
      .eq("id", matchup.one_on_one_stat_id)
      .eq("status", "upcoming");
  }

  const { error } = await supabase
    .from("fackts_matchups")
    .update({
      matchup_status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchupId);

  if (error) {
    setErrorMessage(error.message);
    setWorkingId(null);
    return;
  }

  setMessage("Matchup deleted.");
  setWorkingId(null);
  await loadAdminData();
}

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Admin Control Room
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Calendar Command Centre
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                Add public calendar events, view player availability, approve
                1v1 matchups, close registrations, and delete wrong matchups.
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

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label="Events" value={String(events.length)} />
            <StatCard label="Availability" value={String(availability.length)} />
            <StatCard label="Approved 1v1" value={String(approvedMatchups.length)} />
            <StatCard label="Upcoming Games" value={String(upcomingGames.length)} />
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
                {editingId ? "Update Calendar Event" : "Add Calendar Event"}
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
                placeholder="e.g. Court Takeover"
                className="input"
              />
            </Field>

            <Field label="Event Type">
              <select
                name="event_type"
                value={form.event_type}
                onChange={handleChange}
                className="input"
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Date">
                <input
                  type="date"
                  name="event_date"
                  value={form.event_date}
                  onChange={handleChange}
                  className="input"
                />
              </Field>

              <Field label="Start Time">
                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  onChange={handleChange}
                  className="input"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="End Date">
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  className="input"
                />
              </Field>

              <Field label="End Time">
                <input
                  type="time"
                  name="end_time"
                  value={form.end_time}
                  onChange={handleChange}
                  className="input"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue">
                <input
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="e.g. JKUAT Basketball Court"
                  className="input"
                />
              </Field>

              <Field label="Location">
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. JKUAT"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Deadline Date">
                <input
                  type="date"
                  name="registration_deadline_date"
                  value={form.registration_deadline_date}
                  onChange={handleChange}
                  className="input"
                />
              </Field>

              <Field label="Deadline Time">
                <input
                  type="time"
                  name="registration_deadline_time"
                  value={form.registration_deadline_time}
                  onChange={handleChange}
                  className="input"
                />
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

            <Field label="Poster URL">
              <input
                name="poster_url"
                value={form.poster_url}
                onChange={handleChange}
                placeholder="Poster URL"
                className="input"
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

            <Field label="Notes">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Short action notes for availability. Keep full storytelling on Events page."
                className="input resize-none"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-zinc-300">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={form.is_public}
                  onChange={handleChange}
                  className="h-4 w-4 accent-orange-500"
                />
                Public
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-zinc-300">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 accent-orange-500"
                />
                Active
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Event Changes"
                  : "Add Calendar Event"}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                  Calendar Events
                </p>

                <h2 className="mt-1 text-2xl font-black">Existing Events</h2>
              </div>

              <button
                type="button"
                onClick={loadAdminData}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
              >
                Refresh
              </button>
            </div>

            {loadingPage ? (
              <EmptyPanel text="Loading calendar command centre..." />
            ) : sortedEvents.length === 0 ? (
              <EmptyPanel text="No calendar events added yet." />
            ) : (
              <div className="space-y-4">
                {sortedEvents.map((event) => {
                  const eventResponses = availability.filter(
                    (row) =>
                      row.availability_type === "event" &&
                      row.event_id === event.id
                  );

                  const available = eventResponses.filter(
                    (row) => row.status === "available"
                  );

                  const notAvailable = eventResponses.filter(
                    (row) => row.status === "not_available"
                  );

                  return (
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
                          <Badge text={formatEventType(event.event_type)} tone="orange" />
                          <Badge
                            text={event.is_public ? "Public" : "Hidden"}
                            tone={event.is_public ? "green" : "red"}
                          />
                          <Badge
                            text={event.is_active ? "Active" : "Inactive"}
                            tone={event.is_active ? "green" : "red"}
                          />
                          <Badge
                            text={isRegistrationClosed(event) ? "Closed" : "Open"}
                            tone={isRegistrationClosed(event) ? "red" : "green"}
                          />
                        </div>

                        <h3 className="text-xl font-black text-white">
                          {event.title}
                        </h3>

                        <p className="mt-2 text-sm text-zinc-500">
                          {formatDate(event.event_date)}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          {getEventLocation(event)}
                        </p>

                        <p className="mt-1 text-xs font-bold text-zinc-500">
                          Deadline: {formatDeadline(event.registration_deadline)}
                        </p>

                        {event.notes ? (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                            {event.notes}
                          </p>
                        ) : null}

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <MiniPanel
                            label="Available"
                            value={String(available.length)}
                            names={available.map((row) => row.participant_name)}
                          />

                          <MiniPanel
                            label="Not Available"
                            value={String(notAvailable.length)}
                            names={notAvailable.map(
                              (row) => row.participant_name
                            )}
                          />
                        </div>

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
                            onClick={() => closeRegistration(event.id)}
                            disabled={workingId === event.id}
                            className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-yellow-200 transition hover:bg-yellow-500/20 disabled:opacity-60"
                          >
                            Close Registration
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteEvent(event.id)}
                            disabled={workingId === event.id}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
              1v1 Matchup Approval
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Suggested Same-Day Pairings
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              These are created from players or guest hoopers who picked the same
              weekday. Approving makes them official.
            </p>

            <div className="mt-5 space-y-4">
              {weeklyGroups.map((group) => (
                <div
                  key={group.day}
                  className="rounded-2xl border border-white/10 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-black">{group.day}</h3>
                    <Badge text={`${group.rows.length} available`} tone="orange" />
                  </div>

                  {group.rows.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.rows.map((row) => (
                        <span
                          key={row.id}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300"
                        >
                          {row.participant_name}
                          {row.preferred_time ? ` • ${row.preferred_time}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600">
                      No availability on this day.
                    </p>
                  )}

                  {group.pairings.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {group.pairings.map((pair, index) => {
                        const existing = matchups.find(
                          (matchup) =>
                            matchup.matchup_status !== "deleted" &&
                            samePair(matchup, pair)
                        );

                        const workingKey = `${group.day}-${pair[0].id}-${pair[1].id}`;

                        return (
                          <div
                            key={workingKey}
                            className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="text-sm font-black">
                              {pair[0].participant_name}{" "}
                              <span className="text-orange-300">vs</span>{" "}
                              {pair[1].participant_name}
                            </div>

                            {existing ? (
                              <Badge
                                text={existing.matchup_status}
                                tone={
                                  existing.matchup_status === "approved"
                                    ? "green"
                                    : "orange"
                                }
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => approveMatchup(group.day, pair)}
                                disabled={workingId === workingKey}
                                className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400 disabled:opacity-60"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
              Approved Battles
            </p>

            <h2 className="mt-1 text-2xl font-black">Official 1v1 Matchups</h2>

            {approvedMatchups.length === 0 ? (
              <EmptyPanel text="No approved matchups yet." />
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {approvedMatchups.map((matchup) => (
                  <div
                    key={matchup.id}
                    className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4"
                  >
                    <Badge text="Approved" tone="green" />

                    <div className="mt-3 text-lg font-black">
                      {matchup.player_one_name}{" "}
                      <span className="text-orange-300">vs</span>{" "}
                      {matchup.player_two_name}
                    </div>

                    <p className="mt-2 text-sm text-zinc-400">
                      {matchup.scheduled_date
                        ? formatDate(matchup.scheduled_date)
                        : matchup.weekday || "Date TBA"}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {matchup.venue || "Venue TBA"}
                    </p>

                    <button
                      type="button"
                      onClick={() => deleteMatchup(matchup.id)}
                      disabled={workingId === matchup.id}
                      className="mt-4 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                    >
                      Delete Matchup
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
              Game Responses
            </p>

            <h2 className="mt-1 text-2xl font-black">Upcoming Game Availability</h2>

            {upcomingGames.length === 0 ? (
              <EmptyPanel text="No upcoming games found." />
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {upcomingGames.map((game) => {
                  const responses = availability.filter(
                    (row) =>
                      row.availability_type === "game" && row.game_id === game.id
                  );

                  const available = responses.filter(
                    (row) => row.status === "available"
                  );

                  const notAvailable = responses.filter(
                    (row) => row.status === "not_available"
                  );

                  return (
                    <div
                      key={game.id}
                      className="rounded-2xl border border-white/10 bg-black p-4"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                        FACKTS Game
                      </div>

                      <h3 className="mt-1 text-lg font-black">
                        FACKTS vs {getOpponent(game)}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {getGameTitle(game)}
                      </p>

                      <p className="mt-2 text-sm text-zinc-500">
                        {formatDate(getGameDate(game))}
                      </p>

                      <p className="mt-1 text-sm text-zinc-600">
                        {getGameLocation(game)}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MiniPanel
                          label="Available"
                          value={String(available.length)}
                          names={available.map((row) => row.participant_name)}
                        />

                        <MiniPanel
                          label="Not Available"
                          value={String(notAvailable.length)}
                          names={notAvailable.map(
                            (row) => row.participant_name
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
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

function Badge({ text, tone }: { text: string; tone: "orange" | "green" | "red" }) {
  const className =
    tone === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "red"
        ? "border-red-500/30 bg-red-500/10 text-red-200"
        : "border-orange-500/30 bg-orange-500/10 text-orange-200";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${className}`}
    >
      {text}
    </span>
  );
}

function MiniPanel({
  label,
  value,
  names,
}: {
  label: string;
  value: string;
  names: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-orange-300">{value}</div>

      {names.length > 0 ? (
        <div className="mt-2 space-y-1">
          {names.slice(0, 5).map((name) => (
            <div key={name} className="truncate text-xs text-zinc-400">
              {name}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xs text-zinc-600">No responses yet</div>
      )}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
      {text}
    </div>
  );
}