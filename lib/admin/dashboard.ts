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

  const [activeEventsResult, todayGamesResult, batchesResult, statsResult, assetsResult, linksResult, deliveriesResult, issuesResult, correctionsResult] = await Promise.all([
    admin.from("event_case_studies").select("event_id,title", { count: "exact" }).eq("status", "published").lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`).limit(2000),
    admin.from("games").select("id,event_id,home_team_id,away_team_id,title,game_date,status", { count: "exact" }).gte("game_date", dayStart).lte("game_date", dayEnd).order("game_date").limit(2000),
    admin.from("roster_import_batches").select("id,game_id,status", { count: "exact" }).in("status", ["staged", "validated", "blocked"]).limit(5000),
    admin.from("player_game_stats").select("id,game_id,player_id,entry_status,verification_status", { count: "exact" }).in("entry_status", ["submitted", "verified", "disputed"]).in("verification_status", ["unverified", "pending", "disputed"]).limit(5000),
    admin.from("media_assets").select("id", { count: "exact" }).limit(5000),
    admin.from("media_links").select("asset_id,owner_type,owner_id").limit(10000),
    admin.from("event_deliverables").select("id,event_id,title,due_at,deliverable_status", { count: "exact" }).lt("due_at", now).not("deliverable_status", "in", "(delivered,cancelled)").limit(5000),
    admin.from("migration_review_issues").select("id,severity,status,details", { count: "exact" }).in("status", ["open", "in_review"]).limit(5000),
    admin.from("correction_requests").select("id,entity_type,entity_id,correction_status", { count: "exact" }).in("correction_status", ["open", "triaged", "in_progress"]).limit(5000),
  ]);

  const allResults = [activeEventsResult, todayGamesResult, batchesResult, statsResult, assetsResult, linksResult, deliveriesResult, issuesResult, correctionsResult];
  const queryWarnings = allResults.filter((result) => result.error).map((result) => result.error?.message || "Dashboard query failed.");

  const activeEvents = (activeEventsResult.data ?? []) as JsonRecord[];
  const todayGames = (todayGamesResult.data ?? []) as JsonRecord[];
  const batches = (batchesResult.data ?? []) as JsonRecord[];
  const stats = (statsResult.data ?? []) as JsonRecord[];
  const assets = (assetsResult.data ?? []) as JsonRecord[];
  const links = (linksResult.data ?? []) as JsonRecord[];
  const deliveries = (deliveriesResult.data ?? []) as JsonRecord[];
  const issues = (issuesResult.data ?? []) as JsonRecord[];
  const corrections = (correctionsResult.data ?? []) as JsonRecord[];

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
    metrics.push(dashboardMetric("unlinked-media", "Media awaiting links", count, "Canonical media assets without an operational owner link.", "/admin/highlights", "blue"));
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

  return { metrics, activity, today, queryWarnings };
}
