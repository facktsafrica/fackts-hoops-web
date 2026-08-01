export const revalidate = 60;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AnimatedNumber from "@/app/components/AnimatedNumber";

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
  is_guest_identity?: boolean;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | string | null;
  role?: string | null;
  position?: string | null;
  height?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
};

type PlayerGameStatRow = {
  id: string;
  game_id?: string | null;
  player_id?: string | null;
  points?: number | string | null;
  rebounds?: number | string | null;
  assists?: number | string | null;
  steals?: number | string | null;
  blocks?: number | string | null;
  plus_minus?: number | string | null;
  minutes?: number | string | null;
  turnovers?: number | string | null;
  fouls?: number | string | null;
  is_homepage_pog?: boolean | null;
  created_at?: string | null;
};

type FullStatRow = PlayerGameStatRow & {
  player?: PlayerRow | null;
};

type TeamTotals = {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  plusMinus: number;
  turnovers: number;
  fouls: number;
};

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) return value;

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return null;
}

function statNumber(value: unknown) {
  return numberValue(value) ?? 0;
}

function getTitle(game: GameRow) {
  return game.game_title || game.title || "FACKTS Game";
}

function getOpponent(game: GameRow) {
  return game.opponent || game.opponent_name || game.team_name || "Opponent";
}

function getGameDate(game: GameRow) {
  return game.game_date || game.date || game.created_at || null;
}

function getPosterUrl(game: GameRow) {
  return game.poster_url || game.game_poster_url || game.image_url || "";
}

function getVideoUrl(game: GameRow) {
  return game.video_url || game.game_video_url || "";
}

function getFacktsScore(game: GameRow) {
  return numberValue(game.team_score, game.fackts_score, game.home_score);
}

function getOpponentScore(game: GameRow) {
  return numberValue(game.opponent_score, game.away_score);
}

function hasScores(game: GameRow) {
  return getFacktsScore(game) !== null && getOpponentScore(game) !== null;
}

function getGameStatus(game: GameRow) {
  const status = (game.status || "").toLowerCase().trim();

  if (status === "postponed") return "Postponed";
  if (status === "cancelled") return "Cancelled";

  if (hasScores(game)) return "Completed";

  if (status === "completed" || status === "played" || status === "final") {
    return "Completed";
  }

  if (game.is_upcoming === false) return "Completed";

  return "Upcoming";
}

function getWinner(game: GameRow) {
  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);

  if (facktsScore === null || opponentScore === null) return "Not decided";
  if (facktsScore > opponentScore) return "FACKTS";
  if (opponentScore > facktsScore) return getOpponent(game);

  return "Draw";
}

