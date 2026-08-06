import { NextRequest, NextResponse } from "next/server";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
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
    const { data: guest, error: guestError } = await admin
      .from("guest_hoopers")
      .select(
        "id, source_player_id, full_name, nickname, position, photo_url, photo_position, notes, is_active"
      )
      .eq("id", guestId)
      .maybeSingle();

    if (guestError) {
      return NextResponse.json({ ok: false, error: guestError.message }, { status: 400 });
    }

    if (!guest) {
      return NextResponse.json(
        { ok: false, error: "That guest hooper could not be found." },
        { status: 404 }
      );
    }

    const playerPayload = {
      full_name: guest.full_name,
      name: guest.full_name,
      nickname: guest.nickname,
      position: guest.position,
      photo_url: guest.photo_url,
      photo_position: guest.photo_position || "center center",
      bio: guest.notes,
      role: "FACKTS Player",
      player_type: FACKTS_PLAYER_TYPE,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let playerId = guest.source_player_id as string | null;
    let createdPlayer = false;

    if (playerId) {
      const { data: restored, error: restoreError } = await admin
        .from("players")
        .update(playerPayload)
        .eq("id", playerId)
        .select("id")
        .maybeSingle();

      if (restoreError) {
        return NextResponse.json({ ok: false, error: restoreError.message }, { status: 400 });
      }

      if (!restored) playerId = null;
    }

    if (!playerId) {
      const { data: created, error: createError } = await admin
        .from("players")
        .insert({ ...playerPayload, created_at: new Date().toISOString() })
        .select("id")
        .single();

      if (createError) {
        return NextResponse.json({ ok: false, error: createError.message }, { status: 400 });
      }

      playerId = created.id;
      createdPlayer = true;
    }

    const { error: linkError } = await admin
      .from("guest_hoopers")
      .update({ source_player_id: playerId, is_active: false })
      .eq("id", guest.id);

    if (linkError) {
      if (createdPlayer) {
        await admin.from("players").delete().eq("id", playerId);
      }
      return NextResponse.json({ ok: false, error: linkError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      player_id: playerId,
      message: `${guest.full_name} is now an official FACKTS player and will appear in Player Accounts.`,
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
