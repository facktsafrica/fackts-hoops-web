export const revalidate = 60;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import GamesExplorer, {
  type GameDirectoryItem,
  type GameTeamDirectoryItem,
} from "./GamesExplorer";
import {
  gameCategoryLabel,
  getGameCategory,
  getGameContextKey,
  normalizeGameIdentity,
  resolveGameSeasonLabel,
} from "@/lib/hoops/gameContext";
import { resolveFacktsKingsSeason } from "@/lib/hoops/facktsKings";
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

type CompetitionRow = {
  id: string;
  name: string;
  short_name?: string | null;
  current_season_label?: string | null;
};

type LeagueRow = {
  id: string;
  name: string;
  short_name?: string | null;
};

type TeamRow = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  aliases?: string[] | null;
  logo_url?: string | null;
  city?: string | null;
  current_competition?: string | null;
  verification_status?: string | null;
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

function compactFormat(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatBucket(game: GameRecord) {
  const category = getGameCategory(game);
  if (category === "one_on_one") return "1v1";

  const format = compactFormat(getGameFormat(game));
  if (format.includes("3v3")) return "3v3";
  if (format.includes("5v5") || category === "league" || category === "event") return "5v5";
  return getGameFormat(game) || "Basketball";
}

function teamAliases(team: TeamRow) {
  return [team.name, team.short_name, ...(team.aliases || [])]
    .map(normalizeGameIdentity)
    .filter(Boolean);
}

function teamMatchesSide(team: TeamRow, teamId: string | null | undefined, teamName: string) {
  if (teamId) return team.id === teamId;
  const normalizedName = normalizeGameIdentity(teamName);
  if (!normalizedName) return false;
  return teamAliases(team).includes(normalizedName);
}

function teamSideForGame(game: GameRecord, team: TeamRow): "home" | "away" | null {
  if (teamMatchesSide(team, game.home_team_id, getHomeTeam(game))) return "home";
  if (teamMatchesSide(team, game.away_team_id, getAwayTeam(game))) return "away";
  return null;
}

function teamsForGame(game: GameRecord, teams: TeamRow[]) {
  return teams.filter((team) => teamSideForGame(game, team) !== null);
}

function contextLabel(
  game: GameRecord,
  event: EventRow | undefined,
  leagues: Map<string, LeagueRow>,
  competitions: Map<string, CompetitionRow>,
  registeredTeams: TeamRow[],
) {
  const category = getGameCategory(game);
  const season =
    category === "one_on_one"
      ? resolveFacktsKingsSeason(game.season_label, getGameDate(game))
      : resolveGameSeasonLabel(game) || "Season not recorded";
  const division = game.division || "Division not assigned";

  if (category === "league") {
    const league = game.league_id ? leagues.get(game.league_id) : undefined;
    return `${league?.short_name || league?.name || getCompetition(game)} · ${season} · ${division}`;
  }

  if (category === "event") return event?.title || getCompetition(game);

  if (category === "one_on_one") {
    const competition = game.competition_id
      ? competitions.get(game.competition_id)
      : undefined;
    return `${competition?.short_name || competition?.name || "FACKTS Kings"} · ${season}`;
  }

  if (category === "court_takeover" || category === "competition") {
    const competition = game.competition_id
      ? competitions.get(game.competition_id)
      : undefined;
    const name = competition?.short_name || competition?.name || getCompetition(game);
    return `${name} · ${season}${game.division ? ` · ${game.division}` : ""}`;
  }

  if ((category === "friendly" || category === "other") && registeredTeams.length) {
    const teamNames = registeredTeams.map((team) => team.short_name || team.name);
    const owner = teamNames.length === 1 ? teamNames[0] : teamNames.join(" vs ");
    return `${owner} · ${formatBucket(game)}`;
  }

  return gameCategoryLabel(category);
}

function resultForTeam(game: GameRecord, team: TeamRow): "W" | "L" | "D" | null {
  if (getGameStatus(game) !== "completed") return null;

  const homeScore = getHomeScore(game);
  const awayScore = getAwayScore(game);
  if (homeScore === null || awayScore === null) return null;

  const side = teamSideForGame(game, team);
  if (!side) return null;

  const teamScore = side === "home" ? homeScore : awayScore;
  const opponentScore = side === "home" ? awayScore : homeScore;

  if (teamScore > opponentScore) return "W";
  if (teamScore < opponentScore) return "L";
  return "D";
}

function scoreForTeam(game: GameRecord, team: TeamRow) {
  const homeScore = getHomeScore(game);
  const awayScore = getAwayScore(game);
  if (homeScore === null || awayScore === null) return "Score pending";

  const side = teamSideForGame(game, team);
  if (!side) return `${homeScore}–${awayScore}`;

  return side === "home" ? `${homeScore}–${awayScore}` : `${awayScore}–${homeScore}`;
}

function opponentForTeam(game: GameRecord, team: TeamRow) {
  const side = teamSideForGame(game, team);
  if (side === "home") return getAwayTeam(game);
  if (side === "away") return getHomeTeam(game);
  return "Opponent";
}

async function loadGameDirectory() {
  const supabase = getSupabase();

  const [
    gamesResult,
    statsResult,
    guestStatsResult,
    rostersResult,
    mediaResult,
    eventsResult,
    leaguesResult,
    competitionsResult,
    teamsResult,
  ] = await Promise.all([
    supabase.from("games").select("*").order("game_date", { ascending: false }),
    supabase.from("player_game_stats").select("game_id"),
    supabase.from("guest_game_stats").select("game_id"),
    supabase.from("game_rosters").select("game_id"),
    supabase
      .from("game_media")
      .select("game_id")
      .eq("is_public", true)
      .eq("publish_status", "published"),
    supabase
      .from("event_case_studies")
      .select("event_id,slug,title")
      .eq("is_public", true),
    supabase.from("leagues").select("id,name,short_name").eq("is_public", true),
    supabase
      .from("competitions")
      .select("id,name,short_name,current_season_label")
      .eq("is_public", true),
    supabase
      .from("team_profiles")
      .select(
        "id,slug,name,short_name,aliases,logo_url,city,current_competition,verification_status",
      )
      .eq("is_public", true),
  ]);

  const rawGames = ((gamesResult.data || []) as GameRecord[]).filter(
    (game) => game.is_public !== false,
  );
  const statsCounts = countByGame([
    ...((statsResult.data || []) as RelatedRow[]),
    ...((guestStatsResult.data || []) as RelatedRow[]),
  ]);
  const rosterCounts = countByGame((rostersResult.data || []) as RelatedRow[]);
  const mediaCounts = countByGame((mediaResult.data || []) as RelatedRow[]);

  const eventMap = new Map<string, EventRow>();
  ((eventsResult.data || []) as EventRow[]).forEach((event) => eventMap.set(event.event_id, event));

  const leagueMap = new Map<string, LeagueRow>();
  ((leaguesResult.data || []) as LeagueRow[]).forEach((league) => leagueMap.set(league.id, league));

  const competitionMap = new Map<string, CompetitionRow>();
  ((competitionsResult.data || []) as CompetitionRow[]).forEach((competition) =>
    competitionMap.set(competition.id, competition),
  );

  const teamRows = (teamsResult.data || []) as TeamRow[];
  const rawGameMap = new Map(rawGames.map((game) => [game.id, game]));

  const games: GameDirectoryItem[] = rawGames
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
      const category = getGameCategory(game);
      const registeredTeams = teamsForGame(game, teamRows);
      const teamContextKey = registeredTeams
        .map((team) => team.id)
        .sort()
        .join("+");
      const contextKey =
        (category === "friendly" || category === "other") && teamContextKey
          ? `${category}:team:${teamContextKey}:${formatBucket(game)}`
          : getGameContextKey(game);

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
        category,
        categoryLabel: gameCategoryLabel(category),
        contextKey,
        contextLabel: contextLabel(game, event, leagueMap, competitionMap, registeredTeams),
        eventTitle: event?.title || "",
        eventSlug: event?.slug || "",
        gameFormat: getGameFormat(game),
        formatBucket: formatBucket(game),
        stage: getStage(game),
        imageUrl: getPosterUrl(game),
        verificationLabel: getVerificationLabel(game),
        verified: isVerified(game),
        hasStats: (statsCounts.get(game.id) || 0) > 0,
        rosterCount: rosterCounts.get(game.id) || 0,
        mediaCount: builtInMedia + (mediaCounts.get(game.id) || 0),
        registeredTeamIds: registeredTeams.map((team) => team.id),
        registeredTeamSlugs: registeredTeams.map((team) => team.slug),
      };
    });

  const teams: GameTeamDirectoryItem[] = teamRows
    .map((team) => {
      const teamGames = games.filter((game) => game.registeredTeamIds.includes(team.id));
      const teamRawGames = teamGames
        .map((game) => rawGameMap.get(game.id))
        .filter((game): game is GameRecord => Boolean(game));

      const completedGames = teamRawGames
        .filter(
          (game) =>
            getGameStatus(game) === "completed" &&
            getHomeScore(game) !== null &&
            getAwayScore(game) !== null,
        )
        .sort((a, b) => timeValue(b) - timeValue(a));

      const liveGames = teamRawGames
        .filter((game) => getGameStatus(game) === "live")
        .sort((a, b) => timeValue(a) - timeValue(b));

      const upcomingGames = teamRawGames
        .filter((game) => getGameStatus(game) === "upcoming")
        .sort((a, b) => timeValue(a) - timeValue(b));

      const latest = completedGames[0] || null;
      const next = liveGames[0] || upcomingGames[0] || null;
      const wins = completedGames.filter((game) => resultForTeam(game, team) === "W").length;
      const losses = completedGames.filter((game) => resultForTeam(game, team) === "L").length;
      const draws = completedGames.filter((game) => resultForTeam(game, team) === "D").length;

      const formats = [...new Set(teamGames.map((game) => game.formatBucket).filter(Boolean))].sort();
      const competitions = [
        ...new Set(teamGames.map((game) => game.contextLabel).filter(Boolean)),
      ].sort();

      return {
        id: team.id,
        slug: team.slug,
        name: team.name,
        shortName: team.short_name || team.name,
        logoUrl: team.logo_url || "",
        city: team.city || "",
        currentCompetition: team.current_competition || "",
        verified: team.verification_status === "verified",
        totalGames: teamGames.length,
        liveGames: liveGames.length,
        upcomingGames: upcomingGames.length,
        completedGames: completedGames.length,
        postponedGames: teamRawGames.filter((game) => getGameStatus(game) === "postponed").length,
        wins,
        losses,
        draws,
        formats,
        competitions,
        latestGame: latest
          ? {
              id: latest.id,
              opponent: opponentForTeam(latest, team),
              result: resultForTeam(latest, team),
              score: scoreForTeam(latest, team),
              dateLabel: formatGameDate(getGameDate(latest)),
              contextLabel:
                games.find((game) => game.id === latest.id)?.contextLabel || getCompetition(latest),
            }
          : null,
        nextGame: next
          ? {
              id: next.id,
              opponent: opponentForTeam(next, team),
              dateLabel: formatGameDate(getGameDate(next)),
              status: getGameStatus(next),
              contextLabel:
                games.find((game) => game.id === next.id)?.contextLabel || getCompetition(next),
            }
          : null,
      };
    })
    .sort((a, b) => b.totalGames - a.totalGames || a.name.localeCompare(b.name));

  return { games, teams };
}

