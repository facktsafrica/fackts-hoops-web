import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function getPlayer(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (error || !data) return null;
  return data;
}

async function getPlayerStats(playerId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select(`
      *,
      games (
        id,
        opponent,
        game_date,
        venue,
        team_score,
        opponent_score,
        match_type
      )
    `)
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [player, stats] = await Promise.all([
    getPlayer(id),
    getPlayerStats(id),
  ]);

  if (!player) {
    notFound();
  }

  const gamesPlayed = stats.length;

  const totals = stats.reduce(
    (acc: any, row: any) => {
      acc.points += Number(row.points ?? 0);
      acc.rebounds += Number(row.rebounds ?? 0);
      acc.assists += Number(row.assists ?? 0);
      acc.steals += Number(row.steals ?? 0);
      acc.blocks += Number(row.blocks ?? 0);
      acc.turnovers += Number(row.turnovers ?? 0);
      acc.plusMinus += Number(row.plus_minus ?? 0);
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      plusMinus: 0,
    }
  );

  const avg = (value: number) =>
    gamesPlayed > 0 ? (value / gamesPlayed).toFixed(1) : "0.0";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6">
            <Link
              href="/players"
              className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              ← Back to Players
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.85fr,1.15fr]">
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.full_name}
                  className="h-[440px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[440px] w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-8xl">
                  🏀
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 inline-flex rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-slate-950">
                #{player.jersey_number ?? "—"}
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                {player.full_name}
              </h1>

              <p className="mt-2 text-lg text-orange-300">
                {player.nickname ? `"${player.nickname}"` : "FACKTS Player"}
              </p>

              <p className="mt-4 max-w-3xl text-slate-300">
                {player.position ?? "—"} • {player.role ?? "—"} •{" "}
                {player.current_team ?? "FACKTS"}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Position" value={player.position ?? "—"} />
                <InfoCard label="Height" value={player.height ?? "—"} />
                <InfoCard label="Dominant Hand" value={player.dominant_hand ?? "—"} />
                <InfoCard label="Age" value={String(player.age ?? "—")} />
                <InfoCard label="Level" value={player.highest_level ?? "—"} />
                <InfoCard
                  label="Years Played"
                  value={String(player.years_played ?? "—")}
                />
                <InfoCard label="Current Team" value={player.current_team ?? "—"} />
                <InfoCard label="Followers" value={player.followers_range ?? "—"} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <TextBlock
                  title="Style of Play"
                  value={player.style_of_play ?? "No style of play added yet."}
                />
                <TextBlock
                  title="Strengths"
                  value={player.strengths ?? "No strengths added yet."}
                />
                <TextBlock
                  title="Improvement Areas"
                  value={player.improvements ?? "No improvement areas added yet."}
                />
                <TextBlock
                  title="Previous Teams"
                  value={player.previous_teams ?? "No previous teams added yet."}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wide text-orange-300">
            Per Game Averages
          </div>
          <h2 className="mt-1 text-3xl font-bold">Performance Summary</h2>
          <p className="mt-2 text-slate-400">
            Average production based on all recorded games for this player.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Games" value={String(gamesPlayed)} />
          <StatCard label="PPG" value={avg(totals.points)} />
          <StatCard label="RPG" value={avg(totals.rebounds)} />
          <StatCard label="APG" value={avg(totals.assists)} />
          <StatCard label="SPG" value={avg(totals.steals)} />
          <StatCard label="BPG" value={avg(totals.blocks)} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Points" value={String(totals.points)} subtle />
          <StatCard label="Total Rebounds" value={String(totals.rebounds)} subtle />
          <StatCard label="Total Assists" value={String(totals.assists)} subtle />
          <StatCard label="Total Steals" value={String(totals.steals)} subtle />
          <StatCard label="Total Blocks" value={String(totals.blocks)} subtle />
          <StatCard label="Turnovers PG" value={avg(totals.turnovers)} subtle />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wide text-orange-300">
            Game Log
          </div>
          <h2 className="mt-1 text-3xl font-bold">Recent Recorded Games</h2>
        </div>

        {stats.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No stats recorded for this player yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-950">
                  <tr className="text-left text-slate-400">
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Opponent</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Venue</th>
                    <th className="px-4 py-4">Score</th>
                    <th className="px-4 py-4">PTS</th>
                    <th className="px-4 py-4">REB</th>
                    <th className="px-4 py-4">AST</th>
                    <th className="px-4 py-4">STL</th>
                    <th className="px-4 py-4">BLK</th>
                    <th className="px-4 py-4">TOV</th>
                    <th className="px-4 py-4">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row: any) => (
                    <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-4">{row.games?.game_date ?? "—"}</td>
                      <td className="px-4 py-4">{row.games?.opponent ?? "Unknown Opponent"}</td>
                      <td className="px-4 py-4">{row.games?.match_type ?? "Game"}</td>
                      <td className="px-4 py-4">{row.games?.venue ?? "—"}</td>
                      <td className="px-4 py-4">
                        {row.games
                          ? `${row.games.team_score ?? 0} - ${row.games.opponent_score ?? 0}`
                          : "—"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-orange-300">
                        {row.points ?? 0}
                      </td>
                      <td className="px-4 py-4">{row.rebounds ?? 0}</td>
                      <td className="px-4 py-4">{row.assists ?? 0}</td>
                      <td className="px-4 py-4">{row.steals ?? 0}</td>
                      <td className="px-4 py-4">{row.blocks ?? 0}</td>
                      <td className="px-4 py-4">{row.turnovers ?? 0}</td>
                      <td className="px-4 py-4">{row.plus_minus ?? 0}</td>
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

function StatCard({
  label,
  value,
  subtle = false,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        subtle
          ? "border-slate-800 bg-slate-900"
          : "border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-black ${subtle ? "text-white" : "text-orange-300"}`}>
        {value}
      </div>
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

function TextBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm uppercase tracking-wide text-orange-300">{title}</div>
      <p className="mt-3 text-sm leading-7 text-slate-300">{value}</p>
    </div>
  );
}