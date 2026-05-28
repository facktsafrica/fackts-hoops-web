import Link from "next/link";

export type GameCardGame = {
  id: string;
  title?: string | null;
  opponent?: string | null;
  game_date?: string | null;
  date?: string | null;
  location?: string | null;
  venue?: string | null;
  game_type?: string | null;
  poster_url?: string | null;
  image_url?: string | null;
  status?: string | null;

  fackts_score?: number | string | null;
  opponent_score?: number | string | null;
  home_score?: number | string | null;
  away_score?: number | string | null;
  team_score?: number | string | null;
  rival_score?: number | string | null;
  our_score?: number | string | null;
  their_score?: number | string | null;
  fackts_points?: number | string | null;
  opponent_points?: number | string | null;
  score_for?: number | string | null;
  score_against?: number | string | null;
  points_for?: number | string | null;
  points_against?: number | string | null;
  us_score?: number | string | null;
  them_score?: number | string | null;
};

type GameCardProps = {
  game: GameCardGame;
};

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
  return getFacktsScore(game) !== null && getOpponentScore(game) !== null;
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

function isPastGameDate(game: GameCardGame): boolean {
  const gameDate = parseDateOnly(getGameDateValue(game));

  if (!gameDate) return false;

  return gameDate < getTodayDateOnly();
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

function getGameDate(game: GameCardGame) {
  return game.game_date || game.date || "Date not added";
}

function getGameTitle(game: GameCardGame) {
  if (game.title) return game.title;
  if (game.opponent) return `FACKTS vs ${game.opponent}`;
  return "FACKTS Game";
}

function getGameLocation(game: GameCardGame) {
  return game.location || game.venue || "Location not added";
}

function getPoster(game: GameCardGame) {
  return game.poster_url || game.image_url || null;
}

function getScore(game: GameCardGame) {
  const facktsScore = getFacktsScore(game);
  const opponentScore = getOpponentScore(game);

  if (facktsScore !== null && opponentScore !== null) {
    return `${facktsScore} - ${opponentScore}`;
  }

  return null;
}

function getStatusClass(status: string) {
  const cleanStatus = status.toLowerCase();

  if (cleanStatus === "win") return "bg-emerald-500/15 text-emerald-300";
  if (cleanStatus === "loss") return "bg-red-500/15 text-red-300";
  if (cleanStatus === "awaiting result") return "bg-yellow-500/15 text-yellow-300";
  if (cleanStatus === "played") return "bg-purple-500/15 text-purple-300";
  if (cleanStatus === "postponed") return "bg-blue-500/15 text-blue-300";
  if (cleanStatus === "cancelled") return "bg-zinc-500/15 text-zinc-300";

  return "bg-orange-500/15 text-orange-300";
}

export default function GameCard({ game }: GameCardProps) {
  const status = getDisplayGameStatus(game);
  const poster = getPoster(game);
  const score = getScore(game);

  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-orange-400/50 hover:shadow-orange-500/10"
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900 sm:h-28 sm:w-24">
          {poster ? (
            <img
              src={poster}
              alt={getGameTitle(game)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-black text-zinc-600">
              FACKTS
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClass(status)}`}>
              {status}
            </span>

            <span className="truncate text-[11px] font-semibold text-zinc-400">
              {getGameDate(game)}
            </span>
          </div>

          <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base">
            {getGameTitle(game)}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
            {getGameLocation(game)}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
              {game.game_type || "Game"}
            </span>

            {score ? (
              <span className="text-sm font-black text-white">{score}</span>
            ) : (
              <span className="text-[11px] font-bold text-zinc-500">
                Score not posted
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}