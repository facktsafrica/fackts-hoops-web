import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getGame(id: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

async function getGameStats(gameId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", gameId)
    .order("points", { ascending: false });

  if (error) return [];
  return data ?? [];
}

async function getGameRoster(gameId: string) {
  const { data, error } = await supabase
    .from("game_rosters")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

async function getPlayersByIds(playerIds: string[]) {
  if (playerIds.length === 0) return {};

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .in("id", playerIds);

  if (error) return {};

  return (data ?? []).reduce((acc: Record<string, any>, player: any) => {
    acc[player.id] = player;
    return acc;
  }, {});
}

function getResultLabel(game: any) {
  if (game.is_upcoming) return "UPCOMING";

  const hasScore = game.team_score !== null && game.opponent_score !== null;

  if (!hasScore) return "FINAL";

  const won = Number(game.team_score) > Number(game.opponent_score);

  return won ? "WIN" : "LOSS";
}

function getResultClass(label: string) {
  if (label === "UPCOMING") return "bg-orange-500 text-slate-950";
  if (label === "WIN") return "bg-emerald-500 text-slate-950";
  if (label === "LOSS") return "bg-rose-500 text-white";
  return "bg-slate-700 text-slate-100";
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  const game = await getGame(resolvedParams.id);

  if (!game) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/games"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            ← Back to Games
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Game not found.
          </div>
        </div>
      </main>
    );
  }

  const [stats, rosterRows] = await Promise.all([
    getGameStats(game.id),
    getGameRoster(game.id),
  ]);

  const playerIds = Array.from(
    new Set([
      ...stats.map((row: any) => row.player_id).filter(Boolean),
      ...rosterRows.map((row: any) => row.player_id).filter(Boolean),
    ])
  );

  const playersMap = await getPlayersByIds(playerIds);

  const resultLabel = getResultLabel(game);

  const playerOfGame = stats.find((row: any) => row.player_of_game === true);
  const playerOfGameProfile = playerOfGame
    ? playersMap[playerOfGame.player_id]
    : null;

  const starters = rosterRows.filter(
    (row: any) =>
      row.roster_role === "starter" && row.roster_status === "confirmed"
  );

  const bench = rosterRows.filter(
    (row: any) =>
      row.roster_role === "bench" && row.roster_status === "confirmed"
  );

  const pending = rosterRows.filter(
    (row: any) => row.roster_status === "pending"
  );

  const unavailable = rosterRows.filter(
    (row: any) => row.roster_status === "unavailable"
  );

  const teamTotals = stats.reduce(
    (acc: any, row: any) => {
      acc.points += Number(row.points ?? 0);
      acc.rebounds += Number(row.rebounds ?? 0);
      acc.assists += Number(row.assists ?? 0);
      acc.steals += Number(row.steals ?? 0);
      acc.blocks += Number(row.blocks ?? 0);
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
    }
  );

  const confirmedCount = starters.length + bench.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        {game.poster_url ? (
          <div className="absolute inset-0">
            <img
              src={game.poster_url}
              alt={`Poster for FACKTS vs ${game.opponent}`}
              className="h-full w-full object-cover"
              style={{
                objectPosition: game.poster_position ?? "center center",
              }}
            />
            <div className="absolute inset-0 bg-slate-950/78" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-orange-950/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30" />
        )}

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/games"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 backdrop-blur transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to Games
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,0.8fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${getResultClass(
                    resultLabel
                  )}`}
                >
                  {resultLabel}
                </span>

                <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
                  {game.match_type ?? "Game"}
                </span>

                {rosterRows.length > 0 ? (
                  <span className="rounded-full border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200">
                    {confirmedCount} Confirmed
                  </span>
                ) : null}
              </div>

              <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
                FACKTS
                <span className="block text-orange-400">
                  vs {game.opponent ?? "Opponent"}
                </span>
              </h1>

              <div className="mt-5 text-lg text-slate-300">
                {game.game_date ?? "Date TBA"} • {game.venue ?? "Venue TBA"}
              </div>

              {!game.is_upcoming ? (
                <div className="mt-8 inline-flex items-center gap-5 rounded-[2rem] border border-orange-500/20 bg-slate-900/80 px-8 py-6 shadow-2xl shadow-orange-950/20 backdrop-blur">
                  <div className="text-center">
                    <div className="text-sm uppercase tracking-wide text-slate-500">
                      FACKTS
                    </div>
                    <div className="mt-1 text-6xl font-black text-orange-300">
                      {game.team_score ?? 0}
                    </div>
                  </div>

                  <div className="text-3xl font-black text-slate-500">-</div>

                  <div className="text-center">
                    <div className="text-sm uppercase tracking-wide text-slate-500">
                      {game.opponent ?? "Opponent"}
                    </div>
                    <div className="mt-1 text-6xl font-black text-white">
                      {game.opponent_score ?? 0}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-[2rem] border border-orange-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-orange-950/20 backdrop-blur">
                  <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                    Match Preview
                  </div>
                  <div className="mt-2 text-3xl font-black">
                    Confirmed roster loading in.
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {confirmedCount > 0
                      ? `${confirmedCount} players confirmed for this game.`
                      : "Roster has not been confirmed yet."}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-orange-950/20 backdrop-blur">
              {game.poster_url ? (
                <img
                  src={game.poster_url}
                  alt={`Poster for FACKTS vs ${game.opponent}`}
                  className="h-[430px] w-full rounded-[1.5rem] object-cover"
                  style={{
                    objectPosition: game.poster_position ?? "center center",
                  }}
                />
              ) : (
                <div className="flex h-[430px] flex-col items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-orange-950/30 text-center">
                  <div className="text-7xl opacity-20">🏀</div>
                  <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
                    FACKTS Game
                  </div>
                  <div className="mt-2 text-3xl font-black">
                    FACKTS vs {game.opponent ?? "Opponent"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {game.is_upcoming ? (
        <ConfirmedRosterSection
          rosterRows={rosterRows}
          starters={starters}
          bench={bench}
          pending={pending}
          unavailable={unavailable}
          playersMap={playersMap}
        />
      ) : null}

      {playerOfGame && playerOfGameProfile ? (
        <section className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="rounded-[2rem] border border-orange-500/25 bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/30 p-6 shadow-2xl shadow-orange-950/20">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                    Match Award
                  </div>
                  <h2 className="mt-1 text-3xl font-black">Player of the Game</h2>
                </div>

                <span className="animate-pulse rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-slate-950">
                  MVP
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr] lg:items-center">
                <Link
                  href={`/players/${playerOfGameProfile.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 transition hover:border-orange-400/40"
                >
                  {playerOfGameProfile.photo_url ? (
                    <img
                      src={playerOfGameProfile.photo_url}
                      alt={playerOfGameProfile.full_name}
                      className="h-28 w-28 rounded-3xl border-2 border-orange-400/40 object-cover"
                      style={{
                        objectPosition:
                          playerOfGameProfile.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-800 text-4xl">
                      🏀
                    </div>
                  )}

                  <div>
                    <div className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                      #{playerOfGameProfile.jersey_number ?? "—"}
                    </div>

                    <div className="mt-3 text-3xl font-black">
                      {playerOfGameProfile.full_name}
                    </div>

                    <div className="mt-1 text-sm text-orange-300">
                      {playerOfGameProfile.nickname
                        ? `"${playerOfGameProfile.nickname}"`
                        : "FACKTS standout"}
                    </div>

                    <div className="mt-2 text-sm text-slate-400">
                      Open player profile →
                    </div>
                  </div>
                </Link>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FlashStat label="PTS" value={String(playerOfGame.points ?? 0)} />
                  <FlashStat label="REB" value={String(playerOfGame.rebounds ?? 0)} />
                  <FlashStat label="AST" value={String(playerOfGame.assists ?? 0)} />
                  <FlashStat label="+/-" value={String(playerOfGame.plus_minus ?? 0)} />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!game.is_upcoming ? (
        <>
          <section className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-6">
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                Team Box Score
              </div>
              <h2 className="mt-1 text-3xl font-black">FACKTS Game Totals</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <BigStat label="PTS" value={String(teamTotals.points)} />
              <BigStat label="REB" value={String(teamTotals.rebounds)} />
              <BigStat label="AST" value={String(teamTotals.assists)} />
              <BigStat label="STL" value={String(teamTotals.steals)} />
              <BigStat label="BLK" value={String(teamTotals.blocks)} />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-10">
            <div className="mb-6">
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                Player Stats
              </div>
              <h2 className="mt-1 text-3xl font-black">Game Performance</h2>
            </div>

            {stats.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                No player stats recorded for this game yet.
              </div>
            ) : (
              <div className="space-y-4">
                {stats.map((row: any) => {
                  const player = playersMap[row.player_id];

                  return (
                    <Link
                      key={row.id}
                      href={player?.id ? `/players/${player.id}` : "#"}
                      className="block rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:border-orange-400/40 hover:bg-slate-900/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                          {player?.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.full_name}
                              className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
                              style={{
                                objectPosition:
                                  player.photo_position ?? "center center",
                              }}
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                              🏀
                            </div>
                          )}

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-xl font-bold">
                                #{player?.jersey_number ?? "—"}{" "}
                                {player?.full_name ?? "Unknown Player"}
                              </div>

                              {row.player_of_game ? (
                                <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-black text-slate-950">
                                  POG
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 text-sm text-slate-400">
                              {player?.position ?? "Position TBA"} •{" "}
                              {player?.role ?? "Player"}
                            </div>
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

          <ConfirmedRosterSection
            rosterRows={rosterRows}
            starters={starters}
            bench={bench}
            pending={pending}
            unavailable={unavailable}
            playersMap={playersMap}
          />
        </>
      ) : null}
    </main>
  );
}

function ConfirmedRosterSection({
  rosterRows,
  starters,
  bench,
  pending,
  unavailable,
  playersMap,
}: {
  rosterRows: any[];
  starters: any[];
  bench: any[];
  pending: any[];
  unavailable: any[];
  playersMap: Record<string, any>;
}) {
  return (
    <section className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              Confirmed Roster
            </div>
            <h2 className="mt-1 text-3xl font-black">FACKTS Game Squad</h2>
            <p className="mt-2 text-slate-400">
              Confirmed players, starters, bench, pending, and unavailable list for this game.
            </p>
          </div>

          <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
            {rosterRows.length} listed
          </div>
        </div>

        {rosterRows.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No public roster has been added for this game yet.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <RosterGroup title="Starters" rows={starters} playersMap={playersMap} />
            <RosterGroup title="Bench" rows={bench} playersMap={playersMap} />

            {pending.length > 0 ? (
              <RosterGroup title="Pending" rows={pending} playersMap={playersMap} />
            ) : null}

            {unavailable.length > 0 ? (
              <RosterGroup
                title="Unavailable"
                rows={unavailable}
                playersMap={playersMap}
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function RosterGroup({
  title,
  rows,
  playersMap,
}: {
  title: string;
  rows: any[];
  playersMap: Record<string, any>;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{title}</h3>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
          {rows.length}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
          No players in this group yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const player = playersMap[row.player_id];

            return (
              <Link
                key={row.id}
                href={player?.id ? `/players/${player.id}` : "#"}
                className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:border-orange-400/40"
              >
                {player?.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.full_name}
                    className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
                    style={{
                      objectPosition: player.photo_position ?? "center center",
                    }}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                    🏀
                  </div>
                )}

                <div className="min-w-0">
                  <div className="font-bold">
                    #{player?.jersey_number ?? "—"}{" "}
                    {player?.full_name ?? "Unknown Player"}
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    {player?.position ?? "Position TBA"} •{" "}
                    {row.roster_status ?? "confirmed"}
                  </div>

                  {row.notes ? (
                    <div className="mt-1 text-xs text-slate-500">{row.notes}</div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-orange-500/20 bg-slate-900 p-5 text-center shadow-lg shadow-orange-950/10">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-4xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function FlashStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-orange-500/20 bg-slate-950/80 p-5 text-center shadow-lg shadow-orange-950/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-4xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-orange-300">{value}</div>
    </div>
  );
}