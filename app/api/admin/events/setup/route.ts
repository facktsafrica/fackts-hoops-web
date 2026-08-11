import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES = [
  "organizer_event",
  "competition_format",
  "teams_participants",
  "schedule",
  "services",
  "branding",
  "publish",
] as const;

type Stage = (typeof STAGES)[number];
type JsonRecord = Record<string, unknown>;
type ValidationError = { code: string; message: string; stage: Stage };

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function cleanKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stageErrors(stage: Stage, data: JsonRecord): ValidationError[] {
  const errors: ValidationError[] = [];
  const add = (code: string, message: string) => errors.push({ code, message, stage });

  if (stage === "organizer_event") {
    if (!cleanText(data.title, 180)) add("event_title_required", "Event title is required.");
    if (!cleanText(data.organizer_name, 180)) add("organizer_required", "Organizer name is required.");
    if (!cleanText(data.start_date, 20)) add("start_date_required", "Start date is required.");
    if (!cleanText(data.end_date, 20)) add("end_date_required", "End date is required.");
    if (
      cleanText(data.start_date, 20) &&
      cleanText(data.end_date, 20) &&
      String(data.end_date) < String(data.start_date)
    ) {
      add("date_order_invalid", "End date cannot be before start date.");
    }
    if (!cleanText(data.venue, 240) && !cleanText(data.location, 240)) {
      add("venue_required", "Add a venue or location.");
    }
  }

  if (stage === "competition_format") {
    if (!cleanText(data.competition_name, 180)) {
      add("competition_name_required", "Competition name is required.");
    }
    if (!cleanText(data.format, 80)) add("format_required", "Competition format is required.");
    if (!cleanText(data.participant_mode, 20)) {
      add("participant_mode_required", "Choose teams, individuals or mixed participants.");
    }
    const divisions = Array.isArray(data.divisions)
      ? data.divisions.filter((division) => cleanText(division, 80))
      : [];
    if (!divisions.length) add("division_required", "Add at least one division.");
  }

  if (stage === "teams_participants") {
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (entries.length < 2) add("participants_required", "Add at least two participants.");
    const keys = new Set<string>();
    const identities = new Set<string>();
    entries.forEach((entry, index) => {
      const row = jsonRecord(entry);
      const key = cleanKey(row.setup_key);
      const type = row.entry_type === "person" ? "person" : "team";
      const snapshot = cleanText(row.display_name_snapshot, 180);
      if (!key) add("participant_key_required", `Participant ${index + 1} needs a stable setup key.`);
      if (keys.has(key)) add("participant_key_duplicate", `Participant ${index + 1} duplicates another setup row.`);
      keys.add(key);
      if (!snapshot) add("participant_name_required", `Participant ${index + 1} needs a display name.`);
      const identity = cleanText(type === "person" ? row.player_id : row.team_id, 80);
      if (identity) {
        const identityKey = `${type}:${identity}`;
        if (identities.has(identityKey)) {
          add("participant_identity_duplicate", `Participant ${index + 1} is already entered.`);
        }
        identities.add(identityKey);
      }
    });
  }

  if (stage === "schedule") {
    const games = Array.isArray(data.games) ? data.games : [];
    if (!games.length) add("schedule_required", "Add at least one game or fixture.");
    const keys = new Set<string>();
    games.forEach((game, index) => {
      const row = jsonRecord(game);
      const key = cleanKey(row.setup_key);
      if (!key) add("fixture_key_required", `Fixture ${index + 1} needs a stable setup key.`);
      if (keys.has(key)) add("fixture_key_duplicate", `Fixture ${index + 1} duplicates another setup row.`);
      keys.add(key);
      if (!cleanText(row.home_team_name, 180) || !cleanText(row.away_team_name, 180)) {
        add("fixture_sides_required", `Fixture ${index + 1} needs both sides.`);
      }
      if (!cleanText(row.game_date, 40)) add("fixture_date_required", `Fixture ${index + 1} needs a date and time.`);
    });
  }

  if (stage === "services") {
    const deliverables = Array.isArray(data.deliverables) ? data.deliverables : [];
    if (!deliverables.length && data.no_services_required !== true) {
      add("services_confirmation_required", "Add a service deliverable or confirm none are required.");
    }
    const keys = new Set<string>();
    deliverables.forEach((deliverable, index) => {
      const row = jsonRecord(deliverable);
      const key = cleanKey(row.setup_key);
      if (!key) add("deliverable_key_required", `Deliverable ${index + 1} needs a stable setup key.`);
      if (keys.has(key)) add("deliverable_key_duplicate", `Deliverable ${index + 1} duplicates another setup row.`);
      keys.add(key);
      if (!cleanText(row.service_type, 80) || !cleanText(row.title, 180)) {
        add("deliverable_details_required", `Deliverable ${index + 1} needs a service type and title.`);
      }
    });
  }

  if (stage === "branding" && data.branding_confirmed !== true) {
    add("branding_confirmation_required", "Confirm the event branding review, even if no artwork is supplied.");
  }

  return errors;
}

