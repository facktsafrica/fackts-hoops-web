import { NextRequest, NextResponse } from "next/server";
import { parseStatDocument } from "@/lib/basketball-iq/documentImport";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = new Set(["csv", "tsv", "txt", "xlsx", "xls", "pdf", "docx", "doc"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  txt: "text/plain",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

function text(value: FormDataEntryValue | null, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "stat-sheet";
}

function identity(value: unknown) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestedTeamId = text(form.get("team_id"), 100) || null;
    const gameId = text(form.get("game_id"), 160);
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an Excel, CSV, PDF or Word stat sheet." }, { status: 400 });
    const extension = file.name.toLowerCase().split(".").pop() || "";
    const mimeType = file.type && file.type !== "application/octet-stream" ? file.type : MIME_BY_EXTENSION[extension] || "text/plain";
    if (!EXTENSIONS.has(extension) || file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Use CSV, Excel, PDF, TXT or Word up to 15 MB." }, { status: 400 });
    if (!gameId || !/^[a-z0-9-]{1,160}$/i.test(gameId)) return NextResponse.json({ ok: false, error: "Choose the game that owns these statistics." }, { status: 400 });
    const access = await requireTeamCapability("stats_submit", requestedTeamId);
    if (!access.user) return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    if (!access.permitted || !access.membership) return NextResponse.json({ ok: false, error: "Statistics access is not active for this account." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;
    const [canonical, attached, roster] = await Promise.all([
      admin.from("games").select("id,home_team_id,away_team_id").eq("id", gameId).maybeSingle(),
      admin.from("team_games").select("id,game_id").eq("team_id", teamId).or(`id.eq.${gameId},game_id.eq.${gameId}`).limit(1).maybeSingle(),
      admin.from("team_roster_members").select("id,player_id,display_name,nickname,jersey_number").eq("team_id", teamId).eq("status", "active").limit(500),
    ]);
    for (const result of [canonical, attached, roster]) if (result.error) throw result.error;
    const canonicalOwned = canonical.data && [canonical.data.home_team_id, canonical.data.away_team_id].includes(teamId);
    if (!canonicalOwned && !attached.data) return NextResponse.json({ ok: false, error: "That game is not assigned to this team." }, { status: 403 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseStatDocument(buffer, file.name, mimeType);
    const rosterRows = roster.data ?? [];
    const matchedRows = parsed.rows.map((row) => {
      const rowName = identity(row.player_name);
      const jersey = identity(row.jersey_number);
      const byName = rosterRows.filter((member) => [member.display_name, member.nickname].some((name) => identity(name) === rowName));
      const byJersey = jersey ? rosterRows.filter((member) => identity(member.jersey_number) === jersey) : [];
      const match = byName.length === 1 ? byName[0] : byJersey.length === 1 ? byJersey[0] : null;
      return { ...row, roster_member_id: match?.id || null, player_id: match?.player_id || null };
    });
    const unmatched = matchedRows.filter((row) => !row.roster_member_id).length;
    const warnings = [...parsed.warnings];
    if (unmatched) warnings.push(`${unmatched} extracted row${unmatched === 1 ? "" : "s"} could not be matched automatically. Choose the correct roster player before saving.`);
    const objectPath = `${teamId}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const uploaded = await admin.storage.from("team-stat-imports").upload(objectPath, buffer, { contentType: mimeType, upsert: false });
    if (uploaded.error) throw uploaded.error;
    const result = await admin.from("team_stat_imports").insert({
      team_id: teamId,
      game_id: gameId,
      uploaded_by_user_id: access.user.id,
      file_name: file.name.slice(0, 300),
      storage_path: objectPath,
      mime_type: mimeType,
      file_size: file.size,
      extraction_status: matchedRows.length ? (warnings.length ? "partial" : "parsed") : "review_required",
      extracted_rows: matchedRows,
      warnings,
    }).select("id,game_id,file_name,mime_type,file_size,extraction_status,warnings,created_at").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, import: result.data, rows: matchedRows, warnings, message: matchedRows.length ? `${matchedRows.length} player row${matchedRows.length === 1 ? "" : "s"} extracted. Review every value before saving.` : "File stored as private evidence. No safe structured rows were detected, so complete the review grid manually." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Stat sheet import failed." }, { status: 500 });
  }
}
