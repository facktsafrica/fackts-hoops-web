import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SearchGroup =
  | "Players"
  | "Teams"
  | "Games"
  | "Competitions"
  | "Events"
  | "Media"
  | "Partners";

type SearchResult = {
  id: string;
  type: string;
  group: SearchGroup;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string;
  score: number;
};

type SearchRow = Record<string, unknown> & { id?: string | number | null };

const text = (...values: unknown[]) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .join(" ")
    .trim();

const value = (...values: unknown[]) => {
  for (const item of values) {
    if (item === null || item === undefined) continue;
    const clean = String(item).trim();
    if (clean) return clean;
  }
  return "";
};

const normalize = (input: unknown) =>
  String(input ?? "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function isPublished(row: SearchRow) {
  const state = value(row.publish_status, row.profile_status, row.status).toLowerCase();
  return (
    row.is_public !== false &&
    row.is_active !== false &&
    !["draft", "hidden", "private", "archived"].includes(state)
  );
}

function relevance(query: string, title: string, searchable: string, group: SearchGroup) {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(title);
  const normalizedSearchable = normalize(searchable);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  let score = 0;

  if (normalizedTitle === normalizedQuery) score += 180;
  else if (normalizedTitle.startsWith(normalizedQuery)) score += 125;
  else if (normalizedTitle.includes(normalizedQuery)) score += 95;

  if (normalizedSearchable.includes(normalizedQuery)) score += 55;
  score += tokens.filter((token) => normalizedSearchable.includes(token)).length * 14;
  if (tokens.length && tokens.every((token) => normalizedSearchable.includes(token))) score += 30;

  const groupBoost: Record<SearchGroup, number> = {
    Players: 12,
    Teams: 11,
    Games: 10,
    Competitions: 9,
    Events: 8,
    Media: 7,
    Partners: 6,
  };

  return score + groupBoost[group];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 36);
  const limit = Math.min(80, Math.max(8, Number.isFinite(requestedLimit) ? requestedLimit : 36));

  if (query.length < 2) {
    return NextResponse.json({ query, results: [], totals: {} });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ query, results: [], totals: {} });
  }

  const db = createClient(url, key);
  const [
    players,
    guests,
    teams,
    games,
    battles,
    competitions,
    events,
    records,
    partners,
    mediaStories,
    gameMedia,
    playerMedia,
    teamMedia,
  ] = await Promise.all([
    db.from("players").select("*").limit(500),
    db.from("guest_hoopers").select("*").limit(500),
    db.from("team_profiles").select("*").eq("is_public", true).limit(300),
    db.from("games").select("*").limit(500),
    db.from("guest_one_on_one_stats").select("*").limit(500),
    db.from("competitions").select("*").eq("is_public", true).limit(150),
    db.from("event_case_studies").select("*").eq("is_public", true).limit(150),
    db.from("event_records").select("*").eq("is_public", true).limit(700),
    db.from("partners").select("*").limit(250),
    db.from("media_stories").select("*").eq("is_active", true).limit(400),
    db.from("game_media").select("*").limit(600),
    db.from("player_media").select("*").limit(600),
    db.from("team_media").select("*").limit(600),
  ]);

  const playerRows = (players.data ?? []) as SearchRow[];
  const guestRows = (guests.data ?? []) as SearchRow[];
  const teamRows = (teams.data ?? []) as SearchRow[];
  const gameRows = (games.data ?? []) as SearchRow[];
  const eventRows = (events.data ?? []) as SearchRow[];
  const results: SearchResult[] = [];
  const officialIds = new Set(
    playerRows.filter(isPublished).map((player) => value(player.id)).filter(Boolean)
  );
  const playerById = new Map(playerRows.map((player) => [value(player.id), player]));
  const guestById = new Map(guestRows.map((guest) => [value(guest.id), guest]));
  const teamById = new Map(teamRows.map((team) => [value(team.id), team]));
  const gameById = new Map(gameRows.map((game) => [value(game.id), game]));
  const eventById = new Map(
    eventRows.map((event) => [value(event.event_id, event.id), event])
  );

  function addResult(input: Omit<SearchResult, "score">, keywords: unknown[]) {
    const searchable = text(input.title, input.subtitle, keywords);
    const score = relevance(query, input.title, searchable, input.group);
    if (score < 55) return;
    results.push({ ...input, score });
  }

  for (const player of playerRows) {
    if (!isPublished(player)) continue;
    const name = value(player.full_name, player.name, player.nickname, "Player");
    addResult(
      {
        id: `player-${value(player.id)}`,
        type: "Player",
        group: "Players",
        title: name,
        subtitle: text(player.nickname, player.position, player.current_team) || "Official player",
        href: `/players/${value(player.id)}`,
        imageUrl: value(player.photo_url, player.image_url),
      },
      [player.role, player.jersey_number, player.bio, player.location, player.style_of_play]
    );
  }

  for (const guest of guestRows) {
    if (!isPublished(guest)) continue;
    const sourcePlayerId = value(guest.source_player_id);
    if (sourcePlayerId && officialIds.has(sourcePlayerId)) continue;
    const name = value(guest.full_name, guest.name, guest.nickname, "Guest hooper");
    addResult(
      {
        id: `guest-${value(guest.id)}`,
        type: value(guest.guest_type).includes("competition") ? "Competition player" : "Guest hooper",
        group: "Players",
        title: name,
        subtitle: text(guest.nickname, guest.position, guest.current_team) || "Guest player",
        href: `/players/guest-${value(guest.id)}`,
        imageUrl: value(guest.photo_url, guest.image_url),
      },
      [guest.role, guest.jersey_number, guest.bio, guest.location, guest.notes]
    );
  }

  const hasFacktsTeam = teamRows.some((team) => value(team.slug) === "fackts-africa");
  const searchableTeams = hasFacktsTeam
    ? teamRows
    : [
        {
          id: "fackts-africa-fallback",
          slug: "fackts-africa",
          name: "FACKTS Africa",
          short_name: "FACKTS",
          aliases: ["FACKTS Hoops"],
          city: "Nairobi",
          country: "Kenya",
          logo_url: "/fackts-hoops-logo.png",
          is_public: true,
        },
        ...teamRows,
      ];

  for (const team of searchableTeams) {
    if (!isPublished(team)) continue;
    const name = value(team.name, team.short_name, "Basketball team");
    addResult(
      {
        id: `team-${value(team.id, team.slug)}`,
        type: "Team",
        group: "Teams",
        title: name,
        subtitle: text(team.short_name, team.division, team.city, team.country) || "Team profile",
        href: `/teams/${value(team.slug, team.id)}`,
        imageUrl: value(team.logo_url, team.cover_image_url, team.hero_image_url),
      },
      [team.aliases, team.organization_name, team.team_type, team.age_category, team.current_competition, team.coach_name]
    );
  }

  for (const battle of (battles.data ?? []) as SearchRow[]) {
    if (!isPublished(battle)) continue;
    const title = value(
      battle.match_title,
      `${value(battle.participant_name, "Player")} vs ${value(battle.opponent_name, "Player")}`
    );
    const isTakeover = normalize(text(battle.competition_slug, battle.competition_name, battle.match_type)).includes("court takeover");
    addResult(
      {
        id: `battle-${value(battle.id)}`,
        type: isTakeover ? "Court Takeover" : "FACKTS Kings",
        group: "Games",
        title,
        subtitle: text(battle.season_label || "2026", battle.match_number, battle.status, battle.venue),
        href: isTakeover
          ? `/competitions/court-takeovers#leaderboards`
          : `/competitions/fackts-kings/matches/${value(battle.id)}`,
        imageUrl: value(battle.poster_url, battle.image_url),
      },
      [battle.participant_name, battle.opponent_name, battle.location, battle.notes, battle.result]
    );
  }

  for (const game of gameRows) {
    if (!isPublished(game)) continue;
    const title = value(
      game.game_title,
      game.title,
      `${value(game.home_team_name, game.team_name, "FACKTS")} vs ${value(game.away_team_name, game.opponent_name, game.opponent, "Opponent")}`
    );
    addResult(
      {
        id: `game-${value(game.id)}`,
        type: "Game",
        group: "Games",
        title,
        subtitle: text(game.competition_name, game.status, game.venue || game.location),
        href: `/games/${value(game.id)}`,
        imageUrl: value(game.poster_url, game.image_url, game.cover_image_url),
      },
      [game.home_team_name, game.away_team_name, game.team_name, game.opponent_name, game.event_name, game.notes, game.game_format, game.match_type]
    );
  }

  const competitionRows = (competitions.data ?? []) as SearchRow[];
  const competitionFallbacks: SearchRow[] = [
    {
      id: "fackts-kings",
      slug: "fackts-kings",
      name: "FACKTS Kings",
      summary: "FACKTS one-on-one matchups, standings, results and media",
      current_season_label: "2026",
      is_public: true,
    },
    {
      id: "court-takeovers",
      slug: "court-takeovers",
      name: "Court Takeovers",
      summary: "Court Takeovers with High School and University divisions",
      is_public: true,
    },
  ].filter(
    (fallback) =>
      !competitionRows.some((row) => value(row.slug) === value(fallback.slug))
  );

  for (const competition of [...competitionRows, ...competitionFallbacks]) {
    if (!isPublished(competition)) continue;
    const title = value(competition.name, competition.short_name, "Competition");
    addResult(
      {
        id: `competition-${value(competition.id, competition.slug)}`,
        type: "Competition",
        group: "Competitions",
        title,
        subtitle: text(competition.current_season_label, competition.competition_format, competition.status),
        href: `/competitions/${value(competition.slug, competition.id)}`,
        imageUrl: value(competition.poster_url, competition.hero_image_url, competition.cover_image_url),
      },
      [competition.short_name, competition.summary, competition.organizer_name, competition.divisions]
    );
  }

  for (const event of eventRows) {
    if (!isPublished(event)) continue;
    const title = value(event.title, "FACKTS event");
    addResult(
      {
        id: `event-${value(event.event_id, event.id)}`,
        type: "Event",
        group: "Events",
        title,
        subtitle: text(event.status, event.venue, event.location),
        href: `/events/${value(event.slug, event.event_id, event.id)}`,
        imageUrl: value(event.poster_url, event.hero_image_url, event.cover_image_url),
      },
      [event.summary, event.organizer_name, event.event_type, event.start_date, event.end_date]
    );
  }

  for (const record of (records.data ?? []) as SearchRow[]) {
    if (!isPublished(record)) continue;
    const event = eventById.get(value(record.event_id));
    if (!event) continue;
    const recordType = value(record.record_type).toLowerCase();
    const isMedia = recordType === "media" || Boolean(value(record.url, record.video_url));
    const title = value(record.title, record.team_name, record.opponent_name, event.title, "Event record");
    addResult(
      {
        id: `record-${value(record.id)}`,
        type: isMedia ? "Event media" : recordType === "result" ? "Event game" : "Event record",
        group: isMedia ? "Media" : "Events",
        title,
        subtitle: `${value(event.title, "FACKTS event")}${record.subtitle ? ` · ${value(record.subtitle)}` : ""}`,
        href: isMedia
          ? `/media?q=${encodeURIComponent(title)}`
          : `/events/${value(event.slug, event.event_id, event.id)}?q=${encodeURIComponent(query)}`,
        imageUrl: value(record.thumbnail_url, record.image_url, event.poster_url, event.hero_image_url),
      },
      [record.subtitle, record.details, record.division, record.team_name, record.opponent_name, record.metadata]
    );
  }

  for (const partner of (partners.data ?? []) as SearchRow[]) {
    if (!isPublished(partner)) continue;
    const title = value(partner.name, "FACKTS partner");
    addResult(
      {
        id: `partner-${value(partner.id)}`,
        type: "Partner",
        group: "Partners",
        title,
        subtitle: text(partner.category, partner.role),
        href: `/partners/${value(partner.id)}`,
        imageUrl: value(partner.logo_url, partner.image_url),
      },
      [partner.description, partner.about, partner.services, partner.location]
    );
  }

  for (const item of (mediaStories.data ?? []) as SearchRow[]) {
    if (!isPublished(item)) continue;
    const title = value(item.title, item.label, "FACKTS media");
    addResult(
      {
        id: `media-story-${value(item.id)}`,
        type: value(item.story_type, item.category, "Media"),
        group: "Media",
        title,
        subtitle: text(item.category, item.story_type, item.subtitle),
        href: `/media?q=${encodeURIComponent(title)}`,
        imageUrl: value(item.thumbnail_url, item.image_url),
      },
      [item.description, item.platform, item.competition_name]
    );
  }

  for (const item of (gameMedia.data ?? []) as SearchRow[]) {
    if (!isPublished(item)) continue;
    const game = gameById.get(value(item.game_id));
    const title = value(item.title, item.label, game?.game_title, game?.title, "Game media");
    addResult(
      {
        id: `game-media-${value(item.id)}`,
        type: value(item.media_type, item.category, "Game media"),
        group: "Media",
        title,
        subtitle: text(game?.game_title || game?.title, item.platform, item.category),
        href: game ? `/games/${value(game.id)}` : `/media?q=${encodeURIComponent(title)}`,
        imageUrl: value(item.thumbnail_url, item.image_url, game?.poster_url, game?.image_url),
      },
      [item.description, item.competition_name, game?.competition_name, game?.home_team_name, game?.away_team_name]
    );
  }

  for (const item of (playerMedia.data ?? []) as SearchRow[]) {
    if (!isPublished(item)) continue;
    const player = playerById.get(value(item.player_id));
    const guest = guestById.get(value(item.guest_hooper_id));
    const person = player || guest;
    const personName = value(person?.full_name, person?.name, person?.nickname, "Player");
    const title = value(item.title, item.label, `${personName} media`);
    addResult(
      {
        id: `player-media-${value(item.id)}`,
        type: value(item.media_type, item.category, "Player media"),
        group: "Media",
        title,
        subtitle: text(personName, item.platform, item.category),
        href: player
          ? `/players/${value(player.id)}`
          : guest
            ? `/players/guest-${value(guest.id)}`
            : `/media?q=${encodeURIComponent(title)}`,
        imageUrl: value(item.thumbnail_url, item.image_url, person?.photo_url, person?.image_url),
      },
      [item.description, item.competition_name, personName]
    );
  }

  for (const item of (teamMedia.data ?? []) as SearchRow[]) {
    if (!isPublished(item)) continue;
    const team = teamById.get(value(item.team_id));
    const teamName = value(team?.name, team?.short_name, "Team");
    const title = value(item.title, item.label, `${teamName} media`);
    addResult(
      {
        id: `team-media-${value(item.id)}`,
        type: value(item.media_type, item.category, "Team media"),
        group: "Media",
        title,
        subtitle: text(teamName, item.platform, item.category),
        href: team?.slug
          ? `/teams/${value(team.slug)}`
          : `/media?q=${encodeURIComponent(title)}`,
        imageUrl: value(item.thumbnail_url, item.image_url, team?.logo_url, team?.cover_image_url),
      },
      [item.description, item.competition_name, teamName, team?.aliases]
    );
  }

  const unique = new Map<string, SearchResult>();
  for (const item of results) {
    const keyValue = `${item.group}-${item.href}-${normalize(item.title)}`;
    const previous = unique.get(keyValue);
    if (!previous || item.score > previous.score) unique.set(keyValue, item);
  }

  const ranked = Array.from(unique.values())
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);
  const totals = ranked.reduce<Record<string, number>>((counts, item) => {
    counts[item.group] = (counts[item.group] || 0) + 1;
    return counts;
  }, {});

  return NextResponse.json(
    { query, results: ranked, totals },
    { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=90" } }
  );
}
