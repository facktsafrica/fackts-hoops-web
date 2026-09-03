/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabase";
import { getGameCategory, getTeamSide } from "@/lib/hoops/gameContext";
import { resolveFacktsKingsSeason } from "@/lib/hoops/facktsKings";

/* =========================================================
   PUBLIC TYPES
   ========================================================= */

export type PublicActivityKind =
  | "league"
  | "event"
  | "one_on_one"
  | "community_takeover"
  | "high_school_takeover"
  | "university_takeover"
  | "competition"
  | "friendly"
  | "other";

export type PublicTeamIdentity = {
  id?: string | null;
  slug: string;
  name: string;
  shortName?: string | null;
  aliases?: string[] | string | null;
};

export type PublicMediaItem = {
  key: string;
  title: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string;
  source: "game_field" | "game_media" | "media_asset";
  role: string;
};

export type PublicActivityGame = {
  id: string;
  title: string;
  gameDate: string | null;
  status: string;
  verificationStatus: string;

  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;

  venue: string;
  court: string;
  location: string;
  stage: string;
  format: string;

  posterUrl: string;
  videoUrl: string;
  highlightUrl: string;

  officials: string[];
  tableOfficials: string[];

  hasStats: boolean;
  statLineCount: number;
  canonicalLineCount: number;
  legacyLineCount: number;
  hasCanonicalBoxScore: boolean;

  media: PublicMediaItem[];
};

export type PublicPlayerRanking = {
  key: string;

  playerId?: string | null;
  guestHooperId?: string | null;
  rosterMemberId?: string | null;

  name: string;
  profileHref?: string | null;

  gamesPlayed: number;
  starts: number;
  playerOfGameCount: number;

  points: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plusMinus: number;
  minutes: number;

  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  twoMade: number;
  twoAttempted: number;
  threeMade: number;
  threeAttempted: number;
  threePointers: number;
  ftMade: number;
  ftAttempted: number;

  pointsPerGame: number;
  reboundsPerGame: number;
  offensiveReboundsPerGame: number;
  defensiveReboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  foulsPerGame: number;
  plusMinusPerGame: number;
  minutesPerGame: number;

  fieldGoalPercentage: number;
  twoPointPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;

  periodStats: Record<string, number>;
  extraStats: Record<string, number>;
};

export type PublicLeaderboardSet = {
  pointsPerGame: PublicPlayerRanking[];
  totalPoints: PublicPlayerRanking[];
  reboundsPerGame: PublicPlayerRanking[];
  totalRebounds: PublicPlayerRanking[];
  assistsPerGame: PublicPlayerRanking[];
  totalAssists: PublicPlayerRanking[];
  stealsPerGame: PublicPlayerRanking[];
  totalSteals: PublicPlayerRanking[];
  blocksPerGame: PublicPlayerRanking[];
  totalBlocks: PublicPlayerRanking[];
  threePointersMade: PublicPlayerRanking[];
  fieldGoalPercentage: PublicPlayerRanking[];
  threePointPercentage: PublicPlayerRanking[];
  freeThrowPercentage: PublicPlayerRanking[];
  plusMinus: PublicPlayerRanking[];
  minutesPerGame: PublicPlayerRanking[];
  gamesPlayed: PublicPlayerRanking[];
  playerOfGame: PublicPlayerRanking[];
};

export type PublicActivityRecord = {
  key: string;
  kind: PublicActivityKind;
  title: string;
  competitionSlug?: string | null;
  href?: string | null;
  seasonLabel?: string | null;
  division?: string | null;

  gameCount: number;
  completedGames: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;

  leaders: PublicPlayerRanking[];
  leaderboards: PublicLeaderboardSet;
  games: PublicActivityGame[];
};

export type PublicTeamIntelligence = {
  summary: {
    totalGames: number;
    completedGames: number;
    leagues: number;
    events: number;
    competitions: number;
    communityTakeovers: number;
    highSchoolTakeovers: number;
    universityTakeovers: number;
    oneOnOneCompetitions: number;
    friendlies: number;
    totalStatLines: number;
    canonicalStatLines: number;
    legacyStatLines: number;
    rankedPlayers: number;
    mediaItems: number;
    venues: number;
  };

  performance: {
    played: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifference: number;
    winPercentage: number;
  };

  players: PublicPlayerRanking[];
  leaderboards: PublicLeaderboardSet;
  activities: PublicActivityRecord[];
};

/* =========================================================
   DATABASE SHAPES
   ========================================================= */

type JsonRecord = Record<string, any>;

type GameRow = JsonRecord & {
  id: string;
  game_category?: string | null;
  competition_id?: string | null;
  event_id?: string | null;
  league_id?: string | null;
  legacy_one_on_one_id?: string | null;

  home_team_id?: string | null;
  away_team_id?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  team_name?: string | null;
  opponent?: string | null;
  opponent_name?: string | null;

  title?: string | null;
  game_title?: string | null;
  competition_name?: string | null;
  season_label?: string | null;
  division?: string | null;
  match_type?: string | null;
  game_format?: string | null;
  game_stage?: string | null;
  round_name?: string | null;

  game_date?: string | null;
  date?: string | null;
  status?: string | null;
  verification_status?: string | null;
  is_public?: boolean | null;

  home_score?: number | string | null;
  away_score?: number | string | null;
  team_score?: number | string | null;
  fackts_score?: number | string | null;
  opponent_score?: number | string | null;

  venue?: string | null;
  court?: string | null;
  location?: string | null;

  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  game_video_url?: string | null;
  highlight_url?: string | null;

  officials?: unknown;
  table_officials?: unknown;
};

type StatSourceRow = JsonRecord & {
  id: string;
  game_id?: string | null;
  team_side?: string | null;
  team_id?: string | null;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  source_guest_hooper_id?: string | null;
  roster_member_id?: string | null;
  display_name?: string | null;
  player_name?: string | null;
  verification_status?: string | null;
  is_public?: boolean | null;
};

type PlayerLookup = JsonRecord & {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
};

type GuestLookup = JsonRecord & {
  id: string;
  full_name?: string | null;
  guest_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  source_player_id?: string | null;
};

type LeagueRow = JsonRecord & {
  id: string;
  slug?: string | null;
  name?: string | null;
  short_name?: string | null;
};

type EventRow = JsonRecord & {
  event_id: string;
  slug?: string | null;
  title?: string | null;
  organizer_name?: string | null;
  event_type?: string | null;
  is_public?: boolean | null;
};

type CompetitionRow = JsonRecord & {
  id: string;
  slug?: string | null;
  name?: string | null;
  short_name?: string | null;
  organizer_name?: string | null;
  is_public?: boolean | null;
};

