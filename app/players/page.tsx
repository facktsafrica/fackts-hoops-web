import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (error) return [];
  return data ?? [];
}

async function getPlayerAverages(playerId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("player_id", playerId);

  if (error || !data || data.length === 0) {
    return {
      games: 0,
      ppg: "0.0",
      rpg: "0.0",
      apg: "0.0",
    };
  }

  const games = data.length;

  const totals = data.reduce(
    (acc: any, row: any) => {
      acc.points += Number(row.points ?? 0);
      acc.rebounds += Number(row.rebounds ?? 0);
      acc.assists += Number(row.assists ?? 0);
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
    }
  );

  const avg = (value: number) => (value / games).toFixed(1);

  return {
    games,
    ppg: avg(totals.points),
    rpg: avg(totals.rebounds),
    apg: avg(totals.assists),
  };
}

export default async function PlayersPage() {
  const players = await getPlayers();

  const playersWithAverages = await Promise.all(
    players.map(async (player: any) => {
      const averages = await getPlayerAverages(player.id);
      return {
        ...player,
        averages,
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Player Roster
            </h1>

            <p className="mt-4 text-lg text-slate-300">
              Explore the FACKTS player portfolio, profiles, averages, and player stories.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {playersWithAverages.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No active players found.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {playersWithAverages.map((player: any) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
              >
                <div className="relative">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-slate-950">
                    #{player.jersey_number ?? "—"}
                  </div>

                  {player.is_featured ? (
                    <div className="absolute right-4 top-4 z-10 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-orange-300 backdrop-blur">
                      FEATURED
                    </div>
                  ) : null}

                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.full_name}
                      className="h-80 w-full object-cover"
                      style={{
                        objectPosition: player.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-80 w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-6xl">
                      🏀
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black group-hover:text-orange-300">
                        {player.full_name}
                      </h2>

                      <p className="mt-1 text-sm text-orange-300">
                        {player.nickname ? `"${player.nickname}"` : "FACKTS Player"}
                      </p>
                    </div>

                    <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                      {player.role ?? "Player"}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-400">
                    {player.position ?? "Position TBA"} • {player.height ?? "Height TBA"}
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-3">
                    <StatMini label="GP" value={String(player.averages.games)} />
                    <StatMini label="PPG" value={player.averages.ppg} />
                    <StatMini label="RPG" value={player.averages.rpg} />
                    <StatMini label="APG" value={player.averages.apg} />
                  </div>

                  <div className="mt-5 text-sm font-semibold text-orange-300">
                    Open full profile →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-orange-300">{value}</div>
    </div>
  );
}