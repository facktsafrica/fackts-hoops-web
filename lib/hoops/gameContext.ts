export const GAME_CATEGORIES = [
  "one_on_one",
  "league",
  "court_takeover",
  "event",
  "competition",
  "friendly",
  "other",
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];
export type TeamSide = "home" | "away";

export type GameContextRecord = {
  game_category?: string | null;
  competition_id?: string | null;
  competition_name?: string | null;
  league_id?: string | null;
  season_label?: string | null;
  division?: string | null;
  event_id?: string | null;
  game_date?: string | null;
  date?: string | null;
  match_date?: string | null;
  created_at?: string | null;
  game_format?: string | null;
  match_type?: string | null;
  title?: string | null;
  game_title?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  team_name?: string | null;
  opponent_name?: string | null;
  opponent?: string | null;
  team_score?: number | string | null;
  fackts_score?: number | string | null;
};

export type TeamIdentity = {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  short_name?: string | null;
  aliases?: string[] | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeGameIdentity(value: unknown) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: unknown) {
  return normalizeGameIdentity(value).replace(/\s+/g, "");
}

function gameIdentity(game: GameContextRecord) {
  return normalizeGameIdentity(
    [
      game.competition_name,
      game.match_type,
      game.game_format,
      game.title,
      game.game_title,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function getGameCategory(game: GameContextRecord): GameCategory {
  const stored = text(game.game_category).toLowerCase() as GameCategory;
  if (GAME_CATEGORIES.includes(stored)) return stored;

  const identity = gameIdentity(game);

  // Legacy rows are classified by the strongest available relationship first.
  // Takeovers are checked before 1v1 because some takeover titles contain
  // individual matchup language.
  if (/\btake\s*over\b/.test(identity) || /\bcommunity court\b/.test(identity)) {
    return "court_takeover";
  }

  if (
    /\bfackts kings\b/.test(identity) ||
    /\b1\s*v\s*1\b/.test(identity) ||
    /\bone on one\b/.test(identity) ||
    compact(game.game_format) === "1v1"
  ) {
    return "one_on_one";
  }

  if (text(game.league_id)) return "league";
  if (text(game.event_id)) return "event";
  if (/\bfriendly\b/.test(identity) || /\bscrimmage\b/.test(identity)) {
    return "friendly";
  }

  const competition = normalizeGameIdentity(game.competition_name);
  if (competition && competition !== "fackts hoops") return "competition";

  return "other";
}

export function isOneOnOneGame(game: GameContextRecord) {
  return getGameCategory(game) === "one_on_one";
}

export function isTeamGame(game: GameContextRecord) {
  return !isOneOnOneGame(game);
}

/**
 * Seasons are explicit whenever the database has one. Older competition
 * records fall back to the year in which the game was actually played so the
 * public UI never assigns them to the current season by accident.
 */
export function resolveGameSeasonLabel(game: GameContextRecord) {
  const stored = text(game.season_label);
  if (stored) return stored;

  const value = game.game_date || game.date || game.match_date || game.created_at;
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return String(parsed.getFullYear());
}

function aliasesForTeam(team: TeamIdentity) {
  return new Set(
    [team.name, team.short_name, ...(team.aliases || [])]
      .map(normalizeGameIdentity)
      .filter(Boolean)
  );
}

function isFacktsTeam(team: TeamIdentity, aliases: Set<string>) {
  return (
    normalizeGameIdentity(team.slug) === "fackts africa" ||
    aliases.has("fackts") ||
    aliases.has("fackts africa") ||
    aliases.has("fackts hoops")
  );
}

/**
 * Resolve a team's actual side in a game.
 *
 * Rules:
 * - 1v1 records never belong to a team record.
 * - When either participant ID exists, IDs are authoritative and names cannot
 *   pull another team's game into the record.
 * - Name matching is only a compatibility fallback for legacy ID-less games.
 * - The final FACKTS fallback is limited to the oldest opponent-only schema.
 */
export function getTeamSide(
  game: GameContextRecord,
  team: TeamIdentity
): TeamSide | null {
  if (!isTeamGame(game)) return null;

  const teamId = text(team.id);
  const homeId = text(game.home_team_id);
  const awayId = text(game.away_team_id);

  if (homeId || awayId) {
    if (teamId && homeId === teamId) return "home";
    if (teamId && awayId === teamId) return "away";
    return null;
  }

  const aliases = aliasesForTeam(team);
  const explicitHome = normalizeGameIdentity(game.home_team_name || game.team_name);
  const explicitAway = normalizeGameIdentity(
    game.away_team_name || game.opponent_name || game.opponent
  );

  if (explicitHome && aliases.has(explicitHome)) return "home";
  if (explicitAway && aliases.has(explicitAway)) return "away";

  const usesLegacyOpponentOnlyShape =
    !explicitHome &&
    Boolean(explicitAway) &&
    (game.fackts_score !== null && game.fackts_score !== undefined ||
      game.team_score !== null && game.team_score !== undefined);

  if (usesLegacyOpponentOnlyShape && isFacktsTeam(team, aliases)) return "home";
  return null;
}

export function getGameContextKey(game: GameContextRecord) {
  const category = getGameCategory(game);
  const season = normalizeGameIdentity(resolveGameSeasonLabel(game)) || "season-unspecified";
  const division = normalizeGameIdentity(game.division) || "division-unspecified";

  if (category === "league") {
    return `league:${text(game.league_id) || normalizeGameIdentity(game.competition_name) || "unassigned"}:${season}:${division}`;
  }
  if (category === "event") return `event:${text(game.event_id) || "unassigned"}`;
  if (category === "one_on_one") {
    return `competition:${text(game.competition_id) || "fackts-kings"}:${season}`;
  }
  if (category === "court_takeover") {
    return `competition:${text(game.competition_id) || "court-takeovers"}:${season}:${division}`;
  }
  if (category === "competition") {
    return `competition:${text(game.competition_id) || normalizeGameIdentity(game.competition_name) || "unassigned"}:${season}:${division}`;
  }
  if (category === "friendly") return "friendly";
  return `other:${normalizeGameIdentity(game.game_format || game.match_type) || "basketball"}`;
}

export function gameCategoryLabel(category: GameCategory) {
  if (category === "one_on_one") return "FACKTS Kings · 1v1";
  if (category === "court_takeover") return "Court Takeovers";
  if (category === "league") return "League games";
  if (category === "event") return "Event / tournament";
  if (category === "competition") return "Competition";
  if (category === "friendly") return "Friendlies";
  return "Other basketball games";
}