type GameMediaRow = JsonRecord & {
  id: string;
  game_id?: string | null;
  title?: string | null;
  media_type?: string | null;
  url?: string | null;
  video_url?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  is_public?: boolean | null;
  publish_status?: string | null;
};

type MediaLinkRow = JsonRecord & {
  asset_id?: string | null;
  owner_type?: string | null;
  owner_id?: string | null;
  link_role?: string | null;
};

type MediaAssetRow = JsonRecord & {
  id: string;
  title?: string | null;
  media_type?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  is_public?: boolean | null;
  publish_status?: string | null;
};

type UnifiedStatLine = {
  id: string;
  source: "canonical_box" | "player_game_stats" | "guest_game_stats";
  gameId: string;
  teamSide: "home" | "away" | "neutral";
  teamId?: string | null;

  playerId?: string | null;
  guestHooperId?: string | null;
  rosterMemberId?: string | null;

  displayName: string;
  profileHref?: string | null;

  starter: boolean;
  playerOfGame: boolean;

  points: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plusMinus: number;
  minutes: number;

  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  twoMade: number;
  twoAttempted: number;
  threeMade: number;
  threeAttempted: number;
  ftMade: number;
  ftAttempted: number;

  periodStats: Record<string, number>;
  extraStats: Record<string, number>;
};

/* =========================================================
   GENERIC HELPERS
   ========================================================= */

const db = supabase as any;
const PAGE_SIZE = 1000;
const ID_BATCH_SIZE = 150;

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactIdentity(value: unknown) {
  return normalize(value).replace(/\s+/g, "");
}

function keyText(value: unknown) {
  return normalize(value).replace(/\s+/g, "-");
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function firstBoolean(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === true) return true;
    if (typeof value === "string" && value.toLowerCase() === "true") return true;
    if (value === 1) return true;
  }
  return false;
}

function minutesValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = text(value);
  if (!raw) return 0;
  if (/^\d+:\d{1,2}$/.test(raw)) {
    const [minutes, seconds] = raw.split(":").map(Number);
    return minutes + Math.min(Math.max(seconds, 0), 59) / 60;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentage(made: number, attempted: number) {
  return attempted > 0 ? (made / attempted) * 100 : 0;
}

function sideValue(value: unknown): "home" | "away" | "neutral" {
  const side = normalize(value);
  if (side === "away") return "away";
  if (side === "neutral") return "neutral";
  return "home";
}

function parseStringList(value: unknown) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
      } catch {
        // Fall through to delimiter parsing.
      }
    }
    return raw
      .split(/\r?\n|\s*[;,]\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [] as string[];
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value) return {};
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source as Record<string, unknown>)) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) result[key] = parsed;
  }
  return result;
}

function mergeNumberRecord(target: Record<string, number>, source: Record<string, number>) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + value;
  }
}

function chunk<T>(values: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    groups.push(values.slice(index, index + size));
  }
  return groups;
}

