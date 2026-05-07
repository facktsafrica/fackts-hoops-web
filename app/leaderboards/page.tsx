import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LeaderboardPlayer = {
  id: string;
  full_name: string;
  nickname?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  total_points: number;
  total_three_pointers_made: number;
  total_blocks: number;
  total_steals: number;
  games_played: number;
};

async function getLeaderboardData() {
  const [playersResult, statsResult] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .order("jersey_number", { ascending: true }),

    supabase.from("player_game_stats").select("*"),
  ]);

  if (playersResult.error || statsResult.error) {
    return [];
  }

  const players = playersResult.data ?? [];
  const stats = statsResult.data ?? [];

  const leaderboard: LeaderboardPlayer[] = players.map((player: any) => {
    const playerStats = stats.filter((row: any) => row.player_id === player.id);

    const totals = playerStats.reduce(
      (acc: any, row: any) => {
        acc.total_points += Number(row.points ?? 0);
        acc.total_three_pointers_made += Number(
          row.three_pointers_made ?? 0
        );
        acc.total_blocks += Number(row.blocks ?? 0);
        acc.total_steals += Number(row.steals ?? 0);
        return acc;
      },
      {
        total_points: 0,
        total_three_pointers_made: 0,
        total_blocks: 0,
        total_steals: 0,
      }
    );

    return {
      id: player.id,
      full_name: player.full_name,
      nickname: player.nickname,
      jersey_number: player.jersey_number,
      position: player.position,
      role: player.role,
      photo_url: player.photo_url,
      photo_position: player.photo_position,
      total_points: totals.total_points,
      total_three_pointers_made: totals.total_three_pointers_made,
      total_blocks: totals.total_blocks,
      total_steals: totals.total_steals,
      games_played: playerStats.length,
    };
  });

  return leaderboard;
}

function sortByStat(players: LeaderboardPlayer[], stat: keyof LeaderboardPlayer) {
  return [...players]
    .sort((a: any, b: any) => Number(b[stat] ?? 0) - Number(a[stat] ?? 0))
    .slice(0, 10);
}

export default async function LeaderboardsPage() {
  const leaderboard = await getLeaderboardData();

  const mostPoints = sortByStat(leaderboard, "total_points");
  const mostThrees = sortByStat(leaderboard, "total_three_pointers_made");
  const mostBlocks = sortByStat(leaderboard, "total_blocks");
  const mostSteals = sortByStat(leaderboard, "total_steals");
  const mostGames = sortByStat(leaderboard, "games_played");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Player Leaderboards
            </h1>

            <p className="mt-4 text-lg text-slate-300">
              Track top performers across points, threes, blocks, steals, and games played.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {leaderboard.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No leaderboard data yet. Add players and game stats first.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <LeaderboardCard
              title="Most Total Points"
              statLabel="PTS"
              players={mostPoints}
              statKey="total_points"
            />

            <LeaderboardCard
              title="Most 3 Points Made"
              statLabel="3PM"
              players={mostThrees}
              statKey="total_three_pointers_made"
            />

            <LeaderboardCard
              title="Most Blocks"
              statLabel="BLK"
              players={mostBlocks}
              statKey="total_blocks"
            />

            <LeaderboardCard
              title="Most Steals"
              statLabel="STL"
              players={mostSteals}
              statKey="total_steals"
            />

            <LeaderboardCard
              title="Most Games Played"
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

function LeaderboardCard({
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
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-wide text-orange-300">
            Leaderboard
          </div>
          <h2 className="mt-1 text-2xl font-black">{title}</h2>
        </div>

        <div className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
          {statLabel}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
          No players found.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {players.map((player, index) => (
            <Link
              key={`${title}-${player.id}`}
              href={`/players/${player.id}`}
              className="rounded-3xl border border-slate-800 bg-slate-950 p-4 transition hover:border-orange-400/40"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                    index === 0
                      ? "bg-orange-500 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {index + 1}
                </div>

                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.full_name}
                    className="h-12 w-12 shrink-0 rounded-2xl border border-slate-700 object-cover"
                    style={{
                      objectPosition: player.photo_position ?? "center center",
                    }}
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-xl">
                    🏀
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">
                    #{player.jersey_number ?? "—"} {player.full_name}
                  </div>

                  <div className="mt-1 truncate text-xs text-slate-400">
                    {player.position ?? "Position TBA"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {statLabel}
                </div>

                <div className="text-3xl font-black text-orange-300">
                  {String(player[statKey] ?? 0)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}