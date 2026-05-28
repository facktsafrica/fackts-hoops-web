import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import GameCard, { GameCardGame } from "../components/GameCard";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function getGameDateValue(game: GameCardGame): string | null {
  return game.game_date || game.date || null;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;

  const cleanValue = value.slice(0, 10);
  const [year, month, day] = cleanValue.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getTodayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getNumberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) return value;

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return null;
}

function getFacktsScore(game: GameCardGame): number | null {
  return getNumberValue(
    game.fackts_score,
    game.home_score,
    game.team_score,
    game.our_score,
    game.fackts_points,
    game.score_for,
    game.points_for,
    game.us_score
  );
}

function getOpponentScore(game: GameCardGame): number | null {
  return getNumberValue(
    game.opponent_score,
    game.away_score,
    game.rival_score,
    game.their_score,
    game.opponent_points,
    game.score_against,
    game.points_against,
    game.them_score
  );
}

function hasPostedScore(game: GameCardGame): boolean {
  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);

  return facktsScore !== null && opponentScore !== null;
}

function isPastGameDate(game: GameCardGame): boolean {
  const gameDate = parseDateOnly(getGameDateValue(game));

  if (!gameDate) return false;

  return gameDate < getTodayDateOnly();
}

function isUpcomingGame(game: GameCardGame): boolean {
  const status = (game.status || "").toLowerCase().trim();

  if (status === "postponed" || status === "cancelled") return false;
  if (status === "played" || status === "completed" || status === "final") return false;
  if (hasPostedScore(game)) return false;
  if (isPastGameDate(game)) return false;

  return status === "upcoming" || status === "scheduled" || status === "";
}

function getDisplayGameStatus(game: GameCardGame): string {
  const status = (game.status || "").toLowerCase().trim();

  if (status === "postponed") return "Postponed";
  if (status === "cancelled") return "Cancelled";

  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);

  if (facktsScore !== null && opponentScore !== null) {
    if (facktsScore > opponentScore) return "Win";
    if (facktsScore < opponentScore) return "Loss";
    return "Draw";
  }

  if (status === "played" || status === "completed" || status === "final") {
    return "Played";
  }

  if (isPastGameDate(game)) return "Awaiting Result";

  return "Upcoming";
}

function sortUpcomingGames(games: GameCardGame[]): GameCardGame[] {
  return [...games].sort((a, b) => {
    const dateA = parseDateOnly(getGameDateValue(a))?.getTime() ?? 0;
    const dateB = parseDateOnly(getGameDateValue(b))?.getTime() ?? 0;

    return dateA - dateB;
  });
}

async function getGames() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false });

  if (error) {
    console.error("Failed to load games:", error.message);
    return [];
  }

  return (data || []) as GameCardGame[];
}

function isPlayedGame(game: GameCardGame) {
  const status = getDisplayGameStatus(game);
  return (
    status === "Win" ||
    status === "Loss" ||
    status === "Draw" ||
    status === "Played"
  );
}

function isAwaitingResultGame(game: GameCardGame) {
  return getDisplayGameStatus(game) === "Awaiting Result";
}

export default async function GamesPage() {
  const games = await getGames();

  const upcomingGames = sortUpcomingGames(games.filter(isUpcomingGame));
  const awaitingResultGames = games.filter(isAwaitingResultGame);
  const playedGames = games.filter(isPlayedGame);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.2),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Games
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Upcoming fixtures, completed games, and results from the FACKTS
                basketball movement.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60">
                Home
              </Link>

              <Link href="/players" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60">
                Players
              </Link>

              <Link href="/one-on-one" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60">
                1-on-1
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Total Games
              </p>
              <p className="mt-2 text-3xl font-black">{games.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Upcoming
              </p>
              <p className="mt-2 text-3xl font-black">{upcomingGames.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Awaiting Result
              </p>
              <p className="mt-2 text-3xl font-black">{awaitingResultGames.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Played
              </p>
              <p className="mt-2 text-3xl font-black">{playedGames.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            Fixtures
          </p>
          <h2 className="text-2xl font-black">Upcoming Games</h2>
        </div>

        {upcomingGames.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-zinc-400">
            No upcoming games. Add a future game in admin and it will appear here.
          </div>
        )}
      </section>

      {awaitingResultGames.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
              Action Needed
            </p>
            <h2 className="text-2xl font-black">Awaiting Results</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These games have passed but no final score has been posted.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {awaitingResultGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            Results
          </p>
          <h2 className="text-2xl font-black">Played Games</h2>
        </div>

        {playedGames.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-zinc-400">
            No played games yet.
          </div>
        )}
      </section>
    </main>
  );
}