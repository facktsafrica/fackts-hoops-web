import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { adminRolePresetDefinition, canAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

export const CORRECTION_FIELDS: Record<string, Record<string, "integer" | "number" | "boolean" | "date" | "text">> = {
  stat: {
    points: "integer", rebounds: "integer", offensive_rebounds: "integer", defensive_rebounds: "integer", assists: "integer", steals: "integer", blocks: "integer", turnovers: "integer", fouls: "integer", minutes: "number", two_made: "integer", two_attempted: "integer", three_made: "integer", three_attempted: "integer", ft_made: "integer", ft_attempted: "integer", plus_minus: "integer", player_of_game: "boolean",
  },
  game: { home_score: "integer", away_score: "integer", game_date: "date", status: "text", home_team_name: "text", away_team_name: "text", venue: "text", court: "text", game_stage: "text" },
  player: { full_name: "text", nickname: "text", jersey_number: "text", position: "text", current_team: "text", player_type: "text", is_active: "boolean", is_featured: "boolean" },
  event: { title: "text", summary: "text", venue: "text", location: "text", event_type: "text", age_category: "text", organizer_name: "text", status: "text", start_date: "date", end_date: "date" },
  team: { name: "text", short_name: "text", description: "text", city: "text", division: "text", age_category: "text", coach_name: "text" },
  media: { title: "text", rights_status: "text", publish_status: "text", is_public: "boolean" },
};

const ENTITY_TABLES: Record<string, { table: string; id: string }> = {
  stat: { table: "player_game_stats", id: "id" }, game: { table: "games", id: "id" }, player: { table: "players", id: "id" }, event: { table: "event_case_studies", id: "event_id" }, team: { table: "team_profiles", id: "id" }, media: { table: "media_assets", id: "id" },
};

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function typedValue(value: unknown, type: string) {
  if (type === "integer") {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) throw new Error("Proposed value must be a whole number.");
    return parsed;
  }
  if (type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("Proposed value must be a number.");
    return parsed;
  }
  if (type === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new Error("Proposed value must be true or false.");
  }
  if (type === "date") {
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) throw new Error("Proposed value must be a valid date.");
    return parsed.toISOString();
  }
  return cleanText(value, 5000);
}

async function correctionsAccess(write: boolean) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "corrections")) return { ...access, allowed: false };
  const role = adminRolePresetDefinition(access.profile.role);
  return { ...access, allowed: !(write && role?.readOnly) };
}

