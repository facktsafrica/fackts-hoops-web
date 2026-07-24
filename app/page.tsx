import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FacktsNetwork from "./components/FacktsNetwork";
import FacktsStories from "./components/FacktsStories";
import AnimatedNumber from "./components/AnimatedNumber";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GameRow = {
  id: string;
  title?: string | null;
  game_title?: string | null;
  opponent?: string | null;
  opponent_name?: string | null;
  team_name?: string | null;
  game_date?: string | null;
  date?: string | null;
  venue?: string | null;
  location?: string | null;
  status?: string | null;
  is_upcoming?: boolean | null;
  team_score?: number | string | null;
  fackts_score?: number | string | null;
  home_score?: number | string | null;
  opponent_score?: number | string | null;
  away_score?: number | string | null;
  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  game_video_url?: string | null;
  highlight_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PlayerRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | string | null;
  role?: string | null;
  position?: string | null;
  height?: string | null;
  dominant_hand?: string | null;
  highest_level?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;

  player_type?: string | null;
  roster_status?: string | null;
  category?: string | null;
  is_guest?: boolean | null;
};

type PlayerStatRow = {
  id?: string;
  player_id?: string | null;
  game_id?: string | null;
  points?: number | string | null;
  rebounds?: number | string | null;
  assists?: number | string | null;
  steals?: number | string | null;
  blocks?: number | string | null;
  plus_minus?: number | string | null;
  is_homepage_pog?: boolean | null;
  player?: PlayerRow | null;
  game?: GameRow | null;
};
function isOfficialRosterPlayer(player: any) {
  const combinedType = [
    player.player_type,
    player.roster_status,
    player.category,
    player.role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (player.is_guest === true) return false;
  if (combinedType.includes("guest")) return false;
  if (combinedType.includes("prospect")) return false;
  if (combinedType.includes("external")) return false;
  if (combinedType.includes("partner team")) return false;

  return true;
}
async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (error) return [];

  return ((data ?? []) as PlayerRow[]).filter(isOfficialRosterPlayer);
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getGameTitle(game?: GameRow | null) {
  if (!game) return "FACKTS Game";

  return game.game_title || game.title || "FACKTS Game";
}

function getOpponent(game?: GameRow | null) {
  if (!game) return "Opponent";

  return game.opponent || game.opponent_name || game.team_name || "Opponent";
}

function getGameDate(game?: GameRow | null) {
  if (!game) return null;

  return game.game_date || game.date || game.created_at || null;
}

function getPosterUrl(game?: GameRow | null) {
  if (!game) return "";

  return game.poster_url || game.game_poster_url || game.image_url || "";
}

function getVideoUrl(game?: GameRow | null) {
  if (!game) return "";

  return game.video_url || game.game_video_url || "";
}

function getTeamScore(game?: GameRow | null) {
  if (!game) return null;

  return numberValue(game.team_score, game.fackts_score, game.home_score);
}

function getOpponentScore(game?: GameRow | null) {
  if (!game) return null;

  return numberValue(game.opponent_score, game.away_score);
}

function getGameStatus(game?: GameRow | null) {
  if (!game) return "upcoming";

  const status = String(game.status ?? "").toLowerCase().trim();

  if (status === "completed" || status === "played" || status === "final") {
    return "completed";
  }

  if (status === "postponed") return "postponed";
  if (status === "cancelled") return "cancelled";
  if (status === "upcoming") return "upcoming";

  if (game.is_upcoming === true) return "upcoming";
  if (game.is_upcoming === false) return "completed";

  const teamScore = getTeamScore(game);
  const opponentScore = getOpponentScore(game);

  if (teamScore !== null && opponentScore !== null) {
    return "completed";
  }

  return "upcoming";
}

function sortGamesNewestFirst(a: GameRow, b: GameRow) {
  const aValue = getGameDate(a);
  const bValue = getGameDate(b);

  const aTime = aValue ? new Date(aValue).getTime() : 0;
  const bTime = bValue ? new Date(bValue).getTime() : 0;

  const safeA = Number.isNaN(aTime) ? 0 : aTime;
  const safeB = Number.isNaN(bTime) ? 0 : bTime;

  return safeB - safeA;
}

function sortGamesOldestFirst(a: GameRow, b: GameRow) {
  return sortGamesNewestFirst(b, a);
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLocation(game?: GameRow | null) {
  if (!game) return "Venue TBA";

  return [game.venue, game.location].filter(Boolean).join(" • ") || "Venue TBA";
}

function getWinner(game?: GameRow | null) {
  const teamScore = getTeamScore(game);
  const opponentScore = getOpponentScore(game);

  if (teamScore === null || opponentScore === null) return "Not decided";
  if (teamScore > opponentScore) return "FACKTS";
  if (opponentScore > teamScore) return getOpponent(game);

  return "Draw";
}

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false });

  if (error) return [];

  return ((data ?? []) as GameRow[]).sort(sortGamesNewestFirst);
}

