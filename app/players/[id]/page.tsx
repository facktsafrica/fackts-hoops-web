import Link from "next/link";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import { supabase } from "@/lib/supabase";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPlayer(id: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .eq("player_type", FACKTS_PLAYER_TYPE)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

async function getPlayerStats(playerId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

async function getGamesForStats(stats: any[]) {
  const gameIds = Array.from(
    new Set(stats.map((row: any) => row.game_id).filter(Boolean))
  );

  if (gameIds.length === 0) return {};

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .in("id", gameIds);

  if (error) return {};

  return (data ?? []).reduce((acc: Record<string, any>, game: any) => {
    acc[game.id] = game;
    return acc;
  }, {});
}

function calculateAverages(stats: any[]) {
  if (!stats || stats.length === 0) {
    return {
      games: 0,
      ppg: "0.0",
      rpg: "0.0",
      apg: "0.0",
      spg: "0.0",
      bpg: "0.0",
      plusMinus: "0.0",
    };
  }

  const games = stats.length;

  const totals = stats.reduce(
    (acc: any, row: any) => {
      acc.points += Number(row.points ?? 0);
      acc.rebounds += Number(row.rebounds ?? 0);
      acc.assists += Number(row.assists ?? 0);
      acc.steals += Number(row.steals ?? 0);
      acc.blocks += Number(row.blocks ?? 0);
      acc.plusMinus += Number(row.plus_minus ?? 0);
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      plusMinus: 0,
    }
  );

  const avg = (value: number) => (value / games).toFixed(1);

  return {
    games,
    ppg: avg(totals.points),
    rpg: avg(totals.rebounds),
    apg: avg(totals.assists),
    spg: avg(totals.steals),
    bpg: avg(totals.blocks),
    plusMinus: avg(totals.plusMinus),
  };
}

function splitPreviousTeams(value?: string | null) {
  if (!value) return [];

  return value
    .split(/[,|\n]+/g)
    .map((team) => team.trim())
    .filter(Boolean);
}

function previousTeamHref(team: string) {
  return `/players?previousTeam=${encodeURIComponent(team)}`;
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  const player = await getPlayer(resolvedParams.id);

  if (!player) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/players"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            ← Back to Players
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Player not found.
          </div>
        </div>
      </main>
    );
  }

  const stats = await getPlayerStats(player.id);
  const gamesMap = await getGamesForStats(stats);
  const averages = calculateAverages(stats);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        {player.photo_url ? (
          <div className="absolute inset-0">
            <img
              src={player.photo_url}
              alt={player.full_name}
              className="h-full w-full object-cover"
              style={{
                objectPosition: player.photo_position ?? "center center",
              }}
            />
            <div className="absolute inset-0 bg-slate-950/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-orange-950/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30" />
        )}

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/players"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 backdrop-blur transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to Players
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr,1.2fr] lg:items-center">
            <div className="overflow-hidden rounded-[2rem] border border-orange-500/20 bg-slate-900 shadow-2xl shadow-orange-950/20">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.full_name}
                  className="h-[520px] w-full object-cover"
                  style={{
                    objectPosition: player.photo_position ?? "center center",
                  }}
                />
              ) : (
                <div className="flex h-[520px] w-full items-center justify-center bg-slate-900 text-7xl">
                  🏀
                </div>
              )}
            </div>

            <div>
              <div className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-slate-950">
                #{player.jersey_number ?? "—"}
              </div>

              {player.is_featured ? (
                <div className="ml-2 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
                  FEATURED PLAYER
                </div>
              ) : null}

              <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
                {player.full_name}
              </h1>

              <div className="mt-3 text-xl text-orange-300">
                {player.nickname ? `"${player.nickname}"` : "FACKTS Player"}
              </div>

              <div className="mt-5 text-lg text-slate-300">
                {player.position ?? "Position TBA"} • {player.role ?? "Role TBA"}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <ProfileInfo label="Height" value={player.height ?? "—"} />
                <ProfileInfo label="Age" value={player.age?.toString() ?? "—"} />
                <ProfileInfo label="Hand" value={player.dominant_hand ?? "—"} />
                <ProfileInfo label="Level" value={player.highest_level ?? "—"} />
                <ProfileInfo
                  label="Years Played"
                  value={player.years_played?.toString() ?? "—"}
                />
                <ProfileInfo label="Current Team" value={player.current_team ?? "—"} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-[0.2em] text-orange-300">
            Player Averages
          </div>
          <h2 className="mt-1 text-3xl font-black">Performance Summary</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <BigStat label="Games" value={String(averages.games)} />
          <BigStat label="PPG" value={averages.ppg} />
          <BigStat label="RPG" value={averages.rpg} />
          <BigStat label="APG" value={averages.apg} />
          <BigStat label="SPG" value={averages.spg} />
          <BigStat label="BPG" value={averages.bpg} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <BioBlock title="Style of Play" value={player.style_of_play} />
          <BioBlock title="Strengths" value={player.strengths} />
          <BioBlock title="Improvement Areas" value={player.improvements} />
          <PreviousTeamsBlock value={player.previous_teams} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-[0.2em] text-orange-300">
            Game Log
          </div>
          <h2 className="mt-1 text-3xl font-black">Player Stats by Game</h2>
        </div>

        {stats.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No game stats recorded for this player yet.
          </div>
        ) : (
          <div className="space-y-4">
            {stats.map((row: any) => {
              const game = gamesMap[row.game_id];

              return (
                <Link
                  key={row.id}
                  href={game?.id ? `/games/${game.id}` : "#"}
                  className="block rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:border-orange-400/40 hover:bg-slate-900/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">
                          FACKTS vs {game?.opponent ?? "Opponent"}
                        </h3>

                        {row.player_of_game ? (
                          <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-black text-slate-950">
                            PLAYER OF GAME
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        {game?.game_date ?? "Date TBA"} • {game?.venue ?? "Venue TBA"}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <SmallStat label="PTS" value={String(row.points ?? 0)} />
                      <SmallStat label="REB" value={String(row.rebounds ?? 0)} />
                      <SmallStat label="AST" value={String(row.assists ?? 0)} />
                      <SmallStat label="+/-" value={String(row.plus_minus ?? 0)} />
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

function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-orange-500/20 bg-slate-900 p-5 text-center shadow-lg shadow-orange-950/10">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-orange-300">
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-orange-300">
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function BioBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-sm uppercase tracking-wide text-orange-300">{title}</div>
      <div className="mt-3 leading-7 text-slate-300">
        {value && value.trim().length > 0 ? value : "Not added yet."}
      </div>
    </div>
  );
}

function PreviousTeamsBlock({ value }: { value?: string | null }) {
  const teams = splitPreviousTeams(value);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-sm uppercase tracking-wide text-orange-300">
        Previous Teams
      </div>

      {teams.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {teams.map((team) => (
            <Link
              key={team}
              href={previousTeamHref(team)}
              className="inline-flex max-w-full items-center rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black transition hover:bg-orange-400"
            >
              <span className="truncate">{team}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3 leading-7 text-slate-300">Not added yet.</div>
      )}
    </div>
  );
}