export default async function GamesPage() {
  const { games, teams } = await loadGameDirectory();
  const live = games.filter((game) => game.status === "live");
  const upcoming = games.filter((game) => game.status === "upcoming");
  const completed = games.filter((game) => game.status === "completed");
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
              FACKTS game explorer
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase leading-[.92] tracking-[-.04em] sm:text-6xl lg:text-7xl">
              Find the team. <span className="text-orange-400">Then find the game.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Games stay attached to the teams that played them. Competitions classify those same records. Start with a team, open its complete game history, or switch to competition and all-game views when you need the wider picture.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#game-directory" className="rounded-xl bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-black transition hover:bg-orange-400">
                Find a team
              </a>
              <Link href="/leagues" className="rounded-xl border border-white/15 bg-white/[.04] px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-white transition hover:border-orange-400/60">
                Explore leagues
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <HeroStat value={String(teams.length)} label="Registered teams" />
            <HeroStat value={String(games.length)} label="Public game records" accent="blue" />
            <HeroStat value={String(live.length)} label="Live now" accent="red" />
            <HeroStat value={String(upcoming.length)} label="Upcoming" accent="green" />
          </div>
        </div>
      </section>

      <GamesExplorer games={games} teams={teams} />

      <section className="border-t border-white/10 bg-[#07162b]/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">For organizers and teams</p>
            <h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">Turn every fixture into a permanent record.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">One game record can power a team profile, league table, competition hub, statistics, media and reporting without duplicating the game.</p>
          </div>
          <Link href="/book-coverage" className="shrink-0 rounded-xl bg-orange-500 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-black">
            Book tournament coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

function HeroStat({
  value,
  label,
  accent = "orange",
}: {
  value: string;
  label: string;
  accent?: "orange" | "red" | "blue" | "green";
}) {
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
