import { NextRequest, NextResponse } from "next/server";
import { parseStatDocument, type ImportedStatRow } from "@/lib/basketball-iq/documentImport";
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

function recordText(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function integer(value: unknown, allowNegative = false) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || (!allowNegative && parsed < 0)) return 0;
  return parsed;
}

function decimal(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clientRows(value: string): ImportedStatRow[] {
  if (!value) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("The browser OCR rows were not valid JSON."); }
  if (!Array.isArray(parsed) || parsed.length > 100) throw new Error("The OCR review can contain no more than 100 player rows.");
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const playerName = recordText(row.player_name, 180);
    if (!playerName || /^(total|team)$/i.test(playerName)) return [];
    const twoMade = integer(row.two_made);
    const threeMade = integer(row.three_made);
    const ftMade = integer(row.ft_made);
    const offensiveRebounds = integer(row.offensive_rebounds);
    const defensiveRebounds = integer(row.defensive_rebounds);
    return [{
      player_name: playerName,
      jersey_number: recordText(row.jersey_number, 24) || undefined,
      points: integer(row.points) || twoMade * 2 + threeMade * 3 + ftMade,
      rebounds: offensiveRebounds + defensiveRebounds || integer(row.rebounds),
      offensive_rebounds: offensiveRebounds,
      defensive_rebounds: defensiveRebounds,
      assists: integer(row.assists),
      steals: integer(row.steals),
      blocks: integer(row.blocks),
      turnovers: integer(row.turnovers),
      fouls: integer(row.fouls),
      minutes: decimal(row.minutes),
      two_made: twoMade,
      two_attempted: Math.max(twoMade, integer(row.two_attempted)),
      three_made: threeMade,
      three_attempted: Math.max(threeMade, integer(row.three_attempted)),
      ft_made: ftMade,
      ft_attempted: Math.max(ftMade, integer(row.ft_attempted)),
      plus_minus: integer(row.plus_minus, true),
    }];
  });
}

function stringList(value: string) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => recordText(item, 500)).filter(Boolean).slice(0, 30) : [];
  } catch { return []; }
}

function jsonArray(value: string) {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.slice(0, 12) : []; } catch { return []; }
}

function distance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(row[rightIndex] + 1, row[rightIndex - 1] + 1, diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[right.length];
}

