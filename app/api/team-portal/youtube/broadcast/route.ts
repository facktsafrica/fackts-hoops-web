import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";
import { encryptSecret } from "@/lib/team-portal/crypto";
import { activeYouTubeCredentials, createYouTubeBroadcast } from "@/lib/team-portal/youtube";

export const runtime = "nodejs";

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const teamId = text(body.team_id, 100);
    const teamAccess = await requireTeamCapability("broadcast_manage", teamId);
    let createdByUserId: string | null = null;
    let createdByAdminId: string | null = null;
    if (teamAccess.permitted && teamAccess.user) {
      createdByUserId = teamAccess.user.id;
    } else {
      const adminAccess = await getAdminAccess();
      if (!adminAccess.user || !adminAccess.profile || !isSuperAdmin(adminAccess.profile)) {
        return NextResponse.json({ ok: false, error: "Broadcast access is required." }, { status: 403 });
      }
      createdByAdminId = adminAccess.profile.id;
    }

    const title = text(body.title, 180);
    const scheduledStart = text(body.scheduled_start, 80);
    const broadcastType = ["game", "training", "show"].includes(text(body.broadcast_type, 30)) ? text(body.broadcast_type, 30) : "game";
    const privacyStatus = ["private", "unlisted", "public"].includes(text(body.privacy_status, 30)) ? text(body.privacy_status, 30) as "private" | "unlisted" | "public" : "unlisted";
    const gameId = text(body.game_id, 160) || null;
    const trainingId = text(body.training_session_id, 100) || null;
    if (!teamId || !title || !scheduledStart || Number.isNaN(new Date(scheduledStart).getTime())) {
      return NextResponse.json({ ok: false, error: "Team, title and valid broadcast time are required." }, { status: 400 });
    }
    if (broadcastType === "game" && !gameId) return NextResponse.json({ ok: false, error: "Choose a game." }, { status: 400 });
    if (broadcastType === "training" && !trainingId) return NextResponse.json({ ok: false, error: "Choose a training session." }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const channelResult = await admin.from("team_broadcast_channels").select("*").eq("team_id", teamId).eq("provider", "youtube").eq("status", "connected").maybeSingle();
    if (channelResult.error) throw channelResult.error;
    if (!channelResult.data) return NextResponse.json({ ok: false, error: "Connect the team YouTube channel first." }, { status: 409 });
    const active = await activeYouTubeCredentials(channelResult.data.credentials_encrypted);
    if (active.encrypted !== channelResult.data.credentials_encrypted) {
      await admin.from("team_broadcast_channels").update({
        credentials_encrypted: active.encrypted,
        token_expires_at: new Date(active.credentials.expires_at).toISOString(),
        last_verified_at: new Date().toISOString(),
      }).eq("id", channelResult.data.id);
    }

    const created = await createYouTubeBroadcast({
      accessToken: active.credentials.access_token,
      title,
      description: text(body.description, 3000),
      scheduledStart,
      privacyStatus,
    });
    const saved = await admin.from("team_broadcasts").insert({
      team_id: teamId,
      channel_id: channelResult.data.id,
      game_id: gameId,
      training_session_id: trainingId,
      broadcast_type: broadcastType,
      title,
      description: text(body.description, 3000) || null,
      scheduled_start: new Date(scheduledStart).toISOString(),
      privacy_status: privacyStatus,
      status: "scheduled",
      youtube_broadcast_id: created.broadcastId,
      youtube_stream_id: created.streamId,
      watch_url: created.watchUrl,
      ingestion_address: created.ingestionAddress,
      stream_name_encrypted: created.streamName ? encryptSecret({ stream_name: created.streamName }) : null,
      created_by_user_id: createdByUserId,
      created_by_admin_id: createdByAdminId,
    }).select("id,title,scheduled_start,status,watch_url").single();
    if (saved.error) throw saved.error;
    return NextResponse.json({
      ok: true,
      broadcast: saved.data,
      encoder: { ingestion_address: created.ingestionAddress, stream_name: created.streamName },
      message: "YouTube broadcast scheduled. The stream key is shown once—load it into the encoder now.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === "YOUTUBE_OAUTH_CONFIGURATION_MISSING"
      ? "YouTube OAuth is not configured."
      : error instanceof Error && error.message === "TEAM_PORTAL_ENCRYPTION_CONFIGURATION_MISSING"
        ? "Team Portal token encryption is not configured."
        : error instanceof Error ? error.message : "Broadcast could not be created.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
