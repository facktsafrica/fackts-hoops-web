import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CORE_TEAM_CAPABILITIES,
  normalizeTeamCapabilities,
  normalizeTeamPlan,
  TEAM_PLAN_PRESETS,
  type TeamPlanCode,
} from "@/lib/team-portal/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function password() {
  return `FacktsTeam!${randomBytes(8).toString("base64url")}`;
}

async function superAdminAccess() {
  const access = await getAdminAccess();
  return { ...access, allowed: Boolean(access.user && access.profile && isSuperAdmin(access.profile)) };
}

export async function GET() {
  const access = await superAdminAccess();
  if (!access.allowed) return NextResponse.json({ ok: false, error: "Super Admin access required." }, { status: 403 });
  try {
    const admin = createSupabaseAdminClient();
    const [teams, subscriptions, memberships, branding, media, stats, profiles, training, channels, leagues, leagueMemberships] = await Promise.all([
      admin.from("team_profiles").select("id,slug,name,short_name,logo_url,cover_image_url,primary_color,secondary_color,verification_status,is_public").order("name"),
      admin.from("team_subscriptions").select("*").order("updated_at", { ascending: false }),
      admin.from("team_portal_memberships").select("*").order("created_at", { ascending: false }),
      admin.from("team_branding_submissions").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_media_submissions").select("*,media_assets(id,title,url,media_type,rights_status,publish_status,is_public,metadata)").eq("status", "pending").order("created_at"),
      admin.from("team_stat_submissions").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_player_profile_requests").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_training_sessions").select("*").eq("submission_status", "pending").order("created_at"),
      admin.from("team_broadcast_channels").select("id,team_id,provider,channel_id,channel_title,status,connected_at,last_verified_at").order("connected_at", { ascending: false }),
      admin.from("leagues").select("*").order("display_order").order("name"),
      admin.from("team_league_memberships").select("*,leagues(id,slug,name,short_name)").order("created_at", { ascending: false }),
    ]);
    for (const result of [teams, subscriptions, memberships, branding, media, stats, profiles, training, channels, leagues, leagueMemberships]) {
      if (result.error) throw result.error;
    }
    return NextResponse.json({
      ok: true,
      teams: teams.data ?? [],
      subscriptions: subscriptions.data ?? [],
      memberships: memberships.data ?? [],
      queues: {
        branding: branding.data ?? [],
        media: media.data ?? [],
        stats: stats.data ?? [],
        profiles: profiles.data ?? [],
        training: training.data ?? [],
      },
      channels: channels.data ?? [],
      leagues: leagues.data ?? [],
      league_memberships: leagueMemberships.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Team portals could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await superAdminAccess();
  if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "Super Admin access required." }, { status: 403 });
  try {
    const body = await request.json() as JsonRecord;
    const action = text(body.action, 80);
    const teamId = text(body.team_id, 100);
    if (!teamId) return NextResponse.json({ ok: false, error: "Choose a team." }, { status: 400 });
    const admin = createSupabaseAdminClient();

    if (action === "assign_league") {
      const leagueId = text(body.league_id, 100);
      const seasonLabel = text(body.season_label, 80) || "Current season";
      const division = text(body.division, 100) || "Open";
      const membershipStatus = ["active", "inactive", "promoted", "relegated", "withdrawn"].includes(text(body.membership_status, 30))
        ? text(body.membership_status, 30)
        : "active";
      if (!leagueId) return NextResponse.json({ ok: false, error: "Choose a league." }, { status: 400 });
      const result = await admin.from("team_league_memberships").upsert({
        team_id: teamId,
        league_id: leagueId,
        season_label: seasonLabel,
        division,
        status: membershipStatus,
        is_public: body.is_public !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "league_id,team_id,season_label,division" }).select("*,leagues(id,slug,name,short_name)").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, league_membership: result.data, message: "League placement saved. The team now appears in that public league portal." });
    }

    if (action === "remove_league") {
      const membershipId = text(body.membership_id, 100);
      if (!membershipId) return NextResponse.json({ ok: false, error: "Choose a league placement." }, { status: 400 });
      const result = await admin.from("team_league_memberships").delete().eq("id", membershipId).eq("team_id", teamId);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "League placement removed." });
    }

    if (action === "update_subscription") {
      const plan = normalizeTeamPlan(body.plan_code) as TeamPlanCode;
      if (!(plan in TEAM_PLAN_PRESETS)) return NextResponse.json({ ok: false, error: "Choose a valid plan." }, { status: 400 });
      const status = ["trial", "active", "paused", "expired", "cancelled"].includes(text(body.status, 30)) ? text(body.status, 30) : "paused";
      const capabilities = normalizeTeamCapabilities(body.enabled_capabilities);
      CORE_TEAM_CAPABILITIES.forEach((capability) => {
        if (!capabilities.includes(capability)) capabilities.push(capability);
      });
      const result = await admin.from("team_subscriptions").upsert({
        team_id: teamId,
        plan_code: plan,
        status,
        enabled_capabilities: capabilities,
        starts_at: status === "active" || status === "trial" ? new Date().toISOString() : null,
        approved_by: access.profile.id,
        approved_at: new Date().toISOString(),
        notes: text(body.notes, 2000) || null,
      }, { onConflict: "team_id" }).select("*").single();
      if (result.error) throw result.error;
      await recordAdminAuditEvent(access.supabase, {
        action: "update_team_subscription",
        entityType: "team",
        entityId: teamId,
        capability: "teams",
        after: result.data,
        metadata: { source: "club_portal_admin" },
      });
      return NextResponse.json({ ok: true, subscription: result.data, message: "Club upgrades updated. Core team operations remain active." });
    }

    if (action === "issue_account") {
      const email = text(body.email, 320).toLowerCase();
      const role = ["owner", "manager", "coach", "statistician", "media", "viewer"].includes(text(body.role, 40)) ? text(body.role, 40) : "manager";
      if (!email.includes("@")) return NextResponse.json({ ok: false, error: "Enter a valid team account email." }, { status: 400 });
      const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (users.error) throw users.error;
      let authUser = users.data.users.find((user) => user.email?.toLowerCase() === email) || null;
      const temporaryPassword = password();
      if (authUser) {
        const [adminProfile, player] = await Promise.all([
          admin.from("admin_profiles").select("id").eq("user_id", authUser.id).maybeSingle(),
          admin.from("players").select("id").eq("user_id", authUser.id).maybeSingle(),
        ]);
        if (adminProfile.error) throw adminProfile.error;
        if (player.error) throw player.error;
        if (adminProfile.data || player.data) {
          return NextResponse.json({ ok: false, error: "That email already belongs to an Admin or Player account. Use a dedicated team email." }, { status: 409 });
        }
        const updated = await admin.auth.admin.updateUserById(authUser.id, {
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "team_club", team_id: teamId },
        });
        if (updated.error) throw updated.error;
      } else {
        const created = await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "team_club", team_id: teamId },
        });
        if (created.error || !created.data.user) throw created.error || new Error("Team account could not be created.");
        authUser = created.data.user;
      }
      const membership = await admin.from("team_portal_memberships").upsert({
        team_id: teamId,
        user_id: authUser.id,
        role,
        status: "active",
        display_name: text(body.display_name, 180) || null,
        invited_email: email,
        approved_by: access.profile.id,
        approved_at: new Date().toISOString(),
      }, { onConflict: "team_id,user_id" }).select("*").single();
      if (membership.error) throw membership.error;
      const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
      return NextResponse.json({
        ok: true,
        membership: membership.data,
        credentials: { email, temporary_password: temporaryPassword, login_url: `${siteUrl}/team-portal/login` },
        message: "Team account activated. Send the temporary login securely.",
      }, { status: 201 });
    }

    if (action === "revoke_account") {
      const membershipId = text(body.membership_id, 100);
      const result = await admin.from("team_portal_memberships").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", membershipId).eq("team_id", teamId).select("*").maybeSingle();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "Team portal membership revoked." });
    }

    if (action === "review_submission") {
      const queue = text(body.queue, 40);
      const id = text(body.id, 100);
      const decision = text(body.decision, 30) === "approve" ? "approved" : "rejected";
      const review = { status: decision, review_note: text(body.review_note, 2000) || null, reviewed_by: access.profile.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (!id) return NextResponse.json({ ok: false, error: "Submission is required." }, { status: 400 });

      if (queue === "branding") {
        const current = await admin.from("team_branding_submissions").select("*").eq("id", id).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Branding submission not found." }, { status: 404 });
        if (decision === "approved") {
          const field = current.data.asset_type === "logo" ? "logo_url" : "cover_image_url";
          const profile = await admin.from("team_profiles").update({ [field]: current.data.file_url, updated_at: new Date().toISOString() }).eq("id", teamId);
          if (profile.error) throw profile.error;
        }
        const saved = await admin.from("team_branding_submissions").update(review).eq("id", id);
        if (saved.error) throw saved.error;
      } else if (queue === "training") {
        const saved = await admin.from("team_training_sessions").update({
          submission_status: decision === "approved" ? "published" : "rejected",
          is_public: decision === "approved",
          review_note: review.review_note,
          reviewed_by: review.reviewed_by,
          reviewed_at: review.reviewed_at,
          updated_at: review.updated_at,
        }).eq("id", id).eq("team_id", teamId);
        if (saved.error) throw saved.error;
      } else if (queue === "media") {
        const current = await admin.from("team_media_submissions").select("*,media_assets(*)").eq("id", id).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Media submission not found." }, { status: 404 });
        if (decision === "approved") {
          const metadata = current.data.media_assets?.metadata && typeof current.data.media_assets.metadata === "object" ? current.data.media_assets.metadata : {};
          const asset = await admin.from("media_assets").update({
            rights_status: "approved",
            publish_status: "published",
            health_status: "healthy",
            conflict_status: "clear",
            is_public: true,
            updated_by: access.profile.id,
            metadata: { ...metadata, no_identifiable_people_confirmed: body.no_identifiable_people_confirmed === true, reviewed_from: "club_portal" },
          }).eq("id", current.data.asset_id).select("url").single();
          if (asset.error) {
            const message = asset.error.message.includes("MEDIA_SUBJECT_CONSENT_REQUIRED")
              ? "This media cannot publish until every identified player has current evidence-backed consent."
              : asset.error.message.includes("MEDIA_SUBJECT_REVIEW_REQUIRED")
                ? "Identify the people in this media, or confirm that no identifiable people appear."
                : asset.error.message;
            return NextResponse.json({ ok: false, error: message }, { status: 409 });
          }
          if (current.data.owner_type === "game" && current.data.link_role === "poster") {
            const gameUpdate = await admin.from("games").update({ poster_url: asset.data.url }).eq("id", current.data.owner_id);
            if (gameUpdate.error) throw gameUpdate.error;
          }
        } else {
          const asset = await admin.from("media_assets").update({ publish_status: "archived", is_public: false, updated_by: access.profile.id }).eq("id", current.data.asset_id);
          if (asset.error) throw asset.error;
        }
        const saved = await admin.from("team_media_submissions").update(review).eq("id", id);
        if (saved.error) throw saved.error;
      } else if (queue === "stats") {
        const current = await admin.from("team_stat_submissions").select("*").eq("id", id).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Stats submission not found." }, { status: 404 });
        const payload = current.data.stat_payload && typeof current.data.stat_payload === "object" ? current.data.stat_payload as JsonRecord : {};
        if (decision === "approved" && text(payload.submission_type, 60) === "game_result") {
          const teamScore = Number(payload.team_score);
          const opponentScore = Number(payload.opponent_score);
          const leagueId = text(payload.league_id, 100);
          const opponentName = text(payload.opponent_name, 180);
          const gameDate = text(payload.game_date, 80);
          if (!Number.isInteger(teamScore) || !Number.isInteger(opponentScore) || teamScore < 0 || opponentScore < 0 || teamScore === opponentScore) {
            return NextResponse.json({ ok: false, error: "This basketball result needs valid scores and an overtime winner before approval." }, { status: 409 });
          }
          const [teamProfile, leagueMembership] = await Promise.all([
            admin.from("team_profiles").select("name").eq("id", teamId).maybeSingle(),
            admin.from("team_league_memberships").select("id").eq("team_id", teamId).eq("league_id", leagueId).neq("status", "withdrawn").limit(1).maybeSingle(),
          ]);
          if (teamProfile.error) throw teamProfile.error;
          if (leagueMembership.error) throw leagueMembership.error;
          if (!teamProfile.data || !leagueMembership.data) return NextResponse.json({ ok: false, error: "The team or league placement is no longer active." }, { status: 409 });
          const teamGame = await admin.from("team_games").upsert({
            team_id: teamId,
            league_id: leagueId,
            source_submission_id: current.data.id,
            title: `${teamProfile.data.name} vs ${opponentName}`,
            competition_name: text(payload.league_name, 180) || "League",
            opponent_name: opponentName,
            game_date: gameDate,
            venue: text(payload.venue, 180) || null,
            status: "completed",
            team_score: teamScore,
            opponent_score: opponentScore,
            result: teamScore > opponentScore ? "W" : "L",
            is_public: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "source_submission_id" });
          if (teamGame.error) throw teamGame.error;
        }
        const saved = await admin.from("team_stat_submissions").update(review).eq("id", id).eq("team_id", teamId);
        if (saved.error) throw saved.error;
      } else if (queue === "profiles") {
        const saved = await admin.from("team_player_profile_requests").update(review).eq("id", id).eq("team_id", teamId);
        if (saved.error) throw saved.error;
      } else {
        return NextResponse.json({ ok: false, error: "Unknown review queue." }, { status: 400 });
      }

      await recordAdminAuditEvent(access.supabase, {
        action: `${decision}_${queue}_submission`,
        entityType: queue === "profiles" ? "player" : queue === "stats" ? "statistics" : queue === "training" ? "team" : "media",
        entityId: id,
        capability: queue === "profiles" ? "players" : queue === "stats" ? "stats" : queue === "training" ? "teams" : "media",
        resourceType: "team",
        resourceId: teamId,
        metadata: { source: "club_portal_admin" },
      });
      return NextResponse.json({ ok: true, message: decision === "approved" ? "Submission approved." : "Submission rejected with review note." });
    }

    return NextResponse.json({ ok: false, error: "Unsupported Super Admin action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Team portal administration failed." }, { status: 500 });
  }
}
