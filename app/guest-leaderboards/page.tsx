import Link from "next/link";
import {
  getCareerGameTotals,
  mergeCareerGameStats,
} from "@/lib/hoops/careerStats";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type GuestLeader = {
  id: string;
  source_id: string;
  source_player_id: string | null;
  guest_type: string | null;
  source: "guest_hoopers" | "players";
  full_name: string;
  nickname: string | null;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  photo_position: string | null;

  games_played: number;
  total_points: number;
  points_per_game: number;
  total_assists: number;
  assists_per_game: number;
  total_rebounds: number;
  rebounds_per_game: number;
  total_steals: number;
  steals_per_game: number;
  total_blocks: number;
  blocks_per_game: number;
  total_three_pointers_made: number;

  one_v_one_matches: number;
  one_v_one_wins: number;
  one_v_one_losses: number;
};

function hasValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

function getPersonName(person: any) {
  return (
    person.full_name ||
    person.name ||
    person.nickname ||
    "Guest Hooper"
  );
}

function guestKey(guest: GuestLeader) {
  return String(guest.full_name || guest.nickname || guest.id)
    .trim()
    .toLowerCase();
}

type OneOnOneStatRow = {
  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;
  opponent_type?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  opponent_name?: string | null;
  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  result?: string | null;
  status?: string | null;
  matches_played?: number | string | null;
  wins?: number | string | null;
  losses?: number | string | null;
};

function statNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function oneOnOneCareerTotals(
  rows: OneOnOneStatRow[],
  guestId: string,
  sourcePlayerId?: string | null
) {
  return rows.reduce<{ matches: number; wins: number; losses: number }>(
    (totals, row) => {
      const isParticipant =
        row.guest_hooper_id === guestId ||
        Boolean(sourcePlayerId && row.fackts_player_id === sourcePlayerId);
      const isOpponent =
        row.opponent_guest_hooper_id === guestId ||
        Boolean(sourcePlayerId && row.opponent_player_id === sourcePlayerId);

      if (!isParticipant && !isOpponent) return totals;

      const aggregateMatches = statNumber(row.matches_played);
      const aggregateWins = statNumber(row.wins);
      const aggregateLosses = statNumber(row.losses);
      const hasMatchOpponent = Boolean(
        row.opponent_player_id ||
          row.opponent_guest_hooper_id ||
          row.opponent_name
      );

      if (
        !hasMatchOpponent &&
        (aggregateMatches > 0 || aggregateWins > 0 || aggregateLosses > 0)
      ) {
        totals.matches += aggregateMatches || aggregateWins + aggregateLosses;
        totals.wins += aggregateWins;
        totals.losses += aggregateLosses;
        return totals;
      }

      const status = String(row.status ?? "").toLowerCase();
      if (["upcoming", "pending", "scheduled", "cancelled"].includes(status)) {
        return totals;
      }

      const score1 = Number(row.points_scored);
      const score2 = Number(row.points_allowed);
      const hasScores = Number.isFinite(score1) && Number.isFinite(score2);
      const result = String(row.result ?? "").toLowerCase();

      if (!hasScores && !["win", "won", "loss", "lost", "draw"].includes(result)) {
        return totals;
      }

      totals.matches += 1;

      if (hasScores) {
        const ownScore = isParticipant ? score1 : score2;
        const otherScore = isParticipant ? score2 : score1;
        if (ownScore > otherScore) totals.wins += 1;
        if (ownScore < otherScore) totals.losses += 1;
        return totals;
      }

      const participantWon = result === "win" || result === "won";
      const participantLost = result === "loss" || result === "lost";
      if ((isParticipant && participantWon) || (isOpponent && participantLost)) {
        totals.wins += 1;
      }
      if ((isParticipant && participantLost) || (isOpponent && participantWon)) {
        totals.losses += 1;
      }
      return totals;
    },
    { matches: 0, wins: 0, losses: 0 }
  );
}

function avg(value: number, gamesPlayed: number) {
  return gamesPlayed > 0 ? Number((value / gamesPlayed).toFixed(1)) : 0;
}

function sumGameStats(rows: any[]) {
  return rows.reduce(
    (acc: any, row: any) => {
      acc.total_points += Number(row.points ?? 0);
      acc.total_assists += Number(row.assists ?? 0);
      acc.total_rebounds += Number(row.rebounds ?? 0);
      acc.total_steals += Number(row.steals ?? 0);
      acc.total_blocks += Number(row.blocks ?? 0);
      acc.total_three_pointers_made += Number(row.three_pointers_made ?? 0);
      return acc;
    },
    {
      total_points: 0,
      total_assists: 0,
      total_rebounds: 0,
      total_steals: 0,
      total_blocks: 0,
      total_three_pointers_made: 0,
    }
  );
}