async function loadSetup(eventId: string) {
  const admin = createSupabaseAdminClient();
  const [eventResult, progressResult, entriesResult, gamesResult, deliverablesResult, teamsResult, peopleResult] =
    await Promise.all([
      admin.from("event_case_studies").select("*").eq("event_id", eventId).maybeSingle(),
      admin.from("event_setup_progress").select("*").eq("event_id", eventId).maybeSingle(),
      admin.from("event_entries").select("*").eq("event_id", eventId).order("created_at"),
      admin.from("games").select("*").eq("event_id", eventId).order("game_date"),
      admin.from("event_deliverables").select("*").eq("event_id", eventId).order("created_at"),
      admin.from("team_profiles").select("id,name,short_name,division,is_public").order("name").limit(1000),
      admin.from("players").select("id,full_name,name,nickname,player_type,is_active").eq("is_active", true).order("full_name").limit(1000),
    ]);

  for (const result of [eventResult, progressResult, entriesResult, gamesResult, deliverablesResult, teamsResult, peopleResult]) {
    if (result.error) throw result.error;
  }
  if (!eventResult.data) throw new Error("EVENT_NOT_FOUND");

  return {
    event: eventResult.data,
    progress: progressResult.data,
    entries: entriesResult.data ?? [],
    games: gamesResult.data ?? [],
    deliverables: deliverablesResult.data ?? [],
    teams: teamsResult.data ?? [],
    people: peopleResult.data ?? [],
  };
}

async function overallValidation(eventId: string): Promise<ValidationError[]> {
  const setup = await loadSetup(eventId);
  const metadata = jsonRecord(setup.progress?.metadata);
  const errors: ValidationError[] = [];

  errors.push(
    ...stageErrors("organizer_event", {
      title: setup.event.title,
      organizer_name: setup.event.organizer_name,
      start_date: setup.event.start_date,
      end_date: setup.event.end_date,
      venue: setup.event.venue,
      location: setup.event.location,
    }),
    ...stageErrors("competition_format", jsonRecord(metadata.competition_format)),
    ...stageErrors("teams_participants", {
      entries: setup.entries.filter((entry) => entry.entry_status !== "withdrawn"),
    }),
    ...stageErrors("schedule", {
      games: setup.games.filter((game) => game.status !== "cancelled"),
    }),
    ...stageErrors("services", {
      ...jsonRecord(metadata.services),
      deliverables: setup.deliverables.filter(
        (deliverable) => deliverable.deliverable_status !== "cancelled"
      ),
    }),
    ...stageErrors("branding", jsonRecord(metadata.branding))
  );

  const completed = new Set<string>(setup.progress?.completed_stages ?? []);
  for (const stage of STAGES.slice(0, 6)) {
    if (!completed.has(stage)) {
      errors.push({
        code: "stage_incomplete",
        message: `${stage.replaceAll("_", " ")} has not been completed.`,
        stage,
      });
    }
  }

  return errors;
}

