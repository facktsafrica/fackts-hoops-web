import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

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

function getPlayerName(row: any) {
  return row.player?.full_name ?? "Unknown Player";
}

function getJersey(row: any) {
  return row.player?.jersey_number ?? "—";
}

function getRoleLabel(value: string | null | undefined) {
  if (!value) return "Bench";

  const cleanValue = value.toLowerCase();

  if (cleanValue === "starter") return "Starter";
  if (cleanValue === "bench") return "Bench";

  return value;
}

function getStatusClass(status: string | null | undefined) {
  const cleanStatus = status?.toLowerCase();

  if (cleanStatus === "confirmed") {
    return "bg-emerald-500 text-slate-950";
  }

  if (cleanStatus === "pending") {
    return "bg-orange-500 text-slate-950";
  }

  if (cleanStatus === "unavailable") {
    return "bg-slate-800 text-slate-300";
  }

  return "bg-slate-800 text-slate-300";
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
          .map((row) => `#${getJersey(row)} ${getPlayerName(row)}`)
          .join("%0A")
      : "To be confirmed";

  const benchLines =
    bench.length > 0
      ? bench
          .map((row) => `#${getJersey(row)} ${getPlayerName(row)}`)
          .join("%0A")
      : "To be confirmed";

  const opponent = game?.opponent ?? "Opponent";
  const date = formatGameDate(game?.game_date);
  const venue = game?.venue ?? "Venue TBA";
  const matchType = game?.match_type ?? "Game";

  return `🏀 FACKTS GAME ROSTER%0A%0AFACKTS vs ${opponent}%0A${matchType}%0A📍 ${venue}%0A📅 ${date}%0A%0A🔥 STARTERS%0A${starterLines}%0A%0A💪 BENCH%0A${benchLines}%0A%0AFACKTS Hoops. Kenyan basketball, documented.`;
}

async function getGame(gameId: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function getRoster(gameId: string) {
  const { data, error } = await supabase
    .from("game_rosters")
    .select(
      `
      *,
      player:players (*)
    `
    )
    .eq("game_id", gameId)
    .order("roster_role", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

function getVideoEmbedUrl(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "").split("?")[0];
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      }

      if (parsed.pathname.includes("/shorts/")) {
        const shortId = parsed.pathname.split("/shorts/")[1]?.split("/")[0];

        if (shortId) {
          return `https://www.youtube-nocookie.com/embed/${shortId}?rel=0&modestbranding=1`;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default async function PublicRosterPage({ params }: PageProps) {
  const { gameId } = await params;

  const [game, roster] = await Promise.all([
    getGame(gameId),
    getRoster(gameId),
  ]);

  if (!game) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/games"
            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            ← Back to Games
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Roster page not found.
          </div>
        </div>
      </main>
    );
  }

  const starters = roster.filter(
    (row: any) => row.roster_role?.toLowerCase() === "starter"
  );

  const bench = roster.filter(
    (row: any) => row.roster_role?.toLowerCase() !== "starter"
  );

  const confirmed = roster.filter(
    (row: any) => row.roster_status?.toLowerCase() === "confirmed"
  ).length;

  const whatsappText = buildWhatsAppText(game, roster);
  const hasMatchPreview =
    game.preview_is_active !== false &&
    (game.preview_headline ||
      game.preview_story ||
      game.players_to_watch ||
      game.preview_image_url ||
      game.preview_video_url);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        {game.poster_url ? (
          <div className="absolute inset-0">
            <img
              src={game.poster_url}
              alt={`Poster for FACKTS vs ${game.opponent}`}
              className="h-full w-full object-cover"
              style={{
                objectPosition: game.poster_position ?? "center center",
              }}
            />
            <div className="absolute inset-0 bg-slate-950/82" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-orange-950/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30" />
        )}

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/games"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            ← Back to Games
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950">
              FACKTS Game Roster
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
              FACKTS vs{" "}
              <span className="text-orange-400">
                {game.opponent ?? "Opponent"}
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Official roster announcement for the upcoming FACKTS Hoops game.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoCard label="Date" value={formatGameDate(game.game_date)} />
              <InfoCard label="Venue" value={game.venue ?? "Venue TBA"} />
              <InfoCard label="Type" value={game.match_type ?? "Game"} />
            </div>
          </div>
        </div>
      </section>

      {hasMatchPreview ? <MatchPreview game={game} /> : null}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Roster Size" value={String(roster.length)} />
          <StatCard label="Starters" value={String(starters.length)} />
          <StatCard label="Bench" value={String(bench.length)} />
          <StatCard label="Confirmed" value={String(confirmed)} />
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
              Share Roster
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Copy-ready announcement for WhatsApp and public sharing.
            </div>
          </div>

          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
          >
            Share on WhatsApp
          </a>
        </div>

        {roster.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No roster has been published for this game yet.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <RosterSection title="Starters" rows={starters} />
            <RosterSection title="Bench" rows={bench} />
          </div>
        )}
      </section>
    </main>
  );
}

function MatchPreview({ game }: { game: any }) {
  const embedUrl = getVideoEmbedUrl(game.preview_video_url);

  return (
    <section className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5 md:p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
            Match Preview
          </div>

          <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
            {game.preview_headline ?? "Game story loading."}
          </h2>

          {game.preview_story ? (
            <p className="mt-5 text-sm leading-7 text-slate-300 md:text-base">
              {game.preview_story}
            </p>
          ) : null}

          {game.players_to_watch ? (
            <div className="mt-6 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                Players To Watch
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                {game.players_to_watch}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          {game.preview_image_url ? (
            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">
              <img
                src={game.preview_image_url}
                alt="Match preview"
                className="h-72 w-full object-cover md:h-96"
              />
            </div>
          ) : null}

          {embedUrl ? (
            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-black">
              <iframe
                src={embedUrl}
                title="Match preview video"
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : game.preview_video_url ? (
            <a
              href={game.preview_video_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-sm font-bold text-orange-300 transition hover:border-orange-500/40"
            >
              Open preview video
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function RosterSection({ title, rows }: { title: string; rows: any[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
            {title}
          </div>
          <h2 className="mt-1 text-2xl font-black">{title} Lineup</h2>
        </div>

        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">
          {rows.length} players
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
          No players listed here yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const player = row.player;

            return (
              <article
                key={row.id}
                className="rounded-3xl border border-slate-800 bg-slate-950 p-4 transition hover:border-orange-400/30"
              >
                <div className="flex items-center gap-4">
                  {player?.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.full_name}
                      className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
                      style={{
                        objectPosition: player.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                      🏀
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-black leading-tight">
                      #{player?.jersey_number ?? "—"}{" "}
                      {player?.full_name ?? "Unknown Player"}
                    </div>

                    {player?.nickname ? (
                      <div className="mt-1 text-sm text-orange-300">
                        "{player.nickname}"
                      </div>
                    ) : null}

                    <div className="mt-1 text-xs text-slate-400">
                      {player?.position ?? "Position TBA"} •{" "}
                      {getRoleLabel(row.roster_role)}
                    </div>
                  </div>

                  <div
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClass(
                      row.roster_status
                    )}`}
                  >
                    {row.roster_status ?? "confirmed"}
                  </div>
                </div>

                {row.notes ? (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs leading-5 text-slate-400">
                    {row.notes}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}