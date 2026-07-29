import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CopyRosterButton from "../components/CopyRosterButton";

export const revalidate = 60;

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

function formatGameTime(game: any) {
  const rawTime =
    game.game_time ??
    game.time ??
    game.tipoff_time ??
    game.start_time ??
    null;

  if (!rawTime) return null;

  try {
    if (String(rawTime).includes(":")) {
      return String(rawTime);
    }

    const date = new Date(rawTime);
    return date.toLocaleTimeString("en-KE", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(rawTime);
  }
}

function cleanRole(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

async function getUpcomingGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_upcoming", true)
    .order("game_date", { ascending: true });

  if (error) {
    console.error("Games error:", error.message);
    return [];
  }

  return data ?? [];
}

async function getRosters() {
  const { data, error } = await supabase
    .from("game_rosters")
    .select(
      `
      id,
      game_id,
      roster_role,
      roster_status,
      player_id,
      player:players (
        id,
        full_name,
        nickname,
        jersey_number,
        position
      )
    `
    );

  if (error) {
    console.error("Rosters error:", error.message);
    return [];
  }

  return data ?? [];
}

function playerLine(row: any) {
  const number = row.player?.jersey_number ?? "â€”";
  const name = row.player?.full_name ?? "Unknown Player";
  const position = row.player?.position ?? "Player";

  return `#${number} ${name} â€” ${position}`;
}

function buildCopyText(game: any, roster: any[]) {
  const starters = roster.filter(
    (row) => cleanRole(row.roster_role) === "starter"
  );

  const bench = roster.filter(
    (row) => cleanRole(row.roster_role) !== "starter"
  );

  const starterLines =
    starters.length > 0
      ? starters.map((row) => playerLine(row)).join("\n")
      : "To be confirmed";

  const benchLines =
    bench.length > 0
      ? bench.map((row) => playerLine(row)).join("\n")
      : "To be confirmed";

  const time = formatGameTime(game);

  return `ðŸ€ FACKTS GAME ROSTER

FACKTS vs ${game.opponent ?? "Opponent"}
${game.match_type ?? "Game"}
ðŸ“ ${game.venue ?? "Venue TBA"}
ðŸ“… ${formatGameDate(game.game_date)}${time ? `\nâ° ${time}` : ""}

ðŸ”¥ STARTERS
${starterLines}

ðŸ’ª BENCH
${benchLines}

FACKTS Hoops. Kenyan basketball, documented.`;
}

export default async function PublicRostersHubPage() {
  const [games, rosters] = await Promise.all([getUpcomingGames(), getRosters()]);

  const rostersByGame = new Map<string, any[]>();

  rosters.forEach((row: any) => {
    const existing = rostersByGame.get(row.game_id) ?? [];
    existing.push(row);
    rostersByGame.set(row.game_id, existing);
  });

  const totalRosterPlayers = rosters.length;
  const totalUpcomingGames = games.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-12">
          <Link
            href="/games"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            â† Back to Games
          </Link>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950">
                FACKTS Rosters
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight md:text-6xl">
                Public Game <span className="text-orange-400">Rosters</span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-lg md:leading-8">
                Open and copy official FACKTS game rosters for sharing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <HeroMiniStat label="Games" value={String(totalUpcomingGames)} />
              <HeroMiniStat label="Listed" value={String(totalRosterPlayers)} />
              <HeroMiniStat label="Status" value="Live" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-10">
        {games.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400 md:rounded-3xl md:p-6">
            No upcoming roster pages are available yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
            {games.map((game: any) => {
              const gameRoster = rostersByGame.get(game.id) ?? [];

              const starters = gameRoster.filter(
                (row) => cleanRole(row.roster_role) === "starter"
              );

              const bench = gameRoster.filter(
                (row) => cleanRole(row.roster_role) !== "starter"
              );

              const copyText = buildCopyText(game, gameRoster);
              const gameTime = formatGameTime(game);

              return (
                <article
                  key={game.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition hover:border-orange-400/30 md:rounded-[2rem] md:shadow-xl"
                >
                  {game.poster_url ? (
                    <div className="relative h-32 overflow-hidden bg-slate-950 md:h-44">
                      <img
                        src={game.poster_url}
                        alt={`Poster for FACKTS vs ${game.opponent}`}
                        className="h-full w-full object-cover"
                        style={{
                          objectPosition:
                            game.poster_position ?? "center center",
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />

                      <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-orange-300 md:text-xs">
                          Upcoming Roster
                        </div>

                        <h2 className="mt-1 truncate text-lg font-black md:text-xl">
                          FACKTS vs {game.opponent ?? "Opponent"}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-slate-800 bg-gradient-to-br from-slate-950 to-orange-950/30 p-4 md:p-5">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-orange-300 md:text-xs">
                        Upcoming Roster
                      </div>

                      <h2 className="mt-2 truncate text-lg font-black md:text-xl">
                        FACKTS vs {game.opponent ?? "Opponent"}
                      </h2>
                    </div>
                  )}

                  <div className="p-3 md:p-5">
                    <div className="grid gap-2">
                      <GameInfoLine
                        icon="ðŸ“…"
                        label="Date"
                        value={formatGameDate(game.game_date)}
                        glow="orange"
                      />

                      {gameTime ? (
                        <GameInfoLine
                          icon="â°"
                          label="Tip-off"
                          value={gameTime}
                          glow="emerald"
                        />
                      ) : null}

                      <GameInfoLine
                        icon="ðŸ“"
                        label="Venue"
                        value={game.venue ?? "Venue TBA"}
                        glow="rose"
                      />

                      <GameInfoLine
                        icon="ðŸ€"
                        label="Match"
                        value={game.match_type ?? "Game"}
                        glow="sky"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5 md:mt-4 md:gap-2">
                      <MiniStat label="Roster" value={gameRoster.length} />
                      <MiniStat label="Start" value={starters.length} />
                      <MiniStat label="Bench" value={bench.length} />
                    </div>

                    <div className="mt-4 grid gap-2 md:mt-5">
                      <Link
                        href={`/rosters/${game.id}`}
                        className="rounded-2xl bg-orange-500 px-4 py-2.5 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400 md:py-3"
                      >
                        Open Public Roster
                      </Link>

                      <CopyRosterButton text={copyText} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function GameInfoLine({
  icon,
  label,
  value,
  glow,
}: {
  icon: string;
  label: string;
  value: string;
  glow: "orange" | "emerald" | "rose" | "sky";
}) {
  const glowClass =
    glow === "orange"
      ? "bg-orange-500/15 text-orange-300 ring-orange-500/20"
      : glow === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
      : glow === "rose"
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/20"
      : "bg-sky-500/15 text-sky-300 ring-sky-500/20";

  return (
    <div className="group flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 transition hover:border-orange-400/30">
      <div
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-base ring-1 ${glowClass}`}
      >
        <span className="absolute inset-0 rounded-2xl bg-current opacity-10 blur-md transition group-hover:opacity-20" />
        <span className="animate-pulse">{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
          {label}
        </div>

        <div className="truncate text-xs font-bold text-slate-200 md:text-sm">
          {value}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-center md:rounded-2xl md:p-3">
      <div className="text-[9px] uppercase tracking-wide text-slate-500 md:text-[10px]">
        {label}
      </div>

      <div className="mt-0.5 text-base font-black text-orange-300 md:mt-1 md:text-xl">
        {value}
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