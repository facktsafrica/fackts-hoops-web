import { NextRequest, NextResponse } from "next/server";
import { buildBasketballIQ, type BasketballStatLine } from "@/lib/basketball-iq/insights";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

const STAT_FIELDS = [
  "points", "rebounds", "offensive_rebounds", "defensive_rebounds", "assists",
  "steals", "blocks", "turnovers", "fouls", "minutes", "two_made",
  "two_attempted", "three_made", "three_attempted", "ft_made", "ft_attempted",
] as const;
const BRIEFING_ROLES = new Set(["owner", "manager", "coach", "statistician"]);

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function statNumber(value: unknown, integer = true) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 && (!integer || Number.isInteger(parsed)) ? parsed : null;
}

function period(value: unknown) {
  const normalized = text(value, 4).toUpperCase();
  return /^(Q[1-4]|OT[1-9]?)$/.test(normalized) ? normalized : "Q1";
}

function safeRecordId(value: string) {
  return /^[a-z0-9-]{1,160}$/i.test(value);
}

async function teamOwnsGame(admin: ReturnType<typeof createSupabaseAdminClient>, teamId: string, gameId: string) {
  const [canonical, attached] = await Promise.all([
    admin.from("games").select("id,home_team_id,away_team_id,title,game_title,home_team_name,away_team_name").eq("id", gameId).maybeSingle(),
    admin.from("team_games").select("id,game_id,title,opponent_name").eq("team_id", teamId).or(`id.eq.${gameId},game_id.eq.${gameId}`).limit(1).maybeSingle(),
  ]);
  if (canonical.error) throw canonical.error;
  if (attached.error) throw attached.error;
  const canonicalOwned = canonical.data && [canonical.data.home_team_id, canonical.data.away_team_id].includes(teamId);
  return canonicalOwned || Boolean(attached.data);
}

function validateLine(input: JsonRecord, rosterById: Map<string, JsonRecord>) {
  const rosterMemberId = text(input.roster_member_id, 100);
  const roster = rosterById.get(rosterMemberId);
  if (!roster) throw new Error("Every stat row must belong to an active player on this team roster.");
  const output: JsonRecord = {
    roster_member_id: rosterMemberId,
    player_id: roster.player_id || null,
    display_name: text(roster.display_name, 180) || "Player",
    plus_minus: Number.isFinite(Number(input.plus_minus)) && Number.isInteger(Number(input.plus_minus)) ? Number(input.plus_minus) : 0,
    period_values: input.period_values && typeof input.period_values === "object" && !Array.isArray(input.period_values) ? input.period_values : {},
  };
  for (const field of STAT_FIELDS) {
    const parsed = statNumber(input[field], field !== "minutes");
    if (parsed === null) throw new Error(`${field.replaceAll("_", " ")} must be a non-negative ${field === "minutes" ? "number" : "whole number"}.`);
    output[field] = parsed;
  }
  if (Number(output.two_made) > Number(output.two_attempted) || Number(output.three_made) > Number(output.three_attempted) || Number(output.ft_made) > Number(output.ft_attempted)) {
    throw new Error("A made shot cannot be higher than its attempts.");
  }
  const splitRebounds = Number(output.offensive_rebounds) + Number(output.defensive_rebounds);
  if (splitRebounds > 0) output.rebounds = splitRebounds;
  return output;
}

