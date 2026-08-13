import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";
import { decryptSecret, encryptSecret } from "@/lib/team-portal/crypto";
import { exchangeYouTubeCode, loadYouTubeChannel } from "@/lib/team-portal/youtube";

export const runtime = "nodejs";

type OAuthState = { team_id: string; actor: "team" | "admin"; actor_user_id: string; expires_at: number };

function portalRedirect(request: NextRequest, message: string, ok: boolean, actor: "team" | "admin" = "team") {
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
  const destination = actor === "admin" ? "admin/team-portals" : "team-portal";
  return `${siteUrl}/${destination}?youtube=${ok ? "connected" : "error"}&message=${encodeURIComponent(message)}`;
}

export async function GET(request: NextRequest) {
  let redirect = portalRedirect(request, "YouTube authorization was cancelled.", false);
  try {
    const state = String(request.nextUrl.searchParams.get("state") || "");
    const cookieState = request.cookies.get("fackts_youtube_oauth_state")?.value || "";
    const code = String(request.nextUrl.searchParams.get("code") || "");
    const oauthError = String(request.nextUrl.searchParams.get("error") || "");
    if (oauthError) throw new Error("YouTube authorization was cancelled or denied.");
    if (!state || !cookieState || state !== cookieState || !code) throw new Error("YouTube authorization state is invalid or expired.");

    const decoded = decryptSecret<OAuthState>(state);
    if (!decoded.team_id || decoded.expires_at < Date.now()) throw new Error("YouTube authorization expired. Start again.");
    let connectedByUserId: string | null = null;
    let connectedByAdminId: string | null = null;

    if (decoded.actor === "admin") {
      const adminAccess = await getAdminAccess();
      if (!adminAccess.user || adminAccess.user.id !== decoded.actor_user_id || !isSuperAdmin(adminAccess.profile) || !adminAccess.profile) {
        throw new Error("Super Admin authorization is required.");
      }
      connectedByAdminId = adminAccess.profile.id;
    } else {
      const teamAccess = await requireTeamCapability("broadcast_manage", decoded.team_id);
      if (!teamAccess.user || teamAccess.user.id !== decoded.actor_user_id || !teamAccess.permitted) {
        throw new Error("Team Broadcast access is no longer active.");
      }
      connectedByUserId = teamAccess.user.id;
    }

    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const credentials = await exchangeYouTubeCode(code, `${siteUrl}/api/team-portal/youtube/callback`);
    const channel = await loadYouTubeChannel(credentials.access_token);
    const admin = createSupabaseAdminClient();
    const existing = await admin.from("team_broadcast_channels").select("credentials_encrypted").eq("team_id", decoded.team_id).eq("provider", "youtube").maybeSingle();
    if (existing.error) throw existing.error;

    if (!credentials.refresh_token && existing.data?.credentials_encrypted) {
      const previous = decryptSecret<{ refresh_token?: string }>(existing.data.credentials_encrypted);
      credentials.refresh_token = previous.refresh_token;
    }
    if (!credentials.refresh_token) throw new Error("Google did not return offline access. Remove FACKTS from Google permissions and reconnect.");

    const saved = await admin.from("team_broadcast_channels").upsert({
      team_id: decoded.team_id,
      provider: "youtube",
      channel_id: channel.id,
      channel_title: channel.title,
      credentials_encrypted: encryptSecret(credentials),
      token_expires_at: new Date(credentials.expires_at).toISOString(),
      scopes: credentials.scope?.split(" ").filter(Boolean) || [],
      status: "connected",
      connected_by_user_id: connectedByUserId,
      connected_by_admin_id: connectedByAdminId,
      connected_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      metadata: { connection_source: decoded.actor },
    }, { onConflict: "team_id,provider" });
    if (saved.error) throw saved.error;
    redirect = portalRedirect(request, `${channel.title} is connected.`, true, decoded.actor);
  } catch (error) {
    redirect = portalRedirect(request, error instanceof Error ? error.message : "YouTube connection failed.", false);
  }

  const response = NextResponse.redirect(redirect);
  response.cookies.delete("fackts_youtube_oauth_state");
  return response;
}
