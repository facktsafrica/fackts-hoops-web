import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DEFAULT_FACKTS_KINGS_SEASON, resolveFacktsKingsSeason } from "@/lib/hoops/facktsKings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventRow = {
  event_id: string;
  slug: string;
  title: string;
  summary?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  hero_image_url?: string | null;
  photo_count?: number | null;
  event_type?: string | null;
  age_category?: string | null;
  created_at?: string | null;
};

type EventRecordRow = {
  id: string;
  event_id: string;
  record_type: string;
  title: string;
  subtitle?: string | null;
  details?: string | null;
  division?: string | null;
  team_name?: string | null;
  opponent_name?: string | null;
  score_for?: number | null;
  score_against?: number | null;
  image_url?: string | null;
  url?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type GameRow = {
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
  team_score?: number | string | null;
  fackts_score?: number | string | null;
  home_score?: number | string | null;
  opponent_score?: number | string | null;
  away_score?: number | string | null;
  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

type KingsMatchRow = {
  id: string;
  match_number?: string | null;
  match_title?: string | null;
  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;
  participant_name?: string | null;
  participant_display_name?: string | null;
  opponent_type?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  opponent_name?: string | null;
  opponent_display_name?: string | null;
  match_date?: string | null;
  venue?: string | null;
  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  status?: string | null;
  result?: string | null;
  season_label?: string | null;
  poster_url?: string | null;
  participant_cutout_url?: string | null;
  opponent_cutout_url?: string | null;
  created_at?: string | null;
};

type PlayerRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
};

type PlayerStatRow = {
  id?: string;
  player_id?: string | null;
  points?: number | string | null;
  rebounds?: number | string | null;
  assists?: number | string | null;
  steals?: number | string | null;
  blocks?: number | string | null;
  plus_minus?: number | string | null;
};

type Performer = {
  player: PlayerRow;
  stats: PlayerStatRow;
};

type EventState = "live" | "upcoming" | "completed";

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function dateTime(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "Date to be confirmed";

  const safeValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(safeValue);

  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function eventDateLabel(event: EventRow) {
  if (!event.start_date) return "Date to be confirmed";
  if (!event.end_date || event.end_date === event.start_date) {
    return formatDate(event.start_date);
  }

  return `${formatDate(event.start_date)} – ${formatDate(event.end_date)}`;
}

function eventImage(event?: EventRow | null) {
  return event?.hero_image_url || event?.poster_url || "";
}

function gameImage(game?: GameRow | null) {
  return game?.poster_url || game?.game_poster_url || game?.image_url || "";
}

function getGameTitle(game?: GameRow | null) {
  return game?.game_title || game?.title || "FACKTS competition game";
}

function getOpponent(game?: GameRow | null) {
  return game?.opponent || game?.opponent_name || game?.team_name || "Opponent";
}

function getGameDate(game?: GameRow | null) {
  return game?.game_date || game?.date || game?.created_at || null;
}

function getTeamScore(game?: GameRow | null) {
  return numberValue(game?.team_score, game?.fackts_score, game?.home_score);
}

function getOpponentScore(game?: GameRow | null) {
  return numberValue(game?.opponent_score, game?.away_score);
}

function getGameStatus(game?: GameRow | null) {
  const status = String(game?.status ?? "").toLowerCase();

  if (["completed", "played", "final"].includes(status)) return "completed";
  if (game?.is_upcoming === false) return "completed";
  if (game?.is_upcoming === true) return "upcoming";

  return getTeamScore(game) !== null && getOpponentScore(game) !== null
    ? "completed"
    : "upcoming";
}

function getKingsMatchStatus(match?: KingsMatchRow | null) {
  const status = String(match?.status || "").toLowerCase();

  if (["completed", "played", "final"].includes(status)) return "completed";
  if (["upcoming", "scheduled", "pending"].includes(status)) return "upcoming";

  return numberValue(match?.points_scored) !== null &&
    numberValue(match?.points_allowed) !== null
    ? "completed"
    : "upcoming";
}

function kingsMatchLabel(match?: KingsMatchRow | null) {
  return match?.match_number || match?.match_title || "FACKTS Kings";
}

function kingsParticipant(match?: KingsMatchRow | null) {
  return (
    meaningfulKingsName(match?.participant_display_name) ||
    meaningfulKingsName(match?.participant_name) ||
    "Player 1"
  );
}

function kingsOpponent(match?: KingsMatchRow | null) {
  return (
    meaningfulKingsName(match?.opponent_display_name) ||
    meaningfulKingsName(match?.opponent_name) ||
    "Player 2"
  );
}

function nairobiToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getEventState(event: EventRow, today: string): EventState {
  const start = event.start_date || "";
  const end = event.end_date || start;

  if (start && start > today) return "upcoming";
  if (start && start <= today && end && end >= today) return "live";
  return "completed";
}

function statusLabel(status: EventState) {
  if (status === "live") return "Live";
  if (status === "upcoming") return "Upcoming";
  return "Completed";
}

function statusClass(status: EventState) {
  if (status === "live") return "bg-[#C23B3B] text-white";
  if (status === "upcoming") return "bg-[#0B1F3A] text-white";
  return "bg-[#1F8A5B] text-white";
}

function canonicalName(value?: string | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function meaningfulKingsName(value?: string | null) {
  const cleanName = canonicalName(value);
  const normalized = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (
    ["player1", "playerone", "player2", "playertwo", "unknown", "tbd"].includes(
      normalized
    )
  ) {
    return "";
  }

  return cleanName;
}

function sameName(left?: string | null, right?: string | null) {
  return canonicalName(left).toLowerCase() === canonicalName(right).toLowerCase();
}

function resultWinner(record?: EventRecordRow | null) {
  if (
    !record ||
    record.score_for == null ||
    record.score_against == null ||
    record.score_for === record.score_against
  ) {
    return null;
  }

  return record.score_for > record.score_against
    ? canonicalName(record.team_name)
    : canonicalName(record.opponent_name);
}

function playerContribution(row: PlayerStatRow) {
  return (
    Number(row.points ?? 0) +
    Number(row.rebounds ?? 0) +
    Number(row.assists ?? 0) +
    Number(row.steals ?? 0) +
    Number(row.blocks ?? 0) +
    Math.max(Number(row.plus_minus ?? 0), 0)
  );
}

async function loadHomepageData() {
  const [eventsResult, recordsResult, gamesResult, kingsResult] = await Promise.all([
    supabase
      .from("event_case_studies")
      .select("*")
      .eq("is_public", true)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_records")
      .select("*")
      .eq("is_public", true)
      .in("status", ["verified", "published"])
      .order("created_at", { ascending: false }),
    supabase.from("games").select("*").order("game_date", { ascending: false }),
    supabase
      .from("guest_one_on_one_stats")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const kingsMatches = (kingsResult.data || []) as KingsMatchRow[];
  const playerIds = Array.from(
    new Set(
      kingsMatches
        .flatMap((match) => [match.fackts_player_id, match.opponent_player_id])
        .filter((id): id is string => Boolean(id))
    )
  );
  const guestIds = Array.from(
    new Set(
      kingsMatches
        .flatMap((match) => [match.guest_hooper_id, match.opponent_guest_hooper_id])
        .filter((id): id is string => Boolean(id))
    )
  );

  const [playersResult, guestsResult] = await Promise.all([
    playerIds.length
      ? supabase.from("players").select("id,full_name,name,nickname").in("id", playerIds)
      : Promise.resolve({ data: [] }),
    guestIds.length
      ? supabase.from("guest_hoopers").select("id,full_name,name,nickname").in("id", guestIds)
      : Promise.resolve({ data: [] }),
  ]);
  const playerNames = new Map(
    ((playersResult.data || []) as PlayerRow[]).map((player) => [
      player.id,
      canonicalName(player.full_name || player.name || player.nickname),
    ])
  );
  const guestNames = new Map(
    ((guestsResult.data || []) as PlayerRow[]).map((player) => [
      player.id,
      canonicalName(player.full_name || player.name || player.nickname),
    ])
  );

  const resolvedKingsMatches = kingsMatches.map((match) => ({
    ...match,
    participant_display_name:
      meaningfulKingsName(match.participant_name) ||
      (match.fackts_player_id ? playerNames.get(match.fackts_player_id) : "") ||
      (match.guest_hooper_id ? guestNames.get(match.guest_hooper_id) : "") ||
      null,
    opponent_display_name:
      meaningfulKingsName(match.opponent_name) ||
      (match.opponent_player_id ? playerNames.get(match.opponent_player_id) : "") ||
      (match.opponent_guest_hooper_id
        ? guestNames.get(match.opponent_guest_hooper_id)
        : "") ||
      null,
  }));

  return {
    events: (eventsResult.data || []) as EventRow[],
    records: (recordsResult.data || []) as EventRecordRow[],
    games: (gamesResult.data || []) as GameRow[],
    kingsMatches: resolvedKingsMatches,
  };
}

async function loadTopPerformers(game?: GameRow | null): Promise<Performer[]> {
  if (!game?.id) return [];

  const { data: statsData } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", game.id);

  const stats = ((statsData || []) as PlayerStatRow[])
    .filter((row) => row.player_id && playerContribution(row) > 0)
    .sort((a, b) => {
      const contribution = playerContribution(b) - playerContribution(a);
      return contribution || Number(b.points ?? 0) - Number(a.points ?? 0);
    })
    .slice(0, 3);

  const playerIds = stats
    .map((row) => row.player_id)
    .filter((id): id is string => Boolean(id));

  if (!playerIds.length) return [];

  const { data: playerData } = await supabase
    .from("players")
    .select("*")
    .in("id", playerIds);

  const playerMap = new Map(
    ((playerData || []) as PlayerRow[]).map((player) => [player.id, player])
  );

  return stats.flatMap((row) => {
    const player = row.player_id ? playerMap.get(row.player_id) : null;
    return player ? [{ player, stats: row }] : [];
  });
}

export default async function HomePage() {
  const { events, records, games, kingsMatches } = await loadHomepageData();
  const today = nairobiToday();

  const orderedEvents = [...events].sort((left, right) => {
    const priority: Record<EventState, number> = {
      live: 0,
      upcoming: 1,
      completed: 2,
    };
    const leftState = getEventState(left, today);
    const rightState = getEventState(right, today);
    const stateDifference = priority[leftState] - priority[rightState];

    if (stateDifference) return stateDifference;

    if (leftState === "upcoming") {
      return dateTime(left.start_date) - dateTime(right.start_date);
    }

    return dateTime(right.start_date || right.created_at) - dateTime(left.start_date || left.created_at);
  });

  const liveEvents = orderedEvents.filter(
    (event) => getEventState(event, today) === "live"
  );
  const upcomingEvents = orderedEvents.filter(
    (event) => getEventState(event, today) === "upcoming"
  );
  const completedEvents = orderedEvents.filter(
    (event) => getEventState(event, today) === "completed"
  );

  const currentKingsMatches = kingsMatches.filter(
    (match) => resolveFacktsKingsSeason(match) === DEFAULT_FACKTS_KINGS_SEASON
  );

  const kingsCompleted = currentKingsMatches
    .filter((match) => getKingsMatchStatus(match) === "completed")
    .sort(
      (left, right) =>
        dateTime(right.match_date || right.created_at) -
        dateTime(left.match_date || left.created_at)
    );
  const kingsUpcoming = currentKingsMatches
    .filter((match) => getKingsMatchStatus(match) === "upcoming")
    .sort(
      (left, right) =>
        dateTime(left.match_date || left.created_at) -
        dateTime(right.match_date || right.created_at)
    );
  const latestKingsResult = kingsCompleted[0] || null;
  const nextKingsMatch = kingsUpcoming[0] || null;
  const featuredKingsMatch = nextKingsMatch || latestKingsResult;
  const kingsCompetitors = new Set(
    currentKingsMatches.flatMap((match) => [
      meaningfulKingsName(
        match.participant_display_name || match.participant_name
      ).toLowerCase(),
      meaningfulKingsName(
        match.opponent_display_name || match.opponent_name
      ).toLowerCase(),
    ]).filter(Boolean)
  );

  const completedGames = games
    .filter((game) => getGameStatus(game) === "completed")
    .sort((left, right) => dateTime(getGameDate(right)) - dateTime(getGameDate(left)));
  const latestCompletedGame = completedGames[0] || null;
  const performers = await loadTopPerformers(latestCompletedGame);

  const kingsHeroImage =
    latestKingsResult?.poster_url ||
    featuredKingsMatch?.poster_url ||
    nextKingsMatch?.poster_url ||
    "/images/one-on-one-bg.png";

  const partnerRecords = records
    .filter((record) => record.record_type === "partner")
    .filter(
      (record, index, list) =>
        list.findIndex((candidate) => sameName(candidate.title, record.title)) === index
    )
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#F3F6F9] text-[#182230]">
      <section className="bg-[#0B1F3A] text-white">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12 lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-300">
              <span className="h-2 w-2 rounded-full bg-[#F58220]" />
              Digital competition · statistics · media
            </div>

            <h1 className="mt-5 max-w-3xl text-[2.35rem] font-black uppercase leading-[0.94] tracking-[-0.045em] sm:text-5xl lg:text-[3.55rem]">
              Basketball,{" "}
              <span className="block text-[#F58220]">documented properly.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Tournament statistics, player profiles, game media and organizer
              reporting — all in one platform.
            </p>

            <div className="mt-7 grid gap-3 sm:flex">
              <Link
                href="/competitions/fackts-kings"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-black text-[#0B1F3A] transition hover:bg-slate-100"
              >
                Enter FACKTS Kings
              </Link>
              <Link
                href="/book-coverage"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#F58220] px-6 py-3 text-sm font-black text-white transition hover:bg-[#dc6d10]"
              >
                Book Tournament Coverage
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
              <ContextStat value={String(kingsCompleted.length)} label="Kings games" />
              <ContextStat value={String(kingsUpcoming.length)} label="Upcoming" />
              <ContextStat value={String(kingsCompetitors.size)} label="Competitors" />
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/15 bg-[#102A4C] shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:min-h-[470px]">
            <img
              src={kingsHeroImage}
              alt="FACKTS Kings one-on-one competition"
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#0B1F3A]/20 to-transparent" />

            <div className="absolute left-4 top-4 rounded-lg border border-white/15 bg-[#071426]/85 px-3 py-2 backdrop-blur-md sm:left-6 sm:top-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                Primary FACKTS competition
              </p>
              <p className="mt-1 text-xl font-black uppercase text-white">
                FACKTS Kings
              </p>
            </div>

            <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-[#071426]/90 p-4 shadow-xl backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5">
              {latestKingsResult ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                      {kingsMatchLabel(latestKingsResult)}
                    </p>
                    <span className="shrink-0 rounded-md bg-[#1F8A5B] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                      Latest Kings result
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <ScoreTeam
                      name={kingsParticipant(latestKingsResult)}
                      score={numberValue(latestKingsResult.points_scored)}
                    />
                    <span className="text-xs font-black uppercase text-slate-500">Final</span>
                    <ScoreTeam
                      name={kingsOpponent(latestKingsResult)}
                      score={numberValue(latestKingsResult.points_allowed)}
                      align="right"
                    />
                  </div>
                </>
              ) : nextKingsMatch ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                      {kingsMatchLabel(nextKingsMatch)}
                    </p>
                    <span className="shrink-0 rounded-md bg-[#F58220] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                      Next matchup
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <ScoreTeam name={kingsParticipant(nextKingsMatch)} score={null} />
                    <span className="text-xs font-black uppercase text-slate-500">VS</span>
                    <ScoreTeam
                      name={kingsOpponent(nextKingsMatch)}
                      score={null}
                      align="right"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                    FACKTS Kings · 2026 season
                  </p>
                  <p className="mt-2 text-lg font-black">
                    One-on-one competition, documented game by game.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <SectionHeading
          eyebrow="Basketball activity"
          title="Live & upcoming events"
          text="Discover current competitions, what is next and the latest completed event records."
          href="/events"
          linkLabel="View all events"
        />

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Event status summary">
          <StatusSummary label="Live" count={liveEvents.length} tone="red" />
          <StatusSummary label="Upcoming" count={upcomingEvents.length} tone="navy" />
          <StatusSummary
            label="Recently completed"
            count={completedEvents.length}
            tone="green"
          />
        </div>

        {orderedEvents.length ? (
          <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-4">
            {orderedEvents.slice(0, 4).map((event) => {
              const state = getEventState(event, today);
              const eventRecords = records.filter(
                (record) => record.event_id === event.event_id
              );
              const teams = eventRecords.filter(
                (record) => record.record_type === "team"
              ).length;
              const results = eventRecords.filter(
                (record) => record.record_type === "result"
              ).length;

              return (
                <EventCard
                  key={event.event_id}
                  event={event}
                  state={state}
                  teams={teams}
                  games={results}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Published events will appear here"
            text="The event archive is ready for the next published competition record."
            href="/events"
            linkLabel="Open events"
          />
        )}
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <SectionHeading
            eyebrow="What FACKTS provides"
            title="One event. One connected record."
            text="The competition, its people, performance evidence and media stay connected from registration to the final report."
          />

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ServiceCard
              number="01"
              title="Tournament Management"
              text="Participant registration, teams, schedules, scores and organized competition records."
            />
            <ServiceCard
              number="02"
              title="Player & Game Statistics"
              text="Contextual performance data linked to the right game, event and player profile."
            />
            <ServiceCard
              number="03"
              title="Media Documentation"
              text="Photography, video, interviews and highlights connected to the basketball story."
            />
            <ServiceCard
              number="04"
              title="Organizer & Sponsor Reports"
              text="Professional event summaries that preserve outcomes, participation and delivered value."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <SectionHeading
          eyebrow="Featured competition"
          title="FACKTS Kings"
          text="The flagship FACKTS one-on-one competition: every matchup, result, player record and highlight connected in one place."
        />

        <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-[#0B1F3A] text-white shadow-sm">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[340px] overflow-hidden lg:min-h-[520px]">
              <img
                src={kingsHeroImage}
                alt="FACKTS Kings one-on-one basketball"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#0B1F3A]/20 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-7">
                <span className="inline-flex rounded-md bg-[#F58220] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                  2026 season
                </span>
                <h3 className="mt-3 max-w-2xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-6xl">
                  Run the court. Earn the crown.
                </h3>
                <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-200">
                  FACKTS Kings continues until every listed competitor completes
                  the season target. Results stay tied to the right player and matchup.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-7 lg:p-9">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                Competition snapshot
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                FACKTS Kings is the primary home-grown competition on the platform.
                Tournament and partner events remain discoverable in Events without
                replacing the identity of FACKTS Hoops.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <CompetitionMetric
                  value={String(kingsCompleted.length)}
                  label="Games completed"
                />
                <CompetitionMetric
                  value={String(kingsUpcoming.length)}
                  label="Upcoming games"
                />
                <CompetitionMetric
                  value={String(kingsCompetitors.size)}
                  label="Listed competitors"
                />
                <CompetitionMetric value="1-on-1" label="Competition format" />
              </div>

              {latestKingsResult ? (
                <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                      Latest result
                    </p>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      {kingsMatchLabel(latestKingsResult)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <ScoreTeam
                      name={kingsParticipant(latestKingsResult)}
                      score={numberValue(latestKingsResult.points_scored)}
                    />
                    <span className="text-xs font-black uppercase text-slate-500">Final</span>
                    <ScoreTeam
                      name={kingsOpponent(latestKingsResult)}
                      score={numberValue(latestKingsResult.points_allowed)}
                      align="right"
                    />
                  </div>
                </div>
              ) : null}

              {nextKingsMatch ? (
                <div className="mt-4 rounded-xl border border-white/15 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Next matchup
                  </p>
                  <p className="mt-1 font-black text-white">
                    {kingsParticipant(nextKingsMatch)} vs {kingsOpponent(nextKingsMatch)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(nextKingsMatch.match_date, true)}
                    {nextKingsMatch.venue ? ` · ${nextKingsMatch.venue}` : ""}
                  </p>
                </div>
              ) : null}

              <Link
                href="/competitions/fackts-kings"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#F58220] px-5 py-3 text-sm font-black text-white transition hover:bg-[#dc6d10] sm:w-auto"
              >
                Open FACKTS Kings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {performers.length && latestCompletedGame ? (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <SectionHeading
              eyebrow="Performance in context"
              title="Top performers"
              text={`Latest recorded game: ${getGameTitle(latestCompletedGame)} · ${formatDate(
                getGameDate(latestCompletedGame),
                true
              )}. Each card below represents one game in this performance snapshot.`}
              href={`/games/${latestCompletedGame.id}`}
              linkLabel="View game record"
            />

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {performers.map(({ player, stats }, index) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-[#F3F6F9] transition hover:-translate-y-1 hover:border-[#F58220] hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#102A4C]">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.full_name || player.name || "Basketball player"}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        style={{ objectPosition: player.photo_position || "center center" }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-[0.18em] text-white/65">
                        Player photo pending
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-md bg-[#F58220] px-2 py-1 text-[10px] font-black uppercase text-white">
                      #{index + 1} performance
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-[#0B1F3A]">
                          {player.full_name || player.name || "FACKTS player"}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {player.position || "Player"} · 1 game
                        </p>
                      </div>
                      <span className="rounded-md bg-[#1F8A5B] px-2 py-1 text-[9px] font-black uppercase text-white">
                        Recorded
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <PlayerMetric label="PTS" value={Number(stats.points || 0)} />
                      <PlayerMetric label="REB" value={Number(stats.rebounds || 0)} />
                      <PlayerMetric label="AST" value={Number(stats.assists || 0)} />
                    </div>
                    <p className="mt-4 truncate text-xs font-semibold text-slate-500">
                      Context: {getGameTitle(latestCompletedGame)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="overflow-hidden rounded-2xl bg-[#0B1F3A] text-white shadow-sm">
          <div className="grid lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="p-6 sm:p-9 lg:p-12">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
                For organizers
              </p>
              <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-[1.02] tracking-[-0.03em] sm:text-5xl">
                Running a tournament, league or showcase?
              </h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                FACKTS Hoops can help you register participants, record results
                and statistics, publish media and produce a professional event report.
              </p>
            </div>
            <div className="border-t border-white/10 bg-[#102A4C] p-6 sm:p-9 lg:h-full lg:border-l lg:border-t-0 lg:p-12">
              <Link
                href="/book-coverage"
                className="flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#F58220] px-6 py-3 text-sm font-black text-white transition hover:bg-[#dc6d10]"
              >
                Book Tournament Coverage
              </Link>
              <Link
                href="/events"
                className="mt-3 flex min-h-12 w-full items-center justify-center rounded-lg border border-white/25 px-6 py-3 text-sm font-black text-white hover:bg-white/10"
              >
                See Event Proof
              </Link>
            </div>
          </div>
        </div>
      </section>

      {partnerRecords.length ? (
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <SectionHeading
              eyebrow="Verified collaboration"
              title="Partners connected to delivered work"
              text="Each partner below is linked to a published FACKTS event record and a stated contribution."
              href="/partners"
              linkLabel="View partners"
            />

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {partnerRecords.map((partner) => {
                const event = events.find(
                  (candidate) => candidate.event_id === partner.event_id
                );

                return (
                  <article
                    key={partner.id}
                    className="rounded-xl border border-slate-200 bg-[#F3F6F9] p-5"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F58220]">
                      Verified event partner
                    </p>
                    <h3 className="mt-3 text-xl font-black text-[#0B1F3A]">
                      {partner.title}
                    </h3>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      {partner.subtitle || "Event contribution"}
                    </p>
                    {partner.details ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {partner.details}
                      </p>
                    ) : null}
                    {event ? (
                      <Link
                        href={`/events/${event.slug}`}
                        className="mt-5 inline-flex text-xs font-black text-[#0B1F3A] hover:text-[#F58220]"
                      >
                        Proof: {event.title} →
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="bg-[#071426] text-white">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 overflow-hidden rounded-xl bg-[#0B1F3A]">
                <img
                  src="/fackts-hoops-logo.png"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
              <div>
                <p className="text-sm font-black uppercase">FACKTS Hoops</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Basketball, documented properly
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
              The digital competition, statistics, media and player-documentation
              layer for basketball organizers, teams, players and fans.
            </p>
          </div>

          <FooterLinks
            title="Discover"
            links={[
              ["Events", "/events"],
              ["Games", "/games"],
              ["Teams", "/teams"],
              ["Players", "/players"],
              ["Media", "/media"],
              ["Merchandise", "/merch"],
            ]}
          />
          <FooterLinks
            title="Work with FACKTS"
            links={[
              ["Book Coverage", "/book-coverage"],
              ["Partners", "/partners"],
              ["Player Application", "/player-application"],
              ["Contact", "/contact"],
              ["Sign in", "/player"],
              ["Admin Login", "/admin/login"],
            ]}
          />
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>© {new Date().getFullYear()} FACKTS Hoops.</span>
            <span>Nairobi, Kenya · Competition records with context.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ContextStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function ScoreTeam({
  name,
  score,
  align = "left",
}: {
  name: string;
  score: number | null | undefined;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="truncate text-xs font-black uppercase text-white sm:text-sm">
        {name}
      </p>
      <p className="mt-1 text-3xl font-black text-orange-300 sm:text-4xl">
        {score ?? "–"}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F58220]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase leading-tight tracking-[-0.025em] text-[#0B1F3A] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {text}
        </p>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center text-sm font-black text-[#0B1F3A] hover:text-[#F58220]"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

function StatusSummary({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "red" | "navy" | "green";
}) {
  const dotClass =
    tone === "red"
      ? "bg-[#C23B3B]"
      : tone === "green"
        ? "bg-[#1F8A5B]"
        : "bg-[#0B1F3A]";

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#182230]">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
      <span className="text-slate-400">{count}</span>
    </div>
  );
}

function EventCard({
  event,
  state,
  teams,
  games,
}: {
  event: EventRow;
  state: EventState;
  teams: number;
  games: number;
}) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group w-[84vw] max-w-[330px] shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#F58220] hover:shadow-lg sm:w-[360px] sm:max-w-none lg:w-auto"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#102A4C]">
        {eventImage(event) ? (
          <img
            src={eventImage(event)}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs font-black uppercase tracking-[0.18em] text-white/65">
            Event image pending
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/75 via-transparent to-transparent" />
        <span
          className={`absolute left-3 top-3 rounded-md px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] ${statusClass(
            state
          )}`}
        >
          {statusLabel(state)}
        </span>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#F58220]">
          {event.event_type || "Basketball event"} ·{" "}
          {event.age_category || "Open"}
        </p>
        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-tight text-[#0B1F3A]">
          {event.title}
        </h3>
        <p className="mt-3 text-xs font-bold text-slate-500">
          {eventDateLabel(event)}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {[event.venue, event.location].filter(Boolean).join(" · ") ||
            "Venue to be confirmed"}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-500">
            {teams} teams · {games} games
          </span>
          <span className="text-xs font-black text-[#0B1F3A] group-hover:text-[#F58220]">
            View event →
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  text,
  href,
  linkLabel,
}: {
  title: string;
  text: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center">
      <p className="font-black text-[#0B1F3A]">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-black text-[#F58220]">
        {linkLabel} →
      </Link>
    </div>
  );
}

function ServiceCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F3A] text-xs font-black text-orange-300">
        {number}
      </div>
      <h3 className="mt-5 text-lg font-black leading-tight text-[#0B1F3A]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}

function CompetitionMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function PlayerMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
      <p className="text-xl font-black text-[#0B1F3A]">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: Array<[string, string]>;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
        {title}
      </p>
      <div className="mt-4 grid gap-2">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