function formatDate(value?: string | null) {
  if (!value) return "Date not added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not added";

  return date.toLocaleString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLocation(game: GameRow) {
  return (
    [game.venue, game.location].filter(Boolean).join(" • ") ||
    "Venue not added"
  );
}

function getStatusClass(game: GameRow) {
  const status = getGameStatus(game);

  if (status === "Completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "Postponed") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200";
  }

  if (status === "Cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-orange-500/30 bg-orange-500/10 text-orange-200";
}

function getPlayerName(player?: PlayerRow | null) {
  if (!player) return "Unknown Player";

  return player.full_name || player.name || player.nickname || "Unknown Player";
}

function getPlayerInitials(player?: PlayerRow | null) {
  const name = getPlayerName(player);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function contribution(row: FullStatRow) {
  return (
    statNumber(row.points) +
    statNumber(row.rebounds) +
    statNumber(row.assists) +
    statNumber(row.steals) +
    statNumber(row.blocks) +
    Math.max(statNumber(row.plus_minus), 0)
  );
}

function buildTotals(stats: FullStatRow[]): TeamTotals {
  return stats.reduce(
    (acc, row) => {
      acc.points += statNumber(row.points);
      acc.rebounds += statNumber(row.rebounds);
      acc.assists += statNumber(row.assists);
      acc.steals += statNumber(row.steals);
      acc.blocks += statNumber(row.blocks);
      acc.plusMinus += statNumber(row.plus_minus);
      acc.turnovers += statNumber(row.turnovers);
      acc.fouls += statNumber(row.fouls);

      return acc;
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      plusMinus: 0,
      turnovers: 0,
      fouls: 0,
    }
  );
}

function getPlayerOfGame(stats: FullStatRow[]) {
  const manual = stats.find(
    (row) => row.is_homepage_pog === true && contribution(row) > 0
  );

  if (manual) return manual;

  return (
    [...stats].sort((a, b) => {
      const contributionDiff = contribution(b) - contribution(a);

      if (contributionDiff !== 0) return contributionDiff;

      return statNumber(b.points) - statNumber(a.points);
    })[0] || null
  );
}

function getYoutubeEmbedUrl(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      if (parsed.pathname.includes("/shorts/")) {
        const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];

        if (id) {
          return `https://www.youtube.com/embed/${id}`;
        }
      }
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");

      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function getGameData(gameId: string) {
  const supabase = getSupabase();

  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError || !gameData) {
    return {
      game: null,
      stats: [],
    };
  }

  const game = gameData as GameRow;

  const { data: statsData } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", gameId);

  const rawStats = (statsData || []) as PlayerGameStatRow[];

  const playerIds = rawStats
    .map((row) => row.player_id)
    .filter(Boolean) as string[];

  let players: PlayerRow[] = [];

  if (playerIds.length > 0) {
    const [playersResult, linkedGuestsResult] = await Promise.all([
      supabase.from("players").select("*").in("id", playerIds),
      supabase
        .from("guest_hoopers")
        .select("*")
        .in("source_player_id", playerIds),
    ]);

    players = (playersResult.data || []) as PlayerRow[];

    const loadedPlayerIds = new Set(players.map((player) => player.id));
    (linkedGuestsResult.data || []).forEach((guest: any) => {
      if (!guest.source_player_id || loadedPlayerIds.has(guest.source_player_id)) {
        return;
      }

      players.push({
        id: guest.source_player_id,
        is_guest_identity: true,
        full_name: guest.full_name,
        name: guest.full_name,
        nickname: guest.nickname,
        role:
          guest.guest_type === "external_player"
            ? "External Player"
            : "Guest Hooper",
        position: guest.position,
        photo_url: guest.photo_url,
        photo_position: guest.photo_position,
      });
    });
  }

  const playerMap = new Map<string, PlayerRow>();
  players.forEach((player) => playerMap.set(player.id, player));

  const stats: FullStatRow[] = rawStats
    .map((row) => ({
      ...row,
      player: row.player_id ? playerMap.get(row.player_id) || null : null,
    }))
    .sort((a, b) => {
      const pointsDiff = statNumber(b.points) - statNumber(a.points);

      if (pointsDiff !== 0) return pointsDiff;

      return contribution(b) - contribution(a);
    });

  return {
    game,
    stats,
  };
}

export default async function GameDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { game, stats } = await getGameData(id);

  if (!game) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Game not found
          </p>

          <h1 className="mt-3 text-3xl font-black">This game does not exist.</h1>

          <Link
            href="/games"
            className="mt-6 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black"
          >
            Back to Games
          </Link>
        </div>
      </main>
    );
  }

  const posterUrl = getPosterUrl(game);
  const videoUrl = getVideoUrl(game);
  const embedUrl = getYoutubeEmbedUrl(videoUrl);
  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);
  const totals = buildTotals(stats);
  const playerOfGame = getPlayerOfGame(stats);

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.94)), url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/games"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
            >
              â† Back to Games
            </Link>

            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
            >
              Home
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="overflow-hidden rounded-[2rem] border border-orange-500/30 bg-zinc-950/90 shadow-2xl shadow-orange-950/20">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={getTitle(game)}
                  className="h-full min-h-[360px] w-full object-cover"
                />
              ) : (
                <div className="flex min-h-[360px] items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505]">
                  <div className="text-center">
                    <p className="text-7xl font-black text-orange-500">FH</p>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                      FACKTS Africa
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-7">
              <div className="mb-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
                    game
                  )}`}
                >
                  {getGameStatus(game)}
                </span>

                {videoUrl ? (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
                    Full Video Added
                  </span>
                ) : null}

                {playerOfGame ? (
                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-200">
                    Player of Game
                  </span>
                ) : null}
              </div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Game
              </p>

              <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
                {getTitle(game)}
              </h1>

              <p className="mt-3 text-xl font-black text-orange-300">
                FACKTS vs {getOpponent(game)}
              </p>

              <div className="mt-6 rounded-[2rem] border border-white/10 bg-black/70 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Final Score
                </p>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-zinc-500">
                      FACKTS
                    </p>

                    <p className="text-5xl font-black text-white sm:text-6xl">
                      <AnimatedNumber value={facktsScore ?? "-"} />
                    </p>
                  </div>

                  <p className="text-3xl font-black text-zinc-600">-</p>

                  <div className="text-right">
                    <p className="text-sm font-black uppercase text-zinc-500">
                      {getOpponent(game)}
                    </p>

                    <p className="text-5xl font-black text-white sm:text-6xl">
                      <AnimatedNumber value={opponentScore ?? "-"} />
                    </p>
                  </div>
                </div>

                {getGameStatus(game) === "Completed" ? (
                  <p className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-200">
                    Winner: {getWinner(game)}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniInfo label="Date" value={formatDate(getGameDate(game))} />
                <MiniInfo label="Venue" value={getLocation(game)} />
                <MiniInfo label="Status" value={getGameStatus(game)} />
              </div>

              {game.notes ? (
                <p className="mt-5 rounded-3xl border border-white/10 bg-black/50 p-4 text-sm leading-7 text-zinc-400">
                  {game.notes}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {playerOfGame ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Top Performance" title="Player of the Game" />

          <div className="grid gap-5 overflow-hidden rounded-[2rem] border border-orange-500/30 bg-zinc-950/90 p-5 shadow-2xl shadow-orange-950/20 backdrop-blur-sm md:grid-cols-[340px_1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              {playerOfGame.player?.photo_url ? (
                <img
                  src={playerOfGame.player.photo_url}
                  alt={getPlayerName(playerOfGame.player)}
                  className="h-96 w-full object-cover"
                  style={{
                    objectPosition:
                      playerOfGame.player.photo_position || "center center",
                  }}
                />
              ) : (
                <div className="flex h-96 items-center justify-center bg-black">
                  <div className="text-center">
                    <p className="text-6xl font-black text-orange-500">
                      {getPlayerInitials(playerOfGame.player) || "FH"}
                    </p>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
                      FACKTS Hooper
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Best Impact
              </p>

              <h2 className="mt-3 text-4xl font-black sm:text-6xl">
                {getPlayerName(playerOfGame.player)}
              </h2>

              <p className="mt-2 text-sm font-bold text-zinc-400">
                #{playerOfGame.player?.jersey_number ?? "-"} •{" "}
                {playerOfGame.player?.position || "FACKTS Player"}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <BigStat label="PTS" value={statNumber(playerOfGame.points)} />
                <BigStat label="REB" value={statNumber(playerOfGame.rebounds)} />
                <BigStat label="AST" value={statNumber(playerOfGame.assists)} />
                <BigStat label="STL" value={statNumber(playerOfGame.steals)} />
                <BigStat label="BLK" value={statNumber(playerOfGame.blocks)} />
              </div>

              {playerOfGame.player?.id && !playerOfGame.player.is_guest_identity ? (
                <div className="mt-6">
                  <Link
                    href={`/players/${playerOfGame.player.id}`}
                    className="inline-flex rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                  >
                    Open Player Profile
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Team Totals" title="FACKTS Box Score" />

        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <TotalCard label="PTS" value={totals.points} />
          <TotalCard label="REB" value={totals.rebounds} />
          <TotalCard label="AST" value={totals.assists} />
          <TotalCard label="STL" value={totals.steals} />
          <TotalCard label="BLK" value={totals.blocks} />
          <TotalCard label="+/-" value={totals.plusMinus} />
          <TotalCard label="TO" value={totals.turnovers} />
          <TotalCard label="FOUL" value={totals.fouls} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Roster Stats" title="Player Scores & Stats" />

        {stats.length > 0 ? (
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/90 backdrop-blur-sm">
            <div className="hidden grid-cols-[2fr_repeat(8,0.7fr)] border-b border-white/10 bg-black/60 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500 md:grid">
              <div>Player</div>
              <div className="text-center">PTS</div>
              <div className="text-center">REB</div>
              <div className="text-center">AST</div>
              <div className="text-center">STL</div>
              <div className="text-center">BLK</div>
              <div className="text-center">+/-</div>
              <div className="text-center">TO</div>
              <div className="text-center">FLS</div>
            </div>

            <div className="divide-y divide-white/10">
              {stats.map((row, index) => (
                <PlayerStatRowCard key={row.id || index} row={row} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyBox text="No player stats have been added for this game yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Media" title="Full Game Video" />

        {videoUrl ? (
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/90 p-4 backdrop-blur-sm">
            {embedUrl ? (
              <div className="aspect-video overflow-hidden rounded-3xl bg-black">
                <iframe
                  src={embedUrl}
                  title={`${getTitle(game)} full game video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/60 p-5">
                <p className="text-sm text-zinc-400">
                  This video source cannot be embedded directly. Open it using
                  the button below.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
              >
                Open Full Video
              </a>

              {game.highlight_url ? (
                <a
                  href={game.highlight_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-blue-500/40 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-blue-200 transition hover:bg-blue-500/20"
                >
                  Open Highlights
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyBox text="No full game video has been added yet." />
        )}
      </section>
    </main>
  );
}

