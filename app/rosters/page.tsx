import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      player:players (
        id,
        full_name,
        nickname,
        jersey_number,
        position,
        is_active
      )
    `
    );

  if (error) {
    console.error("Rosters error:", error.message);
    return [];
  }

  return data ?? [];
}

function playerName(row: any) {
  return row.player?.full_name ?? "Unknown Player";
}

function playerNumber(row: any) {
  return row.player?.jersey_number ?? "—";
}

function playerPosition(row: any) {
  return row.player?.position ?? "Player";
}

function buildWhatsAppText(game: any, roster: any[]) {
  const starters = roster.filter(
    (row) => row.roster_role?.toLowerCase() === "starter"
  );

  const bench = roster.filter(
    (row) => row.roster_role?.toLowerCase() !== "starter"
  );

  const starterLines =
    starters.length > 0
      ? starters
          .map(
            (row) =>
              `#${playerNumber(row)} ${playerName(row)} — ${playerPosition(row)}`
          )
          .join("\n")
      : "To be confirmed";

  const benchLines =
    bench.length > 0
      ? bench
          .map(
            (row) =>
              `#${playerNumber(row)} ${playerName(row)} — ${playerPosition(row)}`
          )
          .join("\n")
      : "To be confirmed";

  const rawText = `🏀 FACKTS GAME ROSTER

FACKTS vs ${game.opponent ?? "Opponent"}
${game.match_type ?? "Game"}
📍 ${game.venue ?? "Venue TBA"}
📅 ${formatGameDate(game.game_date)}

🔥 STARTERS
${starterLines}

💪 BENCH
${benchLines}

FACKTS Hoops. Kenyan basketball, documented.`;

  return encodeURIComponent(rawText);
}

export default async function PublicRostersHubPage() {
  const [games, rosters] = await Promise.all([getUpcomingGames(), getRosters()]);

  const rostersByGame = new Map<string, any[]>();

  rosters.forEach((row: any) => {
    const existing = rostersByGame.get(row.game_id) ?? [];
    existing.push(row);
    rostersByGame.set(row.game_id, existing);
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/games"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            ← Back to Games
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950">
              FACKTS Rosters
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
              Public Game <span className="text-orange-400">Rosters</span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Open and share official FACKTS game rosters.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {games.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No upcoming roster pages are available yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game: any) => {
              const gameRoster = rostersByGame.get(game.id) ?? [];

              const starters = gameRoster.filter(
                (row) => row.roster_role?.toLowerCase() === "starter"
              );

              const bench = gameRoster.filter(
                (row) => row.roster_role?.toLowerCase() !== "starter"
              );

              const whatsappText = buildWhatsAppText(game, gameRoster);

              return (
                <article
                  key={game.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-xl shadow-black/20 transition hover:border-orange-400/30"
                >
                  {game.poster_url ? (
                    <div className="relative h-44 overflow-hidden bg-slate-950">
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
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-orange-300">
                          Upcoming Roster
                        </div>
                        <h2 className="mt-1 text-xl font-black">
                          FACKTS vs {game.opponent ?? "Opponent"}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-slate-800 bg-gradient-to-br from-slate-950 to-orange-950/30 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-orange-300">
                        Upcoming Roster
                      </div>
                      <h2 className="mt-2 text-xl font-black">
                        FACKTS vs {game.opponent ?? "Opponent"}
                      </h2>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="text-sm leading-6 text-slate-400">
                      {formatGameDate(game.game_date)} •{" "}
                      {game.venue ?? "Venue TBA"} •{" "}
                      {game.match_type ?? "Game"}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Roster" value={gameRoster.length} />
                      <MiniStat label="Starters" value={starters.length} />
                      <MiniStat label="Bench" value={bench.length} />
                    </div>

                    <div className="mt-5 grid gap-2">
                      <Link
                        href={`/rosters/${game.id}`}
                        className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400"
                      >
                        Open Public Roster
                      </Link>

                      <a
                        href={`https://wa.me/?text=${whatsappText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                      >
                        Share on WhatsApp
                      </a>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-orange-300">{value}</div>
    </div>
  );
}