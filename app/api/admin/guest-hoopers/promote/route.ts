import { NextRequest, NextResponse } from "next/server";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { user, profile, allowed } =
      await getAdminCapabilityAccess("guest_hoopers");

    if (!user || !profile || !allowed) {
      return NextResponse.json(
        { ok: false, error: "Guest Hoopers permission required." },
        { status: 403 }
      );
    }

    const guestId = String((await request.json()).guest_id ?? "").trim();
    if (!guestId) {
      return NextResponse.json(
        { ok: false, error: "Choose a guest hooper first." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("promote_guest_to_official_player", {
      p_guest_id: guestId,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const promoted = Array.isArray(data) ? data[0] : data;
    if (!promoted?.player_id) {
      return NextResponse.json(
        { ok: false, error: "Promotion finished without an official player record." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      player_id: promoted.player_id,
      message: `${promoted.player_name} is now an official FACKTS player and will appear in Player Accounts.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Promotion could not be completed.",
      },
      { status: 500 }
    );
  }
}