export async function GET(request: NextRequest) {
  try {
    const requestedTeamId = text(request.nextUrl.searchParams.get("team_id"), 100) || null;
    const access = await requireTeamCapability("stats_submit", requestedTeamId);
    if (!access.user) return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    if (!access.permitted || !access.membership) return NextResponse.json({ ok: false, error: "Statistics access is not active for this account." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;
    const [sessions, lines, imports, briefings] = await Promise.all([
      admin.from("team_stat_sessions").select("*").eq("team_id", teamId).neq("status", "archived").order("updated_at", { ascending: false }).limit(80),
      admin.from("team_player_stat_lines").select("*").eq("team_id", teamId).neq("status", "rejected").order("updated_at", { ascending: false }).limit(5000),
      admin.from("team_stat_imports").select("id,team_id,game_id,file_name,mime_type,file_size,extraction_status,warnings,created_at").eq("team_id", teamId).order("created_at", { ascending: false }).limit(40),
      admin.from("team_performance_briefings").select("*").eq("team_id", teamId).neq("status", "archived").order("published_at", { ascending: false }).limit(100),
    ]);
    for (const result of [sessions, lines, imports, briefings]) if (result.error) throw result.error;
    const intelligence = buildBasketballIQ((lines.data ?? []) as BasketballStatLine[]);
    return NextResponse.json({
      ok: true,
      sessions: sessions.data ?? [],
      lines: lines.data ?? [],
      imports: imports.data ?? [],
      briefings: briefings.data ?? [],
      intelligence,
      can_publish_briefings: BRIEFING_ROLES.has(access.membership.role),
      membership_role: access.membership.role,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Basketball IQ could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as JsonRecord;
    const requestedTeamId = text(body.team_id, 100) || null;
    const access = await requireTeamCapability("stats_submit", requestedTeamId);
    if (!access.user) return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    if (!access.permitted || !access.membership) return NextResponse.json({ ok: false, error: "Statistics access is not active for this account." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;
    const action = text(body.action, 80);

    if (action === "save_session") {
      const gameId = text(body.game_id, 160);
      const rows = Array.isArray(body.rows) ? body.rows.filter((row): row is JsonRecord => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : [];
      if (!gameId || !safeRecordId(gameId)) return NextResponse.json({ ok: false, error: "Choose the game before entering player statistics." }, { status: 400 });
      if (!await teamOwnsGame(admin, teamId, gameId)) return NextResponse.json({ ok: false, error: "That game is not assigned to this team." }, { status: 403 });
      const rosterResult = await admin.from("team_roster_members").select("id,player_id,display_name,status").eq("team_id", teamId).eq("status", "active").limit(500);
      if (rosterResult.error) throw rosterResult.error;
      const rosterById = new Map((rosterResult.data ?? []).map((row) => [row.id, row as JsonRecord]));
      const validated = rows.map((row) => validateLine(row, rosterById));
      if (new Set(validated.map((row) => row.roster_member_id)).size !== validated.length) return NextResponse.json({ ok: false, error: "A player can only appear once in a stat session." }, { status: 409 });
      const now = new Date().toISOString();
      const sessionId = text(body.session_id, 100);
      let session: JsonRecord | null = null;
      if (sessionId) {
        const current = await admin.from("team_stat_sessions").select("*").eq("id", sessionId).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Stat session not found." }, { status: 404 });
        if (current.data.status !== "draft") return NextResponse.json({ ok: false, error: "A submitted session is locked. Start a new session or ask Super Admin to review it." }, { status: 409 });
        const saved = await admin.from("team_stat_sessions").update({ game_id: gameId, mode: ["live", "box_score", "import"].includes(text(body.mode, 30)) ? text(body.mode, 30) : "live", current_period: period(body.current_period), source_import_id: text(body.source_import_id, 100) || null, notes: text(body.notes, 2000) || null, updated_at: now }).eq("id", sessionId).eq("team_id", teamId).select("*").single();
        if (saved.error) throw saved.error;
        session = saved.data;
      } else {
        const saved = await admin.from("team_stat_sessions").insert({ team_id: teamId, game_id: gameId, created_by_user_id: access.user.id, mode: ["live", "box_score", "import"].includes(text(body.mode, 30)) ? text(body.mode, 30) : "live", current_period: period(body.current_period), source_import_id: text(body.source_import_id, 100) || null, notes: text(body.notes, 2000) || null, updated_at: now }).select("*").single();
        if (saved.error) throw saved.error;
        session = saved.data;
      }
      if (validated.length) {
        const lineRows = validated.map((row) => ({ ...row, session_id: session?.id, team_id: teamId, game_id: gameId, status: "draft", updated_at: now }));
        const savedLines = await admin.from("team_player_stat_lines").upsert(lineRows, { onConflict: "session_id,roster_member_id" }).select("*");
        if (savedLines.error) throw savedLines.error;
      }
      const currentLines = await admin.from("team_player_stat_lines").select("*").eq("session_id", String(session?.id || "")).order("display_name");
      if (currentLines.error) throw currentLines.error;
      return NextResponse.json({ ok: true, session, lines: currentLines.data ?? [], message: "Club stats autosaved. They are already available to Basketball IQ but are not public or official yet." });
    }

    if (action === "submit_session") {
      const sessionId = text(body.session_id, 100);
      if (!safeRecordId(sessionId)) return NextResponse.json({ ok: false, error: "Save this stat session first." }, { status: 400 });
      const session = await admin.from("team_stat_sessions").select("*").eq("id", sessionId).eq("team_id", teamId).maybeSingle();
      if (session.error) throw session.error;
      if (!session.data) return NextResponse.json({ ok: false, error: "Save this stat session first." }, { status: 404 });
      if (session.data.source_submission_id) return NextResponse.json({ ok: true, message: "This game stat session is already in the Super Admin review queue." });
      const canonicalGame = await admin.from("games").select("id,home_team_id,away_team_id").eq("id", session.data.game_id).maybeSingle();
      if (canonicalGame.error) throw canonicalGame.error;
      if (!canonicalGame.data || ![canonicalGame.data.home_team_id, canonicalGame.data.away_team_id].includes(teamId)) {
        return NextResponse.json({ ok: false, error: "These stats are saved for club intelligence, but this club-only game must be linked to an official FACKTS game before Super Admin verification." }, { status: 409 });
      }
      const lines = await admin.from("team_player_stat_lines").select("id,player_id,display_name,points,rebounds,assists,steals,blocks,turnovers,fouls").eq("session_id", sessionId);
      if (lines.error) throw lines.error;
      if (!(lines.data ?? []).length) return NextResponse.json({ ok: false, error: "Enter at least one player stat line before submission." }, { status: 400 });
      const submission = await admin.from("team_stat_submissions").insert({
        team_id: teamId,
        game_id: session.data.game_id,
        submitted_by_user_id: access.user.id,
        stat_payload: {
          submission_type: "team_stat_session",
          session_id: sessionId,
          mode: session.data.mode,
          player_rows: lines.data?.length || 0,
          linked_official_players: (lines.data ?? []).filter((line) => line.player_id).length,
          notes: text(body.notes, 2000),
        },
      }).select("*").single();
      if (submission.error) throw submission.error;
      const now = new Date().toISOString();
      const [sessionUpdate, lineUpdate] = await Promise.all([
        admin.from("team_stat_sessions").update({ status: "submitted", source_submission_id: submission.data.id, submitted_at: now, updated_at: now }).eq("id", sessionId),
        admin.from("team_player_stat_lines").update({ status: "submitted", updated_at: now }).eq("session_id", sessionId),
      ]);
      if (sessionUpdate.error) throw sessionUpdate.error;
      if (lineUpdate.error) throw lineUpdate.error;
      return NextResponse.json({ ok: true, submission: submission.data, message: "Complete box score sent to Super Admin. The club can keep using its intelligence while official publication waits for verification." }, { status: 201 });
    }

    if (action === "publish_briefing") {
      if (!BRIEFING_ROLES.has(access.membership.role)) return NextResponse.json({ ok: false, error: "This team role cannot publish performance briefings." }, { status: 403 });
      const audience = text(body.audience, 30) === "player" ? "player" : "team";
      const rosterMemberId = audience === "player" ? text(body.roster_member_id, 100) : "";
      let roster: JsonRecord | null = null;
      if (audience === "player") {
        const result = await admin.from("team_roster_members").select("id,player_id,display_name").eq("id", rosterMemberId).eq("team_id", teamId).eq("status", "active").maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) return NextResponse.json({ ok: false, error: "Choose an active team player." }, { status: 400 });
        if (!result.data.player_id) return NextResponse.json({ ok: false, error: "That roster member is not linked to an official player login yet. Super Admin must link the identity first." }, { status: 409 });
        roster = result.data;
      }
      const title = text(body.title, 180);
      const briefingBody = text(body.body, 5000);
      if (!title || !briefingBody) return NextResponse.json({ ok: false, error: "Briefing title and coach message are required." }, { status: 400 });
      const result = await admin.from("team_performance_briefings").insert({
        team_id: teamId,
        roster_member_id: roster?.id || null,
        player_id: roster?.player_id || null,
        created_by_user_id: access.user.id,
        audience,
        title,
        focus_area: text(body.focus_area, 180) || null,
        body: briefingBody,
        source_type: access.membership.role === "statistician" || text(body.source_type, 30) === "data_led" ? "data_led" : "coach",
        linked_session_id: text(body.linked_session_id, 100) || null,
        status: "published",
        published_at: new Date().toISOString(),
      }).select("*").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, briefing: result.data, message: audience === "player" ? "Briefing published to the linked player login." : "Team briefing published to every linked player login." }, { status: 201 });
    }

    if (action === "archive_briefing") {
      if (!BRIEFING_ROLES.has(access.membership.role)) return NextResponse.json({ ok: false, error: "This team role cannot archive performance briefings." }, { status: 403 });
      const result = await admin.from("team_performance_briefings").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", text(body.briefing_id, 100)).eq("team_id", teamId).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return NextResponse.json({ ok: false, error: "Briefing not found." }, { status: 404 });
      return NextResponse.json({ ok: true, message: "Briefing archived." });
    }

    return NextResponse.json({ ok: false, error: "Unsupported Basketball IQ action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Basketball IQ update failed." }, { status: 500 });
  }
}
