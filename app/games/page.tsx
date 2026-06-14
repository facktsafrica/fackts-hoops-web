export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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

type PlayerGameStatRow = {
  id?: string;
  game_id?: string | null;
  points?: number | string | null;
  rebounds?: number | string | null;
  assists?: number | string | null;
  steals?: number | string | null;
  blocks?: number | string | null;
};

type GameStatTotals = {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
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
  const parsed = numberValue(value);
  return parsed ?? 0;
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

function getRecord(games: GameRow[]) {
  const completed = games.filter((game) => getGameStatus(game) === "Completed");

  const wins = completed.filter((game) => {
    const facktsScore = getFacktsScore(game);
    const opponentScore = getOpponentScore(game);

    return (
      facktsScore !== null &&
      opponentScore !== null &&
      facktsScore > opponentScore
    );
  }).length;

  const losses = completed.filter((game) => {
    const facktsScore = getFacktsScore(game);
    const opponentScore = getOpponentScore(game);

    return (
      facktsScore !== null &&
      opponentScore !== null &&
      facktsScore < opponentScore
    );
  }).length;

  const draws = completed.filter((game) => {
    const facktsScore = getFacktsScore(game);
    const opponentScore = getOpponentScore(game);

    return (
      facktsScore !== null &&
      opponentScore !== null &&
      facktsScore === opponentScore
    );
  }).length;

  return { wins, losses, draws };
}

function parseDate(game: GameRow) {
  const value = getGameDate(game);
  if (!value) return 0;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value?: string | null) {
  if (!value) return "Date not added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not added";

  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
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

function emptyTotals(): GameStatTotals {
  return {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
  };
}

function buildStatTotals(stats: PlayerGameStatRow[]) {
  const totalsByGame = new Map<string, GameStatTotals>();

  stats.forEach((row) => {
    if (!row.game_id) return;

    const current = totalsByGame.get(row.game_id) || emptyTotals();

    current.points += statNumber(row.points);
    current.rebounds += statNumber(row.rebounds);
    current.assists += statNumber(row.assists);
    current.steals += statNumber(row.steals);
    current.blocks += statNumber(row.blocks);

    totalsByGame.set(row.game_id, current);
  });

  return totalsByGame;
}

function getFallbackTotals(game: GameRow): GameStatTotals {
  return {
    points: getFacktsScore(game) ?? 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
  };
}

async function getGamesData() {
  const supabase = getSupabase();

  const [gamesResult, statsResult] = await Promise.all([
    supabase.from("games").select("*").order("game_date", { ascending: false }),
    supabase.from("player_game_stats").select("*"),
  ]);

  const games = ((gamesResult.data || []) as GameRow[]).sort((a, b) => {
    const statusA = getGameStatus(a);
    const statusB = getGameStatus(b);

    if (statusA === "Upcoming" && statusB !== "Upcoming") return -1;
    if (statusA !== "Upcoming" && statusB === "Upcoming") return 1;

    if (statusA === "Upcoming" && statusB === "Upcoming") {
      return parseDate(a) - parseDate(b);
    }

    return parseDate(b) - parseDate(a);
  });

  const stats = (statsResult.data || []) as PlayerGameStatRow[];

  return {
    games,
    totalsByGame: buildStatTotals(stats),
  };
}

export default async function GamesPage() {
  const { games, totalsByGame } = await getGamesData();

  const upcomingGames = games.filter(
    (game) => getGameStatus(game) === "Upcoming"
  );

  const playedGames = games.filter(
    (game) => getGameStatus(game) === "Completed"
  );

  const postponedGames = games.filter(
    (game) => getGameStatus(game) === "Postponed"
  );

  const cancelledGames = games.filter(
    (game) => getGameStatus(game) === "Cancelled"
  );

  const { wins, losses, draws } = getRecord(games);
  const nextGame = upcomingGames[0] || null;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,_#020617,_#050505_45%,_#020202)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Games
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Fixtures, results, posters, scores, team totals, video links,
                and full game pages.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Home
              </Link>

              <Link
                href="/calendar"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Calendar
              </Link>

              <Link
                href="/one-on-one"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                1v1
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-5">
            <StatCard label="Total Games" value={games.length} />
            <StatCard label="Upcoming" value={upcomingGames.length} />
            <StatCard label="Played" value={playedGames.length} />
            <StatCard label="Postponed" value={postponedGames.length} />
            <StatCard
              label="Record"
              value={draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`}
            />
          </div>
        </div>
      </section>

      {nextGame ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Next Up" title="Upcoming Game" />

          <FeaturedGameCard
            game={nextGame}
            totals={totalsByGame.get(nextGame.id) || getFallbackTotals(nextGame)}
          />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Fixtures" title="Upcoming Games" />

        {upcomingGames.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                totals={totalsByGame.get(game.id) || getFallbackTotals(game)}
              />
            ))}
          </div>
        ) : (
          <EmptyBox text="No upcoming games added yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Results" title="Played Games" />

        {playedGames.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playedGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                totals={totalsByGame.get(game.id) || getFallbackTotals(game)}
              />
            ))}
          </div>
        ) : (
          <EmptyBox text="No played games yet." />
        )}
      </section>

      {(postponedGames.length > 0 || cancelledGames.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Changes" title="Postponed / Cancelled" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...postponedGames, ...cancelledGames].map((game) => (
              <GameCard
                key={game.id}
                game={game}
                totals={totalsByGame.get(game.id) || getFallbackTotals(game)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function FeaturedGameCard({
  game,
  totals,
}: {
  game: GameRow;
  totals: GameStatTotals;
}) {
  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-3xl border border-orange-500/30 bg-zinc-950 shadow-2xl shadow-orange-950/20 transition hover:-translate-y-1 hover:border-orange-400/70 lg:grid lg:grid-cols-[1fr_1.1fr]"
    >
      {getPosterUrl(game) ? (
        <div className="h-80 overflow-hidden bg-zinc-900 lg:h-full">
          <img
            src={getPosterUrl(game)}
            alt={getTitle(game)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505] lg:h-full">
          <div className="text-center">
            <p className="text-7xl font-black text-orange-500">F</p>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              FACKTS Africa
            </p>
          </div>
        </div>
      )}

      <div className="p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusBadge game={game} />

          {getVideoUrl(game) ? (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
              Game Video
            </span>
          ) : null}

          {getPosterUrl(game) ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase text-emerald-200">
              Poster
            </span>
          ) : null}
        </div>

        <h2 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">
          {getTitle(game)}
        </h2>

        <p className="mt-3 text-xl font-black text-orange-300">
          FACKTS vs {getOpponent(game)}
        </p>

        <div className="mt-5 rounded-3xl border border-white/10 bg-black/60 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Score
          </p>

          <p className="mt-2 text-5xl font-black">
            {getFacktsScore(game) ?? "-"} - {getOpponentScore(game) ?? "-"}
          </p>

          {getGameStatus(game) === "Completed" ? (
            <p className="mt-2 text-sm font-black text-orange-300">
              Winner: {getWinner(game)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniInfo label="Date" value={formatDate(getGameDate(game))} />
          <MiniInfo label="Venue" value={getLocation(game)} />
          <MiniInfo label="Status" value={getGameStatus(game)} />
        </div>

        <TeamTotals totals={totals} />

        {game.notes ? (
          <p className="mt-5 line-clamp-3 text-sm leading-7 text-zinc-400">
            {game.notes}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition group-hover:bg-orange-400">
            Open Full Game Page
          </span>

          {getVideoUrl(game) ? (
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-blue-200">
              Video Available
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function GameCard({
  game,
  totals,
}: {
  game: GameRow;
  totals: GameStatTotals;
}) {
  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);
  const posterUrl = getPosterUrl(game);
  const videoUrl = getVideoUrl(game);
  const status = getGameStatus(game);

  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 transition hover:-translate-y-1 hover:border-orange-400/50"
    >
      {posterUrl ? (
        <div className="h-56 overflow-hidden bg-zinc-900">
          <img
            src={posterUrl}
            alt={getTitle(game)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.18),_transparent_60%),#050505]">
          <div className="text-center">
            <p className="text-5xl font-black text-orange-500">FH</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
              No Poster
            </p>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusBadge game={game} />

          {videoUrl ? (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
              Video
            </span>
          ) : null}

          {posterUrl ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase text-emerald-200">
              Poster
            </span>
          ) : null}
        </div>

        <h3 className="text-xl font-black text-white group-hover:text-orange-200">
          {getTitle(game)}
        </h3>

        <p className="mt-1 text-sm font-bold text-zinc-400">
          FACKTS vs {getOpponent(game)}
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          {formatDate(getGameDate(game))}
        </p>

        <p className="mt-1 text-xs text-zinc-500">{getLocation(game)}</p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Score
          </p>

          <p className="mt-1 text-3xl font-black">
            {facktsScore ?? "-"} - {opponentScore ?? "-"}
          </p>

          {status === "Completed" ? (
            <p className="mt-1 text-xs font-bold text-orange-300">
              Winner: {getWinner(game)}
            </p>
          ) : null}
        </div>

        <TeamTotals totals={totals} compact />

        {game.notes ? (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-500">
            {game.notes}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition group-hover:bg-orange-400">
            Open Full Game
          </span>

          {videoUrl ? (
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-blue-200">
              Watch
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function TeamTotals({
  totals,
  compact = false,
}: {
  totals: GameStatTotals;
  compact?: boolean;
}) {
  const hasRealStats =
    totals.points > 0 ||
    totals.rebounds > 0 ||
    totals.assists > 0 ||
    totals.steals > 0 ||
    totals.blocks > 0;

  if (!hasRealStats) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "mt-4 grid grid-cols-5 gap-2"
          : "mt-5 grid grid-cols-5 gap-2"
      }
    >
      <StatPill label="PTS" value={totals.points} />
      <StatPill label="REB" value={totals.rebounds} />
      <StatPill label="AST" value={totals.assists} />
      <StatPill label="STL" value={totals.steals} />
      <StatPill label="BLK" value={totals.blocks} />
    </div>
  );
}

function StatusBadge({ game }: { game: GameRow }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
        game
      )}`}
    >
      {getGameStatus(game)}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 px-2 py-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
      {text}
    </div>
  );
}