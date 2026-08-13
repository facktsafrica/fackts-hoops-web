import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import {
  adminRolePresetDefinition,
  canAdmin,
} from "@/lib/admin/permissions";
import {
  getAdminAccess,
  getAdminCapabilityAccess,
} from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedFields = [
  "title",
  "summary",
  "venue",
  "location",
  "poster_url",
  "hero_image_url",
  "start_date",
  "end_date",
  "photo_count",
  "status",
  "is_public",
  "event_type",
  "age_category",
  "organizer_name",
  "organizer_logo_url",
  "organizer_description",
  "organizer_url",
] as const;

const EVENT_STATUSES = new Set(["draft", "published", "archived"]);
type JsonRecord = Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function completedGame(game: JsonRecord) {
  if (["completed", "played", "final"].includes(lower(game.status))) return true;
  const home = game.home_score ?? game.team_score ?? game.fackts_score;
  const away = game.away_score ?? game.opponent_score;
  return home !== null && home !== undefined && away !== null && away !== undefined;
}

function competitionSlugForGame(game: JsonRecord, legacySlugById: Map<string, string>) {
  const legacySlug = legacySlugById.get(text(game.legacy_one_on_one_id));
  if (legacySlug) return legacySlug;
  const identity = [
    game.competition_name,
    game.game_format,
    game.match_type,
    game.title,
    game.game_title,
  ]
    .map(lower)
    .join(" ")
    .replace(/[^a-z0-9]+/g, "");
  return identity.includes("courttakeover") ? "court-takeovers" : "";
}

function optionalRows(
  result: { data: unknown[] | null; error: { message: string } | null },
  source: string
) {
  if (result.error) {
    console.warn(`Admin events optional source unavailable (${source}): ${result.error.message}`);
    return [] as JsonRecord[];
  }
  return (result.data ?? []) as JsonRecord[];
}

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function visibleEventIds(profileId: string, role?: string | null) {
  const roleDefinition = adminRolePresetDefinition(role);
  if (!roleDefinition?.requiresScope) return null;

  const admin = createSupabaseAdminClient();
  const assignments = await admin
    .from("admin_assignments")
    .select("resource_id")
    .eq("admin_profile_id", profileId)
    .eq("resource_type", "event")
    .eq("is_active", true);

  if (assignments.error) throw assignments.error;
  return Array.from(
    new Set((assignments.data ?? []).map((assignment) => assignment.resource_id))
  );
}

