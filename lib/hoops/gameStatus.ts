export type GameLike = {
  game_date?: string | null;
  date?: string | null;
  status?: string | null;

  fackts_score?: number | string | null;
  opponent_score?: number | string | null;
  home_score?: number | string | null;
  away_score?: number | string | null;

  team_score?: number | string | null;
  rival_score?: number | string | null;
  our_score?: number | string | null;
  their_score?: number | string | null;
  fackts_points?: number | string | null;
  opponent_points?: number | string | null;
  score_for?: number | string | null;
  score_against?: number | string | null;
  points_for?: number | string | null;
  points_against?: number | string | null;
  us_score?: number | string | null;
  them_score?: number | string | null;
};

function getNumberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function getFacktsScore(game: GameLike): number | null {
  return getNumberValue(
    game.fackts_score,
    game.home_score,
    game.team_score,
    game.our_score,
    game.fackts_points,
    game.score_for,
    game.points_for,
    game.us_score
  );
}

export function getOpponentScore(game: GameLike): number | null {
  return getNumberValue(
    game.opponent_score,
    game.away_score,
    game.rival_score,
    game.their_score,
    game.opponent_points,
    game.score_against,
    game.points_against,
    game.them_score
  );
}

function getGameDateValue(game: GameLike): string | null {
  return game.game_date || game.date || null;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;

  const cleanValue = value.slice(0, 10);
  const [year, month, day] = cleanValue.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getTodayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function hasPostedScore(game: GameLike): boolean {
  return getFacktsScore(game) !== null && getOpponentScore(game) !== null;
}

export function isPastGameDate(game: GameLike): boolean {
  const gameDate = parseDateOnly(getGameDateValue(game));
  if (!gameDate) return false;

  return gameDate < getTodayDateOnly();
}

export function isUpcomingGame(game: GameLike): boolean {
  const status = (game.status || "").toLowerCase().trim();

  if (status === "postponed") return false;
  if (status === "cancelled") return false;
  if (status === "played") return false;
  if (status === "completed") return false;
  if (status === "complete") return false;
  if (status === "final") return false;
  if (status === "finished") return false;
  if (status === "done") return false;

  if (hasPostedScore(game)) return false;

  if (isPastGameDate(game)) return false;

  return status === "upcoming" || status === "scheduled" || status === "";
}

export function getDisplayGameStatus(game: GameLike): string {
  const status = (game.status || "").toLowerCase().trim();

  if (status === "postponed") return "Postponed";
  if (status === "cancelled") return "Cancelled";

  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);

  if (facktsScore !== null && opponentScore !== null) {
    if (facktsScore > opponentScore) return "Win";
    if (facktsScore < opponentScore) return "Loss";
    return "Draw";
  }

  if (
    status === "played" ||
    status === "completed" ||
    status === "complete" ||
    status === "final" ||
    status === "finished" ||
    status === "done"
  ) {
    return "Played";
  }

  if (isPastGameDate(game)) {
    return "Awaiting Result";
  }

  return "Upcoming";
}

export function sortUpcomingGames<T extends GameLike>(games: T[]): T[] {
  return [...games].sort((a, b) => {
    const dateA = parseDateOnly(getGameDateValue(a))?.getTime() ?? 0;
    const dateB = parseDateOnly(getGameDateValue(b))?.getTime() ?? 0;

    return dateA - dateB;
  });
}

export function sortRecentGames<T extends GameLike>(games: T[]): T[] {
  return [...games].sort((a, b) => {
    const dateA = parseDateOnly(getGameDateValue(a))?.getTime() ?? 0;
    const dateB = parseDateOnly(getGameDateValue(b))?.getTime() ?? 0;

    return dateB - dateA;
  });
}

export function getGameScoreText(game: GameLike): string {
  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);

  if (facktsScore !== null && opponentScore !== null) {
    return `${facktsScore} - ${opponentScore}`;
  }

  return "Score not posted";
}