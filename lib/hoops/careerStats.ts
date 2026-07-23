export type CareerGameStatRow = {
  id?: string | null;
  game_id?: string | null;
  points?: number | string | null;
  assists?: number | string | null;
  rebounds?: number | string | null;
  steals?: number | string | null;
  blocks?: number | string | null;
  three_pointers_made?: number | string | null;
  three_pointers?: number | string | null;
  threes_made?: number | string | null;
  three_pm?: number | string | null;
};

export type CareerGameTotals = {
  gamesPlayed: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  threePointersMade: number;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Keep one box score per covered game.  The first group wins if old data was
 * accidentally entered in both the official and guest stats tables.
 */
export function mergeCareerGameStats(
  ...groups: CareerGameStatRow[][]
): CareerGameStatRow[] {
  const rows = new Map<string, CareerGameStatRow>();
  let fallbackIndex = 0;

  groups.flat().forEach((row) => {
    const gameKey = row.game_id ? `game:${row.game_id}` : null;
    const rowKey = row.id ? `row:${row.id}` : `unknown:${fallbackIndex++}`;
    const key = gameKey || rowKey;

    if (!rows.has(key)) rows.set(key, row);
  });

  return Array.from(rows.values());
}

export function getCareerGameTotals(
  rows: CareerGameStatRow[]
): CareerGameTotals {
  return rows.reduce<CareerGameTotals>(
    (totals, row) => {
      totals.gamesPlayed += 1;
      totals.points += numberValue(row.points);
      totals.assists += numberValue(row.assists);
      totals.rebounds += numberValue(row.rebounds);
      totals.steals += numberValue(row.steals);
      totals.blocks += numberValue(row.blocks);
      totals.threePointersMade += numberValue(
        row.three_pointers_made ??
          row.three_pointers ??
          row.threes_made ??
          row.three_pm
      );
      return totals;
    },
    {
      gamesPlayed: 0,
      points: 0,
      assists: 0,
      rebounds: 0,
      steals: 0,
      blocks: 0,
      threePointersMade: 0,
    }
  );
}
