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

const GAME_STATUSES = ["upcoming", "live", "completed", "postponed", "cancelled"] as const;
type GameStatus = (typeof GAME_STATUSES)[number];
type JsonRecord = Record<string, unknown>;

const TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  upcoming: ["upcoming", "live", "postponed", "cancelled"],
  live: ["live", "completed", "postponed", "cancelled"],
  completed: ["completed"],
  postponed: ["postponed", "upcoming", "cancelled"],
  cancelled: ["cancelled", "upcoming"],
};

function cleanText(value: unknown, max = 1000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function cleanStatus(value: unknown): GameStatus | null {
  const status = String(value ?? "").trim().toLowerCase();
  return GAME_STATUSES.includes(status as GameStatus) ? (status as GameStatus) : null;
}

function nullableScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : Number.NaN;
}

function scoreErrors(status: GameStatus, home: number | null, away: number | null) {
  const errors: string[] = [];
  if (Number.isNaN(home) || Number.isNaN(away)) {
    errors.push("Scores must be whole numbers of zero or more.");
  }
  if (["upcoming", "postponed", "cancelled"].includes(status) && (home !== null || away !== null)) {
    errors.push("Scheduled, postponed or cancelled games cannot carry a score.");
  }
  if (status === "completed" && (home === null || away === null)) {
    errors.push("Completed games require both final scores.");
  }
  if (status === "completed" && home !== null && away !== null && home === away) {
    errors.push("A completed basketball game cannot finish tied.");
  }
  return errors;
}

function normalizedStatus(value: unknown): GameStatus {
  const direct = cleanStatus(value);
  if (direct) return direct;
  const legacy = String(value ?? "").trim().toLowerCase();
  if (["scheduled", "draft", "pending"].includes(legacy)) return "upcoming";
  if (["finished", "final", "verified", "published"].includes(legacy)) return "completed";
  return "upcoming";
}

async function activeAssignments(profileId: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("admin_assignments")
    .select("resource_type,resource_id,permissions,starts_at,ends_at")
    .eq("admin_profile_id", profileId)
    .eq("is_active", true);
  if (result.error) throw result.error;
  const now = Date.now();
  return (result.data ?? []).filter((assignment) => {
    const starts = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
    const ends = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
    return (starts === null || starts <= now) && (ends === null || ends > now);
  });
}

function assignmentMatchesGame(
  assignment: { resource_type: string; resource_id: string; permissions?: string[] | null },
  game: JsonRecord
) {
  if (assignment.permissions?.length && !assignment.permissions.includes("games")) return false;
  if (assignment.resource_type === "game") return assignment.resource_id === String(game.id ?? "");
  if (assignment.resource_type === "event") return assignment.resource_id === String(game.event_id ?? "");
  if (assignment.resource_type === "team") {
    return [game.home_team_id, game.away_team_id].some(
      (teamId) => assignment.resource_id === String(teamId ?? "")
    );
  }
  return false;
}

async function gamesAccess(write: boolean, game?: JsonRecord) {
  const access = await getAdminAccess();
  if (!access.user || !access.profile || !canAdmin(access.profile, "games")) {
    return { ...access, allowed: false, assignments: [] };
  }
  const role = adminRolePresetDefinition(access.profile.role);
  if (write && role?.readOnly) {
    return { ...access, allowed: false, assignments: [] };
  }
  if (!role?.requiresScope) {
    return { ...access, allowed: true, assignments: null };
  }
  const assignments = await activeAssignments(access.profile.id);
  return {
    ...access,
    allowed: game ? assignments.some((assignment) => assignmentMatchesGame(assignment, game)) : true,
    assignments,
  };
}

