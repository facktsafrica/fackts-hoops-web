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
        role
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
      <main className="p-6 text-white bg-slate-950 min-h-screen">
        Game not found.
      </main>
    );
  }

  const teamQ1 = stats.reduce((n: number, r: any) => n + (r.q1 || 0), 0);
  const teamQ2 = stats.reduce((n: number, r: any) => n + (r.q2 || 0), 0);
  const teamQ3 = stats.reduce((n: number, r: any) => n + (r.q3 || 0), 0);
  const teamQ4 = stats.reduce((n: number, r: any) => n + (r.q4 || 0), 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">
            {game.team_name} vs {game.opponent}
          </h1>
          <p className="mt-2 text-slate-300">
            {game.game_date} • {game.venue ?? "Venue TBA"} • {game.match_type ?? "Game"}
          </p>
          <div className="mt-4 text-5xl font-extrabold">
            {game.team_score} - {game.opponent_score}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <QCard label="Q1" value={teamQ1} />
          <QCard label="Q2" value={teamQ2} />
          <QCard label="Q3" value={teamQ3} />
          <QCard label="Q4" value={teamQ4} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 overflow-x-auto">
          <h2 className="text-2xl font-semibold mb-4">Box Score</h2>

          {stats.length === 0 ? (
            <p className="text-slate-400">No stats recorded yet for this game.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left border-b border-slate-800">
                  <th className="py-2">Player</th>
                  <th>Role</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>STL</th>
                  <th>BLK</th>
                  <th>TO</th>
                  <th>MIN</th>
                  <th>Q1</th>
                  <th>Q2</th>
                  <th>Q3</th>
                  <th>Q4</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row: any) => (
                  <tr key={row.id} className="border-b border-slate-800">
                    <td className="py-2">
                      #{row.players?.jersey_number ?? "—"} {row.players?.full_name ?? "—"}
                    </td>
                    <td>{row.players?.role ?? "—"}</td>
                    <td>{row.points}</td>
                    <td>{row.rebounds}</td>
                    <td>{row.assists}</td>
                    <td>{row.steals}</td>
                    <td>{row.blocks}</td>
                    <td>{row.turnovers}</td>
                    <td>{row.minutes}</td>
                    <td>{row.q1}</td>
                    <td>{row.q2}</td>
                    <td>{row.q3}</td>
                    <td>{row.q4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

function QCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}