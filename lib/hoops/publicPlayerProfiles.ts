import { supabase } from "@/lib/supabase";
import {
  getCareerGameTotals,
  mergeCareerGameStats,
  type CareerGameStatRow,
} from "@/lib/hoops/careerStats";
import {
  canonicalCompetitionName,
  getCompetition,
  getGameDate,
  getGameTitle,
  getLocation,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";
import {
  EXTERNAL_PLAYER_TYPE,
  isOfficialFacktsPlayer,
} from "@/lib/hoops/playerClassification";

type SourceRow = Record<string, unknown> & {
  id: string;
  source_player_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  player_type?: string | null;
  guest_type?: string | null;
  role?: string | null;
  position?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  cover_image_url?: string | null;
  profile_headline?: string | null;
  profile_status?: string | null;
  verification_status?: string | null;
  consent_status?: string | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  jersey_number?: string | number | null;
  current_team?: string | null;
  location?: string | null;
  bio?: string | null;
  notes?: string | null;
  style_of_play?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  achievements?: string | null;
  highlight_url?: string | null;
};

type StatRow = CareerGameStatRow & {
  id?: string | null;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  plus_minus?: number | string | null;
  turnovers?: number | string | null;
  fouls?: number | string | null;
  minutes?: number | string | null;
  minutes_played?: number | string | null;
  player_of_game?: boolean | null;
  is_homepage_pog?: boolean | null;
  is_player_of_the_game?: boolean | null;
  highlight_url?: string | null;
  created_at?: string | null;
};

type OneOnOneRow = Record<string, unknown> & {
  id: string;
  competition_slug?: string | null;
  season_label?: string | null;
  verification_status?: string | null;
  is_public?: boolean | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  participant_name?: string | null;
  opponent_name?: string | null;
  match_title?: string | null;
  match_date?: string | null;
  created_at?: string | null;
  venue?: string | null;
  location?: string | null;
  status?: string | null;
  result?: string | null;
  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  video_url?: string | null;
  highlight_url?: string | null;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  status?: string | null;
  is_public?: boolean | null;
  joined_at?: string | null;
  left_at?: string | null;
};

type TeamRow = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  logo_url?: string | null;
};

type MediaRow = {
  id: string;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  title: string;
  media_type?: string | null;
  url: string;
  thumbnail_url?: string | null;
  rights_status?: string | null;
  publish_status?: string | null;
  is_public?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
};

type AchievementRow = {
  id: string;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  title: string;
  competition_name?: string | null;
  achievement_date?: string | null;
  description?: string | null;
  verification_status?: string | null;
  is_public?: boolean | null;
};

export type PublicPlayerDirectoryItem = {
  key: string;
  routeId: string;
  source: "player" | "guest";
  sourceId: string;
  name: string;
  nickname: string;
  jerseyNumber: string;
  position: string;
  role: string;
  classification: "official" | "guest" | "competition";
  classificationLabel: string;
  verificationStatus: string;
  photoUrl: string;
  photoPosition: string;
  currentTeam: string;
  location: string;
  featured: boolean;
  gamesPlayed: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  totalPoints: number;
  profileCompleteness: number;
};

export type PublicPlayerGameLog = {
  id: string;
  gameId: string;
  title: string;
  competition: string;
  date: string | null;
  venue: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  plusMinus: number;
  minutes: number | null;
  playerOfGame: boolean;
  highlightUrl: string;
};

export type PublicPlayerCompetition = {
  name: string;
  games: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  totalPoints: number;
};

export type PublicPlayerTeam = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logoUrl: string;
  status: string;
};

export type PublicPlayerMedia = {
  id: string;
  title: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string;
  rightsStatus?: string;
};

export type PublicPlayerAchievement = {
  id: string;
  title: string;
  competition: string;
  date: string | null;
  description: string;
  verificationStatus: string;
};

export type PublicPlayerOneOnOne = {
  id: string;
  href: string;
  title: string;
  competition: string;
  seasonLabel: string;
  verificationStatus: string;
  opponent: string;
  date: string | null;
  venue: string;
  ownScore: number | null;
  opponentScore: number | null;
  result: "Win" | "Loss" | "Draw" | "Upcoming";
  hasMedia: boolean;
};

