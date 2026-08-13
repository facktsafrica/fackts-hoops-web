import { NextResponse, type NextRequest } from "next/server";
import {
  adminRolePresetDefinition,
  canAdmin,
  normalizeAdminRole,
} from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type Assignment = {
  resource_type: string;
  resource_id: string;
  permissions?: string[] | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function personName(person?: JsonRecord) {
  return text(person?.full_name || person?.name || person?.nickname) || "Unnamed person";
}

function gameDate(game: JsonRecord) {
  return text(game.game_date || game.date);
}

function gameFormat(game: JsonRecord) {
  return text(game.game_format || game.match_type) || "Unspecified";
}

function sideName(game: JsonRecord, side: string) {
  if (side === "away") return text(game.away_team_name || game.opponent_name || game.opponent) || "Away";
  if (side === "neutral") return "Neutral";
  return text(game.home_team_name || game.team_name) || "Home";
}

function activeAssignments(rows: Assignment[]) {
  const now = Date.now();
  return rows.filter((assignment) => {
    if (assignment.permissions?.length && !assignment.permissions.includes("reports")) return false;
    const starts = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
    const ends = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
    return (starts === null || starts <= now) && (ends === null || ends > now);
  });
}

function eventOverlaps(event: JsonRecord, from: string, to: string) {
  const start = text(event.start_date);
  const end = text(event.end_date) || start;
  if (from && end && end < from) return false;
  if (to && start && start > to) return false;
  return true;
}

function queryError(error: unknown) {
  return error instanceof Error ? error.message : "Reports could not be loaded.";
}

export async function GET(request: NextRequest) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "reports")) {
    return NextResponse.json({ ok: false, error: "Reports access is required." }, { status: 403 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const params = request.nextUrl.searchParams;
    const filters = {
      event_id: text(params.get("event_id")).slice(0, 160),
      date_from: text(params.get("date_from")).slice(0, 10),
      date_to: text(params.get("date_to")).slice(0, 10),
      format: text(params.get("format")).slice(0, 80),
      team: text(params.get("team")).slice(0, 160),
      player: text(params.get("player")).slice(0, 160),
    };

    const role = adminRolePresetDefinition(access.profile.role);
    const assignmentsResult = role?.requiresScope
      ? await admin
          .from("admin_assignments")
          .select("resource_type,resource_id,permissions,starts_at,ends_at")
          .eq("admin_profile_id", access.profile.id)
          .eq("is_active", true)
      : { data: [] as Assignment[], error: null };
    if (assignmentsResult.error) throw assignmentsResult.error;
    const assignments = activeAssignments((assignmentsResult.data ?? []) as Assignment[]);

    let eventQuery = admin
      .from("event_case_studies")
      .select("*")
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(1000);
    if (filters.event_id) eventQuery = eventQuery.eq("event_id", filters.event_id);
    const eventsResult = await eventQuery;
    if (eventsResult.error) throw eventsResult.error;
    let events = (eventsResult.data ?? []).filter((event) =>
      eventOverlaps(event, filters.date_from, filters.date_to)
    );
    let eventIds = events.map((event) => text(event.event_id));

    let gamesQuery = eventIds.length
      ? admin.from("games").select("*").in("event_id", eventIds).limit(1000)
      : null;
    if (filters.date_from && gamesQuery) gamesQuery = gamesQuery.gte("game_date", `${filters.date_from}T00:00:00`);
    if (filters.date_to && gamesQuery) gamesQuery = gamesQuery.lte("game_date", `${filters.date_to}T23:59:59.999`);
    const [gamesResult, progressResult, deliverablesResult, partnersResult] = await Promise.all([
      gamesQuery ?? Promise.resolve({ data: [], error: null }),
      eventIds.length ? admin.from("event_setup_progress").select("*").in("event_id", eventIds) : Promise.resolve({ data: [], error: null }),
      eventIds.length ? admin.from("event_deliverables").select("*").in("event_id", eventIds).limit(2000) : Promise.resolve({ data: [], error: null }),
      eventIds.length ? admin.from("event_records").select("*").in("event_id", eventIds).eq("record_type", "partner").limit(2000) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [gamesResult, progressResult, deliverablesResult, partnersResult]) {
      if (result.error) throw result.error;
    }

    let games = (gamesResult.data ?? []) as JsonRecord[];
    if (filters.format) games = games.filter((game) => lower(gameFormat(game)) === lower(filters.format));
    if (filters.team) {
      const teamFilter = lower(filters.team);
      games = games.filter((game) =>
        [game.home_team_id, game.away_team_id, game.home_team_name, game.away_team_name, game.team_name, game.opponent_name]
          .some((value) => lower(value).includes(teamFilter))
      );
    }

    const candidateGameIds = games.map((game) => text(game.id));
    const [rostersResult, statsResult, eventLinksResult, gameLinksResult] = await Promise.all([
      candidateGameIds.length
        ? admin.from("game_rosters").select("*").in("game_id", candidateGameIds).limit(5000)
        : Promise.resolve({ data: [], error: null }),
      candidateGameIds.length
        ? admin.from("player_game_stats").select("*").in("game_id", candidateGameIds).limit(5000)
        : Promise.resolve({ data: [], error: null }),
      eventIds.length
        ? admin.from("media_links").select("*").eq("owner_type", "event").in("owner_id", eventIds).limit(3000)
        : Promise.resolve({ data: [], error: null }),
      candidateGameIds.length
        ? admin.from("media_links").select("*").eq("owner_type", "game").in("owner_id", candidateGameIds).limit(3000)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [rostersResult, statsResult, eventLinksResult, gameLinksResult]) {
      if (result.error) throw result.error;
    }

    let rosters = (rostersResult.data ?? []) as JsonRecord[];
    let stats = (statsResult.data ?? []) as JsonRecord[];
    const playerIds = Array.from(new Set([...rosters, ...stats].map((row) => text(row.player_id)).filter(Boolean)));
    const playersResult = playerIds.length
      ? await admin.from("players").select("*").in("id", playerIds).limit(5000)
      : { data: [], error: null };
    if (playersResult.error) throw playersResult.error;
    const players = (playersResult.data ?? []) as JsonRecord[];
    const playerById = new Map(players.map((person) => [text(person.id), person]));

    if (filters.player) {
      const playerFilter = lower(filters.player);
      const matchingPlayerIds = new Set(
        players
          .filter((person) =>
            [person.id, person.full_name, person.name, person.nickname]
              .some((value) => lower(value).includes(playerFilter))
          )
          .map((person) => text(person.id))
      );
      rosters = rosters.filter((row) => matchingPlayerIds.has(text(row.player_id)));
      stats = stats.filter((row) => matchingPlayerIds.has(text(row.player_id)));
      const playerGameIds = new Set([...rosters, ...stats].map((row) => text(row.game_id)));
      games = games.filter((game) => playerGameIds.has(text(game.id)));
    }

    const partners = (partnersResult.data ?? []) as JsonRecord[];
    const scoped = Boolean(role?.requiresScope);
    const broadEventIds = new Set(
      assignments
        .filter((assignment) => ["event", "report"].includes(assignment.resource_type))
        .map((assignment) => assignment.resource_id)
    );
    const scopedGameIds = new Set(assignments.filter((assignment) => assignment.resource_type === "game").map((assignment) => assignment.resource_id));
    const scopedTeamIds = new Set(assignments.filter((assignment) => assignment.resource_type === "team").map((assignment) => assignment.resource_id));
    const scopedPlayerIds = new Set(assignments.filter((assignment) => assignment.resource_type === "player").map((assignment) => assignment.resource_id));
    const scopedPartnerIds = new Set(assignments.filter((assignment) => assignment.resource_type === "partner").map((assignment) => assignment.resource_id));
    const partnerOnly = normalizeAdminRole(access.profile.role) === "read_only_partner";
    const partnerEventIds = new Set(
      partners
        .filter((partner) => scopedPartnerIds.has(text(partner.id)))
        .map((partner) => text(partner.event_id))
    );

    if (scoped) {
      games = games.filter((game) => {
        const eventId = text(game.event_id);
        if (broadEventIds.has(eventId) || scopedGameIds.has(text(game.id))) return true;
        if (partnerOnly) return partnerEventIds.has(eventId);
        return [game.home_team_id, game.away_team_id].some((id) => scopedTeamIds.has(text(id))) ||
          rosters.some((row) => text(row.game_id) === text(game.id) && scopedPlayerIds.has(text(row.player_id)));
      });
    }
    const allFormats = Array.from(new Set(games.map(gameFormat))).sort();

    const visibleGameIds = new Set(games.map((game) => text(game.id)));
    const gameById = new Map(games.map((game) => [text(game.id), game]));
    rosters = rosters.filter((row) => {
      const game = gameById.get(text(row.game_id));
      if (!game) return false;
      if (!scoped || broadEventIds.has(text(game.event_id)) || scopedGameIds.has(text(game.id))) return true;
      if (partnerOnly) return false;
      if (scopedPlayerIds.has(text(row.player_id))) return true;
      const side = text(row.team_side);
      return (side === "home" && scopedTeamIds.has(text(game.home_team_id))) ||
        (side === "away" && scopedTeamIds.has(text(game.away_team_id)));
    });
    stats = stats.filter((row) => {
      const game = gameById.get(text(row.game_id));
      if (!game) return false;
      if (!scoped || broadEventIds.has(text(game.event_id)) || scopedGameIds.has(text(game.id))) return true;
      if (partnerOnly) return false;
      if (scopedPlayerIds.has(text(row.player_id))) return true;
      const side = text(row.team_side);
      return (side === "home" && scopedTeamIds.has(text(game.home_team_id))) ||
        (side === "away" && scopedTeamIds.has(text(game.away_team_id)));
    });

    const visibleEventIds = new Set(games.map((game) => text(game.event_id)));
    for (const eventId of broadEventIds) if (eventIds.includes(eventId)) visibleEventIds.add(eventId);
    for (const eventId of partnerEventIds) if (eventIds.includes(eventId)) visibleEventIds.add(eventId);
    if (!scoped) {
      const narrowedByGame = Boolean(filters.format || filters.team || filters.player);
      if (!narrowedByGame) eventIds.forEach((eventId) => visibleEventIds.add(eventId));
    }
    events = events.filter((event) => visibleEventIds.has(text(event.event_id)));
    eventIds = events.map((event) => text(event.event_id));
    const eventById = new Map(events.map((event) => [text(event.event_id), event]));

    const deliverables = (deliverablesResult.data ?? []).filter((row) => visibleEventIds.has(text(row.event_id))) as JsonRecord[];
    const progress = (progressResult.data ?? []).filter((row) => visibleEventIds.has(text(row.event_id))) as JsonRecord[];
    const progressByEvent = new Map(progress.map((row) => [text(row.event_id), row]));
    const reportPartners = partners.filter((partner) => {
      if (!visibleEventIds.has(text(partner.event_id))) return false;
      return !partnerOnly || scopedPartnerIds.has(text(partner.id));
    });

    const links = [
      ...(eventLinksResult.data ?? []).filter((link) => visibleEventIds.has(text(link.owner_id))),
      ...(gameLinksResult.data ?? []).filter((link) => visibleGameIds.has(text(link.owner_id))),
    ] as JsonRecord[];
    const assetIds = Array.from(new Set(links.map((link) => text(link.asset_id)).filter(Boolean)));
    const assetsResult = assetIds.length
      ? await admin.from("media_assets").select("*").in("id", assetIds).limit(5000)
      : { data: [], error: null };
    if (assetsResult.error) throw assetsResult.error;
    const assetById = new Map(((assetsResult.data ?? []) as JsonRecord[]).map((asset) => [text(asset.id), asset]));

    const eventCompletion = events.map((event) => {
      const eventId = text(event.event_id);
      const eventGames = games.filter((game) => text(game.event_id) === eventId);
      const gameIds = new Set(eventGames.map((game) => text(game.id)));
      const eventStats = stats.filter((stat) => gameIds.has(text(stat.game_id)));
      const eventDeliverables = deliverables.filter((item) => text(item.event_id) === eventId && text(item.deliverable_status) !== "cancelled");
      const setup = progressByEvent.get(eventId);
      const setupComplete = text(setup?.validation_status) === "valid";
      const completedGames = eventGames.filter((game) => text(game.status) === "completed").length;
      const verifiedStats = eventStats.filter((stat) => text(stat.verification_status) === "verified").length;
      const delivered = eventDeliverables.filter((item) => text(item.deliverable_status) === "delivered").length;
      const checks = [setupComplete, eventGames.length > 0 && completedGames === eventGames.length, eventStats.length > 0 && verifiedStats === eventStats.length, eventDeliverables.length === 0 || delivered === eventDeliverables.length];
      return {
        event_id: eventId,
        event: text(event.title),
        format: Array.from(new Set(eventGames.map(gameFormat))).join(" / ") || "No games",
        start_date: text(event.start_date),
        end_date: text(event.end_date),
        public_status: event.is_public ? "Public" : "Private",
        setup_status: text(setup?.validation_status) || "Missing",
        setup_stages: Array.isArray(setup?.completed_stages) ? setup.completed_stages.length : 0,
        games: eventGames.length,
        completed_games: completedGames,
        stat_lines: eventStats.length,
        verified_stat_lines: verifiedStats,
        deliverables: eventDeliverables.length,
        delivered,
        completion_percent: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      };
    });

    const participation = rosters.map((roster) => {
      const game = gameById.get(text(roster.game_id)) ?? {};
      const event = eventById.get(text(game.event_id)) ?? {};
      const person = playerById.get(text(roster.player_id));
      const side = text(roster.team_side) || "home";
      return {
        event_id: text(event.event_id), event: text(event.title), game_id: text(game.id), game: text(game.title || game.game_title),
        game_date: gameDate(game), format: gameFormat(game), player_id: text(roster.player_id), person: personName(person),
        classification: text(person?.player_type) || text(roster.participation_role) || "player", team: sideName(game, side), team_side: side,
        role: text(roster.participation_role || roster.roster_role) || "player", roster_status: text(roster.roster_status) || "confirmed",
        jersey: text(roster.jersey_snapshot),
      };
    });

    const statistics = stats.map((stat) => {
      const game = gameById.get(text(stat.game_id)) ?? {};
      const event = eventById.get(text(game.event_id)) ?? {};
      const person = playerById.get(text(stat.player_id));
      const side = text(stat.team_side) || "home";
      return {
        event_id: text(event.event_id), event: text(event.title), game_id: text(game.id), game: text(game.title || game.game_title),
        game_date: gameDate(game), format: gameFormat(game), player_id: text(stat.player_id), person: personName(person),
        classification: text(person?.player_type) || (stat.source_guest_stat_id ? "guest" : "player"), team: sideName(game, side), team_side: side,
        points: number(stat.points), rebounds: number(stat.rebounds), assists: number(stat.assists), steals: number(stat.steals),
        blocks: number(stat.blocks), turnovers: number(stat.turnovers), fouls: number(stat.fouls), minutes: number(stat.minutes),
        entry_status: text(stat.entry_status), verification_status: text(stat.verification_status),
      };
    });

    let mediaDelivery = links.map((link) => {
      const asset = assetById.get(text(link.asset_id)) ?? {};
      const game = text(link.owner_type) === "game" ? gameById.get(text(link.owner_id)) : undefined;
      const eventId = game ? text(game.event_id) : text(link.owner_id);
      const event = eventById.get(eventId) ?? {};
      return {
        event_id: eventId, event: text(event.title), game_id: text(game?.id), game: text(game?.title || game?.game_title),
        asset_id: text(asset.id), title: text(asset.title) || "Untitled media", media_type: text(asset.media_type), link_role: text(link.link_role),
        rights_status: text(asset.rights_status), publish_status: text(asset.publish_status), public: Boolean(asset.is_public),
        health_status: text(asset.health_status), url: text(asset.url),
      };
    });

    const sponsorSummary = reportPartners.map((partner) => {
      const eventId = text(partner.event_id);
      const event = eventById.get(eventId) ?? {};
      const eventDeliverables = deliverables.filter((item) => text(item.event_id) === eventId && text(item.deliverable_status) !== "cancelled");
      const delivered = eventDeliverables.filter((item) => text(item.deliverable_status) === "delivered").length;
      return {
        event_id: eventId, event: text(event.title), partner_id: text(partner.id), partner: text(partner.title),
        category: text(partner.division) || "Partner", contribution: text(partner.subtitle), recognition_note: text(partner.details),
        record_status: text(partner.status), public: Boolean(partner.is_public), deliverables: eventDeliverables.length, delivered,
        delivery_status: eventDeliverables.length === 0 ? "No tracked deliverables" : delivered === eventDeliverables.length ? "Delivered" : `${delivered}/${eventDeliverables.length} delivered`,
      };
    });

    let competitions: JsonRecord[] = [];
    let competitionMatches: JsonRecord[] = [];
    const competitionFilter = filters.event_id.startsWith("competition:")
      ? filters.event_id.slice("competition:".length)
      : "";
    const includeCompetitions =
      !scoped &&
      (!filters.event_id || Boolean(competitionFilter)) &&
      !filters.team;

    if (includeCompetitions) {
      let competitionQuery = admin
        .from("competitions")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("start_date", { ascending: false, nullsFirst: false })
        .limit(200);
      if (competitionFilter) competitionQuery = competitionQuery.eq("slug", competitionFilter);
      const competitionResult = await competitionQuery;
      if (competitionResult.error) throw competitionResult.error;
      competitions = ((competitionResult.data ?? []) as JsonRecord[])
        .filter((competition) => eventOverlaps(competition, filters.date_from, filters.date_to))
        .filter((competition) => !filters.format || lower(competition.competition_format) === lower(filters.format));

      const slugs = competitions.map((competition) => text(competition.slug)).filter(Boolean);
      if (slugs.length) {
        let matchesQuery = admin
          .from("guest_one_on_one_stats")
          .select("*")
          .in("competition_slug", slugs)
          .limit(5000);
        if (filters.date_from) matchesQuery = matchesQuery.gte("match_date", `${filters.date_from}T00:00:00`);
        if (filters.date_to) matchesQuery = matchesQuery.lte("match_date", `${filters.date_to}T23:59:59.999`);
        const matchesResult = await matchesQuery;
        if (matchesResult.error) throw matchesResult.error;
        competitionMatches = (matchesResult.data ?? []) as JsonRecord[];
      }

      if (filters.player) {
        const playerFilter = lower(filters.player);
        competitionMatches = competitionMatches.filter((match) =>
          [match.participant_name, match.opponent_name, match.fackts_player_id, match.guest_hooper_id, match.opponent_player_id, match.opponent_guest_hooper_id]
            .some((value) => lower(value).includes(playerFilter))
        );
        const visibleSlugs = new Set(competitionMatches.map((match) => text(match.competition_slug)));
        competitions = competitions.filter((competition) => visibleSlugs.has(text(competition.slug)));
      }
    }

    const competitionPerformance = competitions.map((competition) => {
      const slug = text(competition.slug);
      const matches = competitionMatches.filter((match) => text(match.competition_slug) === slug);
      const completed = matches.filter((match) => lower(match.status) === "completed").length;
      const verified = matches.filter((match) => lower(match.verification_status) === "verified").length;
      const players = new Set(
        matches.flatMap((match) => [text(match.participant_name), text(match.opponent_name)]).filter(Boolean)
      );
      const media = matches.filter((match) => text(match.video_url) || text(match.highlight_url)).length;

      return {
        event_id: `competition:${slug}`,
        competition_slug: slug,
        competition: text(competition.name),
        season: text(competition.current_season_label) || "Current",
        format: text(competition.competition_format) || "Competition",
        status: text(competition.status) || "Upcoming",
        verification: text(competition.verification_status) || "Unverified",
        matches: matches.length,
        completed,
        scheduled: matches.filter((match) => ["upcoming", "scheduled"].includes(lower(match.status))).length,
        verified,
        players: players.size,
        media,
        completion_percent: matches.length ? Math.round((completed / matches.length) * 100) : 0,
      };
    });

    if (competitionMatches.length) {
      const legacyMatchIds = competitionMatches.map((match) => text(match.id)).filter(Boolean);
      const oneOnOneLinksResult = await admin
        .from("media_links")
        .select("*")
        .eq("owner_type", "one_on_one")
        .in("owner_id", legacyMatchIds)
        .limit(10000);
      if (oneOnOneLinksResult.error) throw oneOnOneLinksResult.error;
      const oneOnOneLinks = (oneOnOneLinksResult.data ?? []) as JsonRecord[];
      const oneOnOneAssetIds = Array.from(new Set(oneOnOneLinks.map((link) => text(link.asset_id)).filter(Boolean)));
      const oneOnOneAssetsResult = oneOnOneAssetIds.length
        ? await admin.from("media_assets").select("*").in("id", oneOnOneAssetIds).limit(10000)
        : { data: [], error: null };
      if (oneOnOneAssetsResult.error) throw oneOnOneAssetsResult.error;
      const oneOnOneAssetById = new Map(
        ((oneOnOneAssetsResult.data ?? []) as JsonRecord[]).map((asset) => [text(asset.id), asset])
      );
      const matchByLegacyId = new Map(competitionMatches.map((match) => [text(match.id), match]));
      const competitionBySlug = new Map(competitions.map((competition) => [text(competition.slug), competition]));
      const canonicalGamesResult = legacyMatchIds.length
        ? await admin.from("games").select("id,legacy_one_on_one_id,title,game_title").in("legacy_one_on_one_id", legacyMatchIds).limit(5000)
        : { data: [], error: null };
      if (canonicalGamesResult.error) throw canonicalGamesResult.error;
      const gameByLegacyId = new Map(
        ((canonicalGamesResult.data ?? []) as JsonRecord[]).map((game) => [text(game.legacy_one_on_one_id), game])
      );
      const existingAssetIds = new Set(mediaDelivery.map((row) => text(row.asset_id)));
      const competitionMedia = oneOnOneLinks.flatMap((link) => {
        const asset = oneOnOneAssetById.get(text(link.asset_id));
        if (!asset || existingAssetIds.has(text(asset.id))) return [];
        const match = matchByLegacyId.get(text(link.owner_id)) ?? {};
        const slug = text(match.competition_slug);
        const competition = competitionBySlug.get(slug) ?? {};
        const canonicalGame = gameByLegacyId.get(text(link.owner_id));
        return [{
          event_id: `competition:${slug}`,
          event: text(competition.name) || slug,
          game_id: text(canonicalGame?.id),
          game: text(match.match_title || canonicalGame?.title || canonicalGame?.game_title) || "Competition match",
          asset_id: text(asset.id),
          title: text(asset.title) || text(match.match_title) || "Competition media",
          media_type: text(asset.media_type),
          link_role: text(link.link_role),
          rights_status: text(asset.rights_status),
          publish_status: text(asset.publish_status),
          public: Boolean(asset.is_public),
          health_status: text(asset.health_status),
          url: text(asset.url),
        }];
      });
      mediaDelivery = [...mediaDelivery, ...competitionMedia];
    }

    const competitionOptions = competitions.map((competition) => ({
      event_id: `competition:${text(competition.slug)}`,
      title: text(competition.name),
    }));
    const reportFormats = Array.from(new Set([
      ...allFormats,
      ...competitions.map((competition) => text(competition.competition_format)).filter(Boolean),
    ])).sort();

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      filters,
      options: {
        events: [
          ...events.map((event) => ({ event_id: text(event.event_id), title: text(event.title) })),
          ...competitionOptions,
        ],
        formats: reportFormats,
      },
      summary: {
        events: eventCompletion.length + competitionPerformance.length,
        participants: participation.length,
        stat_lines: statistics.length,
        media_assets: mediaDelivery.length,
        partners: sponsorSummary.length,
      },
      reports: {
        event_completion: eventCompletion,
        competition_performance: competitionPerformance,
        participation,
        statistics,
        media_delivery: mediaDelivery,
        sponsor_summary: sponsorSummary,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: queryError(error) }, { status: 500 });
  }
}
