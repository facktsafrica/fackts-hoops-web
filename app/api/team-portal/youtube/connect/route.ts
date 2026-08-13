import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";
import { encryptSecret } from "@/lib/team-portal/crypto";
import { YOUTUBE_SCOPE, youtubeConfiguration } from "@/lib/team-portal/youtube";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const teamId = String(request.nextUrl.searchParams.get("team_id") || "").trim();
    if (!teamId) return NextResponse.json({ ok: false, error: "Team is required." }, { status: 400 });

    const teamAccess = await requireTeamCapability("broadcast_manage", teamId);
    let actor: "team" | "admin" = "team";
    let actorUserId = teamAccess.user?.id || "";
    if (!teamAccess.permitted) {
      const adminAccess = await getAdminAccess();
      if (!adminAccess.user || !isSuperAdmin(adminAccess.profile)) {
        return NextResponse.json({ ok: false, error: "Broadcast access is not active for this team." }, { status: 403 });
      }
      const service = createSupabaseAdminClient();
      const subscription = await service.from("team_subscriptions").select("status,enabled_capabilities").eq("team_id", teamId).maybeSingle();
      if (subscription.error) throw subscription.error;
      if (!subscription.data || !["trial", "active"].includes(subscription.data.status) || !subscription.data.enabled_capabilities?.includes("broadcast_manage")) {
        return NextResponse.json({ ok: false, error: "Enable the team Broadcast capability before connecting YouTube." }, { status: 403 });
      }
      actor = "admin";
      actorUserId = adminAccess.user.id;
    }

    const { clientId } = youtubeConfiguration();
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const redirectUri = `${siteUrl}/api/team-portal/youtube/callback`;
    const state = encryptSecret({ team_id: teamId, actor, actor_user_id: actorUserId, expires_at: Date.now() + 10 * 60_000 });
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: YOUTUBE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set("fackts_youtube_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message === "YOUTUBE_OAUTH_CONFIGURATION_MISSING"
      ? "YouTube OAuth is not configured yet."
      : error instanceof Error && error.message === "TEAM_PORTAL_ENCRYPTION_CONFIGURATION_MISSING"
        ? "Team Portal token encryption is not configured yet."
        : error instanceof Error ? error.message : "YouTube connection could not start.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
