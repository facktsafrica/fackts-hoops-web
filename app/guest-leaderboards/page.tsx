import Link from "next/link";
import {
  getCareerGameTotals,
  mergeCareerGameStats,
} from "@/lib/hoops/careerStats";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GuestLeader = {
  id: string;
  source_player_id: string | null;
  guest_type: string | null;
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
        totals.matches +=
          aggregateMatches || aggregateWins + aggregateLosses;
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

async function getGuestLeaderboard() {
  const [guestsResult, gameStatsResult, playerStatsResult, oneOnOneResult] = await Promise.all([
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
    return [];
  }

  if (gameStatsResult.error) {
    console.error("Guest game stats error:", gameStatsResult.error.message);
  }

  if (playerStatsResult.error) {
    console.error("Former player stats error:", playerStatsResult.error.message);
  }

  if (oneOnOneResult.error) {
    console.error("Guest 1v1 stats error:", oneOnOneResult.error.message);
  }

  const guests = guestsResult.data ?? [];
  const gameStats = gameStatsResult.data ?? [];
  const playerStats = playerStatsResult.data ?? [];
  const oneOnOneStats = oneOnOneResult.data ?? [];

  return guests.map((guest: any) => {
    const guestGameStats = gameStats.filter(
      (row: any) => row.guest_hooper_id === guest.id
    );
    const formerPlayerStats = guest.source_player_id
      ? playerStats.filter(
          (row: any) => row.player_id === guest.source_player_id
        )
      : [];
    const careerRows = mergeCareerGameStats(
      guestGameStats,
      formerPlayerStats
    );
    const totals = getCareerGameTotals(careerRows);
    const gamesPlayed = totals.gamesPlayed;
    const oneVOneTotals = oneOnOneCareerTotals(
      oneOnOneStats,
      guest.id,
      guest.source_player_id
    );

    const calculatedMatches =
      oneVOneTotals.matches > 0
        ? oneVOneTotals.matches
        : oneVOneTotals.wins + oneVOneTotals.losses;

    function avg(value: number) {
      return gamesPlayed > 0 ? Number((value / gamesPlayed).toFixed(1)) : 0;
    }

    return {
      id: guest.id,
      source_player_id: guest.source_player_id ?? null,
      guest_type: guest.guest_type ?? null,
      full_name: guest.full_name,
      nickname: guest.nickname ?? null,
      position: guest.position ?? null,
      role:
        guest.role ??
        (guest.guest_type === "external_player"
          ? "External Player"
          : "Guest Hooper"),
      photo_url: guest.photo_url ?? null,
      photo_position: guest.photo_position ?? null,

      games_played: gamesPlayed,

      total_points: totals.points,
      points_per_game: avg(totals.points),

      total_assists: totals.assists,
      assists_per_game: avg(totals.assists),

      total_rebounds: totals.rebounds,
      rebounds_per_game: avg(totals.rebounds),

      total_steals: totals.steals,
      steals_per_game: avg(totals.steals),

      total_blocks: totals.blocks,
      blocks_per_game: avg(totals.blocks),

      total_three_pointers_made: totals.threePointersMade,

      one_v_one_matches: calculatedMatches,
      one_v_one_wins: oneVOneTotals.wins,
      one_v_one_losses: oneVOneTotals.losses,
    } as GuestLeader;
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
  const bestAPG = sortByStat(leaderboard, "assists_per_game");
  const bestRebounds = sortByStat(leaderboard, "rebounds_per_game");
  const bestSteals = sortByStat(leaderboard, "steals_per_game");
  const bestBlocks = sortByStat(leaderboard, "blocks_per_game");
  const mostThrees = sortByStat(leaderboard, "total_three_pointers_made");
  const mostGames = sortByStat(leaderboard, "games_played");
  const oneVOneWins = sortByStat(leaderboard, "one_v_one_wins");
  const oneVOneMatches = sortByStat(leaderboard, "one_v_one_matches");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <Link
            href="/guest-hoopers"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            Back to Guests
          </Link>

          <div className="mt-5 max-w-4xl">
            <div className="text-[10px] uppercase tracking-[0.25em] text-orange-300 md:text-xs">
              FACKTS Guest Hoopers
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              Guest Leaderboards
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Guest hooper rankings across game stats and 1-on-1 appearances.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-6">
        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            No guest leaderboard data is available yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <GuestLeaderboardTableCard
              title="Guest Points Per Game"
              statLabel="PPG"
              guests={bestPPG}
              statKey="points_per_game"
            />

            <GuestLeaderboardTableCard
              title="Guest Total Points"
              statLabel="PTS"
              guests={totalPoints}
              statKey="total_points"
            />

            <GuestLeaderboardTableCard
              title="Guest Assists Per Game"
              statLabel="APG"
              guests={bestAPG}
              statKey="assists_per_game"
            />

            <GuestLeaderboardTableCard
              title="Guest Rebounds Per Game"
              statLabel="RPG"
              guests={bestRebounds}
              statKey="rebounds_per_game"
            />

            <GuestLeaderboardTableCard
              title="Guest Steals Per Game"
              statLabel="SPG"
              guests={bestSteals}
              statKey="steals_per_game"
            />

            <GuestLeaderboardTableCard
              title="Guest Blocks Per Game"
              statLabel="BPG"
              guests={bestBlocks}
              statKey="blocks_per_game"
            />

            <GuestLeaderboardTableCard
              title="Guest 3-Point Leaders"
              statLabel="3PM"
              guests={mostThrees}
              statKey="total_three_pointers_made"
            />

            <GuestLeaderboardTableCard
              title="Guest Games Played"
              statLabel="GP"
              guests={mostGames}
              statKey="games_played"
            />

            <GuestLeaderboardTableCard
              title="Guest 1v1 Wins"
              statLabel="WINS"
              guests={oneVOneWins}
              statKey="one_v_one_wins"
            />

            <GuestLeaderboardTableCard
              title="Guest 1v1 Matches"
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
  const topGuests = guests.slice(0, 7);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-md shadow-black/20">
      <div className="border-b border-slate-800 bg-slate-950/70 px-3 py-2">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">
          {statLabel}
        </div>

        <h2 className="mt-0.5 text-sm font-black leading-tight md:text-base">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-slate-800">
        {topGuests.map((guest, index) => (
          <Link
            key={guest.id}
            href="/guest-hoopers"
            className="grid grid-cols-[1.7rem_2.45rem_minmax(0,1fr)_3rem] items-center gap-2 px-2.5 py-1.5 transition hover:bg-slate-800/60 md:grid-cols-[1.9rem_2.65rem_minmax(0,1fr)_3.2rem] md:px-3"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-black text-orange-300 ring-1 ring-slate-800">
              {index + 1}
            </div>

            <div className="h-9 w-9 overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-800 md:h-10 md:w-10">
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
                <div className="flex h-full w-full items-center justify-center text-base">
                  GH
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-[11px] font-black leading-tight text-white md:text-xs">
                {guest.full_name}
              </div>

              <div className="mt-0.5 truncate text-[9px] leading-tight text-slate-400 md:text-[10px]">
                {guest.position ?? "Guest Hooper"}
                {guest.nickname ? ` • ${guest.nickname}` : ""}
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-black leading-none text-orange-300 md:text-lg">
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
