export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";

type Player = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
};

type GuestHooper = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
};

type OneOnOneRow = {
  id: string;

  calendar_matchup_id?: string | null;

  match_number?: string | null;
  match_title?: string | null;
  match_type?: string | null;
  court?: string | null;

  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;
  participant_name?: string | null;
  participant_cutout_url?: string | null;
  participant_photo_url?: string | null;
  player_one_cutout_url?: string | null;

  opponent_type?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  opponent_name?: string | null;
  opponent_cutout_url?: string | null;
  opponent_photo_url?: string | null;
  player_two_cutout_url?: string | null;

  match_date?: string | null;
  venue?: string | null;
  location?: string | null;

  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  result?: string | null;
  status?: string | null;

  notes?: string | null;
  poster_url?: string | null;
  video_url?: string | null;
  highlight_url?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type Identity = {
  id: string;
  name: string;
  type: "fackts_player" | "guest_hooper" | "external";
  position?: string | null;
  photo_url?: string | null;
};

type LeaderboardItem = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  points: number;
  pointsAllowed: number;
  pointDiff: number;
  winRate: number;
  avgPoints: number;
  type: "fackts_player" | "guest_hooper" | "external";
};

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function cleanName(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

function getPersonName(person?: Player | GuestHooper | null) {
  if (!person) return "";
  return person.full_name || person.name || person.nickname || "";
}

function getPersonPhoto(person?: Player | GuestHooper | null) {
  if (!person) return "";
  return person.photo_url || person.image_url || "";
}

function getPersonPosition(person?: Player | GuestHooper | null) {
  if (!person) return "";
  return person.position || "";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function findPlayerByName(name: string | null | undefined, players: Player[]) {
  const cleaned = cleanName(name);
  if (!cleaned) return null;

  return (
    players.find((player) => {
      return (
        cleanName(player.full_name) === cleaned ||
        cleanName(player.name) === cleaned ||
        cleanName(player.nickname) === cleaned
      );
    }) || null
  );
}

function findGuestByName(
  name: string | null | undefined,
  guests: GuestHooper[]
) {
  const cleaned = cleanName(name);
  if (!cleaned) return null;

  return (
    guests.find((guest) => {
      return (
        cleanName(guest.full_name) === cleaned ||
        cleanName(guest.name) === cleaned ||
        cleanName(guest.nickname) === cleaned
      );
    }) || null
  );
}

function getPlayer1Identity(
  row: OneOnOneRow,
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>
): Identity {
  const rowImage =
    row.player_one_cutout_url ||
    row.participant_cutout_url ||
    row.participant_photo_url ||
    "";

  if (row.participant_type === "fackts_player" || row.fackts_player_id) {
    const player = row.fackts_player_id
      ? playerMap.get(String(row.fackts_player_id))
      : null;

    const fallbackName = row.participant_name || "Player 1";

    return {
      id: `player-${row.fackts_player_id || row.id}`,
      name: getPersonName(player) || fallbackName,
      type: "fackts_player",
      position: getPersonPosition(player) || "FACKTS Player",
      photo_url: rowImage || getPersonPhoto(player),
    };
  }

  if (row.participant_type === "guest_hooper" || row.guest_hooper_id) {
    const guest = row.guest_hooper_id
      ? guestMap.get(String(row.guest_hooper_id))
      : null;

    const fallbackName = row.participant_name || "Guest Hooper";

    return {
      id: `guest-${row.guest_hooper_id || row.id}`,
      name: getPersonName(guest) || fallbackName,
      type: "guest_hooper",
      position: getPersonPosition(guest) || "Guest Hooper",
      photo_url: rowImage || getPersonPhoto(guest),
    };
  }

  return {
    id: `external-player-1-${cleanName(row.participant_name) || row.id}`,
    name: row.participant_name || "Player 1",
    type: "external",
    position: "External",
    photo_url: rowImage,
  };
}

function getPlayer2Identity(
  row: OneOnOneRow,
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>,
  players: Player[],
  guests: GuestHooper[]
): Identity {
  const rowImage =
    row.player_two_cutout_url ||
    row.opponent_cutout_url ||
    row.opponent_photo_url ||
    "";

  if (row.opponent_type === "fackts_player" || row.opponent_player_id) {
    const player = row.opponent_player_id
      ? playerMap.get(String(row.opponent_player_id))
      : null;

    const fallbackName = row.opponent_name || "Player 2";

    return {
      id: `player-${row.opponent_player_id || row.id}`,
      name: getPersonName(player) || fallbackName,
      type: "fackts_player",
      position: getPersonPosition(player) || "FACKTS Player",
      photo_url: rowImage || getPersonPhoto(player),
    };
  }

  if (row.opponent_type === "guest_hooper" || row.opponent_guest_hooper_id) {
    const guest = row.opponent_guest_hooper_id
      ? guestMap.get(String(row.opponent_guest_hooper_id))
      : null;

    const fallbackName = row.opponent_name || "Guest Hooper";

    return {
      id: `guest-${row.opponent_guest_hooper_id || row.id}`,
      name: getPersonName(guest) || fallbackName,
      type: "guest_hooper",
      position: getPersonPosition(guest) || "Guest Hooper",
      photo_url: rowImage || getPersonPhoto(guest),
    };
  }

  const matchedPlayer = findPlayerByName(row.opponent_name, players);

  if (matchedPlayer) {
    return {
      id: `player-${matchedPlayer.id}`,
      name: getPersonName(matchedPlayer) || row.opponent_name || "Player 2",
      type: "fackts_player",
      position: getPersonPosition(matchedPlayer) || "FACKTS Player",
      photo_url: rowImage || getPersonPhoto(matchedPlayer),
    };
  }

  const matchedGuest = findGuestByName(row.opponent_name, guests);

  if (matchedGuest) {
    return {
      id: `guest-${matchedGuest.id}`,
      name: getPersonName(matchedGuest) || row.opponent_name || "Player 2",
      type: "guest_hooper",
      position: getPersonPosition(matchedGuest) || "Guest Hooper",
      photo_url: rowImage || getPersonPhoto(matchedGuest),
    };
  }

  return {
    id: `external-player-2-${cleanName(row.opponent_name) || row.id}`,
    name: row.opponent_name || "Player 2",
    type: "external",
    position: "External",
    photo_url: rowImage,
  };
}

function getPlayer1Score(row: OneOnOneRow) {
  return numberValue(row.points_scored);
}

function getPlayer2Score(row: OneOnOneRow) {
  return numberValue(row.points_allowed);
}

function hasScores(row: OneOnOneRow) {
  return getPlayer1Score(row) !== null && getPlayer2Score(row) !== null;
}

function getMatchStatus(row: OneOnOneRow) {
  const status = (row.status || "").toLowerCase().trim();

  if (status === "cancelled") return "Cancelled";

  if (
    status === "upcoming" ||
    status === "pending" ||
    status === "scheduled"
  ) {
    return "Upcoming";
  }

  if (status === "completed" || status === "played" || status === "final") {
    return "Completed";
  }

  if (hasScores(row)) return "Completed";

  return "Upcoming";
}

function getWinnerSide(row: OneOnOneRow) {
  const score1 = getPlayer1Score(row);
  const score2 = getPlayer2Score(row);

  if (score1 === null || score2 === null) return null;
  if (score1 > score2) return "player1";
  if (score2 > score1) return "player2";
  return "draw";
}

function getWinnerName(row: OneOnOneRow, player1Name: string, player2Name: string) {
  if (getMatchStatus(row) !== "Completed") return "Not decided";

  const winnerSide = getWinnerSide(row);

  if (winnerSide === "player1") return player1Name;
  if (winnerSide === "player2") return player2Name;
  if (winnerSide === "draw") return "Draw";

  return "Not decided";
}

function getResultLabel(row: OneOnOneRow) {
  const status = getMatchStatus(row);

  if (status === "Upcoming") return "Upcoming";
  if (status === "Cancelled") return "Cancelled";

  const winnerSide = getWinnerSide(row);

  if (winnerSide === "player1") return "Player 1 Win";
  if (winnerSide === "player2") return "Player 2 Win";
  if (winnerSide === "draw") return "Draw";

  return "Completed";
}

function getMargin(row: OneOnOneRow) {
  const score1 = getPlayer1Score(row);
  const score2 = getPlayer2Score(row);

  if (score1 === null || score2 === null) return null;

  return Math.abs(score1 - score2);
}

function getTotalPoints(row: OneOnOneRow) {
  const score1 = getPlayer1Score(row);
  const score2 = getPlayer2Score(row);

  if (score1 === null || score2 === null) return null;

  return score1 + score2;
}

function getPlayer1Share(row: OneOnOneRow) {
  const score1 = getPlayer1Score(row);
  const total = getTotalPoints(row);

  if (score1 === null || total === null || total === 0) return null;

  return (score1 / total) * 100;
}

function getPlayer2Share(row: OneOnOneRow) {
  const score2 = getPlayer2Score(row);
  const total = getTotalPoints(row);

  if (score2 === null || total === null || total === 0) return null;

  return (score2 / total) * 100;
}

function getIntensity(row: OneOnOneRow) {
  const status = getMatchStatus(row);
  const margin = getMargin(row);
  const totalPoints = getTotalPoints(row);

  if (status === "Upcoming") return "Awaiting Tip-Off";
  if (margin === null || totalPoints === null) return "Awaiting Data";
  if (margin <= 2) return "Clutch Battle";
  if (margin <= 5) return "Competitive";
  if (margin >= 10) return "Statement Win";

  return "Controlled Win";
}

function getRowLocation(row: OneOnOneRow) {
  return [row.venue, row.location, row.court].filter(Boolean).join(" • ") || "Court TBA";
}

function getDateForDisplay(row: OneOnOneRow) {
  if (row.match_date) return row.match_date;

  if (getMatchStatus(row) === "Completed") {
    return row.created_at || null;
  }

  return null;
}

function formatFixtureDate(value?: string | null) {
  if (!value) return "DATE TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "DATE TBA";

  return date
    .toLocaleDateString("en-KE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(",", "")
    .toUpperCase();
}

function formatFixtureTime(value?: string | null) {
  if (!value) return "TIME TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "TIME TBA";

  return date
    .toLocaleTimeString("en-KE", {
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(":", ".")
    .replace(" ", "")
    .toUpperCase();
}

function parseDateForSort(row: OneOnOneRow) {
  const value = row.match_date || row.created_at || "";
  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseMatchNumber(value?: string | null) {
  if (!value) return 9999;

  const numberOnly = Number(String(value).replace(/[^0-9]/g, ""));

  if (Number.isNaN(numberOnly) || numberOnly === 0) return 9999;

  return numberOnly;
}

async function getData() {
  const supabase = getSupabase();

  const [playersResult, guestsResult, rowsResult] = await Promise.all([
    supabase.from("players").select("*").eq("player_type", FACKTS_PLAYER_TYPE),
    supabase.from("guest_hoopers").select("*"),
    supabase
      .from("guest_one_on_one_stats")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const players = (playersResult.data || []) as Player[];
  const guests = (guestsResult.data || []) as GuestHooper[];

  const rows = ((rowsResult.data || []) as OneOnOneRow[]).sort((a, b) => {
    const statusA = getMatchStatus(a);
    const statusB = getMatchStatus(b);

    if (statusA === "Upcoming" && statusB !== "Upcoming") return -1;
    if (statusA !== "Upcoming" && statusB === "Upcoming") return 1;

    const numberDiff =
      parseMatchNumber(a.match_number) - parseMatchNumber(b.match_number);

    if (numberDiff !== 0) return numberDiff;

    if (statusA === "Upcoming" && statusB === "Upcoming") {
      return parseDateForSort(a) - parseDateForSort(b);
    }

    return parseDateForSort(b) - parseDateForSort(a);
  });

  const playerMap = new Map<string, Player>();
  players.forEach((player) => playerMap.set(String(player.id), player));

  const guestMap = new Map<string, GuestHooper>();
  guests.forEach((guest) => guestMap.set(String(guest.id), guest));

  return {
    rows,
    players,
    guests,
    playerMap,
    guestMap,
  };
}

function buildLeaderboard(
  rows: OneOnOneRow[],
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>,
  players: Player[],
  guests: GuestHooper[]
) {
  const board = new Map<string, LeaderboardItem>();

  function ensureItem(identity: Identity) {
    if (!board.has(identity.id)) {
      board.set(identity.id, {
        id: identity.id,
        name: identity.name,
        type: identity.type,
        wins: 0,
        losses: 0,
        draws: 0,
        matches: 0,
        points: 0,
        pointsAllowed: 0,
        pointDiff: 0,
        winRate: 0,
        avgPoints: 0,
      });
    }

    return board.get(identity.id)!;
  }

  rows.forEach((row) => {
    if (getMatchStatus(row) !== "Completed") return;

    const player1Score = getPlayer1Score(row);
    const player2Score = getPlayer2Score(row);

    if (player1Score === null || player2Score === null) return;

    const player1 = getPlayer1Identity(row, playerMap, guestMap);
    const player2 = getPlayer2Identity(row, playerMap, guestMap, players, guests);

    const player1Item = ensureItem(player1);
    const player2Item = ensureItem(player2);

    player1Item.matches += 1;
    player1Item.points += player1Score;
    player1Item.pointsAllowed += player2Score;

    player2Item.matches += 1;
    player2Item.points += player2Score;
    player2Item.pointsAllowed += player1Score;

    if (player1Score > player2Score) {
      player1Item.wins += 1;
      player2Item.losses += 1;
    } else if (player2Score > player1Score) {
      player2Item.wins += 1;
      player1Item.losses += 1;
    } else {
      player1Item.draws += 1;
      player2Item.draws += 1;
    }
  });

  const items = Array.from(board.values()).map((item) => {
    const pointDiff = item.points - item.pointsAllowed;
    const winRate =
      item.matches > 0 ? Math.round((item.wins / item.matches) * 100) : 0;
    const avgPoints =
      item.matches > 0 ? Number((item.points / item.matches).toFixed(1)) : 0;

    return {
      ...item,
      pointDiff,
      winRate,
      avgPoints,
    };
  });

  return items.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.points !== a.points) return b.points - a.points;

    return b.matches - a.matches;
  });
}

function getHighestScoringMatch(rows: OneOnOneRow[]) {
  return (
    rows
      .filter((row) => getMatchStatus(row) === "Completed")
      .sort((a, b) => (getTotalPoints(b) || 0) - (getTotalPoints(a) || 0))[0] ||
    null
  );
}

function getClosestMatch(rows: OneOnOneRow[]) {
  return (
    rows
      .filter((row) => getMatchStatus(row) === "Completed")
      .sort((a, b) => (getMargin(a) || 9999) - (getMargin(b) || 9999))[0] ||
    null
  );
}

function getBiggestWin(rows: OneOnOneRow[]) {
  return (
    rows
      .filter((row) => getMatchStatus(row) === "Completed")
      .sort((a, b) => (getMargin(b) || 0) - (getMargin(a) || 0))[0] || null
  );
}

export default async function OneOnOnePage() {
  const { rows, players, guests, playerMap, guestMap } = await getData();

  const leaderboard = buildLeaderboard(
    rows,
    playerMap,
    guestMap,
    players,
    guests
  );

  const upcomingRows = rows.filter((row) => getMatchStatus(row) === "Upcoming");
  const completedRows = rows.filter((row) => getMatchStatus(row) === "Completed");
  const cancelledRows = rows.filter((row) => getMatchStatus(row) === "Cancelled");

  const highestScoringMatch = getHighestScoringMatch(rows);
  const closestMatch = getClosestMatch(rows);
  const biggestWin = getBiggestWin(rows);
  const topHooper = leaderboard[0] || null;

  return (
    <main
      className="min-h-screen bg-black bg-contain bg-scroll bg-top bg-no-repeat px-0 text-white md:bg-fixed"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.96)), url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/55 backdrop-blur-sm">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-9 sm:px-6 md:py-12 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Battle Lab
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                1-on-1 Battles
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                Compact fight cards for every FACKTS 1v1 battle. Approved calendar
                matchups appear here as pending upcoming battles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/calendar"
                className="rounded-full border border-orange-400/40 bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
              >
                Calendar
              </Link>

              <Link
                href="/court-takeover"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Court Takeover
              </Link>

              <Link
                href="/players"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Players
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Battles" value={rows.length} />
            <StatCard label="Completed" value={completedRows.length} />
            <StatCard label="Upcoming" value={upcomingRows.length} />
            <StatCard label="Ranked Hoopers" value={leaderboard.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Fight Card" title="Upcoming Battles" />

        {upcomingRows.length > 0 ? (
          <FixtureList
            rows={upcomingRows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No upcoming 1-on-1 battles added yet." />
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Data Lab" title="Battle Intelligence" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            label="Top Ranked"
            value={topHooper?.name || "No leader yet"}
            sub={
              topHooper
                ? `${topHooper.wins} wins • ${topHooper.winRate}% win rate`
                : "Needs completed battles"
            }
          />

          <InsightCard
            label="Highest Scoring"
            value={
              highestScoringMatch
                ? `${getTotalPoints(highestScoringMatch)} pts`
                : "No data"
            }
            sub={highestScoringMatch?.match_title || "Needs completed battles"}
          />

          <InsightCard
            label="Closest Battle"
            value={closestMatch ? `${getMargin(closestMatch)} pt margin` : "No data"}
            sub={closestMatch?.match_title || "Needs completed battles"}
          />

          <InsightCard
            label="Biggest Statement"
            value={biggestWin ? `${getMargin(biggestWin)} pt margin` : "No data"}
            sub={biggestWin?.match_title || "Needs completed battles"}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <LeaderboardCard
          eyebrow="1-on-1 Wins"
          title="Leaderboard"
          emptyText="No completed 1-on-1 results yet."
          items={leaderboard}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Results" title="Previous Battles" />

        {completedRows.length > 0 ? (
          <FixtureList
            rows={completedRows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No completed 1-on-1 results yet." />
        )}
      </section>

      {cancelledRows.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Cancelled" title="Cancelled Battles" />

          <FixtureList
            rows={cancelledRows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        </section>
      ) : null}
    </main>
  );
}

function FixtureList({
  rows,
  players,
  guests,
  playerMap,
  guestMap,
}: {
  rows: OneOnOneRow[];
  players: Player[];
  guests: GuestHooper[];
  playerMap: Map<string, Player>;
  guestMap: Map<string, GuestHooper>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <FixtureBattleCard
          key={row.id}
          row={row}
          players={players}
          guests={guests}
          playerMap={playerMap}
          guestMap={guestMap}
        />
      ))}
    </div>
  );
}

function FixtureBattleCard({
  row,
  players,
  guests,
  playerMap,
  guestMap,
}: {
  row: OneOnOneRow;
  players: Player[];
  guests: GuestHooper[];
  playerMap: Map<string, Player>;
  guestMap: Map<string, GuestHooper>;
}) {
  const player1 = getPlayer1Identity(row, playerMap, guestMap);
  const player2 = getPlayer2Identity(row, playerMap, guestMap, players, guests);

  const status = getMatchStatus(row);
  const player1Score = getPlayer1Score(row);
  const player2Score = getPlayer2Score(row);
  const winnerSide = getWinnerSide(row);
  const winnerName = getWinnerName(row, player1.name, player2.name);
  const displayDate = getDateForDisplay(row);

  return (
    <Link
      href={`/one-on-one/${row.id}`}
      className="group mx-auto block overflow-hidden rounded-[1.35rem] border border-white/10 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/60 hover:shadow-[0_16px_30px_rgba(37,99,235,0.18)]"
    >
      <div className="grid min-h-[88px] grid-cols-[1fr_150px] sm:min-h-[96px] sm:grid-cols-[1fr_240px]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-white px-3 py-2 text-black sm:gap-4 sm:px-4">
          <FixtureFighter
            identity={player1}
            score={player1Score}
            status={status}
            winner={winnerSide === "player1"}
            align="left"
          />

          <div className="flex flex-col items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-black uppercase text-slate-500 shadow-inner sm:h-10 sm:w-10">
              VS
            </div>

            <div className="mt-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-blue-800">
              {row.match_type || "1v1"}
            </div>
          </div>

          <FixtureFighter
            identity={player2}
            score={player2Score}
            status={status}
            winner={winnerSide === "player2"}
            align="right"
          />
        </div>

        <div className="relative flex flex-col justify-center overflow-hidden bg-[#0b2a66] px-3 py-2 text-white sm:px-4">
          {row.poster_url ? (
            <img
              src={row.poster_url}
              alt={row.match_title || `${player1.name} vs ${player2.name}`}
              className="absolute inset-0 h-full w-full object-cover opacity-12 transition duration-500 group-hover:scale-105"
            />
          ) : null}

          <div className="absolute inset-y-0 -left-7 w-12 skew-x-[-14deg] bg-white sm:-left-8 sm:w-14" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/95 via-[#0f2f73]/96 to-[#081a3d]/98" />

          <div className="relative pl-2 sm:pl-3">
            <div className="mb-1.5 flex flex-wrap gap-1">
              <StatusBadge row={row} />

              {row.match_number ? (
                <span className="rounded-full bg-black/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white">
                  #{row.match_number}
                </span>
              ) : null}
            </div>

            <p className="line-clamp-2 text-[10px] font-black uppercase leading-4 tracking-[0.01em] text-white sm:text-[11px]">
              {row.match_title || `${player1.name} vs ${player2.name}`}
            </p>

            <div className="mt-1.5 flex items-end gap-2">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-blue-100 sm:text-[9px]">
                  {formatFixtureDate(displayDate)}
                </p>

                <p className="mt-0.5 text-lg font-black leading-none tracking-tight text-white sm:text-2xl">
                  {formatFixtureTime(displayDate)}
                </p>
              </div>
            </div>

            <p className="mt-1.5 line-clamp-1 text-[8px] font-bold uppercase tracking-[0.08em] text-blue-100 sm:text-[9px]">
              {getRowLocation(row)}
            </p>

            {status === "Completed" ? (
              <p className="mt-1.5 line-clamp-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[8px] font-black uppercase text-emerald-100">
                Winner: {winnerName}
              </p>
            ) : row.calendar_matchup_id ? (
              <p className="mt-1.5 line-clamp-1 rounded-full bg-blue-400/20 px-2 py-1 text-[8px] font-black uppercase text-blue-100">
                Calendar Approved
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function FixtureFighter({
  identity,
  score,
  status,
  winner,
  align,
}: {
  identity: Identity;
  score: number | null;
  status: string;
  winner: boolean;
  align: "left" | "right";
}) {
  const visibleScore = score === null && status === "Upcoming" ? 0 : score;

  return (
    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0"}>
      <div
        className={`mb-1 flex items-center gap-2 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 shadow-inner sm:h-11 sm:w-11">
          {identity.photo_url ? (
            <img
              src={identity.photo_url}
              alt={identity.name}
              className="h-full w-full object-contain p-0.5"
            />
          ) : (
            <div className="text-xs font-black text-blue-800">
              {getInitials(identity.name) || "FH"}
            </div>
          )}
        </div>
      </div>

      <p className="truncate text-[10px] font-black uppercase tracking-[0.03em] text-blue-900 sm:text-xs">
        {identity.name}
      </p>

      <p className="truncate text-[8px] font-bold uppercase tracking-[0.04em] text-slate-500 sm:text-[9px]">
        {identity.position || identity.type.replace("_", " ")}
      </p>

      <p
        className={
          winner
            ? "mt-1 text-2xl font-black leading-none text-blue-600 sm:text-4xl"
            : "mt-1 text-2xl font-black leading-none text-slate-950 sm:text-4xl"
        }
      >
        {visibleScore ?? "-"}
      </p>
    </div>
  );
}

function LeaderboardCard({
  eyebrow,
  title,
  emptyText,
  items,
}: {
  eyebrow: string;
  title: string;
  emptyText: string;
  items: LeaderboardItem[];
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-4 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-3xl font-black">{title}</h2>
        </div>

        <p className="text-xs font-bold text-zinc-500">
          Ranked by wins, win rate, point difference, and scoring.
        </p>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-2xl border border-white/10 bg-black/50 p-3 transition hover:border-orange-400/40 sm:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-black">
                {index + 1}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {item.name}
                </p>

                <p className="text-xs text-zinc-500">
                  {item.matches} battles • {item.points} pts •{" "}
                  {item.pointsAllowed} allowed
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center sm:w-[280px]">
                <LeaderboardStat label="W" value={item.wins} />
                <LeaderboardStat label="%" value={`${item.winRate}`} />
                <LeaderboardStat label="+/-" value={item.pointDiff} />
                <LeaderboardStat label="AVG" value={item.avgPoints} />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-black/40 p-4 text-sm text-zinc-500">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

function LeaderboardStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 px-2 py-2">
      <p className="text-[9px] font-black uppercase text-zinc-600">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function InsightCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
        {label}
      </p>

      <p className="mt-2 line-clamp-2 text-2xl font-black text-white">{value}</p>

      <p className="mt-2 line-clamp-2 text-xs font-bold text-zinc-500">{sub}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-3xl font-black">{title}</h2>
    </div>
  );
}

function StatusBadge({ row }: { row: OneOnOneRow }) {
  const status = getMatchStatus(row);

  const className =
    status === "Upcoming"
      ? "bg-blue-400/20 text-blue-100"
      : status === "Cancelled"
        ? "bg-red-500/20 text-red-100"
        : "bg-emerald-500/20 text-emerald-100";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${className}`}
    >
      {status}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 text-sm text-zinc-400 backdrop-blur-sm">
      {text}
    </div>
  );
}
