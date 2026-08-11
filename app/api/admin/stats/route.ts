import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { adminRolePresetDefinition, canAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type Assignment = { resource_type: string; resource_id: string; permissions?: string[] | null };

const NON_NEGATIVE_FIELDS = [
  "points", "rebounds", "offensive_rebounds", "defensive_rebounds", "assists",
  "steals", "blocks", "turnovers", "fouls", "minutes", "two_made",
  "two_attempted", "three_made", "three_attempted", "ft_made", "ft_attempted",
] as const;
const PERIOD_FIELDS = ["points", "rebounds", "assists", "steals", "blocks", "turnovers", "fouls"] as const;

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function numberValue(value: unknown, integer = true) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) return null;
  return parsed;
}

function gameStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (["finished", "final", "verified", "published"].includes(status)) return "completed";
  if (["scheduled", "draft", "pending"].includes(status)) return "upcoming";
  return status;
}

async function assignmentsFor(profileId: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin.from("admin_assignments").select("resource_type,resource_id,permissions,starts_at,ends_at").eq("admin_profile_id", profileId).eq("is_active", true);
  if (result.error) throw result.error;
  const now = Date.now();
  return (result.data ?? []).filter((assignment) => {
    const starts = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
    const ends = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
    return (starts === null || starts <= now) && (ends === null || ends > now);
  }) as Assignment[];
}

function assignmentMatches(assignment: Assignment, game: JsonRecord) {
  if (assignment.permissions?.length && !assignment.permissions.includes("stats")) return false;
  if (assignment.resource_type === "game") return assignment.resource_id === String(game.id ?? "");
  if (assignment.resource_type === "event") return assignment.resource_id === String(game.event_id ?? "");
  if (assignment.resource_type === "team") return [game.home_team_id, game.away_team_id].some((id) => assignment.resource_id === String(id ?? ""));
  return false;
}

async function statsAccess(write: boolean, game?: JsonRecord) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "stats")) return { ...access, allowed: false, assignments: [] as Assignment[] };
  const role = adminRolePresetDefinition(access.profile.role);
  if (write && role?.readOnly) return { ...access, allowed: false, assignments: [] as Assignment[] };
  if (!role?.requiresScope) return { ...access, allowed: true, assignments: null as Assignment[] | null };
  const assignments = await assignmentsFor(access.profile.id);
  return { ...access, allowed: game ? assignments.some((assignment) => assignmentMatches(assignment, game)) : true, assignments };
}

function validateValues(values: JsonRecord, periodValues: JsonRecord) {
  const errors: string[] = [];
  const parsed: JsonRecord = {};
  for (const field of NON_NEGATIVE_FIELDS) {
    const value = numberValue(values[field], field !== "minutes");
    if (value === null) errors.push(`${field.replaceAll("_", " ")} must be a non-negative ${field === "minutes" ? "number" : "whole number"}.`);
    parsed[field] = value ?? 0;
  }
  const plusMinus = Number(values.plus_minus ?? 0);
  if (!Number.isFinite(plusMinus) || !Number.isInteger(plusMinus)) errors.push("Plus / minus must be a whole number.");
  parsed.plus_minus = Number.isFinite(plusMinus) ? plusMinus : 0;

  for (const [made, attempted] of [["two_made", "two_attempted"], ["three_made", "three_attempted"], ["ft_made", "ft_attempted"]] as const) {
    if (Number(parsed[made]) > Number(parsed[attempted])) errors.push(`${made.replaceAll("_", " ")} cannot exceed attempts.`);
  }
  const detailedPoints = Number(parsed.two_made) * 2 + Number(parsed.three_made) * 3 + Number(parsed.ft_made);
  const hasShotDetail = ["two_made", "two_attempted", "three_made", "three_attempted", "ft_made", "ft_attempted"].some((field) => Number(parsed[field]) > 0);
  if (hasShotDetail && Number(parsed.points) !== detailedPoints) errors.push("Points must equal 2PT, 3PT and free-throw makes when shot detail is entered.");
  const splitRebounds = Number(parsed.offensive_rebounds) + Number(parsed.defensive_rebounds);
  if (splitRebounds > 0 && Number(parsed.rebounds) !== splitRebounds) errors.push("Total rebounds must equal offensive plus defensive rebounds.");

  const normalizedPeriods: JsonRecord = {};
  for (const [period, periodInput] of Object.entries(periodValues)) {
    if (!/^(Q[1-4]|OT[1-9]?)$/.test(period) || !periodInput || typeof periodInput !== "object" || Array.isArray(periodInput)) {
      errors.push("Period values must use Q1–Q4 or OT keys.");
      continue;
    }
    const periodRow: JsonRecord = {};
    for (const field of PERIOD_FIELDS) {
      const value = numberValue((periodInput as JsonRecord)[field]);
      if (value === null) errors.push(`${period} ${field} must be a non-negative whole number.`);
      periodRow[field] = value ?? 0;
    }
    normalizedPeriods[period] = periodRow;
  }
  if (Object.keys(normalizedPeriods).length) {
    for (const field of PERIOD_FIELDS) {
      const total = Object.values(normalizedPeriods).reduce<number>(
        (sum, period) => sum + Number((period as JsonRecord)[field] ?? 0),
        0
      );
      if (Number(parsed[field]) !== total) errors.push(`${field.replaceAll("_", " ")} total must equal the saved period values.`);
    }
  }
  return { errors, values: parsed, periodValues: normalizedPeriods };
}

