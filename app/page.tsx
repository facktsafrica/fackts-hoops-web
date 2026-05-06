import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false })
    .limit(8);

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

async function getLatestPOG(latestGameId?: string) {
  if (!latestGameId) return null;

  const { data, error } = await supabase
    .from("player_game_stats")
    .select(
      `
      *,
      players (
        id,
        full_name,
        jersey_number,
        position,
        role,
        nickname,
        photo_url
      )
    `
    )
    .eq("game_id", latestGameId)
    .eq("player_of_game", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data ?? null;
}

export default async function HomePage() {
  const [players, games] = await Promise.all([getPlayers(), getGames()]);
  const latestGame = games[0] ?? null;
  const pog = await getLatestPOG(latestGame?.id);

  const featuredPlayer =
    players.find((p: any) => p.is_featured === true) ??
    players.find((p: any) => p.role?.toLowerCase() === "starter") ??
    players[0] ??
    null;

  const wins = games.filter((g: any) => (g.team_score ?? 0) > (g.opponent_score ?? 0)).length;
  const losses = games.filter((g: any) => (g.team_score ?? 0) < (g.opponent_score ?? 0)).length;
  const draws = games.filter((g: any) => (g.team_score ?? 0) === (g.opponent_score ?? 0)).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-orange-500 px-3 py-1 font-bold text-slate-950">
              FACKTS LIVE
            </span>
            {latestGame ? (
              <span className="text-slate-300">
                Latest Result:
                <span className="ml-2 font-semibold text-white">
                  FACKTS {latestGame.team_score ?? 0} - {latestGame.opponent_score ?? 0}{" "}
                  {latestGame.opponent}
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
            <span>
              D: <span className="font-semibold text-slate-200">{draws}</span>
            </span>
          </div>
        </div>
      </div>

      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
            <div>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-orange-500/30 bg-slate-900 shadow-lg shadow-orange-950/20">
                  <span className="text-2xl font-black text-orange-400">F</span>
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                    FACKTS Hoops
                  </div>
                  <div className="text-sm text-slate-400">Basketball. Culture. Visibility.</div>
                </div>
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                The home of
                <span className="block text-orange-400">FACKTS basketball data</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
                Follow players, game results, and performance stories in one branded FACKTS
                experience.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/players"
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400"
                >
                  Explore Players
                </Link>
                <Link
                  href="/games"
                  className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Explore Games
                </Link>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <HeroStat label="Active Players" value={String(players.length)} />
                <HeroStat label="Games Logged" value={String(games.length)} />
                <HeroStat label="Record" value={`${wins}-${losses}-${draws}`} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-orange-950/20">
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
                  className="block rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-orange-400/40"
                >
                  <div className="flex items-center gap-4">
                    {featuredPlayer.photo_url ? (
                      <img
                        src={featuredPlayer.photo_url}
                        alt={featuredPlayer.full_name}
                        className="h-24 w-24 rounded-3xl border border-slate-700 object-cover"
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
                        {featuredPlayer.position ?? "—"} • {featuredPlayer.role ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <MiniInfo label="Height" value={featuredPlayer.height ?? "—"} />
                    <MiniInfo label="Level" value={featuredPlayer.highest_level ?? "—"} />
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
      </section>

      <section className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-slate-900 to-slate-900 p-6">
            <div className="mb-2 text-sm uppercase tracking-[0.2em] text-orange-300">
              Player of the Game
            </div>

            {pog?.players ? (
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  {pog.players.photo_url ? (
                    <img
                      src={pog.players.photo_url}
                      alt={pog.players.full_name}
                      className="h-20 w-20 rounded-3xl border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 text-3xl">
                      🏀
                    </div>
                  )}

                  <div>
                    <div className="text-2xl font-black">
                      #{pog.players.jersey_number ?? "—"} {pog.players.full_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {pog.players.position ?? "—"} • {pog.players.role ?? "—"}
                    </div>
                    <div className="mt-2 text-orange-300">
                      {pog.players.nickname
                        ? `"${pog.players.nickname}"`
                        : "FACKTS standout"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <SmallStat label="PTS" value={pog.points ?? 0} />
                  <SmallStat label="REB" value={pog.rebounds ?? 0} />
                  <SmallStat label="AST" value={pog.assists ?? 0} />
                  <SmallStat label="+/-" value={pog.plus_minus ?? 0} />
                </div>
              </div>
            ) : (
              <div className="text-slate-400">
                No player of the game has been marked for the latest game yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-orange-300">Roster</div>
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
                className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
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
              const won = (game.team_score ?? 0) > (game.opponent_score ?? 0);
              const drew = (game.team_score ?? 0) === (game.opponent_score ?? 0);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-400">
                      {game.game_date} • {game.venue ?? "Venue TBA"}
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        drew
                          ? "bg-slate-800 text-slate-300"
                          : won
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {drew ? "DRAW" : won ? "WIN" : "LOSS"}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Team</div>
                      <div className="text-2xl font-bold">FACKTS</div>
                    </div>

                    <div className="text-center">
                      <div className="text-4xl font-black tracking-tight text-orange-400">
                        {game.team_score ?? 0} - {game.opponent_score ?? 0}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        Final Score
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-slate-400">Opponent</div>
                      <div className="text-2xl font-bold">{game.opponent}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-400">{game.match_type ?? "Game"}</div>
                    <div className="text-sm font-semibold text-orange-300">
                      Open game details →
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
              <div className="text-sm uppercase tracking-wide text-orange-300">Contact</div>
              <h2 className="mt-1 text-3xl font-bold">Talk to FACKTS</h2>
              <p className="mt-2 text-slate-400">
                Partnerships, player visibility, basketball media, and content collaboration.
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
              <div className="text-sm uppercase tracking-wide text-orange-300">Details</div>
              <div className="mt-5 space-y-4 text-slate-300">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                  <div className="mt-1">facktsafrica@gmail.com</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Phone</div>
                  <div className="mt-1">+254 711 468 303</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Location</div>
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
                  href="https://www.youtube.com/@facktsNBA"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
                >
                  YouTube
                </a>
                <a
                  href="https://www.instagram.com/facktsafrica_nba?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
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

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-orange-300">{value}</div>
    </div>
  );
}