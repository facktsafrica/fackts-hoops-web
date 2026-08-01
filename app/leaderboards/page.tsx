import Link from "next/link";
import {
  getCareerGameTotals,
  mergeCareerGameStats,
} from "@/lib/hoops/careerStats";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type LeaderboardPlayer = {
  id: string;
  full_name: string;
  nickname: string | null;
  jersey_number: number | null;
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
};

async function getLeaderboard() {
  const [playersResult, statsResult, linkedGuestsResult, guestStatsResult] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .eq("player_type", FACKTS_PLAYER_TYPE)
      .order("jersey_number", { ascending: true }),

    supabase.from("player_game_stats").select("*"),

    supabase
      .from("guest_hoopers")
      .select("id, source_player_id")
      .not("source_player_id", "is", null),

    supabase.from("guest_game_stats").select("*"),
  ]);

  if (
    playersResult.error ||
    statsResult.error ||
    linkedGuestsResult.error ||
    guestStatsResult.error
  ) {
    return [];
  }

  const players = playersResult.data ?? [];
  const stats = statsResult.data ?? [];
  const linkedGuests = linkedGuestsResult.data ?? [];
  const guestStats = guestStatsResult.data ?? [];

  return players.map((player: any) => {
    const playerStats = stats.filter((row: any) => row.player_id === player.id);
    const linkedGuestIds = linkedGuests
      .filter((guest: any) => guest.source_player_id === player.id)
      .map((guest: any) => guest.id);
    const linkedGuestStats = guestStats.filter((row: any) =>
      linkedGuestIds.includes(row.guest_hooper_id)
    );
    const careerRows = mergeCareerGameStats(playerStats, linkedGuestStats);
    const totals = getCareerGameTotals(careerRows);
    const gamesPlayed = totals.gamesPlayed;

    function avg(value: number) {
      return gamesPlayed > 0 ? Number((value / gamesPlayed).toFixed(1)) : 0;
    }

    return {
      id: player.id,
      full_name: player.full_name,
      nickname: player.nickname ?? null,
      jersey_number: player.jersey_number ?? null,
      position: player.position ?? null,
      role: player.role ?? null,
      photo_url: player.photo_url ?? null,
      photo_position: player.photo_position ?? null,

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
    } as LeaderboardPlayer;
  });
}

function sortByStat(
  players: LeaderboardPlayer[],
  statKey: keyof LeaderboardPlayer
) {
  return [...players].sort((a: any, b: any) => {
    const statDiff = Number(b[statKey] ?? 0) - Number(a[statKey] ?? 0);

    if (statDiff !== 0) return statDiff;

    return b.games_played - a.games_played;
  });
}

function formatStat(value: any, statKey: keyof LeaderboardPlayer) {
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

export default async function LeaderboardsPage() {
  const leaderboard = await getLeaderboard();

  const bestPPG = sortByStat(leaderboard, "points_per_game");
  const totalPoints = sortByStat(leaderboard, "total_points");
  const bestAPG = sortByStat(leaderboard, "assists_per_game");
  const bestRebounds = sortByStat(leaderboard, "rebounds_per_game");
  const bestSteals = sortByStat(leaderboard, "steals_per_game");
  const bestBlocks = sortByStat(leaderboard, "blocks_per_game");
  const mostThrees = sortByStat(leaderboard, "total_three_pointers_made");
  const mostGames = sortByStat(leaderboard, "games_played");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <div className="max-w-4xl">
            <div className="text-[10px] uppercase tracking-[0.25em] text-orange-300 md:text-xs">
              FACKTS Hoops
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              Leaderboards
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Scoring, assists, shooting, rebounds, defense, and games played.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-6">
        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            No leaderboard data is available yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <LeaderboardTableCard
              title="Points Per Game"
              statLabel="PPG"
              players={bestPPG}
              statKey="points_per_game"
            />

            <LeaderboardTableCard
              title="Total Points Leaders"
              statLabel="PTS"
              players={totalPoints}
              statKey="total_points"
            />

            <LeaderboardTableCard
              title="Assists Per Game"
              statLabel="APG"
              players={bestAPG}
              statKey="assists_per_game"
            />

            <LeaderboardTableCard
              title="Rebounds Per Game"
              statLabel="RPG"
              players={bestRebounds}
              statKey="rebounds_per_game"
            />

            <LeaderboardTableCard
              title="Steals Per Game"
              statLabel="SPG"
              players={bestSteals}
              statKey="steals_per_game"
            />

            <LeaderboardTableCard
              title="Blocks Per Game"
              statLabel="BPG"
              players={bestBlocks}
              statKey="blocks_per_game"
            />

            <LeaderboardTableCard
              title="3-Point Leaders"
              statLabel="3PM"
              players={mostThrees}
              statKey="total_three_pointers_made"
            />

            <LeaderboardTableCard
              title="Games Played"
              statLabel="GP"
              players={mostGames}
              statKey="games_played"
            />
          </div>
        )}
      </section>
    </main>
  );
}

function LeaderboardTableCard({
  title,
  statLabel,
  players,
  statKey,
}: {
  title: string;
  statLabel: string;
  players: LeaderboardPlayer[];
  statKey: keyof LeaderboardPlayer;
}) {
  const topPlayers = players.slice(0, 7);

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
        {topPlayers.map((player, index) => (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="grid grid-cols-[1.7rem_2.45rem_minmax(0,1fr)_3rem] items-center gap-2 px-2.5 py-1.5 transition hover:bg-slate-800/60 md:grid-cols-[1.9rem_2.65rem_minmax(0,1fr)_3.2rem] md:px-3"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-black text-orange-300 ring-1 ring-slate-800">
              {index + 1}
            </div>

            <div className="h-9 w-9 overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-800 md:h-10 md:w-10">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.full_name}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: player.photo_position ?? "center center",
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base">
                  🏀
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-[11px] font-black leading-tight text-white md:text-xs">
                #{player.jersey_number ?? "—"} {player.full_name}
              </div>

              <div className="mt-0.5 truncate text-[9px] leading-tight text-slate-400 md:text-[10px]">
                {player.position ?? "Position TBA"}
                {player.nickname ? ` • ${player.nickname}` : ""}
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-black leading-none text-orange-300 md:text-lg">
                {formatStat(player[statKey], statKey)}
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
