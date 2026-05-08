import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlayerCard = {
  id: string;
  full_name: string;
  nickname?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  role?: string | null;
  height?: string | null;
  dominant_hand?: string | null;
  current_team?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  games_played: number;
  points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  total_points: number;
};

async function getPlayersWithStats() {
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

  const rows: PlayerCard[] = players.map((player: any) => {
    const playerStats = stats.filter((row: any) => row.player_id === player.id);
    const gamesPlayed = playerStats.length;

    const totals = playerStats.reduce(
      (acc: any, row: any) => {
        acc.points += Number(row.points ?? 0);
        acc.rebounds += Number(row.rebounds ?? 0);
        acc.assists += Number(row.assists ?? 0);
        acc.steals += Number(row.steals ?? 0);
        acc.blocks += Number(row.blocks ?? 0);
        return acc;
      },
      {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
      }
    );

    function avg(value: number) {
      return gamesPlayed > 0 ? Number((value / gamesPlayed).toFixed(1)) : 0;
    }

    return {
      id: player.id,
      full_name: player.full_name,
      nickname: player.nickname,
      jersey_number: player.jersey_number,
      position: player.position,
      role: player.role,
      height: player.height,
      dominant_hand: player.dominant_hand,
      current_team: player.current_team,
      photo_url: player.photo_url,
      photo_position: player.photo_position,
      games_played: gamesPlayed,
      points_per_game: avg(totals.points),
      rebounds_per_game: avg(totals.rebounds),
      assists_per_game: avg(totals.assists),
      steals_per_game: avg(totals.steals),
      blocks_per_game: avg(totals.blocks),
      total_points: totals.points,
    };
  });

  return rows;
}

export default async function PlayersPage() {
  const players = await getPlayersWithStats();

  const totalPlayers = players.length;

  const totalStatEntries = players.reduce(
    (acc, player) => acc + player.games_played,
    0
  );

  const topScorer = [...players].sort(
    (a, b) => b.points_per_game - a.points_per_game
  )[0];

  const mostExperienced = [...players].sort(
    (a, b) => b.games_played - a.games_played
  )[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-9">
          <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr] lg:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                Players
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Explore the roster, view player profiles, and follow each player’s performance numbers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <HeroMiniStat label="Players" value={String(totalPlayers)} />
              <HeroMiniStat label="Entries" value={String(totalStatEntries)} />
              <HeroMiniStat
                label="Top Points/Game"
                value={topScorer ? String(topScorer.points_per_game) : "0"}
                sub={topScorer?.full_name ?? "No data"}
              />
              <HeroMiniStat
                label="Most Games"
                value={mostExperienced ? String(mostExperienced.games_played) : "0"}
                sub={mostExperienced?.full_name ?? "No data"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Roster
            </div>

            <h2 className="mt-1 text-2xl font-black md:text-3xl">
              FACKTS Active Players
            </h2>
          </div>

          <Link
            href="/leaderboards"
            className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10"
          >
            View Leaderboards →
          </Link>
        </div>

        {players.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No active players have been added yet.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => (
              <PlayerCompactSplitCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerCompactSplitCard({ player }: { player: PlayerCard }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-orange-400/40 hover:bg-slate-900/90 hover:shadow-orange-950/20"
    >
      <div className="grid grid-cols-[45%_55%]">
        <div className="min-w-0 border-r border-slate-800 bg-slate-950/70">
          <div className="relative h-28 overflow-hidden bg-slate-950">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.full_name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                style={{
                  objectPosition: player.photo_position ?? "center center",
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">
                🏀
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent" />

            <div className="absolute left-2 top-2 rounded-xl bg-orange-500 px-2 py-1 text-[10px] font-black text-slate-950 shadow-lg shadow-black/30">
              #{player.jersey_number ?? "—"}
            </div>
          </div>

          <div className="px-2.5 py-2.5">
            <h3 className="truncate text-sm font-black leading-tight text-white group-hover:text-orange-300">
              {player.full_name}
            </h3>

            <div className="mt-0.5 truncate text-[10px] leading-tight text-slate-400">
              {player.nickname ? `"${player.nickname}"` : "FACKTS Player"}
            </div>

            <div className="mt-1.5 w-fit max-w-full truncate rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-orange-300">
              {player.position ?? "Position TBA"}
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-slate-900">
          <div className="grid grid-cols-2">
            <PlayerStat title="Points" sub="per game" value={String(player.points_per_game)} />
            <PlayerStat title="Rebounds" sub="per game" value={String(player.rebounds_per_game)} />
            <PlayerStat title="Assists" sub="per game" value={String(player.assists_per_game)} />
            <PlayerStat title="Steals" sub="per game" value={String(player.steals_per_game)} />
            <PlayerStat title="Blocks" sub="per game" value={String(player.blocks_per_game)} />
            <PlayerStat title="Games" sub="played" value={String(player.games_played)} />
          </div>

          <div className="grid grid-cols-[1fr,auto] items-center gap-2 border-t border-slate-800 bg-slate-950/50 px-2.5 py-2.5">
            <div>
              <div className="text-[7px] uppercase tracking-[0.14em] text-slate-500">
                Total points
              </div>

              <div className="mt-0.5 text-xl font-black leading-none text-orange-300">
                {player.total_points}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 px-2 py-1.5 text-[9px] font-bold text-orange-300 transition group-hover:border-orange-400/50 group-hover:bg-orange-500/10">
              View →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PlayerStat({
  title,
  sub,
  value,
}: {
  title: string;
  sub: string;
  value: string;
}) {
  return (
    <div className="border-b border-r border-slate-800 px-1.5 py-1.5 text-center even:border-r-0">
      <div className="text-[8px] font-semibold uppercase leading-tight tracking-wide text-slate-400">
        {title}
      </div>

      <div className="text-[7px] lowercase leading-tight text-slate-500">
        {sub}
      </div>

      <div className="mt-0.5 text-[13px] font-black leading-none text-orange-300">
        {value}
      </div>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 shadow-xl shadow-black/20 backdrop-blur">
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