import { NextResponse, type NextRequest } from "next/server";
import { recordPlayerActivity } from "@/lib/activity/server";
import { getPlayerAccess } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, player } = await getPlayerAccess();

  if (!user || !player) {
    return NextResponse.json(
      { ok: false, error: "Player login required." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const event = String(body.event ?? "").trim();

  if (event !== "portal_opened") {
    return NextResponse.json(
      { ok: false, error: "Unknown player activity." },
      { status: 400 }
    );
  }

  const playerName =
    player.full_name || player.name || player.nickname || "FACKTS Player";
  const result = await recordPlayerActivity({
    playerId: player.id,
    userId: user.id,
    playerName,
    eventType: "portal_opened",
    title: "Opened the player portal",
  });

  return NextResponse.json({ ok: true, recorded: result.recorded });
}
