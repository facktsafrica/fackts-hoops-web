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

async function getPlayerGameStats(gameId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", gameId)
    .order("points", { ascending: false });

  if (error) return [];
  return data ?? [];
}

async function getGuestGameStats(gameId: string) {
  const { data, error } = await supabase
    .from("guest_game_stats")
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

async function getGameGuestRoster(gameId: string) {
  const { data, error } = await supabase
    .from("game_guest_rosters")
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

async function getGuestHoopersByIds(guestIds: string[]) {
  if (guestIds.length === 0) return {};

  const { data, error } = await supabase
    .from("guest_hoopers")
    .select("*")
    .in("id", guestIds);

  if (error) return {};

  return (data ?? []).reduce((acc: Record<string, any>, guest: any) => {
    acc[guest.id] = guest;
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

function statNumber(row: any, key: string) {
  return Number(row?.[key] ?? 0);
}

function buildCombinedStats({
  playerStats,
  guestStats,
  playersMap,
  guestMap,
}: {
  playerStats: any[];
  guestStats: any[];
  playersMap: Record<string, any>;
  guestMap: Record<string, any>;
}) {
  const normalRows = playerStats.map((row: any) => {
    const player = playersMap[row.player_id] ?? null;

    return {
      id: `player-${row.id}`,
      rawId: row.id,
      type: "player",
      profileId: row.player_id,
      profile: player,
      name: player?.full_name ?? "Unknown Player",
      nickname: player?.nickname ?? null,
      jersey_number: player?.jersey_number ?? null,
      position: player?.position ?? null,
      role: player?.role ?? null,
      photo_url: player?.photo_url ?? null,
      photo_position: player?.photo_position ?? null,
      points: statNumber(row, "points"),
      rebounds: statNumber(row, "rebounds"),
      assists: statNumber(row, "assists"),
      steals: statNumber(row, "steals"),
      blocks: statNumber(row, "blocks"),
      turnovers: statNumber(row, "turnovers"),
      fouls: statNumber(row, "fouls"),
      three_pointers_made: statNumber(row, "three_pointers_made"),
      plus_minus: statNumber(row, "plus_minus"),
      is_player_of_the_game:
        row.player_of_game === true ||
        row.is_player_of_the_game === true ||
        row.is_homepage_pog === true,
    };
  });

  const guestRows = guestStats.map((row: any) => {
    const guest = guestMap[row.guest_hooper_id] ?? null;

    return {
      id: `guest-${row.id}`,
      rawId: row.id,
      type: "guest",
      profileId: row.guest_hooper_id,
      profile: guest,
      name: guest?.full_name ?? "Unknown Guest Hooper",
      nickname: guest?.nickname ?? null,
      jersey_number: null,
      position: guest?.position ?? null,
      role: guest?.role ?? "Guest Hooper",
      photo_url: guest?.photo_url ?? null,
      photo_position: guest?.photo_position ?? null,
      points: statNumber(row, "points"),
      rebounds: statNumber(row, "rebounds"),
      assists: statNumber(row, "assists"),
      steals: statNumber(row, "steals"),
      blocks: statNumber(row, "blocks"),
      turnovers: statNumber(row, "turnovers"),
      fouls: statNumber(row, "fouls"),
      three_pointers_made: statNumber(row, "three_pointers_made"),
      plus_minus: statNumber(row, "plus_minus"),
      is_player_of_the_game: row.is_player_of_the_game === true,
    };
  });

  return [...normalRows, ...guestRows].sort((a: any, b: any) => {
    const pointsDiff = Number(b.points ?? 0) - Number(a.points ?? 0);
    if (pointsDiff !== 0) return pointsDiff;

    const reboundsDiff = Number(b.rebounds ?? 0) - Number(a.rebounds ?? 0);
    if (reboundsDiff !== 0) return reboundsDiff;

    return Number(b.assists ?? 0) - Number(a.assists ?? 0);
  });
}

function getTotals(rows: any[]) {
  return rows.reduce(
    (acc: any, row: any) => {
      acc.points += Number(row.points ?? 0);
      acc.rebounds += Number(row.rebounds ?? 0);
      acc.assists += Number(row.assists ?? 0);
      acc.steals += Number(row.steals ?? 0);
      acc.blocks += Number(row.blocks ?? 0);
      acc.turnovers += Number(row.turnovers ?? 0);
      acc.fouls += Number(row.fouls ?? 0);
      acc.three_pointers_made += Number(row.three_pointers_made ?? 0);
      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      three_pointers_made: 0,
    }
  );
}

function getPlayerDisplayName(row: any) {
  if (row.type === "guest") {
    return row.name;
  }

  if (row.jersey_number !== null && row.jersey_number !== undefined) {
    return `#${row.jersey_number} ${row.name}`;
  }

  return row.name;
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
            Back to Games
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Game not found.
          </div>
        </div>
      </main>
    );
  }

  const [playerStats, guestStats, rosterRows, guestRosterRows] =
    await Promise.all([
      getPlayerGameStats(game.id),
      getGuestGameStats(game.id),
      getGameRoster(game.id),
      getGameGuestRoster(game.id),
    ]);

  const playerIds = Array.from(
    new Set([
      ...playerStats.map((row: any) => row.player_id).filter(Boolean),
      ...rosterRows.map((row: any) => row.player_id).filter(Boolean),
    ])
  );

  const guestIds = Array.from(
    new Set([
      ...guestStats.map((row: any) => row.guest_hooper_id).filter(Boolean),
      ...guestRosterRows.map((row: any) => row.guest_hooper_id).filter(Boolean),
    ])
  );

  const [playersMap, guestMap] = await Promise.all([
    getPlayersByIds(playerIds),
    getGuestHoopersByIds(guestIds),
  ]);

  const combinedStats = buildCombinedStats({
    playerStats,
    guestStats,
    playersMap,
    guestMap,
  });

  const teamTotals = getTotals(combinedStats);

  const resultLabel = getResultLabel(game);
  const scorePosted =
    game.team_score !== null && game.team_score !== undefined;

  const scoreDifference = scorePosted
    ? Number(game.team_score ?? 0) - Number(teamTotals.points ?? 0)
    : 0;

  const playerOfGame =
    combinedStats.find((row: any) => row.is_player_of_the_game === true) ??
    combinedStats[0] ??
    null;

  const starters = rosterRows.filter(
    (row: any) =>
      row.roster_role === "starter" && row.roster_status === "confirmed"
  );

  const bench = rosterRows.filter(
    (row: any) =>
      row.roster_role === "bench" && row.roster_status === "confirmed"
  );

  const guestStarters = guestRosterRows.filter(
    (row: any) =>
      row.roster_role === "starter" && row.roster_status === "confirmed"
  );

  const guestBench = guestRosterRows.filter(
    (row: any) =>
      row.roster_role === "bench" && row.roster_status === "confirmed"
  );

  const pending = rosterRows.filter(
    (row: any) => row.roster_status === "pending"
  );

  const unavailable = rosterRows.filter(
    (row: any) => row.roster_status === "unavailable"
  );

  const guestPending = guestRosterRows.filter(
    (row: any) => row.roster_status === "pending"
  );

  const guestUnavailable = guestRosterRows.filter(
    (row: any) => row.roster_status === "unavailable"
  );

  const confirmedCount =
    starters.length + bench.length + guestStarters.length + guestBench.length;

  const totalListed = rosterRows.length + guestRosterRows.length;

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
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/games"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 backdrop-blur transition hover:bg-slate-800 hover:text-white"
          >
            Back to Games
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

                {totalListed > 0 ? (
                  <span className="rounded-full border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200">
                    {confirmedCount} Confirmed
                  </span>
                ) : null}

                {guestRosterRows.length > 0 ? (
                  <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
                    {guestRosterRows.length} Guest Hoopers
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                FACKTS vs{" "}
                <span className="text-orange-400">
                  {game.opponent ?? "Opponent"}
                </span>
              </h1>

              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                <span>{game.game_date ?? "Date TBA"}</span>
                <span className="text-slate-600">|</span>
                <span>{game.game_time ?? "Time TBA"}</span>
                <span className="text-slate-600">|</span>
                <span>{game.venue ?? "Venue TBA"}</span>
              </div>

              {game.description ? (
                <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  {game.description}
                </p>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                Scoreboard
              </div>

              <div className="mt-5 grid grid-cols-[1fr,auto,1fr] items-center gap-3">
                <ScoreBox label="FACKTS" value={game.team_score ?? "-"} />
                <div className="text-2xl font-black text-slate-500">-</div>
                <ScoreBox
                  label={game.opponent ?? "Opponent"}
                  value={game.opponent_score ?? "-"}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniInfo label="Stats Points" value={String(teamTotals.points)} />
                <MiniInfo
                  label="Score Check"
                  value={
                    scorePosted
                      ? scoreDifference === 0
                        ? "Balanced"
                        : `${scoreDifference > 0 ? "+" : ""}${scoreDifference}`
                      : "No score"
                  }
                />
              </div>

              {scorePosted && scoreDifference !== 0 ? (
                <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm leading-6 text-orange-200">
                  Stats total is {Math.abs(scoreDifference)} point(s){" "}
                  {scoreDifference > 0 ? "below" : "above"} the posted FACKTS
                  score. Check player and guest stats.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {playerOfGame ? (
        <section className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="rounded-[2rem] border border-orange-500/25 bg-slate-900 p-5 shadow-xl shadow-orange-950/20">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  {playerOfGame.photo_url ? (
                    <img
                      src={playerOfGame.photo_url}
                      alt={playerOfGame.name}
                      className="h-20 w-20 rounded-3xl border border-orange-400/30 object-cover"
                      style={{
                        objectPosition:
                          playerOfGame.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 text-sm font-black text-orange-300">
                      {playerOfGame.type === "guest" ? "GH" : "FH"}
                    </div>
                  )}

                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                      Player of the Game
                    </div>

                    <h2 className="mt-1 text-2xl font-black">
                      {getPlayerDisplayName(playerOfGame)}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      {playerOfGame.type === "guest"
                        ? "Guest Hooper"
                        : playerOfGame.position ?? "FACKTS Player"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <SmallStat label="PTS" value={playerOfGame.points} />
                  <SmallStat label="REB" value={playerOfGame.rebounds} />
                  <SmallStat label="AST" value={playerOfGame.assists} />
                  <SmallStat label="+/-" value={playerOfGame.plus_minus} />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                Team Totals
              </div>

              <h2 className="mt-1 text-3xl font-black">
                Player + Guest Game Stats
              </h2>
            </div>

            <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
              {combinedStats.length} stat lines
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <TotalCard label="PTS" value={teamTotals.points} />
            <TotalCard label="3PM" value={teamTotals.three_pointers_made} />
            <TotalCard label="REB" value={teamTotals.rebounds} />
            <TotalCard label="AST" value={teamTotals.assists} />
            <TotalCard label="STL" value={teamTotals.steals} />
            <TotalCard label="BLK" value={teamTotals.blocks} />
            <TotalCard label="TO" value={teamTotals.turnovers} />
            <TotalCard label="FLS" value={teamTotals.fouls} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5">
          <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
            Box Score
          </div>

          <h2 className="mt-1 text-3xl font-black">Game Stats</h2>

          <p className="mt-2 text-sm text-slate-400">
            Includes both FACKTS players and guest hoopers.
          </p>
        </div>

        {combinedStats.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No player or guest stats have been entered for this game yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-3 py-3 text-right">PTS</th>
                    <th className="px-3 py-3 text-right">3PM</th>
                    <th className="px-3 py-3 text-right">REB</th>
                    <th className="px-3 py-3 text-right">AST</th>
                    <th className="px-3 py-3 text-right">STL</th>
                    <th className="px-3 py-3 text-right">BLK</th>
                    <th className="px-3 py-3 text-right">TO</th>
                    <th className="px-3 py-3 text-right">FLS</th>
                    <th className="px-3 py-3 text-right">+/-</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {combinedStats.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.photo_url ? (
                            <img
                              src={row.photo_url}
                              alt={row.name}
                              className="h-10 w-10 rounded-xl object-cover"
                              style={{
                                objectPosition:
                                  row.photo_position ?? "center center",
                              }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xs font-black text-orange-300">
                              {row.type === "guest" ? "GH" : "FH"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="truncate font-black text-white">
                              {getPlayerDisplayName(row)}
                            </div>

                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-400">
                              <span>
                                {row.type === "guest"
                                  ? "Guest Hooper"
                                  : row.position ?? "Player"}
                              </span>

                              {row.is_player_of_the_game ? (
                                <span className="text-orange-300">
                                  Player of the Game
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <StatCell value={row.points} strong />
                      <StatCell value={row.three_pointers_made} />
                      <StatCell value={row.rebounds} />
                      <StatCell value={row.assists} />
                      <StatCell value={row.steals} />
                      <StatCell value={row.blocks} />
                      <StatCell value={row.turnovers} />
                      <StatCell value={row.fouls} />
                      <StatCell value={row.plus_minus} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-5">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              Game Roster
            </div>

            <h2 className="mt-1 text-3xl font-black">
              Confirmed Players & Guest Hoopers
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <RosterGroup
              title="Starters"
              rows={starters}
              guestRows={guestStarters}
              playersMap={playersMap}
              guestMap={guestMap}
            />

            <RosterGroup
              title="Bench"
              rows={bench}
              guestRows={guestBench}
              playersMap={playersMap}
              guestMap={guestMap}
            />

            {pending.length + guestPending.length > 0 ? (
              <RosterGroup
                title="Pending"
                rows={pending}
                guestRows={guestPending}
                playersMap={playersMap}
                guestMap={guestMap}
              />
            ) : null}

            {unavailable.length + guestUnavailable.length > 0 ? (
              <RosterGroup
                title="Unavailable"
                rows={unavailable}
                guestRows={guestUnavailable}
                playersMap={playersMap}
                guestMap={guestMap}
              />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function ScoreBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-center">
      <div className="truncate text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-4xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-black text-slate-200">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-center">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-orange-300">{value}</div>
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function StatCell({
  value,
  strong = false,
}: {
  value: number;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right ${
        strong ? "font-black text-orange-300" : "font-bold text-slate-200"
      }`}
    >
      {value ?? 0}
    </td>
  );
}

function RosterGroup({
  title,
  rows,
  guestRows,
  playersMap,
  guestMap,
}: {
  title: string;
  rows: any[];
  guestRows: any[];
  playersMap: Record<string, any>;
  guestMap: Record<string, any>;
}) {
  const totalRows = rows.length + guestRows.length;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{title}</h3>

        <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {totalRows}
        </div>
      </div>

      {totalRows === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
          No one listed here.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row: any) => {
            const player = playersMap[row.player_id];

            return (
              <RosterPersonCard
                key={`player-${row.id}`}
                name={player?.full_name ?? "Unknown Player"}
                subtitle={`${player?.position ?? "Player"}${
                  player?.role ? ` | ${player.role}` : ""
                }`}
                photoUrl={player?.photo_url}
                photoPosition={player?.photo_position}
                label="FACKTS"
              />
            );
          })}

          {guestRows.map((row: any) => {
            const guest = guestMap[row.guest_hooper_id];

            return (
              <RosterPersonCard
                key={`guest-${row.id}`}
                name={guest?.full_name ?? "Unknown Guest Hooper"}
                subtitle={`${guest?.position ?? "Guest Hooper"} | Guest`}
                photoUrl={guest?.photo_url}
                photoPosition={guest?.photo_position}
                label="Guest"
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function RosterPersonCard({
  name,
  subtitle,
  photoUrl,
  photoPosition,
  label,
}: {
  name: string;
  subtitle: string;
  photoUrl?: string | null;
  photoPosition?: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-12 w-12 rounded-2xl object-cover"
            style={{
              objectPosition: photoPosition ?? "center center",
            }}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xs font-black text-orange-300">
            {label === "Guest" ? "GH" : "FH"}
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate font-black text-white">{name}</div>
          <div className="truncate text-xs text-slate-400">{subtitle}</div>
        </div>
      </div>

      <div
        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
          label === "Guest"
            ? "bg-orange-500 text-slate-950"
            : "bg-slate-800 text-slate-300"
        }`}
      >
        {label}
      </div>
    </div>
  );
}