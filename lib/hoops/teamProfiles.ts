import { supabase } from "@/lib/supabase";
import {
  getAwayScore,
  getAwayTeam,
  getCompetition,
  getGameDate,
  getGameStatus,
  getGameTitle,
  getHomeScore,
  getHomeTeam,
  getPosterUrl,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";

export type TeamProfile = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  tagline?: string | null;
  organization_name?: string | null;
  team_type?: string | null;
  division?: string | null;
  age_category?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  city?: string | null;
  country?: string | null;
  founded_year?: number | null;
  current_competition?: string | null;
  coach_name?: string | null;
  assistant_coach_name?: string | null;
  manager_name?: string | null;
  manager_title?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  aliases?: string[] | null;
  verification_status?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  claim_status?: string | null;
  is_featured?: boolean | null;
  is_public?: boolean | null;
  display_order?: number | null;
};

export type TeamMember = {
  id: string;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  display_name: string;
  nickname?: string | null;
  jersey_number?: number | string | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  profile_href?: string | null;
  is_captain?: boolean | null;
  status?: string | null;
  joined_at?: string | null;
};

export type TeamGame = {
  id: string;
  title?: string | null;
  competition_name?: string | null;
  opponent_name?: string | null;
  game_date?: string | null;
  venue?: string | null;
  status?: string | null;
  team_score?: number | null;
  opponent_score?: number | null;
  game_id?: string | null;
  event_id?: string | null;
  result?: "W" | "L" | null;
  home_away?: "home" | "away" | null;
  image_url?: string | null;
};

export type TrainingSession = {
  id: string;
  title: string;
  session_date?: string | null;
  venue?: string | null;
  focus_area?: string | null;
  summary?: string | null;
  image_url?: string | null;
};

export type TeamMedia = {
  id: string;
  title: string;
  media_type?: string | null;
  url: string;
  thumbnail_url?: string | null;
  published_at?: string | null;
  rights_status?: string | null;
};

export type TeamEvent = {
  id: string;
  event_id: string;
  title: string;
  slug: string;
  summary?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  hero_image_url?: string | null;
  participation_status?: string | null;
  division?: string | null;
  final_position?: string | null;
};

export type TeamCompetitionRecord = {
  id: string;
  title: string;
  href: string;
  summary?: string | null;
  record_type: "league" | "competition" | "event";
  status?: string | null;
  division?: string | null;
  final_position?: string | null;
  start_date?: string | null;
  image_url?: string | null;
};

export type TeamLeagueMembership = {
  id: string;
  season_label: string;
  division: string;
  conference?: string | null;
  status: string;
  league: {
    id: string;
    slug: string;
    name: string;
    short_name?: string | null;
    description?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
  };
};

export type TeamPerformance = {
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  averagePoints: number;
  averageAllowed: number;
  pointDifference: number;
  winPercentage: number;
  currentStreak: string;
  lastFive: Array<"W" | "L">;
};

export type TeamProfileBundle = {
  profile: TeamProfile;
  roster: TeamMember[];
  games: TeamGame[];
  training: TrainingSession[];
  media: TeamMedia[];
  events: TeamEvent[];
  competitionRecords: TeamCompetitionRecord[];
  leagueMemberships: TeamLeagueMembership[];
  performance: TeamPerformance;
  canClaim: boolean;
};

export type TeamDirectoryItem = {
  profile: TeamProfile;
  rosterCount: number;
  gameCount: number;
  leagueCount: number;
  eventCount: number;
  mediaCount: number;
  latestGame: TeamGame | null;
  performance: TeamPerformance;
};

type TeamGameRow = TeamGame & { team_id?: string | null; is_public?: boolean | null };
type TeamEventLinkRow = {
  id: string;
  team_id: string;
  event_id: string;
  participation_status?: string | null;
  division?: string | null;
  final_position?: string | null;
  is_public?: boolean | null;
};
type LinkedGameRecord = GameRecord & {
  home_team_id?: string | null;
  away_team_id?: string | null;
};

const FALLBACK_TEAM_ID = "fackts-africa-fallback";
const HEALTH_CHECKUP_CUP_SLUG = "fackts-africa-health-checkup-cup-2025";

const FACKTS_KINGS_RECORD: TeamCompetitionRecord = {
  id: "fackts-kings",
  title: "FACKTS Kings",
  href: "/competitions/fackts-kings",
  summary:
    "The ongoing FACKTS one-on-one competition, connecting matchups, results, standings and player records.",
  record_type: "competition",
  status: "2026 season · Ongoing",
  image_url: "/images/one-on-one-bg.png",
};

