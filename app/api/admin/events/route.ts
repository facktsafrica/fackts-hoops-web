import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedFields = [
  "title", "summary", "venue", "location", "poster_url", "hero_image_url",
  "start_date", "end_date", "photo_count", "status", "is_public",
] as const;

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Your admin session expired. Sign in again." }, { status: 401 });

    const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", auth.user.id).eq("is_active", true).maybeSingle();
    if (!profile) return NextResponse.json({ error: "This account is not approved for Admin Events." }, { status: 403 });

    const body = await request.json();
    const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
    if (!eventId) return NextResponse.json({ error: "Missing event ID." }, { status: 400 });

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) if (field in body) payload[field] = body[field];

    const { data, error } = await supabase.from("event_case_studies").update(payload).eq("event_id", eventId).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "No event was updated. Check the event record and Admin permissions." }, { status: 404 });
    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Event setup could not save." }, { status: 500 });
  }
}
