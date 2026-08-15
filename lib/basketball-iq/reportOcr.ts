export type OcrRosterMember = {
  id?: string;
  display_name?: string;
  nickname?: string | null;
  jersey_number?: string | null;
};

export type OcrStatRow = {
  player_name: string;
  jersey_number?: string;
  points: number;
  rebounds: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes: number;
  two_made: number;
  two_attempted: number;
  three_made: number;
  three_attempted: number;
  ft_made: number;
  ft_attempted: number;
  plus_minus: number;
};

export type OcrGameCandidate = {
  home_team_name: string;
  away_team_name: string;
  game_date: string;
  home_score: number;
  away_score: number;
  team_side: "home" | "away";
  period_scores: Array<{ period: string; home: number; away: number }>;
};

export type BasketballReportOcrResult = {
  match: OcrGameCandidate | null;
  rows: OcrStatRow[];
  home_rows: OcrStatRow[];
  away_rows: OcrStatRow[];
  warnings: string[];
};

function identity(value: unknown) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s|[-'])\p{L}/gu, (letter) => letter.toUpperCase()).trim();
}

function whole(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^0-9+-]/g, ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function nonNegative(value: unknown) {
  return Math.max(0, whole(value));
}

function cleanNumberText(value: string) {
  return value
    .replace(/[()]/g, " ")
    .replace(/(\d)\s*&\s*(\d)/g, "$1$2")
    .replace(/\b[oO]\b/g, "0")
    .replace(/\b[e¢]\b/g, "0")
    .replace(/\bi\b/g, "1")
    .replace(/[|]/g, "1")
    .replace(/,/g, ".");
}