function sumOneOnOneStats(rows: any[]) {
  return rows.reduce(
    (acc: any, row: any) => {
      acc.matches += Number(row.matches_played ?? 0);

      if (Number(row.wins ?? 0) > 0 || Number(row.losses ?? 0) > 0) {
        acc.wins += Number(row.wins ?? 0);
        acc.losses += Number(row.losses ?? 0);
      } else {
        const result = String(row.result ?? "").toLowerCase();
        if (result === "win" || result === "won") acc.wins += 1;
        if (result === "loss" || result === "lost") acc.losses += 1;
      }

      return acc;
    },
    {
      matches: 0,
      wins: 0,
      losses: 0,
    }
  );
}

async function getGuestLeaderboard(): Promise<GuestLeader[]> {
  const [
    guestsResult,
    guestGameStatsResult,
    playerGameStatsResult,
    guestOneOnOneResult,
  ] = await Promise.all([
    supabase
      .from("guest_hoopers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),

    supabase.from("guest_game_stats").select("*"),

    supabase.from("player_game_stats").select("*"),

    supabase.from("guest_one_on_one_stats").select("*"),
  ]);

  if (guestsResult.error) {
    console.error("Guest hoopers error:", guestsResult.error.message);
  }

  if (guestGameStatsResult.error) {
    console.error("Guest game stats error:", guestGameStatsResult.error.message);
  }

  if (playerGameStatsResult.error) {
    console.error("Former player stats error:", playerGameStatsResult.error.message);
  }

  if (guestOneOnOneResult.error) {
    console.error("Guest 1v1 stats error:", guestOneOnOneResult.error.message);
  }

  const guests = guestsResult.data ?? [];
  const guestGameStats = guestGameStatsResult.data ?? [];
  const playerGameStats = playerGameStatsResult.data ?? [];
  const guestOneOnOneStats = guestOneOnOneResult.data ?? [];

  return guests.map((guest: any): GuestLeader => {
    const guestRows = guestGameStats.filter(
      (row: any) => row.guest_hooper_id === guest.id
    );
    const formerPlayerRows = guest.source_player_id
      ? playerGameStats.filter((row: any) => row.player_id === guest.source_player_id)
      : [];
    const careerRows = mergeCareerGameStats(guestRows, formerPlayerRows);
    const totals = getCareerGameTotals(careerRows);
    const gamesPlayed = totals.gamesPlayed;
    const oneVOneTotals = oneOnOneCareerTotals(
      guestOneOnOneStats,
      guest.id,
      guest.source_player_id
    );

    const calculatedMatches =
      oneVOneTotals.matches > 0
        ? oneVOneTotals.matches
        : oneVOneTotals.wins + oneVOneTotals.losses;

    return {
      id: `guest-${guest.id}`,
      source_id: guest.id,
      source_player_id: guest.source_player_id ?? null,
      guest_type: guest.guest_type ?? null,
      source: "guest_hoopers",
      full_name: getPersonName(guest),
      nickname: guest.nickname ?? null,
      position: guest.position ?? null,
      role:
        guest.role ??
        (guest.guest_type === "external_player" ? "External Player" : "Guest Hooper"),
      photo_url: guest.photo_url ?? null,
      photo_position: guest.photo_position ?? null,

      games_played: gamesPlayed,
      total_points: totals.points,
      points_per_game: avg(totals.points, gamesPlayed),
      total_assists: totals.assists,
      assists_per_game: avg(totals.assists, gamesPlayed),
      total_rebounds: totals.rebounds,
      rebounds_per_game: avg(totals.rebounds, gamesPlayed),
      total_steals: totals.steals,
      steals_per_game: avg(totals.steals, gamesPlayed),
      total_blocks: totals.blocks,
      blocks_per_game: avg(totals.blocks, gamesPlayed),
      total_three_pointers_made: totals.threePointersMade,

      one_v_one_matches: calculatedMatches,
      one_v_one_wins: oneVOneTotals.wins,
      one_v_one_losses: oneVOneTotals.losses,
    };
  });
}

function sortByStat(players: GuestLeader[], statKey: keyof GuestLeader) {
  return [...players].sort((a: any, b: any) => {
    const statDiff = Number(b[statKey] ?? 0) - Number(a[statKey] ?? 0);
    if (statDiff !== 0) return statDiff;
    return b.games_played - a.games_played;
  });
}

function formatStat(value: any, statKey: keyof GuestLeader) {
  if (
    statKey === "points_per_game" ||
    statKey === "assists_per_game" ||
    statKey === "rebounds_per_game" ||
    statKey === "steals_per_game" ||
    statKey === "blocks_per_game"
  ) {
    return Number(value ?? 0).toFixed(1);
  }

  return String(value ?? 0);
}

export default async function GuestLeaderboardsPage() {
  const leaderboard = await getGuestLeaderboard();

  const bestPPG = sortByStat(leaderboard, "points_per_game");
  const totalPoints = sortByStat(leaderboard, "total_points");
  const bestRebounds = sortByStat(leaderboard, "rebounds_per_game");
  const bestAPG = sortByStat(leaderboard, "assists_per_game");
  const mostGames = sortByStat(leaderboard, "games_played");
  const mostThrees = sortByStat(leaderboard, "total_three_pointers_made");
  const oneVOneWins = sortByStat(leaderboard, "one_v_one_wins");
  const oneVOneMatches = sortByStat(leaderboard, "one_v_one_matches");

  const topScorer = bestPPG[0];
  const topWinner = oneVOneWins[0];
  const mostActive = mostGames[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
              Guest Hooper Rankings
            </div>

            <h1 className="mt-5 text-4xl font-black uppercase tracking-tight md:text-6xl">
              Guest Leaders
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
              Guest rankings now include guest table stats plus old player
              stats for anyone converted to{" "}
              <span className="font-black text-orange-300">Guest Hooper</span>.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/guest-hoopers"
                className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
              >
                Guest Hoopers
              </Link>

              <Link
                href="/court-takeover"
                className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Court Takeover
              </Link>

              <Link
                href="/prospects"
                className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Prospects
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <LeaderHeroStat
              label="Top Guest PPG"
              value={topScorer ? topScorer.points_per_game.toFixed(1) : "0.0"}
              sub={topScorer ? topScorer.full_name : "No data"}
            />
            <LeaderHeroStat
              label="Top 1v1 Wins"
              value={topWinner ? String(topWinner.one_v_one_wins) : "0"}
              sub={topWinner ? topWinner.full_name : "No data"}
            />
            <LeaderHeroStat
              label="Most Games"
              value={mostActive ? String(mostActive.games_played) : "0"}
              sub={mostActive ? mostActive.full_name : "No data"}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-6 md:px-6 md:py-10">
        {leaderboard.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            No guest leaderboard data is available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GuestLeaderboardTableCard
              title="Points Per Game"
              statLabel="PPG"
              guests={bestPPG}
              statKey="points_per_game"
            />

            <GuestLeaderboardTableCard
              title="Total Points"
              statLabel="PTS"
              guests={totalPoints}
              statKey="total_points"
            />

            <GuestLeaderboardTableCard
              title="Rebounds Per Game"
              statLabel="RPG"
              guests={bestRebounds}
              statKey="rebounds_per_game"
            />

            <GuestLeaderboardTableCard
              title="Assists Per Game"
              statLabel="APG"
              guests={bestAPG}
              statKey="assists_per_game"
            />

            <GuestLeaderboardTableCard
              title="Games Played"
              statLabel="GP"
              guests={mostGames}
              statKey="games_played"
            />

            <GuestLeaderboardTableCard
              title="3-Point Leaders"
              statLabel="3PM"
              guests={mostThrees}
              statKey="total_three_pointers_made"
            />

            <GuestLeaderboardTableCard
              title="1v1 Wins"
              statLabel="WINS"
              guests={oneVOneWins}
              statKey="one_v_one_wins"
            />

            <GuestLeaderboardTableCard
              title="1v1 Matches"
              statLabel="1V1"
              guests={oneVOneMatches}
              statKey="one_v_one_matches"
            />
          </div>
        )}
      </section>
    </main>
  );
}

