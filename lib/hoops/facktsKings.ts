export const FACKTS_KINGS_SLUG = "fackts-kings" as const;
export const DEFAULT_FACKTS_KINGS_SEASON = "2026" as const;

type FacktsKingsSeasonRecord = {
  season_label?: string | number | null;
  seasonLabel?: string | number | null;
  match_date?: string | null;
  matchDate?: string | null;
  game_date?: string | null;
  gameDate?: string | null;
  date?: string | null;
};

function seasonText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function dateYear(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  // Read an ISO date's calendar year directly so timezone conversion cannot
  // move a late-night Nairobi fixture into a different year.
  const isoYear = value.trim().match(/^(\d{4})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])/);
  if (isoYear) return isoYear[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return String(parsed.getUTCFullYear());
}

/**
 * Resolves the display/filter season for a FACKTS Kings match.
 *
 * Historical rows existed before season_label was introduced and inherited
 * the column's 2026 default. For those rows, the actual match year is the
 * reliable season. Explicit non-default season labels remain authoritative.
 *
 * Both supported call styles are intentional:
 *   resolveFacktsKingsSeason(match)
 *   resolveFacktsKingsSeason(match.season_label, match.match_date)
 */
export function resolveFacktsKingsSeason(
  recordOrSeason?: unknown,
  suppliedMatchDate?: string | null
) {
  const record =
    typeof recordOrSeason === "object" && recordOrSeason !== null
      ? (recordOrSeason as FacktsKingsSeasonRecord)
      : null;

  const storedSeason = record
    ? seasonText(record.season_label ?? record.seasonLabel)
    : seasonText(recordOrSeason);

  const matchDate = record
    ? record.match_date ??
      record.matchDate ??
      record.game_date ??
      record.gameDate ??
      record.date ??
      suppliedMatchDate
    : suppliedMatchDate;

  const playedYear = dateYear(matchDate);

  if (!storedSeason) {
    return playedYear ?? DEFAULT_FACKTS_KINGS_SEASON;
  }

  // Repair the legacy contamination in application logic: genuine 2025
  // matches stamped with the later 2026 database default belong to 2025.
  if (
    storedSeason === DEFAULT_FACKTS_KINGS_SEASON &&
    playedYear &&
    playedYear !== DEFAULT_FACKTS_KINGS_SEASON
  ) {
    return playedYear;
  }

  return storedSeason;
}