function parseRosterPage(pageText: string) {
  const rows: OcrStatRow[] = [];
  for (const rawLine of pageText.split(/\r?\n/)) {
    const line = rawLine.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
    if (!line || /^total\b/i.test(line)) continue;
    const rowMatch = line.match(/^\s*(\S{1,3})\)?\s+(?:[*•]\s*)?([A-Za-z][A-Za-z .'-]{2,70}?)\s+((?:[0-5]?\d[:.][0-5]\d)|(?:[0-5]\d{3}\d?))\s+(.+)$/);
    if (!rowMatch) continue;
    const playerName = rowMatch[2].replace(/^[*•]\s*/, "").replace(/\s+/g, " ").trim();
    if (!playerName || /^(player|team|total)$/i.test(playerName)) continue;

    const tokens = cleanNumberText(rowMatch[4]).match(/[-+]?\d+(?:\.\d+)?%?/g) || [];
    const percentages = tokens.map((token, index) => token.endsWith("%") ? index : -1).filter((index) => index >= 0).slice(0, 4);
    let points = 0;
    let threeMade = 0;
    let threeAttempted = 0;
    let twoMade = 0;
    let twoAttempted = 0;
    let ftMade = 0;
    let ftAttempted = 0;
    let tail: string[] = [];
    let reliableShooting = false;

    if (percentages.length === 4) {
      const beforeFg = tokens.slice(0, percentages[0]);
      const three = tokens.slice(percentages[0] + 1, percentages[1]);
      const two = tokens.slice(percentages[1] + 1, percentages[2]);
      const freeThrows = tokens.slice(percentages[2] + 1, percentages[3]);
      reliableShooting = beforeFg.length >= 3 && three.length >= 2 && two.length >= 2 && freeThrows.length >= 2;
      points = nonNegative(beforeFg[0]);
      threeMade = nonNegative(three[0]);
      threeAttempted = Math.max(threeMade, nonNegative(three[1]));
      twoMade = nonNegative(two[0]);
      twoAttempted = Math.max(twoMade, nonNegative(two[1]));
      ftMade = nonNegative(freeThrows[0]);
      ftAttempted = Math.max(ftMade, nonNegative(freeThrows[1]));
      tail = tokens.slice(percentages[3] + 1);
    } else {
      const numeric = tokens.filter((token) => !token.endsWith("%"));
      points = nonNegative(numeric[0]);
      threeMade = nonNegative(numeric[3]);
      threeAttempted = Math.max(threeMade, nonNegative(numeric[4]));
      twoMade = nonNegative(numeric[5]);
      twoAttempted = Math.max(twoMade, nonNegative(numeric[6]));
      ftMade = nonNegative(numeric[7]);
      ftAttempted = Math.max(ftMade, nonNegative(numeric[8]));
      tail = numeric.slice(9);
    }

    const calculatedPoints = twoMade * 2 + threeMade * 3 + ftMade;
    if (reliableShooting && !points && calculatedPoints > 0) points = calculatedPoints;
    const offensiveRebounds = nonNegative(tail[0]);
    const defensiveRebounds = nonNegative(tail[1]);
    const reportedRebounds = nonNegative(tail[2]);
    const minuteText = rowMatch[3].replace(/[^0-9]/g, "").slice(0, 4).padStart(4, "0");
    const minutes = Number(minuteText.slice(0, -2)) + Number(minuteText.slice(-2)) / 60;
    rows.push({
      player_name: titleCase(playerName).slice(0, 180),
      jersey_number: /^\d{1,2}$/.test(rowMatch[1]) ? rowMatch[1] : undefined,
      points,
      rebounds: offensiveRebounds + defensiveRebounds || reportedRebounds,
      offensive_rebounds: offensiveRebounds,
      defensive_rebounds: defensiveRebounds,
      assists: nonNegative(tail[3]),
      turnovers: nonNegative(tail[4]),
      steals: nonNegative(tail[5]),
      blocks: nonNegative(tail[6]),
      fouls: nonNegative(tail[8]),
      minutes: Math.round(minutes * 100) / 100,
      two_made: twoMade,
      two_attempted: twoAttempted,
      three_made: threeMade,
      three_attempted: threeAttempted,
      ft_made: ftMade,
      ft_attempted: ftAttempted,
      plus_minus: whole(tail.at(-1)),
    });
  }
  return rows;
}

function reconcilePoints(rows: OcrStatRow[], expectedTotal: number) {
  const currentTotal = rows.reduce((sum, row) => sum + row.points, 0);
  const required = expectedTotal - currentTotal;
  if (!required) return rows;
  const candidates = rows.map((row, index) => ({ index, value: row.two_made * 2 + row.three_made * 3 + row.ft_made, current: row.points }))
    .filter((item) => item.value >= 0 && item.value !== item.current && Math.abs(item.value - item.current) <= 30);
  const choices = new Map<number, number[]>([[0, []]]);
  for (const candidate of candidates) {
    for (const [delta, selected] of Array.from(choices.entries())) {
      const nextDelta = delta + candidate.value - candidate.current;
      const nextSelected = [...selected, candidate.index];
      if (!choices.has(nextDelta) || nextSelected.length < (choices.get(nextDelta)?.length || Number.POSITIVE_INFINITY)) choices.set(nextDelta, nextSelected);
    }
  }
  const selected = choices.get(required);
  if (!selected) return rows;
  const selectedSet = new Set(selected);
  return rows.map((row, index) => selectedSet.has(index) ? { ...row, points: row.two_made * 2 + row.three_made * 3 + row.ft_made } : row);
}

function filenameMatch(fileName: string) {
  const cleaned = fileName.replace(/\.[^.]+$/, "");
  const match = cleaned.match(/^(.+?)_vs_(.+?)_\((\d{2})-(\d{2})-(\d{4})/i);
  if (!match) return null;
  return {
    home: match[1].replace(/_/g, " ").trim(),
    away: match[2].replace(/_/g, " ").trim(),
    date: `${match[5]}-${match[4]}-${match[3]}`,
  };
}

function parseDate(value: string, fallback = "") {
  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const named = value.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (named) return `${named[3]}-${monthNames[named[1].slice(0, 3).toLowerCase()]}-${named[2].padStart(2, "0")}`;
  const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  return fallback;
}

function parseScoreLines(value: string) {
  const results: Array<{ name: string; total: number; periods: number[] }> = [];
  const beforeOfficials = value.split(/referees/i)[0];
  for (const rawLine of beforeOfficials.split(/\r?\n/)) {
    const line = cleanNumberText(rawLine).replace(/\s+/g, " ").trim();
    const firstNumber = line.search(/\d/);
    if (firstNumber < 2) continue;
    const name = line.slice(0, firstNumber).replace(/[^A-Za-z &'-.]/g, " ").replace(/\s+/g, " ").trim();
    const values = (line.slice(firstNumber).match(/\d{1,3}/g) || []).map(Number).filter((number) => number >= 0 && number <= 250);
    if (!name || values.length < 3) continue;
    const total = values.at(-1) || 0;
    if (total <= 0) continue;
    results.push({ name: titleCase(name), total, periods: values.slice(0, -1) });
    if (results.length === 2) break;
  }
  return results;
}

function distance(left: string, right: string) {
  const rows = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = rows[0];
    rows[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = rows[rightIndex];
      rows[rightIndex] = Math.min(
        rows[rightIndex] + 1,
        rows[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return rows[right.length];
}

function rosterMatches(rows: OcrStatRow[], roster: OcrRosterMember[]) {
  const rosterNames = roster.flatMap((member) => [member.display_name, member.nickname].map(identity).filter(Boolean));
  return rows.reduce((count, row) => {
    const candidate = identity(row.player_name);
    const matched = rosterNames.some((name) => name === candidate || name.includes(candidate) || candidate.includes(name) || distance(name, candidate) <= 2);
    return count + (matched ? 1 : 0);
  }, 0);
}

export function parseBasketballReportOcr(
  pages: { page1: string; page3: string; page4: string; page5: string },
  roster: OcrRosterMember[],
  fileName: string,
): BasketballReportOcrResult {
  const warnings = [
    "Image-based PDF read with OCR. Every player match and stat must be reviewed before submission.",
  ];
  let homeRows = parseRosterPage(pages.page4);
  let awayRows = parseRosterPage(pages.page5);
  const homeMatches = rosterMatches(homeRows, roster);
  const awayMatches = rosterMatches(awayRows, roster);
  const fileHintsHome = /(?:^|[_ -])home(?:[_ .-]|$)/i.test(fileName);
  const teamSide: "home" | "away" = awayMatches > homeMatches ? "away" : fileHintsHome || homeMatches >= awayMatches ? "home" : "away";
  const rows = teamSide === "home" ? homeRows : awayRows;
  if (!rows.length) warnings.push("No safe player table was detected. Keep the file as evidence and use the manual review grid.");
  if (!Math.max(homeMatches, awayMatches)) warnings.push("The OCR player names did not match the current roster automatically. Match them manually before saving.");

  const fileMatch = filenameMatch(fileName);
  const scoreLines = parseScoreLines(pages.page3);
  const homeName = scoreLines[0]?.name || fileMatch?.home || "Home team";
  const awayName = scoreLines[1]?.name || fileMatch?.away || "Away team";
  const homeScore = scoreLines[0]?.total || homeRows.reduce((sum, row) => sum + row.points, 0);
  const awayScore = scoreLines[1]?.total || awayRows.reduce((sum, row) => sum + row.points, 0);
  homeRows = reconcilePoints(homeRows, homeScore);
  awayRows = reconcilePoints(awayRows, awayScore);
  const selectedRows = teamSide === "home" ? homeRows : awayRows;
  const gameDate = fileMatch?.date || parseDate(pages.page1);
  const validGame = Boolean(homeName && awayName && gameDate && homeScore >= 0 && awayScore >= 0 && homeScore !== awayScore);
  const periodCount = Math.min(scoreLines[0]?.periods.length || 0, scoreLines[1]?.periods.length || 0);
  const periodScores = Array.from({ length: Math.min(periodCount, 8) }, (_, index) => ({
    period: index < 4 ? `Q${index + 1}` : `OT${index - 3}`,
    home: scoreLines[0].periods[index],
    away: scoreLines[1].periods[index],
  })).filter((item) => Number.isFinite(item.home) && Number.isFinite(item.away));
  const trustworthyPeriods = periodScores.reduce((sum, item) => sum + item.home, 0) === homeScore
    && periodScores.reduce((sum, item) => sum + item.away, 0) === awayScore ? periodScores : [];
  const selectedScore = teamSide === "home" ? homeScore : awayScore;
  const selectedTotal = selectedRows.reduce((sum, row) => sum + row.points, 0);
  if (selectedRows.length && selectedTotal !== selectedScore) warnings.push(`OCR player points total ${selectedTotal}, but the detected final score is ${selectedScore}. Correct the review grid before submission.`);

  return {
    match: validGame ? {
      home_team_name: homeName,
      away_team_name: awayName,
      game_date: gameDate,
      home_score: homeScore,
      away_score: awayScore,
      team_side: teamSide,
      period_scores: trustworthyPeriods,
    } : null,
    rows: selectedRows,
    home_rows: homeRows,
    away_rows: awayRows,
    warnings,
  };
}
