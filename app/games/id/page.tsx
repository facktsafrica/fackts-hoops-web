import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Props = {
  params: Promise<{ id: string }>;
};

async function getGame(id: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function getStats(id: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select(`
      *,
      players (
        id,
        full_name,
        jersey_number,
        position,
        role,
        photo_url
      )
    `)
    .eq("game_id", id)
    .order("points", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const [game, stats] = await Promise.all([getGame(id), getStats(id)]);

  if (!game) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Game not found.
      </main>
    );
  }

  const teamQ1 = stats.reduce((n: number, r: any) => n + (r.q1 || 0), 0);
  const teamQ2 = stats.reduce((n: number, r: any) => n + (r.q2 || 0), 0);
  const teamQ3 = stats.reduce((n: number, r: any) => n + (r.q3 || 0), 0);
  const teamQ4 = stats.reduce((n: number, r: any) => n + (r.q4 || 0), 0);

  const won = (game.team_score ?? 0) > (game.opponent_score ?? 0);
  const drew = (game.team_score ?? 0) === (game.opponent_score ?? 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <Link
          href="/"
          className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          ← Back to home
        </Link>

        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm uppercase tracking-wide text-orange-300">
                {game.match_type ?? "Game"}
              </div>
              <h1 className="mt-1 text-3xl font-black md:text-4xl">
                FACKTS vs {game.opponent}
              </h1>
              <p className="mt-2 text-slate-400">
                {game.game_date} • {game.venue ?? "Venue TBA"}
              </p>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
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

          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">Team</div>
              <div className="text-3xl font-bold">FACKTS</div>
            </div>

            <div className="text-center">
              <div className="text-5xl font-black tracking-tight text-orange-400">
                {game.team_score ?? 0} - {game.opponent_score ?? 0}
              </div>
              <div className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                Final Score
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-400">Opponent</div>
              <div className="text-3xl font-bold">{game.opponent}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <QuarterCard label="Q1" value={teamQ1} />
          <QuarterCard label="Q2" value={teamQ2} />
          <QuarterCard label="Q3" value={teamQ3} />
          <QuarterCard label="Q4" value={teamQ4} />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <div className="text-sm uppercase tracking-wide text-orange-300">Box Score</div>
            <h2 className="mt-1 text-2xl font-bold">Player Performance</h2>
          </div>

          {stats.length === 0 ? (
            <p className="text-slate-400">No stats recorded yet for this game.</p>
          ) : (
            <div className="space-y-4">
              {stats.map((row: any) => (
                <div
                  key={row.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      {row.players?.photo_url ? (
                        <img
                          src={row.players.photo_url}
                          alt={row.players?.full_name ?? "Player"}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-xl">
                          🏀
                        </div>
                      )}

                      <div>
                        <div className="text-xl font-bold">
                          #{row.players?.jersey_number ?? "—"} {row.players?.full_name ?? "—"}
                        </div>
                        <div className="text-sm text-slate-400">
                          {row.players?.position ?? "—"} • {row.players?.role ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-orange-500 px-4 py-2 text-lg font-bold text-slate-950">
                      {row.points} PTS
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
                    <StatChip label="REB" value={row.rebounds} />
                    <StatChip label="AST" value={row.assists} />
                    <StatChip label="STL" value={row.steals} />
                    <StatChip label="BLK" value={row.blocks} />
                    <StatChip label="TO" value={row.turnovers} />
                    <StatChip label="+/-" value={row.plus_minus} />
                    <StatChip label="MIN" value={row.minutes} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function QuarterCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-center">
      <div className="text-sm uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-orange-400">{value}</div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}