function gameMutationPayload(body: JsonRecord, current?: JsonRecord) {
  const home = cleanText(body.home_team_name ?? current?.home_team_name, 180);
  const away = cleanText(body.away_team_name ?? current?.away_team_name, 180);
  const status = cleanStatus(body.status ?? current?.status) ?? normalizedStatus(current?.status);
  const homeScoreValue = "home_score" in body
    ? body.home_score
    : "team_score" in body
      ? body.team_score
      : current?.home_score ?? current?.team_score;
  const awayScoreValue = "away_score" in body
    ? body.away_score
    : "opponent_score" in body
      ? body.opponent_score
      : current?.away_score ?? current?.opponent_score;
  const homeScore = nullableScore(homeScoreValue);
  const awayScore = nullableScore(awayScoreValue);
  const errors = scoreErrors(status, homeScore, awayScore);
  if (!home || !away) errors.push("Both game sides are required.");

  const gameDateValue = cleanText(body.game_date ?? current?.game_date, 50);
  if (!gameDateValue) errors.push("Game date and time are required.");
  const gameDate = gameDateValue ? new Date(gameDateValue) : null;
  if (gameDate && Number.isNaN(gameDate.getTime())) errors.push("Enter a valid game date and time.");

  const title = cleanText(body.title ?? current?.title, 240) || `${home || "Home"} vs ${away || "Away"}`;
  const statusNote = cleanText(body.status_note, 2000);

  return {
    errors,
    status,
    statusNote,
    payload: {
      event_id: cleanText(body.event_id ?? current?.event_id, 160),
      setup_key: cleanText(body.setup_key ?? current?.setup_key, 160),
      title,
      game_title: title,
      competition_name: cleanText(body.competition_name ?? current?.competition_name, 180),
      home_team_id: cleanText(body.home_team_id ?? current?.home_team_id, 80),
      away_team_id: cleanText(body.away_team_id ?? current?.away_team_id, 80),
      home_team_name: home,
      away_team_name: away,
      opponent: away,
      opponent_name: away,
      team_name: away,
      game_format: cleanText(body.game_format ?? current?.game_format, 80) || "5v5",
      match_type: cleanText(body.game_format ?? current?.game_format, 80) || "5v5",
      game_stage: cleanText(body.game_stage ?? current?.game_stage, 80) || "Game",
      game_date: gameDate?.toISOString() ?? null,
      date: gameDate?.toISOString() ?? null,
      venue: cleanText(body.venue ?? current?.venue, 240),
      location: cleanText(body.location ?? current?.location, 240),
      court: cleanText(body.court ?? current?.court, 80),
      status,
      status_note: statusNote,
      is_upcoming: ["upcoming", "live"].includes(status),
      home_score: homeScore,
      team_score: homeScore,
      fackts_score: homeScore,
      away_score: awayScore,
      opponent_score: awayScore,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await gamesAccess(false);
    if (!access.allowed || !access.profile) {
      return NextResponse.json({ ok: false, error: "Games access is required." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const eventId = cleanText(request.nextUrl.searchParams.get("event_id"), 160);
    const status = cleanStatus(request.nextUrl.searchParams.get("status"));
    const from = cleanText(request.nextUrl.searchParams.get("date_from"), 30);
    const to = cleanText(request.nextUrl.searchParams.get("date_to"), 30);
    const query = cleanText(request.nextUrl.searchParams.get("q"), 180)?.toLowerCase() ?? "";
    const participant = cleanText(request.nextUrl.searchParams.get("participant"), 180)?.toLowerCase() ?? "";

    let gamesQuery = admin.from("games").select("*").order("game_date", { ascending: false }).limit(1000);
    if (eventId) gamesQuery = gamesQuery.eq("event_id", eventId);
    if (status) gamesQuery = gamesQuery.eq("status", status);
    if (from) gamesQuery = gamesQuery.gte("game_date", `${from}T00:00:00`);
    if (to) gamesQuery = gamesQuery.lte("game_date", `${to}T23:59:59.999`);
    const gamesResult = await gamesQuery;
    if (gamesResult.error) throw gamesResult.error;

    let games = (gamesResult.data ?? []).map((game) => ({ ...game, status: normalizedStatus(game.status) }));
    if (access.assignments) {
      games = games.filter((game) => access.assignments?.some((assignment) => assignmentMatchesGame(assignment, game)));
    }

    const gameIds = games.map((game) => String(game.id));
    const legacyOneOnOneIds = games.map((game) => String(game.legacy_one_on_one_id ?? "")).filter(Boolean);
    const [eventsResult, rostersResult, legacyMediaResult, gameMediaLinksResult, oneOnOneMediaLinksResult] = await Promise.all([
      admin.from("event_case_studies").select("event_id,title,start_date,end_date,is_public").order("start_date", { ascending: false }),
      gameIds.length
        ? admin.from("game_rosters").select("game_id,player_id,team_side,roster_status").in("game_id", gameIds)
        : Promise.resolve({ data: [], error: null }),
      gameIds.length
        ? admin.from("game_media").select("id,game_id").in("game_id", gameIds)
        : Promise.resolve({ data: [], error: null }),
      gameIds.length
        ? admin.from("media_links").select("asset_id,owner_id").eq("owner_type", "game").in("owner_id", gameIds)
        : Promise.resolve({ data: [], error: null }),
      legacyOneOnOneIds.length
        ? admin.from("media_links").select("asset_id,owner_id").eq("owner_type", "one_on_one").in("owner_id", legacyOneOnOneIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (rostersResult.error) throw rostersResult.error;
    if (legacyMediaResult.error) throw legacyMediaResult.error;
    if (gameMediaLinksResult.error) throw gameMediaLinksResult.error;
    if (oneOnOneMediaLinksResult.error) throw oneOnOneMediaLinksResult.error;

    const playerIds = Array.from(new Set((rostersResult.data ?? []).map((row) => row.player_id).filter(Boolean)));
    const playersResult = playerIds.length
      ? await admin.from("players").select("id,full_name,name,nickname,player_type").in("id", playerIds)
      : { data: [], error: null };
    if (playersResult.error) throw playersResult.error;
    const playersById = new Map((playersResult.data ?? []).map((player) => [player.id, player]));

    const enriched = games.map((game) => {
      const roster = (rostersResult.data ?? [])
        .filter((row) => String(row.game_id) === String(game.id))
        .map((row) => ({ ...row, person: playersById.get(row.player_id) ?? null }));
      const canonicalAssetIds = new Set([
        ...(gameMediaLinksResult.data ?? [])
          .filter((row) => String(row.owner_id) === String(game.id))
          .map((row) => String(row.asset_id)),
        ...(oneOnOneMediaLinksResult.data ?? [])
          .filter((row) => String(row.owner_id) === String(game.legacy_one_on_one_id ?? ""))
          .map((row) => String(row.asset_id)),
      ]);
      const legacyCount = (legacyMediaResult.data ?? []).filter(
        (row) => String(row.game_id) === String(game.id)
      ).length;
      return {
        ...game,
        roster_participants: roster,
        roster_count: roster.filter((row) => row.roster_status !== "withdrawn").length,
        media_count: Math.max(canonicalAssetIds.size, legacyCount),
      };
    }).filter((game) => {
      const haystack = [
        game.title,
        game.home_team_name,
        game.away_team_name,
        game.competition_name,
        game.game_stage,
        game.venue,
        ...game.roster_participants.map((row: { person: JsonRecord | null }) => {
          const person = row.person as JsonRecord | null;
          return person ? person.full_name || person.name || person.nickname : "";
        }),
      ].join(" ").toLowerCase();
      const teamHaystack = [
        game.home_team_name,
        game.away_team_name,
        ...game.roster_participants.map((row: { person: JsonRecord | null }) => {
          const person = row.person as JsonRecord | null;
          return person ? person.full_name || person.name || person.nickname : "";
        }),
      ].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!participant || teamHaystack.includes(participant));
    });

    return NextResponse.json({ ok: true, games: enriched, events: eventsResult.data ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Games could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const rows = Array.isArray(body.games) ? body.games : [body];
    if (!rows.length || rows.length > 200) {
      return NextResponse.json({ ok: false, error: "Bulk scheduling supports 1 to 200 games at a time." }, { status: 400 });
    }

    const eventIds = new Set(rows.map((row) => cleanText((row as JsonRecord).event_id, 160)).filter(Boolean));
    if (rows.length > 1 && (eventIds.size !== 1 || !Array.from(eventIds)[0])) {
      return NextResponse.json({ ok: false, error: "Bulk scheduling requires one event for the entire batch." }, { status: 400 });
    }

    const normalizedRows = rows.map((row) => gameMutationPayload(row as JsonRecord));
    const errors = normalizedRows.flatMap((row, index) => row.errors.map((error) => `Game ${index + 1}: ${error}`));
    const keys = normalizedRows.map((row) => String(row.payload.setup_key ?? "")).filter(Boolean);
    if (new Set(keys).size !== keys.length) errors.push("Bulk rows must not repeat the same setup key.");
    if (errors.length) {
      return NextResponse.json({ ok: false, error: errors[0], errors }, { status: 400 });
    }

    const access = await gamesAccess(true, normalizedRows[0].payload);
    if (!access.allowed || !access.user || !access.profile) {
      return NextResponse.json({ ok: false, error: "You cannot schedule games for this event or team." }, { status: 403 });
    }
    const profileId = access.profile.id;
    if (access.assignments && normalizedRows.some((row) => !access.assignments?.some((assignment) => assignmentMatchesGame(assignment, row.payload)))) {
      return NextResponse.json({ ok: false, error: "One or more games fall outside your assigned scope." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const eventId = normalizedRows[0].payload.event_id;
    const eventResult = eventId
      ? await admin.from("event_case_studies").select("is_public").eq("event_id", eventId).maybeSingle()
      : { data: null, error: null };
    if (eventResult.error) throw eventResult.error;

    const payloads = normalizedRows.map((row) => ({
      ...row.payload,
      setup_key: row.payload.setup_key || `bulk-${crypto.randomUUID()}`,
      is_public: eventResult.data?.is_public === true,
      status_changed_at: new Date().toISOString(),
      status_changed_by: profileId,
      created_at: new Date().toISOString(),
    }));
    const result = await admin.from("games").upsert(payloads, { onConflict: "event_id,setup_key" }).select("*");
    if (result.error) throw result.error;

    const auditAssignment = access.assignments?.find((assignment) =>
      assignmentMatchesGame(assignment, normalizedRows[0].payload)
    );

    await recordAdminAuditEvent(access.supabase, {
      action: rows.length > 1 ? "bulk_schedule" : "create",
      entityType: "game",
      capability: "games",
      resourceType: auditAssignment?.resource_type ?? (eventId ? "event" : null),
      resourceId: auditAssignment?.resource_id ?? eventId ?? null,
      after: result.data,
      metadata: { count: result.data?.length ?? 0, source: "phase1_games" },
    });

    return NextResponse.json({ ok: true, games: result.data ?? [], message: `${result.data?.length ?? 0} game${result.data?.length === 1 ? "" : "s"} scheduled.` }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Games could not be scheduled." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRecord;
    const id = cleanText(body.id, 100);
    const expectedVersion = Number(body.expected_version);
    if (!id || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return NextResponse.json({ ok: false, error: "Game ID and current version are required." }, { status: 400 });
    }

    const access = await gamesAccess(true);
    if (!access.allowed || !access.user || !access.profile) {
      return NextResponse.json({ ok: false, error: "You cannot update this game." }, { status: 403 });
    }
    const admin = createSupabaseAdminClient();
    const scopeTarget = await admin.from("games").select("id,event_id,home_team_id,away_team_id").eq("id", id).maybeSingle();
    if (scopeTarget.error) throw scopeTarget.error;
    if (!scopeTarget.data) return NextResponse.json({ ok: false, error: "Game not found." }, { status: 404 });
    const scopedGame = scopeTarget.data;
    if (access.assignments && !access.assignments.some((assignment) => assignmentMatchesGame(assignment, scopedGame))) {
      return NextResponse.json({ ok: false, error: "You cannot update this game." }, { status: 403 });
    }
    const existing = await admin.from("games").select("*").eq("id", id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return NextResponse.json({ ok: false, error: "Game not found." }, { status: 404 });

    const currentStatus = normalizedStatus(existing.data.status);
    const mutation = gameMutationPayload(body, existing.data);
    if (!TRANSITIONS[currentStatus].includes(mutation.status)) {
      mutation.errors.push(`A ${currentStatus} game cannot move directly to ${mutation.status}.`);
    }
    if (mutation.status !== currentStatus && ["postponed", "cancelled", "upcoming"].includes(mutation.status) && !mutation.statusNote) {
      mutation.errors.push("Add a status note for postponement, cancellation or reopening.");
    }
    if (mutation.errors.length) {
      return NextResponse.json({ ok: false, error: mutation.errors[0], errors: mutation.errors }, { status: 400 });
    }

    const statusChanged = mutation.status !== currentStatus;
    const result = await admin
      .from("games")
      .update({
        ...mutation.payload,
        status_changed_at: statusChanged ? new Date().toISOString() : existing.data.status_changed_at,
        status_changed_by: statusChanged ? access.profile.id : existing.data.status_changed_by,
      })
      .eq("id", id)
      .eq("version", expectedVersion)
      .select("*")
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      return NextResponse.json({ ok: false, error: "This game changed in another session. Reload before saving again.", conflict: true }, { status: 409 });
    }

    const auditAssignment = access.assignments?.find((assignment) =>
      assignmentMatchesGame(assignment, existing.data)
    );

    await recordAdminAuditEvent(access.supabase, {
      action: statusChanged ? "status_change" : "score_update",
      entityType: "game",
      entityId: id,
      capability: "games",
      resourceType: auditAssignment?.resource_type ?? "game",
      resourceId: auditAssignment?.resource_id ?? id,
      before: existing.data,
      after: result.data,
      metadata: { source: "phase1_games" },
    });

    return NextResponse.json({ ok: true, game: result.data, message: statusChanged ? "Game status updated." : "Game score saved." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Game could not be updated." }, { status: 500 });
  }
}
