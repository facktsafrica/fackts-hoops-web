import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { adminRolePresetDefinition, canAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type Assignment = { resource_type: string; resource_id: string; permissions?: string[] | null };

const ROSTER_ROLES = new Set(["starter", "bench"]);
const ROSTER_STATUSES = new Set(["confirmed", "pending", "unavailable"]);
const TEAM_SIDES = new Set(["home", "away", "neutral"]);
const PARTICIPATION_ROLES = new Set(["player", "guest", "external", "coach", "staff"]);

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function sanitizeRawRow(raw: JsonRecord) {
  return Object.fromEntries(
    Object.entries(raw)
      .slice(0, 100)
      .map(([key, value]) => [key.slice(0, 120), cleanText(value, 2000) ?? ""])
  );
}

function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function tokenName(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort()
    .join("|");
}

function normalizedHeader(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function rawValue(raw: JsonRecord, aliases: string[]) {
  const normalized = new Map(Object.entries(raw).map(([key, value]) => [normalizedHeader(key), value]));
  for (const alias of aliases) {
    const value = cleanText(normalized.get(alias), 500);
    if (value) return value;
  }
  return null;
}

function jerseyError(value: string | null) {
  if (!value) return "Jersey number is required.";
  if (!/^\d{1,2}$/.test(value) || Number(value) > 99) return "Jersey number must be a whole number from 0 to 99.";
  return null;
}

async function assignmentsFor(profileId: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("admin_assignments")
    .select("resource_type,resource_id,permissions,starts_at,ends_at")
    .eq("admin_profile_id", profileId)
    .eq("is_active", true);
  if (result.error) throw result.error;
  const now = Date.now();
  return (result.data ?? []).filter((assignment) => {
    const starts = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
    const ends = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
    return (starts === null || starts <= now) && (ends === null || ends > now);
  }) as Assignment[];
}

function assignmentMatches(assignment: Assignment, game: JsonRecord) {
  if (assignment.permissions?.length && !assignment.permissions.includes("rosters")) return false;
  if (assignment.resource_type === "game") return assignment.resource_id === String(game.id ?? "");
  if (assignment.resource_type === "event") return assignment.resource_id === String(game.event_id ?? "");
  if (assignment.resource_type === "team") {
    return [game.home_team_id, game.away_team_id].some((id) => assignment.resource_id === String(id ?? ""));
  }
  return false;
}

async function rosterAccess(write: boolean, game?: JsonRecord) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "rosters")) {
    return { ...access, allowed: false, assignments: [] as Assignment[] };
  }
  const role = adminRolePresetDefinition(access.profile.role);
  if (write && role?.readOnly) return { ...access, allowed: false, assignments: [] as Assignment[] };
  if (!role?.requiresScope) return { ...access, allowed: true, assignments: null as Assignment[] | null };
  const assignments = await assignmentsFor(access.profile.id);
  return { ...access, allowed: game ? assignments.some((assignment) => assignmentMatches(assignment, game)) : true, assignments };
}

function personNames(person: JsonRecord) {
  return [person.full_name, person.name, person.nickname].filter(Boolean);
}