const HEALTH_CHECKUP_CUP_RECORD: TeamCompetitionRecord = {
  id: HEALTH_CHECKUP_CUP_SLUG,
  title: "FACKTS Africa Health Check-Up Cup 2025",
  href: `/events/${HEALTH_CHECKUP_CUP_SLUG}`,
  summary:
    "The completed three-day men’s and women’s tournament hosted at KMTC Upper Hill and documented by FACKTS Hoops.",
  record_type: "event",
  status: "Completed · 2025",
};

export const FACKTS_AFRICA_TEAM: TeamProfile = {
  id: FALLBACK_TEAM_ID,
  slug: "fackts-africa",
  name: "FACKTS Africa",
  short_name: "FACKTS",
  tagline: "Basketball, documented properly.",
  organization_name: "FACKTS Africa",
  team_type: "FACKTS organization team",
  division: "Open",
  description:
    "The home team and player-development identity behind FACKTS Hoops, the ongoing FACKTS Kings competition and the documented FACKTS Africa Health Check-Up Cup.",
  logo_url: "/fackts-hoops-logo.png",
  cover_image_url: "/images/one-on-one-bg.png",
  primary_color: "#0B1F3A",
  secondary_color: "#F58220",
  city: "Nairobi",
  country: "Kenya",
  aliases: ["FACKTS", "FACKTS Africa", "FACKTS Hoops"],
  verification_status: "verified",
  claim_status: "claimed",
  is_featured: true,
  is_public: true,
  display_order: 0,
};