function PlayerStatRowCard({ row }: { row: FullStatRow }) {
  const player = row.player;

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[2fr_repeat(8,0.7fr)] md:items-center">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-black">
          {player?.photo_url ? (
            <img
              src={player.photo_url}
              alt={getPlayerName(player)}
              className="h-full w-full object-cover"
              style={{
                objectPosition: player.photo_position || "center center",
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-300">
              {getPlayerInitials(player) || "FH"}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">
            {getPlayerName(player)}
          </p>

          <p className="text-xs text-zinc-500">
            #{player?.jersey_number ?? "-"} • {player?.position || "Player"}
          </p>
        </div>
      </div>

      <MobileStatGrid row={row} />

      <DesktopStat value={statNumber(row.points)} />
      <DesktopStat value={statNumber(row.rebounds)} />
      <DesktopStat value={statNumber(row.assists)} />
      <DesktopStat value={statNumber(row.steals)} />
      <DesktopStat value={statNumber(row.blocks)} />
      <DesktopStat value={statNumber(row.plus_minus)} />
      <DesktopStat value={statNumber(row.turnovers)} />
      <DesktopStat value={statNumber(row.fouls)} />
    </div>
  );
}

function MobileStatGrid({ row }: { row: FullStatRow }) {
  return (
    <div className="grid grid-cols-4 gap-2 md:hidden">
      <SmallStat label="PTS" value={statNumber(row.points)} />
      <SmallStat label="REB" value={statNumber(row.rebounds)} />
      <SmallStat label="AST" value={statNumber(row.assists)} />
      <SmallStat label="STL" value={statNumber(row.steals)} />
      <SmallStat label="BLK" value={statNumber(row.blocks)} />
      <SmallStat label="+/-" value={statNumber(row.plus_minus)} />
      <SmallStat label="TO" value={statNumber(row.turnovers)} />
      <SmallStat label="FLS" value={statNumber(row.fouls)} />
    </div>
  );
}

function DesktopStat({ value }: { value: number }) {
  return (
    <div className="hidden text-center text-sm font-black text-white md:block">
      {value}
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="text-3xl font-black">{title}</h2>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-4xl font-black text-orange-300">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-4 text-center backdrop-blur-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 px-2 py-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 text-sm text-zinc-400 backdrop-blur-sm">
      {text}
    </div>
  );
}
