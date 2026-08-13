import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import {
  adminRolePresetDefinition,
  canAdmin,
} from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type EnrichedMedia = JsonRecord & { links: JsonRecord[]; subject_count: number };

const MEDIA_TYPES = new Set(["image", "video", "audio", "document", "embed", "link", "other"]);
const OWNER_TYPES = new Set(["event", "game"]);
const RIGHTS_STATES = new Set(["unknown", "pending", "approved", "restricted", "expired", "withdrawn"]);
const PUBLISH_STATES = new Set(["draft", "review", "published", "archived"]);
const HEALTH_STATES = new Set(["unchecked", "healthy", "warning", "broken"]);
const CONFLICT_STATES = new Set(["clear", "needs_review", "conflicting_rights", "duplicate_candidate"]);

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function allowed(value: unknown, values: Set<string>, fallback: string) {
  const candidate = text(value, 80).toLowerCase();
  return values.has(candidate) ? candidate : fallback;
}

function boolean(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizedMediaUrl(value: string) {
  return value.trim().toLowerCase().replace(/^http:\/\//, "https://").replace(/\/+$/, "");
}

async function mediaAccess(write: boolean) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "media")) {
    return { ...access, allowed: false };
  }
  if (write && adminRolePresetDefinition(access.profile.role)?.readOnly) {
    return { ...access, allowed: false };
  }
  return { ...access, allowed: true };
}

function gameLabel(game?: JsonRecord) {
  if (!game) return "Unlinked game";
  return text(game.title || game.game_title) ||
    `${text(game.home_team_name) || "Home"} vs ${text(game.away_team_name) || "Away"}`;
}

