import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (error) return [];
  return data ?? [];
}

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false })
    .limit(8);

  if (error) return [];
  return data ?? [];
}

async function getNextGame() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_upcoming", true)
    .order("game_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

async function getHomepagePOG() {
  const { data: statRow, error: statError } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("is_homepage_pog", true)
    .limit(1)
    .maybeSingle();

  if (statError || !statRow) return null;

  const { data: playerData } = await supabase
    .from("players")
    .select("*")
    .eq("id", statRow.player_id)
    .maybeSingle();

  const { data: gameData } = await supabase
    .from("games")
    .select("*")
    .eq("id", statRow.game_id)
    .maybeSingle();

  return {
    ...statRow,
    player: playerData ?? null,
    game: gameData ?? null,
  };
}

async function getPlayerAverages(playerId: string) {
  const { data, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("player_id", playerId);

  if (error || !data || data.length === 0) {
    return {
      games: 0,
      ppg: "0.0",
      rpg: "0.0",
      apg: "0.0",
      spg: "0.0",
      bpg: "0.0",
    };
  }

  const games = data.length;

  const totals = data.reduce(
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

  const avg = (value: number) => (value / games).toFixed(1);

  return {
    games,
    ppg: avg(totals.points),
    rpg: avg(totals.rebounds),
    apg: avg(totals.assists),
    spg: avg(totals.steals),
    bpg: avg(totals.blocks),
  };
}

export default async function HomePage() {
  const [players, games, nextGame, homepagePOG] = await Promise.all([
    getPlayers(),
    getGames(),
    getNextGame(),
    getHomepagePOG(),
  ]);

  const completedGames = games.filter((g: any) => g.is_upcoming !== true);
  const latestCompletedGame = completedGames[0] ?? null;

  const featuredPlayer =
    players.find((p: any) => p.is_featured === true) ??
    players.find((p: any) => p.role?.toLowerCase() === "starter") ??
    players[0] ??
    null;

  const featuredAverages = featuredPlayer
    ? await getPlayerAverages(featuredPlayer.id)
    : null;

  const wins = completedGames.filter(
    (g: any) =>
      g.team_score !== null &&
      g.opponent_score !== null &&
      Number(g.team_score) > Number(g.opponent_score)
  ).length;

  const losses = completedGames.filter(
    (g: any) =>
      g.team_score !== null &&
      g.opponent_score !== null &&
      Number(g.team_score) < Number(g.opponent_score)
  ).length;

  const heroImage =
    nextGame?.poster_url ??
    latestCompletedGame?.poster_url ??
    homepagePOG?.player?.photo_url ??
    featuredPlayer?.photo_url ??
    null;

  const pogBackground =
    homepagePOG?.game?.poster_url ??
    homepagePOG?.player?.photo_url ??
    heroImage ??
    null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="animate-pulse rounded-full bg-orange-500 px-3 py-1 font-bold text-slate-950">
              FACKTS LIVE
            </span>

            {latestCompletedGame ? (
              <span className="text-slate-300">
                Latest Result:
                <span className="ml-2 font-semibold text-white">
                  FACKTS {latestCompletedGame.team_score ?? 0} -{" "}
                  {latestCompletedGame.opponent_score ?? 0}{" "}
                  {latestCompletedGame.opponent}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">No recent game logged yet.</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>
              W: <span className="font-semibold text-emerald-300">{wins}</span>
            </span>
            <span>
              L: <span className="font-semibold text-rose-300">{losses}</span>
            </span>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden border-b border-slate-800">
        {heroImage ? (
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="FACKTS basketball hero"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/78" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-orange-950/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30" />
        )}

        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-slate-900/70 px-4 py-2 text-sm backdrop-blur">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-400" />
                <span className="font-medium text-orange-300">
                  FACKTS Hoops Platform
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                The home of
                <span className="block text-orange-400">
                  FACKTS basketball data
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
                Player profiles, game results, standout performances, court
                stories, and the culture around Kenyan basketball.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/players"
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition duration-300 hover:scale-[1.02] hover:bg-orange-400"
                >
                  Explore Players
                </Link>

                <Link
                  href="/games"
                  className="rounded-2xl border border-slate-600 bg-slate-900/60 px-5 py-3 font-semibold text-slate-200 backdrop-blur transition duration-300 hover:scale-[1.02] hover:bg-slate-800"
                >
                  Explore Games
                </Link>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <HeroStat label="Active Players" value={String(players.length)} />
                <HeroStat
                  label="Games Logged"
                  value={String(completedGames.length)}
                />
                <HeroStat label="Record" value={`${wins}-${losses}`} />
              </div>
            </div>

            <div className="grid gap-5">
              <div className="overflow-hidden rounded-[2rem] border border-orange-500/25 bg-slate-900/75 shadow-2xl shadow-orange-950/20 backdrop-blur">
                {nextGame?.poster_url ? (
                  <div className="relative h-64">
                    <img
                      src={nextGame.poster_url}
                      alt={`Poster for FACKTS vs ${nextGame.opponent}`}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: nextGame.poster_position ?? "center center",
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    <div className="absolute left-5 top-5 rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                      NEXT GAME
                    </div>
                    <div className="absolute bottom-5 left-5 right-5">
                      <div className="text-3xl font-black">
                        FACKTS vs {nextGame.opponent ?? "Opponent"}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        {nextGame.game_date ?? "TBA"} •{" "}
                        {nextGame.venue ?? "Venue TBA"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative min-h-64 bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/40 p-6">
                    <div className="absolute right-6 top-6 text-7xl opacity-10">🏀</div>
                    <div className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950 w-fit">
                      NEXT GAME
                    </div>
                    <div className="mt-8 text-3xl font-black">
                      {nextGame
                        ? `FACKTS vs ${nextGame.opponent ?? "Opponent"}`
                        : "Next game not set"}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {nextGame
                        ? `${nextGame.game_date ?? "TBA"} • ${
                            nextGame.venue ?? "Venue TBA"
                          }`
                        : "Mark an upcoming game in admin."}
                    </div>
                  </div>
                )}

                {nextGame ? (
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <MiniInfo label="Type" value={nextGame.match_type ?? "Game"} />
                      <MiniInfo label="Status" value="Upcoming" />
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/games/${nextGame.id}`}
                        className="inline-flex rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                      >
                        Open upcoming game →
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-orange-950/20 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm uppercase tracking-wide text-slate-400">
                      Featured Player
                    </div>
                    <div className="mt-1 text-2xl font-bold">Spotlight</div>
                  </div>
                  <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
                    FACKTS
                  </div>
                </div>

                {featuredPlayer ? (
                  <Link
                    href={`/players/${featuredPlayer.id}`}
                    className="block rounded-3xl border border-slate-800 bg-slate-950/90 p-5 transition hover:border-orange-400/40 hover:bg-slate-950"
                  >
                    <div className="flex items-center gap-4">
                      {featuredPlayer.photo_url ? (
                        <img
                          src={featuredPlayer.photo_url}
                          alt={featuredPlayer.full_name}
                          className="h-24 w-24 rounded-3xl border border-slate-700 object-cover"
                          style={{
                            objectPosition:
                              featuredPlayer.photo_position ?? "center center",
                          }}
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800 text-4xl">
                          🏀
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-slate-950">
                          #{featuredPlayer.jersey_number ?? "—"}
                        </div>
                        <div className="mt-3 text-2xl font-bold leading-tight">
                          {featuredPlayer.full_name}
                        </div>
                        <div className="mt-1 text-sm text-orange-300">
                          {featuredPlayer.nickname
                            ? `"${featuredPlayer.nickname}"`
                            : "FACKTS Player"}
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          {featuredPlayer.position ?? "—"} •{" "}
                          {featuredPlayer.role ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                      <FeaturedStat
                        label="Games"
                        value={String(featuredAverages?.games ?? 0)}
                      />
                      <FeaturedStat
                        label="PPG"
                        value={featuredAverages?.ppg ?? "0.0"}
                      />
                      <FeaturedStat
                        label="RPG"
                        value={featuredAverages?.rpg ?? "0.0"}
                      />
                      <FeaturedStat
                        label="APG"
                        value={featuredAverages?.apg ?? "0.0"}
                      />
                      <FeaturedStat
                        label="SPG"
                        value={featuredAverages?.spg ?? "0.0"}
                      />
                      <FeaturedStat
                        label="BPG"
                        value={featuredAverages?.bpg ?? "0.0"}
                      />
                    </div>

                    <div className="mt-5 text-sm font-semibold text-orange-300">
                      Open featured profile →
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-400">
                    No featured player yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        {pogBackground ? (
          <div className="absolute inset-0">
            <img
              src={pogBackground}
              alt="Player of the Game background"
              className="h-full w-full object-cover"
              style={{
                objectPosition:
                  homepagePOG?.player?.photo_position ?? "center center",
              }}
            />
            <div className="absolute inset-0 bg-slate-950/82" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-orange-950/50" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20" />
        )}

        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                MVP Spotlight
              </div>
              <h2 className="mt-1 text-4xl font-black">Player of the Game</h2>
            </div>

            <div className="animate-pulse rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
              HOT PERFORMANCE
            </div>
          </div>

          {homepagePOG?.player ? (
            <div className="rounded-[2rem] border border-orange-500/25 bg-slate-900/75 p-6 shadow-2xl shadow-orange-950/30 backdrop-blur">
              <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
                <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
                  <div className="flex items-center gap-4">
                    {homepagePOG.player.photo_url ? (
                      <img
                        src={homepagePOG.player.photo_url}
                        alt={homepagePOG.player.full_name}
                        className="h-32 w-32 rounded-3xl border-2 border-orange-400/40 object-cover shadow-lg shadow-orange-950/20"
                        style={{
                          objectPosition:
                            homepagePOG.player.photo_position ?? "center center",
                        }}
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-slate-800 text-4xl">
                        🏀
                      </div>
                    )}

                    <div>
                      <div className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                        PLAYER OF THE GAME
                      </div>

                      <div className="mt-3 text-3xl font-black leading-tight">
                        #{homepagePOG.player.jersey_number ?? "—"}{" "}
                        {homepagePOG.player.full_name}
                      </div>

                      <div className="mt-2 text-sm text-orange-300">
                        {homepagePOG.player.nickname
                          ? `"${homepagePOG.player.nickname}"`
                          : "FACKTS standout"}
                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        {homepagePOG.player.position ?? "—"} •{" "}
                        {homepagePOG.player.role ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Performance came from
                    </div>
                    <div className="mt-2 text-xl font-bold">
                      FACKTS vs {homepagePOG.game?.opponent ?? "Opponent"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {homepagePOG.game?.game_date ?? "Date TBA"} •{" "}
                      {homepagePOG.game?.venue ?? "Venue TBA"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <FlashStat label="PTS" value={homepagePOG.points ?? 0} />
                    <FlashStat label="REB" value={homepagePOG.rebounds ?? 0} />
                    <FlashStat label="AST" value={homepagePOG.assists ?? 0} />
                    <FlashStat label="+/-" value={homepagePOG.plus_minus ?? 0} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/players/${homepagePOG.player.id}`}
                      className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition duration-300 hover:scale-[1.02] hover:bg-orange-400"
                    >
                      Open player profile
                    </Link>

                    {homepagePOG.game?.id ? (
                      <Link
                        href={`/games/${homepagePOG.game.id}`}
                        className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-slate-200 transition duration-300 hover:scale-[1.02] hover:bg-slate-800"
                      >
                        Open game details
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              No homepage Player of the Game has been selected yet.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-orange-300">
              Roster
            </div>
            <h2 className="mt-1 text-3xl font-bold">Players</h2>
            <p className="mt-2 text-slate-400">
              Explore the FACKTS roster and open full player pages.
            </p>
          </div>

          <Link
            href="/players"
            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            View all players
          </Link>
        </div>

        {players.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No active players found.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {players.slice(0, 6).map((player: any) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
              >
                <div className="relative">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-slate-950">
                    #{player.jersey_number ?? "—"}
                  </div>

                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.full_name}
                      className="h-72 w-full object-cover"
                      style={{
                        objectPosition: player.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-6xl">
                      🏀
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold group-hover:text-orange-300">
                        {player.full_name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {player.nickname ? `"${player.nickname}"` : "FACKTS Player"}
                      </p>
                    </div>

                    <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                      {player.role ?? "Bench"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <MiniInfo label="Position" value={player.position ?? "—"} />
                    <MiniInfo label="Height" value={player.height ?? "—"} />
                    <MiniInfo label="Hand" value={player.dominant_hand ?? "—"} />
                    <MiniInfo label="Level" value={player.highest_level ?? "—"} />
                  </div>

                  <div className="mt-5 inline-flex items-center text-sm font-semibold text-orange-300">
                    Open player profile →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-orange-300">
              Fixtures & Results
            </div>
            <h2 className="mt-1 text-3xl font-bold">Games</h2>
            <p className="mt-2 text-slate-400">
              Recent FACKTS match results and detailed game pages.
            </p>
          </div>

          <Link
            href="/games"
            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            View all games
          </Link>
        </div>

        {games.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No games found yet.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {games.slice(0, 4).map((game: any) => {
              const hasScore =
                game.team_score !== null && game.opponent_score !== null;

              const gameWon =
                hasScore && Number(game.team_score) > Number(game.opponent_score);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
                >
                  {game.poster_url ? (
                    <img
                      src={game.poster_url}
                      alt={`Poster for FACKTS vs ${game.opponent}`}
                      className="h-56 w-full object-cover"
                      style={{
                        objectPosition: game.poster_position ?? "center center",
                      }}
                    />
                  ) : null}

                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-400">
                        {game.game_date} • {game.venue ?? "Venue TBA"}
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          game.is_upcoming
                            ? "bg-orange-500/15 text-orange-300"
                            : !hasScore
                            ? "bg-slate-800 text-slate-300"
                            : gameWon
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {game.is_upcoming
                          ? "UPCOMING"
                          : !hasScore
                          ? "FINAL"
                          : gameWon
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

      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Contact
              </div>
              <h2 className="mt-1 text-3xl font-bold">Talk to FACKTS</h2>
              <p className="mt-2 text-slate-400">
                Partnerships, player visibility, basketball media, and content
                collaboration.
              </p>
            </div>

            <Link
              href="/contact"
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Open contact page
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Details
              </div>
              <div className="mt-5 space-y-4 text-slate-300">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Email
                  </div>
                  <div className="mt-1">facktsafrica@gmail.com</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Phone
                  </div>
                  <div className="mt-1">+254 711 468 303</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Location
                  </div>
                  <div className="mt-1">Westlands, Nairobi, Kenya</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Platform Links
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
                >
                  YouTube
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
                >
                  Instagram
                </a>
                <Link
                  href="/players"
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
                >
                  Explore Players
                </Link>
                <Link
                  href="/games"
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
                >
                  Explore Games
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function FeaturedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function FlashStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-orange-500/20 bg-slate-900/80 p-5 text-center shadow-lg shadow-orange-950/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-4xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-200">{value}</div>
    </div>
  );
}