async function gameBundle(gameId: string) {
  const admin = createSupabaseAdminClient();
  const gameResult = await admin.from("games").select("*").eq("id", gameId).maybeSingle();
  if (gameResult.error) throw gameResult.error;
  if (!gameResult.data) throw new Error("GAME_NOT_FOUND");
  const [rosterResult, statsResult] = await Promise.all([
    admin.from("game_rosters").select("*").eq("game_id", gameId).neq("roster_status", "unavailable").order("team_side").order("created_at"),
    admin.from("player_game_stats").select("*").eq("game_id", gameId),
  ]);
  if (rosterResult.error) throw rosterResult.error;
  if (statsResult.error) throw statsResult.error;
  const playerIds = Array.from(new Set((rosterResult.data ?? []).map((row) => row.player_id).filter(Boolean)));
  const peopleResult = playerIds.length
    ? await admin.from("players").select("id,full_name,name,nickname,jersey_number,player_type,photo_url,is_active").in("id", playerIds)
    : { data: [], error: null };
  if (peopleResult.error) throw peopleResult.error;
  const peopleById = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
  return {
    game: { ...gameResult.data, status: gameStatus(gameResult.data.status) },
    roster: (rosterResult.data ?? []).map((row) => ({ ...row, person: peopleById.get(row.player_id) ?? null })),
    stats: statsResult.data ?? [],
  };
}

function workflowValidation(bundle: Awaited<ReturnType<typeof gameBundle>>) {
  const errors: string[] = [];
  if (!bundle.roster.length) errors.push("The game has no eligible canonical roster participants.");
  const statsByPlayer = new Map(bundle.stats.map((stat) => [stat.player_id, stat]));
  for (const roster of bundle.roster) {
    const stat = statsByPlayer.get(roster.player_id);
    if (!stat) {
      const person = roster.person as JsonRecord | null;
      errors.push(`${person?.full_name || person?.name || "A roster participant"} has no saved stat line.`);
      continue;
    }
    const validation = validateValues(stat, stat.period_values && typeof stat.period_values === "object" ? stat.period_values : {});
    errors.push(...validation.errors.map((error) => `${(roster.person as JsonRecord | null)?.full_name || "Participant"}: ${error}`));
  }
  return errors;
}

function auditScope(assignments: Assignment[] | null, game: JsonRecord) {
  const assignment = assignments?.find((candidate) => assignmentMatches(candidate, game));
  return { resourceType: assignment?.resource_type ?? "game", resourceId: assignment?.resource_id ?? String(game.id) };
}