export type PublicPlayerProfile = PublicPlayerDirectoryItem & {
  record: SourceRow;
  coverImageUrl: string;
  headline: string;
  about: string;
  consentStatus: string;
  profileStatus: string;
  teams: PublicPlayerTeam[];
  games: PublicPlayerGameLog[];
  competitions: PublicPlayerCompetition[];
  media: PublicPlayerMedia[];
  achievements: PublicPlayerAchievement[];
  oneOnOne: PublicPlayerOneOnOne[];
  career: {
    games: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    threes: number;
    ppg: number;
    rpg: number;
    apg: number;
    spg: number;
    bpg: number;
  };
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function personName(row?: SourceRow | null) {
  return text(row?.full_name) || text(row?.name) || text(row?.nickname) || "Unnamed player";
}

function cleanName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function average(value: number, games: number) {
  return games > 0 ? Number((value / games).toFixed(1)) : 0;
}

function isPublished(row: SourceRow) {
  return !["draft", "hidden"].includes(text(row.profile_status).toLowerCase());
}

function classificationFor(row: SourceRow, source: "player" | "guest") {
  if (source === "player" && isOfficialFacktsPlayer(row)) {
    return {
      key: "official" as const,
      label: "Official FACKTS Player",
    };
  }

  const type = text(row.guest_type || row.player_type);
  if (type === EXTERNAL_PLAYER_TYPE || type === "external_player") {
    return { key: "competition" as const, label: "Competition Player" };
  }

  return { key: "guest" as const, label: "Guest Hooper" };
}

function verificationStatus(row: SourceRow) {
  const status = text(row.verification_status).toLowerCase();
  return ["verified", "pending", "disputed"].includes(status)
    ? status
    : "unverified";
}

function completeness(row: SourceRow, games: number) {
  const checks = [
    personName(row) !== "Unnamed player",
    Boolean(text(row.photo_url)),
    Boolean(text(row.position)),
    Boolean(text(row.bio || row.notes)),
    Boolean(text(row.current_team)),
    Boolean(text(row.location)),
    Boolean(text(row.profile_headline)),
    games > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function directoryItem(
  row: SourceRow,
  source: "player" | "guest",
  careerRows: CareerGameStatRow[]
): PublicPlayerDirectoryItem {
  const totals = getCareerGameTotals(careerRows);
  const classification = classificationFor(row, source);
  const routeId = source === "guest" ? `guest-${row.id}` : row.id;

  return {
    key: `${source}:${row.id}`,
    routeId,
    source,
    sourceId: row.id,
    name: personName(row),
    nickname: text(row.nickname),
    jerseyNumber: text(row.jersey_number),
    position: text(row.position) || "Position not listed",
    role: text(row.role) || classification.label,
    classification: classification.key,
    classificationLabel: classification.label,
    verificationStatus: verificationStatus(row),
    photoUrl: text(row.photo_url),
    photoPosition: text(row.photo_position) || "center center",
    currentTeam: text(row.current_team),
    location: text(row.location),
    featured: Boolean(row.is_featured),
    gamesPlayed: totals.gamesPlayed,
    pointsPerGame: average(totals.points, totals.gamesPlayed),
    reboundsPerGame: average(totals.rebounds, totals.gamesPlayed),
    assistsPerGame: average(totals.assists, totals.gamesPlayed),
    stealsPerGame: average(totals.steals, totals.gamesPlayed),
    totalPoints: totals.points,
    profileCompleteness: completeness(row, totals.gamesPlayed),
  };
}

async function loadSourceRows() {
  const [playersResult, guestsResult, playerStatsResult, guestStatsResult] =
    await Promise.all([
      supabase.from("players").select("*").eq("is_active", true),
      supabase.from("guest_hoopers").select("*"),
      supabase.from("player_game_stats").select("*"),
      supabase.from("guest_game_stats").select("*"),
    ]);

  return {
    players: playersResult.error ? [] : ((playersResult.data || []) as SourceRow[]),
    guests: guestsResult.error ? [] : ((guestsResult.data || []) as SourceRow[]),
    playerStats: playerStatsResult.error ? [] : ((playerStatsResult.data || []) as StatRow[]),
    guestStats: guestStatsResult.error ? [] : ((guestStatsResult.data || []) as StatRow[]),
  };
}

export async function loadPublicPlayerDirectory(): Promise<PublicPlayerDirectoryItem[]> {
  const { players, guests, playerStats, guestStats } = await loadSourceRows();
  const officialPlayers = players.filter(
    (player) => isOfficialFacktsPlayer(player) && isPublished(player)
  );
  const officialIds = new Set(officialPlayers.map((player) => String(player.id)));
  const items: PublicPlayerDirectoryItem[] = [];

  for (const player of officialPlayers) {
    const linkedGuestIds = guests
      .filter((guest) => String(guest.source_player_id || "") === String(player.id))
      .map((guest) => String(guest.id));
    const careerRows = mergeCareerGameStats(
      playerStats.filter((row) => String(row.player_id) === String(player.id)),
      guestStats.filter((row) => linkedGuestIds.includes(String(row.guest_hooper_id)))
    );
    items.push(directoryItem(player, "player", careerRows));
  }

  for (const guest of guests) {
    if (guest.is_active === false || !isPublished(guest)) continue;
    if (guest.source_player_id && officialIds.has(String(guest.source_player_id))) continue;

    const playerRows = guest.source_player_id
      ? playerStats.filter(
          (row) => String(row.player_id) === String(guest.source_player_id)
        )
      : [];
    const careerRows = mergeCareerGameStats(
      guestStats.filter(
        (row) => String(row.guest_hooper_id) === String(guest.id)
      ),
      playerRows
    );
    items.push(directoryItem(guest, "guest", careerRows));
  }

  return items.sort((left, right) =>
    left.featured === right.featured
      ? left.name.localeCompare(right.name)
      : left.featured
        ? -1
        : 1
  );
}

function parseRouteId(routeId: string) {
  if (routeId.startsWith("guest-")) {
    return { source: "guest" as const, id: routeId.slice("guest-".length) };
  }
  if (routeId.startsWith("player-")) {
    return { source: "player" as const, id: routeId.slice("player-".length) };
  }
  return { source: "player" as const, id: routeId };
}

function idsForPerson(person: SourceRow, players: SourceRow[], guests: SourceRow[]) {
  const playerIds = new Set<string>();
  const guestIds = new Set<string>();
  const normalizedName = cleanName(personName(person));

  if (players.some((row) => row.id === person.id)) playerIds.add(person.id);
  if (guests.some((row) => row.id === person.id)) guestIds.add(person.id);
  if (person.source_player_id) playerIds.add(String(person.source_player_id));

  guests.forEach((guest) => {
    const sameSource = Boolean(
      guest.source_player_id && playerIds.has(String(guest.source_player_id))
    );
    const legacyNameMatch =
      !guest.source_player_id &&
      normalizedName !== "" &&
      cleanName(personName(guest)) === normalizedName;
    if (sameSource || legacyNameMatch) guestIds.add(String(guest.id));
  });

  players.forEach((player) => {
    const linked = guests.some(
      (guest) =>
        guestIds.has(String(guest.id)) &&
        String(guest.source_player_id || "") === String(player.id)
    );
    if (linked) playerIds.add(String(player.id));
  });

  return { playerIds, guestIds };
}

function eventTitleMap(rows: Record<string, unknown>[]) {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    const id = text(row.event_id);
    if (id) map.set(id, text(row.title) || "FACKTS event");
  });
  return map;
}

function oneOnOneView(
  row: OneOnOneRow,
  playerIds: Set<string>,
  guestIds: Set<string>,
  playerMap: Map<string, SourceRow>,
  guestMap: Map<string, SourceRow>,
  profileName: string
): PublicPlayerOneOnOne | null {
  if (row.is_public === false) return null;
  const competitionSlug = text(row.competition_slug) || "fackts-kings";
  if (competitionSlug !== "fackts-kings") return null;

  const participant = Boolean(
    (row.fackts_player_id && playerIds.has(String(row.fackts_player_id))) ||
      (row.guest_hooper_id && guestIds.has(String(row.guest_hooper_id)))
  );
  const opponentSide = Boolean(
    (row.opponent_player_id && playerIds.has(String(row.opponent_player_id))) ||
      (row.opponent_guest_hooper_id && guestIds.has(String(row.opponent_guest_hooper_id)))
  );
  if (!participant && !opponentSide) return null;

  const first =
    (row.fackts_player_id && playerMap.get(String(row.fackts_player_id))) ||
    (row.guest_hooper_id && guestMap.get(String(row.guest_hooper_id))) ||
    null;
  const second =
    (row.opponent_player_id && playerMap.get(String(row.opponent_player_id))) ||
    (row.opponent_guest_hooper_id && guestMap.get(String(row.opponent_guest_hooper_id))) ||
    null;
  const opponent = participant
    ? personName(second) !== "Unnamed player"
      ? personName(second)
      : text(row.opponent_name) || "Opponent"
    : personName(first) !== "Unnamed player"
      ? personName(first)
      : text(row.participant_name) || "Opponent";
  const firstScore = nullableNumber(row.points_scored);
  const secondScore = nullableNumber(row.points_allowed);
  const ownScore = participant ? firstScore : secondScore;
  const opponentScore = participant ? secondScore : firstScore;
  const status = text(row.status).toLowerCase();
  const completed =
    ownScore !== null &&
    opponentScore !== null &&
    !["upcoming", "pending", "scheduled", "cancelled"].includes(status);
  let result: PublicPlayerOneOnOne["result"] = "Upcoming";

  if (completed) {
    result = ownScore > opponentScore ? "Win" : ownScore < opponentScore ? "Loss" : "Draw";
  } else if (!["upcoming", "pending", "scheduled", "cancelled"].includes(status)) {
    const stored = text(row.result).toLowerCase();
    if (stored === "draw") result = "Draw";
    if (["win", "won"].includes(stored)) result = participant ? "Win" : "Loss";
    if (["loss", "lost"].includes(stored)) result = participant ? "Loss" : "Win";
  }

  return {
    id: row.id,
    href: `/competitions/fackts-kings/matches/${row.id}`,
    title: text(row.match_title) || `${profileName} vs ${opponent}`,
    competition: "FACKTS Kings",
    seasonLabel: text(row.season_label) || "2026",
    verificationStatus: text(row.verification_status) || "pending",
    opponent,
    date: text(row.match_date || row.created_at) || null,
    venue: text(row.venue || row.location) || "Venue not recorded",
    ownScore,
    opponentScore,
    result,
    hasMedia: Boolean(text(row.video_url || row.highlight_url)),
  };
}

export async function loadPublicPlayerProfile(
  routeId: string
): Promise<PublicPlayerProfile | null> {
  const route = parseRouteId(routeId);
  const { players, guests, playerStats, guestStats } = await loadSourceRows();
  let person =
    route.source === "guest"
      ? guests.find((row) => String(row.id) === String(route.id)) || null
      : players.find((row) => String(row.id) === String(route.id)) || null;
  let source: "player" | "guest" = route.source;

  if (!person && route.source === "player") {
    person =
      guests.find(
        (row) => String(row.source_player_id || "") === String(route.id)
      ) || null;
    if (person) source = "guest";
  }

  if (!person || person.is_active === false || !isPublished(person)) return null;

  if (source === "player" && !isOfficialFacktsPlayer(person)) {
    const linkedGuest = guests.find(
      (row) => String(row.source_player_id || "") === String(person?.id)
    );
    if (linkedGuest) {
      person = linkedGuest;
      source = "guest";
    }
  }

  const { playerIds, guestIds } = idsForPerson(person, players, guests);
  const relevantPlayerStats = playerStats.filter(
    (row) => row.player_id && playerIds.has(String(row.player_id))
  );
  const relevantGuestStats = guestStats.filter(
    (row) => row.guest_hooper_id && guestIds.has(String(row.guest_hooper_id))
  );
  const careerRows = mergeCareerGameStats(
    relevantGuestStats,
    relevantPlayerStats
  ) as StatRow[];
  const item = directoryItem(person, source, careerRows);
  const gameIds = Array.from(
    new Set(careerRows.map((row) => text(row.game_id)).filter(Boolean))
  );

  const [gamesResult, eventsResult, membersResult, teamsResult, mediaResult, achievementsResult, oneOnOneResult] =
    await Promise.all([
      gameIds.length
        ? supabase.from("games").select("*").in("id", gameIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("event_case_studies").select("event_id,title,slug").eq("is_public", true),
      supabase.from("team_roster_members").select("*").eq("is_public", true),
      supabase.from("team_profiles").select("id,slug,name,short_name,logo_url").eq("is_public", true),
      supabase.from("player_media").select("*").eq("is_public", true).eq("publish_status", "published"),
      supabase.from("player_achievements").select("*").eq("is_public", true),
      supabase.from("guest_one_on_one_stats").select("*").order("match_date", { ascending: false }),
    ]);

  const games = gamesResult.error ? [] : ((gamesResult.data || []) as GameRecord[]);
  const gameMap = new Map(games.map((game) => [String(game.id), game]));
  const events = eventsResult.error
    ? []
    : ((eventsResult.data || []) as Record<string, unknown>[]);
  const eventsById = eventTitleMap(events);
  const gameLog = careerRows
    .map((row, index): PublicPlayerGameLog => {
      const gameId = text(row.game_id);
      const game = gameMap.get(gameId) || ({ id: gameId } as GameRecord);
      const eventName = game.event_id ? eventsById.get(String(game.event_id)) : "";
      return {
        id: text(row.id) || `${gameId || "game"}-${index}`,
        gameId,
        title: getGameTitle(game),
        competition: canonicalCompetitionName(eventName || getCompetition(game)),
        date: getGameDate(game),
        venue: getLocation(game),
        points: numberValue(row.points),
        rebounds: numberValue(row.rebounds),
        assists: numberValue(row.assists),
        steals: numberValue(row.steals),
        blocks: numberValue(row.blocks),
        turnovers: numberValue(row.turnovers),
        plusMinus: numberValue(row.plus_minus),
        minutes:
          row.minutes !== null && row.minutes !== undefined
            ? numberValue(row.minutes)
            : row.minutes_played !== null && row.minutes_played !== undefined
              ? numberValue(row.minutes_played)
              : null,
        playerOfGame: Boolean(
          row.player_of_game || row.is_homepage_pog || row.is_player_of_the_game
        ),
        highlightUrl: text(row.highlight_url),
      };
    })
    .sort((left, right) =>
      String(right.date || "").localeCompare(String(left.date || ""))
    );

  const competitionGroups = new Map<
    string,
    { name: string; rows: PublicPlayerGameLog[] }
  >();
  gameLog.forEach((game) => {
    const name = canonicalCompetitionName(game.competition);
    const identity = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const existing = competitionGroups.get(identity);
    competitionGroups.set(identity, {
      name: existing?.name || name,
      rows: [...(existing?.rows || []), game],
    });
  });
  const competitions = Array.from(competitionGroups.values()).map(
    ({ name, rows }): PublicPlayerCompetition => {
      const gamesCount = rows.length;
      const points = rows.reduce((sum, row) => sum + row.points, 0);
      const rebounds = rows.reduce((sum, row) => sum + row.rebounds, 0);
      const assists = rows.reduce((sum, row) => sum + row.assists, 0);
      return {
        name,
        games: gamesCount,
        pointsPerGame: average(points, gamesCount),
        reboundsPerGame: average(rebounds, gamesCount),
        assistsPerGame: average(assists, gamesCount),
        totalPoints: points,
      };
    }
  );

  const members = membersResult.error
    ? []
    : ((membersResult.data || []) as TeamMemberRow[]).filter(
        (member) =>
          (member.player_id && playerIds.has(String(member.player_id))) ||
          (member.guest_hooper_id && guestIds.has(String(member.guest_hooper_id)))
      );
  const teamMap = new Map(
    (teamsResult.error ? [] : ((teamsResult.data || []) as TeamRow[])).map((team) => [team.id, team])
  );
  const teamProfiles = members
    .map((member): PublicPlayerTeam | null => {
      const team = teamMap.get(member.team_id);
      if (!team) return null;
      return {
        id: team.id,
        name: team.name,
        shortName: text(team.short_name) || team.name,
        slug: team.slug,
        logoUrl: text(team.logo_url),
        status: text(member.status) || "active",
      };
    })
    .filter((team): team is PublicPlayerTeam => Boolean(team));

  const databaseMedia = (mediaResult.error ? [] : ((mediaResult.data || []) as MediaRow[]))
    .filter(
      (row) =>
        (row.player_id && playerIds.has(String(row.player_id))) ||
        (row.guest_hooper_id && guestIds.has(String(row.guest_hooper_id)))
    )
    .map((row): PublicPlayerMedia => ({
      id: row.id,
      title: row.title,
      mediaType: text(row.media_type) || "Player media",
      url: row.url,
      thumbnailUrl: text(row.thumbnail_url) || text(person.photo_url),
      rightsStatus: text(row.rights_status) || undefined,
    }));
  const mediaUrls = new Set(databaseMedia.map((row) => row.url));
  const media = [...databaseMedia];
  const fallbackMedia = [
    { id: "profile-highlight", url: text(person.highlight_url), title: `${personName(person)} highlights`, type: "Highlights" },
    ...gameLog.map((game) => ({ id: `game-${game.id}`, url: game.highlightUrl, title: `${game.title} highlights`, type: "Game highlight" })),
  ];
  fallbackMedia.forEach((row) => {
    if (!row.url || mediaUrls.has(row.url)) return;
    mediaUrls.add(row.url);
    media.push({
      id: row.id,
      title: row.title,
      mediaType: row.type,
      url: row.url,
      thumbnailUrl: text(person.photo_url),
    });
  });

  const achievements = (achievementsResult.error
    ? []
    : ((achievementsResult.data || []) as AchievementRow[])
  )
    .filter(
      (row) =>
        (row.player_id && playerIds.has(String(row.player_id))) ||
        (row.guest_hooper_id && guestIds.has(String(row.guest_hooper_id)))
    )
    .map((row): PublicPlayerAchievement => ({
      id: row.id,
      title: row.title,
      competition: text(row.competition_name),
      date: text(row.achievement_date) || null,
      description: text(row.description),
      verificationStatus: text(row.verification_status) || "unverified",
    }));
  if (!achievements.length && text(person.achievements)) {
    text(person.achievements)
      .split(/[\n|]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((title, index) => {
        achievements.push({
          id: `legacy-achievement-${index}`,
          title,
          competition: "",
          date: null,
          description: "",
          verificationStatus: "unverified",
        });
      });
  }

  const playerMap = new Map(players.map((row) => [String(row.id), row]));
  const guestMap = new Map(guests.map((row) => [String(row.id), row]));
  const oneOnOne = (oneOnOneResult.error
    ? []
    : ((oneOnOneResult.data || []) as OneOnOneRow[])
  )
    .map((row) =>
      oneOnOneView(
        row,
        playerIds,
        guestIds,
        playerMap,
        guestMap,
        personName(person)
      )
    )
    .filter((row): row is PublicPlayerOneOnOne => Boolean(row));

  const totals = getCareerGameTotals(careerRows);
  return {
    ...item,
    record: person,
    coverImageUrl: text(person.cover_image_url),
    headline: text(person.profile_headline),
    about:
      text(person.bio) ||
      text(person.notes) ||
      text(person.style_of_play) ||
      "This player profile is being completed.",
    consentStatus: text(person.consent_status) || "not_recorded",
    profileStatus: text(person.profile_status) || "published",
    teams: teamProfiles,
    games: gameLog,
    competitions,
    media,
    achievements,
    oneOnOne,
    career: {
      games: totals.gamesPlayed,
      points: totals.points,
      rebounds: totals.rebounds,
      assists: totals.assists,
      steals: totals.steals,
      blocks: totals.blocks,
      threes: totals.threePointersMade,
      ppg: average(totals.points, totals.gamesPlayed),
      rpg: average(totals.rebounds, totals.gamesPlayed),
      apg: average(totals.assists, totals.gamesPlayed),
      spg: average(totals.steals, totals.gamesPlayed),
      bpg: average(totals.blocks, totals.gamesPlayed),
    },
  };
}
