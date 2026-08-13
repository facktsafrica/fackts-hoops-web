import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeTeamCapabilities, TEAM_PLAN_PRESETS, type TeamPlanCode } from "@/lib/team-portal/capabilities";

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
    const [teams, subscriptions, memberships, branding, media, stats, profiles, training, channels] = await Promise.all([
      admin.from("team_profiles").select("id,slug,name,short_name,logo_url,cover_image_url,verification_status,is_public").order("name"),
      admin.from("team_subscriptions").select("*").order("updated_at", { ascending: false }),
      admin.from("team_portal_memberships").select("*").order("created_at", { ascending: false }),
      admin.from("team_branding_submissions").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_media_submissions").select("*,media_assets(id,title,url,media_type,rights_status,publish_status,is_public,metadata)").eq("status", "pending").order("created_at"),
      admin.from("team_stat_submissions").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_player_profile_requests").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_training_sessions").select("*").eq("submission_status", "pending").order("created_at"),
      admin.from("team_broadcast_channels").select("id,team_id,provider,channel_id,channel_title,status,connected_at,last_verified_at").order("connected_at", { ascending: false }),
    ]);
    for (const result of [teams, subscriptions, memberships, branding, media, stats, profiles, training, channels]) {
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

    if (action === "update_subscription") {
      const plan = text(body.plan_code, 60) as TeamPlanCode;
      if (!(plan in TEAM_PLAN_PRESETS)) return NextResponse.json({ ok: false, error: "Choose a valid plan." }, { status: 400 });
      const status = ["trial", "active", "paused", "expired", "cancelled"].includes(text(body.status, 30)) ? text(body.status, 30) : "paused";
      const capabilities = normalizeTeamCapabilities(body.enabled_capabilities);
      if (!capabilities.includes("portal_view")) capabilities.unshift("portal_view");
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
        metadata: { source: "team_partner_portal_admin" },
      });
      return NextResponse.json({ ok: true, subscription: result.data, message: "Team plan and exact capabilities updated." });
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
          user_metadata: { role: "team_partner", team_id: teamId },
        });
        if (updated.error) throw updated.error;
      } else {
        const created = await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "team_partner", team_id: teamId },
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
            metadata: { ...metadata, no_identifiable_people_confirmed: body.no_identifiable_people_confirmed === true, reviewed_from: "team_partner_portal" },
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
        metadata: { source: "team_partner_portal_admin" },
      });
      return NextResponse.json({ ok: true, message: decision === "approved" ? "Submission approved." : "Submission rejected with review note." });
    }

    return NextResponse.json({ ok: false, error: "Unsupported Super Admin action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Team portal administration failed." }, { status: 500 });
  }
}
