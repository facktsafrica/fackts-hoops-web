export const revalidate = 60;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import GamesExplorer, { type GameDirectoryItem } from "./GamesExplorer";
import {
  formatGameDate,
  getAwayScore,
  getAwayTeam,
  getCompetition,
  getGameDate,
  getGameFormat,
  getGameStatus,
  getGameTitle,
  getHomeScore,
  getHomeTeam,
  getPosterUrl,
  getStage,
  getStatusLabel,
  getVerificationLabel,
  isVerified,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";

type EventRow = {
  event_id: string;
  slug: string;
  title: string;
};

type RelatedRow = {
  game_id?: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error("Missing Supabase environment variables.");
  return createClient(url, key);
}

function timeValue(game: GameRecord) {
  const date = getGameDate(game);
  const value = date ? new Date(date).getTime() : 0;
  return Number.isNaN(value) ? 0 : value;
}

function countByGame(rows: RelatedRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    if (!row.game_id) return;
    counts.set(row.game_id, (counts.get(row.game_id) || 0) + 1);
  });

  return counts;
}

async function loadGames() {
  const supabase = getSupabase();

  const [gamesResult, statsResult, guestStatsResult, rostersResult, mediaResult, eventsResult] =
    await Promise.all([
      supabase.from("games").select("*").order("game_date", { ascending: false }),
      supabase.from("player_game_stats").select("game_id"),
      supabase.from("guest_game_stats").select("game_id"),
      supabase.from("game_rosters").select("game_id"),
      supabase.from("game_media").select("game_id").eq("is_public", true).eq("publish_status", "published"),
      supabase.from("event_case_studies").select("event_id,slug,title").eq("is_public", true),
    ]);

  const games = ((gamesResult.data || []) as GameRecord[]).filter(
    (game) => game.is_public !== false
  );
  const statsCounts = countByGame([
    ...((statsResult.data || []) as RelatedRow[]),
    ...((guestStatsResult.data || []) as RelatedRow[]),
  ]);
  const rosterCounts = countByGame((rostersResult.data || []) as RelatedRow[]);
  const mediaCounts = countByGame((mediaResult.data || []) as RelatedRow[]);
  const eventMap = new Map<string, EventRow>();
  ((eventsResult.data || []) as EventRow[]).forEach((event) => eventMap.set(event.event_id, event));

  const directory: GameDirectoryItem[] = games
    .sort((a, b) => {
      const order = { live: 0, upcoming: 1, completed: 2, postponed: 3, cancelled: 4 };
      const statusDifference = order[getGameStatus(a)] - order[getGameStatus(b)];
      if (statusDifference) return statusDifference;
      if (getGameStatus(a) === "upcoming") return timeValue(a) - timeValue(b);
      return timeValue(b) - timeValue(a);
    })
    .map((game) => {
      const event = game.event_id ? eventMap.get(game.event_id) : undefined;
      const date = getGameDate(game);
      const parsed = date ? new Date(date) : null;
      const year = parsed && !Number.isNaN(parsed.getTime()) ? String(parsed.getFullYear()) : "Date TBA";
      const builtInMedia = [game.video_url || game.game_video_url, game.highlight_url].filter(Boolean).length;

      return {
        id: game.id,
        title: getGameTitle(game),
        homeTeam: getHomeTeam(game),
        awayTeam: getAwayTeam(game),
        homeScore: getHomeScore(game),
        awayScore: getAwayScore(game),
        status: getGameStatus(game),
        statusLabel: getStatusLabel(getGameStatus(game)),
        gameDate: date,
        dateLabel: formatGameDate(date),
        year,
        venue: game.venue || game.court || "Venue TBA",
        location: game.location || "Location TBA",
        competition: getCompetition(game),
        eventTitle: event?.title || "",
        eventSlug: event?.slug || "",
        gameFormat: getGameFormat(game),
        stage: getStage(game),
        imageUrl: getPosterUrl(game),
        verificationLabel: getVerificationLabel(game),
        verified: isVerified(game),
        hasStats: (statsCounts.get(game.id) || 0) > 0,
        rosterCount: rosterCounts.get(game.id) || 0,
        mediaCount: builtInMedia + (mediaCounts.get(game.id) || 0),
      };
    });

  return directory;
}

export default async function GamesPage() {
  const games = await loadGames();
  const live = games.filter((game) => game.status === "live");
  const upcoming = games.filter((game) => game.status === "upcoming");
  const completed = games.filter((game) => game.status === "completed");
  const verified = games.filter((game) => game.verified);
  const featured = live[0] || upcoming[0] || completed[0] || null;

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,6,23,.75),rgba(2,6,23,.96)),url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]/80">
        {featured?.imageUrl ? (
          <div className="absolute inset-0">
            <img src={featured.imageUrl} alt="" className="h-full w-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07162b] via-[#07162b]/95 to-[#07162b]/65" />
          </div>
        ) : null}
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:px-8 lg:pb-24">
          <div>
            <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-orange-300">
              FACKTS game intelligence
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase leading-[.92] tracking-[-.04em] sm:text-6xl lg:text-7xl">
              Every fixture. Every result. <span className="text-orange-400">One record.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Find scheduled games, verified final scores, player box scores, official rosters and playable match media across FACKTS competitions and covered events.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#game-directory" className="rounded-xl bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-black transition hover:bg-orange-400">
                Browse games
              </a>
              <Link href="/events" className="rounded-xl border border-white/15 bg-white/[.04] px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-white transition hover:border-orange-400/60">
                Explore events
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <HeroStat value={String(games.length)} label="Published games" />
            <HeroStat value={String(live.length)} label="Live now" accent="red" />
            <HeroStat value={String(upcoming.length)} label="Upcoming" accent="blue" />
            <HeroStat value={String(verified.length)} label="Verified records" accent="green" />
          </div>
        </div>
      </section>

      <GamesExplorer games={games} />

      <section className="border-t border-white/10 bg-[#07162b]/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">For organizers and teams</p>
            <h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">Turn your games into usable evidence.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Verified scores, player statistics, match media and a shareable competition record in one connected platform.</p>
          </div>
          <Link href="/book-coverage" className="shrink-0 rounded-xl bg-orange-500 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-black">
            Book tournament coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ value, label, accent = "orange" }: { value: string; label: string; accent?: "orange" | "red" | "blue" | "green" }) {
  const colors = {
    orange: "text-orange-300",
    red: "text-red-300",
    blue: "text-blue-300",
    green: "text-emerald-300",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur sm:p-5">
      <p className={`text-3xl font-black sm:text-4xl ${colors[accent]}`}>{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-zinc-500 sm:text-[9px]">{label}</p>
    </div>
  );
}
