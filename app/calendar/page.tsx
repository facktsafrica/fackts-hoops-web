"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  notes?: string | null;
  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
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
  notes?: string | null;
  is_public?: boolean | null;
  is_active?: boolean | null;
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
};

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

function getGamePoster(game: Game) {
  return game.poster_url || game.game_poster_url || game.image_url || "";
}

function getEventLocation(event: CalendarEvent) {
  return [event.venue, event.location].filter(Boolean).join(" • ") || "Venue TBA";
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
  if (!value) return "No deadline set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No deadline set";

  return date.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export default function CalendarPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [selectedPersonKey, setSelectedPersonKey] = useState("");
  const [selectedWeekday, setSelectedWeekday] = useState("Tuesday");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedPerson = useMemo(() => {
    return people.find((person) => getPersonKey(person) === selectedPersonKey);
  }, [people, selectedPersonKey]);

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

  const suggestedPairingCount = weeklyGroups.reduce(
    (acc, group) => acc + group.pairings.length,
    0
  );

  const approvedMatchups = matchups.filter(
    (matchup) => matchup.matchup_status === "approved"
  );

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
        .order("created_at", { ascending: false }),
      supabase
        .from("fackts_matchups")
        .select("*")
        .neq("matchup_status", "deleted")
        .order("created_at", { ascending: false }),
    ]);

    const messages: string[] = [];

    if (playersResult.error) messages.push(playersResult.error.message);
    if (guestsResult.error) messages.push(guestsResult.error.message);
    if (gamesResult.error) messages.push(gamesResult.error.message);
    if (eventsResult.error) messages.push(eventsResult.error.message);
    if (availabilityResult.error) messages.push(availabilityResult.error.message);
    if (matchupsResult.error) messages.push(matchupsResult.error.message);

    const playerPeople: Person[] = (playersResult.data ?? [])
      .filter((player: any) => !isProspectRole(player))
      .map((player: any) => ({
        id: player.id,
        source: "players",
        full_name: displayPersonName(player),
        nickname: player.nickname,
        role: isGuestRole(player) ? "Guest Hooper" : player.role || "Player",
        photo_url: player.photo_url,
        photo_position: player.photo_position,
        label: isGuestRole(player) ? "Converted Guest" : "FACKTS Player",
      }));

    const guestPeople: Person[] = (guestsResult.data ?? []).map((guest: any) => ({
      id: guest.id,
      source: "guest_hoopers",
      full_name: guest.full_name || guest.nickname || "Guest Hooper",
      nickname: guest.nickname,
      role: "Guest Hooper",
      photo_url: guest.photo_url,
      photo_position: guest.photo_position,
      label: "Registered Guest",
    }));

    setPeople(dedupePeople([...playerPeople, ...guestPeople]));
    setGames(((gamesResult.data ?? []) as Game[]).filter(isUpcomingGame));
    setEvents(
      ((eventsResult.data ?? []) as CalendarEvent[]).filter(isUpcomingEvent)
    );
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setMatchups((matchupsResult.data ?? []) as Matchup[]);

    if (messages.length > 0) {
      setMessage(messages.join(" | "));
    }

    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  async function submitWeeklyAvailability() {
    if (!selectedPerson) {
      setMessage("Pick your name first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      participant_source: selectedPerson.source,
      participant_id: selectedPerson.id,
      participant_name: selectedPerson.full_name,
      availability_type: "weekly",
      weekday: selectedWeekday,
      game_id: "",
      event_id: "",
      status: "available",
      preferred_time: preferredTime.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fackts_availability")
      .upsert(payload, {
        onConflict:
          "participant_source,participant_id,availability_type,weekday,game_id,event_id",
      });

    if (error) {
      setMessage(`Could not save availability: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage(`Availability saved for ${selectedWeekday}.`);
    setPreferredTime("");
    setNotes("");
    await loadPageData();
    setSaving(false);
  }

  async function submitGameAvailability(
    game: Game,
    status: "available" | "not_available"
  ) {
    if (!selectedPerson) {
      setMessage("Pick your name first before responding to a game.");
      return;
    }

    if (gameDeadlineClosed(game)) {
      setMessage("This game availability window is closed.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      participant_source: selectedPerson.source,
      participant_id: selectedPerson.id,
      participant_name: selectedPerson.full_name,
      availability_type: "game",
      weekday: "",
      game_id: game.id,
      event_id: "",
      status,
      preferred_time: null,
      notes: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fackts_availability")
      .upsert(payload, {
        onConflict:
          "participant_source,participant_id,availability_type,weekday,game_id,event_id",
      });

    if (error) {
      setMessage(`Could not save game response: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage(`${selectedPerson.full_name} marked ${status.replace("_", " ")}.`);
    await loadPageData();
    setSaving(false);
  }

  async function submitEventAvailability(
    event: CalendarEvent,
    status: "available" | "not_available"
  ) {
    if (!selectedPerson) {
      setMessage("Pick your name first before responding to an event.");
      return;
    }

    if (eventDeadlineClosed(event)) {
      setMessage("This event registration window is closed.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      participant_source: selectedPerson.source,
      participant_id: selectedPerson.id,
      participant_name: selectedPerson.full_name,
      availability_type: "event",
      weekday: "",
      game_id: "",
      event_id: event.id,
      status,
      preferred_time: null,
      notes: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fackts_availability")
      .upsert(payload, {
        onConflict:
          "participant_source,participant_id,availability_type,weekday,game_id,event_id",
      });

    if (error) {
      setMessage(`Could not save event response: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage(`${selectedPerson.full_name} responded to ${event.title}.`);
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
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950/95 via-black/90 to-orange-950/35 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
                FACKTS Calendar
              </div>

              <h1 className="mt-5 text-4xl font-black uppercase tracking-tight md:text-6xl">
                Availability. Matchups. Game Calls.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                Mark when you are free, respond to upcoming games and FACKTS
                events, and help us form 1v1 matchups without chasing people on
                WhatsApp.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/court-takeover"
                  className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                >
                  Court Takeover
                </Link>

                <Link
                  href="/one-on-one"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-100 transition hover:border-orange-400 hover:text-orange-300"
                >
                  1v1 Battles
                </Link>

                <Link
                  href="/events"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-100 transition hover:border-orange-400 hover:text-orange-300"
                >
                  Event Stories
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label="Hoopers" value={String(people.length)} />
              <HeroStat label="Games" value={String(games.length)} />
              <HeroStat label="Events" value={String(events.length)} />
              <HeroStat label="1v1 Ideas" value={String(suggestedPairingCount)} />
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
            <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                  Player Check-In
                </div>

                <h2 className="mt-2 text-2xl font-black">Pick Your Availability</h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Choose your name, pick a day, and submit. Same-day hoopers
                  form the 1v1 matchup pool.
                </p>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <div className="mb-2 text-sm font-bold text-zinc-300">
                      Your Name
                    </div>

                    <select
                      value={selectedPersonKey}
                      onChange={(event) => setSelectedPersonKey(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                    >
                      <option value="">Select player or guest hooper</option>
                      {people.map((person) => (
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
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-sm font-bold text-zinc-300">
                        Available Day
                      </div>

                      <select
                        value={selectedWeekday}
                        onChange={(event) => setSelectedWeekday(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                      >
                        {weekdays.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <div className="mb-2 text-sm font-bold text-zinc-300">
                        Preferred Time
                      </div>

                      <input
                        value={preferredTime}
                        onChange={(event) => setPreferredTime(event.target.value)}
                        placeholder="Example: 4pm - 6pm"
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="mb-2 text-sm font-bold text-zinc-300">
                      Notes
                    </div>

                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Example: I can do 1v1 after class."
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={submitWeeklyAvailability}
                    disabled={saving}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Submit Weekly Availability"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                  1v1 Pool
                </div>

                <h2 className="mt-2 text-2xl font-black">Same-Day Hoopers</h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  These are not official battles yet. Admin must approve before
                  they show on Court Takeover or 1v1.
                </p>

                <div className="mt-5 space-y-3">
                  {weeklyGroups.map((group) => (
                    <div
                      key={group.day}
                      className="rounded-3xl border border-white/10 bg-black/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg font-black">{group.day}</div>

                        <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                          {group.rows.length} available
                        </div>
                      </div>

                      {group.rows.length === 0 ? (
                        <div className="mt-3 text-sm text-zinc-600">
                          No one has picked this day yet.
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.rows.map((row) => (
                            <span
                              key={row.id}
                              className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-200"
                            >
                              {row.participant_name}
                              {row.preferred_time ? ` • ${row.preferred_time}` : ""}
                            </span>
                          ))}
                        </div>
                      )}

                      {group.pairings.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {group.pairings.map((pair, index) => (
                            <div
                              key={`${group.day}-${index}`}
                              className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-sm font-black text-white"
                            >
                              {pair[0].participant_name}{" "}
                              <span className="text-orange-300">vs</span>{" "}
                              {pair[1].participant_name}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                    Upcoming Events
                  </div>

                  <h2 className="mt-1 text-2xl font-black">
                    Event Availability
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Events appear here for availability only. Full stories,
                    posters, photos, and recaps stay on the Events page.
                  </p>
                </div>

                <Link
                  href="/events"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/5"
                >
                  View Event Stories
                </Link>
              </div>

              {events.length === 0 ? (
                <EmptyBox text="No upcoming FACKTS events are open right now." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {events.map((event) => {
                    const closed = eventDeadlineClosed(event);

                    const responses = availability.filter(
                      (row) =>
                        row.availability_type === "event" &&
                        row.event_id === event.id
                    );

                    const available = responses.filter(
                      (row) => row.status === "available"
                    );

                    const notAvailable = responses.filter(
                      (row) => row.status === "not_available"
                    );

                    return (
                      <div
                        key={event.id}
                        className="overflow-hidden rounded-3xl border border-white/10 bg-black/70"
                      >
                        {event.poster_url ? (
                          <img
                            src={event.poster_url}
                            alt={event.title}
                            className="h-48 w-full object-cover"
                          />
                        ) : null}

                        <div className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                                {event.event_type.replace("_", " ")}
                              </div>

                              <h3 className="mt-1 text-2xl font-black">
                                {event.title}
                              </h3>

                              <p className="mt-2 text-sm text-zinc-400">
                                {formatDate(event.event_date)}
                              </p>

                              <p className="mt-1 text-sm text-zinc-500">
                                {getEventLocation(event)}
                              </p>

                              <p className="mt-2 text-xs font-bold text-zinc-500">
                                Deadline: {formatDeadline(event.registration_deadline)}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                closed
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-emerald-500/15 text-emerald-300"
                              }`}
                            >
                              {closed ? "Closed" : "Open"}
                            </span>
                          </div>

                          {event.notes ? (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                              {event.notes}
                            </p>
                          ) : null}

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={closed || saving}
                              onClick={() =>
                                submitEventAvailability(event, "available")
                              }
                              className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Available
                            </button>

                            <button
                              type="button"
                              disabled={closed || saving}
                              onClick={() =>
                                submitEventAvailability(event, "not_available")
                              }
                              className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Not Available
                            </button>
                          </div>

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
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                    Upcoming Games
                  </div>

                  <h2 className="mt-1 text-2xl font-black">Game Availability</h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Pick your name above, then confirm if you are available for
                    each FACKTS game.
                  </p>
                </div>

                <Link
                  href="/games"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/5"
                >
                  View Games
                </Link>
              </div>

              {games.length === 0 ? (
                <EmptyBox text="No upcoming games are open right now." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {games.map((game) => {
                    const closed = gameDeadlineClosed(game);
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
                        className="overflow-hidden rounded-3xl border border-white/10 bg-black/70"
                      >
                        {getGamePoster(game) ? (
                          <img
                            src={getGamePoster(game)}
                            alt={getGameTitle(game)}
                            className="h-48 w-full object-cover"
                          />
                        ) : null}

                        <div className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                                FACKTS Game
                              </div>

                              <h3 className="mt-1 text-xl font-black">
                                FACKTS vs {getOpponent(game)}
                              </h3>

                              <p className="mt-1 text-sm text-zinc-400">
                                {getGameTitle(game)}
                              </p>

                              <p className="mt-2 text-sm text-zinc-500">
                                {formatDate(getGameDate(game))}
                              </p>

                              <p className="mt-1 text-sm text-zinc-500">
                                {getGameLocation(game)}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                closed
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-emerald-500/15 text-emerald-300"
                              }`}
                            >
                              {closed ? "Closed" : "Open"}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={closed || saving}
                              onClick={() =>
                                submitGameAvailability(game, "available")
                              }
                              className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Available
                            </button>

                            <button
                              type="button"
                              disabled={closed || saving}
                              onClick={() =>
                                submitGameAvailability(game, "not_available")
                              }
                              className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Not Available
                            </button>
                          </div>

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
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Approved Battles
              </div>

              <h2 className="mt-1 text-2xl font-black">
                Official 1v1 Matchups
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                These are approved matchups. Suggested pairings only become
                official after admin approval.
              </p>

              {approvedMatchups.length === 0 ? (
                <EmptyBox text="No approved matchups yet." />
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {approvedMatchups.map((matchup) => (
                    <div
                      key={matchup.id}
                      className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                        Approved Battle
                      </div>

                      <div className="mt-3 text-xl font-black">
                        {matchup.player_one_name}{" "}
                        <span className="text-orange-300">vs</span>{" "}
                        {matchup.player_two_name}
                      </div>

                      <div className="mt-3 text-sm text-zinc-400">
                        {matchup.scheduled_date
                          ? formatDate(matchup.scheduled_date)
                          : matchup.weekday || "Date TBA"}
                      </div>

                      <div className="mt-1 text-sm text-zinc-500">
                        {matchup.venue || "Venue TBA"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
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
          {names.slice(0, 4).map((name) => (
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-zinc-400">
      {text}
    </div>
  );
}
function FixtureStrip({
  leftName,
  rightName,
  leftImage,
  rightImage,
  label,
  date,
  venue,
  status,
  statusTone,
  children,
}: {
  leftName: string;
  rightName: string;
  leftImage?: string;
  rightImage?: string;
  label: string;
  date: string;
  venue: string;
  status: string;
  statusTone: "open" | "closed";
  children?: React.ReactNode;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/30 transition hover:-translate-y-0.5 hover:border-orange-400/50">
      <div className="grid min-h-[112px] grid-cols-[1fr_120px] sm:grid-cols-[1fr_190px]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-white px-3 py-3 text-black sm:gap-5 sm:px-5">
          <FixtureSide name={leftName} image={leftImage} align="left" />

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl font-black uppercase text-zinc-400 shadow-inner">
            VS
          </div>

          <FixtureSide name={rightName} image={rightImage} align="right" />
        </div>

        <div className="relative flex flex-col justify-center overflow-hidden bg-orange-950 px-3 py-3 text-white sm:px-5">
          <div className="absolute inset-y-0 -left-8 w-16 skew-x-[-14deg] bg-white" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-800 via-orange-950 to-black" />

          <div className="relative">
            <div className="mb-2 flex flex-wrap gap-1">
              <span className="rounded-full bg-black/40 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-200">
                {label}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                  statusTone === "open"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-rose-500/20 text-rose-200"
                }`}
              >
                {status}
              </span>
            </div>

            <p className="text-[11px] font-black uppercase leading-4 text-white sm:text-sm">
              {date}
            </p>

            <p className="mt-1 line-clamp-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-100 sm:text-xs">
              {venue}
            </p>

            {children ? <div className="mt-2">{children}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FixtureSide({
  name,
  image,
  align,
}: {
  name: string;
  image?: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0"}>
      <div
        className={`mb-2 flex items-center gap-2 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 sm:h-16 sm:w-16">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <div className="text-sm font-black text-orange-600">
              {getInitialsFromName(name)}
            </div>
          )}
        </div>
      </div>

      <p className="truncate text-[11px] font-black uppercase tracking-[0.04em] text-orange-950 sm:text-sm">
        {name}
      </p>
    </div>
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