export async function GET(request: NextRequest) {
  const access = await mediaAccess(false);
  if (!access.allowed || !access.profile) {
    return NextResponse.json({ ok: false, error: "Media access is required." }, { status: 403 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const [assetsResult, linksResult, gamesResult, eventsResult, subjectsResult] = await Promise.all([
      admin.from("media_assets").select("*").order("updated_at", { ascending: false }).limit(3000),
      admin.from("media_links").select("*").order("display_order").limit(10000),
      admin
        .from("games")
        .select("id,event_id,title,game_title,home_team_name,away_team_name,competition_name,game_date,status,legacy_one_on_one_id")
        .order("game_date", { ascending: false })
        .limit(5000),
      admin
        .from("event_case_studies")
        .select("event_id,title,status,start_date,end_date")
        .order("start_date", { ascending: false, nullsFirst: false })
        .limit(1000),
      admin.from("media_subjects").select("asset_id,player_id,required_scope").limit(10000),
    ]);
    for (const result of [assetsResult, linksResult, gamesResult, eventsResult, subjectsResult]) {
      if (result.error) throw result.error;
    }

    const assets = (assetsResult.data ?? []) as JsonRecord[];
    const links = (linksResult.data ?? []) as JsonRecord[];
    const games = (gamesResult.data ?? []) as JsonRecord[];
    const events = (eventsResult.data ?? []) as JsonRecord[];
    const subjects = (subjectsResult.data ?? []) as JsonRecord[];
    const gameById = new Map(games.map((game) => [text(game.id), game]));
    const gameByLegacyOneOnOneId = new Map(
      games
        .filter((game) => text(game.legacy_one_on_one_id))
        .map((game) => [text(game.legacy_one_on_one_id), game])
    );
    const eventById = new Map(events.map((event) => [text(event.event_id), event]));

    const gameFilter = text(request.nextUrl.searchParams.get("game_id"), 100);
    const eventFilter = text(request.nextUrl.searchParams.get("event_id"), 160);
    const stateFilter = text(request.nextUrl.searchParams.get("state"), 40).toLowerCase();
    const search = text(request.nextUrl.searchParams.get("q"), 240).toLowerCase();

    const media = assets.map<EnrichedMedia>((asset) => {
      const assetLinks = links.filter((link) => text(link.asset_id) === text(asset.id));
      const resolvedLinks = assetLinks.map((link) => {
        const originalOwnerType = text(link.owner_type);
        const originalOwnerId = text(link.owner_id);
        const mappedGame = originalOwnerType === "one_on_one"
          ? gameByLegacyOneOnOneId.get(originalOwnerId)
          : originalOwnerType === "game"
            ? gameById.get(originalOwnerId)
            : undefined;
        const ownerType = mappedGame ? "game" : originalOwnerType;
        const ownerId = mappedGame ? text(mappedGame.id) : originalOwnerId;
        const eventId = mappedGame ? text(mappedGame.event_id) : ownerType === "event" ? ownerId : "";
        return {
          ...link,
          original_owner_type: originalOwnerType,
          original_owner_id: originalOwnerId,
          owner_type: ownerType,
          owner_id: ownerId,
          game_id: mappedGame ? text(mappedGame.id) : ownerType === "game" ? ownerId : null,
          game_title: mappedGame ? gameLabel(mappedGame) : ownerType === "game" ? gameLabel(gameById.get(ownerId)) : null,
          event_id: eventId || null,
          event_title: eventId ? text(eventById.get(eventId)?.title) || null : null,
        };
      });
      return {
        ...asset,
        links: resolvedLinks,
        subject_count: subjects.filter((subject) => text(subject.asset_id) === text(asset.id)).length,
      };
    }).filter((asset) => {
      const assetLinks = Array.isArray(asset.links) ? asset.links as JsonRecord[] : [];
      if (gameFilter && !assetLinks.some((link) => text(link.game_id) === gameFilter)) return false;
      if (eventFilter && !assetLinks.some((link) => text(link.event_id) === eventFilter)) return false;
      if (stateFilter === "review" && !(
        text(asset.rights_status) !== "approved" ||
        text(asset.conflict_status) !== "clear" ||
        ["unchecked", "warning", "broken"].includes(text(asset.health_status))
      )) return false;
      if (stateFilter === "public" && asset.is_public !== true) return false;
      if (stateFilter === "broken" && text(asset.health_status) !== "broken") return false;
      if (stateFilter === "unlinked" && assetLinks.length > 0) return false;
      if (search) {
        const haystack = [
          asset.title,
          asset.url,
          asset.platform,
          asset.media_type,
          ...assetLinks.flatMap((link) => [link.game_title, link.event_title, link.link_role]),
        ].map((value) => text(value).toLowerCase()).join(" ");
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    return NextResponse.json({
      ok: true,
      media,
      options: {
        events: events.map((event) => ({ event_id: text(event.event_id), title: text(event.title) })),
        games: games.map((game) => ({
          id: text(game.id),
          event_id: text(game.event_id) || null,
          title: gameLabel(game),
          competition_name: text(game.competition_name) || "FACKTS Hoops",
          game_date: text(game.game_date) || null,
        })),
      },
      summary: {
        total: assets.length,
        review: assets.filter((asset) =>
          text(asset.rights_status) !== "approved" ||
          text(asset.conflict_status) !== "clear" ||
          ["unchecked", "warning", "broken"].includes(text(asset.health_status))
        ).length,
        public: assets.filter((asset) => asset.is_public === true).length,
        broken: assets.filter((asset) => text(asset.health_status) === "broken").length,
        unlinked: assets.filter((asset) => !links.some((link) => text(link.asset_id) === text(asset.id))).length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Media could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await mediaAccess(true);
  if (!access.allowed || !access.profile) {
    return NextResponse.json({ ok: false, error: "You cannot add media." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as JsonRecord;
    const url = text(body.url, 4000);
    const title = text(body.title, 240);
    const ownerType = allowed(body.owner_type, OWNER_TYPES, "");
    const ownerId = text(body.owner_id, 160);
    const mediaType = allowed(body.media_type, MEDIA_TYPES, "link");
    const linkRole = text(body.link_role, 80) || "attachment";
    if (!url || !title || !ownerType || !ownerId) {
      return NextResponse.json(
        { ok: false, error: "Title, media URL and an Event or Game owner are required." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const profileId = access.profile.id;
    const sourceId = crypto.randomUUID();
    const existingAsset = await admin
      .from("media_assets")
      .select("id,created_by")
      .eq("normalized_url", normalizedMediaUrl(url))
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingAsset.error) throw existingAsset.error;
    let assetId = text(existingAsset.data?.id, 100);
    if (assetId) {
      const linkResult = await admin.from("media_links").upsert({
        asset_id: assetId,
        owner_type: ownerType,
        owner_id: ownerId,
        link_role: linkRole,
        legacy_source_table: "admin_media_center",
        legacy_source_id: sourceId,
        metadata: { source: "phase1_media_center", linked_by_admin_profile_id: profileId },
      }, { onConflict: "asset_id,owner_type,owner_id,link_role" });
      if (linkResult.error) throw linkResult.error;
    } else {
      const capture = await admin.rpc("phase0_capture_media", {
        p_source_table: "admin_media_center",
        p_source_id: sourceId,
        p_url: url,
        p_media_type: mediaType,
        p_title: title,
        p_thumbnail_url: text(body.thumbnail_url, 4000) || null,
        p_owner_type: ownerType,
        p_owner_id: ownerId,
        p_link_role: linkRole,
        p_rights_status: "pending",
        p_metadata: {
          source: "phase1_media_center",
          platform: text(body.platform, 80) || null,
          created_by_admin_profile_id: profileId,
        },
      });
      if (capture.error) throw capture.error;
      assetId = text(capture.data, 100);
    }
    if (!assetId) throw new Error("The media asset could not be created.");
    const warnings: string[] = [];

    const updated = await admin
      .from("media_assets")
      .update({
        title,
        platform: text(body.platform, 80) || null,
        thumbnail_url: text(body.thumbnail_url, 4000) || null,
        created_by: existingAsset.data?.created_by || profileId,
        updated_by: profileId,
        conflict_status: "needs_review",
      })
      .eq("id", assetId)
      .select("*")
      .single();
    if (updated.error) throw updated.error;

    if (ownerType === "game") {
      const roster = await admin
        .from("game_rosters")
        .select("player_id")
        .eq("game_id", ownerId)
        .neq("roster_status", "withdrawn");
      if (roster.error) {
        console.error(`Media subject roster sync failed: ${roster.error.message}`);
        warnings.push("Player consent indexing still needs review.");
      } else {
        const subjects = Array.from(new Set((roster.data ?? []).map((row) => row.player_id).filter(Boolean)))
          .map((playerId) => ({
            asset_id: assetId,
            player_id: playerId,
            required_scope: mediaType === "image" ? "photo_use" : mediaType === "audio" ? "audio_use" : "video_use",
            metadata: { source: "phase1_media_center_game_roster" },
            created_by: profileId,
          }));
        if (subjects.length) {
          const subjectResult = await admin.from("media_subjects").upsert(subjects, { onConflict: "asset_id,player_id" });
          if (subjectResult.error) {
            console.error(`Media subject indexing failed: ${subjectResult.error.message}`);
            warnings.push("Player consent indexing still needs review.");
          }
        }
      }
    }

    try {
      await recordAdminAuditEvent(access.supabase, {
        action: "create",
        entityType: "media",
        entityId: assetId,
        capability: "media",
        resourceType: ownerType,
        resourceId: ownerId,
        after: updated.data,
        metadata: { source: "phase1_media_center", link_role: linkRole },
      });
    } catch (error) {
      console.error(error);
      warnings.push("The audit entry needs review.");
    }

    return NextResponse.json({
      ok: true,
      asset: updated.data,
      message: ["Media saved privately for review.", ...warnings].join(" "),
      warnings,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Media could not be created." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await mediaAccess(true);
  if (!access.allowed || !access.profile) {
    return NextResponse.json({ ok: false, error: "You cannot review media." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as JsonRecord;
    const id = text(body.id, 100);
    if (!id) return NextResponse.json({ ok: false, error: "Media ID is required." }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const existing = await admin.from("media_assets").select("*").eq("id", id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return NextResponse.json({ ok: false, error: "Media asset not found." }, { status: 404 });

    const rightsStatus = allowed(body.rights_status ?? existing.data.rights_status, RIGHTS_STATES, "unknown");
    const publishStatus = allowed(body.publish_status ?? existing.data.publish_status, PUBLISH_STATES, "draft");
    const healthStatus = allowed(body.health_status ?? existing.data.health_status, HEALTH_STATES, "unchecked");
    const conflictStatus = allowed(body.conflict_status ?? existing.data.conflict_status, CONFLICT_STATES, "needs_review");
    const isPublic = boolean(body.is_public);
    if (isPublic && (rightsStatus !== "approved" || publishStatus !== "published")) {
      return NextResponse.json(
        { ok: false, error: "Public media requires approved rights and Published status." },
        { status: 400 }
      );
    }

    const previousMetadata = existing.data.metadata && typeof existing.data.metadata === "object"
      ? existing.data.metadata as JsonRecord
      : {};
    const payload = {
      title: text(body.title ?? existing.data.title, 240) || null,
      thumbnail_url: text(body.thumbnail_url ?? existing.data.thumbnail_url, 4000) || null,
      platform: text(body.platform ?? existing.data.platform, 80) || null,
      media_type: allowed(body.media_type ?? existing.data.media_type, MEDIA_TYPES, "link"),
      rights_status: rightsStatus,
      publish_status: publishStatus,
      health_status: healthStatus,
      conflict_status: conflictStatus,
      is_public: isPublic,
      updated_by: access.profile.id,
      metadata: {
        ...previousMetadata,
        no_identifiable_people_confirmed: boolean(body.no_identifiable_people_confirmed),
        last_reviewed_from: "phase1_media_center",
      },
    };
    const result = await admin.from("media_assets").update(payload).eq("id", id).select("*").single();
    if (result.error) {
      const message = result.error.message.includes("MEDIA_SUBJECT_CONSENT_REQUIRED")
        ? "This media cannot become public until every identified player has current evidence-backed consent."
        : result.error.message.includes("MEDIA_SUBJECT_REVIEW_REQUIRED")
          ? "Identify the people in this asset or confirm that no identifiable people appear before publishing."
          : result.error.message;
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }

    await recordAdminAuditEvent(access.supabase, {
      action: isPublic ? "publish" : publishStatus === "archived" ? "archive" : "review",
      entityType: "media",
      entityId: id,
      capability: "media",
      before: existing.data,
      after: result.data,
      metadata: { source: "phase1_media_center" },
    });

    return NextResponse.json({ ok: true, asset: result.data, message: isPublic ? "Media published." : "Media review saved." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Media could not be updated." },
      { status: 500 }
    );
  }
}