function prepareRows(
  rawRows: JsonRecord[],
  people: JsonRecord[],
  existingPlayerIds: Set<string>,
  defaultSide: string
) {
  const staged = rawRows.map((raw, index) => {
    const displayName = rawValue(raw, ["full_name", "display_name", "player_name", "name", "player"]);
    const normalized = normalizeName(displayName);
    const tokens = tokenName(displayName);
    const explicitId = rawValue(raw, ["player_id", "person_id", "canonical_player_id"]);
    const email = rawValue(raw, ["email", "email_address"]);
    const phone = rawValue(raw, ["phone", "phone_number", "mobile"]);
    const jersey = rawValue(raw, ["jersey_number", "jersey", "number", "shirt_number"]);
    const roleValue = (rawValue(raw, ["roster_role", "lineup_role", "role"]) || "bench").toLowerCase();
    const statusValue = (rawValue(raw, ["roster_status", "status"]) || "confirmed").toLowerCase();
    const sideValue = (rawValue(raw, ["team_side", "side", "team_assignment"]) || defaultSide).toLowerCase();
    const participationValue = (rawValue(raw, ["participation_role", "participant_type", "person_type"]) || "player").toLowerCase();
    const errors: string[] = [];
    let candidates: JsonRecord[] = [];
    let matchStatus: "exact" | "likely" | "ambiguous" | "unmatched" = "unmatched";
    let confidence: number | null = null;

    if (!displayName) errors.push("Full name is required.");
    if (explicitId) candidates = people.filter((person) => String(person.id) === explicitId);
    if (!candidates.length && email) candidates = people.filter((person) => String(person.email ?? "").toLowerCase() === email.toLowerCase());
    if (!candidates.length && phone) candidates = people.filter((person) => String(person.phone ?? "").replace(/\D+/g, "") === phone.replace(/\D+/g, ""));
    if (!candidates.length && normalized) {
      candidates = people.filter((person) => personNames(person).some((name) => normalizeName(name) === normalized));
    }

    if (candidates.length === 1) {
      matchStatus = "exact";
      confidence = explicitId || email || phone ? 100 : 95;
    } else if (candidates.length > 1) {
      matchStatus = "ambiguous";
      confidence = 50;
      errors.push("Multiple canonical people match this row. Choose one manually.");
    } else if (tokens) {
      const likely = people.filter((person) => personNames(person).some((name) => tokenName(name) === tokens));
      if (likely.length === 1) {
        candidates = likely;
        matchStatus = "likely";
        confidence = 75;
        errors.push("Name order differs. Confirm the likely canonical person manually.");
      } else if (likely.length > 1) {
        candidates = likely;
        matchStatus = "ambiguous";
        confidence = 40;
        errors.push("Name formatting matches multiple people. Choose one manually.");
      }
    }

    if (!candidates.length) errors.push("No canonical person matched. Create or review the person in People, then select them here.");
    const jerseyMessage = jerseyError(jersey);
    if (jerseyMessage) errors.push(jerseyMessage);
    if (!ROSTER_ROLES.has(roleValue)) errors.push("Roster role must be starter or bench.");
    if (!ROSTER_STATUSES.has(statusValue)) errors.push("Roster status must be confirmed, pending or unavailable.");
    if (!TEAM_SIDES.has(sideValue)) errors.push("Team side must be home, away or neutral.");
    if (!PARTICIPATION_ROLES.has(participationValue)) errors.push("Participation role is not supported.");

    const candidateId = candidates.length === 1 ? String(candidates[0].id) : null;
    if (candidateId && existingPlayerIds.has(candidateId)) errors.push("This person is already on the selected game roster.");

    return {
      row_number: index + 1,
      raw_data: raw,
      display_name: displayName,
      normalized_name: normalized || null,
      candidate_player_id: candidateId,
      match_status: matchStatus,
      match_confidence: confidence,
      jersey_number: jersey,
      roster_role: roleValue,
      roster_status: statusValue,
      team_side: sideValue,
      participation_role: participationValue,
      validation_errors: errors,
    };
  });

  const byPlayer = new Map<string, number[]>();
  const byName = new Map<string, number[]>();
  staged.forEach((row, index) => {
    if (row.candidate_player_id) byPlayer.set(row.candidate_player_id, [...(byPlayer.get(row.candidate_player_id) ?? []), index]);
    if (row.normalized_name) byName.set(row.normalized_name, [...(byName.get(row.normalized_name) ?? []), index]);
  });
  for (const indexes of [...byPlayer.values(), ...byName.values()]) {
    if (indexes.length < 2) continue;
    indexes.forEach((index) => {
      if (!staged[index].validation_errors.includes("Duplicate person appears more than once in this file.")) {
        staged[index].validation_errors.push("Duplicate person appears more than once in this file.");
      }
    });
  }
  return staged;
}

async function loadBatch(admin: SupabaseClient, batchId: string) {
  const [batchResult, rowsResult] = await Promise.all([
    admin.from("roster_import_batches").select("*").eq("id", batchId).maybeSingle(),
    admin.from("roster_import_rows").select("*").eq("batch_id", batchId).order("row_number"),
  ]);
  if (batchResult.error) throw batchResult.error;
  if (rowsResult.error) throw rowsResult.error;
  if (!batchResult.data) throw new Error("ROSTER_IMPORT_BATCH_NOT_FOUND");
  return { batch: batchResult.data, rows: rowsResult.data ?? [] };
}