function namesMatch(left: unknown, right: unknown) {
  const first = identity(left);
  const second = identity(right);
  return Boolean(first && second && (first === second || first.includes(second) || second.includes(first) || distance(first, second) <= 2));
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestedTeamId = text(form.get("team_id"), 100) || null;
    let gameId = text(form.get("game_id"), 160);
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an Excel, CSV, PDF or Word stat sheet." }, { status: 400 });
    const extension = file.name.toLowerCase().split(".").pop() || "";
    const mimeType = file.type && file.type !== "application/octet-stream" ? file.type : MIME_BY_EXTENSION[extension] || "text/plain";
    if (!EXTENSIONS.has(extension) || file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Use CSV, Excel, PDF, TXT or Word up to 15 MB." }, { status: 400 });
    if (gameId && !/^[a-z0-9-]{1,160}$/i.test(gameId)) return NextResponse.json({ ok: false, error: "The selected game reference is invalid." }, { status: 400 });
    const access = await requireTeamCapability("stats_submit", requestedTeamId);
    if (!access.user) return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    if (!access.permitted || !access.membership) return NextResponse.json({ ok: false, error: "Statistics access is not active for this account." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;
    const [roster, teamProfile] = await Promise.all([
      admin.from("team_roster_members").select("id,player_id,display_name,nickname,jersey_number").eq("team_id", teamId).eq("status", "active").limit(500),
      admin.from("team_profiles").select("id,name,short_name").eq("id", teamId).maybeSingle(),
    ]);
    for (const result of [roster, teamProfile]) if (result.error) throw result.error;
    if (!teamProfile.data) return NextResponse.json({ ok: false, error: "The registered team profile could not be found." }, { status: 404 });
    if (!(roster.data ?? []).length) return NextResponse.json({ ok: false, error: "Add the team players before importing a player box score." }, { status: 409 });

    let createdGame: Record<string, unknown> | null = null;
    if (gameId) {
      const [canonical, attached] = await Promise.all([
        admin.from("games").select("id,home_team_id,away_team_id").eq("id", gameId).maybeSingle(),
        admin.from("team_games").select("id,game_id").eq("team_id", teamId).or(`id.eq.${gameId},game_id.eq.${gameId}`).limit(1).maybeSingle(),
      ]);
      for (const result of [canonical, attached]) if (result.error) throw result.error;
      const canonicalOwned = canonical.data && [canonical.data.home_team_id, canonical.data.away_team_id].includes(teamId);
      if (!canonicalOwned && !attached.data) return NextResponse.json({ ok: false, error: "That game is not assigned to this team." }, { status: 403 });
    } else {
      if (text(form.get("create_game"), 10) !== "true") return NextResponse.json({ ok: false, error: "Confirm the match detected in the report, or choose an existing game." }, { status: 400 });
      const homeName = text(form.get("home_team_name"), 180);
      const awayName = text(form.get("away_team_name"), 180);
      const gameDate = text(form.get("game_date"), 10);
      const teamSide = text(form.get("team_side"), 10) === "away" ? "away" : "home";
      const homeScore = Number(text(form.get("home_score"), 4));
      const awayScore = Number(text(form.get("away_score"), 4));
      if (!homeName || !awayName || !/^20\d{2}-\d{2}-\d{2}$/.test(gameDate)) return NextResponse.json({ ok: false, error: "Confirm both teams and the game date extracted from the report." }, { status: 400 });
      if (![homeScore, awayScore].every((score) => Number.isInteger(score) && score >= 0) || homeScore === awayScore) return NextResponse.json({ ok: false, error: "Confirm valid final scores. Basketball games require an overtime winner." }, { status: 400 });
      const teamName = teamProfile.data.name;
      const detectedTeamName = teamSide === "home" ? homeName : awayName;
      if (!namesMatch(teamName, detectedTeamName) && !namesMatch(teamProfile.data.short_name, detectedTeamName)) {
        return NextResponse.json({ ok: false, error: `The report's ${teamSide} team (${detectedTeamName}) does not match ${teamName}. Correct the team side before creating the game.` }, { status: 409 });
      }
      const sideColumn = teamSide === "home" ? "home_team_id" : "away_team_id";
      const existing = await admin.from("games")
        .select("id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public")
        .eq(sideColumn, teamId).eq("game_date", gameDate).eq("home_score", homeScore).eq("away_score", awayScore)
        .limit(1).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        gameId = existing.data.id;
        createdGame = existing.data;
      } else {
        const opponentName = teamSide === "home" ? awayName : homeName;
        const teamScore = teamSide === "home" ? homeScore : awayScore;
        const opponentScore = teamSide === "home" ? awayScore : homeScore;
        const created = await admin.from("games").insert({
          team_name: teamName,
          opponent: opponentName,
          game_date: gameDate,
          match_type: "team_report",
          notes: "Created from a private team stat report. Requires Super Admin verification before publication.",
          team_score: teamScore,
          opponent_score: opponentScore,
          is_upcoming: false,
          preview_is_active: false,
          game_title: `${homeName} vs ${awayName}`,
          title: `${homeName} vs ${awayName}`,
          opponent_name: opponentName,
          date: `${gameDate}T12:00:00+03:00`,
          status: "completed",
          home_score: homeScore,
          away_score: awayScore,
          home_team_name: homeName,
          away_team_name: awayName,
          game_format: "5v5",
          period_scores: jsonArray(text(form.get("period_scores"), 5000)),
          verification_status: "unverified",
          is_public: false,
          home_team_id: teamSide === "home" ? teamId : null,
          away_team_id: teamSide === "away" ? teamId : null,
        }).select("id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public").single();
        if (created.error) throw created.error;
        gameId = created.data.id;
        createdGame = created.data;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const browserOcr = text(form.get("browser_ocr"), 10) === "true";
    const ocrRows = clientRows(text(form.get("ocr_rows"), 250000));
    const parsed = browserOcr ? { rows: [] as ImportedStatRow[], warnings: [] as string[] } : await parseStatDocument(buffer, file.name, mimeType);
    const sourceRows = browserOcr ? ocrRows : parsed.rows;
    const rosterRows = roster.data ?? [];
    const matchedRows = sourceRows.map((row) => {
      const rowName = identity(row.player_name);
      const jersey = identity(row.jersey_number);
      const byName = rosterRows.filter((member: { display_name?: string; nickname?: string | null }) => [member.display_name, member.nickname].some((name) => namesMatch(name, rowName)));
      const byJersey = jersey ? rosterRows.filter((member: { jersey_number?: string | null }) => identity(member.jersey_number) === jersey) : [];
      const match = byName.length === 1 ? byName[0] : byJersey.length === 1 ? byJersey[0] : null;
      return { ...row, roster_member_id: match?.id || null, player_id: match?.player_id || null };
    });
    const unmatched = matchedRows.filter((row) => !row.roster_member_id).length;
    const warnings = Array.from(new Set([...(browserOcr ? stringList(text(form.get("ocr_warnings"), 20000)) : parsed.warnings)]));
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
    const gameMessage = createdGame ? ` ${createdGame.title || createdGame.game_title || "The detected game"} was created privately and remains unverified.` : "";
    return NextResponse.json({ ok: true, import: result.data, game: createdGame, game_id: gameId, rows: matchedRows, warnings, message: matchedRows.length ? `${matchedRows.length} player row${matchedRows.length === 1 ? "" : "s"} extracted.${gameMessage} Review every value before saving.` : `File stored as private evidence.${gameMessage} No safe structured rows were detected, so complete the review grid manually.` }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Stat sheet import failed." }, { status: 500 });
  }
}
