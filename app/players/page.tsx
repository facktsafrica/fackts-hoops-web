import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function PlayersPage() {
  const players = await getPlayers();

  const starters = players.filter((p: any) => (p.role ?? "").toLowerCase() === "starter");
  const bench = players.filter((p: any) => (p.role ?? "").toLowerCase() !== "starter");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Player Roster
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Explore the full FACKTS roster, player roles, profiles, and public performance pages.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Total Players</div>
                <div className="mt-1 text-2xl font-bold">{players.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Starters</div>
                <div className="mt-1 text-2xl font-bold text-orange-300">{starters.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Bench</div>
                <div className="mt-1 text-2xl font-bold">{bench.length}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-5">
          <div className="text-sm uppercase tracking-wide text-orange-300">Starting Unit</div>
          <h2 className="mt-1 text-2xl font-bold">Starters</h2>
        </div>

        {starters.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No starters marked yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {starters.map((player: any) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-5">
          <div className="text-sm uppercase tracking-wide text-orange-300">Depth</div>
          <h2 className="mt-1 text-2xl font-bold">Bench</h2>
        </div>

        {bench.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No bench players marked yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {bench.map((player: any) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerCard({ player }: { player: any }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
    >
      <div className="relative">
        <div className="absolute left-4 top-4 z-10 rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-slate-950">
          #{player.jersey_number ?? "—"}
        </div>

        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.full_name}
            className="h-72 w-full object-cover"
          />
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-6xl">
            🏀
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold group-hover:text-orange-300">
              {player.full_name}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {player.nickname ? `"${player.nickname}"` : "FACKTS Player"}
            </p>
          </div>

          <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            {player.role ?? "Bench"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <MiniInfo label="Position" value={player.position ?? "—"} />
          <MiniInfo label="Height" value={player.height ?? "—"} />
          <MiniInfo label="Hand" value={player.dominant_hand ?? "—"} />
          <MiniInfo label="Level" value={player.highest_level ?? "—"} />
        </div>

        <div className="mt-5 inline-flex items-center text-sm font-semibold text-orange-300">
          Open player page →
        </div>
      </div>
    </Link>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-200">{value}</div>
    </div>
  );
}