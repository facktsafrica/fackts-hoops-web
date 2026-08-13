import "server-only";

import {
  canAdmin,
  adminRolePresetDefinition,
  type AdminCapability,
} from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;
type Assignment = {
  resource_type: string;
  resource_id: string;
  permissions?: string[] | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  detail: string;
  href: string;
  tone: "orange" | "blue" | "amber" | "rose" | "emerald";
};

export type DashboardActivity = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  capability?: string | null;
  occurred_at: string;
  actor_label: string;
};

export type DashboardSignal = {
  key: string;
  severity: "critical" | "attention" | "opportunity" | "clear";
  title: string;
  detail: string;
  action: string;
  href: string;
  count: number;
};

export type DashboardGameBrief = {
  id: string;
  title: string;
  competition: string;
  game_date: string;
  status: string;
  roster_count: number;
  media_count: number;
};

export type DashboardCompetitionBrief = {
  slug: string;
  name: string;
  season: string;
  status: string;
  matches: number;
  completed: number;
  verified: number;
  players: number;
  media: number;
};

export type DashboardHealth = {
  score: number;
  label: string;
  detail: string;
  attention_count: number;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function currentNairobiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function assignmentsActive(rows: Assignment[]) {
  const now = Date.now();
  return rows.filter((assignment) => {
    const starts = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
    const ends = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
    return (starts === null || starts <= now) && (ends === null || ends > now);
  });
}

function supports(assignment: Assignment, capability: AdminCapability) {
  return !assignment.permissions?.length || assignment.permissions.includes(capability);
}

function resourceSet(assignments: Assignment[], type: string, capability: AdminCapability) {
  return new Set(assignments.filter((item) => item.resource_type === type && supports(item, capability)).map((item) => item.resource_id));
}

function gameVisible(game: JsonRecord, assignments: Assignment[], capability: AdminCapability, playerId?: string) {
  const events = resourceSet(assignments, "event", capability);
  const games = resourceSet(assignments, "game", capability);
  const teams = resourceSet(assignments, "team", capability);
  const players = resourceSet(assignments, "player", capability);
  return events.has(text(game.event_id)) || games.has(text(game.id)) ||
    teams.has(text(game.home_team_id)) || teams.has(text(game.away_team_id)) ||
    Boolean(playerId && players.has(playerId));
}

function eventVisible(eventId: string, assignments: Assignment[], capability: AdminCapability, partnerEventIds: Set<string>) {
  const events = resourceSet(assignments, "event", capability);
  const reports = resourceSet(assignments, "report", capability);
  return events.has(eventId) || reports.has(eventId) || partnerEventIds.has(eventId);
}

function dashboardMetric(
  key: string,
  label: string,
  value: number,
  detail: string,
  href: string,
  tone: DashboardMetric["tone"]
): DashboardMetric {
  return { key, label, value, detail, href, tone };
}

export async function loadAdminDashboard(profile: AdminProfile) {
  const admin = createSupabaseAdminClient();
  const role = adminRolePresetDefinition(profile.role);
  const scoped = Boolean(role?.requiresScope);
  const today = currentNairobiDate();
  const dayStart = `${today}T00:00:00+03:00`;
  const dayEnd = `${today}T23:59:59.999+03:00`;
  const now = new Date().toISOString();
  const horizonEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const deliveryHorizonEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const assignmentsResult = scoped
    ? await admin
        .from("admin_assignments")
        .select("resource_type,resource_id,permissions,starts_at,ends_at")
        .eq("admin_profile_id", profile.id)
        .eq("is_active", true)
    : { data: [] as Assignment[], error: null };
  if (assignmentsResult.error) throw assignmentsResult.error;
  const assignments = assignmentsActive((assignmentsResult.data ?? []) as Assignment[]);

  const partnerIds = resourceSet(assignments, "partner", "reports");
  const partnerRecordsResult = partnerIds.size
    ? await admin.from("event_records").select("id,event_id").in("id", Array.from(partnerIds))
    : { data: [], error: null };
  if (partnerRecordsResult.error) throw partnerRecordsResult.error;
  const partnerEventIds = new Set((partnerRecordsResult.data ?? []).map((row) => text(row.event_id)));

  const [activeEventsResult, todayGamesResult, upcomingGamesResult, competitionsResult, competitionMatchesResult, batchesResult, statsResult, assetsResult, linksResult, deliveriesResult, upcomingDeliveriesResult, issuesResult, correctionsResult] = await Promise.all([
    admin.from("event_case_studies").select("event_id,title", { count: "exact" }).eq("status", "published").lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`).limit(2000),
    admin.from("games").select("id,event_id,home_team_id,away_team_id,title,game_date,status", { count: "exact" }).gte("game_date", dayStart).lte("game_date", dayEnd).order("game_date").limit(2000),
    admin.from("games").select("id,event_id,home_team_id,away_team_id,title,game_title,home_team_name,away_team_name,competition_name,game_date,status,legacy_one_on_one_id").gte("game_date", now).lte("game_date", horizonEnd).in("status", ["upcoming", "live", "postponed"]).order("game_date").limit(100),
    admin.from("competitions").select("slug,name,current_season_label,status,competition_format,is_public,is_featured").in("status", ["live", "upcoming", "published"]).order("is_featured", { ascending: false }).limit(200),
    admin.from("guest_one_on_one_stats").select("id,competition_slug,status,verification_status,participant_name,opponent_name,video_url,highlight_url").limit(5000),
    admin.from("roster_import_batches").select("id,game_id,status", { count: "exact" }).in("status", ["staged", "validated", "blocked"]).limit(5000),
    admin.from("player_game_stats").select("id,game_id,player_id,entry_status,verification_status", { count: "exact" }).in("entry_status", ["submitted", "verified", "disputed"]).in("verification_status", ["unverified", "pending", "disputed"]).limit(5000),
    admin.from("media_assets").select("id,rights_status,publish_status,is_public,health_status,conflict_status", { count: "exact" }).limit(5000),
    admin.from("media_links").select("asset_id,owner_type,owner_id").limit(10000),
    admin.from("event_deliverables").select("id,event_id,title,due_at,deliverable_status", { count: "exact" }).lt("due_at", now).not("deliverable_status", "in", "(delivered,cancelled)").limit(5000),
    admin.from("event_deliverables").select("id,event_id,title,due_at,deliverable_status").gte("due_at", now).lte("due_at", deliveryHorizonEnd).not("deliverable_status", "in", "(delivered,cancelled)").order("due_at").limit(1000),
    admin.from("migration_review_issues").select("id,severity,status,details", { count: "exact" }).in("status", ["open", "in_review"]).limit(5000),
    admin.from("correction_requests").select("id,entity_type,entity_id,correction_status", { count: "exact" }).in("correction_status", ["open", "triaged", "in_progress"]).limit(5000),
  ]);

  const allResults = [activeEventsResult, todayGamesResult, upcomingGamesResult, competitionsResult, competitionMatchesResult, batchesResult, statsResult, assetsResult, linksResult, deliveriesResult, upcomingDeliveriesResult, issuesResult, correctionsResult];
  const queryWarnings = allResults.filter((result) => result.error).map((result) => result.error?.message || "Dashboard query failed.");

  const activeEvents = (activeEventsResult.data ?? []) as JsonRecord[];
  const todayGames = (todayGamesResult.data ?? []) as JsonRecord[];
  const upcomingGamesRaw = (upcomingGamesResult.data ?? []) as JsonRecord[];
  const competitions = (competitionsResult.data ?? []) as JsonRecord[];
  const competitionMatches = (competitionMatchesResult.data ?? []) as JsonRecord[];
  const batches = (batchesResult.data ?? []) as JsonRecord[];
  const stats = (statsResult.data ?? []) as JsonRecord[];
  const assets = (assetsResult.data ?? []) as JsonRecord[];
  const links = (linksResult.data ?? []) as JsonRecord[];
  const deliveries = (deliveriesResult.data ?? []) as JsonRecord[];
  const issues = (issuesResult.data ?? []) as JsonRecord[];
  const corrections = (correctionsResult.data ?? []) as JsonRecord[];
  const upcomingDeliveries = (upcomingDeliveriesResult.data ?? []) as JsonRecord[];

  const upcomingGameIds = upcomingGamesRaw.map((game) => text(game.id)).filter(Boolean);
  const upcomingLegacyOneOnOneIds = upcomingGamesRaw.map((game) => text(game.legacy_one_on_one_id)).filter(Boolean);
  const [upcomingRostersResult, upcomingGameMediaResult, upcomingOneOnOneMediaResult] = await Promise.all([
    upcomingGameIds.length
      ? admin.from("game_rosters").select("game_id,player_id,roster_status").in("game_id", upcomingGameIds).limit(5000)
      : Promise.resolve({ data: [], error: null }),
    upcomingGameIds.length
      ? admin.from("media_links").select("asset_id,owner_id").eq("owner_type", "game").in("owner_id", upcomingGameIds).limit(5000)
      : Promise.resolve({ data: [], error: null }),
    upcomingLegacyOneOnOneIds.length
      ? admin.from("media_links").select("asset_id,owner_id").eq("owner_type", "one_on_one").in("owner_id", upcomingLegacyOneOnOneIds).limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [upcomingRostersResult, upcomingGameMediaResult, upcomingOneOnOneMediaResult]) {
    if (result.error) queryWarnings.push(result.error.message);
  }
  const upcomingRosters = (upcomingRostersResult.data ?? []) as JsonRecord[];
  const upcomingGameMedia = (upcomingGameMediaResult.data ?? []) as JsonRecord[];
  const upcomingOneOnOneMedia = (upcomingOneOnOneMediaResult.data ?? []) as JsonRecord[];

  const referencedGameIds = Array.from(new Set([
    ...batches.map((row) => text(row.game_id)),
    ...stats.map((row) => text(row.game_id)),
    ...links.filter((row) => text(row.owner_type) === "game").map((row) => text(row.owner_id)),
  ].filter(Boolean)));
  const referencedGamesResult = referencedGameIds.length
    ? await admin.from("games").select("id,event_id,home_team_id,away_team_id").in("id", referencedGameIds).limit(10000)
    : { data: [], error: null };
  if (referencedGamesResult.error) queryWarnings.push(referencedGamesResult.error.message);
  const gameById = new Map(((referencedGamesResult.data ?? []) as JsonRecord[]).map((game) => [text(game.id), game]));

  const metrics: DashboardMetric[] = [];
  if (canAdmin(profile, "events") && !activeEventsResult.error) {
    const count = scoped
      ? activeEvents.filter((event) => eventVisible(text(event.event_id), assignments, "events", partnerEventIds)).length
      : activeEventsResult.count ?? activeEvents.length;
    metrics.push(dashboardMetric("active-events", "Active events", count, "Published events currently in their event window.", "/admin/events?status=published", "orange"));
  }
  if (canAdmin(profile, "games") && !todayGamesResult.error) {
    const count = scoped ? todayGames.filter((game) => gameVisible(game, assignments, "games")).length : todayGamesResult.count ?? todayGames.length;
    metrics.push(dashboardMetric("today-games", "Today's games", count, `Scheduled for ${today} in Nairobi.`, `/admin/games?date_from=${today}&date_to=${today}`, "blue"));
  }
  if (canAdmin(profile, "rosters") && !batchesResult.error) {
    const count = scoped ? batches.filter((batch) => {
      const game = gameById.get(text(batch.game_id));
      return game ? gameVisible(game, assignments, "rosters") : false;
    }).length : batchesResult.count ?? batches.length;
    metrics.push(dashboardMetric("pending-rosters", "Pending rosters", count, "Staged, validated or blocked imports awaiting completion.", "/admin/rosters", "amber"));
  }
  if (canAdmin(profile, "stats") && !statsResult.error) {
    const count = scoped ? stats.filter((stat) => {
      const game = gameById.get(text(stat.game_id));
      return game ? gameVisible(game, assignments, "stats", text(stat.player_id)) : false;
    }).length : statsResult.count ?? stats.length;
    metrics.push(dashboardMetric("unverified-stats", "Unverified statistics", count, "Submitted or disputed stat lines requiring verification.", "/admin/stats", "amber"));
  }
  if (canAdmin(profile, "media") && !assetsResult.error && !linksResult.error) {
    const linkedIds = new Set(links.map((link) => text(link.asset_id)));
    const unlinked = assets.filter((asset) => !linkedIds.has(text(asset.id)));
    const mediaIds = resourceSet(assignments, "media", "media");
    const visibleAssetIds = new Set(links.filter((link) => {
      if (!scoped) return true;
      if (mediaIds.has(text(link.asset_id))) return true;
      const ownerType = text(link.owner_type);
      const ownerId = text(link.owner_id);
      if (ownerType === "event") return eventVisible(ownerId, assignments, "media", partnerEventIds);
      if (ownerType === "game") {
        const game = gameById.get(ownerId);
        return game ? gameVisible(game, assignments, "media") : false;
      }
      if (ownerType === "team") return resourceSet(assignments, "team", "media").has(ownerId);
      if (ownerType === "player") return resourceSet(assignments, "player", "media").has(ownerId);
      return false;
    }).map((link) => text(link.asset_id)));
    const count = scoped ? unlinked.filter((asset) => mediaIds.has(text(asset.id)) || visibleAssetIds.has(text(asset.id))).length : unlinked.length;
    metrics.push(dashboardMetric("unlinked-media", "Media awaiting links", count, "Canonical media assets without an operational owner link.", "/admin/media?state=unlinked", "blue"));
  }
  if ((canAdmin(profile, "events") || canAdmin(profile, "reports")) && !deliveriesResult.error) {
    const capability: AdminCapability = canAdmin(profile, "reports") ? "reports" : "events";
    const count = scoped ? deliveries.filter((delivery) => eventVisible(text(delivery.event_id), assignments, capability, partnerEventIds)).length : deliveriesResult.count ?? deliveries.length;
    metrics.push(dashboardMetric("overdue-deliveries", "Overdue deliveries", count, "Tracked event deliverables past due and not completed.", canAdmin(profile, "reports") ? "/admin/reports" : "/admin/events", "rose"));
  }
  if ((canAdmin(profile, "corrections") || canAdmin(profile, "audit")) && !issuesResult.error && !correctionsResult.error && !scoped) {
    const issueCount = issuesResult.count ?? issues.length;
    const correctionCount = correctionsResult.count ?? corrections.length;
    metrics.push(dashboardMetric("data-errors", "Data errors", issueCount + correctionCount, `${issueCount} migration issue${issueCount === 1 ? "" : "s"}; ${correctionCount} active correction${correctionCount === 1 ? "" : "s"}.`, "/admin/corrections", "rose"));
  }

  const visibleUpcomingGames = scoped
    ? upcomingGamesRaw.filter((game) => gameVisible(game, assignments, "games"))
    : upcomingGamesRaw;
  const upcomingGames: DashboardGameBrief[] = visibleUpcomingGames.slice(0, 8).map((game) => {
    const id = text(game.id);
    const legacyId = text(game.legacy_one_on_one_id);
    const rosterCount = upcomingRosters.filter((row) =>
      text(row.game_id) === id && text(row.roster_status) !== "withdrawn"
    ).length;
    const mediaIds = new Set([
      ...upcomingGameMedia.filter((row) => text(row.owner_id) === id).map((row) => text(row.asset_id)),
      ...upcomingOneOnOneMedia.filter((row) => text(row.owner_id) === legacyId).map((row) => text(row.asset_id)),
    ]);
    return {
      id,
      title: text(game.title || game.game_title) || `${text(game.home_team_name) || "Home"} vs ${text(game.away_team_name) || "Away"}`,
      competition: text(game.competition_name) || "FACKTS Hoops",
      game_date: text(game.game_date),
      status: text(game.status) || "upcoming",
      roster_count: rosterCount,
      media_count: mediaIds.size,
    };
  });

  const competitionPulse: DashboardCompetitionBrief[] = scoped || competitionsResult.error || competitionMatchesResult.error
    ? []
    : competitions.map((competition) => {
        const slug = text(competition.slug);
        const matches = competitionMatches.filter((match) => text(match.competition_slug) === slug);
        const players = new Set(matches.flatMap((match) => [text(match.participant_name), text(match.opponent_name)]).filter(Boolean));
        const mediaCount = matches.reduce((total, match) => {
          const full = text(match.video_url);
          const highlight = text(match.highlight_url);
          return total + (full ? 1 : 0) + (highlight && highlight !== full ? 1 : 0);
        }, 0);
        return {
          slug,
          name: text(competition.name) || slug,
          season: text(competition.current_season_label) || "Current",
          status: text(competition.status) || "upcoming",
          matches: matches.length,
          completed: matches.filter((match) => text(match.status).toLowerCase() === "completed").length,
          verified: matches.filter((match) => text(match.verification_status).toLowerCase() === "verified").length,
          players: players.size,
          media: mediaCount,
        };
      });

  const missingRosterCount = visibleUpcomingGames.filter((game) => {
    const id = text(game.id);
    return !upcomingRosters.some((row) => text(row.game_id) === id && text(row.roster_status) !== "withdrawn");
  }).length;
  const coverageGapCount = visibleUpcomingGames.filter((game) => {
    const id = text(game.id);
    const legacyId = text(game.legacy_one_on_one_id);
    return !upcomingGameMedia.some((row) => text(row.owner_id) === id) &&
      !upcomingOneOnOneMedia.some((row) => text(row.owner_id) === legacyId);
  }).length;
  const unverifiedStatsCount = scoped
    ? stats.filter((stat) => {
        const game = gameById.get(text(stat.game_id));
        return game ? gameVisible(game, assignments, "stats", text(stat.player_id)) : false;
      }).length
    : statsResult.count ?? stats.length;
  const mediaReviewCount = assets.filter((asset) =>
    text(asset.rights_status) !== "approved" ||
    text(asset.conflict_status) !== "clear" ||
    ["unchecked", "warning", "broken"].includes(text(asset.health_status))
  ).length;
  const overdueDeliveryCount = scoped
    ? deliveries.filter((delivery) => eventVisible(text(delivery.event_id), assignments, canAdmin(profile, "reports") ? "reports" : "events", partnerEventIds)).length
    : deliveriesResult.count ?? deliveries.length;
  const dataIssueCount = !scoped
    ? (issuesResult.count ?? issues.length) + (correctionsResult.count ?? corrections.length)
    : 0;

  const signals: DashboardSignal[] = [];
  if ((canAdmin(profile, "corrections") || canAdmin(profile, "audit")) && dataIssueCount > 0) {
    signals.push({ key: "data-integrity", severity: "critical", title: "Resolve data integrity queue", detail: "Open migration issues and correction requests can affect trusted reporting.", action: "Open corrections", href: "/admin/corrections", count: dataIssueCount });
  }
  if ((canAdmin(profile, "events") || canAdmin(profile, "reports")) && overdueDeliveryCount > 0) {
    signals.push({ key: "overdue-delivery", severity: "critical", title: "Recover overdue event deliveries", detail: "These deliverables are past due and not recorded as delivered or cancelled.", action: "Review delivery report", href: "/admin/reports", count: overdueDeliveryCount });
  }
  if (canAdmin(profile, "rosters") && missingRosterCount > 0) {
    signals.push({ key: "roster-readiness", severity: "attention", title: "Complete upcoming game rosters", detail: "Games inside the next 14 days have no confirmed canonical participation rows.", action: "Open rosters", href: "/admin/rosters", count: missingRosterCount });
  }
  if (canAdmin(profile, "stats") && unverifiedStatsCount > 0) {
    signals.push({ key: "stats-verification", severity: "attention", title: "Verify submitted statistics", detail: "Unverified or disputed stat lines are excluded from fully trusted reporting.", action: "Open statistics", href: "/admin/stats", count: unverifiedStatsCount });
  }
  if (canAdmin(profile, "media") && mediaReviewCount > 0) {
    signals.push({ key: "media-governance", severity: "attention", title: "Clear the media review queue", detail: "Rights, ownership, conflict or link-health evidence still needs review.", action: "Open Media Centre", href: "/admin/media?state=review", count: mediaReviewCount });
  }
  if (canAdmin(profile, "media") && coverageGapCount > 0) {
    signals.push({ key: "coverage-planning", severity: "opportunity", title: "Prepare coverage for upcoming games", detail: "Upcoming fixtures do not yet have a linked full-game, highlight or coverage asset.", action: "Plan media", href: "/admin/media", count: coverageGapCount });
  }
  if ((canAdmin(profile, "events") || canAdmin(profile, "reports")) && upcomingDeliveries.length > 0) {
    signals.push({ key: "delivery-horizon", severity: "opportunity", title: "Protect the next seven-day delivery window", detail: "Planned event outputs are due within seven days.", action: "Open reports", href: "/admin/reports", count: upcomingDeliveries.length });
  }
  if (!signals.length) {
    signals.push({ key: "clear", severity: "clear", title: "No immediate operational exceptions", detail: "The live queues visible to your role have no urgent exceptions.", action: "Review reports", href: "/admin/reports", count: 0 });
  }
  const severityOrder = { critical: 0, attention: 1, opportunity: 2, clear: 3 };
  signals.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity] || right.count - left.count);

  const penalty = Math.min(30, dataIssueCount * 10) +
    Math.min(25, overdueDeliveryCount * 8) +
    Math.min(20, missingRosterCount * 5) +
    Math.min(10, unverifiedStatsCount) +
    Math.min(15, mediaReviewCount);
  const score = Math.max(0, 100 - penalty);
  const health: DashboardHealth = {
    score,
    label: score >= 85 ? "Operationally ready" : score >= 65 ? "Controlled attention" : score >= 40 ? "Director intervention" : "Critical recovery",
    detail: "Derived from data issues, overdue deliveries, upcoming roster readiness, statistics verification and governed media review.",
    attention_count: dataIssueCount + overdueDeliveryCount + missingRosterCount + unverifiedStatsCount + mediaReviewCount,
  };

  const fullActivity = canAdmin(profile, "activity") || canAdmin(profile, "audit");
  let activityQuery = admin
    .from("admin_audit_log")
    .select("id,action,entity_type,entity_id,capability,occurred_at,actor_admin_profile_id,metadata")
    .order("occurred_at", { ascending: false })
    .limit(12);
  if (!fullActivity) activityQuery = activityQuery.eq("actor_admin_profile_id", profile.id);
  const activityResult = await activityQuery;
  if (activityResult.error) queryWarnings.push(activityResult.error.message);

  const activity = ((activityResult.data ?? []) as JsonRecord[]).map((item) => ({
    id: text(item.id),
    action: text(item.action),
    entity_type: text(item.entity_type),
    entity_id: text(item.entity_id) || null,
    capability: text(item.capability) || null,
    occurred_at: text(item.occurred_at),
    actor_label: text((item.metadata as JsonRecord | null)?.actor_label) || (fullActivity ? "Admin" : "You"),
  }));

  return { metrics, activity, today, queryWarnings, health, signals: signals.slice(0, 6), upcomingGames, competitionPulse };
}