async function currentEntity(entityType: string, entityId: string) {
  const target = ENTITY_TABLES[entityType];
  if (!target) throw new Error("Choose a supported correction entity.");
  const admin = createSupabaseAdminClient();
  const result = await admin.from(target.table).select("*").eq(target.id, entityId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("Correction target not found.");
  return result.data as JsonRecord;
}

export async function GET() {
  try {
    const access = await correctionsAccess(false);
    if (!access.allowed) return NextResponse.json({ ok: false, error: "Corrections access is required." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const [requestsResult, changesResult, profilesResult] = await Promise.all([
      admin.from("correction_requests").select("*").order("updated_at", { ascending: false }).limit(2000),
      admin.from("correction_changes").select("*").order("created_at"),
      admin.from("admin_profiles").select("id,display_name,email,role"),
    ]);
    if (requestsResult.error) throw requestsResult.error;
    if (changesResult.error) throw changesResult.error;
    if (profilesResult.error) throw profilesResult.error;
    const changesByRequest = new Map<string, typeof changesResult.data>();
    for (const change of changesResult.data ?? []) {
      const current = changesByRequest.get(change.correction_request_id) ?? [];
      current.push(change);
      changesByRequest.set(change.correction_request_id, current);
    }
    return NextResponse.json({ ok: true, fields: CORRECTION_FIELDS, profiles: profilesResult.data ?? [], requests: (requestsResult.data ?? []).map((request) => ({ ...request, changes: changesByRequest.get(request.id) ?? [] })) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Corrections could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await correctionsAccess(true);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "You cannot request corrections." }, { status: 403 });
    const body = (await request.json()) as JsonRecord;
    const entityType = cleanText(body.entity_type, 30) || "";
    const entityId = cleanText(body.entity_id, 160);
    const fieldPath = cleanText(body.field_path, 100) || "";
    const reason = cleanText(body.reason, 5000);
    const type = CORRECTION_FIELDS[entityType]?.[fieldPath];
    if (!entityId || !type || !reason) return NextResponse.json({ ok: false, error: "Target, allowed field, proposed value and reason are required." }, { status: 400 });
    const entity = await currentEntity(entityType, entityId);
    const proposed = typedValue(body.proposed_value, type);
    const previous = entity[fieldPath] ?? null;
    if (JSON.stringify(previous) === JSON.stringify(proposed)) return NextResponse.json({ ok: false, error: "Proposed value is the same as the current value." }, { status: 400 });
    const admin = createSupabaseAdminClient();
    const requestResult = await admin.from("correction_requests").insert({
      entity_type: entityType,
      entity_id: entityId,
      correction_status: "open",
      summary: reason,
      requester_name: access.profile.display_name || access.profile.email || "FACKTS Admin",
      requester_contact: access.profile.email,
      requested_by_admin_profile_id: access.profile.id,
      evidence: Array.isArray(body.evidence) ? body.evidence : [],
      metadata: { source: "phase1_corrections", target_snapshot_captured: true },
    }).select("*").single();
    if (requestResult.error) throw requestResult.error;
    const changeResult = await admin.from("correction_changes").insert({ correction_request_id: requestResult.data.id, field_path: fieldPath, previous_value: previous, proposed_value: proposed, change_status: "proposed" }).select("*").single();
    if (changeResult.error) {
      await admin.from("correction_requests").delete().eq("id", requestResult.data.id);
      throw changeResult.error;
    }
    await recordAdminAuditEvent(access.supabase, { action: "request", entityType: "correction_request", entityId: requestResult.data.id, capability: "corrections", after: { request: requestResult.data, change: changeResult.data }, metadata: { source: "phase1_corrections", target_entity_type: entityType, target_entity_id: entityId } });
    return NextResponse.json({ ok: true, request: { ...requestResult.data, changes: [changeResult.data] }, message: "Correction requested with the current value preserved." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Correction request could not be created." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await correctionsAccess(true);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "You cannot review corrections." }, { status: 403 });
    const body = (await request.json()) as JsonRecord;
    const id = cleanText(body.id, 100);
    const action = cleanText(body.action, 30);
    const notes = cleanText(body.review_notes, 5000);
    if (!id || !["review", "approve", "reject", "apply"].includes(action || "")) return NextResponse.json({ ok: false, error: "Correction ID and review action are required." }, { status: 400 });
    const admin = createSupabaseAdminClient();
    const existing = await admin.from("correction_requests").select("*").eq("id", id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return NextResponse.json({ ok: false, error: "Correction request not found." }, { status: 404 });

    const allowedFrom: Record<string, string[]> = {
      review: ["open"],
      approve: ["open", "triaged"],
      reject: ["open", "triaged", "in_progress"],
      apply: ["in_progress"],
    };
    if (!allowedFrom[action || ""]?.includes(existing.data.correction_status)) {
      return NextResponse.json(
        { ok: false, error: `This request cannot be ${action}ed from ${existing.data.correction_status}.` },
        { status: 409 }
      );
    }

    if (action === "apply") {
      const result = await admin.rpc("phase1_apply_correction", { p_request_id: id, p_reviewer_profile_id: access.profile.id });
      if (result.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: 409 });
      await recordAdminAuditEvent(access.supabase, { action: "apply", entityType: "correction_request", entityId: id, capability: "corrections", before: existing.data, after: result.data, metadata: { source: "phase1_corrections" } });
      return NextResponse.json({ ok: true, result: result.data, message: "Correction applied transactionally; affected verified data requires re-verification." });
    }

    if (action === "reject" && !notes) return NextResponse.json({ ok: false, error: "Rejection notes are required." }, { status: 400 });
    const status = action === "review" ? "triaged" : action === "approve" ? "in_progress" : "rejected";
    const requestResult = await admin.from("correction_requests").update({
      correction_status: status,
      assigned_admin_profile_id: access.profile.id,
      reviewed_by: action === "review" ? existing.data.reviewed_by : access.profile.id,
      reviewed_at: action === "review" ? existing.data.reviewed_at : new Date().toISOString(),
      review_notes: notes || existing.data.review_notes,
      resolution_notes: action === "reject" ? notes : existing.data.resolution_notes,
      resolved_by: action === "reject" ? access.profile.id : null,
      resolved_at: action === "reject" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("*").single();
    if (requestResult.error) throw requestResult.error;
    if (["approve", "reject"].includes(action || "")) {
      let changesQuery = admin
        .from("correction_changes")
        .update({ change_status: action === "approve" ? "accepted" : "rejected", updated_at: new Date().toISOString() })
        .eq("correction_request_id", id);
      changesQuery = action === "approve"
        ? changesQuery.eq("change_status", "proposed")
        : changesQuery.in("change_status", ["proposed", "accepted"]);
      const changesResult = await changesQuery;
      if (changesResult.error) throw changesResult.error;
    }
    await recordAdminAuditEvent(access.supabase, { action: action || "review", entityType: "correction_request", entityId: id, capability: "corrections", before: existing.data, after: requestResult.data, metadata: { source: "phase1_corrections" } });
    return NextResponse.json({ ok: true, request: requestResult.data, message: action === "review" ? "Correction moved under review." : action === "approve" ? "Correction approved and ready to apply." : "Correction rejected with notes preserved." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Correction review failed." }, { status: 500 });
  }
}
