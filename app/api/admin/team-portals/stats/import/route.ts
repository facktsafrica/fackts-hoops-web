import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { parseStatDocument, type ImportedStatRow } from "@/lib/basketball-iq/documentImport";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = new Set(["csv", "tsv", "txt", "xlsx", "xls", "pdf", "docx", "doc"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv", tsv: "text/tab-separated-values", txt: "text/plain",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel", pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword",
};
const STAT_FIELDS = [
  "points", "rebounds", "offensive_rebounds", "defensive_rebounds", "assists", "steals", "blocks",
  "turnovers", "fouls", "minutes", "two_made", "two_attempted", "three_made", "three_attempted",
  "ft_made", "ft_attempted",
] as const;

function text(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function identity(value: unknown) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "stat-sheet";
}

async function requireSuperAdmin() {
  const access = await getAdminAccess();
  return { ...access, allowed: Boolean(access.user && access.profile && isSuperAdmin(access.profile)) };
}

async function loadTeamContext(admin: ReturnType<typeof createSupabaseAdminClient>, teamId: string, gameId: string) {
  const [game, roster] = await Promise.all([
    admin.from("games").select("id,home_team_id,away_team_id,title,game_title").eq("id", gameId).maybeSingle(),
    admin.from("team_roster_members").select("id,player_id,display_name,nickname,jersey_number").eq("team_id", teamId).eq("status", "active").limit(500),
  ]);
  if (game.error) throw game.error;
  if (roster.error) throw roster.error;
  if (!game.data || ![game.data.home_team_id, game.data.away_team_id].includes(teamId)) {
    throw new Error("Choose a canonical game assigned to the selected team.");
  }
  return { game: game.data, roster: roster.data ?? [] };
}

function matchRows(rows: ImportedStatRow[], roster: JsonRecord[]) {
  return rows.map((row) => {
    const rowName = identity(row.player_name);
    const jersey = identity(row.jersey_number);
    const byName = roster.filter((member) => [member.display_name, member.nickname].some((name) => identity(name) === rowName));
    const byJersey = jersey ? roster.filter((member) => identity(member.jersey_number) === jersey) : [];
    const match = byName.length === 1 ? byName[0] : byJersey.length === 1 ? byJersey[0] : null;
    return { ...row, roster_member_id: match?.id || null, player_id: match?.player_id || null };
  });
}

function validateRows(rows: JsonRecord[], roster: JsonRecord[]) {
  const rosterById = new Map(roster.map((member) => [String(member.id), member]));
  const validated = rows.map((row) => {
    const rosterMemberId = text(row.roster_member_id, 100);
    const member = rosterById.get(rosterMemberId);
    if (!member) throw new Error("Match every imported row to an active player on the selected team roster.");
    const output: JsonRecord = {
      roster_member_id: rosterMemberId,
      player_id: member.player_id || null,
      display_name: text(member.display_name, 180) || "Player",
      plus_minus: Number.isInteger(Number(row.plus_minus)) ? Number(row.plus_minus) : 0,
      period_values: {},
    };
    for (const field of STAT_FIELDS) {
      const value = Number(row[field] ?? 0);
      if (!Number.isFinite(value) || value < 0 || (field !== "minutes" && !Number.isInteger(value))) throw new Error(`${field.replaceAll("_", " ")} contains an invalid value.`);
      output[field] = value;
    }
    if (Number(output.two_made) > Number(output.two_attempted) || Number(output.three_made) > Number(output.three_attempted) || Number(output.ft_made) > Number(output.ft_attempted)) {
      throw new Error("A made shot cannot be higher than its attempts.");
    }
    const splitRebounds = Number(output.offensive_rebounds) + Number(output.defensive_rebounds);
    if (splitRebounds > 0) output.rebounds = splitRebounds;
    return output;
  });
  if (!validated.length) throw new Error("The stat sheet has no player rows to save.");
  if (new Set(validated.map((row) => row.roster_member_id)).size !== validated.length) throw new Error("A player can only appear once in the imported box score.");
  return validated;
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin();
  if (!access.allowed || !access.user) return NextResponse.json({ ok: false, error: "Super Admin access required." }, { status: 403 });
  try {
    const admin = createSupabaseAdminClient();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const teamId = text(form.get("team_id"), 100);
      const gameId = text(form.get("game_id"), 160);
      if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an Excel, CSV, PDF or Word stat sheet." }, { status: 400 });
      const extension = file.name.toLowerCase().split(".").pop() || "";
      if (!teamId || !gameId) return NextResponse.json({ ok: false, error: "Choose the team and game first." }, { status: 400 });
      if (!EXTENSIONS.has(extension) || file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Use CSV, Excel, PDF, TXT or Word up to 15 MB." }, { status: 400 });
      const context = await loadTeamContext(admin, teamId, gameId);
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type && file.type !== "application/octet-stream" ? file.type : MIME_BY_EXTENSION[extension] || "text/plain";
      const parsed = await parseStatDocument(buffer, file.name, mimeType);
      const rows = matchRows(parsed.rows, context.roster);
      const unmatched = rows.filter((row) => !row.roster_member_id).length;
      const warnings = [...parsed.warnings];
      if (unmatched) warnings.push(`${unmatched} row${unmatched === 1 ? "" : "s"} need a roster match before the box score can be saved.`);
      const storagePath = `${teamId}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const uploaded = await admin.storage.from("team-stat-imports").upload(storagePath, buffer, { contentType: mimeType, upsert: false });
      if (uploaded.error) throw uploaded.error;
      const saved = await admin.from("team_stat_imports").insert({
        team_id: teamId, game_id: gameId, uploaded_by_user_id: access.user.id,
        file_name: file.name.slice(0, 300), storage_path: storagePath, mime_type: mimeType, file_size: file.size,
        extraction_status: rows.length ? (warnings.length ? "partial" : "parsed") : "review_required",
        extracted_rows: rows, warnings,
      }).select("id,game_id,file_name,extraction_status,warnings,created_at").single();
      if (saved.error) throw saved.error;
      return NextResponse.json({ ok: true, import: saved.data, rows, warnings, roster: context.roster, message: rows.length ? `${rows.length} player rows extracted. Match any unresolved names, check every value, then save to review.` : "The original file is stored as evidence, but no structured rows were detected." }, { status: 201 });
    }

    const body = await request.json() as JsonRecord;
    const teamId = text(body.team_id, 100);
    const gameId = text(body.game_id, 160);
    const importId = text(body.import_id, 100);
    const rows = Array.isArray(body.rows) ? body.rows.filter((row): row is JsonRecord => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : [];
    if (!teamId || !gameId || !importId) return NextResponse.json({ ok: false, error: "The selected team, game and source import are required." }, { status: 400 });
    const [context, source] = await Promise.all([
      loadTeamContext(admin, teamId, gameId),
      admin.from("team_stat_imports").select("id").eq("id", importId).eq("team_id", teamId).eq("game_id", gameId).maybeSingle(),
    ]);
    if (source.error) throw source.error;
    if (!source.data) return NextResponse.json({ ok: false, error: "The source import does not belong to this team and game." }, { status: 403 });
    const validated = validateRows(rows, context.roster);
    const now = new Date().toISOString();
    const session = await admin.from("team_stat_sessions").insert({
      team_id: teamId, game_id: gameId, created_by_user_id: access.user.id, mode: "import", status: "draft",
      current_period: "Q1", source_import_id: importId, notes: "Uploaded by Super Admin", updated_at: now,
    }).select("*").single();
    if (session.error) throw session.error;
    const savedLines = await admin.from("team_player_stat_lines").insert(validated.map((row) => ({
      ...row, session_id: session.data.id, team_id: teamId, game_id: gameId, status: "submitted", updated_at: now,
    })));
    if (savedLines.error) {
      await admin.from("team_stat_sessions").delete().eq("id", session.data.id);
      throw savedLines.error;
    }
    const submission = await admin.from("team_stat_submissions").insert({
      team_id: teamId, game_id: gameId, submitted_by_user_id: access.user.id,
      stat_payload: { submission_type: "team_stat_session", session_id: session.data.id, mode: "import", player_rows: validated.length, linked_official_players: validated.filter((row) => row.player_id).length, notes: "Uploaded by Super Admin" },
    }).select("id").single();
    if (submission.error) {
      await admin.from("team_stat_sessions").delete().eq("id", session.data.id);
      throw submission.error;
    }
    const updatedSession = await admin.from("team_stat_sessions").update({ status: "submitted", source_submission_id: submission.data.id, submitted_at: now, updated_at: now }).eq("id", session.data.id);
    if (updatedSession.error) throw updatedSession.error;
    return NextResponse.json({ ok: true, message: "Complete team box score added to the Super Admin review queue. Approve it to publish verified player statistics." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Team stat import failed." }, { status: 500 });
  }
}
