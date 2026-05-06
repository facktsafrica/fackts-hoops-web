import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false });

  if (error) {
    return [];
  }

  return data ?? [];
}

export default async function GamesPage() {
  const games = await getGames();

  const completedGames = games.filter((game: any) => game.is_upcoming !== true);

  const wins = completedGames.filter(
    (game: any) =>
      game.team_score !== null &&
      game.opponent_score !== null &&
      Number(game.team_score) > Number(game.opponent_score)
  ).length;

  const losses = completedGames.filter(
    (game: any) =>
      game.team_score !== null &&
      game.opponent_score !== null &&
      Number(game.team_score) < Number(game.opponent_score)
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Games & Results
            </h1>

            <p className="mt-4 text-lg text-slate-300">
              Browse every logged FACKTS game, final result, venue, and detailed game page.
            </p>

            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              <SummaryCard label="Games" value={String(games.length)} />
              <SummaryCard label="Wins" value={String(wins)} />
              <SummaryCard label="Losses" value={String(losses)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {games.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No games found yet.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game: any) => {
              const hasScore =
                game.team_score !== null && game.opponent_score !== null;

              const won =
                hasScore && Number(game.team_score) > Number(game.opponent_score);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
                >
                  {game.poster_url ? (
                    <img
                      src={game.poster_url}
                      alt={`Poster for FACKTS vs ${game.opponent}`}
                      className="h-64 w-full object-cover"
                      style={{
                        objectPosition: game.poster_position ?? "center center",
                      }}
                    />
                  ) : null}

                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-400">
                        {game.game_date ?? "Date TBA"} • {game.venue ?? "Venue TBA"}
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          game.is_upcoming
                            ? "bg-orange-500/15 text-orange-300"
                            : !hasScore
                            ? "bg-slate-800 text-slate-300"
                            : won
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {game.is_upcoming
                          ? "UPCOMING"
                          : !hasScore
                          ? "FINAL"
                          : won
                          ? "WIN"
                          : "LOSS"}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-400">Team</div>
                        <div className="text-2xl font-bold">FACKTS</div>
                      </div>

                      <div className="text-center">
                        {game.is_upcoming ? (
                          <>
                            <div className="text-3xl font-black tracking-tight text-orange-400">
                              VS
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                              Upcoming
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-4xl font-black tracking-tight text-orange-400">
                              {game.team_score ?? 0} - {game.opponent_score ?? 0}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                              Final Score
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-400">Opponent</div>
                        <div className="text-2xl font-bold">{game.opponent}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-400">
                        {game.match_type ?? "Game"}
                      </div>

                      <div className="text-sm font-semibold text-orange-300">
                        Open game details →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}