async function collectPages<T>(
  runPage: (from: number, to: number) => Promise<{ data?: T[] | null; error?: any }>,
  label: string,
  throwOnError = false,
) {
  const rows: T[] = [];
  for (let page = 0; page < 100; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const result = await runPage(from, to);
    if (result.error) {
      if (throwOnError) throw result.error;
      console.error(`${label} load failed:`, result.error);
      return rows;
    }
    const pageRows = result.data || [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchRowsByIds<T>(
  table: string,
  column: string,
  ids: string[],
  options?: { select?: string; throwOnError?: boolean },
) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return [] as T[];
  const all: T[] = [];
  for (const batch of chunk(uniqueIds, ID_BATCH_SIZE)) {
    const rows = await collectPages<T>(
      (from, to) =>
        db
          .from(table)
          .select(options?.select || "*")
          .in(column, batch)
          .range(from, to),
      table,
      options?.throwOnError === true,
    );
    all.push(...rows);
  }
  return all;
}

async function fetchMediaLinks(ownerType: string, ownerIds: string[]) {
  const uniqueIds = Array.from(new Set(ownerIds.filter(Boolean)));
  if (!uniqueIds.length) return [] as MediaLinkRow[];
  const all: MediaLinkRow[] = [];
  for (const batch of chunk(uniqueIds, ID_BATCH_SIZE)) {
    const rows = await collectPages<MediaLinkRow>(
      (from, to) =>
        db
          .from("media_links")
          .select("*")
          .eq("owner_type", ownerType)
          .in("owner_id", batch)
          .range(from, to),
      `media_links:${ownerType}`,
      false,
    );
    all.push(...rows);
  }
  return all;
}

/* =========================================================
   TEAM / GAME HELPERS
   ========================================================= */

function aliasesForTeam(team: PublicTeamIdentity) {
  const suppliedAliases = Array.isArray(team.aliases)
    ? team.aliases
    : typeof team.aliases === "string"
      ? team.aliases.split(/[,;|]/g)
      : [];

  return Array.from(
    new Set(
      [team.name, team.shortName, ...suppliedAliases]
        .map(text)
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

function normalizedAliasesForTeam(team: PublicTeamIdentity) {
  return new Set(aliasesForTeam(team).map(normalize).filter(Boolean));
}

function isFacktsOrganization(team: PublicTeamIdentity) {
  if (team.slug === "fackts-africa") return true;
  const aliases = normalizedAliasesForTeam(team);
  return aliases.has("fackts") || aliases.has("fackts africa") || aliases.has("fackts hoops");
}

function homeTeamName(game: GameRow) {
  return text(game.home_team_name || game.team_name) || "FACKTS";
}

function awayTeamName(game: GameRow) {
  return text(game.away_team_name || game.opponent_name || game.opponent) || "Opponent";
}

function homeScore(game: GameRow) {
  return nullableNumber(game.home_score ?? game.team_score ?? game.fackts_score);
}

function awayScore(game: GameRow) {
  return nullableNumber(game.away_score ?? game.opponent_score);
}

function gameDate(game: GameRow) {
  return text(game.game_date || game.date) || null;
}

function gameSide(game: GameRow, team: PublicTeamIdentity) {
  return getTeamSide(game, {
    id: team.id,
    slug: team.slug,
    name: team.name,
    short_name: team.shortName,
    aliases: aliasesForTeam(team),
  });
}

function gameText(game: GameRow, event?: EventRow | null) {
  return normalize(
    [
      game.title,
      game.game_title,
      game.competition_name,
      game.match_type,
      game.game_format,
      game.game_stage,
      game.round_name,
      homeTeamName(game),
      awayTeamName(game),
      event?.title,
      event?.event_type,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function completedGame(game: GameRow) {
  const status = normalize(game.status);
  if (["completed", "played", "final", "finished"].includes(status)) return true;
  return homeScore(game) !== null && awayScore(game) !== null;
}

function isFacktsOwnedEvent(event?: EventRow | null) {
  if (!event) return false;
  return normalize(event.organizer_name).includes("fackts");
}

function activityKind(game: GameRow, event?: EventRow | null): PublicActivityKind {
  const identity = gameText(game, event);
  const category = getGameCategory(game);

  // Takeovers must be resolved before 1v1 so a takeover never becomes Kings.
  if (category === "court_takeover" && /high school/.test(identity)) return "high_school_takeover";
  if (category === "court_takeover" && /(university|college|campus)/.test(identity)) return "university_takeover";
  if (category === "court_takeover") {
    return "community_takeover";
  }

  if (category === "one_on_one") return "one_on_one";
  if (category === "league") return "league";
  if (category === "event") return "event";
  if (category === "friendly") return "friendly";
  if (category === "competition") return "competition";
  return "other";
}

function isFacktsActivity(game: GameRow, event?: EventRow | null) {
  const kind = activityKind(game, event);
  if (["one_on_one", "community_takeover", "high_school_takeover", "university_takeover"].includes(kind)) {
    return true;
  }
  return gameText(game, event).includes("fackts") || isFacktsOwnedEvent(event);
}

async function fetchAllGames() {
  return collectPages<GameRow>(
    (from, to) =>
      db
        .from("games")
        .select("*")
        .order("game_date", { ascending: false })
        .range(from, to),
    "games",
    true,
  );
}

async function fetchTeamGames(team: PublicTeamIdentity) {
  if (isFacktsOrganization(team)) return fetchAllGames();

  const byId: GameRow[] = [];
  if (team.id) {
    const safeId = text(team.id).replace(/[(),]/g, "");
    const rows = await collectPages<GameRow>(
      (from, to) =>
        db
          .from("games")
          .select("*")
          .or(`home_team_id.eq.${safeId},away_team_id.eq.${safeId}`)
          .order("game_date", { ascending: false })
          .range(from, to),
      "games:team-id",
      false,
    );
    byId.push(...rows);
  }

  const byName: GameRow[] = [];
  for (const alias of aliasesForTeam(team)) {
    for (const column of ["home_team_name", "away_team_name", "team_name", "opponent_name"] as const) {
      const rows = await collectPages<GameRow>(
        (from, to) =>
          db
            .from("games")
            .select("*")
            .ilike(column, alias)
            .order("game_date", { ascending: false })
            .range(from, to),
        `games:${column}`,
        false,
      );
      byName.push(...rows);
    }
  }

  const unique = new Map<string, GameRow>();
  [...byId, ...byName].forEach((game) => {
    if (game?.id) unique.set(text(game.id), game);
  });
  return Array.from(unique.values());
}

/* =========================================================
   COMPETITION RESOLUTION
   ========================================================= */

function competitionSlugForGame(
  game: GameRow,
  event: EventRow | undefined,
  competitions: CompetitionRow[],
) {
  if (game.competition_id) {
    const linked = competitions.find(
      (competition) => text(competition.id) === text(game.competition_id),
    );
    if (linked?.slug) return text(linked.slug);
  }

  const identity = compactIdentity(gameText(game, event));

  if (identity.includes("courttakeover") || identity.includes("communitytakeover")) {
    return "court-takeovers";
  }
  if (
    identity.includes("highschooltakeover") ||
    identity.includes("universitytakeover") ||
    identity.includes("collegetakeover") ||
    identity.includes("campustakeover")
  ) {
    return "court-takeovers";
  }
  if (identity.includes("facktskings") || identity.includes("1v1") || identity.includes("oneonone")) {
    return "fackts-kings";
  }

  const competitionIdentity = normalize(game.competition_name);
  if (!competitionIdentity) return null;

  const match = competitions.find((competition) => {
    const candidates = [competition.slug, competition.name, competition.short_name]
      .map(normalize)
      .filter(Boolean);
    return candidates.includes(competitionIdentity);
  });

  return text(match?.slug) || null;
}

function activityKey(
  game: GameRow,
  event: EventRow | undefined,
  competitions: CompetitionRow[],
) {
  const kind = activityKind(game, event);
  if (kind === "league" && game.league_id) {
    return [
      "league",
      game.league_id,
      keyText(game.season_label || "season"),
      keyText(game.division || "division"),
    ].join(":");
  }
  if (kind === "event" && game.event_id) return `event:${game.event_id}`;
  const season = keyText(
    kind === "one_on_one"
      ? resolveFacktsKingsSeason(game.season_label, gameDate(game))
      : game.season_label || "season-unspecified",
  );
  const division = keyText(game.division || "division-unspecified");
  const competitionId = text(game.competition_id);
  if (kind === "one_on_one") {
    return `competition:${competitionId || "fackts-kings"}:${season}`;
  }
  if (kind === "community_takeover") {
    return `competition:${competitionId || "court-takeovers"}:${season}:community`;
  }
  if (kind === "high_school_takeover") {
    return `competition:${competitionId || "court-takeovers"}:${season}:high-school`;
  }
  if (kind === "university_takeover") {
    return `competition:${competitionId || "court-takeovers"}:${season}:university`;
  }
  if (kind === "competition") {
    const slug = competitionSlugForGame(game, event, competitions);
    return `competition:${competitionId || slug || keyText(game.competition_name || "competition")}:${season}:${division}`;
  }
  if (kind === "friendly") return "friendly";
  return `other:${keyText(game.competition_name || game.match_type || "games")}`;
}

function activityTitle(
  game: GameRow,
  event: EventRow | undefined,
  leagues: Map<string, LeagueRow>,
) {
  const kind = activityKind(game, event);
  if (kind === "league" && game.league_id) {
    const league = leagues.get(text(game.league_id));
    return text(league?.short_name || league?.name || game.competition_name) || "League";
  }
  if (kind === "event") return text(event?.title || game.competition_name || game.title) || "Basketball Event";
  if (kind === "one_on_one") return "FACKTS Kings";
  if (kind === "community_takeover") return "Community Court Takeovers";
  if (kind === "high_school_takeover") return "High School Takeovers";
  if (kind === "university_takeover") return "University Takeovers";
  if (kind === "friendly") return "Friendlies";
  return text(game.competition_name || game.title) || "Basketball Record";
}

function activityHref(
  game: GameRow,
  event: EventRow | undefined,
  leagues: Map<string, LeagueRow>,
  competitions: CompetitionRow[],
) {
  const kind = activityKind(game, event);
  if (kind === "league" && game.league_id) {
    const slug = text(leagues.get(text(game.league_id))?.slug);
    return slug ? `/leagues/${slug}` : null;
  }
  if (kind === "event") {
    const slug = text(event?.slug);
    return slug ? `/events/${slug}` : "/events";
  }
  if (kind === "one_on_one") return "/competitions/fackts-kings";
  if (["community_takeover", "high_school_takeover", "university_takeover"].includes(kind)) {
    return "/competitions/court-takeovers";
  }
  if (kind === "competition") {
    const slug = competitionSlugForGame(game, event, competitions);
    return slug ? `/competitions/${slug}` : null;
  }
  return null;
}

/* =========================================================
   STAT NORMALIZATION
   ========================================================= */

function playerName(player?: PlayerLookup | null) {
  return text(player?.full_name || player?.name || player?.nickname) || "Player";
}

function guestName(guest?: GuestLookup | null) {
  return text(guest?.full_name || guest?.guest_name || guest?.name || guest?.nickname) || "Guest hooper";
}

function rowPeriodStats(row: JsonRecord) {
  const result = numericRecord(row.period_values);
  for (const key of ["q1", "q2", "q3", "q4"]) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== "") {
      result[key] = numberValue(row[key]);
    }
  }
  return result;
}

function rowExtraStats(row: JsonRecord) {
  const result = numericRecord(row.extra_stats);
  const aliases: Array<[string, string[]]> = [
    ["pir", ["pir", "performance_index_rating"]],
    ["eff", ["eff", "efficiency"]],
    ["fouls_drawn", ["fouls_drawn", "pfd"]],
    ["shots_rejected", ["shots_rejected", "sr"]],
  ];
  for (const [target, keys] of aliases) {
    const value = firstNumber(row, keys);
    if (value || keys.some((key) => row[key] === 0 || row[key] === "0")) result[target] = value;
  }
  return result;
}

function normalizeStatRow(
  row: StatSourceRow,
  source: UnifiedStatLine["source"],
  playerMap: Map<string, PlayerLookup>,
  guestMap: Map<string, GuestLookup>,
): UnifiedStatLine | null {
  const gameId = text(row.game_id);
  if (!gameId) return null;

  const playerId = text(row.player_id) || null;
  const guestHooperId =
    text(row.guest_hooper_id || row.source_guest_hooper_id) || null;
  const rosterMemberId = text(row.roster_member_id) || null;

  const player = playerId ? playerMap.get(playerId) || null : null;
  const guest = guestHooperId ? guestMap.get(guestHooperId) || null : null;

  const displayName =
    text(row.display_name || row.player_name) ||
    (player ? playerName(player) : "") ||
    (guest ? guestName(guest) : "") ||
    "Player";

  const twoMade = firstNumber(row, ["two_made", "two_pm", "two_points_made"]);
  const twoAttempted = firstNumber(row, ["two_attempted", "two_pa", "two_points_attempted"]);
  const threeMade = firstNumber(row, [
    "three_made",
    "three_pointers_made",
    "three_pm",
    "threes_made",
  ]);
  const threeAttempted = firstNumber(row, ["three_attempted", "three_pa", "three_pointers_attempted"]);
  const ftMade = firstNumber(row, ["ft_made", "free_throws_made", "ftm"]);
  const ftAttempted = firstNumber(row, ["ft_attempted", "free_throws_attempted", "fta"]);

  const explicitFgm = firstNumber(row, ["field_goals_made", "fg_made", "fgm"]);
  const explicitFga = firstNumber(row, ["field_goals_attempted", "fg_attempted", "fga"]);
  const fieldGoalsMade = explicitFgm || twoMade + threeMade;
  const fieldGoalsAttempted = explicitFga || twoAttempted + threeAttempted;

  const profileHref = playerId
    ? `/players/${playerId}`
    : guestHooperId
      ? `/players/guest-${guestHooperId}`
      : null;

  return {
    id: `${source}:${text(row.id)}`,
    source,
    gameId,
    teamSide: sideValue(row.team_side),
    teamId: text(row.team_id) || null,
    playerId,
    guestHooperId,
    rosterMemberId,
    displayName,
    profileHref,

    starter: firstBoolean(row, ["starter", "is_starter", "started"]),
    playerOfGame: firstBoolean(row, [
      "player_of_game",
      "is_player_of_game",
      "is_homepage_pog",
      "is_player_of_the_game",
    ]),

    points: firstNumber(row, ["points", "pts"]),
    rebounds: firstNumber(row, ["rebounds", "total_rebounds", "reb"]),
    offensiveRebounds: firstNumber(row, ["offensive_rebounds", "oreb"]),
    defensiveRebounds: firstNumber(row, ["defensive_rebounds", "dreb"]),
    assists: firstNumber(row, ["assists", "ast"]),
    steals: firstNumber(row, ["steals", "stl"]),
    blocks: firstNumber(row, ["blocks", "blk"]),
    turnovers: firstNumber(row, ["turnovers", "tov"]),
    fouls: firstNumber(row, ["fouls", "personal_fouls", "pf"]),
    plusMinus: firstNumber(row, ["plus_minus", "plusminus"]),
    minutes: minutesValue(row.minutes ?? row.minutes_played),

    fieldGoalsMade,
    fieldGoalsAttempted,
    twoMade,
    twoAttempted,
    threeMade,
    threeAttempted,
    ftMade,
    ftAttempted,

    periodStats: rowPeriodStats(row),
    extraStats: rowExtraStats(row),
  };
}

function lineIdentityKeys(line: UnifiedStatLine) {
  const prefix = `${line.gameId}:${line.teamSide}`;
  const keys: string[] = [];
  if (line.playerId) keys.push(`${prefix}:player:${line.playerId}`);
  if (line.guestHooperId) keys.push(`${prefix}:guest:${line.guestHooperId}`);
  if (line.rosterMemberId) keys.push(`${prefix}:roster:${line.rosterMemberId}`);
  const name = normalize(line.displayName);
  if (name) keys.push(`${prefix}:name:${name}`);
  return keys;
}

function mergeStatLines(
  canonical: UnifiedStatLine[],
  playerStats: UnifiedStatLine[],
  guestStats: UnifiedStatLine[],
) {
  const merged: UnifiedStatLine[] = [];
  const seen = new Set<string>();

  function add(line: UnifiedStatLine) {
    const keys = lineIdentityKeys(line);
    if (keys.some((key) => seen.has(key))) return;
    merged.push(line);
    keys.forEach((key) => seen.add(key));
  }

  // New canonical box score wins. Existing shared player stats fill gaps.
  // Legacy guest stats are last because many were already migrated into player_game_stats.
  canonical.forEach(add);
  playerStats.forEach(add);
  guestStats.forEach(add);
  return merged;
}

/* =========================================================
   TEAM STAT FILTERING
   ========================================================= */

function lineBelongsToTeam(
  line: UnifiedStatLine,
  game: GameRow,
  team: PublicTeamIdentity,
) {
  if (team.id && line.teamId && text(line.teamId) === text(team.id)) return true;
  const expectedSide = gameSide(game, team);
  return Boolean(expectedSide && line.teamSide === expectedSide);
}

/* =========================================================
   PLAYER AGGREGATION + LEADERBOARDS
   ========================================================= */

function aggregatePlayers(lines: UnifiedStatLine[]): PublicPlayerRanking[] {
  type WorkingPlayer = {
    key: string;
    playerId?: string | null;
    guestHooperId?: string | null;
    rosterMemberId?: string | null;
    name: string;
    profileHref?: string | null;
    games: Set<string>;
    starts: number;
    playerOfGameCount: number;
    points: number;
    rebounds: number;
    offensiveRebounds: number;
    defensiveRebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
    plusMinus: number;
    minutes: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    twoMade: number;
    twoAttempted: number;
    threeMade: number;
    threeAttempted: number;
    ftMade: number;
    ftAttempted: number;
    periodStats: Record<string, number>;
    extraStats: Record<string, number>;
  };

  const players = new Map<string, WorkingPlayer>();

  for (const line of lines) {
    const key = line.playerId
      ? `player:${line.playerId}`
      : line.guestHooperId
        ? `guest:${line.guestHooperId}`
        : line.rosterMemberId
          ? `roster:${line.rosterMemberId}`
          : `name:${keyText(line.displayName)}`;

    const current =
      players.get(key) ||
      ({
        key,
        playerId: line.playerId || null,
        guestHooperId: line.guestHooperId || null,
        rosterMemberId: line.rosterMemberId || null,
        name: line.displayName,
        profileHref: line.profileHref || null,
        games: new Set<string>(),
        starts: 0,
        playerOfGameCount: 0,
        points: 0,
        rebounds: 0,
        offensiveRebounds: 0,
        defensiveRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fouls: 0,
        plusMinus: 0,
        minutes: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        twoMade: 0,
        twoAttempted: 0,
        threeMade: 0,
        threeAttempted: 0,
        ftMade: 0,
        ftAttempted: 0,
        periodStats: {},
        extraStats: {},
      } satisfies WorkingPlayer);

    const gameWasNew = !current.games.has(line.gameId);
    current.games.add(line.gameId);
    if (gameWasNew && line.starter) current.starts += 1;
    if (gameWasNew && line.playerOfGame) current.playerOfGameCount += 1;

    current.points += line.points;
    current.rebounds += line.rebounds;
    current.offensiveRebounds += line.offensiveRebounds;
    current.defensiveRebounds += line.defensiveRebounds;
    current.assists += line.assists;
    current.steals += line.steals;
    current.blocks += line.blocks;
    current.turnovers += line.turnovers;
    current.fouls += line.fouls;
    current.plusMinus += line.plusMinus;
    current.minutes += line.minutes;

    current.fieldGoalsMade += line.fieldGoalsMade;
    current.fieldGoalsAttempted += line.fieldGoalsAttempted;
    current.twoMade += line.twoMade;
    current.twoAttempted += line.twoAttempted;
    current.threeMade += line.threeMade;
    current.threeAttempted += line.threeAttempted;
    current.ftMade += line.ftMade;
    current.ftAttempted += line.ftAttempted;

    mergeNumberRecord(current.periodStats, line.periodStats);
    mergeNumberRecord(current.extraStats, line.extraStats);

    if (!current.profileHref && line.profileHref) current.profileHref = line.profileHref;
    if (!current.playerId && line.playerId) current.playerId = line.playerId;
    if (!current.guestHooperId && line.guestHooperId) current.guestHooperId = line.guestHooperId;
    if (!current.rosterMemberId && line.rosterMemberId) current.rosterMemberId = line.rosterMemberId;

    players.set(key, current);
  }

  return Array.from(players.values())
    .map((player): PublicPlayerRanking => {
      const gamesPlayed = player.games.size;
      const perGame = (value: number) => (gamesPlayed ? value / gamesPlayed : 0);

      return {
        key: player.key,
        playerId: player.playerId,
        guestHooperId: player.guestHooperId,
        rosterMemberId: player.rosterMemberId,
        name: player.name,
        profileHref: player.profileHref,

        gamesPlayed,
        starts: player.starts,
        playerOfGameCount: player.playerOfGameCount,

        points: player.points,
        rebounds: player.rebounds,
        offensiveRebounds: player.offensiveRebounds,
        defensiveRebounds: player.defensiveRebounds,
        assists: player.assists,
        steals: player.steals,
        blocks: player.blocks,
        turnovers: player.turnovers,
        fouls: player.fouls,
        plusMinus: player.plusMinus,
        minutes: player.minutes,

        fieldGoalsMade: player.fieldGoalsMade,
        fieldGoalsAttempted: player.fieldGoalsAttempted,
        twoMade: player.twoMade,
        twoAttempted: player.twoAttempted,
        threeMade: player.threeMade,
        threeAttempted: player.threeAttempted,
        threePointers: player.threeMade,
        ftMade: player.ftMade,
        ftAttempted: player.ftAttempted,

        pointsPerGame: perGame(player.points),
        reboundsPerGame: perGame(player.rebounds),
        offensiveReboundsPerGame: perGame(player.offensiveRebounds),
        defensiveReboundsPerGame: perGame(player.defensiveRebounds),
        assistsPerGame: perGame(player.assists),
        stealsPerGame: perGame(player.steals),
        blocksPerGame: perGame(player.blocks),
        turnoversPerGame: perGame(player.turnovers),
        foulsPerGame: perGame(player.fouls),
        plusMinusPerGame: perGame(player.plusMinus),
        minutesPerGame: perGame(player.minutes),

        fieldGoalPercentage: percentage(player.fieldGoalsMade, player.fieldGoalsAttempted),
        twoPointPercentage: percentage(player.twoMade, player.twoAttempted),
        threePointPercentage: percentage(player.threeMade, player.threeAttempted),
        freeThrowPercentage: percentage(player.ftMade, player.ftAttempted),

        periodStats: player.periodStats,
        extraStats: player.extraStats,
      };
    })
    .sort(
      (left, right) =>
        right.pointsPerGame - left.pointsPerGame ||
        right.reboundsPerGame - left.reboundsPerGame ||
        right.assistsPerGame - left.assistsPerGame ||
        left.name.localeCompare(right.name),
    );
}

function sortedRankings(
  players: PublicPlayerRanking[],
  value: (player: PublicPlayerRanking) => number,
  eligible: (player: PublicPlayerRanking) => boolean = () => true,
) {
  return players
    .filter(eligible)
    .slice()
    .sort(
      (left, right) =>
        value(right) - value(left) ||
        right.gamesPlayed - left.gamesPlayed ||
        left.name.localeCompare(right.name),
    );
}

function buildLeaderboards(players: PublicPlayerRanking[]): PublicLeaderboardSet {
  return {
    pointsPerGame: sortedRankings(players, (player) => player.pointsPerGame),
    totalPoints: sortedRankings(players, (player) => player.points),
    reboundsPerGame: sortedRankings(players, (player) => player.reboundsPerGame),
    totalRebounds: sortedRankings(players, (player) => player.rebounds),
    assistsPerGame: sortedRankings(players, (player) => player.assistsPerGame),
    totalAssists: sortedRankings(players, (player) => player.assists),
    stealsPerGame: sortedRankings(players, (player) => player.stealsPerGame),
    totalSteals: sortedRankings(players, (player) => player.steals),
    blocksPerGame: sortedRankings(players, (player) => player.blocksPerGame),
    totalBlocks: sortedRankings(players, (player) => player.blocks),
    threePointersMade: sortedRankings(players, (player) => player.threeMade),
    fieldGoalPercentage: sortedRankings(
      players,
      (player) => player.fieldGoalPercentage,
      (player) => player.fieldGoalsAttempted > 0,
    ),
    threePointPercentage: sortedRankings(
      players,
      (player) => player.threePointPercentage,
      (player) => player.threeAttempted > 0,
    ),
    freeThrowPercentage: sortedRankings(
      players,
      (player) => player.freeThrowPercentage,
      (player) => player.ftAttempted > 0,
    ),
    plusMinus: sortedRankings(players, (player) => player.plusMinus),
    minutesPerGame: sortedRankings(players, (player) => player.minutesPerGame),
    gamesPlayed: sortedRankings(players, (player) => player.gamesPlayed),
    playerOfGame: sortedRankings(players, (player) => player.playerOfGameCount),
  };
}

/* =========================================================
   MEDIA RECONCILIATION
   ========================================================= */

function normalizedMediaUrl(value: unknown) {
  const url = text(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"].forEach((key) =>
      parsed.searchParams.delete(key),
    );
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, "")}${parsed.search}`;
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

function buildGameMedia(
  games: GameRow[],
  gameMediaRows: GameMediaRow[],
  gameLinks: MediaLinkRow[],
  oneOnOneLinks: MediaLinkRow[],
  assets: MediaAssetRow[],
) {
  const assetMap = new Map<string, MediaAssetRow>(
    assets.map((asset): [string, MediaAssetRow] => [text(asset.id), asset]),
  );
  const byGame = new Map<string, PublicMediaItem[]>();
  const gameByLegacyOneOnOne = new Map<string, string>();
  games.forEach((game) => {
    const legacyId = text(game.legacy_one_on_one_id);
    if (legacyId) gameByLegacyOneOnOne.set(legacyId, text(game.id));
  });

  function append(gameId: string, item: PublicMediaItem) {
    if (!gameId || !item.url) return;
    const current = byGame.get(gameId) || [];
    const identity = normalizedMediaUrl(item.url) || item.key;
    if (current.some((existing) => (normalizedMediaUrl(existing.url) || existing.key) === identity)) return;
    current.push(item);
    byGame.set(gameId, current);
  }

  games.forEach((game) => {
    const id = text(game.id);
    const fullGame = text(game.video_url || game.game_video_url);
    const highlight = text(game.highlight_url);
    if (fullGame) {
      append(id, {
        key: `game:${id}:full-game`,
        title: `${text(game.title || game.game_title) || "Game"} · Full game`,
        mediaType: "video",
        url: fullGame,
        thumbnailUrl: text(game.poster_url || game.game_poster_url || game.image_url),
        source: "game_field",
        role: "full game",
      });
    }
    if (highlight) {
      append(id, {
        key: `game:${id}:highlights`,
        title: `${text(game.title || game.game_title) || "Game"} · Highlights`,
        mediaType: "video",
        url: highlight,
        thumbnailUrl: text(game.poster_url || game.game_poster_url || game.image_url),
        source: "game_field",
        role: "highlights",
      });
    }
  });

  gameMediaRows.forEach((row) => {
    if (row.is_public === false) return;
    const gameId = text(row.game_id);
    const url = text(row.url || row.video_url || row.media_url);
    if (!gameId || !url) return;
    append(gameId, {
      key: `game-media:${text(row.id)}`,
      title: text(row.title) || "Game media",
      mediaType: text(row.media_type) || "video",
      url,
      thumbnailUrl: text(row.thumbnail_url),
      source: "game_media",
      role: text(row.category) || "game media",
    });
  });

  function appendAssetLink(link: MediaLinkRow, gameId: string) {
    const asset = assetMap.get(text(link.asset_id));
    if (!asset || asset.is_public === false) return;
    const url = text(asset.url);
    if (!url) return;
    append(gameId, {
      key: `asset:${text(asset.id)}`,
      title: text(asset.title) || "Game media",
      mediaType: text(asset.media_type) || "video",
      url,
      thumbnailUrl: text(asset.thumbnail_url),
      source: "media_asset",
      role: text(link.link_role) || "game media",
    });
  }

  gameLinks.forEach((link) => appendAssetLink(link, text(link.owner_id)));
  oneOnOneLinks.forEach((link) => {
    const gameId = gameByLegacyOneOnOne.get(text(link.owner_id));
    if (gameId) appendAssetLink(link, gameId);
  });

  return byGame;
}

/* =========================================================
   MAIN LOADER
   ========================================================= */

export async function loadPublicTeamIntelligence(
  team: PublicTeamIdentity,
): Promise<PublicTeamIntelligence> {
  /* -------------------------------------------------------
     1. LOAD CANDIDATE GAMES
     ------------------------------------------------------- */

  const candidateGames = (await fetchTeamGames(team)).filter((game) => game.is_public !== false);

  const candidateEventIds = Array.from(
    new Set(candidateGames.map((game) => text(game.event_id)).filter(Boolean)),
  );

  const [eventRows, competitionRows] = await Promise.all([
    fetchRowsByIds<EventRow>("event_case_studies", "event_id", candidateEventIds, {
      select: "*",
      throwOnError: false,
    }),
    collectPages<CompetitionRow>(
      (from, to) => db.from("competitions").select("*").range(from, to),
      "competitions",
      false,
    ),
  ]);

  const events = new Map<string, EventRow>(
    eventRows
      .filter((event) => event.is_public !== false)
      .map((event): [string, EventRow] => [text(event.event_id), event]),
  );
  const competitions = competitionRows.filter((competition) => competition.is_public !== false);

  const fackts = isFacktsOrganization(team);
  const teamGames = candidateGames.filter((game) => Boolean(gameSide(game, team)));
  const activityGames = candidateGames.filter((game) => {
    if (gameSide(game, team)) return true;
    if (!fackts) return false;
    const event = events.get(text(game.event_id));
    return isFacktsActivity(game, event);
  });

  const activityGameIds = Array.from(new Set(activityGames.map((game) => text(game.id)).filter(Boolean)));
  const leagueIds = Array.from(
    new Set(activityGames.map((game) => text(game.league_id)).filter(Boolean)),
  );

  /* -------------------------------------------------------
     2. LOAD ALL STAT SOURCES + LOOKUPS + MEDIA
     ------------------------------------------------------- */

  const legacyOneOnOneIds = Array.from(
    new Set(activityGames.map((game) => text(game.legacy_one_on_one_id)).filter(Boolean)),
  );

  const [
    canonicalRows,
    playerStatRows,
    guestStatRows,
    leagueRows,
    gameMediaRows,
    gameLinks,
    oneOnOneLinks,
  ] = await Promise.all([
    fetchRowsByIds<StatSourceRow>("game_box_score_lines", "game_id", activityGameIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchRowsByIds<StatSourceRow>("player_game_stats", "game_id", activityGameIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchRowsByIds<StatSourceRow>("guest_game_stats", "game_id", activityGameIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchRowsByIds<LeagueRow>("leagues", "id", leagueIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchRowsByIds<GameMediaRow>("game_media", "game_id", activityGameIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchMediaLinks("game", activityGameIds),
    fetchMediaLinks("one_on_one", legacyOneOnOneIds),
  ]);

  const playerIds = Array.from(
    new Set(
      [...canonicalRows, ...playerStatRows]
        .map((row) => text(row.player_id))
        .filter(Boolean),
    ),
  );
  const guestIds = Array.from(
    new Set(
      [...canonicalRows, ...playerStatRows, ...guestStatRows]
        .flatMap((row) => [text(row.guest_hooper_id), text(row.source_guest_hooper_id)])
        .filter(Boolean),
    ),
  );
  const assetIds = Array.from(
    new Set([...gameLinks, ...oneOnOneLinks].map((link) => text(link.asset_id)).filter(Boolean)),
  );

  const [playerRows, guestRows, mediaAssets] = await Promise.all([
    fetchRowsByIds<PlayerLookup>("players", "id", playerIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchRowsByIds<GuestLookup>("guest_hoopers", "id", guestIds, {
      select: "*",
      throwOnError: false,
    }),
    fetchRowsByIds<MediaAssetRow>("media_assets", "id", assetIds, {
      select: "*",
      throwOnError: false,
    }),
  ]);

  const playerMap = new Map<string, PlayerLookup>(
    playerRows.map((player): [string, PlayerLookup] => [text(player.id), player]),
  );
  const guestMap = new Map<string, GuestLookup>(
    guestRows.map((guest): [string, GuestLookup] => [text(guest.id), guest]),
  );
  const leagues = new Map<string, LeagueRow>(
    leagueRows.map((league): [string, LeagueRow] => [text(league.id), league]),
  );

  /* -------------------------------------------------------
     3. NORMALIZE + RECONCILE STATS
     ------------------------------------------------------- */

  const publicCanonicalRows = canonicalRows.filter((row) => {
    if (row.is_public === false) return false;
    const verification = normalize(row.verification_status);
    return !verification || ["verified", "published", "final"].includes(verification);
  });

  const canonicalLines = publicCanonicalRows
    .map((row) => normalizeStatRow(row, "canonical_box", playerMap, guestMap))
    .filter((line): line is UnifiedStatLine => Boolean(line));

  // Historical player_game_stats intentionally remain public for public games.
  // Older FACKTS pages did not require the newer verification flag.
  const playerLines = playerStatRows
    .map((row) => normalizeStatRow(row, "player_game_stats", playerMap, guestMap))
    .filter((line): line is UnifiedStatLine => Boolean(line));

  const guestLines = guestStatRows
    .map((row) => normalizeStatRow(row, "guest_game_stats", playerMap, guestMap))
    .filter((line): line is UnifiedStatLine => Boolean(line));

  const lines = mergeStatLines(canonicalLines, playerLines, guestLines);

  const gamesById = new Map<string, GameRow>(
    activityGames.map((game): [string, GameRow] => [text(game.id), game]),
  );

  const mediaByGame = buildGameMedia(
    activityGames,
    gameMediaRows,
    gameLinks,
    oneOnOneLinks,
    mediaAssets,
  );

  /* -------------------------------------------------------
     4. OVERALL PLAYER RANKINGS
     ------------------------------------------------------- */

  const overallPlayerLines = lines.filter((line) => {
    const game = gamesById.get(line.gameId);
    if (!game) return false;
    if (lineBelongsToTeam(line, game, team)) return true;

    // FACKTS organization owns the competition record, so both sides count
    // toward its competition leaderboards when FACKTS itself is not a side.
    if (fackts && !gameSide(game, team)) {
      const event = events.get(text(game.event_id));
      return isFacktsActivity(game, event);
    }

    return false;
  });

  const players = aggregatePlayers(overallPlayerLines);
  const leaderboards = buildLeaderboards(players);

  /* -------------------------------------------------------
     5. GROUP GAMES INTO ACTIVITIES
     ------------------------------------------------------- */

  type WorkingActivity = {
    key: string;
    kind: PublicActivityKind;
    title: string;
    competitionSlug?: string | null;
    href?: string | null;
    seasonLabel?: string | null;
    division?: string | null;
    games: GameRow[];
  };

  const activityMap = new Map<string, WorkingActivity>();

  for (const game of activityGames) {
    const event = events.get(text(game.event_id));
    const key = activityKey(game, event, competitions);
    const existing = activityMap.get(key);
    if (existing) {
      existing.games.push(game);
      continue;
    }

    activityMap.set(key, {
      key,
      kind: activityKind(game, event),
      title: activityTitle(game, event, leagues),
      competitionSlug: competitionSlugForGame(game, event, competitions),
      href: activityHref(game, event, leagues, competitions),
      seasonLabel: text(game.season_label) || null,
      division: text(game.division) || null,
      games: [game],
    });
  }

  const canonicalCountByGame = new Map<string, number>();
  canonicalLines.forEach((line) =>
    canonicalCountByGame.set(line.gameId, (canonicalCountByGame.get(line.gameId) || 0) + 1),
  );
  const legacyCountByGame = new Map<string, number>();
  [...playerLines, ...guestLines].forEach((line) =>
    legacyCountByGame.set(line.gameId, (legacyCountByGame.get(line.gameId) || 0) + 1),
  );
  const reconciledCountByGame = new Map<string, number>();
  lines.forEach((line) =>
    reconciledCountByGame.set(line.gameId, (reconciledCountByGame.get(line.gameId) || 0) + 1),
  );

  /* -------------------------------------------------------
     6. BUILD ACTIVITY RECORDS
     ------------------------------------------------------- */

  const activities: PublicActivityRecord[] = Array.from(activityMap.values())
    .map((activity) => {
      let wins = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let completedGames = 0;

      for (const game of activity.games) {
        const side = gameSide(game, team);
        if (!side) continue;
        const own = side === "home" ? homeScore(game) : awayScore(game);
        const other = side === "home" ? awayScore(game) : homeScore(game);
        if (own === null || other === null) continue;
        completedGames += 1;
        pointsFor += own;
        pointsAgainst += other;
        if (own > other) wins += 1;
        if (own < other) losses += 1;
      }

      const gameIds = new Set(activity.games.map((game) => text(game.id)));
      const activityLines = lines.filter((line) => {
        if (!gameIds.has(line.gameId)) return false;
        const game = gamesById.get(line.gameId);
        if (!game) return false;
        if (lineBelongsToTeam(line, game, team)) return true;
        if (fackts && !gameSide(game, team)) {
          const event = events.get(text(game.event_id));
          return isFacktsActivity(game, event);
        }
        return false;
      });

      const activityPlayers = aggregatePlayers(activityLines);
      const activityLeaderboards = buildLeaderboards(activityPlayers);

      const publicGames = activity.games
        .slice()
        .sort((left, right) => {
          const leftTime = gameDate(left) ? new Date(gameDate(left) as string).getTime() : 0;
          const rightTime = gameDate(right) ? new Date(gameDate(right) as string).getTime() : 0;
          return rightTime - leftTime;
        })
        .map((game): PublicActivityGame => {
          const id = text(game.id);
          const canonicalLineCount = canonicalCountByGame.get(id) || 0;
          const legacyLineCount = legacyCountByGame.get(id) || 0;
          const statLineCount = reconciledCountByGame.get(id) || 0;
          const media = mediaByGame.get(id) || [];
          return {
            id,
            title: text(game.title || game.game_title) || `${homeTeamName(game)} vs ${awayTeamName(game)}`,
            gameDate: gameDate(game),
            status: text(game.status) || (completedGame(game) ? "completed" : "upcoming"),
            verificationStatus: text(game.verification_status) || "legacy record",

            homeTeamId: text(game.home_team_id) || null,
            awayTeamId: text(game.away_team_id) || null,
            homeTeamName: homeTeamName(game),
            awayTeamName: awayTeamName(game),
            homeScore: homeScore(game),
            awayScore: awayScore(game),

            venue: text(game.venue),
            court: text(game.court),
            location: text(game.location),
            stage: text(game.game_stage || game.round_name) || "Game",
            format: text(game.game_format || game.match_type) || "Basketball",

            posterUrl: text(game.poster_url || game.game_poster_url || game.image_url),
            videoUrl: text(game.video_url || game.game_video_url),
            highlightUrl: text(game.highlight_url),

            officials: parseStringList(game.officials),
            tableOfficials: parseStringList(game.table_officials),

            hasStats: statLineCount > 0,
            statLineCount,
            canonicalLineCount,
            legacyLineCount,
            hasCanonicalBoxScore: canonicalLineCount > 0,
            media,
          };
        });

      return {
        key: activity.key,
        kind: activity.kind,
        title: activity.title,
        competitionSlug: activity.competitionSlug,
        href: activity.href,
        seasonLabel: activity.seasonLabel,
        division: activity.division,
        gameCount: activity.games.length,
        completedGames,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        leaders: activityLeaderboards.pointsPerGame.slice(0, 25),
        leaderboards: activityLeaderboards,
        games: publicGames,
      };
    })
    .sort((left, right) => {
      const order: Record<PublicActivityKind, number> = {
        league: 1,
        event: 2,
        one_on_one: 3,
        community_takeover: 4,
        high_school_takeover: 5,
        university_takeover: 6,
        competition: 7,
        friendly: 8,
        other: 9,
      };
      return order[left.kind] - order[right.kind] || left.title.localeCompare(right.title);
    });

  /* -------------------------------------------------------
     7. TEAM PERFORMANCE
     ------------------------------------------------------- */

  let played = 0;
  let wins = 0;
  let losses = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const game of teamGames) {
    const side = gameSide(game, team);
    if (!side) continue;
    const own = side === "home" ? homeScore(game) : awayScore(game);
    const other = side === "home" ? awayScore(game) : homeScore(game);
    if (own === null || other === null) continue;
    played += 1;
    pointsFor += own;
    pointsAgainst += other;
    if (own > other) wins += 1;
    if (own < other) losses += 1;
  }

  function uniqueKindCount(kinds: PublicActivityKind[]) {
    return new Set(
      activities.filter((activity) => kinds.includes(activity.kind)).map((activity) => activity.key),
    ).size;
  }

  const venueSet = new Set(
    activities
      .flatMap((activity) => activity.games)
      .map((game) => normalize([game.venue, game.court, game.location].filter(Boolean).join(" · ")))
      .filter(Boolean),
  );

  const allMedia = activities.flatMap((activity) => activity.games.flatMap((game) => game.media));
  const uniqueMedia = new Set(allMedia.map((item) => normalizedMediaUrl(item.url) || item.key));

  return {
    summary: {
      totalGames: activityGames.length,
      completedGames: activityGames.filter(completedGame).length,
      leagues: uniqueKindCount(["league"]),
      events: uniqueKindCount(["event"]),
      competitions: uniqueKindCount(["one_on_one", "community_takeover", "competition"]),
      communityTakeovers: uniqueKindCount(["community_takeover"]),
      highSchoolTakeovers: uniqueKindCount(["high_school_takeover"]),
      universityTakeovers: uniqueKindCount(["university_takeover"]),
      oneOnOneCompetitions: uniqueKindCount(["one_on_one"]),
      friendlies: uniqueKindCount(["friendly"]),
      totalStatLines: lines.length,
      canonicalStatLines: canonicalLines.length,
      legacyStatLines: Math.max(0, lines.length - canonicalLines.length),
      rankedPlayers: players.length,
      mediaItems: uniqueMedia.size,
      venues: venueSet.size,
    },

    performance: {
      played,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      pointDifference: pointsFor - pointsAgainst,
      winPercentage: played ? (wins / played) * 100 : 0,
    },

    players,
    leaderboards,
    activities,
  };
}