async function getNextGame() {
  const games = await getGames();

  return (
    games
      .filter((game) => getGameStatus(game) === "upcoming")
      .sort(sortGamesOldestFirst)[0] ?? null
  );
}

async function getLatestCompletedGame() {
  const games = await getGames();

  return (
    games
      .filter((game) => getGameStatus(game) === "completed")
      .sort(sortGamesNewestFirst)[0] ?? null
  );
}

function playerContribution(row: PlayerStatRow) {
  return (
    Number(row.points ?? 0) +
    Number(row.rebounds ?? 0) +
    Number(row.assists ?? 0) +
    Number(row.steals ?? 0) +
    Number(row.blocks ?? 0) +
    Math.max(Number(row.plus_minus ?? 0), 0)
  );
}

async function getHomepagePOG() {
  const latestCompletedGame = await getLatestCompletedGame();

  if (!latestCompletedGame?.id) {
    return null;
  }

  const { data: gameStats, error: statsError } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", latestCompletedGame.id);

  if (statsError || !gameStats || gameStats.length === 0) {
    return null;
  }

  const stats = gameStats as PlayerStatRow[];

  const validStats = stats.filter((row) => playerContribution(row) > 0);

  const manuallySelected = validStats.find(
    (row) => row.is_homepage_pog === true
  );

  const sortedStats = [...validStats].sort((a, b) => {
    const contributionDiff = playerContribution(b) - playerContribution(a);

    if (contributionDiff !== 0) return contributionDiff;

    return Number(b.points ?? 0) - Number(a.points ?? 0);
  });

  const candidates = manuallySelected
    ? [
        manuallySelected,
        ...sortedStats.filter((row) => row.id !== manuallySelected.id),
      ]
    : sortedStats;

  for (const statRow of candidates) {
    if (!statRow?.player_id) continue;

    const { data: playerData } = await supabase
      .from("players")
      .select("*")
      .eq("id", statRow.player_id)
      .maybeSingle();

    if (!playerData) continue;
    if (!isOfficialRosterPlayer(playerData)) continue;

    return {
      ...statRow,
      player: playerData as PlayerRow,
      game: latestCompletedGame,
    };
  }

  return null;
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

  const completedGames = games.filter(
    (game) => getGameStatus(game) === "completed"
  );

  const upcomingGames = games.filter(
    (game) => getGameStatus(game) === "upcoming"
  );

  const latestCompletedGame = completedGames[0] ?? null;

  const featuredPlayer =
    players.find((player) => player.is_featured === true) ??
    players.find((player) => player.role?.toLowerCase() === "starter") ??
    players[0] ??
    null;

  const featuredAverages = featuredPlayer
    ? await getPlayerAverages(featuredPlayer.id)
    : null;

  const wins = completedGames.filter((game) => {
    const teamScore = getTeamScore(game);
    const opponentScore = getOpponentScore(game);

    return teamScore !== null && opponentScore !== null && teamScore > opponentScore;
  }).length;

  const losses = completedGames.filter((game) => {
    const teamScore = getTeamScore(game);
    const opponentScore = getOpponentScore(game);

    return teamScore !== null && opponentScore !== null && teamScore < opponentScore;
  }).length;

  const heroImage =
    getPosterUrl(nextGame) ||
    getPosterUrl(latestCompletedGame) ||
    homepagePOG?.player?.photo_url ||
    featuredPlayer?.photo_url ||
    null;

  const pogBackground =
    getPosterUrl(homepagePOG?.game) ||
    homepagePOG?.player?.photo_url ||
    heroImage ||
    null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        {heroImage ? (
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="FACKTS basketball platform"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/82" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-orange-950/45" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30" />
        )}

        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-slate-900/75 px-4 py-2 text-sm shadow-xl shadow-black/20 backdrop-blur">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-400" />
                <span className="font-semibold text-orange-300">
                  FACKTS Hoops
                </span>
              </div>

              <h1 className="max-w-5xl text-4xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
                Where Kenyan Basketball Gets{" "}
                <span className="text-orange-400">
                  Seen, Recorded, and Remembered.
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                FACKTS Hoops is a basketball agency and digital platform helping
                Kenyan basketball talent become visible, documented, marketable,
                and commercially valued.
              </p>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
                The platform powers player profiles, game records, rankings,
                highlights, 1-on-1 battles, guest hoopers, media features, and
                partnership opportunities in one place.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/players"
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-slate-950 transition duration-300 hover:scale-[1.02] hover:bg-orange-400"
                >
                  Explore Hoops App
                </Link>

                <Link
                  href="/games"
                  className="rounded-2xl border border-slate-600 bg-slate-900/70 px-5 py-3 font-semibold text-slate-200 backdrop-blur transition duration-300 hover:scale-[1.02] hover:bg-slate-800"
                >
                  View Games
                </Link>

                <Link
                  href="/calendar"
                  className="rounded-2xl border border-orange-400/40 bg-orange-500/10 px-5 py-3 font-semibold text-orange-200 backdrop-blur transition duration-300 hover:scale-[1.02] hover:bg-orange-500/20"
                >
                  Calendar
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-4">
                <HeroStat label="Active Players" value={String(players.length)} />
                <HeroStat label="Games Logged" value={String(games.length)} />
                <HeroStat label="Upcoming" value={String(upcomingGames.length)} />
                <HeroStat label="Record" value={`${wins}-${losses}`} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
                    Next Up
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {nextGame ? getGameTitle(nextGame) : "Next Game TBA"}
                  </h2>
                </div>

                <Link
                  href="/games"
                  className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Games
                </Link>
              </div>

              {nextGame ? (
                <>
                  {getPosterUrl(nextGame) ? (
                    <img
                      src={getPosterUrl(nextGame)}
                      alt={getGameTitle(nextGame)}
                      className="h-72 w-full rounded-3xl object-cover"
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 text-5xl font-black text-orange-400">
                      FH
                    </div>
                  )}

                  <div className="mt-5">
                    <p className="text-xl font-black">
                      FACKTS vs {getOpponent(nextGame)}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      {formatDate(getGameDate(nextGame))}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {getLocation(nextGame)}
                    </p>

                    {nextGame.notes ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                        {nextGame.notes}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
                  No upcoming game added yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-3">
          <LandingCard
            title="Player Profiles"
            text="Document every hooper properly with position, height, role, image, stats, and story."
            href="/players"
          />

          <LandingCard
            title="Game Records"
            text="Track fixtures, results, posters, scores, venues, videos, and detailed game pages."
            href="/games"
          />

          <LandingCard
            title="1-on-1 Battles"
            text="Run player-vs-player matchups with leaderboards, posters, results, and video links."
            href="/one-on-one"
          />
        </div>
      </section>

      {homepagePOG ? (
        <section className="mx-auto max-w-7xl px-6 pb-14">
          <div className="relative overflow-hidden rounded-[2rem] border border-orange-500/25 bg-slate-900">
            {pogBackground ? (
              <div className="absolute inset-0">
                <img
                  src={pogBackground}
                  alt="Player of the game"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/86" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-orange-950/45" />
              </div>
            ) : null}

            <div className="relative grid gap-8 p-6 md:grid-cols-[0.8fr,1.2fr] md:p-8">
              <div>
                {homepagePOG.player?.photo_url ? (
                  <img
                    src={homepagePOG.player.photo_url}
                    alt={homepagePOG.player.full_name ?? "Player"}
                    className="h-96 w-full rounded-3xl object-cover"
                    style={{
                      objectPosition:
                        homepagePOG.player.photo_position ?? "center center",
                    }}
                  />
                ) : (
                  <div className="flex h-96 w-full items-center justify-center rounded-3xl bg-slate-950 text-5xl font-black text-orange-400">
                    FH
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-sm uppercase tracking-[0.25em] text-orange-300">
                  Player of the Game
                </p>

                <h2 className="mt-3 text-4xl font-black md:text-6xl">
                  {homepagePOG.player?.full_name ?? "FACKTS Player"}
                </h2>

                <p className="mt-3 text-lg text-slate-300">
                  {homepagePOG.game
                    ? `From ${getGameTitle(homepagePOG.game)}`
                    : "Latest standout performance"}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-5">
                  <FlashStat
                    label="PTS"
                    value={Number(homepagePOG.points ?? 0)}
                  />
                  <FlashStat
                    label="REB"
                    value={Number(homepagePOG.rebounds ?? 0)}
                  />
                  <FlashStat
                    label="AST"
                    value={Number(homepagePOG.assists ?? 0)}
                  />
                  <FlashStat
                    label="STL"
                    value={Number(homepagePOG.steals ?? 0)}
                  />
                  <FlashStat
                    label="BLK"
                    value={Number(homepagePOG.blocks ?? 0)}
                  />
                </div>

                <div className="mt-8">
                  <Link
                    href={
                      homepagePOG.player?.id
                        ? `/players/${homepagePOG.player.id}`
                        : "/players"
                    }
                    className="inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-slate-950 transition hover:bg-orange-400"
                  >
                    Open Player Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {featuredPlayer ? (
        <section className="mx-auto max-w-7xl px-6 pb-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Featured Hooper
              </div>
              <h2 className="mt-1 text-3xl font-bold">Player Spotlight</h2>
              <p className="mt-2 text-slate-400">
                A quick snapshot of a FACKTS player.
              </p>
            </div>

            <Link
              href="/players"
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              View all players
            </Link>
          </div>

          <div className="grid gap-6 rounded-[2rem] border border-slate-800 bg-slate-900 p-5 md:grid-cols-[0.8fr,1.2fr]">
            {featuredPlayer.photo_url ? (
              <img
                src={featuredPlayer.photo_url}
                alt={featuredPlayer.full_name ?? "Featured player"}
                className="h-96 w-full rounded-3xl object-cover"
                style={{
                  objectPosition:
                    featuredPlayer.photo_position ?? "center center",
                }}
              />
            ) : (
              <div className="flex h-96 w-full items-center justify-center rounded-3xl bg-slate-950 text-5xl font-black text-orange-400">
                FH
              </div>
            )}

            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                #{featuredPlayer.jersey_number ?? "-"}{" "}
                {featuredPlayer.role ?? "Player"}
              </div>

              <h3 className="mt-5 text-4xl font-black">
                {featuredPlayer.full_name}
              </h3>

              <p className="mt-2 text-lg text-slate-400">
                {featuredPlayer.nickname
                  ? `"${featuredPlayer.nickname}"`
                  : "FACKTS Hoops Player"}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <MiniInfo
                  label="Position"
                  value={featuredPlayer.position ?? "-"}
                />
                <MiniInfo label="Height" value={featuredPlayer.height ?? "-"} />
                <MiniInfo
                  label="Hand"
                  value={featuredPlayer.dominant_hand ?? "-"}
                />
                <MiniInfo
                  label="Level"
                  value={featuredPlayer.highest_level ?? "-"}
                />
              </div>

              {featuredAverages ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-5">
                  <FeaturedStat label="GP" value={String(featuredAverages.games)} />
                  <FeaturedStat label="PPG" value={featuredAverages.ppg} />
                  <FeaturedStat label="RPG" value={featuredAverages.rpg} />
                  <FeaturedStat label="APG" value={featuredAverages.apg} />
                  <FeaturedStat label="SPG" value={featuredAverages.spg} />
                </div>
              ) : null}

              <div className="mt-6">
                <Link
                  href={`/players/${featuredPlayer.id}`}
                  className="inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-slate-950 transition hover:bg-orange-400"
                >
                  Open Profile
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <FacktsStories />

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-orange-300">
              Squad
            </div>
            <h2 className="mt-1 text-3xl font-bold">FACKTS Players</h2>
            <p className="mt-2 text-slate-400">
              Active players inside the Hoops platform.
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
            {players.slice(0, 6).map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
              >
                <div className="relative">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-slate-950">
                    #{player.jersey_number ?? "-"}
                  </div>

                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.full_name ?? "FACKTS Player"}
                      className="h-72 w-full object-cover"
                      style={{
                        objectPosition: player.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-3xl font-black text-orange-300">
                      FH
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
                        {player.nickname
                          ? `"${player.nickname}"`
                          : "FACKTS Player"}
                      </p>
                    </div>

                    <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                      {player.role ?? "Player"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <MiniInfo label="Position" value={player.position ?? "-"} />
                    <MiniInfo label="Height" value={player.height ?? "-"} />
                    <MiniInfo label="Hand" value={player.dominant_hand ?? "-"} />
                    <MiniInfo label="Level" value={player.highest_level ?? "-"} />
                  </div>

                  <div className="mt-5 inline-flex items-center text-sm font-semibold text-orange-300">
                    Open player profile
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
              Recent FACKTS fixtures, results, posters, and detailed game pages.
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
            {games.slice(0, 4).map((game) => {
              const teamScore = getTeamScore(game);
              const opponentScore = getOpponentScore(game);
              const hasScore = teamScore !== null && opponentScore !== null;
              const gameWon =
                hasScore && teamScore !== null && opponentScore !== null
                  ? teamScore > opponentScore
                  : false;
              const gameStatus = getGameStatus(game);
              const posterUrl = getPosterUrl(game);
              const videoUrl = getVideoUrl(game);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={`Poster for FACKTS vs ${getOpponent(game)}`}
                      className="h-56 w-full object-cover"
                    />
                  ) : null}

                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-400">
                        {formatDate(getGameDate(game))} -{" "}
                        {game.venue ?? "Venue TBA"}
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          gameStatus === "upcoming"
                            ? "bg-orange-500/15 text-orange-300"
                            : gameStatus === "completed" && gameWon
                              ? "bg-emerald-500/15 text-emerald-300"
                              : gameStatus === "completed"
                                ? "bg-rose-500/15 text-rose-300"
                                : gameStatus === "postponed"
                                  ? "bg-yellow-500/15 text-yellow-300"
                                  : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {gameStatus === "upcoming"
                          ? "Upcoming"
                          : gameStatus === "completed" && gameWon
                            ? "Win"
                            : gameStatus === "completed"
                              ? "Result"
                              : gameStatus}
                      </div>
                    </div>

                    <h3 className="mt-3 text-2xl font-bold">
                      FACKTS vs {getOpponent(game)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {getGameTitle(game)}
                    </p>

                    {hasScore ? (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-2xl font-black text-orange-300">
                          {teamScore}
                        </div>

                        <div className="text-slate-500">-</div>

                        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-2xl font-black text-white">
                          {opponentScore}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        Score not posted yet.
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="text-sm font-semibold text-orange-300">
                        Open game details
                      </span>

                      {videoUrl ? (
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
                          Video Added
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <FacktsNetwork />
    </main>
  );
}

function AgencyStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-slate-950">
          {number}
        </div>

        <div>
          <div className="font-bold text-white">{title}</div>
          <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
        </div>
      </div>
    </div>
  );
}

function LandingCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:bg-slate-900/90"
    >
      <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
        FACKTS
      </div>

      <h3 className="mt-3 text-2xl font-black group-hover:text-orange-300">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>

      <div className="mt-5 text-sm font-bold text-orange-300">Open</div>
    </Link>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-orange-300">
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function FeaturedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-orange-300">
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function FlashStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-orange-500/25 bg-slate-950/90 p-5 text-center shadow-xl shadow-orange-950/20">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-4xl font-black text-orange-300">
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}
