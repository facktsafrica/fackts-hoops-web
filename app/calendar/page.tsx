"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const FACKTS_LOGO = "/fackts-hoops-logo.png";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400";

const selectClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400";

const DEFAULT_COURTS = [
  "JKUAT Basketball Court",
  "MISC Kasarani",
  "Kasarani Academy of Sports Court",
  "St. Peter’s ACK Kahawa Sukari Court",
  "Umoja 2 Court",
];

type Person = {
  id: string;
  source: "players" | "guest_hoopers";
  full_name: string;
  nickname?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  label: string;
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
  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
  opponent_logo_url?: string | null;
  calendar_card_image_url?: string | null;
};

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

type EmailResult = {
  ok: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
};

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isGuestRole(person: any) {
  return normalize(person.role).includes("guest");
}

function isProspectRole(person: any) {
  return normalize(person.role).includes("prospect");
}

function displayPersonName(person: any) {
  return person.full_name || person.name || person.nickname || "Hooper";
}

function getPersonKey(person: Person) {
  return `${person.source}:${person.id}`;
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

function getWeekdayName(dateValue: string) {
  const date = dateFromInput(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    timeZone: "Africa/Nairobi",
  });
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

function formatShortTime(value?: string | null) {
  if (!value) return "TIME TBA";

  if (/^\d{1,2}:\d{2}/.test(value)) return value.toUpperCase();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value.toUpperCase();

  return date
    .toLocaleTimeString("en-KE", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    })
    .replace(":", ".")
    .replace(" ", "")
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

function getGamePoster(game: Game) {
  return (
    game.calendar_card_image_url ||
    game.opponent_logo_url ||
    game.poster_url ||
    game.game_poster_url ||
    game.image_url ||
    ""
  );
}

function getEventLocation(event: CalendarEvent) {
  return [event.venue, event.location].filter(Boolean).join(" • ") || "Venue TBA";
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

function isUpcomingEvent(event: CalendarEvent) {
  if (event.is_public === false || event.is_active === false) return false;

  if (!event.event_date) return true;

  const date = new Date(event.event_date);

  if (Number.isNaN(date.getTime())) return true;

  return date.getTime() >= Date.now() - 1000 * 60 * 60 * 24;
}

function gameDeadlineClosed(game: Game) {
  const gameDate = getGameDate(game);

  if (!gameDate) return false;

  const date = new Date(gameDate);

  if (Number.isNaN(date.getTime())) return false;

  const deadline = new Date(date.getTime() - 1000 * 60 * 60 * 24);

  return Date.now() > deadline.getTime();
}

function eventDeadlineClosed(event: CalendarEvent) {
  if (!event.registration_deadline) return false;

  const deadline = new Date(event.registration_deadline);

  if (Number.isNaN(deadline.getTime())) return false;

  return Date.now() > deadline.getTime();
}

function getAvailabilityDate(row: Availability) {
  return row.availability_date || row.created_at?.slice(0, 10) || kenyaDateString();
}

function sameMatchupPeople(
  matchup: Matchup,
  playerOne: Person,
  playerTwo: Person,
  dateValue?: string
) {
  const direct =
    matchup.player_one_source === playerOne.source &&
    matchup.player_one_id === playerOne.id &&
    matchup.player_two_source === playerTwo.source &&
    matchup.player_two_id === playerTwo.id;

  const reverse =
    matchup.player_one_source === playerTwo.source &&
    matchup.player_one_id === playerTwo.id &&
    matchup.player_two_source === playerOne.source &&
    matchup.player_two_id === playerOne.id;

  const samePeople = direct || reverse;

  if (!samePeople) return false;

  if (!dateValue) return true;

  return matchup.scheduled_date?.slice(0, 10) === dateValue;
}

function dedupePeople(people: Person[]) {
  const map = new Map<string, Person>();

  for (const person of people) {
    const key = normalize(person.full_name || person.nickname);

    if (!map.has(key)) {
      map.set(key, person);
      continue;
    }

    const existing = map.get(key);

    if (!existing?.photo_url && person.photo_url) {
      map.set(key, person);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  );
}

function addCourtOption(map: Map<string, string>, value?: string | null) {
  const clean = String(value ?? "").trim();

  if (!clean) return;

  const key = clean.toLowerCase();

  if (!map.has(key)) {
    map.set(key, clean);
  }
}

function buildCourtOptions(games: Game[], events: CalendarEvent[]) {
  const map = new Map<string, string>();

  DEFAULT_COURTS.forEach((court) => addCourtOption(map, court));

  games.forEach((game) => {
    addCourtOption(map, game.venue);
  });

  events.forEach((event) => {
    addCourtOption(map, event.venue);
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

function getLatestContactForPerson(
  availability: Availability[],
  source: string,
  id: string
) {
  const rows = availability
    .filter(
      (row) =>
        row.participant_source === source &&
        String(row.participant_id) === String(id)
    )
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  return {
    email: rows.find((row) => row.participant_email)?.participant_email || "",
    phone: rows.find((row) => row.participant_phone)?.participant_phone || "",
  };
}

async function sendEmailNotification(payload: {
  to?: string | string[] | "admin";
  subject: string;
  text: string;
  html?: string;
}) {
  try {
    const response = await fetch("/api/notify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => ({
      ok: false,
      error: "Could not read email API response.",
    }))) as EmailResult;

    return result;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Email request failed.",
    };
  }
}

export default function CalendarPage() {
  const today = kenyaDateString();

  const [people, setPeople] = useState<Person[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [selectedPersonKey, setSelectedPersonKey] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [selectedDate, setSelectedDate] = useState(today);
  const [preferredTime, setPreferredTime] = useState("");
  const [preferredCourt, setPreferredCourt] = useState("");
  const [notes, setNotes] = useState("");

  const [challengeOpponentKey, setChallengeOpponentKey] = useState("");
  const [challengeDate, setChallengeDate] = useState(today);
  const [challengeTime, setChallengeTime] = useState("");
  const [challengeCourt, setChallengeCourt] = useState("");
  const [challengeNotes, setChallengeNotes] = useState("");

  const [message, setMessage] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedPerson = useMemo(() => {
    return people.find((person) => getPersonKey(person) === selectedPersonKey);
  }, [people, selectedPersonKey]);

  const challengeOpponent = useMemo(() => {
    return people.find((person) => getPersonKey(person) === challengeOpponentKey);
  }, [people, challengeOpponentKey]);

  const opponentOptions = people.filter(
    (person) => getPersonKey(person) !== selectedPersonKey
  );

  const courtOptions = useMemo(() => {
    return buildCourtOptions(games, events);
  }, [games, events]);

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
    }));
  }, [activeAvailability]);

  const approvedMatchups = matchups.filter(
    (matchup) => matchup.matchup_status === "approved"
  );

  const pendingPlayerRequests = matchups.filter(
    (matchup) =>
      matchup.matchup_source === "player_request" &&
      matchup.matchup_status === "suggested"
  );

  const unreadNotifications = notifications.filter((note) => !note.is_read);

  function getPersonImage(source: string, id: string) {
    return (
      people.find(
        (person) =>
          person.source === source &&
          String(person.id) === String(id)
      )?.photo_url || ""
    );
  }

  async function loadPersonNotifications(person: Person | undefined) {
    if (!person) {
      setNotifications([]);
      return;
    }

    const { data } = await supabase
      .from("fackts_notifications")
      .select("*")
      .eq("recipient_role", "player")
      .eq("recipient_source", person.source)
      .eq("recipient_id", person.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications((data ?? []) as NotificationRow[]);
  }

  async function loadPageData() {
    setLoadingPage(true);
    setMessage("");

    const [
      playersResult,
      guestsResult,
      gamesResult,
      eventsResult,
      availabilityResult,
      matchupsResult,
    ] = await Promise.all([
      supabase.from("players").select("*").eq("is_active", true),
      supabase.from("guest_hoopers").select("*").eq("is_active", true),
      supabase.from("games").select("*").order("game_date", { ascending: true }),
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
    ]);

    const playerPeople: Person[] = (playersResult.data ?? [])
      .filter((player: any) => !isProspectRole(player))
      .map((player: any) => {
        const guestRole = isGuestRole(player);

        return {
          id: player.id,
          source: "players",
          full_name: displayPersonName(player),
          nickname: player.nickname,
          role: guestRole ? "Guest Hooper" : player.role || "Player",
          photo_url: player.photo_url,
          photo_position: player.photo_position,
          label: guestRole ? "Guest Hooper" : "FACKTS Player",
        };
      });

    const guestPeople: Person[] = (guestsResult.data ?? []).map((guest: any) => ({
      id: guest.id,
      source: "guest_hoopers",
      full_name: guest.full_name || guest.nickname || "Guest Hooper",
      nickname: guest.nickname,
      role: "Guest Hooper",
      photo_url: guest.photo_url,
      photo_position: guest.photo_position,
      label: "Guest Hooper",
    }));

    setPeople(dedupePeople([...playerPeople, ...guestPeople]));
    setGames(((gamesResult.data ?? []) as Game[]).filter(isUpcomingGame));
    setEvents(
      ((eventsResult.data ?? []) as CalendarEvent[]).filter(isUpcomingEvent)
    );
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setMatchups((matchupsResult.data ?? []) as Matchup[]);

    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    loadPersonNotifications(selectedPerson);

    if (!selectedPerson) {
      setContactEmail("");
      setContactPhone("");
      return;
    }

    const latest = getLatestContactForPerson(
      availability,
      selectedPerson.source,
      selectedPerson.id
    );

    setContactEmail(latest.email || "");
    setContactPhone(latest.phone || "");
  }, [selectedPersonKey, selectedPerson, availability]);

  async function markNotificationRead(notificationId: string) {
    await supabase
      .from("fackts_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    await loadPersonNotifications(selectedPerson);
  }

  function validateIdentity() {
    if (!selectedPerson) {
      setMessage("Pick your name first.");
      return false;
    }

    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      setMessage("Add a valid email so you can receive approval notification.");
      return false;
    }

    if (!contactPhone.trim()) {
      setMessage("Add your phone number for FACKTS follow-up.");
      return false;
    }

    return true;
  }

  function emailStatusText(result: EmailResult) {
    if (result.ok) return "Email sent.";
    return `Email not sent: ${result.error || "unknown email issue"}`;
  }

  async function submitAvailability() {
    if (!validateIdentity() || !selectedPerson) return;

    setSaving(true);
    setMessage("");

    const dateValue = selectedDate || today;
    const weekday = getWeekdayName(dateValue);
    const weekStart = getWeekStartDateString(dateValue);

    const payload = {
      participant_source: selectedPerson.source,
      participant_id: selectedPerson.id,
      participant_name: selectedPerson.full_name,
      participant_email: contactEmail.trim(),
      participant_phone: contactPhone.trim(),
      availability_type: "weekly",
      availability_date: dateValue,
      week_start_date: weekStart,
      weekday,
      game_id: "",
      event_id: "",
      status: "available",
      preferred_time: preferredTime.trim() || null,
      preferred_court: preferredCourt.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fackts_availability")
      .upsert(payload, {
        onConflict:
          "participant_source,participant_id,availability_type,availability_date,game_id,event_id",
      });

    if (error) {
      setMessage(`Could not save availability: ${error.message}`);
      setSaving(false);
      return;
    }

    const emailResult = await sendEmailNotification({
      to: "admin",
      subject: `New FACKTS availability: ${selectedPerson.full_name}`,
      text: `${selectedPerson.full_name} is available on ${formatDateLabel(dateValue)} at ${
        preferredTime || "time TBA"
      }. Court: ${preferredCourt || "Court TBA"}. Phone: ${contactPhone}. Email: ${contactEmail}.`,
      html: `<p><strong>${selectedPerson.full_name}</strong> is available.</p>
<p><strong>Date:</strong> ${formatDateLabel(dateValue)}</p>
<p><strong>Time:</strong> ${preferredTime || "Time TBA"}</p>
<p><strong>Court:</strong> ${preferredCourt || "Court TBA"}</p>
<p><strong>Phone:</strong> ${contactPhone}</p>
<p><strong>Email:</strong> ${contactEmail}</p>`,
    });

    setMessage(
      `Availability saved for ${formatDateLabel(dateValue)}. ${emailStatusText(emailResult)}`
    );
    setPreferredTime("");
    setPreferredCourt("");
    setNotes("");
    await loadPageData();
    setSaving(false);
  }

  async function submitChallengeRequest() {
    if (!validateIdentity() || !selectedPerson) return;

    if (!challengeOpponent) {
      setMessage("Pick who you want to play.");
      return;
    }

    if (selectedPerson.id === challengeOpponent.id) {
      setMessage("You cannot challenge yourself.");
      return;
    }

    const existing = matchups.find(
      (matchup) =>
        matchup.matchup_status !== "deleted" &&
        matchup.matchup_status !== "rejected" &&
        sameMatchupPeople(matchup, selectedPerson, challengeOpponent, challengeDate)
    );

    if (existing) {
      setMessage("This matchup request already exists for that date.");
      return;
    }

    const opponentContact = getLatestContactForPerson(
      availability,
      challengeOpponent.source,
      challengeOpponent.id
    );

    setSaving(true);
    setMessage("");

    const now = new Date().toISOString();

    const { error } = await supabase.from("fackts_matchups").insert({
      matchup_status: "suggested",
      matchup_source: "player_request",
      event_id: "",
      weekday: getWeekdayName(challengeDate),
      player_one_source: selectedPerson.source,
      player_one_id: selectedPerson.id,
      player_one_name: selectedPerson.full_name,
      player_one_email: contactEmail.trim(),
      player_one_phone: contactPhone.trim(),
      player_two_source: challengeOpponent.source,
      player_two_id: challengeOpponent.id,
      player_two_name: challengeOpponent.full_name,
      player_two_email: opponentContact.email || null,
      player_two_phone: opponentContact.phone || null,
      scheduled_date: `${challengeDate}T12:00:00+03:00`,
      scheduled_time: challengeTime.trim() || null,
      venue: challengeCourt.trim() || "",
      notes:
        challengeNotes.trim() ||
        `${selectedPerson.full_name} requested to play ${challengeOpponent.full_name}.`,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      setMessage(`Could not submit challenge: ${error.message}`);
      setSaving(false);
      return;
    }

    const emailResult = await sendEmailNotification({
      to: "admin",
      subject: `New 1v1 request: ${selectedPerson.full_name} vs ${challengeOpponent.full_name}`,
      text: `${selectedPerson.full_name} requested ${challengeOpponent.full_name} on ${formatDateLabel(
        challengeDate
      )}. Time: ${challengeTime || "Time TBA"}. Court: ${
        challengeCourt || "Court TBA"
      }. Phone: ${contactPhone}. Email: ${contactEmail}.`,
      html: `<p><strong>${selectedPerson.full_name}</strong> requested a 1v1 against <strong>${challengeOpponent.full_name}</strong>.</p>
<p><strong>Date:</strong> ${formatDateLabel(challengeDate)}</p>
<p><strong>Time:</strong> ${challengeTime || "Time TBA"}</p>
<p><strong>Court:</strong> ${challengeCourt || "Court TBA"}</p>
<p><strong>Phone:</strong> ${contactPhone}</p>
<p><strong>Email:</strong> ${contactEmail}</p>`,
    });

    setMessage(
      `Challenge request sent. Admin will approve before it becomes official. ${emailStatusText(emailResult)}`
    );
    setChallengeOpponentKey("");
    setChallengeTime("");
    setChallengeCourt("");
    setChallengeNotes("");
    await loadPageData();
    setSaving(false);
  }

  async function submitGameAvailability(
    game: Game,
    status: "available" | "not_available"
  ) {
    if (!validateIdentity() || !selectedPerson) return;

    if (gameDeadlineClosed(game)) {
      setMessage("This game availability window is closed.");
      return;
    }

    setSaving(true);
    setMessage("");

    const gameDate = getGameDate(game)?.slice(0, 10) || today;

    const payload = {
      participant_source: selectedPerson.source,
      participant_id: selectedPerson.id,
      participant_name: selectedPerson.full_name,
      participant_email: contactEmail.trim(),
      participant_phone: contactPhone.trim(),
      availability_type: "game",
      availability_date: gameDate,
      week_start_date: getWeekStartDateString(gameDate),
      weekday: getWeekdayName(gameDate),
      game_id: game.id,
      event_id: "",
      status,
      preferred_time: null,
      preferred_court: null,
      notes: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fackts_availability")
      .upsert(payload, {
        onConflict:
          "participant_source,participant_id,availability_type,availability_date,game_id,event_id",
      });

    if (error) {
      setMessage(`Could not save game response: ${error.message}`);
      setSaving(false);
      return;
    }

    const emailResult = await sendEmailNotification({
      to: "admin",
      subject: `Game availability: ${selectedPerson.full_name}`,
      text: `${selectedPerson.full_name} marked ${status.replace("_", " ")} for FACKTS vs ${getOpponent(
        game
      )}. Phone: ${contactPhone}. Email: ${contactEmail}.`,
    });

    setMessage(
      `${selectedPerson.full_name} marked ${status.replace("_", " ")}. ${emailStatusText(
        emailResult
      )}`
    );
    await loadPageData();
    setSaving(false);
  }

  async function submitEventAvailability(
    event: CalendarEvent,
    status: "available" | "not_available"
  ) {
    if (!validateIdentity() || !selectedPerson) return;

    if (eventDeadlineClosed(event)) {
      setMessage("This event registration window is closed.");
      return;
    }

    setSaving(true);
    setMessage("");

    const eventDate = event.event_date?.slice(0, 10) || today;

    const payload = {
      participant_source: selectedPerson.source,
      participant_id: selectedPerson.id,
      participant_name: selectedPerson.full_name,
      participant_email: contactEmail.trim(),
      participant_phone: contactPhone.trim(),
      availability_type: "event",
      availability_date: eventDate,
      week_start_date: getWeekStartDateString(eventDate),
      weekday: getWeekdayName(eventDate),
      game_id: "",
      event_id: event.id,
      status,
      preferred_time: null,
      preferred_court: event.venue || null,
      notes: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fackts_availability")
      .upsert(payload, {
        onConflict:
          "participant_source,participant_id,availability_type,availability_date,game_id,event_id",
      });

    if (error) {
      setMessage(`Could not save event response: ${error.message}`);
      setSaving(false);
      return;
    }

    const emailResult = await sendEmailNotification({
      to: "admin",
      subject: `Event availability: ${selectedPerson.full_name}`,
      text: `${selectedPerson.full_name} marked ${status.replace("_", " ")} for ${
        event.title
      }. Phone: ${contactPhone}. Email: ${contactEmail}.`,
    });

    setMessage(
      `${selectedPerson.full_name} responded to ${event.title}. ${emailStatusText(
        emailResult
      )}`
    );
    await loadPageData();
    setSaving(false);
  }

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] px-4 py-6 text-white md:bg-fixed md:bg-[position:center_top] md:px-6 md:py-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.86), rgba(2, 6, 23, 0.96)), url('/images/one-on-one-bg.png')",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950/95 via-black/90 to-blue-950/35 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
                FACKTS Calendar
              </div>

              <h1 className="mt-5 text-4xl font-black uppercase tracking-tight md:text-6xl">
                Availability. Challenges. Game Calls.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                Pick your identity once, then use Check-In or Call Out separately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label="Hoopers" value={String(people.length)} />
              <HeroStat label="Games" value={String(games.length)} />
              <HeroStat label="Events" value={String(events.length)} />
              <HeroStat label="Alerts" value={String(unreadNotifications.length)} />
            </div>
          </div>
        </section>

        {message ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-6 text-zinc-400">
            Loading FACKTS calendar...
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Player Identity
              </div>

              <h2 className="mt-2 text-2xl font-black">Start Here</h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Pick yourself once. Both Check-In and Call Out will use this identity.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <NameSelect
                  people={people}
                  value={selectedPersonKey}
                  onChange={setSelectedPersonKey}
                />

                <FieldLabel label="Email">
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </FieldLabel>

                <FieldLabel label="Phone Number">
                  <input
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="0711 468303"
                    className={inputClass}
                  />
                </FieldLabel>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <ActionCard eyebrow="Player Check-In" title="Pick Your Availability">
                <p className="text-sm leading-6 text-zinc-400">
                  This only marks your availability. It does not request a specific opponent.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      label="Available Date"
                      value={selectedDate}
                      onChange={setSelectedDate}
                    />

                    <FieldLabel label="Preferred Time">
                      <input
                        value={preferredTime}
                        onChange={(event) => setPreferredTime(event.target.value)}
                        placeholder="Example: 4pm - 6pm"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <CourtSelect
                    courts={courtOptions}
                    value={preferredCourt}
                    onChange={setPreferredCourt}
                    label="Preferred Court"
                  />

                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Example: I can do 1v1 after class."
                    className={`${inputClass} resize-none`}
                  />

                  <button
                    type="button"
                    onClick={submitAvailability}
                    disabled={saving}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Submit Availability"}
                  </button>
                </div>
              </ActionCard>

              <ActionCard eyebrow="Call Out" title="Request A 1v1 Matchup">
                <p className="text-sm leading-6 text-zinc-400">
                  This requests a specific opponent. Admin approves before it goes official.
                </p>

                <div className="mt-5 space-y-4">
                  <FieldLabel label="Who do you want to play?">
                    <select
                      value={challengeOpponentKey}
                      onChange={(event) => setChallengeOpponentKey(event.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select opponent</option>
                      {opponentOptions.map((person) => (
                        <option
                          key={getPersonKey(person)}
                          value={getPersonKey(person)}
                        >
                          {person.full_name}
                          {person.nickname ? ` "${person.nickname}"` : ""} —{" "}
                          {person.label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      label="Preferred Date"
                      value={challengeDate}
                      onChange={setChallengeDate}
                    />

                    <FieldLabel label="Preferred Time">
                      <input
                        value={challengeTime}
                        onChange={(event) => setChallengeTime(event.target.value)}
                        placeholder="Example: 5pm"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <CourtSelect
                    courts={courtOptions}
                    value={challengeCourt}
                    onChange={setChallengeCourt}
                    label="Preferred Court"
                  />

                  <textarea
                    rows={3}
                    value={challengeNotes}
                    onChange={(event) => setChallengeNotes(event.target.value)}
                    placeholder="Example: I want JAO this Monday."
                    className={`${inputClass} resize-none`}
                  />

                  <button
                    type="button"
                    onClick={submitChallengeRequest}
                    disabled={saving}
                    className="w-full rounded-2xl bg-blue-500 px-5 py-3 font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sending..." : "Send Challenge Request"}
                  </button>
                </div>
              </ActionCard>
            </section>

            <NotificationBox
              selectedPerson={selectedPerson}
              notifications={notifications}
              onRead={markNotificationRead}
            />

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Weekly Board
              </div>

              <h2 className="mt-2 text-2xl font-black">Available Hoopers</h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Active week only. Old availability drops after the week ends.
              </p>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {availabilityGroups.length === 0 ? (
                  <EmptyBox text="No active availability yet." />
                ) : (
                  availabilityGroups.map((group) => (
                    <div
                      key={group.date}
                      className="rounded-3xl border border-white/10 bg-black/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-black">
                            {formatDateLabel(group.date)}
                          </div>
                          <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                            {group.weekday}
                          </div>
                        </div>

                        <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                          {group.rows.length} available
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.rows.map((row) => (
                          <span
                            key={row.id}
                            className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-200"
                          >
                            {row.participant_name}
                            {row.preferred_time ? ` • ${row.preferred_time}` : ""}
                            {row.preferred_court ? ` • ${row.preferred_court}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <CalendarFixtureSection eyebrow="Player Requests" title="Pending Challenge Requests">
              {pendingPlayerRequests.length === 0 ? (
                <EmptyBox text="No player challenge requests yet." />
              ) : (
                pendingPlayerRequests.map((matchup) => (
                  <BasketballShowcaseCard
                    key={matchup.id}
                    leftName={matchup.player_one_name}
                    rightName={matchup.player_two_name}
                    leftImage={getPersonImage(matchup.player_one_source, matchup.player_one_id)}
                    rightImage={getPersonImage(matchup.player_two_source, matchup.player_two_id)}
                    eyebrow="1V1"
                    badge="REQUESTED BATTLE"
                    date={formatDateLabel(matchup.scheduled_date?.slice(0, 10))}
                    time={matchup.scheduled_time || "TIME TBA"}
                    venue={matchup.venue || "Awaiting admin approval"}
                    status="Pending"
                    statusTone="closed"
                  />
                ))
              )}
            </CalendarFixtureSection>

            <CalendarFixtureSection eyebrow="Upcoming Events" title="Event Availability">
              {events.length === 0 ? (
                <EmptyBox text="No upcoming FACKTS events are open right now." />
              ) : (
                events.map((event) => {
                  const closed = eventDeadlineClosed(event);

                  const responses = availability.filter(
                    (row) =>
                      row.availability_type === "event" &&
                      row.event_id === event.id
                  );

                  const available = responses.filter((row) => row.status === "available");
                  const notAvailable = responses.filter((row) => row.status === "not_available");

                  return (
                    <BasketballShowcaseCard
                      key={event.id}
                      leftName="FACKTS"
                      rightName={event.title}
                      leftImage={FACKTS_LOGO}
                      rightImage={event.poster_url || ""}
                      eyebrow="EVENT"
                      badge={event.event_type.replaceAll("_", " ").toUpperCase()}
                      date={formatDateLabel(event.event_date?.slice(0, 10))}
                      time={formatShortTime(event.event_date)}
                      venue={getEventLocation(event)}
                      status={closed ? "Closed" : "Open"}
                      statusTone={closed ? "closed" : "open"}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={closed || saving}
                          onClick={() => submitEventAvailability(event, "available")}
                          className="rounded-full bg-emerald-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-emerald-400 disabled:opacity-40"
                        >
                          Yes {available.length}
                        </button>

                        <button
                          type="button"
                          disabled={closed || saving}
                          onClick={() => submitEventAvailability(event, "not_available")}
                          className="rounded-full bg-rose-500/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-40"
                        >
                          No {notAvailable.length}
                        </button>
                      </div>
                    </BasketballShowcaseCard>
                  );
                })
              )}
            </CalendarFixtureSection>

            <CalendarFixtureSection eyebrow="Upcoming Games" title="Game Availability">
              {games.length === 0 ? (
                <EmptyBox text="No upcoming games are open right now." />
              ) : (
                games.map((game) => {
                  const closed = gameDeadlineClosed(game);

                  const responses = availability.filter(
                    (row) =>
                      row.availability_type === "game" &&
                      row.game_id === game.id
                  );

                  const available = responses.filter((row) => row.status === "available");
                  const notAvailable = responses.filter((row) => row.status === "not_available");

                  return (
                    <BasketballShowcaseCard
                      key={game.id}
                      leftName="FACKTS"
                      rightName={getOpponent(game)}
                      leftImage={FACKTS_LOGO}
                      rightImage={getGamePoster(game)}
                      eyebrow="GAME"
                      badge="GAME CALL"
                      date={formatDateLabel(getGameDate(game)?.slice(0, 10))}
                      time={formatShortTime(getGameDate(game))}
                      venue={getGameLocation(game)}
                      status={closed ? "Closed" : "Open"}
                      statusTone={closed ? "closed" : "open"}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={closed || saving}
                          onClick={() => submitGameAvailability(game, "available")}
                          className="rounded-full bg-emerald-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-emerald-400 disabled:opacity-40"
                        >
                          Yes {available.length}
                        </button>

                        <button
                          type="button"
                          disabled={closed || saving}
                          onClick={() => submitGameAvailability(game, "not_available")}
                          className="rounded-full bg-rose-500/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-40"
                        >
                          No {notAvailable.length}
                        </button>
                      </div>
                    </BasketballShowcaseCard>
                  );
                })
              )}
            </CalendarFixtureSection>

            <CalendarFixtureSection eyebrow="Approved Battles" title="Official 1v1 Matchups">
              {approvedMatchups.length === 0 ? (
                <EmptyBox text="No approved matchups yet." />
              ) : (
                approvedMatchups.map((matchup) => (
                  <BasketballShowcaseCard
                    key={matchup.id}
                    leftName={matchup.player_one_name}
                    rightName={matchup.player_two_name}
                    leftImage={getPersonImage(matchup.player_one_source, matchup.player_one_id)}
                    rightImage={getPersonImage(matchup.player_two_source, matchup.player_two_id)}
                    eyebrow="1V1"
                    badge="APPROVED BATTLE"
                    date={formatDateLabel(matchup.scheduled_date?.slice(0, 10))}
                    time={matchup.scheduled_time || "TIME TBA"}
                    venue={matchup.venue || matchup.weekday || "Venue TBA"}
                    status="Approved"
                    statusTone="open"
                  />
                ))
              )}
            </CalendarFixtureSection>
          </>
        )}
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function ActionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-zinc-300">{label}</div>
      {children}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    const input = inputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;

    if (!input) return;

    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-zinc-300">{label}</div>

      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onClick={openPicker}
          className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 pr-12 text-white outline-none [color-scheme:dark] focus:border-orange-400 [&::-webkit-calendar-picker-indicator]:opacity-0"
        />

        <button
          type="button"
          onClick={openPicker}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={`Open ${label} calendar`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 2v3M17 2v3M3.5 9h17M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6 5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </label>
  );
}

function NameSelect({
  people,
  value,
  onChange,
}: {
  people: Person[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldLabel label="Your Name">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">Select player or guest hooper</option>
        {people.map((person) => (
          <option key={getPersonKey(person)} value={getPersonKey(person)}>
            {person.full_name}
            {person.nickname ? ` "${person.nickname}"` : ""} — {person.label}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

function CourtSelect({
  courts,
  value,
  onChange,
  label,
}: {
  courts: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <FieldLabel label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">Court TBA</option>

        {courts.map((court) => (
          <option key={court} value={court}>
            {court}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

function NotificationBox({
  selectedPerson,
  notifications,
  onRead,
}: {
  selectedPerson?: Person;
  notifications: NotificationRow[];
  onRead: (id: string) => void;
}) {
  if (!selectedPerson) return null;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
        Player Notifications
      </div>

      <h2 className="mt-1 text-2xl font-black">{selectedPerson.full_name}</h2>

      {notifications.length === 0 ? (
        <EmptyBox text="No notifications yet." />
      ) : (
        <div className="mt-4 space-y-3">
          {notifications.map((note) => (
            <div
              key={note.id}
              className={`rounded-2xl border p-4 ${
                note.is_read
                  ? "border-white/10 bg-black/50"
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
                    onClick={() => onRead(note.id)}
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
    </section>
  );
}

function CalendarFixtureSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-2xl font-black">{title}</h2>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function BasketballShowcaseCard({
  leftName,
  rightName,
  leftImage,
  rightImage,
  eyebrow,
  badge,
  date,
  time,
  venue,
  status,
  statusTone,
  children,
}: {
  leftName: string;
  rightName: string;
  leftImage?: string;
  rightImage?: string;
  eyebrow: string;
  badge: string;
  date: string;
  time: string;
  venue: string;
  status: string;
  statusTone: "open" | "closed";
  children?: ReactNode;
}) {
  const artImage = rightImage || leftImage || "";

  return (
    <div className="group relative mx-auto w-full max-w-5xl overflow-hidden rounded-[30px] border border-orange-500/25 bg-[#05070d] shadow-[0_24px_60px_rgba(0,0,0,0.6)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(0,0,0,0.7)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_30%)]" />

      {artImage ? (
        <div
          className="absolute inset-0 opacity-[0.10] blur-[1.5px]"
          style={{
            backgroundImage: `url(${artImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}

      <div className="absolute inset-y-0 right-0 w-full bg-[linear-gradient(160deg,rgba(14,36,73,0.72),rgba(8,18,36,0.92))] sm:w-[34%]" />

      <div className="relative grid min-h-[168px] grid-cols-1 sm:grid-cols-[1fr_240px]">
        <div className="flex items-center justify-center px-4 py-5 sm:px-6">
          <div className="flex w-full max-w-[520px] items-center justify-center gap-3 sm:gap-5">
            <CompetitorBadge name={leftName} image={leftImage} />

            <div className="flex shrink-0 flex-col items-center justify-center">
              <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">
                {eyebrow}
              </div>

              <div className="relative mt-2 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base font-black text-white">
                VS
              </div>

              <div className="mt-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-blue-200">
                STREETBALL
              </div>
            </div>

            <CompetitorBadge name={rightName} image={rightImage} />
          </div>
        </div>

        <div className="relative flex flex-col justify-center px-4 py-4 sm:px-5">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-100">
              {badge}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                statusTone === "open"
                  ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-100"
                  : "border border-rose-400/20 bg-rose-500/15 text-rose-100"
              }`}
            >
              {status}
            </span>
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
            {date}
          </div>

          <div className="mt-1 text-[2rem] font-black leading-none text-white sm:text-[2.3rem]">
            {time}
          </div>

          <div className="mt-2 line-clamp-2 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-100 sm:text-[11px]">
            {venue}
          </div>

          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function CompetitorBadge({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  return (
    <div className="flex w-[98px] shrink-0 flex-col items-center text-center sm:w-[128px]">
      <div className="relative flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(160deg,#0f172a,#111827)] shadow-[0_12px_25px_rgba(0,0,0,0.35)] sm:h-[82px] sm:w-[82px]">
        <SafeImage image={image} name={name} />
      </div>

      <div className="mt-2 line-clamp-2 text-[10px] font-black uppercase leading-3 tracking-[0.06em] text-white sm:text-[11px]">
        {name}
      </div>
    </div>
  );
}

function SafeImage({ image, name }: { image?: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <div className="relative text-lg font-black uppercase text-white">
        {getInitialsFromName(name)}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name}
      onError={() => setFailed(true)}
      className="relative h-full w-full object-contain p-2"
    />
  );
}

function getInitialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-zinc-400">
      {text}
    </div>
  );
}