export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

type UnknownRecord = Record<string, unknown>;

const STAT_FIELDS = [
  "points", "rebounds", "offensive_rebounds", "defensive_rebounds",
  "assists", "steals", "blocks", "turnovers", "fouls", "minutes",
  "q1", "q2", "q3", "q4", "two_made", "two_attempted",
  "three_made", "three_attempted", "ft_made", "ft_attempted",
] as const;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(value: unknown, maximum = 500) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maximum) : null;
}

function numberValue(value: unknown, minimum = 0) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : null;
}

export function validateGameMutation(input: unknown, requireId = false): ValidationResult<UnknownRecord> {
  const body = asRecord(input);
  if (!body) return { ok: false, errors: ["A JSON object is required."] };

  const errors: string[] = [];
  const id = text(body.id, 100);
  const opponent = text(body.opponent, 160);
  const gameDate = text(body.game_date, 80);
  const teamScore = numberValue(body.team_score);
  const opponentScore = numberValue(body.opponent_score);

  if (requireId && !id) errors.push("Game id is required.");
  if (!opponent) errors.push("Opponent is required.");
  if (!gameDate || Number.isNaN(Date.parse(gameDate))) errors.push("A valid game date is required.");
  if (teamScore === null || opponentScore === null) errors.push("Scores must be non-negative numbers.");
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      ...(id ? { id } : {}),
      team_name: text(body.team_name, 160) ?? "FACKTS",
      opponent,
      game_date: gameDate,
      venue: text(body.venue, 240),
      match_type: text(body.match_type, 100),
      notes: text(body.notes, 5000),
      team_score: teamScore,
      opponent_score: opponentScore,
    },
  };
}

export function validatePlayerMutation(input: unknown, requireId = false): ValidationResult<UnknownRecord> {
  const body = asRecord(input);
  if (!body) return { ok: false, errors: ["A JSON object is required."] };

  const errors: string[] = [];
  const id = text(body.id, 100);
  const fullName = text(body.full_name, 160);
  if (requireId && !id) errors.push("Player id is required.");
  if (!fullName) errors.push("Player full name is required.");
  if (errors.length) return { ok: false, errors };

  const fields = [
    "jersey_number", "position", "nickname", "role", "age", "height",
    "dominant_hand", "current_team", "previous_teams", "highest_level",
    "years_played", "style_of_play", "strengths", "improvements",
    "instagram", "tiktok", "x_handle", "followers_range", "photo_url",
  ] as const;
  const value: UnknownRecord = { ...(id ? { id } : {}), full_name: fullName };
  for (const field of fields) value[field] = text(body[field], field === "photo_url" ? 2000 : 1000);
  value.role = value.role ?? "Bench";

  return { ok: true, value };
}

export function validateStatsMutation(input: unknown): ValidationResult<UnknownRecord> {
  const body = asRecord(input);
  if (!body) return { ok: false, errors: ["A JSON object is required."] };

  const gameId = text(body.game_id, 100);
  const playerId = text(body.player_id, 100);
  const errors: string[] = [];
  if (!gameId) errors.push("game_id is required.");
  if (!playerId) errors.push("player_id is required.");

  const value: UnknownRecord = { game_id: gameId, player_id: playerId };
  for (const field of STAT_FIELDS) {
    const parsed = numberValue(body[field]);
    if (parsed === null) errors.push(`${field} must be a non-negative number.`);
    value[field] = parsed ?? 0;
  }

  const plusMinus = numberValue(body.plus_minus, Number.NEGATIVE_INFINITY);
  if (plusMinus === null) errors.push("plus_minus must be a number.");
  value.plus_minus = plusMinus ?? 0;
  value.player_of_game = body.player_of_game === true;

  for (const [made, attempted] of [
    ["two_made", "two_attempted"],
    ["three_made", "three_attempted"],
    ["ft_made", "ft_attempted"],
  ] as const) {
    if (Number(value[made]) > Number(value[attempted])) {
      errors.push(`${made} cannot exceed ${attempted}.`);
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}
