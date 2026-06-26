export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type CalendarEvent = {
  id: string;
  title?: string | null;
  event_type?: string | null;
  event_format?: string | null;
  opponent_or_partner?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  description?: string | null;
  status?: string | null;
  is_featured?: boolean | null;
  created_at?: string | null;
};

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
};

type OneOnOneRow = {
  id: string;
  match_number?: string | null;
  match_title?: string | null;
  match_type?: string | null;
  court?: string | null;
  participant_name?: string | null;
  opponent_name?: string | null;
  match_date?: string | null;
  venue?: string | null;
  location?: string | null;
  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  status?: string | null;
  notes?: string | null;
  poster_url?: string | null;
  video_url?: string | null;
  highlight_url?: string | null;
  created_at?: string | null;
};

type HighlightItem = {
  id: string;
  title: string;
  type: string;
  href: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  date?: string | null;
  meta: string;
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

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
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

function parseDate(value?: string | null) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getEventDateTime(event: CalendarEvent) {
  if (!event.event_date) return null;

  if (event.start_time) {
    return `${event.event_date}T${event.start_time}`;
  }

  return event.event_date;
}

function getGameTitle(game: GameRow) {
  return game.game_title || game.title || "FACKTS Game";
}

function getGameOpponent(game: GameRow) {
  return game.opponent || game.opponent_name || game.team_name || "Opponent";
}

function getGameDate(game: GameRow) {
  return game.game_date || game.date || game.created_at || null;
}

function getGamePoster(game: GameRow) {
  return game.poster_url || game.game_poster_url || game.image_url || "";
}

function getGameVideo(game: GameRow) {
  return game.video_url || game.game_video_url || "";
}

function getFacktsScore(game: GameRow) {
  return numberValue(game.team_score, game.fackts_score, game.home_score);
}

function getOpponentScore(game: GameRow) {
  return numberValue(game.opponent_score, game.away_score);
}

function gameHasScore(game: GameRow) {
  return getFacktsScore(game) !== null && getOpponentScore(game) !== null;
}

function getGameStatus(game: GameRow) {
  const status = String(game.status || "").toLowerCase().trim();

  if (status === "cancelled") return "Cancelled";
  if (status === "postponed") return "Postponed";
  if (gameHasScore(game)) return "Completed";
  if (status === "completed" || status === "played" || status === "final") return "Completed";
  if (game.is_upcoming === false) return "Completed";

  return "Upcoming";
}

function getGameLocation(game: GameRow) {
  return [game.venue, game.location].filter(Boolean).join(" • ") || "Venue TBA";
}

function getOneTitle(row: OneOnOneRow) {
  return (
    row.match_title ||
    `${row.participant_name || "Player 1"} vs ${row.opponent_name || "Player 2"}`
  );
}

function getOneDate(row: OneOnOneRow) {
  return row.match_date || row.created_at || null;
}

function getOneLocation(row: OneOnOneRow) {
  return [row.venue, row.location, row.court].filter(Boolean).join(" • ") || "Court TBA";
}

function getOneScore1(row: OneOnOneRow) {
  return numberValue(row.points_scored);
}

function getOneScore2(row: OneOnOneRow) {
  return numberValue(row.points_allowed);
}

function oneHasScore(row: OneOnOneRow) {
  return getOneScore1(row) !== null && getOneScore2(row) !== null;
}

function getOneStatus(row: OneOnOneRow) {
  const status = String(row.status || "").toLowerCase().trim();

  if (status === "cancelled") return "Cancelled";
  if (oneHasScore(row)) return "Completed";
  if (status === "completed" || status === "played" || status === "final") return "Completed";

  return "Upcoming";
}

function getOneWinner(row: OneOnOneRow) {
  const score1 = getOneScore1(row);
  const score2 = getOneScore2(row);

  if (score1 === null || score2 === null) return "Not decided";
  if (score1 > score2) return row.participant_name || "Player 1";
  if (score2 > score1) return row.opponent_name || "Player 2";

  return "Draw";
}

function getStatusClass(status: string) {
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

async function getData() {
  const supabase = getSupabase();

  const [eventsResult, gamesResult, oneResult] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true }),

    supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false }),

    supabase
      .from("guest_one_on_one_stats")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const events = (eventsResult.data || []) as CalendarEvent[];
  const games = (gamesResult.data || []) as GameRow[];
  const oneOnOne = (oneResult.data || []) as OneOnOneRow[];

  return {
    events,
    games,
    oneOnOne,
  };
}

