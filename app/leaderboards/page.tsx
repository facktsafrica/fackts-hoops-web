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
  points_per_game: number;
  total_three_pointers_made: number;
  total_rebounds: number;
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
        acc.total_three_pointers_made += Number(row.three_pointers_made ?? 0);
        acc.total_rebounds += Number(row.rebounds ?? 0);
        acc.total_blocks += Number(row.blocks ?? 0);
        acc.total_steals += Number(row.steals ?? 0);
        return acc;
      },
      {
        total_points: 0,
        total_three_pointers_made: 0,
        total_rebounds: 0,
        total_blocks: 0,
        total_steals: 0,
      }
    );

    const gamesPlayed = playerStats.length;

    const pointsPerGame =
      gamesPlayed > 0
        ? Number((totals.total_points / gamesPlayed).toFixed(1))
        : 0;

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
      points_per_game: pointsPerGame,
      total_three_pointers_made: totals.total_three_pointers_made,
      total_rebounds: totals.total_rebounds,
      total_blocks: totals.total_blocks,
      total_steals: totals.total_steals,
      games_played: gamesPlayed,
    };
  });

  return leaderboard;
}

function sortByStat(players: LeaderboardPlayer[], stat: keyof LeaderboardPlayer) {
  return [...players]
    .sort((a: any, b: any) => Number(b[stat] ?? 0) - Number(a[stat] ?? 0))
    .slice(0, 10);
}

function formatStatValue(player: LeaderboardPlayer, statKey: keyof LeaderboardPlayer) {
  if (statKey === "points_per_game") {
    return Number(player[statKey] ?? 0).toFixed(1);
  }

  return String(player[statKey] ?? 0);
}

export default async function LeaderboardsPage() {
  const leaderboard = await getLeaderboardData();

  const mostPoints = sortByStat(leaderboard, "total_points");
  const bestPPG = sortByStat(leaderboard, "points_per_game");
  const mostThrees = sortByStat(leaderboard, "total_three_pointers_made");
  const mostRebounds = sortByStat(leaderboard, "total_rebounds");
  const mostBlocks = sortByStat(leaderboard, "total_blocks");
  const mostSteals = sortByStat(leaderboard, "total_steals");
  const mostGames = sortByStat(leaderboard, "games_played");

  const totalPlayers = leaderboard.length;
  const totalEntries = leaderboard.reduce(
    (acc, player) => acc + player.games_played,
    0
  );

  const topScorer = mostPoints[0];
  const topPPG = bestPPG[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                Leaderboards
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                See who leads the court in scoring, shooting, rebounds, defense, and games played.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <HeroMiniStat label="Players" value={String(totalPlayers)} />
              <HeroMiniStat label="Entries" value={String(totalEntries)} />
              <HeroMiniStat
                label="Top Points"
                value={topScorer ? String(topScorer.total_points) : "0"}
                sub={topScorer?.full_name ?? "No data"}
              />
              <HeroMiniStat
                label="Best PPG"
                value={topPPG ? String(topPPG.points_per_game) : "0"}
                sub={topPPG?.full_name ?? "No data"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No leaderboard data yet. Add players and game stats first.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <LeaderboardTableCard
              title="Points Leaders"
              statLabel="PTS"
              players={mostPoints}
              statKey="total_points"
            />

            <LeaderboardTableCard
              title="Points Per Game"
              statLabel="PPG"
              players={bestPPG}
              statKey="points_per_game"
            />

            <LeaderboardTableCard
              title="3-Point Leaders"
              statLabel="3PM"
              players={mostThrees}
              statKey="total_three_pointers_made"
            />

            <LeaderboardTableCard
              title="Rebounds Leaders"
              statLabel="REB"
              players={mostRebounds}
              statKey="total_rebounds"
            />

            <LeaderboardTableCard
              title="Blocks Leaders"
              statLabel="BLK"
              players={mostBlocks}
              statKey="total_blocks"
            />

            <LeaderboardTableCard
              title="Steals Leaders"
              statLabel="STL"
              players={mostSteals}
              statKey="total_steals"
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
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3 py-3">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.2em] text-orange-300">
            Leaderboard
          </div>
          <h2 className="mt-0.5 truncate text-base font-black">{title}</h2>
        </div>

        <div className="ml-2 shrink-0 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black text-slate-950">
          {statLabel}
        </div>
      </div>

      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-left">
            <th className="w-[36px] px-2 py-2 text-[9px] uppercase tracking-[0.15em] text-slate-500">
              #
            </th>

            <th className="px-1 py-2 text-[9px] uppercase tracking-[0.15em] text-slate-500">
              Player
            </th>

            <th className="w-[58px] px-2 py-2 text-right text-[9px] uppercase tracking-[0.15em] text-slate-500">
              {statLabel}
            </th>
          </tr>
        </thead>

        <tbody>
          {players.map((player, index) => (
            <tr
              key={`${title}-${player.id}`}
              className="border-b border-slate-800/80 transition hover:bg-slate-800/60"
            >
              <td className="px-2 py-2 align-middle">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                    index === 0
                      ? "bg-orange-500 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {index + 1}
                </div>
              </td>

              <td className="min-w-0 px-1 py-2">
                <Link
                  href={`/players/${player.id}`}
                  className="group flex min-w-0 items-center gap-2"
                >
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.full_name}
                      className="h-9 w-9 shrink-0 rounded-xl border border-slate-700 object-cover transition group-hover:border-orange-400/50"
                      style={{
                        objectPosition:
                          player.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-base">
                      🏀
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold leading-tight text-white group-hover:text-orange-300">
                      #{player.jersey_number ?? "—"} {player.full_name}
                    </div>

                    <div className="mt-0.5 truncate text-[10px] leading-tight text-slate-400">
                      {player.nickname
                        ? `"${player.nickname}"`
                        : player.role ?? "Player"}
                    </div>

                    <div className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">
                      {player.position ?? "Position TBA"}
                    </div>
                  </div>
                </Link>
              </td>

              <td className="px-2 py-2 text-right align-middle">
                <div className="text-lg font-black leading-none text-orange-300">
                  {formatStatValue(player, statKey)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeroMiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black leading-none text-orange-300">
        {value}
      </div>

      {sub ? (
        <div className="mt-1 truncate text-[11px] text-slate-400">{sub}</div>
      ) : null}
    </div>
  );
}