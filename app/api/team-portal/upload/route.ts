import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

function text(value: FormDataEntryValue | null, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "image";
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = text(form.get("kind"), 40);
    const requestedTeamId = text(form.get("team_id"), 100) || null;
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Choose an image first." }, { status: 400 });
    }
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Use a JPG, PNG, WebP or AVIF image no larger than 8 MB." }, { status: 400 });
    }

    const capability = kind === "hero" || kind === "logo"
      ? "branding_submit"
      : kind === "training"
        ? "training_manage"
        : "media_submit";
    const access = await requireTeamCapability(capability, requestedTeamId);
    if (!access.user) return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    if (!access.permitted || !access.membership) {
      return NextResponse.json({ ok: false, error: "This upload is not active for your plan and role." }, { status: 403 });
    }
    if (!["hero", "logo", "training", "poster", "gallery"].includes(kind)) {
      return NextResponse.json({ ok: false, error: "Unsupported image destination." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;
    const objectPath = `${teamId}/${kind}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const uploaded = await admin.storage.from("team-portal-media").upload(objectPath, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploaded.error) throw uploaded.error;
    const fileUrl = admin.storage.from("team-portal-media").getPublicUrl(objectPath).data.publicUrl;

    if (kind === "hero" || kind === "logo") {
      const result = await admin.from("team_branding_submissions").insert({
        team_id: teamId,
        submitted_by_user_id: access.user.id,
        asset_type: kind,
        file_url: fileUrl,
      }).select("*").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, item: result.data, file_url: fileUrl, message: `${kind === "hero" ? "Hero image" : "Logo"} uploaded for Super Admin approval.` }, { status: 201 });
    }

    if (kind === "training") {
      const trainingId = text(form.get("training_id"), 100);
      if (!trainingId) return NextResponse.json({ ok: false, error: "Choose a training session." }, { status: 400 });
      const result = await admin.from("team_training_sessions").update({
        image_url: fileUrl,
        submission_status: "pending",
        is_public: false,
        submitted_by_user_id: access.user.id,
      }).eq("id", trainingId).eq("team_id", teamId).select("*").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return NextResponse.json({ ok: false, error: "Training session not found." }, { status: 404 });
      return NextResponse.json({ ok: true, item: result.data, file_url: fileUrl, message: "Training image attached for publication review." });
    }

    if (kind === "gallery") {
      const title = text(form.get("title"), 240) || `${String(access.team?.name || "Team")} photo`;
      const sourceId = crypto.randomUUID();
      const capture = await admin.rpc("phase0_capture_media", {
        p_source_table: "team_portal_upload",
        p_source_id: sourceId,
        p_url: fileUrl,
        p_media_type: "image",
        p_title: title,
        p_thumbnail_url: fileUrl,
        p_owner_type: "team",
        p_owner_id: teamId,
        p_link_role: "gallery",
        p_rights_status: "pending",
        p_metadata: { source: "team_partner_portal", team_id: teamId, submitted_by_user_id: access.user.id, storage_path: objectPath },
      });
      if (capture.error) throw capture.error;
      const submission = await admin.from("team_media_submissions").insert({
        team_id: teamId,
        asset_id: String(capture.data || ""),
        owner_type: "team",
        owner_id: teamId,
        link_role: "gallery",
        submitted_by_user_id: access.user.id,
      }).select("*").single();
      if (submission.error) throw submission.error;
      return NextResponse.json({ ok: true, item: submission.data, file_url: fileUrl, message: "Team photo uploaded privately for rights, consent and publication review." }, { status: 201 });
    }

    const gameId = text(form.get("game_id"), 160);
    if (!gameId) return NextResponse.json({ ok: false, error: "Choose the game that owns this poster." }, { status: 400 });
    const game = await admin.from("games").select("id,home_team_id,away_team_id,title,game_title,home_team_name,away_team_name").eq("id", gameId).maybeSingle();
    if (game.error) throw game.error;
    if (!game.data || ![game.data.home_team_id, game.data.away_team_id].includes(teamId)) {
      const attached = await admin.from("team_games").select("id,title").eq("team_id", teamId).eq("game_id", gameId).maybeSingle();
      if (attached.error) throw attached.error;
      if (!attached.data) return NextResponse.json({ ok: false, error: "That game is not assigned to this team." }, { status: 403 });
    }
    const title = text(form.get("title"), 240) || `${game.data?.title || game.data?.game_title || "Game"} poster`;
    const sourceId = crypto.randomUUID();
    const capture = await admin.rpc("phase0_capture_media", {
      p_source_table: "team_portal_upload",
      p_source_id: sourceId,
      p_url: fileUrl,
      p_media_type: "image",
      p_title: title,
      p_thumbnail_url: fileUrl,
      p_owner_type: "game",
      p_owner_id: gameId,
      p_link_role: "poster",
      p_rights_status: "pending",
      p_metadata: { source: "team_partner_portal", team_id: teamId, submitted_by_user_id: access.user.id, storage_path: objectPath },
    });
    if (capture.error) throw capture.error;
    const assetId = String(capture.data || "");
    const submission = await admin.from("team_media_submissions").insert({
      team_id: teamId,
      asset_id: assetId,
      owner_type: "game",
      owner_id: gameId,
      link_role: "poster",
      submitted_by_user_id: access.user.id,
    }).select("*").single();
    if (submission.error) throw submission.error;

    const roster = await admin.from("game_rosters").select("player_id").eq("game_id", gameId).neq("roster_status", "withdrawn");
    if (!roster.error) {
      const subjects = Array.from(new Set((roster.data ?? []).map((row) => row.player_id).filter(Boolean))).map((playerId) => ({
        asset_id: assetId,
        player_id: playerId,
        required_scope: "photo_use",
        metadata: { source: "team_partner_portal_game_roster" },
      }));
      if (subjects.length) await admin.from("media_subjects").upsert(subjects, { onConflict: "asset_id,player_id" });
    }

    return NextResponse.json({ ok: true, item: submission.data, file_url: fileUrl, message: "Poster uploaded privately for rights, consent and publication review." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === "TEAM_PORTAL_ENCRYPTION_CONFIGURATION_MISSING"
      ? "Team Portal encryption is not configured."
      : error instanceof Error ? error.message : "Image upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