export async function GET(request: NextRequest) {
  const eventId = cleanText(request.nextUrl.searchParams.get("event_id"), 160);
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Event ID is required." }, { status: 400 });
  }

  const access = await getAdminCapabilityAccess("events", {
    resourceType: "event",
    resourceId: eventId,
    write: false,
  });
  if (!access.allowed || !access.user) {
    return NextResponse.json({ ok: false, error: "You cannot view this event setup." }, { status: 403 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await loadSetup(eventId)) });
  } catch (error) {
    const notFound = error instanceof Error && error.message === "EVENT_NOT_FOUND";
    return NextResponse.json(
      { ok: false, error: notFound ? "Event not found." : error instanceof Error ? error.message : "Event setup could not be loaded." },
      { status: notFound ? 404 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const eventId = cleanText(body.event_id, 160);
    const stage = cleanText(body.stage, 60) as Stage | null;
    const data = jsonRecord(body.data);
    const complete = body.complete === true;

    if (!eventId || !stage || !STAGES.includes(stage)) {
      return NextResponse.json({ ok: false, error: "Event ID and a valid setup stage are required." }, { status: 400 });
    }

    const access = await getAdminCapabilityAccess("events", {
      resourceType: "event",
      resourceId: eventId,
      write: true,
    });
    if (!access.allowed || !access.user || !access.profile) {
      return NextResponse.json({ ok: false, error: "You cannot update this event setup." }, { status: 403 });
    }
    const profileId = access.profile.id;

    const existingSetup = await loadSetup(eventId);
    const metadata = jsonRecord(existingSetup.progress?.metadata);
    const errors = stage === "publish" ? await overallValidation(eventId) : stageErrors(stage, data);
    const duplicateError = errors.some((error) => error.code.includes("duplicate") || error.code.includes("key_required"));
    if ((complete && errors.length) || duplicateError) {
      return NextResponse.json(
        { ok: false, error: errors[0]?.message || "This stage needs review.", validation_errors: errors },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    if (stage === "organizer_event") {
      const eventPayload = {
        title: cleanText(data.title, 180),
        organizer_name: cleanText(data.organizer_name, 180),
        organizer_description: cleanText(data.organizer_description, 5000),
        organizer_url: cleanText(data.organizer_url, 2000),
        event_type: cleanText(data.event_type, 80) || existingSetup.event.event_type,
        age_category: cleanText(data.age_category, 80) || existingSetup.event.age_category,
        summary: cleanText(data.summary, 5000),
        start_date: cleanText(data.start_date, 20),
        end_date: cleanText(data.end_date, 20),
        venue: cleanText(data.venue, 240),
        location: cleanText(data.location, 240),
        updated_at: new Date().toISOString(),
      };
      const result = await admin.from("event_case_studies").update(eventPayload).eq("event_id", eventId);
      if (result.error) throw result.error;
    }

    if (stage === "competition_format") {
      metadata.competition_format = {
        competition_name: cleanText(data.competition_name, 180),
        format: cleanText(data.format, 80),
        participant_mode: cleanText(data.participant_mode, 20),
        divisions: Array.isArray(data.divisions)
          ? data.divisions.map((division) => cleanText(division, 80)).filter(Boolean)
          : [],
        rules_notes: cleanText(data.rules_notes, 5000),
      };
      const result = await admin
        .from("event_case_studies")
        .update({ event_type: cleanText(data.format, 80), updated_at: new Date().toISOString() })
        .eq("event_id", eventId);
      if (result.error) throw result.error;
    }

    if (stage === "teams_participants") {
      const entries = Array.isArray(data.entries) ? data.entries.map(jsonRecord) : [];
      const activeKeys = entries.map((entry) => cleanKey(entry.setup_key)).filter(Boolean);
      const existingIds = new Set(existingSetup.entries.map((entry) => entry.id));
      const claimedEntries = entries.filter(
        (entry) => cleanText(entry.id, 80) && existingIds.has(String(entry.id))
      );
      const newEntries = entries.filter(
        (entry) => !cleanText(entry.id, 80) || !existingIds.has(String(entry.id))
      );
      for (const entry of claimedEntries) {
        const result = await admin
          .from("event_entries")
          .update({
            setup_key: cleanKey(entry.setup_key),
            entry_type: entry.entry_type === "person" ? "person" : "team",
            team_id: entry.entry_type === "person" ? null : cleanText(entry.team_id, 80),
            player_id: entry.entry_type === "person" ? cleanText(entry.player_id, 80) : null,
            display_name_snapshot: cleanText(entry.display_name_snapshot, 180),
            division: cleanText(entry.division, 80),
            entry_status: cleanText(entry.entry_status, 30) || "pending",
            metadata: {
              ...jsonRecord(existingSetup.entries.find((candidate) => candidate.id === entry.id)?.metadata),
              source: "phase1_event_setup",
              identity_name_merge_attempted: false,
            },
            updated_by: profileId,
            updated_at: new Date().toISOString(),
          })
          .eq("event_id", eventId)
          .eq("id", String(entry.id));
        if (result.error) throw result.error;
      }
      if (newEntries.length) {
        const result = await admin.from("event_entries").upsert(
          newEntries.map((entry) => ({
            event_id: eventId,
            setup_key: cleanKey(entry.setup_key),
            entry_type: entry.entry_type === "person" ? "person" : "team",
            team_id: entry.entry_type === "person" ? null : cleanText(entry.team_id, 80),
            player_id: entry.entry_type === "person" ? cleanText(entry.player_id, 80) : null,
            display_name_snapshot: cleanText(entry.display_name_snapshot, 180),
            division: cleanText(entry.division, 80),
            entry_status: cleanText(entry.entry_status, 30) || "pending",
            metadata: { source: "phase1_event_setup", identity_name_merge_attempted: false },
            created_by: profileId,
            updated_by: profileId,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "event_id,setup_key" }
        );
        if (result.error) throw result.error;
      }
      const staleKeys = existingSetup.entries
        .map((entry) => entry.setup_key)
        .filter((key): key is string => Boolean(key) && !activeKeys.includes(key));
      if (staleKeys.length) {
        const staleResult = await admin
          .from("event_entries")
          .update({ entry_status: "withdrawn", updated_by: profileId })
          .eq("event_id", eventId)
          .in("setup_key", staleKeys);
        if (staleResult.error) throw staleResult.error;
      }
    }

    if (stage === "schedule") {
      const games = Array.isArray(data.games) ? data.games.map(jsonRecord) : [];
      const activeKeys = games.map((game) => cleanKey(game.setup_key)).filter(Boolean);
      const existingIds = new Set(existingSetup.games.map((game) => String(game.id)));
      const claimedGames = games.filter(
        (game) => cleanText(game.id, 80) && existingIds.has(String(game.id))
      );
      const newGames = games.filter(
        (game) => !cleanText(game.id, 80) || !existingIds.has(String(game.id))
      );
      const gamePayload = (game: JsonRecord) => {
        const home = cleanText(game.home_team_name, 180);
        const away = cleanText(game.away_team_name, 180);
        const gameDate = cleanText(game.game_date, 40);
        const title = cleanText(game.title, 240) || `${home || "Home"} vs ${away || "Away"}`;
        return {
          event_id: eventId,
          setup_key: cleanKey(game.setup_key),
          title,
          game_title: title,
          competition_name: cleanText(game.competition_name, 180) || cleanText(jsonRecord(metadata.competition_format).competition_name, 180),
          home_team_name: home,
          away_team_name: away,
          opponent: away,
          opponent_name: away,
          team_name: away,
          game_format: cleanText(game.game_format, 80) || existingSetup.event.event_type,
          match_type: cleanText(game.game_format, 80) || existingSetup.event.event_type,
          game_stage: cleanText(game.game_stage, 80) || "Game",
          game_date: gameDate ? new Date(gameDate).toISOString() : null,
          date: gameDate ? new Date(gameDate).toISOString() : null,
          venue: cleanText(game.venue, 240) || existingSetup.event.venue,
          court: cleanText(game.court, 80),
          status: cleanText(game.status, 30) || "upcoming",
          is_upcoming: !["completed", "cancelled", "postponed"].includes(String(game.status || "upcoming")),
          is_public: false,
          updated_at: new Date().toISOString(),
        };
      };
      for (const game of claimedGames) {
        const result = await admin
          .from("games")
          .update(gamePayload(game))
          .eq("event_id", eventId)
          .eq("id", String(game.id));
        if (result.error) throw result.error;
      }
      if (newGames.length) {
        const result = await admin.from("games").upsert(
          newGames.map(gamePayload),
          { onConflict: "event_id,setup_key" }
        );
        if (result.error) throw result.error;
      }
      const staleKeys = existingSetup.games
        .map((game) => game.setup_key)
        .filter((key): key is string => Boolean(key) && !activeKeys.includes(key));
      if (staleKeys.length) {
        const staleResult = await admin
          .from("games")
          .update({ status: "cancelled", is_upcoming: false, is_public: false, updated_at: new Date().toISOString() })
          .eq("event_id", eventId)
          .in("setup_key", staleKeys);
        if (staleResult.error) throw staleResult.error;
      }
    }

    if (stage === "services") {
      const deliverables = Array.isArray(data.deliverables) ? data.deliverables.map(jsonRecord) : [];
      const activeKeys = deliverables.map((deliverable) => cleanKey(deliverable.setup_key)).filter(Boolean);
      metadata.services = { no_services_required: data.no_services_required === true };
      const existingIds = new Set(existingSetup.deliverables.map((deliverable) => deliverable.id));
      const claimedDeliverables = deliverables.filter(
        (deliverable) => cleanText(deliverable.id, 80) && existingIds.has(String(deliverable.id))
      );
      const newDeliverables = deliverables.filter(
        (deliverable) => !cleanText(deliverable.id, 80) || !existingIds.has(String(deliverable.id))
      );
      const deliverablePayload = (deliverable: JsonRecord) => ({
        event_id: eventId,
        setup_key: cleanKey(deliverable.setup_key),
        service_type: cleanText(deliverable.service_type, 80),
        title: cleanText(deliverable.title, 180),
        description: cleanText(deliverable.description, 5000),
        due_at: cleanText(deliverable.due_at, 40) ? new Date(String(deliverable.due_at)).toISOString() : null,
        deliverable_status: cleanText(deliverable.deliverable_status, 40) || "planned",
        evidence: [],
        metadata: { source: "phase1_event_setup" },
        updated_by: profileId,
        updated_at: new Date().toISOString(),
      });
      for (const deliverable of claimedDeliverables) {
        const result = await admin
          .from("event_deliverables")
          .update(deliverablePayload(deliverable))
          .eq("event_id", eventId)
          .eq("id", String(deliverable.id));
        if (result.error) throw result.error;
      }
      if (newDeliverables.length) {
        const result = await admin.from("event_deliverables").upsert(
          newDeliverables.map((deliverable) => ({
            ...deliverablePayload(deliverable),
            created_by: profileId,
          })),
          { onConflict: "event_id,setup_key" }
        );
        if (result.error) throw result.error;
      }
      const staleKeys = existingSetup.deliverables
        .map((deliverable) => deliverable.setup_key)
        .filter((key): key is string => Boolean(key) && !activeKeys.includes(key));
      if (staleKeys.length) {
        const staleResult = await admin
          .from("event_deliverables")
          .update({ deliverable_status: "cancelled", updated_by: profileId })
          .eq("event_id", eventId)
          .in("setup_key", staleKeys);
        if (staleResult.error) throw staleResult.error;
      }
    }

    if (stage === "branding") {
      metadata.branding = {
        branding_confirmed: data.branding_confirmed === true,
        brand_notes: cleanText(data.brand_notes, 5000),
      };
      const result = await admin
        .from("event_case_studies")
        .update({
          poster_url: cleanText(data.poster_url, 2000),
          hero_image_url: cleanText(data.hero_image_url, 2000),
          organizer_logo_url: cleanText(data.organizer_logo_url, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);
      if (result.error) throw result.error;
    }

    const completedStages = new Set<string>(existingSetup.progress?.completed_stages ?? []);
    if (stage !== "publish") {
      if (complete && errors.length === 0) completedStages.add(stage);
      else completedStages.delete(stage);
    }

    if (stage === "publish") {
      if (errors.length) {
        const blocked = await admin.from("event_setup_progress").update({
          current_stage: "publish",
          validation_status: "blocked",
          validation_errors: errors,
          updated_by: profileId,
          updated_at: new Date().toISOString(),
        }).eq("event_id", eventId);
        if (blocked.error) throw blocked.error;
        return NextResponse.json({ ok: false, error: "Event setup is blocked. Resolve the listed items before publishing.", validation_errors: errors }, { status: 409 });
      }
      completedStages.add("publish");
      const publish = data.publish === true;
      const eventResult = await admin.from("event_case_studies").update({
        status: publish ? "published" : "draft",
        is_public: publish,
        updated_at: new Date().toISOString(),
      }).eq("event_id", eventId);
      if (eventResult.error) throw eventResult.error;
      if (publish) {
        const gamesResult = await admin.from("games").update({ is_public: true, updated_at: new Date().toISOString() }).eq("event_id", eventId).neq("status", "cancelled");
        if (gamesResult.error) throw gamesResult.error;
      }
    }

    const nextIndex = Math.min(STAGES.indexOf(stage) + (complete ? 1 : 0), STAGES.length - 1);
    const progressPayload = {
      current_stage: stage === "publish" ? "publish" : STAGES[nextIndex],
      completed_stages: Array.from(completedStages),
      validation_status: stage === "publish" ? "valid" : "needs_review",
      validation_errors: stage === "publish" ? [] : errors,
      metadata,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    };
    const progressResult = await admin.from("event_setup_progress").upsert(
      { event_id: eventId, ...progressPayload },
      { onConflict: "event_id" }
    );
    if (progressResult.error) throw progressResult.error;

    await recordAdminAuditEvent(access.supabase, {
      action: stage === "publish" && data.publish === true ? "publish" : "stage_save",
      entityType: "event_setup_progress",
      entityId: eventId,
      capability: "events",
      resourceType: "event",
      resourceId: eventId,
      after: { stage, complete, validation_errors: errors, completed_stages: Array.from(completedStages) },
      metadata: { source: "phase1_event_setup" },
    });

    return NextResponse.json({
      ok: true,
      message: stage === "publish" && data.publish === true ? "Event published." : complete ? "Stage completed." : "Draft saved.",
      ...(await loadSetup(eventId)),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Event setup could not be saved." },
      { status: 500 }
    );
  }
}
