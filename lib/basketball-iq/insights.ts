export type BasketballStatLine = {
  player_id?: string | null;
  roster_member_id?: string | null;
  display_name?: string | null;
  session_id?: string | null;
  points?: number | null;
  rebounds?: number | null;
  offensive_rebounds?: number | null;
  defensive_rebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  fouls?: number | null;
  two_made?: number | null;
  two_attempted?: number | null;
  three_made?: number | null;
  three_attempted?: number | null;
  ft_made?: number | null;
  ft_attempted?: number | null;
};

export type BasketballIQRecommendation = {
  id: string;
  priority: "high" | "medium" | "positive";
  focus: string;
  headline: string;
  evidence: string;
  training: string;
  audience: "team" | "player";
  roster_member_id?: string | null;
  player_id?: string | null;
  player_name?: string | null;
};

function value(input: unknown) {
  const parsed = Number(input ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(lines: BasketballStatLine[], field: keyof BasketballStatLine) {
  return lines.reduce((total, line) => total + value(line[field]), 0);
}

function rounded(input: number, places = 1) {
  const factor = 10 ** places;
  return Math.round(input * factor) / factor;
}

function percent(made: number, attempted: number) {
  return attempted > 0 ? rounded((made / attempted) * 100, 1) : null;
}

function recommendationsFor(lines: BasketballStatLine[], games: number): BasketballIQRecommendation[] {
  if (!lines.length || games === 0) {
    return [{
      id: "sample-needed",
      priority: "medium",
      focus: "Performance baseline",
      headline: "Capture the first complete box score",
      evidence: "No player-by-player game sample is available yet.",
      training: "Record one complete game so Basketball IQ can identify a reliable training priority.",
      audience: "team",
    }];
  }

  const assists = sum(lines, "assists");
  const turnovers = sum(lines, "turnovers");
  const fouls = sum(lines, "fouls");
  const defensiveRebounds = sum(lines, "defensive_rebounds");
  const twoMade = sum(lines, "two_made");
  const twoAttempted = sum(lines, "two_attempted");
  const threeMade = sum(lines, "three_made");
  const threeAttempted = sum(lines, "three_attempted");
  const ftMade = sum(lines, "ft_made");
  const ftAttempted = sum(lines, "ft_attempted");
  const fgPct = percent(twoMade + threeMade, twoAttempted + threeAttempted);
  const ftPct = percent(ftMade, ftAttempted);
  const turnoversPerGame = turnovers / games;
  const foulsPerGame = fouls / games;
  const rosterSamples = new Set(lines.map((line) => line.roster_member_id || line.display_name).filter(Boolean)).size || 1;
  const defensiveReboundsPerPlayerGame = defensiveRebounds / games / rosterSamples;
  const output: BasketballIQRecommendation[] = [];

  if (turnoversPerGame >= 15 || (turnovers >= 5 && assists / Math.max(turnovers, 1) < 1.1)) {
    output.push({
      id: "ball-security",
      priority: "high",
      focus: "Ball security",
      headline: "Reduce empty possessions",
      evidence: `${rounded(turnoversPerGame)} turnovers per game and a ${rounded(assists / Math.max(turnovers, 1), 2)} assist-to-turnover ratio.`,
      training: "Run pressured advantage games, two-second decisions and end each possession with a paint touch or clean pass.",
      audience: "team",
    });
  }

  if (ftPct !== null && ftAttempted >= 10 && ftPct < 68) {
    output.push({
      id: "free-throws",
      priority: ftPct < 58 ? "high" : "medium",
      focus: "Free throws",
      headline: "Turn fouls into points",
      evidence: `${ftPct}% from the line across ${ftAttempted} attempts.`,
      training: "Finish training with pressure pairs: two makes to advance, sprint consequence for split or miss.",
      audience: "team",
    });
  }

  if (fgPct !== null && twoAttempted + threeAttempted >= 20 && fgPct < 42) {
    output.push({
      id: "shot-quality",
      priority: fgPct < 35 ? "high" : "medium",
      focus: "Shot quality",
      headline: "Create cleaner finishes",
      evidence: `${fgPct}% on recorded field-goal attempts.`,
      training: "Chart paint touches, catch-and-shoot rhythm and finishing through contact before adding contested pull-ups.",
      audience: "team",
    });
  }

  if (defensiveRebounds > 0 && defensiveReboundsPerPlayerGame < 2.4) {
    output.push({
      id: "rebounding",
      priority: "medium",
      focus: "Defensive rebounding",
      headline: "Finish defensive possessions",
      evidence: `${rounded(defensiveReboundsPerPlayerGame)} defensive rebounds per player-game in the current sample.`,
      training: "Use hit-find-get box-out reps and reward five-player rebound-and-outlet possessions.",
      audience: "team",
    });
  }

  if (foulsPerGame >= 18) {
    output.push({
      id: "defensive-discipline",
      priority: "medium",
      focus: "Defensive discipline",
      headline: "Defend without bailing out the offence",
      evidence: `${rounded(foulsPerGame)} team fouls per game in the recorded sample.`,
      training: "Work verticality, gap positioning and late-clock containment with no-reach scoring rules.",
      audience: "team",
    });
  }

  if (!output.length) {
    output.push({
      id: "balanced-sample",
      priority: "positive",
      focus: "Keep building the sample",
      headline: "No major team weakness is crossing the alert line",
      evidence: `${games} game${games === 1 ? "" : "s"} currently support this view.`,
      training: "Maintain the current plan and capture the next complete game to reveal trends, not one-game noise.",
      audience: "team",
    });
  }

  return output.slice(0, 4);
}

function playerRecommendations(lines: BasketballStatLine[]) {
  const groups = new Map<string, BasketballStatLine[]>();
  for (const line of lines) {
    const key = String(line.roster_member_id || line.player_id || line.display_name || "");
    if (!key) continue;
    groups.set(key, [...(groups.get(key) || []), line]);
  }

  const output: BasketballIQRecommendation[] = [];
  for (const playerLines of groups.values()) {
    const first = playerLines[0];
    const games = new Set(playerLines.map((line) => line.session_id).filter(Boolean)).size || playerLines.length;
    const turnovers = sum(playerLines, "turnovers");
    const assists = sum(playerLines, "assists");
    const ftMade = sum(playerLines, "ft_made");
    const ftAttempted = sum(playerLines, "ft_attempted");
    const twoMade = sum(playerLines, "two_made");
    const twoAttempted = sum(playerLines, "two_attempted");
    const threeMade = sum(playerLines, "three_made");
    const threeAttempted = sum(playerLines, "three_attempted");
    const fgPct = percent(twoMade + threeMade, twoAttempted + threeAttempted);
    const ftPct = percent(ftMade, ftAttempted);
    const base = {
      audience: "player" as const,
      roster_member_id: first.roster_member_id,
      player_id: first.player_id,
      player_name: first.display_name || "Player",
    };

    if (turnovers / games >= 3 && assists / Math.max(turnovers, 1) < 1) {
      output.push({ ...base, id: `player-decisions-${base.roster_member_id || base.player_id}`, priority: "high", focus: "Decision-making", headline: `${base.player_name}: protect the next pass`, evidence: `${rounded(turnovers / games)} turnovers per game with a ${rounded(assists / Math.max(turnovers, 1), 2)} assist-to-turnover ratio.`, training: "Use guided pick-and-roll reads and weak-hand pressure reps with a two-second decision clock." });
    } else if (ftPct !== null && ftAttempted >= 5 && ftPct < 65) {
      output.push({ ...base, id: `player-ft-${base.roster_member_id || base.player_id}`, priority: "medium", focus: "Free throws", headline: `${base.player_name}: make the line automatic`, evidence: `${ftPct}% on ${ftAttempted} recorded attempts.`, training: "Complete a repeatable breathing routine and log 30 pressure free throws after practice." });
    } else if (fgPct !== null && twoAttempted + threeAttempted >= 8 && fgPct < 38) {
      output.push({ ...base, id: `player-finishing-${base.roster_member_id || base.player_id}`, priority: "medium", focus: "Finishing", headline: `${base.player_name}: simplify the shot diet`, evidence: `${fgPct}% on recorded field-goal attempts.`, training: "Chart game-speed makes from the player’s two strongest zones, then add one counter finish." });
    }
  }
  return output.slice(0, 8);
}

export function buildBasketballIQ(lines: BasketballStatLine[]) {
  const sessionIds = new Set(lines.map((line) => line.session_id).filter(Boolean));
  const games = sessionIds.size || (lines.length ? 1 : 0);
  const points = sum(lines, "points");
  const assists = sum(lines, "assists");
  const turnovers = sum(lines, "turnovers");
  const ftMade = sum(lines, "ft_made");
  const ftAttempted = sum(lines, "ft_attempted");
  const twoMade = sum(lines, "two_made");
  const twoAttempted = sum(lines, "two_attempted");
  const threeMade = sum(lines, "three_made");
  const threeAttempted = sum(lines, "three_attempted");

  return {
    sample_games: games,
    metrics: {
      points_per_game: games ? rounded(points / games) : 0,
      assists_per_game: games ? rounded(assists / games) : 0,
      turnovers_per_game: games ? rounded(turnovers / games) : 0,
      assist_turnover_ratio: turnovers ? rounded(assists / turnovers, 2) : assists,
      field_goal_percentage: percent(twoMade + threeMade, twoAttempted + threeAttempted),
      free_throw_percentage: percent(ftMade, ftAttempted),
    },
    recommendations: recommendationsFor(lines, games),
    player_recommendations: playerRecommendations(lines),
  };
}