function buildHighlights(games: GameRow[], oneOnOne: OneOnOneRow[]) {
  const gameHighlights: HighlightItem[] = games
    .filter((game) => getGameVideo(game) || game.highlight_url)
    .map((game) => ({
      id: `game-${game.id}`,
      title: getGameTitle(game),
      type: "Game Highlight",
      href: `/games/${game.id}`,
      videoUrl: getGameVideo(game) || game.highlight_url || "",
      posterUrl: getGamePoster(game),
      date: getGameDate(game),
      meta: `FACKTS vs ${getGameOpponent(game)}`,
    }));

  const oneHighlights: HighlightItem[] = oneOnOne
    .filter((row) => row.video_url || row.highlight_url)
    .map((row) => ({
      id: `one-${row.id}`,
      title: getOneTitle(row),
      type: "1v1 Highlight",
      href: `/one-on-one/${row.id}`,
      videoUrl: row.video_url || row.highlight_url || "",
      posterUrl: row.poster_url || "",
      date: getOneDate(row),
      meta: `${row.participant_name || "Player 1"} vs ${row.opponent_name || "Player 2"}`,
    }));

  return [...gameHighlights, ...oneHighlights].sort(
    (a, b) => parseDate(b.date) - parseDate(a.date)
  );
}

export default async function EventsPage() {
  const { events, games, oneOnOne } = await getData();

  const upcomingEvents = events
    .filter((event) => String(event.status || "upcoming").toLowerCase() !== "completed")
    .sort((a, b) => parseDate(getEventDateTime(a)) - parseDate(getEventDateTime(b)));

  const featuredEvent =
    events.find((event) => event.is_featured) || upcomingEvents[0] || events[0] || null;

  const upcomingGames = games
    .filter((game) => getGameStatus(game) === "Upcoming")
    .sort((a, b) => parseDate(getGameDate(a)) - parseDate(getGameDate(b)));

  const completedGames = games
    .filter((game) => getGameStatus(game) === "Completed")
    .sort((a, b) => parseDate(getGameDate(b)) - parseDate(getGameDate(a)));

  const upcomingFaceOffs = oneOnOne
    .filter((row) => getOneStatus(row) === "Upcoming")
    .sort((a, b) => parseDate(getOneDate(a)) - parseDate(getOneDate(b)));

  const completedFaceOffs = oneOnOne
    .filter((row) => getOneStatus(row) === "Completed")
    .sort((a, b) => parseDate(getOneDate(b)) - parseDate(getOneDate(a)));

  const highlights = buildHighlights(games, oneOnOne);

  const totalCompleted = completedGames.length + completedFaceOffs.length;
  const totalUpcoming = upcomingEvents.length + upcomingGames.length + upcomingFaceOffs.length;
  const totalVideos = highlights.length;
  const totalMatchups = games.length + oneOnOne.length;

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.76), rgba(2, 6, 23, 0.94)), url('/images/HOME%20PAGE%20BACKGROUND.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Events
              </div>

              <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight sm:text-6xl lg:text-7xl">
                Matchups. Fixtures. Face-Offs. Highlights. Hype.
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                The FACKTS Events hub brings together upcoming games, 1-on-1
                battles, event cards, results, media, numbers, and the stories
                that make every court takeover feel bigger than a normal fixture.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/calendar" className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400">
                  View Calendar
                </Link>

                <Link href="/games" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60">
                  Games
                </Link>

                <Link href="/one-on-one" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60">
                  1v1 Battles
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroStat label="Upcoming" value={totalUpcoming} />
              <HeroStat label="Completed" value={totalCompleted} />
              <HeroStat label="Matchups" value={totalMatchups} />
              <HeroStat label="Videos" value={totalVideos} />
            </div>
          </div>
        </div>
      </section>

      {featuredEvent ? (
        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Featured" title="Main Event" />

          <FeaturedEventCard event={featuredEvent} />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Event Intelligence" title="The Numbers" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            label="Event Pipeline"
            value={`${upcomingEvents.length} events`}
            sub="Items currently sitting in the event calendar."
          />

          <InsightCard
            label="Game Fixtures"
            value={`${upcomingGames.length} upcoming`}
            sub={`${completedGames.length} completed games already documented.`}
          />

          <InsightCard
            label="Face-Offs"
            value={`${upcomingFaceOffs.length} upcoming`}
            sub={`${completedFaceOffs.length} completed 1-on-1 battles.`}
          />

          <InsightCard
            label="Media Proof"
            value={`${highlights.length} videos`}
            sub="Full game videos and highlight links already attached."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Fixtures" title="Upcoming Games" />

        {upcomingGames.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <EmptyBox text="No upcoming games added yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Face-Off" title="Upcoming 1-on-1 Matchups" />

        {upcomingFaceOffs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingFaceOffs.map((row) => (
              <FaceOffCard key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <EmptyBox text="No upcoming 1-on-1 face-offs added yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Highlights" title="Video Proof" />

        {highlights.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {highlights.slice(0, 6).map((item) => (
              <HighlightCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyBox text="No highlight or video links have been added yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Archive" title="Completed Results" />

        <div className="grid gap-4 lg:grid-cols-2">
          <ArchivePanel
            title="Game Results"
            emptyText="No completed game results yet."
          >
            {completedGames.slice(0, 5).map((game) => (
              <ResultRow
                key={game.id}
                href={`/games/${game.id}`}
                title={`FACKTS vs ${getGameOpponent(game)}`}
                meta={formatDateTime(getGameDate(game))}
                score={`${getFacktsScore(game) ?? "-"} - ${getOpponentScore(game) ?? "-"}`}
              />
            ))}
          </ArchivePanel>

          <ArchivePanel
            title="1v1 Results"
            emptyText="No completed 1v1 results yet."
          >
            {completedFaceOffs.slice(0, 5).map((row) => (
              <ResultRow
                key={row.id}
                href={`/one-on-one/${row.id}`}
                title={`${row.participant_name || "Player 1"} vs ${row.opponent_name || "Player 2"}`}
                meta={`Winner: ${getOneWinner(row)}`}
                score={`${getOneScore1(row) ?? "-"} - ${getOneScore2(row) ?? "-"}`}
              />
            ))}
          </ArchivePanel>
        </div>
      </section>
    </main>
  );
}

function FeaturedEventCard({ event }: { event: CalendarEvent }) {
  const dateValue = getEventDateTime(event);
  const status = event.status || "upcoming";

  return (
    <Link
      href="/calendar"
      className="group block overflow-hidden rounded-[2rem] border border-orange-500/30 bg-zinc-950/90 shadow-2xl shadow-orange-950/20 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-400/70 lg:grid lg:grid-cols-[0.95fr_1.05fr]"
    >
      <div className="relative min-h-[340px] overflow-hidden bg-black">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title || "FACKTS Event"}
            className="h-full min-h-[340px] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full min-h-[340px] w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.28),_transparent_55%),#050505]">
            <div className="text-center">
              <p className="text-7xl font-black text-orange-500">EVENT</p>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                FACKTS Africa
              </p>
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(status === "completed" ? "Completed" : "Upcoming")}`}>
            {status}
          </span>

          {event.is_featured ? (
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-200">
              Featured
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
          {event.event_type || "FACKTS Event"}
        </p>

        <h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">
          {event.title || "Untitled Event"}
        </h2>

        <p className="mt-4 text-lg font-black text-orange-300">
          {event.event_format || "Basketball Event"}
          {event.opponent_or_partner ? ` • ${event.opponent_or_partner}` : ""}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniInfo label="Date" value={formatDateTime(dateValue)} />
          <MiniInfo label="Venue" value={event.venue || "Venue TBA"} />
          <MiniInfo label="Location" value={event.location || "Location TBA"} />
        </div>

        {event.description ? (
          <p className="mt-5 line-clamp-4 rounded-3xl border border-white/10 bg-black/50 p-4 text-sm leading-7 text-zinc-400">
            {event.description}
          </p>
        ) : null}

        <div className="mt-6">
          <span className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition group-hover:bg-orange-400">
            Open Event Calendar
          </span>
        </div>
      </div>
    </Link>
  );
}

function GameCard({ game }: { game: GameRow }) {
  const scoreOne = getFacktsScore(game);
  const scoreTwo = getOpponentScore(game);
  const poster = getGamePoster(game);
  const status = getGameStatus(game);

  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/90 shadow-xl shadow-black/20 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-400/60"
    >
      <PosterArea posterUrl={poster} label="Game" />

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusBadge status={status} />

          {getGameVideo(game) ? <MediaBadge label="Video" /> : null}
          {game.highlight_url ? <MediaBadge label="Highlights" /> : null}
        </div>

        <h3 className="text-xl font-black text-white group-hover:text-orange-200">
          {getGameTitle(game)}
        </h3>

        <p className="mt-1 text-sm font-bold text-orange-300">
          FACKTS vs {getGameOpponent(game)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniInfo label="Date" value={formatDateTime(getGameDate(game))} />
          <MiniInfo label="Venue" value={getGameLocation(game)} />
          <MiniInfo label="Score" value={`${scoreOne ?? "-"} - ${scoreTwo ?? "-"}`} />
        </div>

        <div className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
          Open Game
        </div>
      </div>
    </Link>
  );
}

function FaceOffCard({ row }: { row: OneOnOneRow }) {
  const scoreOne = getOneScore1(row);
  const scoreTwo = getOneScore2(row);
  const status = getOneStatus(row);

  return (
    <Link
      href={`/one-on-one/${row.id}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/90 shadow-xl shadow-black/20 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-400/60"
    >
      <PosterArea posterUrl={row.poster_url || ""} label="1V1" />

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusBadge status={status} />
          {row.video_url ? <MediaBadge label="Video" /> : null}
          {row.highlight_url ? <MediaBadge label="Highlights" /> : null}
        </div>

        <h3 className="line-clamp-2 text-xl font-black text-white group-hover:text-orange-200">
          {getOneTitle(row)}
        </h3>

        <p className="mt-1 text-sm font-bold text-orange-300">
          {row.participant_name || "Player 1"} vs {row.opponent_name || "Player 2"}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniInfo label="Date" value={formatDateTime(getOneDate(row))} />
          <MiniInfo label="Court" value={getOneLocation(row)} />
          <MiniInfo label="Score" value={`${scoreOne ?? "-"} - ${scoreTwo ?? "-"}`} />
        </div>

        <div className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
          Open Face-Off
        </div>
      </div>
    </Link>
  );
}

function HighlightCard({ item }: { item: HighlightItem }) {
  return (
    <Link
      href={item.href}
      className="group block overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/90 shadow-xl shadow-black/20 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-400/60"
    >
      <PosterArea posterUrl={item.posterUrl || ""} label="Video" />

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <MediaBadge label={item.type} />
        </div>

        <h3 className="line-clamp-2 text-xl font-black text-white group-hover:text-orange-200">
          {item.title}
        </h3>

        <p className="mt-2 text-sm font-bold text-zinc-400">{item.meta}</p>

        <p className="mt-2 text-xs text-zinc-500">{formatDateTime(item.date)}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition group-hover:bg-orange-400">
            Open Highlight
          </span>

          {item.videoUrl ? (
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-blue-200">
              Watch
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ArchivePanel({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <h3 className="text-2xl font-black">{title}</h3>

      <div className="mt-4 space-y-3">
        {hasChildren ? children : <EmptyBox text={emptyText} />}
      </div>
    </div>
  );
}

function ResultRow({
  href,
  title,
  meta,
  score,
}: {
  href: string;
  title: string;
  meta: string;
  score: string;
}) {
  return (
    <Link
      href={href}
      className="grid gap-3 rounded-2xl border border-white/10 bg-black/50 p-4 transition hover:border-orange-400/50 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{meta}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-xl font-black">
        {score}
      </div>
    </Link>
  );
}

function PosterArea({
  posterUrl,
  label,
}: {
  posterUrl?: string | null;
  label: string;
}) {
  return (
    <div className="relative h-56 overflow-hidden bg-black">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={label}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.2),_transparent_58%),#050505]">
          <div className="text-center">
            <p className="text-5xl font-black text-orange-500">{label}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
              FACKTS Events
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function InsightCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
        {label}
      </p>

      <p className="mt-2 line-clamp-2 text-2xl font-black text-white">{value}</p>

      <p className="mt-2 line-clamp-2 text-xs font-bold text-zinc-500">{sub}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-3xl font-black">{title}</h2>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase backdrop-blur ${getStatusClass(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function MediaBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
      {label}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 text-sm text-zinc-400 backdrop-blur-sm">
      {text}
    </div>
  );
}