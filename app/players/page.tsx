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

        <div className="relative mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
          <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr] lg:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                Players
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Explore the roster, view player profiles, and follow each
                player’s performance numbers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <HeroMiniStat label="Players" value={String(totalPlayers)} />
              <HeroMiniStat label="Entries" value={String(totalStatEntries)} />
              <HeroMiniStat
                label="Top PPG"
                value={topScorer ? String(topScorer.points_per_game) : "0"}
                sub={topScorer?.full_name ?? "No data"}
              />
              <HeroMiniStat
                label="Most Games"
                value={
                  mostExperienced ? String(mostExperienced.games_played) : "0"
                }
                sub={mostExperienced?.full_name ?? "No data"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Roster
            </div>

            <h2 className="mt-1 text-xl font-black md:text-3xl">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            No active players have been added yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-4">
            {players.map((player) => (
              <PlayerCardCompact key={player.id} player={player} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerCardCompact({ player }: { player: PlayerCard }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition duration-300 hover:border-orange-400/40 hover:bg-slate-900/90 hover:shadow-orange-950/20 md:hover:-translate-y-1"
    >
      <div className="flex gap-3 p-3 sm:block sm:p-0">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-950 sm:h-40 sm:w-full sm:rounded-none md:h-48">
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
            <div className="flex h-full w-full items-center justify-center text-3xl sm:text-5xl">
              🏀
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

          <div className="absolute bottom-2 left-2 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-slate-950">
            #{player.jersey_number ?? "—"}
          </div>
        </div>

        <div className="min-w-0 flex-1 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-black leading-tight md:text-xl">
                {player.full_name}
              </div>

              {player.nickname ? (
                <div className="mt-0.5 truncate text-xs font-semibold text-orange-300 md:text-sm">
                  “{player.nickname}”
                </div>
              ) : null}
            </div>

            <div className="hidden shrink-0 rounded-xl bg-slate-950 px-2 py-1 text-xs font-black text-orange-300 ring-1 ring-slate-800 sm:block">
              {player.position ?? "POS"}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge text={player.position ?? "Position TBA"} />
            <Badge text={player.role ?? "Player"} />
            {player.height ? <Badge text={player.height} /> : null}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <MiniStat label="PPG" value={String(player.points_per_game)} />
            <MiniStat label="RPG" value={String(player.rebounds_per_game)} />
            <MiniStat label="APG" value={String(player.assists_per_game)} />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
            <div className="truncate text-[11px] font-semibold text-slate-500 md:text-xs">
              {player.games_played} games logged
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-orange-300 ring-1 ring-slate-800 transition group-hover:bg-orange-500 group-hover:text-slate-950">
              →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="max-w-full truncate rounded-full border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400">
      {text}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-0.5 text-sm font-black text-orange-300 md:text-base">
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 backdrop-blur md:p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 md:text-xs">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-orange-300 md:text-2xl">
        {value}
      </div>

      {sub ? (
        <div className="mt-1 truncate text-[10px] text-slate-500 md:text-xs">
          {sub}
        </div>
      ) : null}
    </div>
  );
}