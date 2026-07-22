import { NextResponse, type NextRequest } from "next/server";
import { getAdminAccess, getPlayerAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function accessContext() {
  const adminAccess = await getAdminAccess();
  if (adminAccess.user && adminAccess.profile) {
    return { role: "admin" as const, id: adminAccess.profile.id };
  }

  const playerAccess = await getPlayerAccess();
  if (playerAccess.user && playerAccess.player) {
    return { role: "player" as const, id: playerAccess.player.id };
  }

  return null;
}

export async function GET() {
  const access = await accessContext();

  if (!access) {
    return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("fackts_notifications")
    .select("id, title, body, notification_type, link_url, is_read, created_at")
    .eq("recipient_role", access.role)
    .order("created_at", { ascending: false })
    .limit(40);

  query = query.eq("recipient_id", access.id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, notifications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const access = await accessContext();

  if (!access) {
    return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
  }

  const body = await request.json();
  const notificationId = String(body.id ?? "").trim();

  if (!notificationId) {
    return NextResponse.json(
      { ok: false, error: "Notification id is required." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  let ownershipQuery = admin
    .from("fackts_notifications")
    .select("id")
    .eq("id", notificationId)
    .eq("recipient_role", access.role);

  ownershipQuery = ownershipQuery.eq("recipient_id", access.id);

  const { data: owned } = await ownershipQuery.maybeSingle();

  if (!owned) {
    return NextResponse.json({ ok: false, error: "Notification not found." }, { status: 404 });
  }

  const { error } = await admin
    .from("fackts_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
