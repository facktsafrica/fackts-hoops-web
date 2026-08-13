export type PublicGameStatus =
  | "live"
  | "upcoming"
  | "completed"
  | "postponed"
  | "cancelled";

export type GamePeriodScore = {
  label: string;
  home: number | null;
  away: number | null;
};

export type GameRecord = {
  id: string;
  title?: string | null;
  game_title?: string | null;
  opponent?: string | null;
  opponent_name?: string | null;
  team_name?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  competition_name?: string | null;
  event_id?: string | null;
  game_format?: string | null;
  match_type?: string | null;
  game_stage?: string | null;
  round_name?: string | null;
  game_date?: string | null;
  date?: string | null;
  venue?: string | null;
  location?: string | null;
  court?: string | null;
  status?: string | null;
  is_upcoming?: boolean | null;
  is_public?: boolean | null;
  team_score?: number | string | null;
  fackts_score?: number | string | null;
  home_score?: number | string | null;
  opponent_score?: number | string | null;
  away_score?: number | string | null;
  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  game_video_url?: string | null;
  highlight_url?: string | null;
  notes?: string | null;
  period_scores?: unknown;
  officials?: string | null;
  table_officials?: string | null;
  verification_status?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  correction_status?: string | null;
  correction_note?: string | null;
  home_roster?: string | null;
  away_roster?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

export function statNumber(value: unknown) {
  return numberValue(value) ?? 0;
}

export function getGameTitle(game: GameRecord) {
  return game.game_title || game.title || `${getHomeTeam(game)} vs ${getAwayTeam(game)}`;
}

export function getHomeTeam(game: GameRecord) {
  return game.home_team_name || "FACKTS";
}

export function getAwayTeam(game: GameRecord) {
  return (
    game.away_team_name ||
    game.opponent ||
    game.opponent_name ||
    game.team_name ||
    "Opponent"
  );
}

export function getGameDate(game: GameRecord) {
  return game.game_date || game.date || game.created_at || null;
}

export function getHomeScore(game: GameRecord) {
  return numberValue(game.home_score, game.team_score, game.fackts_score);
}

export function getAwayScore(game: GameRecord) {
  return numberValue(game.away_score, game.opponent_score);
}

export function getPosterUrl(game: GameRecord) {
  return game.poster_url || game.game_poster_url || game.image_url || "";
}

export function getGameStatus(game: GameRecord): PublicGameStatus {
  const status = (game.status || "").trim().toLowerCase();

  if (["live", "in_progress", "in progress", "ongoing"].includes(status)) return "live";
  if (status === "postponed") return "postponed";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["completed", "played", "final"].includes(status)) return "completed";
  if (getHomeScore(game) !== null && getAwayScore(game) !== null) return "completed";
  if (game.is_upcoming === false) return "completed";

  return "upcoming";
}

export function getStatusLabel(status: PublicGameStatus) {
  if (status === "live") return "Live";
  if (status === "upcoming") return "Upcoming";
  if (status === "completed") return "Final";
  if (status === "postponed") return "Postponed";
  return "Cancelled";
}

export function getWinner(game: GameRecord) {
  const home = getHomeScore(game);
  const away = getAwayScore(game);

  if (home === null || away === null) return null;
  if (home === away) return null;
  return home > away ? getHomeTeam(game) : getAwayTeam(game);
}

export function canonicalCompetitionName(value?: string | null) {
  const name = String(value || "FACKTS Hoops").trim().replace(/\s+/g, " ");
  const identity = name.toLowerCase().replace(/[^a-z0-9]+/g, "");

  if (["courttakeover", "facktscourttakeover"].includes(identity)) {
    return "Court Takeover";
  }

  if (identity === "facktskings") return "FACKTS Kings";
  return name || "FACKTS Hoops";
}

export function getCompetition(game: GameRecord) {
  return canonicalCompetitionName(
    game.competition_name || game.match_type || "FACKTS Hoops"
  );
}

export function getGameFormat(game: GameRecord) {
  return game.game_format || game.match_type || "Basketball";
}

export function getStage(game: GameRecord) {
  return game.game_stage || game.round_name || "Game";
}

export function getLocation(game: GameRecord) {
  return [game.venue, game.court, game.location].filter(Boolean).join(" · ") || "Venue to be announced";
}

export function formatGameDate(value?: string | null, long = false) {
  if (!value) return "Date to be announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be announced";

  return date.toLocaleString("en-KE", {
    weekday: long ? "long" : "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parsePeriodScores(value: unknown): GamePeriodScore[] {
  let source = value;

  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) return [];

  return source
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        label: String(row.label || row.period || `P${index + 1}`),
        home: numberValue(row.home, row.home_score),
        away: numberValue(row.away, row.away_score),
      };
    })
    .filter((item): item is GamePeriodScore => Boolean(item));
}

export function parseLineList(value?: string | null) {
  if (!value) return [];

  return value
    .split(/\r?\n|\s*[;,]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isVerified(game: GameRecord) {
  return ["verified", "published", "final"].includes(
    (game.verification_status || "").trim().toLowerCase()
  );
}

export function getVerificationLabel(game: GameRecord) {
  const value = (game.verification_status || "").trim().toLowerCase();
  if (value === "verified") return "Verified record";
  if (value === "pending") return "Verification pending";
  if (value === "disputed") return "Under review";
  return getGameStatus(game) === "completed" ? "Score recorded" : "Fixture record";
}
