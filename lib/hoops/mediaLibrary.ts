import { supabase } from "@/lib/supabase";
import {
  getAwayTeam,
  getCompetition,
  getGameDate,
  getGameTitle,
  getHomeTeam,
  getPosterUrl,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";
import type {
  MediaFilter,
  MediaLibraryItem,
} from "@/app/media/mediaTypes";

type Row = Record<string, unknown> & { id?: string | number | null };

const value = (...items: unknown[]) => {
  for (const item of items) {
    if (item === null || item === undefined) continue;
    const clean = String(item).trim();
    if (clean) return clean;
  }
  return "";
};

function publicRows(result: { data: unknown[] | null; error: unknown }) {
  return result.error ? [] : ((result.data || []) as Row[]);
}

function isPublished(row: Row) {
  const state = value(row.publish_status, row.status).toLowerCase();
  return row.is_public !== false && row.is_active !== false && !["draft", "hidden", "private"].includes(state);
}

function mediaFilter(...labels: unknown[]): MediaFilter {
  const label = labels.map((item) => value(item)).join(" ").toLowerCase();
  if (label.includes("full game") || label.includes("full match")) return "Full games";
  if (label.includes("highlight") || label.includes("recap") || label.includes("short clip")) return "Highlights";
  if (label.includes("interview") || label.includes("press conference")) return "Interviews";
  if (label.includes("training") || label.includes("workout") || label.includes("breakdown")) return "Training";
  if (["story", "documentary", "episode", "behind", "awareness", "feature"].some((word) => label.includes(word))) return "Stories";
  return "Other";
}

function platform(urlValue: string) {
  try {
    const host = new URL(urlValue).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be" || host.includes("youtube")) return "YouTube";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("facebook") || host === "fb.watch") return "Facebook";
    if (host.includes("vimeo")) return "Vimeo";
    if (host.includes("dailymotion")) return "Dailymotion";
    if (host.includes("drive.google")) return "Google Drive";
    if (host.includes("streamable")) return "Streamable";
    if (host === "x.com" || host.includes("twitter")) return "X";
    return "Web video";
  } catch {
    return "Video";
  }
}

function youtubeThumbnail(urlValue: string) {
  try {
    const url = new URL(urlValue);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be"
      ? parts[0]
      : url.searchParams.get("v") || (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : "");
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
}

function normalizeUrl(urlValue: string) {
  try {
    const url = new URL(urlValue.trim());
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"].forEach((key) => url.searchParams.delete(key));
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch {
    return urlValue.trim().toLowerCase();
  }
}

function storyItems(rows: Row[]): MediaLibraryItem[] {
  return rows.filter(isPublished).map((row) => {
    const url = value(row.youtube_url, row.video_url, row.url);
    const type = value(row.story_type, row.category, "Media story");
    return {
      id: `story-${value(row.id)}`,
      title: value(row.title, row.label, "FACKTS media story"),
      description: value(row.subtitle, row.description),
      url,
      thumbnailUrl: value(row.thumbnail_url) || youtubeThumbnail(url),
      mediaType: type,
      filter: mediaFilter(type, row.category),
      platform: platform(url),
      sourceKind: "Editorial" as const,
      sourceLabel: value(row.category, "FACKTS Media"),
      sourceHref: "/media",
      competition: value(row.category, "FACKTS Hoops"),
      publishedAt: value(row.published_at, row.created_at),
      featured: row.is_featured === true,
      rightsStatus: "FACKTS published",
    };
  }).filter((item) => item.url);
}

function builtInGameItems(rows: Row[]): MediaLibraryItem[] {
  return rows.filter(isPublished).flatMap((raw) => {
    const game = raw as GameRecord;
    const fullUrl = value(game.video_url, game.game_video_url);
    const highlightUrl = value(game.highlight_url);
    const title = getGameTitle(game);
    const common = {
      thumbnailUrl: getPosterUrl(game),
      sourceKind: "Game" as const,
      sourceLabel: title,
      sourceHref: `/games/${game.id}`,
      competition: getCompetition(game),
      publishedAt: value(getGameDate(game), game.updated_at, game.created_at),
      featured: false,
      rightsStatus: "Published match record",
    };
    const items: MediaLibraryItem[] = [];
    if (fullUrl) items.push({ ...common, id: `game-${game.id}-full`, title: `${getHomeTeam(game)} vs ${getAwayTeam(game)} · Full game`, description: `${getCompetition(game)} match coverage`, url: fullUrl, mediaType: "Full game", filter: "Full games", platform: platform(fullUrl) });
    if (highlightUrl && normalizeUrl(highlightUrl) !== normalizeUrl(fullUrl)) items.push({ ...common, id: `game-${game.id}-highlights`, title: `${getHomeTeam(game)} vs ${getAwayTeam(game)} · Highlights`, description: `${getCompetition(game)} match highlights`, url: highlightUrl, mediaType: "Highlights", filter: "Highlights", platform: platform(highlightUrl) });
    return items;
  });
}

function attachedGameItems(rows: Row[], games: Map<string, GameRecord>): MediaLibraryItem[] {
  return rows.filter(isPublished).map((row) => {
    const gameId = value(row.game_id);
    const game = games.get(gameId);
    const url = value(row.url);
    const type = value(row.media_type, "Game video");
    return {
      id: `game-media-${value(row.id)}`,
      title: value(row.title, game ? getGameTitle(game) : "Game media"),
      description: game ? `${getCompetition(game)} · ${getGameTitle(game)}` : "Published game media",
      url,
      thumbnailUrl: value(row.thumbnail_url) || (game ? getPosterUrl(game) : "") || youtubeThumbnail(url),
      mediaType: type,
      filter: mediaFilter(type),
      platform: value(row.platform) || platform(url),
      sourceKind: "Game" as const,
      sourceLabel: game ? getGameTitle(game) : "Match Centre",
      sourceHref: gameId ? `/games/${gameId}` : "/games",
      competition: game ? getCompetition(game) : "FACKTS Hoops",
      publishedAt: value(row.published_at, row.created_at, game && getGameDate(game)),
      featured: false,
      rightsStatus: value(row.rights_status, "Approved"),
    };
  }).filter((item) => item.url);
}

function battleItems(rows: Row[]): MediaLibraryItem[] {
  return rows.filter(isPublished).flatMap((row) => {
    const competitionSlug = value(row.competition_slug, "fackts-kings");
    const isTakeover = competitionSlug.includes("takeover") || value(row.match_type).toLowerCase().includes("takeover");
    const competition = isTakeover ? "Court Takeovers" : "FACKTS Kings";
    const competitionPath = isTakeover ? "/competitions/court-takeovers" : "/competitions/fackts-kings";
    const title = value(row.match_title) || `${value(row.participant_name, "Player")} vs ${value(row.opponent_name, "Player")}`;
    const common = {
      description: `${competition}${value(row.season_label) ? ` · ${value(row.season_label)} season` : ""}`,
      thumbnailUrl: value(row.poster_url),
      sourceKind: "Competition" as const,
      sourceLabel: competition,
      sourceHref: isTakeover ? competitionPath : `${competitionPath}/matches/${value(row.id)}`,
      competition,
      publishedAt: value(row.match_date, row.updated_at, row.created_at),
      featured: false,
      rightsStatus: value(row.verification_status, "Published match record"),
    };
    const fullUrl = value(row.video_url);
    const highlightUrl = value(row.highlight_url);
    const items: MediaLibraryItem[] = [];
    if (fullUrl) items.push({ ...common, id: `competition-${value(row.id)}-full`, title: `${title} · Full game`, url: fullUrl, mediaType: "Full game", filter: "Full games", platform: platform(fullUrl) });
    if (highlightUrl && normalizeUrl(highlightUrl) !== normalizeUrl(fullUrl)) items.push({ ...common, id: `competition-${value(row.id)}-highlights`, title: `${title} · Highlights`, url: highlightUrl, mediaType: "Highlights", filter: "Highlights", platform: platform(highlightUrl) });
    return items;
  });
}

function playerItems(rows: Row[], players: Map<string, Row>, guests: Map<string, Row>): MediaLibraryItem[] {
  return rows.filter(isPublished).map((row) => {
    const playerId = value(row.player_id);
    const guestId = value(row.guest_hooper_id);
    const person = playerId ? players.get(playerId) : guests.get(guestId);
    const name = value(person?.full_name, person?.name, person?.nickname, "Player");
    const url = value(row.url);
    const type = value(row.media_type, "Player media");
    return {
      id: `player-media-${value(row.id)}`,
      title: value(row.title, `${name} media`),
      description: `${name} · ${type}`,
      url,
      thumbnailUrl: value(row.thumbnail_url, person?.photo_url, person?.image_url) || youtubeThumbnail(url),
      mediaType: type,
      filter: mediaFilter(type),
      platform: value(row.platform) || platform(url),
      sourceKind: "Player" as const,
      sourceLabel: name,
      sourceHref: playerId ? `/players/${playerId}` : guestId ? `/players/guest-${guestId}` : "/players",
      competition: value(row.competition_name, "Player media"),
      publishedAt: value(row.published_at, row.created_at),
      featured: false,
      rightsStatus: value(row.rights_status, "Approved"),
    };
  }).filter((item) => item.url);
}

function teamItems(rows: Row[], teams: Map<string, Row>): MediaLibraryItem[] {
  return rows.filter(isPublished).map((row) => {
    const team = teams.get(value(row.team_id));
    const name = value(team?.name, team?.short_name, "Team");
    const slug = value(team?.slug);
    const url = value(row.url);
    const type = value(row.media_type, "Team media");
    return {
      id: `team-media-${value(row.id)}`,
      title: value(row.title, `${name} media`),
      description: `${name} · ${type}`,
      url,
      thumbnailUrl: value(row.thumbnail_url, team?.hero_image_url, team?.logo_url) || youtubeThumbnail(url),
      mediaType: type,
      filter: mediaFilter(type),
      platform: value(row.platform) || platform(url),
      sourceKind: "Team" as const,
      sourceLabel: name,
      sourceHref: slug ? `/teams/${slug}` : "/teams",
      competition: value(row.competition_name, "Team media"),
      publishedAt: value(row.published_at, row.created_at),
      featured: false,
      rightsStatus: value(row.rights_status, "Approved"),
    };
  }).filter((item) => item.url);
}

function eventItems(rows: Row[], events: Map<string, Row>): MediaLibraryItem[] {
  return rows.filter((row) => isPublished(row) && value(row.record_type).toLowerCase() === "media").map((row) => {
    const event = events.get(value(row.event_id));
    const eventName = value(event?.title, "FACKTS event");
    const slug = value(event?.slug, event?.event_id);
    const url = value(row.url);
    const type = value(row.subtitle, row.division, "Event video");
    return {
      id: `event-media-${value(row.id)}`,
      title: value(row.title, `${eventName} media`),
      description: value(row.details, `${eventName} event coverage`),
      url,
      thumbnailUrl: value(row.image_url, event?.poster_url, event?.hero_image_url) || youtubeThumbnail(url),
      mediaType: type,
      filter: mediaFilter(type, row.title),
      platform: platform(url),
      sourceKind: "Event" as const,
      sourceLabel: eventName,
      sourceHref: slug ? `/events/${slug}?tab=media` : "/events",
      competition: eventName,
      publishedAt: value(row.published_at, row.created_at, event?.start_date),
      featured: false,
      rightsStatus: value(row.rights_status, "Event record"),
    };
  }).filter((item) => item.url);
}

function dateValue(date: string) {
  const parsed = new Date(date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function deduplicate(items: MediaLibraryItem[]) {
  const result = new Map<string, MediaLibraryItem>();
  for (const item of items) {
    const key = normalizeUrl(item.url);
    const previous = result.get(key);
    if (!previous || item.featured || (!previous.thumbnailUrl && item.thumbnailUrl)) result.set(key, item);
  }
  return Array.from(result.values()).sort((a, b) => Number(b.featured) - Number(a.featured) || dateValue(b.publishedAt) - dateValue(a.publishedAt));
}

export async function loadMediaLibrary(): Promise<MediaLibraryItem[]> {
  const [storiesResult, gamesResult, gameMediaResult, battlesResult, playerMediaResult, playersResult, guestsResult, teamMediaResult, teamsResult, eventMediaResult, eventsResult] = await Promise.all([
    supabase.from("media_stories").select("*").eq("is_active", true).order("display_order").order("created_at", { ascending: false }),
    supabase.from("games").select("*").order("game_date", { ascending: false }).limit(400),
    supabase.from("game_media").select("*").order("display_order").limit(600),
    supabase.from("guest_one_on_one_stats").select("*").order("match_date", { ascending: false }).limit(400),
    supabase.from("player_media").select("*").order("display_order").limit(600),
    supabase.from("players").select("id,full_name,name,nickname,photo_url,image_url").limit(500),
    supabase.from("guest_hoopers").select("id,full_name,name,nickname,photo_url,image_url").limit(500),
    supabase.from("team_media").select("*").order("display_order").limit(600),
    supabase.from("team_profiles").select("id,slug,name,short_name,logo_url,hero_image_url").limit(300),
    supabase.from("event_records").select("*").eq("record_type", "media").limit(600),
    supabase.from("event_case_studies").select("event_id,slug,title,poster_url,hero_image_url,start_date").limit(200),
  ]);

  const games = publicRows(gamesResult);
  const gameMap = new Map(games.map((row) => [value(row.id), row as GameRecord]));
  const players = new Map(publicRows(playersResult).map((row) => [value(row.id), row]));
  const guests = new Map(publicRows(guestsResult).map((row) => [value(row.id), row]));
  const teams = new Map(publicRows(teamsResult).map((row) => [value(row.id), row]));
  const events = new Map(publicRows(eventsResult).map((row) => [value(row.event_id), row]));

  return deduplicate([
    ...storyItems(publicRows(storiesResult)),
    ...builtInGameItems(games),
    ...battleItems(publicRows(battlesResult)),
    ...attachedGameItems(publicRows(gameMediaResult), gameMap),
    ...playerItems(publicRows(playerMediaResult), players, guests),
    ...teamItems(publicRows(teamMediaResult), teams),
    ...eventItems(publicRows(eventMediaResult), events),
  ]);
}
