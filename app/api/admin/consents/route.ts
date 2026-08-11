import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { adminRolePresetDefinition, canAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type Assignment = { resource_type: string; resource_id: string; permissions?: string[] | null };

const SUBJECT_TYPES = new Set(["adult", "minor", "guardian", "team_group", "official", "volunteer", "other"]);
const STATUSES = new Set(["pending", "approved", "restricted", "withdrawn", "expired", "rejected"]);
const CAPTURE_METHODS = new Set(["application", "document", "digital_form", "admin_record", "other"]);
const SCOPES = new Set(["photo_use", "video_use", "audio_use", "promotional_use", "website_use", "social_media_use", "internal_archive", "all_media"]);

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => cleanText(item, 80)).filter((item): item is string => Boolean(item))))
    : [];
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

function assignmentMatches(assignment: Assignment, consent: JsonRecord) {
  if (assignment.permissions?.length && !assignment.permissions.includes("consents")) return false;
  if (assignment.resource_type === "event") return assignment.resource_id === String(consent.event_id ?? "");
  if (assignment.resource_type === "player") return assignment.resource_id === String(consent.player_id ?? "");
  return false;
}

async function consentAccess(write: boolean, consent?: JsonRecord) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "consents")) return { ...access, allowed: false, assignments: [] as Assignment[] };
  const role = adminRolePresetDefinition(access.profile.role);
  if (write && role?.readOnly) return { ...access, allowed: false, assignments: [] as Assignment[] };
  if (!role?.requiresScope) return { ...access, allowed: true, assignments: null as Assignment[] | null };
  const assignments = await assignmentsFor(access.profile.id);
  return { ...access, allowed: consent ? assignments.some((assignment) => assignmentMatches(assignment, consent)) : true, assignments };
}

function validateConsent(body: JsonRecord, existing?: JsonRecord) {
  const subjectType = cleanText(body.subject_type ?? existing?.subject_type, 30) || "adult";
  const status = cleanText(body.consent_status ?? existing?.consent_status, 30) || "pending";
  const playerId = cleanText(body.player_id ?? existing?.player_id, 100);
  const subjectLabel = cleanText(body.subject_label_snapshot ?? existing?.subject_label_snapshot, 180);
  const guardianName = cleanText(body.guardian_name ?? existing?.guardian_name, 180);
  const guardianContact = cleanText(body.guardian_contact ?? existing?.guardian_contact, 240);
  const scopes = stringArray(body.consent_scopes ?? existing?.consent_scopes);
  const capturedAt = cleanText(body.captured_at ?? existing?.captured_at, 50);
  const evidence = cleanText(body.evidence_reference ?? existing?.evidence_reference, 2000);
  const captureMethod = cleanText(body.capture_method ?? existing?.capture_method, 40) || "admin_record";
  const effectiveFrom = cleanText(body.effective_from ?? existing?.effective_from, 50);
  const expiresAt = cleanText(body.expires_at ?? existing?.expires_at, 50);
  const withdrawalReason = cleanText(body.withdrawal_reason ?? existing?.withdrawal_reason, 5000);
  const errors: string[] = [];

  if (!SUBJECT_TYPES.has(subjectType)) errors.push("Choose a valid subject type.");
  if (!STATUSES.has(status)) errors.push("Choose a valid consent status.");
  if (!CAPTURE_METHODS.has(captureMethod)) errors.push("Choose a valid capture method.");
  if (!playerId && subjectType !== "team_group") errors.push("Choose the canonical person for this consent record.");
  if (!playerId && !subjectLabel) errors.push("Subject name or group label is required.");
  if (subjectType === "minor" && (!guardianName || !guardianContact)) errors.push("Minor consent requires guardian name and contact reference.");
  if (scopes.some((scope) => !SCOPES.has(scope))) errors.push("One or more usage scopes are invalid.");
  if (effectiveFrom && expiresAt && new Date(expiresAt) < new Date(effectiveFrom)) errors.push("Expiry cannot be before the effective date.");
  if (status === "approved") {
    if (!scopes.length) errors.push("Approved consent requires at least one explicit usage scope.");
    if (!capturedAt || !evidence) errors.push("Approved consent requires a consent date and evidence reference.");
    if (captureMethod === "other" && !cleanText(body.private_notes ?? existing?.private_notes, 5000)) errors.push("Describe an 'other' capture method in private notes.");
  }
  if (status === "withdrawn" && !withdrawalReason) errors.push("Withdrawal reason is required.");

  return {
    errors,
    payload: {
      player_id: playerId,
      event_id: cleanText(body.event_id ?? existing?.event_id, 160),
      subject_label_snapshot: subjectLabel,
      subject_type: subjectType,
      guardian_name: guardianName,
      guardian_contact: guardianContact,
      consent_scopes: scopes,
      consent_status: status,
      capture_method: captureMethod,
      captured_at: capturedAt ? new Date(capturedAt).toISOString() : null,
      effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      evidence_reference: evidence,
      restrictions: cleanText(body.restrictions ?? existing?.restrictions, 5000),
      withdrawal_reason: withdrawalReason,
      withdrawn_at: status === "withdrawn" ? existing?.withdrawn_at || new Date().toISOString() : null,
      correction_notes: cleanText(body.correction_notes ?? existing?.correction_notes, 5000),
      private_notes: cleanText(body.private_notes ?? existing?.private_notes, 5000),
      legacy_self_attested: false,
      updated_at: new Date().toISOString(),
    },
  };
}

