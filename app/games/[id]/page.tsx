import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function getGame(gameId: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !data) return null;
  return data;
}

async function getGameStats(gameId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select(
      `
      *,
      players (
        id,
        full_name,
        jersey_number,
        position,
        role,
        nickname,
        photo_url
      )
    `
    )
    .eq("game_id", gameId)
    .order("points", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [game, stats] = await Promise.all([getGame(id), getGameStats(id)]);

  if (!game) {
    notFound();
  }

  const won = (game.team_score ?? 0) > (game.opponent_score ?? 0);
  const drew = (game.team_score ?? 0) === (game.opponent_score ?? 0);

  const playerOfGame = stats.find((row: any) => row.player_of_game === true) ?? null;

  const teamTotals = stats.reduce(
    (acc: any, row: any) => {
      acc.points += Number(row.points ?? 0);
      acc.rebounds += Number(row.rebounds ?? 0);
      acc.assists += Number(row.assists ?? 0);
      acc.steals += Number(row.steals ?? 0);
      acc.blocks += Number(row.blocks ?? 0);
      acc.turnovers += Number(row.turnovers ?? 0);
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
    }
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6">
            <Link
              href="/games"
              className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              ← Back to Games
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                FACKTS Game Detail
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                FACKTS vs {game.opponent ?? "Opponent"}
              </h1>

              <p className="mt-4 text-slate-300">
                {game.game_date ?? "—"} • {game.venue ?? "Venue TBA"} •{" "}
                {game.match_type ?? "Game"}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 text-center">
                  <div className="text-sm text-slate-400">FACKTS</div>
                  <div className="mt-2 text-5xl font-black text-orange-400">
                    {game.team_score ?? 0}
                  </div>
                </div>

                <div className="text-2xl font-bold text-slate-500">-</div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 text-center">
                  <div className="text-sm text-slate-400">{game.opponent ?? "Opponent"}</div>
                  <div className="mt-2 text-5xl font-black text-white">
                    {game.opponent_score ?? 0}
                  </div>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard label="Opponent" value={game.opponent ?? "—"} />
              <InfoCard label="Date" value={game.game_date ?? "—"} />
              <InfoCard label="Venue" value={game.venue ?? "—"} />
              <InfoCard label="Match Type" value={game.match_type ?? "—"} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wide text-orange-300">Team Totals</div>
          <h2 className="mt-1 text-3xl font-bold">Game Summary</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Points" value={String(teamTotals.points)} />
          <StatCard label="Rebounds" value={String(teamTotals.rebounds)} />
          <StatCard label="Assists" value={String(teamTotals.assists)} />
          <StatCard label="Steals" value={String(teamTotals.steals)} />
          <StatCard label="Blocks" value={String(teamTotals.blocks)} />
          <StatCard label="Turnovers" value={String(teamTotals.turnovers)} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wide text-orange-300">
            Player of the Game
          </div>
        </div>

        {playerOfGame?.players ? (
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-slate-900 to-slate-900 p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {playerOfGame.players.photo_url ? (
                  <img
                    src={playerOfGame.players.photo_url}
                    alt={playerOfGame.players.full_name}
                    className="h-20 w-20 rounded-3xl border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 text-3xl">
                    🏀
                  </div>
                )}

                <div>
                  <div className="text-2xl font-black">
                    #{playerOfGame.players.jersey_number ?? "—"}{" "}
                    {playerOfGame.players.full_name}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {playerOfGame.players.position ?? "—"} •{" "}
                    {playerOfGame.players.role ?? "—"}
                  </div>
                  <div className="mt-2 text-orange-300">
                    {playerOfGame.players.nickname
                      ? `"${playerOfGame.players.nickname}"`
                      : "FACKTS standout"}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <SmallStat label="PTS" value={playerOfGame.points ?? 0} />
                <SmallStat label="REB" value={playerOfGame.rebounds ?? 0} />
                <SmallStat label="AST" value={playerOfGame.assists ?? 0} />
                <SmallStat label="+/-" value={playerOfGame.plus_minus ?? 0} />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No player of the game marked yet for this game.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wide text-orange-300">Player Stats</div>
          <h2 className="mt-1 text-3xl font-bold">Full Game Box Score</h2>
        </div>

        {stats.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No player stats have been recorded for this game yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-950">
                  <tr className="text-left text-slate-400">
                    <th className="px-4 py-4">Player</th>
                    <th className="px-4 py-4">Pos</th>
                    <th className="px-4 py-4">PTS</th>
                    <th className="px-4 py-4">REB</th>
                    <th className="px-4 py-4">AST</th>
                    <th className="px-4 py-4">STL</th>
                    <th className="px-4 py-4">BLK</th>
                    <th className="px-4 py-4">TOV</th>
                    <th className="px-4 py-4">+/-</th>
                    <th className="px-4 py-4">Award</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row: any) => (
                    <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-4">
                        <Link
                          href={`/players/${row.players?.id}`}
                          className="font-semibold text-white hover:text-orange-300"
                        >
                          #{row.players?.jersey_number ?? "—"}{" "}
                          {row.players?.full_name ?? "Unknown Player"}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{row.players?.position ?? "—"}</td>
                      <td className="px-4 py-4 font-semibold text-orange-300">
                        {row.points ?? 0}
                      </td>
                      <td className="px-4 py-4">{row.rebounds ?? 0}</td>
                      <td className="px-4 py-4">{row.assists ?? 0}</td>
                      <td className="px-4 py-4">{row.steals ?? 0}</td>
                      <td className="px-4 py-4">{row.blocks ?? 0}</td>
                      <td className="px-4 py-4">{row.turnovers ?? 0}</td>
                      <td className="px-4 py-4">{row.plus_minus ?? 0}</td>
                      <td className="px-4 py-4">
                        {row.player_of_game ? (
                          <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-slate-950">
                            POG
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-orange-300">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 font-medium text-white">{value}</div>
    </div>
  );
}