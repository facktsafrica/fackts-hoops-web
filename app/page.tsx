import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Player, Game } from "@/types";

async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function HomePage() {
  const [players, games] = await Promise.all([getPlayers(), getGames()]);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-5xl font-bold">FACKTS Hoops</h1>
          <p className="text-slate-300 mt-3 text-lg">
            Player profiles, game stats, match summaries, and basketball visibility.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-semibold">Players</h2>
            <Link
              href="/admin"
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Admin
            </Link>
          </div>

          {players.length === 0 ? (
            <p className="text-slate-400">No players yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              {players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.full_name}
                        className="h-14 w-14 rounded-2xl object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                        🏀
                      </div>
                    )}

                    <div>
                      <div className="text-lg font-semibold">{player.full_name}</div>
                      <div className="text-sm text-slate-400">
                        #{player.jersey_number ?? "—"} • {player.position ?? "—"}
                      </div>
                      <div className="text-sm text-emerald-300 mt-1">
                        {player.nickname ?? "—"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recent Games</h2>

          {games.length === 0 ? (
            <p className="text-slate-400">No games yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {games.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:bg-slate-800"
                >
                  <div className="font-semibold text-lg">
                    {game.team_name} vs {game.opponent}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {game.game_date} • {game.venue ?? "Venue TBA"}
                  </div>
                  <div className="mt-3 text-3xl font-bold">
                    {game.team_score} - {game.opponent_score}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}