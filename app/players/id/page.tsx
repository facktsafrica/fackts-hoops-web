import { supabase } from "@/lib/supabase";
import { Player } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

async function getPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function getPlayerStats(id: string) {
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
        opponent_score
      )
    `)
    .eq("player_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

function sumStats(rows: any[]) {
  return rows.reduce(
    (acc, row) => {
      acc.points += row.points || 0;
      acc.rebounds += row.rebounds || 0;
      acc.assists += row.assists || 0;
      acc.steals += row.steals || 0;
      acc.blocks += row.blocks || 0;
      acc.turnovers += row.turnovers || 0;
      acc.minutes += row.minutes || 0;
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      minutes: 0,
    }
  );
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const [player, statRows] = await Promise.all([
    getPlayer(id),
    getPlayerStats(id),
  ]);

  if (!player) {
    return (
      <main className="p-6 text-white bg-slate-950 min-h-screen">
        Player not found.
      </main>
    );
  }

  const totals = sumStats(statRows);
  const gamesPlayed = statRows.length;
  const ppg = gamesPlayed ? (totals.points / gamesPlayed).toFixed(1) : "0.0";
  const rpg = gamesPlayed ? (totals.rebounds / gamesPlayed).toFixed(1) : "0.0";
  const apg = gamesPlayed ? (totals.assists / gamesPlayed).toFixed(1) : "0.0";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">{player.full_name}</h1>
              <p className="mt-2 text-slate-300">
                #{player.jersey_number ?? "—"} • {player.position ?? "—"} • {player.role ?? "—"}
              </p>
              <p className="mt-2 text-emerald-300">
                Nickname: {player.nickname ?? "—"}
              </p>
            </div>

            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.full_name}
                className="h-28 w-28 rounded-3xl object-cover border border-slate-700"
              />
            ) : (
              <div className="h-28 w-28 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl">
                🏀
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <StatCard label="Games" value={String(gamesPlayed)} />
          <StatCard label="PPG" value={ppg} />
          <StatCard label="RPG" value={rpg} />
          <StatCard label="APG" value={apg} />
          <StatCard label="STL" value={String(totals.steals)} />
          <StatCard label="BLK" value={String(totals.blocks)} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard label="Height" value={player.height} />
          <InfoCard label="Dominant Hand" value={player.dominant_hand} />
          <InfoCard label="Current Team" value={player.current_team} />
          <InfoCard label="Highest Level" value={player.highest_level} />
          <InfoCard label="Years Played" value={player.years_played} />
          <InfoCard label="Followers" value={player.followers_range} />
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="text-slate-400 text-sm">Style of Play</div>
          <div className="mt-2 text-lg">{player.style_of_play ?? "—"}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <div className="text-slate-400 text-sm">Strengths</div>
            <div className="mt-2">{player.strengths ?? "—"}</div>
          </div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <div className="text-slate-400 text-sm">Improvement Areas</div>
            <div className="mt-2">{player.improvements ?? "—"}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-2xl font-semibold mb-4">Game Log</h2>

          {statRows.length === 0 ? (
            <p className="text-slate-400">No stats recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {statRows.map((row: any) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold">
                        vs {row.games?.opponent ?? "Opponent"}
                      </div>
                      <div className="text-sm text-slate-400">
                        {row.games?.game_date ?? "—"} • {row.games?.venue ?? "Venue TBA"}
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {row.games?.team_score ?? 0} - {row.games?.opponent_score ?? 0}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-6">
                    <Mini label="PTS" value={row.points} />
                    <Mini label="REB" value={row.rebounds} />
                    <Mini label="AST" value={row.assists} />
                    <Mini label="STL" value={row.steals} />
                    <Mini label="BLK" value={row.blocks} />
                    <Mini label="MIN" value={row.minutes} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-xl font-semibold mt-2">{value ?? "—"}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}