export async function GET() {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "events")) {
    return NextResponse.json(
      { ok: false, error: "Event operations access is required." },
      { status: 403 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    const scopedIds = await visibleEventIds(access.profile.id, access.profile.role);
    if (scopedIds?.length === 0) {
      return NextResponse.json({ ok: true, events: [] });
    }

    let eventQuery = admin
      .from("event_case_studies")
      .select(
        "id,event_id,title,slug,summary,start_date,end_date,venue,location,status,is_public,event_type,age_category,organizer_name,poster_url,hero_image_url,created_at,updated_at"
      )
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (scopedIds) eventQuery = eventQuery.in("event_id", scopedIds);
    const competitionsQuery = scopedIds
      ? Promise.resolve({ data: [], error: null })
      : admin
          .from("competitions")
          .select(
            "id,slug,name,summary,competition_format,organizer_name,current_season_label,status,start_date,end_date,venue,location,verification_status,is_public,is_featured,created_at,updated_at"
          )
          .order("is_featured", { ascending: false })
          .order("start_date", { ascending: false, nullsFirst: false })
          .limit(200);
    const [eventsResult, competitionsResult] = await Promise.all([
      eventQuery,
      competitionsQuery,
    ]);
    if (eventsResult.error) throw eventsResult.error;

    const events = eventsResult.data ?? [];
    const competitions = competitionsResult.error ? [] : competitionsResult.data ?? [];
    if (competitionsResult.error) {
      console.warn(`Admin events competitions unavailable: ${competitionsResult.error.message}`);
    }
    const eventIds = events.map((event) => event.event_id);
    const competitionSlugs = competitions.map((competition) => competition.slug);

    const [gamesResult, entriesResult, progressResult, deliverablesResult, competitionMatchesResult] =
      await Promise.all([
        admin.from("games").select("*").limit(5000),
        eventIds.length
          ? admin.from("event_entries").select("event_id,entry_status").in("event_id", eventIds)
          : Promise.resolve({ data: [], error: null }),
        eventIds.length
          ? admin
              .from("event_setup_progress")
              .select("event_id,current_stage,completed_stages,validation_status,validation_errors,updated_at")
              .in("event_id", eventIds)
          : Promise.resolve({ data: [], error: null }),
        eventIds.length
          ? admin.from("event_deliverables").select("event_id,deliverable_status").in("event_id", eventIds)
          : Promise.resolve({ data: [], error: null }),
        competitionSlugs.length
          ? admin
              .from("guest_one_on_one_stats")
              .select("competition_slug,status,participant_name,opponent_name,video_url,highlight_url")
              .in("competition_slug", competitionSlugs)
          : Promise.resolve({ data: [], error: null }),
      ]);

    const games = optionalRows(gamesResult, "games");
    const entries = optionalRows(entriesResult, "event entries");
    const progress = optionalRows(progressResult, "event setup progress");
    const deliverables = optionalRows(deliverablesResult, "event deliverables");
    const competitionMatches = optionalRows(competitionMatchesResult, "competition matches");

    const legacySlugById = new Map(
      competitionMatches.map((match) => [text(match.id), text(match.competition_slug)])
    );
    const competitionSlugByGameId = new Map<string, string>();
    games.forEach((game) => {
      const slug = competitionSlugForGame(game, legacySlugById);
      if (slug) competitionSlugByGameId.set(text(game.id), slug);
    });
    const competitionGameIds = Array.from(competitionSlugByGameId.keys());
    const [rostersResult, statsResult, guestStatsResult, gameMediaResult, mediaLinksResult] =
      await Promise.all([
        competitionGameIds.length
          ? admin.from("game_rosters").select("game_id,player_id").in("game_id", competitionGameIds).limit(10000)
          : Promise.resolve({ data: [], error: null }),
        competitionGameIds.length
          ? admin.from("player_game_stats").select("game_id,player_id").in("game_id", competitionGameIds).limit(10000)
          : Promise.resolve({ data: [], error: null }),
        competitionGameIds.length
          ? admin.from("guest_game_stats").select("game_id,guest_hooper_id").in("game_id", competitionGameIds).limit(10000)
          : Promise.resolve({ data: [], error: null }),
        competitionGameIds.length
          ? admin.from("game_media").select("id,game_id,url,video_url,media_url").in("game_id", competitionGameIds).limit(10000)
          : Promise.resolve({ data: [], error: null }),
        competitionGameIds.length
          ? admin.from("media_links").select("asset_id,owner_id").eq("owner_type", "game").in("owner_id", competitionGameIds).limit(10000)
          : Promise.resolve({ data: [], error: null }),
      ]);
    const rosters = optionalRows(rostersResult, "competition rosters");
    const stats = optionalRows(statsResult, "competition statistics");
    const guestStats = optionalRows(guestStatsResult, "competition guest statistics");
    const gameMedia = optionalRows(gameMediaResult, "competition game media");
    const mediaLinks = optionalRows(mediaLinksResult, "competition governed media");

    const progressByEvent = new Map(
      progress.map((item) => [text(item.event_id), item])
    );

    const eventRows = events.map((event) => {
        const eventGames = games.filter(
          (game) => text(game.event_id) === event.event_id
        );
        const eventEntries = entries.filter(
          (entry) => text(entry.event_id) === event.event_id
        );
        const eventDeliverables = deliverables.filter(
          (deliverable) => text(deliverable.event_id) === event.event_id
        );

        return {
          ...event,
          source_kind: "event" as const,
          setup: progressByEvent.get(event.event_id) ?? null,
          counts: {
            games: eventGames.length,
            completed_games: eventGames.filter(completedGame).length,
            participants: eventEntries.filter(
              (entry) => !["withdrawn", "disqualified"].includes(text(entry.entry_status))
            ).length,
            deliverables: eventDeliverables.filter(
              (deliverable) => text(deliverable.deliverable_status) !== "cancelled"
            ).length,
          },
        };
      });

    const competitionRows = competitions.map((competition) => {
      const matches = competitionMatches.filter(
        (match) => text(match.competition_slug) === competition.slug
      );
      const canonicalGames = games.filter(
        (game) => competitionSlugByGameId.get(text(game.id)) === competition.slug
      );
      const useCanonical = competition.slug === "court-takeovers" || (!matches.length && canonicalGames.length > 0);
      const canonicalGameIds = new Set(canonicalGames.map((game) => text(game.id)));
      const participants = new Set<string>();
      if (useCanonical) {
        rosters
          .filter((row) => canonicalGameIds.has(text(row.game_id)))
          .forEach((row) => { if (text(row.player_id)) participants.add(text(row.player_id)); });
        stats
          .filter((row) => canonicalGameIds.has(text(row.game_id)))
          .forEach((row) => { if (text(row.player_id)) participants.add(text(row.player_id)); });
        guestStats
          .filter((row) => canonicalGameIds.has(text(row.game_id)))
          .forEach((row) => { if (text(row.guest_hooper_id)) participants.add(`guest:${text(row.guest_hooper_id)}`); });
      } else {
        matches
          .flatMap((match) => [text(match.participant_name), text(match.opponent_name)])
          .filter(Boolean)
          .forEach((name) => participants.add(name));
      }
      const media = new Set<string>();
      if (useCanonical) {
        canonicalGames.forEach((game) => {
          [game.video_url, game.game_video_url, game.highlight_url]
            .map(text)
            .filter(Boolean)
            .forEach((url) => media.add(`url:${url.toLowerCase()}`));
        });
        gameMedia
          .filter((item) => canonicalGameIds.has(text(item.game_id)))
          .forEach((item) => {
            const url = text(item.url || item.video_url || item.media_url);
            media.add(url ? `url:${url.toLowerCase()}` : `legacy:${text(item.id)}`);
          });
        mediaLinks
          .filter((link) => canonicalGameIds.has(text(link.owner_id)))
          .forEach((link) => media.add(`asset:${text(link.asset_id)}`));
      } else {
        matches.forEach((match) => {
          [match.video_url, match.highlight_url]
            .map(text)
            .filter(Boolean)
            .forEach((url) => media.add(`url:${url.toLowerCase()}`));
        });
      }
      const sourceGames = useCanonical ? canonicalGames : matches;

      return {
        id: competition.id,
        event_id: `competition:${competition.slug}`,
        title: competition.name,
        slug: competition.slug,
        summary: competition.summary,
        start_date: competition.start_date,
        end_date: competition.end_date,
        venue: competition.venue,
        location: competition.location,
        status: competition.status || "upcoming",
        is_public: competition.is_public !== false,
        event_type: competition.competition_format || "Competition",
        age_category: competition.current_season_label
          ? `${competition.current_season_label} season`
          : "Current season",
        organizer_name: competition.organizer_name,
        source_kind: "competition" as const,
        competition_slug: competition.slug,
        season_label: competition.current_season_label,
        verification_status: competition.verification_status,
        setup: null,
        counts: {
          games: sourceGames.length,
          completed_games: sourceGames.filter(completedGame).length,
          participants: participants.size,
          deliverables: media.size,
        },
      };
    });

    const combined = [...eventRows, ...competitionRows].sort((left, right) =>
      String(right.start_date || "").localeCompare(String(left.start_date || ""))
    );

    return NextResponse.json({
      ok: true,
      events: combined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Events could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await getAdminCapabilityAccess("events");
  if (!access.allowed || !access.user || !access.profile) {
    return NextResponse.json(
      { ok: false, error: "Event creation access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = cleanText(body.title, 180);
    const baseSlug = slugify(cleanText(body.slug, 100) || title || "");
    if (!title || !baseSlug) {
      return NextResponse.json(
        { ok: false, error: "Event title is required." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const eventId = `${baseSlug}-${Date.now().toString(36)}`;
    const payload = {
      event_id: eventId,
      slug: eventId,
      title,
      summary: cleanText(body.summary, 5000),
      event_type: cleanText(body.event_type, 80) || "5v5",
      age_category: cleanText(body.age_category, 80) || "Open",
      organizer_name: cleanText(body.organizer_name, 180),
      start_date: cleanText(body.start_date, 20),
      end_date: cleanText(body.end_date, 20),
      venue: cleanText(body.venue, 240),
      location: cleanText(body.location, 240),
      status: "draft",
      is_public: false,
    };

    const eventResult = await admin
      .from("event_case_studies")
      .insert(payload)
      .select("*")
      .single();
    if (eventResult.error || !eventResult.data) {
      throw eventResult.error ?? new Error("Event draft was not created.");
    }

    const progressResult = await admin.from("event_setup_progress").insert({
      event_id: eventId,
      current_stage: "organizer_event",
      completed_stages: [],
      validation_status: "needs_review",
      validation_errors: [],
      metadata: { phase1_wizard: true, draft_created_at: new Date().toISOString() },
      updated_by: access.profile.id,
    });

    if (progressResult.error) {
      await admin.from("event_case_studies").delete().eq("event_id", eventId);
      throw progressResult.error;
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "create",
      entityType: "event_case_study",
      entityId: eventId,
      capability: "events",
      after: eventResult.data,
      metadata: { source: "phase1_event_setup" },
    });

    return NextResponse.json(
      { ok: true, event: eventResult.data, message: "Event draft created." },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Event could not be created.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventId = cleanText(body.event_id, 160);
    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "Event ID is required." },
        { status: 400 }
      );
    }

    const access = await getAdminCapabilityAccess("events", {
      resourceType: "event",
      resourceId: eventId,
      write: true,
    });
    if (!access.allowed || !access.user || !access.profile) {
      return NextResponse.json(
        { ok: false, error: "You cannot update this event." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();
    const existingResult = await admin
      .from("event_case_studies")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existingResult.error) throw existingResult.error;
    if (!existingResult.data) {
      return NextResponse.json(
        { ok: false, error: "Event not found." },
        { status: 404 }
      );
    }

    const isNewPublish =
      (body.is_public === true && existingResult.data.is_public !== true) ||
      (body.status === "published" && existingResult.data.status !== "published");

    if (isNewPublish) {
      const progress = await admin
        .from("event_setup_progress")
        .select("validation_status,completed_stages")
        .eq("event_id", eventId)
        .maybeSingle();
      if (progress.error) throw progress.error;
      if (progress.data?.validation_status !== "valid") {
        return NextResponse.json(
          {
            ok: false,
            error: "Complete and validate event setup before publishing.",
          },
          { status: 409 }
        );
      }
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    for (const field of allowedFields) {
      if (!(field in body)) continue;
      if (field === "status" && !EVENT_STATUSES.has(String(body[field]))) {
        return NextResponse.json(
          { ok: false, error: "Choose a valid event status." },
          { status: 400 }
        );
      }
      payload[field] = body[field];
    }

    const updateResult = await admin
      .from("event_case_studies")
      .update(payload)
      .eq("event_id", eventId)
      .select("*")
      .maybeSingle();
    if (updateResult.error) throw updateResult.error;
    if (!updateResult.data) {
      return NextResponse.json(
        { ok: false, error: "Event was not updated." },
        { status: 404 }
      );
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "update",
      entityType: "event_case_study",
      entityId: eventId,
      capability: "events",
      resourceType: "event",
      resourceId: eventId,
      before: existingResult.data,
      after: updateResult.data,
    });

    return NextResponse.json({ ok: true, event: updateResult.data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Event could not be updated.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventId = cleanText(body.event_id, 160);
    const confirmationTitle = cleanText(body.confirmation_title, 180);
    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "Event ID is required." },
        { status: 400 }
      );
    }

    const access = await getAdminCapabilityAccess("events", {
      resourceType: "event",
      resourceId: eventId,
      write: true,
    });
    if (!access.allowed || !access.user) {
      return NextResponse.json(
        { ok: false, error: "You cannot delete this event." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();
    const existing = await admin
      .from("event_case_studies")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) {
      return NextResponse.json(
        { ok: false, error: "Event not found." },
        { status: 404 }
      );
    }
    if (confirmationTitle !== existing.data.title) {
      return NextResponse.json(
        { ok: false, error: "The confirmation title did not match." },
        { status: 400 }
      );
    }

    const deleted = await admin
      .from("event_case_studies")
      .delete()
      .eq("event_id", eventId)
      .select("event_id")
      .maybeSingle();
    if (deleted.error) throw deleted.error;
    if (!deleted.data) {
      return NextResponse.json(
        { ok: false, error: "Event could not be deleted." },
        { status: 400 }
      );
    }

    let auditWarning: string | null = null;
    try {
      await recordAdminAuditEvent(access.supabase, {
        action: "delete",
        entityType: "event_case_study",
        entityId: eventId,
        capability: "events",
        resourceType: "event",
        resourceId: eventId,
        before: existing.data,
      });
    } catch (auditError) {
      // The parent row is already deleted at this point. Return the true
      // deletion result so Admin does not leave a removed event on screen.
      auditWarning =
        auditError instanceof Error
          ? auditError.message
          : "The deletion audit entry could not be recorded.";
    }

    return NextResponse.json({
      ok: true,
      deleted_event_id: eventId,
      audit_warning: auditWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Event could not be deleted.",
      },
      { status: 500 }
    );
  }
}
