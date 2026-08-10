import { NextRequest, NextResponse } from "next/server";
import { getAdminCapabilityAccess } from "@/lib/auth/server";

const allowedFields = [
  "title", "summary", "venue", "location", "poster_url", "hero_image_url",
  "start_date", "end_date", "photo_count", "status", "is_public", "event_type", "age_category", "deletion_protected",
  "organizer_name", "organizer_logo_url", "organizer_description", "organizer_url",
] as const;

async function approvedAdmin() {
  const access = await getAdminCapabilityAccess("calendar");
  if (!access.user) return { error: NextResponse.json({ error: "Your admin session expired. Sign in again." }, { status: 401 }) };
  if (!access.allowed) return { error: NextResponse.json({ error: "This account is not approved for Admin Events." }, { status: 403 }) };
  return { supabase: access.supabase };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const approved = await approvedAdmin();
    if (approved.error) return approved.error;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Event title is required." }, { status: 400 });
    const baseSlug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
    if (!baseSlug) return NextResponse.json({ error: "Enter a valid event title." }, { status: 400 });
    const eventId = `${baseSlug}-${Date.now().toString(36)}`;
    const payload = {
      event_id: eventId,
      slug: eventId,
      title,
      summary: typeof body.summary === "string" ? body.summary.trim() : null,
      event_type: typeof body.event_type === "string" && body.event_type.trim() ? body.event_type.trim() : "5v5",
      age_category: typeof body.age_category === "string" && body.age_category.trim() ? body.age_category.trim() : "Open",
      organizer_name: typeof body.organizer_name === "string" && body.organizer_name.trim() ? body.organizer_name.trim() : null,
      status: "draft",
      is_public: false,
    };
    const { data, error } = await approved.supabase.from("event_case_studies").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Event could not be created." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const approved = await approvedAdmin();
    if (approved.error) return approved.error;

    const body = await request.json();
    const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
    if (!eventId) return NextResponse.json({ error: "Missing event ID." }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) if (field in body) payload[field] = body[field];

    const { data, error } = await approved.supabase.from("event_case_studies").update(payload).eq("event_id", eventId).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "No event was updated. Check the event record and Admin permissions." }, { status: 404 });
    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Event setup could not save." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const approved = await approvedAdmin();
    if (approved.error) return approved.error;

    const body = await request.json();
    const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
    const confirmationTitle = typeof body.confirmation_title === "string" ? body.confirmation_title.trim() : "";
    if (!eventId) return NextResponse.json({ error: "Missing event ID." }, { status: 400 });
    const { data: existing, error: lookupError } = await approved.supabase
      .from("event_case_studies")
      .select("event_id,title,deletion_protected")
      .eq("event_id", eventId)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    if (!existing) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (existing.deletion_protected) {
      return NextResponse.json({ error: "This event is protected. Turn off deletion protection and save the event before deleting it." }, { status: 409 });
    }
    if (confirmationTitle !== existing.title) {
      return NextResponse.json({ error: "The confirmation title did not match. The event was not deleted." }, { status: 400 });
    }

    const { data: deleted, error: deleteError } = await approved.supabase
      .from("event_case_studies")
      .delete()
      .eq("event_id", eventId)
      .select("event_id")
      .maybeSingle();
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
    if (!deleted) return NextResponse.json({ error: "The event could not be deleted. Check the Admin database policy." }, { status: 400 });

    return NextResponse.json({ deleted_event_id: deleted.event_id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Event could not be deleted." }, { status: 500 });
  }
}
