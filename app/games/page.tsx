import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false });

  if (error) return [];

  return data ?? [];
}

function getGameLabel(game: any) {
  if (game.is_upcoming) return "UPCOMING";

  const hasScores =
    game.team_score !== null &&
    game.team_score !== undefined &&
    game.opponent_score !== null &&
    game.opponent_score !== undefined;

  if (!hasScores) return "FINAL";

  const facktsScore = Number(game.team_score);
  const opponentScore = Number(game.opponent_score);

  if (facktsScore > opponentScore) return "WIN";
  if (opponentScore > facktsScore) return "LOSS";

  return "CHECK SCORE";
}

function getGameLabelClass(label: string) {
  if (label === "UPCOMING") return "bg-orange-500 text-slate-950";
  if (label === "WIN") return "bg-emerald-500 text-slate-950";
  if (label === "LOSS") return "bg-rose-500 text-white";
  if (label === "CHECK SCORE") return "bg-yellow-400 text-slate-950";
  return "bg-slate-700 text-slate-100";
}

function formatGameDate(value: string | null | undefined) {
  if (!value) return "Date TBA";

  try {
    const date = new Date(value);
    return date.toLocaleDateString("en-KE", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default async function GamesPage() {
  const games = await getGames();

  const upcomingGames = games.filter((game: any) => game.is_upcoming);
  const completedGames = games.filter((game: any) => !game.is_upcoming);

  const wins = completedGames.filter((game: any) => {
    if (game.team_score === null || game.opponent_score === null) return false;
    return Number(game.team_score) > Number(game.opponent_score);
  }).length;

  const losses = completedGames.filter((game: any) => {
    if (game.team_score === null || game.opponent_score === null) return false;
    return Number(game.opponent_score) > Number(game.team_score);
  }).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
          <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                Games & Results
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Follow upcoming matchups, past results, final scores, venues,
                and full game details.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <HeroMiniStat label="Games" value={String(games.length)} />
              <HeroMiniStat
                label="Upcoming"
                value={String(upcomingGames.length)}
              />
              <HeroMiniStat label="Wins" value={String(wins)} />
              <HeroMiniStat label="Losses" value={String(losses)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <SectionHeader
          kicker="Schedule"
          title="Upcoming Games"
          subtitle="Follow every scheduled game before tip-off."
          badge={`${upcomingGames.length} upcoming`}
          badgeStyle="border-orange-400/30 bg-orange-500/10 text-orange-300"
        />

        {upcomingGames.length === 0 ? (
          <EmptyState text="No upcoming games have been added yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-4">
            {upcomingGames.map((game: any) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
          <SectionHeader
            kicker="Results"
            title="Past Results"
            subtitle="Review completed games and final score history."
            badge={`${completedGames.length} completed`}
            badgeStyle="border-slate-700 bg-slate-900 text-slate-300"
          />

          {completedGames.length === 0 ? (
            <EmptyState text="No completed games have been added yet." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-4">
              {completedGames.map((game: any) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function GameCard({ game }: { game: any }) {
  const label = getGameLabel(game);

  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition duration-300 hover:border-orange-400/40 hover:shadow-orange-950/20 md:hover:-translate-y-1"
    >
      {game.poster_url ? (
        <div className="relative h-28 overflow-hidden sm:h-36 md:h-40">
          <img
            src={game.poster_url}
            alt={`FACKTS vs ${game.opponent ?? "Opponent"}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            style={{
              objectPosition: game.poster_position ?? "center center",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

          <div
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide md:text-[10px] ${getGameLabelClass(
              label
            )}`}
          >
            {label}
          </div>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-slate-900 to-orange-950/25 sm:h-28">
          <div className="absolute left-0 top-0 h-full w-full opacity-[0.06]">
            <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:16px_16px]" />
          </div>

          <div
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide md:text-[10px] ${getGameLabelClass(
              label
            )}`}
          >
            {label}
          </div>

          <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.25em] text-orange-300 md:text-xs">
            FACKTS Game
          </div>
        </div>
      )}

      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-500 md:text-[11px]">
              {game.match_type ?? "Game"}
            </div>

            <h3 className="mt-1 truncate text-base font-black leading-tight md:text-xl">
              FACKTS vs {game.opponent ?? "Opponent"}
            </h3>

            <div className="mt-2 truncate text-xs text-slate-400 md:text-sm">
              {formatGameDate(game.game_date)}
            </div>

            <div className="mt-1 truncate text-xs text-slate-500 md:text-sm">
              {game.venue ?? "Venue TBA"}
            </div>
          </div>

          {!game.is_upcoming ? (
            <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center md:rounded-2xl md:px-3">
              <div className="text-base font-black leading-none md:text-xl">
                <span className="text-orange-300">
                  {game.team_score ?? "-"}
                </span>
                <span className="mx-1 text-slate-600">-</span>
                <span>{game.opponent_score ?? "-"}</span>
              </div>

              <div className="mt-1 text-[8px] uppercase tracking-wide text-slate-500 md:text-[9px]">
                Final
              </div>
            </div>
          ) : (
            <div className="hidden shrink-0 rounded-xl border border-orange-500/25 bg-orange-500/10 px-2 py-2 text-center text-[9px] font-black uppercase tracking-wide text-orange-300 sm:block">
              View
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
          <div className="truncate text-[11px] font-semibold text-slate-500 md:text-xs">
            Tap for full game details
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-orange-300 ring-1 ring-slate-800 transition group-hover:bg-orange-500 group-hover:text-slate-950">
            →
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
  badge,
  badgeStyle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeStyle: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5 md:gap-4">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
          {kicker}
        </div>

        <h2 className="mt-1 text-xl font-black leading-tight md:text-3xl">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400 md:mt-2">{subtitle}</p>
      </div>

      <div
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold md:px-4 md:py-2 md:text-sm ${badgeStyle}`}
      >
        {badge}
      </div>
    </div>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 backdrop-blur md:p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 md:text-xs">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-orange-300 md:text-2xl">
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400 md:rounded-3xl md:p-6">
      {text}
    </div>
  );
}