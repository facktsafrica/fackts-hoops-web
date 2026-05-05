import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function GamesPage() {
  const games = await getGames();

  const wins = games.filter((g: any) => (g.team_score ?? 0) > (g.opponent_score ?? 0)).length;
  const losses = games.filter((g: any) => (g.team_score ?? 0) < (g.opponent_score ?? 0)).length;
  const draws = games.filter((g: any) => (g.team_score ?? 0) === (g.opponent_score ?? 0)).length;

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

            <div className="mt-6 flex flex-wrap gap-3">
              <StatPill label="Games" value={String(games.length)} />
              <StatPill label="Wins" value={String(wins)} accent="emerald" />
              <StatPill label="Losses" value={String(losses)} accent="rose" />
              <StatPill label="Draws" value={String(draws)} accent="slate" />
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
              const won = (game.team_score ?? 0) > (game.opponent_score ?? 0);
              const drew = (game.team_score ?? 0) === (game.opponent_score ?? 0);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-slate-400">
                      {game.game_date} • {game.venue ?? "Venue TBA"}
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        drew
                          ? "bg-slate-800 text-slate-300"
                          : won
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {drew ? "DRAW" : won ? "WIN" : "LOSS"}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Team</div>
                      <div className="text-2xl font-bold">FACKTS</div>
                    </div>

                    <div className="text-center">
                      <div className="text-4xl font-black tracking-tight text-orange-400">
                        {game.team_score ?? 0} - {game.opponent_score ?? 0}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        Final Score
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-slate-400">Opponent</div>
                      <div className="text-2xl font-bold">{game.opponent}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-slate-400">
                      {game.match_type ?? "Game"}
                    </div>
                    <div className="text-sm font-semibold text-orange-300">
                      Open game page →
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

function StatPill({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "emerald" | "rose" | "slate";
}) {
  const cls =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "rose"
      ? "text-rose-300"
      : accent === "slate"
      ? "text-slate-200"
      : "text-orange-300";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}