export async function GET(request: NextRequest) {
  try {
    const access = await statsAccess(false);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "Statistics access is required." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const selectedGameId = cleanText(request.nextUrl.searchParams.get("game_id"), 100);
    const gamesResult = await admin.from("games").select("id,event_id,title,home_team_id,away_team_id,home_team_name,away_team_name,game_date,status,game_format,game_stage,home_score,team_score,away_score,opponent_score,verification_status,version").order("game_date", { ascending: false }).limit(1000);
    if (gamesResult.error) throw gamesResult.error;
    let games = (gamesResult.data ?? []).map((game) => ({ ...game, status: gameStatus(game.status) }));
    if (access.assignments) games = games.filter((game) => access.assignments?.some((assignment) => assignmentMatches(assignment, game)));
    const selected = games.find((game) => String(game.id) === selectedGameId) ?? games[0] ?? null;
    if (!selected) return NextResponse.json({ ok: true, games: [], game: null, roster: [], stats: [], field_definitions: [], field_config: [], legacy_guest_stats: 0 });

    const [bundle, definitionsResult, configResult, legacyResult] = await Promise.all([
      gameBundle(String(selected.id)),
      admin.from("stat_field_definitions").select("*").eq("is_active", true).order("display_order"),
      admin.from("competition_stat_fields").select("*").eq("game_format", ["1v1", "2v2", "3v3", "5v5"].includes(String(selected.game_format)) ? selected.game_format : "custom").eq("is_visible", true).order("display_order"),
      admin.from("guest_game_stats").select("id", { count: "exact", head: true }).eq("game_id", selected.id),
    ]);
    if (definitionsResult.error) throw definitionsResult.error;
    if (configResult.error) throw configResult.error;
    if (legacyResult.error) throw legacyResult.error;
    return NextResponse.json({ ok: true, games, ...bundle, field_definitions: definitionsResult.data ?? [], field_config: configResult.data ?? [], legacy_guest_stats: legacyResult.count ?? 0 });
  } catch (error) {
    const notFound = error instanceof Error && error.message === "GAME_NOT_FOUND";
    return NextResponse.json({ ok: false, error: notFound ? "Game not found." : error instanceof Error ? error.message : "Statistics could not be loaded." }, { status: notFound ? 404 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const action = cleanText(body.action, 30) || "autosave";
    const gameId = cleanText(body.game_id, 100);
    if (!gameId) return NextResponse.json({ ok: false, error: "Game ID is required." }, { status: 400 });
    const access = await statsAccess(true);
    if (!access.allowed || !access.user) return NextResponse.json({ ok: false, error: "You cannot update statistics for this game." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const scopeTarget = await admin.from("games").select("id,event_id,home_team_id,away_team_id").eq("id", gameId).maybeSingle();
    if (scopeTarget.error) throw scopeTarget.error;
    if (!scopeTarget.data) return NextResponse.json({ ok: false, error: "Game not found." }, { status: 404 });
    const scopedGame = scopeTarget.data;
    if (access.assignments && !access.assignments.some((assignment) => assignmentMatches(assignment, scopedGame))) {
      return NextResponse.json({ ok: false, error: "You cannot update statistics for this game." }, { status: 403 });
    }
    const bundle = await gameBundle(gameId);
    const scope = auditScope(access.assignments, bundle.game);

    if (action === "autosave") {
      if (!(["live", "completed"].includes(String(bundle.game.status)))) return NextResponse.json({ ok: false, error: "Statistics can only be entered for live or completed games." }, { status: 409 });
      const playerId = cleanText(body.player_id, 100);
      const expectedVersion = Number(body.expected_version ?? 0);
      if (!playerId || !Number.isInteger(expectedVersion) || expectedVersion < 0) return NextResponse.json({ ok: false, error: "Canonical participant and current autosave version are required." }, { status: 400 });
      const roster = bundle.roster.find((row) => String(row.player_id) === playerId);
      if (!roster) return NextResponse.json({ ok: false, error: "This canonical person is not on the eligible game roster." }, { status: 409 });
      const existingRows = bundle.stats.filter((row) => String(row.player_id) === playerId);
      if (existingRows.length > 1) return NextResponse.json({ ok: false, error: "Duplicate canonical stat rows require Data Corrections review." }, { status: 409 });
      const existing = existingRows[0] ?? null;
      if (existing?.verification_status === "verified" || existing?.entry_status === "verified") {
        return NextResponse.json({ ok: false, error: "Verified statistics cannot be overwritten. Open a correction request.", correction_required: true, stat_id: existing.id }, { status: 409 });
      }
      const values = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values as JsonRecord : {};
      const periods = body.period_values && typeof body.period_values === "object" && !Array.isArray(body.period_values) ? body.period_values as JsonRecord : {};
      const validation = validateValues(values, periods);
      if (validation.errors.length) return NextResponse.json({ ok: false, error: validation.errors[0], errors: validation.errors }, { status: 400 });
      const now = new Date().toISOString();
      const payload = {
        game_id: gameId,
        player_id: playerId,
        ...validation.values,
        three_pointers_made: validation.values.three_made,
        q1: Number((validation.periodValues.Q1 as JsonRecord | undefined)?.points ?? 0),
        q2: Number((validation.periodValues.Q2 as JsonRecord | undefined)?.points ?? 0),
        q3: Number((validation.periodValues.Q3 as JsonRecord | undefined)?.points ?? 0),
        q4: Number((validation.periodValues.Q4 as JsonRecord | undefined)?.points ?? 0),
        period_values: validation.periodValues,
        team_side: roster.team_side || "home",
        entry_status: "draft",
        verification_status: "unverified",
        autosave_version: expectedVersion + 1,
        last_period: cleanText(body.last_period, 10),
        last_saved_at: now,
        saved_by: access.user.id,
        updated_at: now,
      };
      const result = existing
        ? await admin.from("player_game_stats").update(payload).eq("id", existing.id).eq("autosave_version", expectedVersion).select("*").maybeSingle()
        : expectedVersion === 0
          ? await admin.from("player_game_stats").insert({ ...payload, created_at: now }).select("*").single()
          : { data: null, error: null };
      if (result.error) throw result.error;
      if (!result.data) return NextResponse.json({ ok: false, error: "This stat line changed in another session. Reload before continuing.", conflict: true }, { status: 409 });
      await recordAdminAuditEvent(access.supabase, { action: "autosave", entityType: "player_game_stats", entityId: String(result.data.id), capability: "stats", ...scope, before: existing, after: result.data, metadata: { source: "phase1_shared_stats" } });
      return NextResponse.json({ ok: true, stat: result.data, message: "Autosaved." });
    }

    if (action === "submit_game" || action === "verify_game") {
      const errors = workflowValidation(bundle);
      if (action === "submit_game" && bundle.game.verification_status === "verified") {
        errors.push("Verified game statistics are locked. Use Data Corrections for changes.");
      }
      if (action === "verify_game" && bundle.game.status !== "completed") errors.push("Only completed games can be verified.");
      if (action === "verify_game") {
        const homeScore = Number(bundle.game.home_score ?? bundle.game.team_score);
        const awayScore = Number(bundle.game.away_score ?? bundle.game.opponent_score);
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) errors.push("Both final game scores are required before verification.");
        const rosterPlayerIds = new Set(bundle.roster.map((row) => row.player_id));
        const totals = bundle.stats.filter((stat) => rosterPlayerIds.has(stat.player_id)).reduce((result, stat) => {
          const side = stat.team_side === "away" ? "away" : "home";
          result[side] += Number(stat.points ?? 0);
          return result;
        }, { home: 0, away: 0 });
        if (Number.isFinite(homeScore) && totals.home !== homeScore) errors.push(`Home stat points (${totals.home}) do not equal the game score (${homeScore}).`);
        if (Number.isFinite(awayScore) && totals.away !== awayScore) errors.push(`Away stat points (${totals.away}) do not equal the game score (${awayScore}).`);
        if (bundle.stats.some((stat) => !["submitted", "verified"].includes(stat.entry_status))) errors.push("Submit all statistics before final verification.");
      }
      if (errors.length) return NextResponse.json({ ok: false, error: errors[0], errors }, { status: 400 });
      const rosterPlayerIds = new Set(bundle.roster.map((row) => row.player_id));
      const statIds = bundle.stats.filter((stat) => rosterPlayerIds.has(stat.player_id)).map((stat) => stat.id);
      const now = new Date().toISOString();
      const verified = action === "verify_game";
      const statsResult = await admin.from("player_game_stats").update({
        entry_status: verified ? "verified" : "submitted",
        verification_status: verified ? "verified" : "pending",
        submitted_at: now,
        submitted_by: access.user.id,
        verified_at: verified ? now : null,
        verified_by: verified ? access.user.id : null,
        last_saved_at: now,
        updated_at: now,
      }).in("id", statIds).select("id");
      if (statsResult.error) throw statsResult.error;
      const gameResult = await admin.from("games").update({
        verification_status: verified ? "verified" : "pending",
        verified_at: verified ? now : null,
        verified_by: verified ? access.user.email || "FACKTS Admin" : null,
        updated_at: now,
      }).eq("id", gameId);
      if (gameResult.error) throw gameResult.error;
      await recordAdminAuditEvent(access.supabase, { action: verified ? "verify" : "submit", entityType: "game_statistics", entityId: gameId, capability: "stats", ...scope, after: { stat_ids: statIds, verification_status: verified ? "verified" : "pending" }, metadata: { source: "phase1_shared_stats" } });
      return NextResponse.json({ ok: true, message: verified ? "Game statistics verified and locked." : "Game statistics submitted for verification." });
    }

    return NextResponse.json({ ok: false, error: "Unknown statistics action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Statistics operation failed." }, { status: 500 });
  }
}
