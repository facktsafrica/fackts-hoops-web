"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const FACKTS_LOGO = "/fackts-hoops-logo.png";

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
  matchup_source: "availability" | "manual" | "player_request";
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

function formatShortDate(value?: string | null) {
  if (!value) return "DATE TBA";

  const date = new Date(value);

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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value.toUpperCase();

  return date
    .toLocaleTimeString("en-KE", {
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(":", ".")
    .replace(" ", "")
    .toUpperCase();
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

function sameMatchupPeople(
  matchup: Matchup,
  playerOne: Person,
  playerTwo: Person,
  day?: string
) {
  if (day && matchup.weekday && matchup.weekday !== day) return false;

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

  return direct || reverse;
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

  const [challengeOpponentKey, setChallengeOpponentKey] = useState("");
  const [challengeDay, setChallengeDay] = useState("Tuesday");
  const [challengeTime, setChallengeTime] = useState("");
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

  const pendingPlayerRequests = matchups.filter(
    (matchup) =>
      matchup.matchup_source === "player_request" &&
      matchup.matchup_status === "suggested"
  );

  function getPersonImage(source: string, id: string) {
    return (
      people.find(
        (person) =>
          person.source === source &&
          String(person.id) === String(id)
      )?.photo_url || ""
    );
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

  async function submitChallengeRequest() {
    if (!selectedPerson) {
      setMessage("Pick your name first.");
      return;
    }

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
        sameMatchupPeople(matchup, selectedPerson, challengeOpponent, challengeDay)
    );

    if (existing) {
      setMessage("This matchup request already exists for that day.");
      return;
    }

    setSaving(true);
    setMessage("");

    const now = new Date().toISOString();

    const { error } = await supabase.from("fackts_matchups").insert({
      matchup_status: "suggested",
      matchup_source: "player_request",
      event_id: "",
      weekday: challengeDay,
      player_one_source: selectedPerson.source,
      player_one_id: selectedPerson.id,
      player_one_name: selectedPerson.full_name,
      player_two_source: challengeOpponent.source,
      player_two_id: challengeOpponent.id,
      player_two_name: challengeOpponent.full_name,
      scheduled_date: null,
      scheduled_time: challengeTime.trim() || null,
      venue: "",
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

    setMessage("Challenge request sent. Admin will approve before it becomes official.");
    setChallengeOpponentKey("");
    setChallengeTime("");
    setChallengeNotes("");
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
                Pick your name, mark availability, or call out who you want to
                play. Admin approves before anything becomes official.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label="Hoopers" value={String(people.length)} />
              <HeroStat label="Games" value={String(games.length)} />
              <HeroStat label="Events" value={String(events.length)} />
              <HeroStat label="Requests" value={String(pendingPlayerRequests.length)} />
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
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <ActionCard eyebrow="Player Check-In" title="Pick Your Availability">
                <p className="text-sm leading-6 text-zinc-400">
                  Choose your name, pick a day, and submit. Admin will approve
                  official 1v1 pairings.
                </p>

                <div className="mt-5 space-y-4">
                  <NameSelect
                    people={people}
                    value={selectedPersonKey}
                    onChange={setSelectedPersonKey}
                  />

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

                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Example: I can do 1v1 after class."
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                  />

                  <button
                    type="button"
                    onClick={submitWeeklyAvailability}
                    disabled={saving}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Submit Availability"}
                  </button>
                </div>
              </ActionCard>

              <ActionCard eyebrow="Call Out" title="Request A 1v1 Matchup">
                <p className="text-sm leading-6 text-zinc-400">
                  Example: Hardy can request JAO. Admin sees the request and
                  approves it before it appears on 1v1 battles.
                </p>

                <div className="mt-5 space-y-4">
                  <NameSelect
                    people={people}
                    value={selectedPersonKey}
                    onChange={setSelectedPersonKey}
                  />

                  <label className="block">
                    <div className="mb-2 text-sm font-bold text-zinc-300">
                      Who do you want to play?
                    </div>

                    <select
                      value={challengeOpponentKey}
                      onChange={(event) => setChallengeOpponentKey(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
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
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-sm font-bold text-zinc-300">
                        Preferred Day
                      </div>

                      <select
                        value={challengeDay}
                        onChange={(event) => setChallengeDay(event.target.value)}
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
                        value={challengeTime}
                        onChange={(event) => setChallengeTime(event.target.value)}
                        placeholder="Example: 5pm"
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                      />
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    value={challengeNotes}
                    onChange={(event) => setChallengeNotes(event.target.value)}
                    placeholder="Example: I want JAO this Monday."
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
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

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                1v1 Pool
              </div>

              <h2 className="mt-2 text-2xl font-black">Same-Day Hoopers</h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Availability pool only. Admin chooses the official matchups.
              </p>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
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
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Player Requests
              </div>

              <h2 className="mt-1 text-2xl font-black">Pending Challenge Requests</h2>

              {pendingPlayerRequests.length === 0 ? (
                <EmptyBox text="No player challenge requests yet." />
              ) : (
                <div className="mt-5 space-y-3">
                  {pendingPlayerRequests.map((matchup) => (
                    <BasketballShowcaseCard
                      key={matchup.id}
                      leftName={matchup.player_one_name}
                      rightName={matchup.player_two_name}
                      leftImage={getPersonImage(matchup.player_one_source, matchup.player_one_id)}
                      rightImage={getPersonImage(matchup.player_two_source, matchup.player_two_id)}
                      eyebrow="1V1"
                      badge="REQUESTED BATTLE"
                      date={matchup.weekday || "DAY TBA"}
                      time={matchup.scheduled_time || "TIME TBA"}
                      venue="Awaiting admin approval"
                      status="Pending"
                      statusTone="closed"
                    />
                  ))}
                </div>
              )}
            </section>

            <CalendarFixtureSection
              title="Event Availability"
              eyebrow="Upcoming Events"
            >
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

                  const available = responses.filter(
                    (row) => row.status === "available"
                  );

                  const notAvailable = responses.filter(
                    (row) => row.status === "not_available"
                  );

                  return (
                    <BasketballShowcaseCard
                      key={event.id}
                      leftName="FACKTS"
                      rightName={event.title}
                      leftImage={FACKTS_LOGO}
                      rightImage={event.poster_url || ""}
                      eyebrow="EVENT"
                      badge={event.event_type.replaceAll("_", " ").toUpperCase()}
                      date={formatShortDate(event.event_date)}
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
                          onClick={() =>
                            submitEventAvailability(event, "not_available")
                          }
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

            <CalendarFixtureSection
              title="Game Availability"
              eyebrow="Upcoming Games"
            >
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

                  const available = responses.filter(
                    (row) => row.status === "available"
                  );

                  const notAvailable = responses.filter(
                    (row) => row.status === "not_available"
                  );

                  return (
                    <BasketballShowcaseCard
                      key={game.id}
                      leftName="FACKTS"
                      rightName={getOpponent(game)}
                      leftImage={FACKTS_LOGO}
                      rightImage={getGamePoster(game)}
                      eyebrow="GAME"
                      badge="GAME CALL"
                      date={formatShortDate(getGameDate(game))}
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
                          onClick={() =>
                            submitGameAvailability(game, "not_available")
                          }
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

            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Approved Battles
              </div>

              <h2 className="mt-1 text-2xl font-black">Official 1v1 Matchups</h2>

              {approvedMatchups.length === 0 ? (
                <EmptyBox text="No approved matchups yet." />
              ) : (
                <div className="mt-5 space-y-3">
                  {approvedMatchups.map((matchup) => (
                    <BasketballShowcaseCard
                      key={matchup.id}
                      leftName={matchup.player_one_name}
                      rightName={matchup.player_two_name}
                      leftImage={getPersonImage(matchup.player_one_source, matchup.player_one_id)}
                      rightImage={getPersonImage(matchup.player_two_source, matchup.player_two_id)}
                      eyebrow="1V1"
                      badge="APPROVED BATTLE"
                      date={formatShortDate(matchup.scheduled_date)}
                      time={matchup.scheduled_time || "TIME TBA"}
                      venue={matchup.venue || matchup.weekday || "Venue TBA"}
                      status="Approved"
                      statusTone="open"
                    />
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
    <label className="block">
      <div className="mb-2 text-sm font-bold text-zinc-300">Your Name</div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
      >
        <option value="">Select player or guest hooper</option>
        {people.map((person) => (
          <option key={getPersonKey(person)} value={getPersonKey(person)}>
            {person.full_name}
            {person.nickname ? ` "${person.nickname}"` : ""} — {person.label}
          </option>
        ))}
      </select>
    </label>
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
            {eyebrow}
          </div>

          <h2 className="mt-1 text-2xl font-black">{title}</h2>
        </div>
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

      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_22%,transparent_78%,rgba(255,255,255,0.03)_100%)]" />

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
      <div className="absolute inset-y-0 right-[31%] hidden w-16 skew-x-[-18deg] bg-orange-500/12 sm:block" />
      <div className="absolute inset-y-0 right-[30%] hidden w-[1px] bg-white/10 sm:block" />

      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
      <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

      <div className="relative grid min-h-[168px] grid-cols-1 sm:grid-cols-[1fr_240px]">
        <div className="flex items-center justify-center px-4 py-5 sm:px-6">
          <div className="flex w-full max-w-[520px] items-center justify-center gap-3 sm:gap-5">
            <CompetitorBadge name={leftName} image={leftImage} />

            <div className="flex shrink-0 flex-col items-center justify-center">
              <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">
                {eyebrow}
              </div>

              <div className="relative mt-2 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base font-black text-white shadow-[inset_0_0_14px_rgba(255,255,255,0.06)]">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16),transparent_65%)]" />
                <span className="relative">VS</span>
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_35%)]" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

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