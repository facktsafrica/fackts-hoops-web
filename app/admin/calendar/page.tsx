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
};

type Availability = {
  id: string;
  participant_source: string;
  participant_id: string;
  participant_name: string;
  participant_email?: string | null;
  participant_phone?: string | null;
  availability_type: "weekly" | "game" | "event";
  availability_date?: string | null;
  week_start_date?: string | null;
  weekday: string;
  game_id: string;
  event_id: string;
  status: "available" | "not_available";
  preferred_time?: string | null;
  preferred_court?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Matchup = {
  id: string;
  matchup_status: "suggested" | "approved" | "rejected" | "deleted";
  matchup_source: "availability" | "manual" | "player_request";
  event_id: string;
  weekday: string;
  player_one_source: string;
  player_one_id: string;
  player_one_name: string;
  player_one_email?: string | null;
  player_one_phone?: string | null;
  player_two_source: string;
  player_two_id: string;
  player_two_name: string;
  player_two_email?: string | null;
  player_two_phone?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  venue?: string | null;
  notes?: string | null;
  one_on_one_stat_id?: string | null;
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

type NotificationRow = {
  id: string;
  recipient_role: "admin" | "player";
  recipient_source: string;
  recipient_id: string;
  recipient_name: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  title: string;
  body?: string | null;
  notification_type: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
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

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400";

const dateInputClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 [color-scheme:dark] focus:border-orange-400 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert";

const eventTypes = [
  { label: "Court Takeover", value: "court_takeover" },
  { label: "General Event", value: "event" },
  { label: "Training", value: "training" },
  { label: "Media Day", value: "media_day" },
  { label: "Other", value: "other" },
];

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function kenyaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  return new Date(`${value}T12:00:00+03:00`);
}

function getWeekStartDateString(dateValue: string) {
  const date = dateFromInput(dateValue);

  if (Number.isNaN(date.getTime())) return dateValue;

  const day = date.getDay();
  const diff = (day + 6) % 7;

  date.setDate(date.getDate() - diff);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayNumber = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${dayNumber}`;
}

function getCurrentWeekStart() {
  return getWeekStartDateString(kenyaDateString());
}

function getWeekdayName(dateValue: string) {
  const date = dateFromInput(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    timeZone: "Africa/Nairobi",
  });
}

function getAvailabilityDate(row: Availability) {
  return row.availability_date || row.created_at?.slice(0, 10) || kenyaDateString();
}

function combineDateTime(date: string, time: string) {
  if (!date) return null;
  return `${date}T${time || "00:00"}:00+03:00`;
}

function getDatePart(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
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
    timeZone: "Africa/Nairobi",
  });
}

function formatDateLabel(value?: string | null) {
  if (!value) return "DATE TBA";

  const date = dateFromInput(value.slice(0, 10));

  if (Number.isNaN(date.getTime())) return value.toUpperCase();

  return date
    .toLocaleDateString("en-KE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(",", "")
    .toUpperCase();
}

function getGameDate(game: Game) {
  return game.game_date || game.date || null;
}

function getOpponent(game: Game) {
  return game.opponent || game.opponent_name || game.team_name || "Opponent TBA";
}

function getGameLocation(game: Game) {
  return [game.venue, game.location].filter(Boolean).join(" • ") || "Venue TBA";
}

function isUpcomingGame(game: Game) {
  const status = normalize(game.status);

  if (["completed", "played", "final", "cancelled", "postponed"].includes(status)) {
    return false;
  }

  if (game.is_upcoming === false) return false;

  const gameDate = getGameDate(game);

  if (!gameDate) return true;

  const date = new Date(gameDate);

  if (Number.isNaN(date.getTime())) return true;

  return date.getTime() >= Date.now() - 1000 * 60 * 60 * 24;
}

function makePairings(rows: Availability[]) {
  const unique = new Map<string, Availability>();

  for (const row of rows) {
    const key = `${row.participant_source}:${row.participant_id}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  const cleanRows = Array.from(unique.values());
  const pairings: [Availability, Availability][] = [];

  for (let i = 0; i < cleanRows.length; i++) {
    for (let j = i + 1; j < cleanRows.length; j++) {
      pairings.push([cleanRows[i], cleanRows[j]]);
    }
  }

  return pairings;
}

function samePair(
  matchup: Matchup,
  pair: [Availability, Availability],
  dateValue?: string
) {
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

  const samePeople = direct || reverse;

  if (!samePeople) return false;

  if (!dateValue) return true;

  return matchup.scheduled_date?.slice(0, 10) === dateValue;
}

function cleanEmail(value?: string | null) {
  const email = String(value ?? "").trim();
  return email.includes("@") ? email : "";
}

function emailList(...values: Array<string | null | undefined>) {
  return values
    .map((value) => cleanEmail(value))
    .filter(Boolean);
}

async function sendEmailNotification(payload: {
  to?: string | string[] | "admin";
  subject: string;
  text: string;
  html?: string;
}) {
  try {
    await fetch("/api/notify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // In-app notifications still work even if email fails.
  }
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [form, setForm] = useState<EventForm>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const upcomingGames = games.filter(isUpcomingGame);
  const activeWeekStart = getCurrentWeekStart();

  const activeAvailability = availability
    .filter((row) => row.availability_type === "weekly")
    .filter((row) => row.status === "available")
    .filter((row) => getWeekStartDateString(getAvailabilityDate(row)) >= activeWeekStart)
    .sort((a, b) => getAvailabilityDate(a).localeCompare(getAvailabilityDate(b)));

  const availabilityGroups = useMemo(() => {
    const map = new Map<string, Availability[]>();

    for (const row of activeAvailability) {
      const dateKey = getAvailabilityDate(row);
      const existing = map.get(dateKey) ?? [];
      existing.push(row);
      map.set(dateKey, existing);
    }

    return Array.from(map.entries()).map(([date, rows]) => ({
      date,
      weekday: getWeekdayName(date),
      rows,
      pairings: makePairings(rows),
    }));
  }, [activeAvailability]);

  const playerRequests = matchups.filter(
    (matchup) =>
      matchup.matchup_source === "player_request" &&
      matchup.matchup_status === "suggested"
  );

  const approvedMatchups = matchups.filter(
    (matchup) => matchup.matchup_status === "approved"
  );

  const unreadAdminNotifications = notifications.filter((note) => !note.is_read);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoadingPage(true);
    setErrorMessage("");

    const [eventsResult, availabilityResult, matchupsResult, gamesResult, notesResult] =
      await Promise.all([
        supabase
          .from("fackts_calendar_events")
          .select("*")
          .order("event_date", { ascending: true }),

        supabase
          .from("fackts_availability")
          .select("*")
          .order("availability_date", { ascending: true }),

        supabase
          .from("fackts_matchups")
          .select("*")
          .neq("matchup_status", "deleted")
          .order("created_at", { ascending: false }),

        supabase.from("games").select("*").order("game_date", { ascending: true }),

        supabase
          .from("fackts_notifications")
          .select("*")
          .eq("recipient_role", "admin")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

    const errors = [
      eventsResult.error?.message,
      availabilityResult.error?.message,
      matchupsResult.error?.message,
      gamesResult.error?.message,
      notesResult.error?.message,
    ].filter(Boolean);

    if (errors.length > 0) {
      setErrorMessage(errors.join(" | "));
    }

    setEvents((eventsResult.data ?? []) as CalendarEvent[]);
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setMatchups((matchupsResult.data ?? []) as Matchup[]);
    setGames((gamesResult.data ?? []) as Game[]);
    setNotifications((notesResult.data ?? []) as NotificationRow[]);

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

    window.scrollTo({ top: 0, behavior: "smooth" });
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
        end_date: combineDateTime(form.end_date || form.event_date, form.end_time),
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

      if (!payload.title) throw new Error("Event title is required.");

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

  async function markNotificationRead(notificationId: string) {
    await supabase
      .from("fackts_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    await loadAdminData();
  }

  async function approveRequestedMatchup(matchup: Matchup) {
    setWorkingId(matchup.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("fackts_matchups")
      .update({
        matchup_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchup.id);

    if (error) {
      setErrorMessage(error.message);
      setWorkingId(null);
      return;
    }

    const recipients = emailList(matchup.player_one_email, matchup.player_two_email);

    if (recipients.length > 0) {
      await sendEmailNotification({
        to: recipients,
        subject: `FACKTS 1v1 Approved: ${matchup.player_one_name} vs ${matchup.player_two_name}`,
        text: `Your FACKTS 1v1 matchup has been approved.

Matchup: ${matchup.player_one_name} vs ${matchup.player_two_name}
Date: ${formatDateLabel(matchup.scheduled_date?.slice(0, 10))}
Time: ${matchup.scheduled_time || "Time TBA"}
Court: ${matchup.venue || "Court TBA"}

Check the FACKTS Hoops app for updates.`,
        html: `<p>Your FACKTS 1v1 matchup has been approved.</p>
<p><strong>Matchup:</strong> ${matchup.player_one_name} vs ${matchup.player_two_name}</p>
<p><strong>Date:</strong> ${formatDateLabel(matchup.scheduled_date?.slice(0, 10))}</p>
<p><strong>Time:</strong> ${matchup.scheduled_time || "Time TBA"}</p>
<p><strong>Court:</strong> ${matchup.venue || "Court TBA"}</p>
<p>Check the FACKTS Hoops app for updates.</p>`,
      });
    }

    setMessage("Player request approved. Player email notification sent if email exists.");
    setWorkingId(null);
    await loadAdminData();
  }

  async function rejectRequestedMatchup(matchupId: string) {
    setWorkingId(matchupId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("fackts_matchups")
      .update({
        matchup_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchupId);

    if (error) {
      setErrorMessage(error.message);
      setWorkingId(null);
      return;
    }

    setMessage("Player request rejected.");
    setWorkingId(null);
    await loadAdminData();
  }

  async function approveMatchup(dateValue: string, pair: [Availability, Availability]) {
    const existing = matchups.find(
      (matchup) =>
        matchup.matchup_status !== "deleted" && samePair(matchup, pair, dateValue)
    );

    if (existing) {
      setMessage("This matchup already exists for this date.");
      return;
    }

    const workingKey = `${dateValue}-${pair[0].id}-${pair[1].id}`;
    const preferredCourt = pair[0].preferred_court || pair[1].preferred_court || "";
    const preferredTime = pair[0].preferred_time || pair[1].preferred_time || null;

    setWorkingId(workingKey);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("fackts_matchups").insert({
      matchup_status: "approved",
      matchup_source: "availability",
      event_id: "",
      weekday: getWeekdayName(dateValue),
      scheduled_date: `${dateValue}T12:00:00+03:00`,
      player_one_source: pair[0].participant_source,
      player_one_id: pair[0].participant_id,
      player_one_name: pair[0].participant_name,
      player_one_email: pair[0].participant_email || null,
      player_one_phone: pair[0].participant_phone || null,
      player_two_source: pair[1].participant_source,
      player_two_id: pair[1].participant_id,
      player_two_name: pair[1].participant_name,
      player_two_email: pair[1].participant_email || null,
      player_two_phone: pair[1].participant_phone || null,
      scheduled_time: preferredTime,
      venue: preferredCourt,
      notes:
        "Approved from calendar availability. Admin should update the pending 1v1 battle with poster, venue, date, and match details.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setErrorMessage(error.message);
      setWorkingId(null);
      return;
    }

    const recipients = emailList(pair[0].participant_email, pair[1].participant_email);

    if (recipients.length > 0) {
      await sendEmailNotification({
        to: recipients,
        subject: `FACKTS 1v1 Approved: ${pair[0].participant_name} vs ${pair[1].participant_name}`,
        text: `Your FACKTS 1v1 matchup has been approved.

Matchup: ${pair[0].participant_name} vs ${pair[1].participant_name}
Date: ${formatDateLabel(dateValue)}
Time: ${preferredTime || "Time TBA"}
Court: ${preferredCourt || "Court TBA"}

Check the FACKTS Hoops app for updates.`,
        html: `<p>Your FACKTS 1v1 matchup has been approved.</p>
<p><strong>Matchup:</strong> ${pair[0].participant_name} vs ${pair[1].participant_name}</p>
<p><strong>Date:</strong> ${formatDateLabel(dateValue)}</p>
<p><strong>Time:</strong> ${preferredTime || "Time TBA"}</p>
<p><strong>Court:</strong> ${preferredCourt || "Court TBA"}</p>
<p>Check the FACKTS Hoops app for updates.</p>`,
      });
    }

    setMessage("1v1 matchup approved. Player email notification sent if emails exist.");
    setWorkingId(null);
    await loadAdminData();
  }

  async function deleteMatchup(matchupId: string) {
    const confirmed = window.confirm("Delete this matchup?");

    if (!confirmed) return;

    setWorkingId(matchupId);
    setMessage("");
    setErrorMessage("");

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
                See alerts, approve player-requested matchups, choose same-date
                pairings, and send approval notifications.
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

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            <StatCard label="Alerts" value={String(unreadAdminNotifications.length)} />
            <StatCard label="Player Requests" value={String(playerRequests.length)} />
            <StatCard label="Date Groups" value={String(availabilityGroups.length)} />
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
                Cancel
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
                className={inputClass}
              />
            </Field>

            <Field label="Event Type">
              <select
                name="event_type"
                value={form.event_type}
                onChange={handleChange}
                className={inputClass}
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
                  className={dateInputClass}
                />
              </Field>

              <Field label="Start Time">
                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  onChange={handleChange}
                  className={dateInputClass}
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
                  className={dateInputClass}
                />
              </Field>

              <Field label="End Time">
                <input
                  type="time"
                  name="end_time"
                  value={form.end_time}
                  onChange={handleChange}
                  className={dateInputClass}
                />
              </Field>
            </div>

            <Field label="Venue">
              <input
                name="venue"
                value={form.venue}
                onChange={handleChange}
                placeholder="e.g. JKUAT Basketball Court"
                className={inputClass}
              />
            </Field>

            <Field label="Location">
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. JKUAT"
                className={inputClass}
              />
            </Field>

            <Field label="Event Logo / Poster URL">
              <input
                name="poster_url"
                value={form.poster_url}
                onChange={handleChange}
                placeholder="Court Takeover logo or poster URL"
                className={inputClass}
              />
            </Field>

            <Field label="Poster Upload">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPosterFile(event.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-black file:text-black"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Deadline Date">
                <input
                  type="date"
                  name="registration_deadline_date"
                  value={form.registration_deadline_date}
                  onChange={handleChange}
                  className={dateInputClass}
                />
              </Field>

              <Field label="Deadline Time">
                <input
                  type="time"
                  name="registration_deadline_time"
                  value={form.registration_deadline_time}
                  onChange={handleChange}
                  className={dateInputClass}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Short notes for availability."
                className={`${inputClass} resize-none`}
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
          <AdminSection eyebrow="Notifications" title="Admin Alerts">
            {notifications.length === 0 ? (
              <EmptyPanel text="No admin notifications yet." />
            ) : (
              <div className="mt-5 space-y-3">
                {notifications.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-2xl border p-4 ${
                      note.is_read
                        ? "border-white/10 bg-black"
                        : "border-orange-500/30 bg-orange-500/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black">{note.title}</div>
                        {note.body ? (
                          <p className="mt-1 text-sm leading-6 text-zinc-400">
                            {note.body}
                          </p>
                        ) : null}
                      </div>

                      {!note.is_read ? (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(note.id)}
                          className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase text-black"
                        >
                          Mark Read
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection eyebrow="Player Requests" title="Requested 1v1 Matchups">
            {playerRequests.length === 0 ? (
              <EmptyPanel text="No player-requested matchups yet." />
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {playerRequests.map((matchup) => (
                  <div
                    key={matchup.id}
                    className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4"
                  >
                    <Badge text="Player Request" tone="orange" />

                    <div className="mt-3 text-lg font-black">
                      {matchup.player_one_name}{" "}
                      <span className="text-blue-300">vs</span>{" "}
                      {matchup.player_two_name}
                    </div>

                    <p className="mt-2 text-sm text-zinc-400">
                      {formatDateLabel(matchup.scheduled_date?.slice(0, 10))}{" "}
                      {matchup.scheduled_time ? `• ${matchup.scheduled_time}` : ""}
                      {matchup.venue ? ` • ${matchup.venue}` : ""}
                    </p>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs leading-5 text-zinc-400">
                      <div>
                        <span className="font-black text-zinc-200">
                          {matchup.player_one_name}
                        </span>{" "}
                        • {matchup.player_one_phone || "No phone"} •{" "}
                        {matchup.player_one_email || "No email"}
                      </div>
                      <div>
                        <span className="font-black text-zinc-200">
                          {matchup.player_two_name}
                        </span>{" "}
                        • {matchup.player_two_phone || "No phone"} •{" "}
                        {matchup.player_two_email || "No email"}
                      </div>
                    </div>

                    {matchup.notes ? (
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        {matchup.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => approveRequestedMatchup(matchup)}
                        disabled={workingId === matchup.id}
                        className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400 disabled:opacity-60"
                      >
                        {workingId === matchup.id ? "Approving..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        onClick={() => rejectRequestedMatchup(matchup.id)}
                        disabled={workingId === matchup.id}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection eyebrow="Availability Approval" title="Choose Same-Date Matchups">
            <p className="mt-2 text-sm text-zinc-500">
              Players can choose any date. Old weeks clear from this active board
              after the week ends.
            </p>

            <div className="mt-5 space-y-4">
              {availabilityGroups.length === 0 ? (
                <EmptyPanel text="No active availability yet." />
              ) : (
                availabilityGroups.map((group) => (
                  <div
                    key={group.date}
                    className="rounded-2xl border border-white/10 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">
                          {formatDateLabel(group.date)}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          {group.weekday}
                        </p>
                      </div>

                      <Badge text={`${group.rows.length} available`} tone="orange" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.rows.map((row) => (
                        <span
                          key={row.id}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300"
                        >
                          {row.participant_name}
                          {row.preferred_time ? ` • ${row.preferred_time}` : ""}
                          {row.preferred_court ? ` • ${row.preferred_court}` : ""}
                        </span>
                      ))}
                    </div>

                    {group.pairings.length > 0 ? (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {group.pairings.map((pair) => {
                          const existing = matchups.find(
                            (matchup) =>
                              matchup.matchup_status !== "deleted" &&
                              samePair(matchup, pair, group.date)
                          );

                          const workingKey = `${group.date}-${pair[0].id}-${pair[1].id}`;
                          const preferredCourt =
                            pair[0].preferred_court || pair[1].preferred_court || "";
                          const preferredTime =
                            pair[0].preferred_time || pair[1].preferred_time || "";

                          return (
                            <div
                              key={workingKey}
                              className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <div className="text-sm font-black">
                                  {pair[0].participant_name}{" "}
                                  <span className="text-orange-300">vs</span>{" "}
                                  {pair[1].participant_name}
                                </div>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {preferredTime || "Time TBA"}
                                  {preferredCourt ? ` • ${preferredCourt}` : ""}
                                </p>

                                <p className="mt-1 text-[11px] leading-4 text-zinc-600">
                                  {pair[0].participant_phone || "No phone"} •{" "}
                                  {pair[0].participant_email || "No email"}
                                  <br />
                                  {pair[1].participant_phone || "No phone"} •{" "}
                                  {pair[1].participant_email || "No email"}
                                </p>
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
                                  onClick={() => approveMatchup(group.date, pair)}
                                  disabled={workingId === workingKey}
                                  className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400 disabled:opacity-60"
                                >
                                  {workingId === workingKey ? "Approving..." : "Approve"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </AdminSection>

          <AdminSection eyebrow="Approved Battles" title="Official 1v1 Matchups">
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
                      {formatDate(matchup.scheduled_date)}
                      {matchup.scheduled_time ? ` • ${matchup.scheduled_time}` : ""}
                      {matchup.venue ? ` • ${matchup.venue}` : ""}
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
          </AdminSection>

          <AdminSection eyebrow="Game Responses" title="Upcoming Game Availability">
            {upcomingGames.length === 0 ? (
              <EmptyPanel text="No upcoming games found." />
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {upcomingGames.map((game) => (
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

                    <p className="mt-2 text-sm text-zinc-500">
                      {formatDate(getGameDate(game))}
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      {getGameLocation(game)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>
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

function AdminSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl font-black">{title}</h2>

      {children}
    </section>
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

function Badge({
  text,
  tone,
}: {
  text: string;
  tone: "orange" | "green" | "red";
}) {
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

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
      {text}
    </div>
  );
}