function teamName(row: Record<string, unknown>) {
  return String(
    row.full_name || row.name || row.nickname || row.display_name || "Player"
  );
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timeValue(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortProfiles(left: TeamProfile, right: TeamProfile) {
  return (
    Number(right.is_featured || false) - Number(left.is_featured || false) ||
    Number(left.display_order || 0) - Number(right.display_order || 0) ||
    left.name.localeCompare(right.name)
  );
}

function normalizeName(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function profileAliases(profile: TeamProfile) {
  return new Set(
    [profile.name, profile.short_name, ...(profile.aliases || [])]
      .map(normalizeName)
      .filter(Boolean)
  );
}

function gameSide(game: LinkedGameRecord, profile: TeamProfile) {
  if (game.home_team_id && game.home_team_id === profile.id) return "home" as const;
  if (game.away_team_id && game.away_team_id === profile.id) return "away" as const;

  const aliases = profileAliases(profile);
  if (aliases.has(normalizeName(getHomeTeam(game)))) return "home" as const;
  if (aliases.has(normalizeName(getAwayTeam(game)))) return "away" as const;
  return null;
}

function resultFromScores(teamScore: number | null, opponentScore: number | null) {
  if (teamScore === null || opponentScore === null) return null;
  if (teamScore === opponentScore) return null;
  return teamScore > opponentScore ? ("W" as const) : ("L" as const);
}

function gameFromPublicRecord(
  game: LinkedGameRecord,
  profile: TeamProfile
): TeamGame | null {
  const side = gameSide(game, profile);
  if (!side) return null;

  const teamScore = side === "home" ? getHomeScore(game) : getAwayScore(game);
  const opponentScore = side === "home" ? getAwayScore(game) : getHomeScore(game);
  const opponent = side === "home" ? getAwayTeam(game) : getHomeTeam(game);

  return {
    id: `game-${game.id}`,
    game_id: game.id,
    event_id: game.event_id || null,
    title: getGameTitle(game),
    competition_name: getCompetition(game),
    opponent_name: opponent,
    game_date: getGameDate(game),
    venue: game.venue || game.court || game.location || null,
    status: getGameStatus(game),
    team_score: teamScore,
    opponent_score: opponentScore,
    result: resultFromScores(teamScore, opponentScore),
    home_away: side,
    image_url: getPosterUrl(game) || null,
  };
}

function normalizeStoredGame(row: TeamGameRow): TeamGame {
  const teamScore = optionalNumber(row.team_score);
  const opponentScore = optionalNumber(row.opponent_score);
  return {
    ...row,
    team_score: teamScore,
    opponent_score: opponentScore,
    result: row.result === "W" || row.result === "L"
      ? row.result
      : resultFromScores(teamScore, opponentScore),
  };
}

function mergeGames(stored: TeamGame[], direct: TeamGame[]) {
  const merged = new Map<string, TeamGame>();

  [...stored, ...direct].forEach((game) => {
    const key = game.game_id ? `linked:${game.game_id}` : `record:${game.id}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...game } : game);
  });

  return [...merged.values()].sort(
    (left, right) => timeValue(right.game_date) - timeValue(left.game_date)
  );
}

export function calculateTeamPerformance(games: TeamGame[]): TeamPerformance {
  const completed = games.filter(
    (game) => game.team_score !== null && game.team_score !== undefined && game.opponent_score !== null && game.opponent_score !== undefined && game.team_score !== game.opponent_score
  );
  const results = completed.map(
    (game) => game.result || resultFromScores(game.team_score ?? null, game.opponent_score ?? null)
  ).filter(
    (result): result is "W" | "L" => result === "W" || result === "L"
  );
  const pointsFor = completed.reduce((sum, game) => sum + Number(game.team_score || 0), 0);
  const pointsAgainst = completed.reduce(
    (sum, game) => sum + Number(game.opponent_score || 0),
    0
  );
  const wins = results.filter((result) => result === "W").length;
  const losses = results.filter((result) => result === "L").length;
  const current = results[0];
  let streakLength = 0;
  if (current) {
    for (const result of results) {
      if (result !== current) break;
      streakLength += 1;
    }
  }

  return {
    played: completed.length,
    wins,
    losses,
    pointsFor,
    pointsAgainst,
    averagePoints: completed.length ? pointsFor / completed.length : 0,
    averageAllowed: completed.length ? pointsAgainst / completed.length : 0,
    pointDifference: pointsFor - pointsAgainst,
    winPercentage: completed.length ? (wins / completed.length) * 100 : 0,
    currentStreak: current ? `${streakLength}${current}` : "—",
    lastFive: results.slice(0, 5),
  };
}

export async function loadPublicTeamProfiles(): Promise<TeamProfile[]> {
  const result = await supabase
    .from("team_profiles")
    .select("*")
    .eq("is_public", true)
    .order("display_order", { ascending: true });

  const profiles = result.error ? [] : ((result.data || []) as TeamProfile[]);
  const hasFacktsProfile = profiles.some(
    (profile) => profile.slug === FACKTS_AFRICA_TEAM.slug
  );

  return (hasFacktsProfile ? profiles : [FACKTS_AFRICA_TEAM, ...profiles]).sort(
    sortProfiles
  );
}

async function loadDefaultFacktsRoster(): Promise<TeamMember[]> {
  const result = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (result.error) return [];

  return ((result.data || []) as Record<string, unknown>[])
    .filter((player) => {
      const type = String(player.player_type || "");
      const role = String(player.role || "").toLowerCase();
      return type ? type === "fackts_player" : !role.includes("guest");
    })
    .map((player) => ({
      id: `player-${String(player.id)}`,
      player_id: String(player.id),
      display_name: teamName(player),
      nickname: player.nickname ? String(player.nickname) : null,
      jersey_number:
        typeof player.jersey_number === "number" ||
        typeof player.jersey_number === "string"
          ? player.jersey_number
          : null,
      position: player.position ? String(player.position) : null,
      role: player.role ? String(player.role) : "Player",
      photo_url: player.photo_url ? String(player.photo_url) : null,
      profile_href: `/players/${String(player.id)}`,
      status: "active",
    }));
}

async function loadAllPublicGames() {
  const result = await supabase
    .from("games")
    .select("*")
    .neq("is_public", false)
    .order("game_date", { ascending: false })
    .limit(250);

  if (result.error) {
    const legacyResult = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false })
      .limit(250);
    return legacyResult.error ? [] : ((legacyResult.data || []) as LinkedGameRecord[]);
  }

  return (result.data || []) as LinkedGameRecord[];
}

async function loadEvents(
  profile: TeamProfile,
  links: TeamEventLinkRow[],
  games: TeamGame[]
): Promise<TeamEvent[]> {
  const eventIds = [
    ...new Set(
      [...links.map((link) => link.event_id), ...games.map((game) => game.event_id)]
        .filter((value): value is string => Boolean(value))
    ),
  ];
  const eventRows = new Map<string, Record<string, unknown>>();
  const eventFields =
    "event_id,title,slug,summary,start_date,end_date,venue,location,poster_url,hero_image_url";

  if (eventIds.length) {
    const result = await supabase
      .from("event_case_studies")
      .select(eventFields)
      .in("event_id", eventIds)
      .eq("is_public", true);

    if (!result.error) {
      ((result.data || []) as Array<Record<string, unknown>>).forEach((event) => {
        eventRows.set(String(event.event_id), event);
      });
    }
  }

  if (profile.slug === FACKTS_AFRICA_TEAM.slug) {
    const healthCupResult = await supabase
      .from("event_case_studies")
      .select(eventFields)
      .eq("slug", HEALTH_CHECKUP_CUP_SLUG)
      .eq("is_public", true)
      .maybeSingle();

    if (!healthCupResult.error && healthCupResult.data) {
      const event = healthCupResult.data as Record<string, unknown>;
      eventRows.set(String(event.event_id), event);
    }
  }

  const linkMap = new Map(links.map((link) => [link.event_id, link]));

  return Array.from(eventRows.values())
    .map((event) => {
      const eventId = String(event.event_id);
      const link = linkMap.get(eventId);
      return {
        id: link?.id || `derived-${eventId}`,
        event_id: eventId,
        title: String(event.title || "Basketball event"),
        slug: String(event.slug || eventId),
        summary: event.summary ? String(event.summary) : null,
        start_date: event.start_date ? String(event.start_date) : null,
        end_date: event.end_date ? String(event.end_date) : null,
        venue: event.venue ? String(event.venue) : null,
        location: event.location ? String(event.location) : null,
        poster_url: event.poster_url ? String(event.poster_url) : null,
        hero_image_url: event.hero_image_url ? String(event.hero_image_url) : null,
        participation_status: link?.participation_status || "recorded",
        division: link?.division || null,
        final_position: link?.final_position || null,
      };
    })
    .sort((left, right) => timeValue(right.start_date) - timeValue(left.start_date));
}

function buildCompetitionRecords(
  profile: TeamProfile,
  events: TeamEvent[],
  leagueMemberships: TeamLeagueMembership[]
): TeamCompetitionRecord[] {
  const leagueRecords = leagueMemberships.map(
    (membership): TeamCompetitionRecord => ({
      id: membership.id,
      title: membership.league.name,
      href: `/leagues/${membership.league.slug}`,
      summary: membership.league.description || `${membership.division} league record and public standings.`,
      record_type: "league",
      status: `${membership.season_label} · ${membership.status}`,
      division: membership.division,
      image_url: membership.league.cover_image_url || membership.league.logo_url || null,
    })
  );
  const eventRecords = events.map(
    (event): TeamCompetitionRecord => ({
      id: event.id,
      title: event.title,
      href: `/events/${event.slug}`,
      summary:
        event.summary ||
        [event.venue, event.location].filter(Boolean).join(" · ") ||
        "Published FACKTS event record.",
      record_type: "event",
      status: event.participation_status || "Recorded",
      division: event.division || null,
      final_position: event.final_position || null,
      start_date: event.start_date || null,
      image_url: event.hero_image_url || event.poster_url || null,
    })
  );

  if (profile.slug !== FACKTS_AFRICA_TEAM.slug) return [...leagueRecords, ...eventRecords];

  const healthCup = eventRecords.find(
    (record) => record.href === `/events/${HEALTH_CHECKUP_CUP_SLUG}`
  );
  const otherEvents = eventRecords.filter(
    (record) => record.href !== `/events/${HEALTH_CHECKUP_CUP_SLUG}`
  );

  return [
    ...leagueRecords,
    FACKTS_KINGS_RECORD,
    healthCup || HEALTH_CHECKUP_CUP_RECORD,
    ...otherEvents,
  ];
}

export async function loadTeamDirectory(): Promise<TeamDirectoryItem[]> {
  const profiles = await loadPublicTeamProfiles();
  const allGames = await loadAllPublicGames();
  const bundles = await Promise.all(
    profiles.map((profile) => loadTeamProfileBundle(profile.slug, allGames))
  );

  return profiles.map((profile, index) => {
    const bundle = bundles[index];
    if (bundle) {
      return {
        profile: bundle.profile,
        rosterCount: bundle.roster.length,
        gameCount: bundle.games.length,
        leagueCount: bundle.leagueMemberships.length,
        eventCount: bundle.events.length,
        mediaCount: bundle.media.length,
        latestGame: bundle.games.find((game) => game.result) || bundle.games[0] || null,
        performance: bundle.performance,
      };
    }

    const directGames = allGames
      .map((game) => gameFromPublicRecord(game, profile))
      .filter((game): game is TeamGame => Boolean(game));
    return {
      profile,
      rosterCount: 0,
      gameCount: directGames.length,
      leagueCount: 0,
      eventCount: new Set(directGames.map((game) => game.event_id).filter(Boolean)).size,
      mediaCount: 0,
      latestGame: directGames.find((game) => game.result) || directGames[0] || null,
      performance: calculateTeamPerformance(directGames),
    };
  });
}

export async function loadTeamProfileBundle(
  slug: string,
  preloadedGames?: LinkedGameRecord[]
): Promise<TeamProfileBundle | null> {
  const profileResult = await supabase
    .from("team_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  const databaseProfile = profileResult.error
    ? null
    : ((profileResult.data || null) as TeamProfile | null);
  const profile =
    databaseProfile ||
    (slug === FACKTS_AFRICA_TEAM.slug ? FACKTS_AFRICA_TEAM : null);

  if (!profile) return null;

  const hasDatabaseProfile = profile.id !== FALLBACK_TEAM_ID;
  const allGamesPromise = preloadedGames
    ? Promise.resolve(preloadedGames)
    : loadAllPublicGames();
  const [membersResult, gamesResult, trainingResult, mediaResult, eventLinksResult, leagueMembershipsResult, allGames] =
    await Promise.all([
      hasDatabaseProfile
        ? supabase
            .from("team_roster_members")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .in("status", ["active", "alumni"])
            .order("display_order", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      hasDatabaseProfile
        ? supabase
            .from("team_games")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .order("game_date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      hasDatabaseProfile
        ? supabase
            .from("team_training_sessions")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .order("session_date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      hasDatabaseProfile
        ? supabase
            .from("team_media")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .order("published_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      hasDatabaseProfile
        ? supabase
            .from("team_event_links")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
        : Promise.resolve({ data: [], error: null }),
      hasDatabaseProfile
        ? supabase
            .from("team_league_memberships")
            .select("*,leagues(id,slug,name,short_name,description,logo_url,cover_image_url)")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .neq("status", "withdrawn")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      allGamesPromise,
    ]);

  let roster: TeamMember[] = membersResult.error
    ? []
    : ((membersResult.data || []) as TeamMember[]).map((member) => ({
        ...member,
        profile_href: member.player_id
          ? `/players/${member.player_id}`
          : member.guest_hooper_id
            ? `/players/guest-${member.guest_hooper_id}`
            : null,
      }));

  if (slug === FACKTS_AFRICA_TEAM.slug && roster.length === 0) {
    roster = await loadDefaultFacktsRoster();
  }

  const storedGames = gamesResult.error
    ? []
    : ((gamesResult.data || []) as TeamGameRow[]).map(normalizeStoredGame);
  const directGames = allGames
    .map((game) => gameFromPublicRecord(game, profile))
    .filter((game): game is TeamGame => Boolean(game));
  const games = mergeGames(storedGames, directGames);
  const eventLinks = eventLinksResult.error
    ? []
    : ((eventLinksResult.data || []) as TeamEventLinkRow[]);
  const events = await loadEvents(profile, eventLinks, games);
  const leagueMemberships: TeamLeagueMembership[] = leagueMembershipsResult.error
    ? []
    : ((leagueMembershipsResult.data || []) as Array<Record<string, unknown>>).flatMap((row) => {
        const related = Array.isArray(row.leagues) ? row.leagues[0] : row.leagues;
        if (!related || typeof related !== "object") return [];
        const league = related as TeamLeagueMembership["league"];
        if (!league.slug || !league.name) return [];
        return [{
          id: String(row.id),
          season_label: String(row.season_label || "Current season"),
          division: String(row.division || "Open"),
          conference: row.conference ? String(row.conference) : null,
          status: String(row.status || "active"),
          league,
        }];
      });
  const competitionRecords = buildCompetitionRecords(profile, events, leagueMemberships);

  return {
    profile:
      slug === FACKTS_AFRICA_TEAM.slug
        ? { ...FACKTS_AFRICA_TEAM, ...profile }
        : profile,
    roster,
    games,
    training: trainingResult.error
      ? []
      : ((trainingResult.data || []) as TrainingSession[]),
    media: mediaResult.error
      ? []
      : ((mediaResult.data || []) as TeamMedia[]),
    events,
    competitionRecords,
    leagueMemberships,
    performance: calculateTeamPerformance(games),
    canClaim: hasDatabaseProfile,
  };
}