function GuestLeaderboardTableCard({
  title,
  statLabel,
  guests,
  statKey,
}: {
  title: string;
  statLabel: string;
  guests: GuestLeader[];
  statKey: keyof GuestLeader;
}) {
  const topGuests = guests.slice(0, 6);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-md shadow-black/20">
      <div className="border-b border-slate-800 bg-slate-950/70 px-4 py-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
          {statLabel}
        </div>

        <h2 className="mt-1 text-base font-black leading-tight">{title}</h2>
      </div>

      <div className="divide-y divide-slate-800">
        {topGuests.map((guest, index) => (
          <Link
            key={guest.id}
            href="/guest-hoopers"
            className="grid grid-cols-[1.8rem_2.5rem_minmax(0,1fr)_3.1rem] items-center gap-2 px-3 py-2 transition hover:bg-slate-800/60"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-black text-orange-300 ring-1 ring-slate-800">
              {index + 1}
            </div>

            <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-950 ring-1 ring-slate-800">
              {guest.photo_url ? (
                <img
                  src={guest.photo_url}
                  alt={guest.full_name}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: guest.photo_position ?? "center center",
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-black text-orange-300">
                  GH
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-xs font-black leading-tight text-white">
                {guest.full_name}
              </div>

              <div className="mt-0.5 truncate text-[10px] leading-tight text-slate-400">
                {guest.position ?? "Guest Hooper"}
                {guest.nickname ? ` â€¢ ${guest.nickname}` : ""}
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black leading-none text-orange-300">
                {formatStat(guest[statKey], statKey)}
              </div>

              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                {statLabel}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LeaderHeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 backdrop-blur">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-orange-300">{value}</div>

      <div className="mt-1 truncate text-xs font-bold text-slate-400">
        {sub}
      </div>
    </div>
  );
}