function auditScope(assignments: Assignment[] | null, consent: JsonRecord) {
  const assignment = assignments?.find((candidate) => assignmentMatches(candidate, consent));
  if (assignment) return { resourceType: assignment.resource_type, resourceId: assignment.resource_id };
  if (consent.event_id) return { resourceType: "event", resourceId: String(consent.event_id) };
  return { resourceType: "player", resourceId: String(consent.player_id ?? "unlinked") };
}

export async function GET() {
  try {
    const access = await consentAccess(false);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "Consent access is required." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const [consentsResult, peopleResult, eventsResult, subjectsResult] = await Promise.all([
      admin.from("consents").select("*").order("updated_at", { ascending: false }).limit(2000),
      admin.from("players").select("id,full_name,name,nickname,player_type,is_active").order("full_name").limit(3000),
      admin.from("event_case_studies").select("event_id,title,start_date,status").order("start_date", { ascending: false }).limit(1000),
      admin.from("media_subjects").select("asset_id,player_id,required_scope"),
    ]);
    if (consentsResult.error) throw consentsResult.error;
    if (peopleResult.error) throw peopleResult.error;
    if (eventsResult.error) throw eventsResult.error;
    if (subjectsResult.error) throw subjectsResult.error;
    let consents = consentsResult.data ?? [];
    if (access.assignments) consents = consents.filter((consent) => access.assignments?.some((assignment) => assignmentMatches(assignment, consent)));
    const playerIds = new Set(consents.map((consent) => consent.player_id).filter(Boolean));
    const visiblePeople = access.assignments
      ? (peopleResult.data ?? []).filter((person) => playerIds.has(person.id) || access.assignments?.some((assignment) => assignment.resource_type === "player" && assignment.resource_id === person.id))
      : peopleResult.data ?? [];
    const visibleEventIds = access.assignments
      ? new Set(access.assignments.filter((assignment) => assignment.resource_type === "event").map((assignment) => assignment.resource_id))
      : null;
    const visibleEvents = visibleEventIds ? (eventsResult.data ?? []).filter((event) => visibleEventIds.has(event.event_id)) : eventsResult.data ?? [];
    return NextResponse.json({
      ok: true,
      people: visiblePeople,
      events: visibleEvents,
      consents: consents.map((consent) => ({
        ...consent,
        governed_media_subject_count: (subjectsResult.data ?? []).filter((subject) => subject.player_id === consent.player_id).length,
      })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Consent records could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const validation = validateConsent(body);
    if (validation.errors.length) return NextResponse.json({ ok: false, error: validation.errors[0], errors: validation.errors }, { status: 400 });
    const access = await consentAccess(true, validation.payload);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "You cannot create this consent record." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    if (validation.payload.player_id) {
      const person = await admin.from("players").select("id,full_name,name,nickname").eq("id", validation.payload.player_id).maybeSingle();
      if (person.error) throw person.error;
      if (!person.data) return NextResponse.json({ ok: false, error: "Canonical person not found." }, { status: 404 });
      validation.payload.subject_label_snapshot = validation.payload.subject_label_snapshot || person.data.full_name || person.data.name || person.data.nickname;
    }
    const result = await admin.from("consents").insert({ ...validation.payload, created_by: access.profile.id, updated_by: access.profile.id, created_at: new Date().toISOString() }).select("*").single();
    if (result.error) throw result.error;
    await recordAdminAuditEvent(access.supabase, { action: "create", entityType: "consent", entityId: result.data.id, capability: "consents", ...auditScope(access.assignments, result.data), after: result.data, metadata: { source: "phase1_consents" } });
    return NextResponse.json({ ok: true, consent: result.data, message: "Consent record created." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Consent record could not be created." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const id = cleanText(body.id, 100);
    if (!id) return NextResponse.json({ ok: false, error: "Consent ID is required." }, { status: 400 });
    const access = await consentAccess(true);
    if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "You cannot update consent records." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const existing = await admin.from("consents").select("*").eq("id", id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return NextResponse.json({ ok: false, error: "Consent record not found." }, { status: 404 });
    if (access.assignments && !access.assignments.some((assignment) => assignmentMatches(assignment, existing.data))) return NextResponse.json({ ok: false, error: "You cannot update this consent record." }, { status: 403 });
    const validation = validateConsent(body, existing.data);
    if (validation.errors.length) return NextResponse.json({ ok: false, error: validation.errors[0], errors: validation.errors }, { status: 400 });
    const result = await admin.from("consents").update({ ...validation.payload, updated_by: access.profile.id }).eq("id", id).select("*").single();
    if (result.error) throw result.error;
    await recordAdminAuditEvent(access.supabase, { action: result.data.consent_status === "withdrawn" ? "withdraw" : "update", entityType: "consent", entityId: id, capability: "consents", ...auditScope(access.assignments, result.data), before: existing.data, after: result.data, metadata: { source: "phase1_consents" } });
    return NextResponse.json({ ok: true, consent: result.data, message: result.data.consent_status === "withdrawn" ? "Consent withdrawn; governed public media was rechecked and unpublished where required." : "Consent record updated." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Consent record could not be updated." }, { status: 500 });
  }
}