async function revalidateBatch(admin: SupabaseClient, batchId: string, people: JsonRecord[], existingPlayerIds: Set<string>) {
  const setup = await loadBatch(admin, batchId);
  const playerIds = new Set(people.map((person) => String(person.id)));
  const playerCounts = new Map<string, number>();
  setup.rows.forEach((row) => {
    if (row.candidate_player_id) playerCounts.set(row.candidate_player_id, (playerCounts.get(row.candidate_player_id) ?? 0) + 1);
  });

  const updated = [];
  for (const row of setup.rows) {
    const errors: string[] = [];
    if (!row.display_name?.trim()) errors.push("Full name is required.");
    if (!row.candidate_player_id || !playerIds.has(row.candidate_player_id)) errors.push("Select one canonical person.");
    if (row.candidate_player_id && (playerCounts.get(row.candidate_player_id) ?? 0) > 1) errors.push("Duplicate person appears more than once in this file.");
    if (row.candidate_player_id && existingPlayerIds.has(row.candidate_player_id)) errors.push("This person is already on the selected game roster.");
    const jerseyMessage = jerseyError(row.jersey_number);
    if (jerseyMessage) errors.push(jerseyMessage);
    if (!ROSTER_ROLES.has(row.roster_role)) errors.push("Roster role must be starter or bench.");
    if (!ROSTER_STATUSES.has(row.roster_status)) errors.push("Roster status must be confirmed, pending or unavailable.");
    if (!TEAM_SIDES.has(row.team_side)) errors.push("Team side must be home, away or neutral.");
    if (!PARTICIPATION_ROLES.has(row.participation_role)) errors.push("Participation role is not supported.");

    const result = await admin
      .from("roster_import_rows")
      .update({
        validation_errors: errors,
        match_status: row.candidate_player_id ? "exact" : "unmatched",
        match_confidence: row.candidate_player_id ? 100 : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (result.error) throw result.error;
    updated.push(result.data);
  }

  const errorRows = updated.filter((row) => row.validation_errors.length > 0).length;
  const validRows = updated.length - errorRows;
  const batchResult = await admin
    .from("roster_import_batches")
    .update({
      status: errorRows ? "blocked" : "validated",
      total_rows: updated.length,
      valid_rows: validRows,
      error_rows: errorRows,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId)
    .select("*")
    .single();
  if (batchResult.error) throw batchResult.error;
  return { batch: batchResult.data, rows: updated };
}

export async function GET(request: NextRequest) {
  try {
    const access = await rosterAccess(false);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "Roster access is required." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const selectedGameId = cleanText(request.nextUrl.searchParams.get("game_id"), 100);
    const selectedEventId = cleanText(request.nextUrl.searchParams.get("event_id"), 160);

    const gamesResult = await admin.from("games").select("id,event_id,title,home_team_id,away_team_id,home_team_name,away_team_name,game_date,status,venue,version").order("game_date", { ascending: false }).limit(1000);
    if (gamesResult.error) throw gamesResult.error;
    let games = gamesResult.data ?? [];
    if (access.assignments) games = games.filter((game) => access.assignments?.some((assignment) => assignmentMatches(assignment, game)));
    if (selectedEventId) games = games.filter((candidate) => candidate.event_id === selectedEventId);
    const game = games.find((candidate) => String(candidate.id) === selectedGameId) ?? games[0] ?? null;
    if (!game) return NextResponse.json({ ok: true, games: [], game: null, people: [], roster: [], batches: [] });

    const [peopleResult, rosterResult, batchesResult] = await Promise.all([
      admin.from("players").select("id,full_name,name,nickname,email,phone,jersey_number,player_type,is_active").eq("is_active", true).order("full_name").limit(2000),
      admin.from("game_rosters").select("*").eq("game_id", game.id).order("created_at"),
      admin.from("roster_import_batches").select("*").eq("game_id", game.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (peopleResult.error) throw peopleResult.error;
    if (rosterResult.error) throw rosterResult.error;
    if (batchesResult.error) throw batchesResult.error;
    const peopleById = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
    const roster = (rosterResult.data ?? []).map((row) => ({ ...row, person: peopleById.get(row.player_id) ?? null }));

    const batchId = cleanText(request.nextUrl.searchParams.get("batch_id"), 100);
    const batchSetup = batchId ? await loadBatch(admin, batchId) : null;
    return NextResponse.json({ ok: true, games, game, people: peopleResult.data ?? [], roster, batches: batchesResult.data ?? [], active_batch: batchSetup?.batch ?? null, import_rows: batchSetup?.rows ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rosters could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const action = cleanText(body.action, 30);
    const access = await rosterAccess(true);
    if (!access.allowed || !access.user || !access.profile) {
      return NextResponse.json({ ok: false, error: "You cannot change game rosters." }, { status: 403 });
    }
    const admin = createSupabaseAdminClient();

    if (action === "stage") {
      const gameId = cleanText(body.game_id, 100);
      const fileName = cleanText(body.file_name, 240);
      const fileHash = cleanText(body.file_hash, 128);
      const fileType = cleanText(body.file_type, 20);
      const defaultSide = cleanText(body.default_team_side, 20) || "home";
      const rawRows = Array.isArray(body.rows)
        ? body.rows
            .filter((row): row is JsonRecord => Boolean(row) && typeof row === "object" && !Array.isArray(row))
            .map(sanitizeRawRow)
        : [];
      if (!gameId || !fileName || !fileHash || !["csv", "xlsx"].includes(fileType || "") || !TEAM_SIDES.has(defaultSide) || !rawRows.length || rawRows.length > 5000) {
        return NextResponse.json({ ok: false, error: "Choose a game and a valid CSV/XLSX file containing 1 to 5,000 rows." }, { status: 400 });
      }

      const gameResult = await admin.from("games").select("*").eq("id", gameId).maybeSingle();
      if (gameResult.error) throw gameResult.error;
      if (!gameResult.data) return NextResponse.json({ ok: false, error: "Game not found." }, { status: 404 });
      if (access.assignments && !access.assignments.some((assignment) => assignmentMatches(assignment, gameResult.data))) return NextResponse.json({ ok: false, error: "You cannot import this game roster." }, { status: 403 });

      const duplicate = await admin.from("roster_import_batches").select("id,status,created_at").eq("game_id", gameId).eq("file_hash", fileHash).maybeSingle();
      if (duplicate.error) throw duplicate.error;
      if (duplicate.data) return NextResponse.json({ ok: false, error: "This exact file has already been staged for this game.", existing_batch: duplicate.data }, { status: 409 });

      const [peopleResult, rosterResult] = await Promise.all([
        admin.from("players").select("id,full_name,name,nickname,email,phone,jersey_number,player_type,is_active").eq("is_active", true).limit(5000),
        admin.from("game_rosters").select("player_id").eq("game_id", gameId),
      ]);
      if (peopleResult.error) throw peopleResult.error;
      if (rosterResult.error) throw rosterResult.error;
      const existingPlayerIds = new Set((rosterResult.data ?? []).map((row) => String(row.player_id)));
      const stagedRows = prepareRows(rawRows, peopleResult.data ?? [], existingPlayerIds, defaultSide);
      const errorRows = stagedRows.filter((row) => row.validation_errors.length > 0).length;

      const batchResult = await admin.from("roster_import_batches").insert({
        game_id: gameId,
        file_name: fileName,
        file_hash: fileHash,
        file_type: fileType,
        default_team_side: defaultSide,
        status: errorRows ? "blocked" : "validated",
        total_rows: stagedRows.length,
        valid_rows: stagedRows.length - errorRows,
        error_rows: errorRows,
        created_by: access.user.id,
      }).select("*").single();
      if (batchResult.error) throw batchResult.error;

      const rowsResult = await admin.from("roster_import_rows").insert(stagedRows.map((row) => ({ ...row, batch_id: batchResult.data.id }))).select("*").order("row_number");
      if (rowsResult.error) {
        await admin.from("roster_import_batches").delete().eq("id", batchResult.data.id);
        throw rowsResult.error;
      }

      const auditAssignment = access.assignments?.find((assignment) => assignmentMatches(assignment, gameResult.data));
      await recordAdminAuditEvent(access.supabase, {
        action: "stage_import",
        entityType: "roster_import_batch",
        entityId: batchResult.data.id,
        capability: "rosters",
        resourceType: auditAssignment?.resource_type ?? "game",
        resourceId: auditAssignment?.resource_id ?? gameId,
        after: batchResult.data,
        metadata: { source: "phase1_rosters", file_type: fileType },
      });

      return NextResponse.json({ ok: true, batch: batchResult.data, rows: rowsResult.data ?? [], people: peopleResult.data ?? [], message: errorRows ? "File staged with rows requiring review." : "File staged and fully validated." }, { status: 201 });
    }

    if (action === "commit") {
      const batchId = cleanText(body.batch_id, 100);
      if (!batchId) return NextResponse.json({ ok: false, error: "Import batch ID is required." }, { status: 400 });
      const batchTarget = await admin.from("roster_import_batches").select("id,game_id").eq("id", batchId).maybeSingle();
      if (batchTarget.error) throw batchTarget.error;
      if (!batchTarget.data) return NextResponse.json({ ok: false, error: "Roster import batch not found." }, { status: 404 });
      const gameResult = await admin.from("games").select("*").eq("id", batchTarget.data.game_id).maybeSingle();
      if (gameResult.error) throw gameResult.error;
      if (!gameResult.data) return NextResponse.json({ ok: false, error: "Game not found." }, { status: 404 });
      if (access.assignments && !access.assignments.some((assignment) => assignmentMatches(assignment, gameResult.data))) return NextResponse.json({ ok: false, error: "You cannot commit this roster import." }, { status: 403 });
      const setup = await loadBatch(admin, batchId);

      const result = await admin.rpc("phase1_commit_roster_import", { p_batch_id: batchId, p_committed_by: access.user.id });
      if (result.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: 409 });
      const auditAssignment = access.assignments?.find((assignment) => assignmentMatches(assignment, gameResult.data));
      await recordAdminAuditEvent(access.supabase, {
        action: "commit_import",
        entityType: "roster_import_batch",
        entityId: batchId,
        capability: "rosters",
        resourceType: auditAssignment?.resource_type ?? "game",
        resourceId: auditAssignment?.resource_id ?? setup.batch.game_id,
        before: setup.batch,
        after: result.data,
        metadata: { source: "phase1_rosters" },
      });
      return NextResponse.json({ ok: true, result: result.data, message: "Roster import committed atomically." });
    }

    return NextResponse.json({ ok: false, error: "Unknown roster action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Roster operation failed." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const batchId = cleanText(body.batch_id, 100);
    const rowId = cleanText(body.row_id, 100);
    if (!batchId || !rowId) return NextResponse.json({ ok: false, error: "Batch and row IDs are required." }, { status: 400 });
    const access = await rosterAccess(true);
    if (!access.allowed || !access.user) return NextResponse.json({ ok: false, error: "You cannot correct this roster import." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const batchTarget = await admin.from("roster_import_batches").select("id,game_id,status").eq("id", batchId).maybeSingle();
    if (batchTarget.error) throw batchTarget.error;
    if (!batchTarget.data) return NextResponse.json({ ok: false, error: "Roster import batch not found." }, { status: 404 });
    if (["committed", "cancelled"].includes(batchTarget.data.status)) return NextResponse.json({ ok: false, error: "Committed or cancelled imports cannot be edited." }, { status: 409 });
    const gameResult = await admin.from("games").select("*").eq("id", batchTarget.data.game_id).maybeSingle();
    if (gameResult.error) throw gameResult.error;
    if (!gameResult.data) return NextResponse.json({ ok: false, error: "Game not found." }, { status: 404 });
    if (access.assignments && !access.assignments.some((assignment) => assignmentMatches(assignment, gameResult.data))) return NextResponse.json({ ok: false, error: "You cannot correct this roster import." }, { status: 403 });
    const setup = await loadBatch(admin, batchId);

    const candidateId = cleanText(body.candidate_player_id, 100);
    const updateResult = await admin.from("roster_import_rows").update({
      candidate_player_id: candidateId,
      display_name: cleanText(body.display_name, 180),
      normalized_name: normalizeName(body.display_name) || null,
      jersey_number: cleanText(body.jersey_number, 10),
      roster_role: cleanText(body.roster_role, 30),
      roster_status: cleanText(body.roster_status, 30),
      team_side: cleanText(body.team_side, 20),
      participation_role: cleanText(body.participation_role, 30),
      updated_at: new Date().toISOString(),
    }).eq("batch_id", batchId).eq("id", rowId).select("id").maybeSingle();
    if (updateResult.error) throw updateResult.error;
    if (!updateResult.data) return NextResponse.json({ ok: false, error: "Import row not found." }, { status: 404 });

    const [peopleResult, rosterResult] = await Promise.all([
      admin.from("players").select("id,full_name,name,nickname,email,phone,jersey_number,player_type,is_active").eq("is_active", true).limit(5000),
      admin.from("game_rosters").select("player_id").eq("game_id", setup.batch.game_id),
    ]);
    if (peopleResult.error) throw peopleResult.error;
    if (rosterResult.error) throw rosterResult.error;
    const validated = await revalidateBatch(admin, batchId, peopleResult.data ?? [], new Set((rosterResult.data ?? []).map((row) => String(row.player_id))));
    return NextResponse.json({ ok: true, ...validated, people: peopleResult.data ?? [], message: validated.batch.status === "validated" ? "All rows are valid and ready to commit." : "Row saved. Remaining errors are shown below." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Import row could not be updated." }, { status: 500 });
  }
}
