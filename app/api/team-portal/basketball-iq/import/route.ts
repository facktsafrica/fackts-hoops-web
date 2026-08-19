/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { parseStatDocument } from "@/lib/basketball-iq/documentImport";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireTeamCapability } from "@/lib/team-portal/access";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

const EXTENSIONS = new Set([
  "csv",
  "tsv",
  "txt",
  "xlsx",
  "xls",
  "pdf",
  "docx",
  "doc",
]);

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

type TeamSide = "home" | "away";

type NormalizedStatRow = {
  player_name: string;
  jersey_number?: string;
  points: number;
  rebounds: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes: number;
  two_made: number;
  two_attempted: number;
  three_made: number;
  three_attempted: number;
  ft_made: number;
  ft_attempted: number;
  plus_minus: number;
};

function text(value: FormDataEntryValue | null, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function recordText(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function safeFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-120) || "stat-sheet"
  );
}

function identity(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

function integer(value: unknown, allowNegative = false) {
  const parsed = Number(value ?? 0);

  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    (!allowNegative && parsed < 0)
  ) {
    return 0;
  }

  return parsed;
}

function decimal(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeRow(
  source: Record<string, unknown>,
): NormalizedStatRow | null {
  const playerName = recordText(source.player_name, 180);

  if (!playerName || /^(total|team)$/i.test(playerName)) {
    return null;
  }

  const twoMade = integer(source.two_made);
  const threeMade = integer(source.three_made);
  const ftMade = integer(source.ft_made);
  const offensiveRebounds = integer(source.offensive_rebounds);
  const defensiveRebounds = integer(source.defensive_rebounds);

  return {
    player_name: playerName,
    jersey_number: recordText(source.jersey_number, 24) || undefined,
    points:
      integer(source.points) ||
      twoMade * 2 + threeMade * 3 + ftMade,
    rebounds:
      offensiveRebounds + defensiveRebounds || integer(source.rebounds),
    offensive_rebounds: offensiveRebounds,
    defensive_rebounds: defensiveRebounds,
    assists: integer(source.assists),
    steals: integer(source.steals),
    blocks: integer(source.blocks),
    turnovers: integer(source.turnovers),
    fouls: integer(source.fouls),
    minutes: decimal(source.minutes),
    two_made: twoMade,
    two_attempted: Math.max(twoMade, integer(source.two_attempted)),
    three_made: threeMade,
    three_attempted: Math.max(threeMade, integer(source.three_attempted)),
    ft_made: ftMade,
    ft_attempted: Math.max(ftMade, integer(source.ft_attempted)),
    plus_minus: integer(source.plus_minus, true),
  };
}

function clientRows(value: string, label = "browser rows") {
  if (!value) {
    return [] as NormalizedStatRow[];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`The ${label} were not valid JSON.`);
  }

  if (!Array.isArray(parsed) || parsed.length > 100) {
    throw new Error(`The ${label} can contain no more than 100 player rows.`);
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const row = normalizeRow(item as Record<string, unknown>);
    return row ? [row] : [];
  });
}

function normalizeParsedRows(rows: unknown[]) {
  return rows.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const row = normalizeRow(item as Record<string, unknown>);
    return row ? [row] : [];
  });
}

function stringList(value: string) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed
          .map((item) => recordText(item, 500))
          .filter(Boolean),
      ),
    ).slice(0, 30);
  } catch {
    return [];
  }
}

function jsonArray(value: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function jsonObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, any>) };
}

function distance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];

      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );

      diagonal = previous;
    }
  }

  return row[right.length];
}

function nameTokenKey(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join("");
}

function namesMatch(left: unknown, right: unknown) {
  const first = identity(left);
  const second = identity(right);
  const firstTokens = nameTokenKey(left);
  const secondTokens = nameTokenKey(right);

  return Boolean(
    first &&
      second &&
      (
        first === second ||
        (firstTokens && firstTokens === secondTokens) ||
        first.includes(second) ||
        second.includes(first) ||
        distance(first, second) <= 2
      ),
  );
}

function matchRosterMember(row: NormalizedStatRow, rosterRows: any[]) {
  const jersey = identity(row.jersey_number);

  const byName = rosterRows.filter(
    (member: {
      display_name?: string;
      nickname?: string | null;
    }) =>
      [member.display_name, member.nickname].some((name) =>
        namesMatch(name, row.player_name),
      ),
  );

  const byJersey = jersey
    ? rosterRows.filter(
        (member: { jersey_number?: string | null }) =>
          identity(member.jersey_number) === jersey,
      )
    : [];

  const byBoth = jersey
    ? byName.filter(
        (member: { jersey_number?: string | null }) =>
          identity(member.jersey_number) === jersey,
      )
    : [];

  if (byBoth.length === 1) {
    return byBoth[0];
  }

  if (byName.length === 1) {
    return byName[0];
  }

  if (byJersey.length === 1) {
    return byJersey[0];
  }

  return null;
}

function sourceKeyPart(value: unknown, fallback: string) {
  return (identity(value) || fallback).slice(0, 80);
}

function validScore(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function optionalGameFormat(value: string) {
  const normalized = value.toLowerCase();
  return new Set(["1v1", "2v2", "3v3", "4v4", "5v5"]).has(normalized)
    ? normalized
    : "";
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestedTeamId = text(form.get("team_id"), 100) || null;
    let gameId = text(form.get("game_id"), 160);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Choose an Excel, CSV, PDF or Word stat sheet." },
        { status: 400 },
      );
    }

    const extension = file.name.toLowerCase().split(".").pop() || "";
    const mimeType =
      file.type && file.type !== "application/octet-stream"
        ? file.type
        : MIME_BY_EXTENSION[extension] || "text/plain";

    if (
      !EXTENSIONS.has(extension) ||
      file.size <= 0 ||
      file.size > MAX_BYTES
    ) {
      return NextResponse.json(
        { ok: false, error: "Use CSV, Excel, PDF, TXT or Word up to 15 MB." },
        { status: 400 },
      );
    }

    if (gameId && !/^[a-z0-9-]{1,160}$/i.test(gameId)) {
      return NextResponse.json(
        { ok: false, error: "The selected game reference is invalid." },
        { status: 400 },
      );
    }

    const access = await requireTeamCapability("stats_submit", requestedTeamId);

    if (!access.user) {
      return NextResponse.json(
        { ok: false, error: "Team login required." },
        { status: 401 },
      );
    }

    if (!access.permitted || !access.membership) {
      return NextResponse.json(
        { ok: false, error: "Statistics access is not active for this account." },
        { status: 403 },
      );
    }
    const userId = access.user.id;


    const admin = createSupabaseAdminClient();
    const db = admin as any;
    const teamId = access.membership.team_id;

    const [roster, teamProfile] = await Promise.all([
      db
        .from("team_roster_members")
        .select("id,player_id,display_name,nickname,jersey_number,position")
        .eq("team_id", teamId)
        .eq("status", "active")
        .limit(500),
      db
        .from("team_profiles")
        .select("id,name,short_name")
        .eq("id", teamId)
        .maybeSingle(),
    ]);

    for (const result of [roster, teamProfile]) {
      if (result.error) {
        throw result.error;
      }
    }

    if (!teamProfile.data) {
      return NextResponse.json(
        { ok: false, error: "The registered team profile could not be found." },
        { status: 404 },
      );
    }

    const rosterRows = roster.data ?? [];
    const buffer = Buffer.from(await file.arrayBuffer());
    const browserOcr = text(form.get("browser_ocr"), 10) === "true";

    const ocrRows = clientRows(
      text(form.get("ocr_rows"), 250000),
      "selected-team browser rows",
    );

    const homeRows = clientRows(
      text(form.get("ocr_home_rows"), 250000),
      "home-team browser rows",
    );

    const awayRows = clientRows(
      text(form.get("ocr_away_rows"), 250000),
      "away-team browser rows",
    );

    const officials = stringList(
      text(form.get("ocr_officials"), 20000),
    ).filter((item) => !/^none$/i.test(item));

    const periodScores = jsonArray(
      text(form.get("period_scores"), 5000),
    );

    const parsed = browserOcr
      ? { rows: [], warnings: [] as string[] }
      : await parseStatDocument(buffer, file.name, mimeType);

    const parsedRows = browserOcr
      ? []
      : normalizeParsedRows(parsed.rows as unknown[]);

    let formTeamSide: TeamSide | null = null;
    const submittedSide = text(form.get("team_side"), 10);

    if (submittedSide === "home" || submittedSide === "away") {
      formTeamSide = submittedSide;
    }

    const selectedRows = browserOcr
      ? ocrRows.length
        ? ocrRows
        : formTeamSide === "away"
          ? awayRows
          : homeRows
      : parsedRows;

    const matchedRows = selectedRows.map((row) => {
      const match = matchRosterMember(row, rosterRows);

      return {
        ...row,
        roster_member_id: match?.id || null,
        player_id: match?.player_id || null,
      };
    });

    const matchedRosterCount = matchedRows.filter(
      (row) => row.roster_member_id,
    ).length;

    const warnings = Array.from(
      new Set([
        ...(browserOcr
          ? stringList(text(form.get("ocr_warnings"), 20000))
          : parsed.warnings),
      ]),
    );

    const unmatched = matchedRows.length - matchedRosterCount;

    if (unmatched > 0) {
      warnings.push(
        `${unmatched} imported player row${unmatched === 1 ? "" : "s"} did not match the current roster. They will still be saved in this game as game-only identities and can be linked later.`,
      );
    }

    const homeName = text(form.get("home_team_name"), 180);
    const awayName = text(form.get("away_team_name"), 180);
    const gameDate = text(form.get("game_date"), 10);
    const suppliedHomeScore = text(form.get("home_score"), 8);
    const suppliedAwayScore = text(form.get("away_score"), 8);
    const homeScore = suppliedHomeScore === "" ? null : Number(suppliedHomeScore);
    const awayScore = suppliedAwayScore === "" ? null : Number(suppliedAwayScore);
    const requestedGameFormat = optionalGameFormat(
      text(form.get("game_format"), 20),
    );
    const leagueName = text(form.get("league_name"), 180);
    const seasonLabel = text(form.get("season_label"), 100);
    const division = text(form.get("division"), 100);
    const venue = text(form.get("venue"), 180);
    const gameTime = text(form.get("game_time"), 8);

    let createdGame: Record<string, any> | null = null;

    if (gameId) {
      const [canonical, attached] = await Promise.all([
        db
          .from("games")
          .select(
            "id,home_team_id,away_team_id,title,game_title,home_team_name,away_team_name,home_score,away_score,verification_status,is_public",
          )
          .eq("id", gameId)
          .maybeSingle(),
        db
          .from("team_games")
          .select("id,game_id")
          .eq("team_id", teamId)
          .or(`id.eq.${gameId},game_id.eq.${gameId}`)
          .limit(1)
          .maybeSingle(),
      ]);

      for (const result of [canonical, attached]) {
        if (result.error) {
          throw result.error;
        }
      }

      const canonicalOwned =
        canonical.data &&
        [canonical.data.home_team_id, canonical.data.away_team_id].includes(
          teamId,
        );

      if (!canonicalOwned && !attached.data) {
        return NextResponse.json(
          { ok: false, error: "That game is not assigned to this team." },
          { status: 403 },
        );
      }

      if (!canonical.data && attached.data?.game_id) {
        gameId = attached.data.game_id;
      }
    } else {
      if (text(form.get("create_game"), 10) !== "true") {
        return NextResponse.json(
          {
            ok: false,
            error: "Confirm the match detected in the report, or choose an existing game.",
          },
          { status: 400 },
        );
      }

      if (
        !homeName ||
        !awayName ||
        !/^20\d{2}-\d{2}-\d{2}$/.test(gameDate) ||
        homeScore === null ||
        awayScore === null ||
        !validScore(homeScore) ||
        !validScore(awayScore) ||
        homeScore === awayScore
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Confirm both competitors, the game date and valid final scores before approving this game.",
          },
          { status: 400 },
        );
      }

      const teamSide: TeamSide = formTeamSide === "away" ? "away" : "home";
      formTeamSide = teamSide;

      const teamName = teamProfile.data.name;
      const detectedTeamName = teamSide === "home" ? homeName : awayName;
      const teamNameMatches =
        namesMatch(teamName, detectedTeamName) ||
        namesMatch(teamProfile.data.short_name, detectedTeamName);

      if (!teamNameMatches && matchedRosterCount === 0) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "This report does not appear to contain this team or any active roster player. Check the team side before approving it.",
          },
          { status: 409 },
        );
      }

      const sideColumn = teamSide === "home" ? "home_team_id" : "away_team_id";

      let existingQuery = db
        .from("games")
        .select(
          "id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public",
        )
        .eq("game_date", gameDate)
        .eq("home_score", homeScore)
        .eq("away_score", awayScore);

      if (teamNameMatches) {
        existingQuery = existingQuery.eq(sideColumn, teamId);
      }

      const existing = await existingQuery.limit(1).maybeSingle();

      if (existing.error) {
        throw existing.error;
      }

      if (existing.data) {
        gameId = existing.data.id;
        createdGame = existing.data;
      } else {
        const opponentName = teamSide === "home" ? awayName : homeName;
        const teamScore = teamSide === "home" ? homeScore : awayScore;
        const opponentScore = teamSide === "home" ? awayScore : homeScore;
        const dateValue =
          /^\d{2}:\d{2}$/.test(gameTime)
            ? `${gameDate}T${gameTime}:00+03:00`
            : `${gameDate}T12:00:00+03:00`;

        const insertPayload: Record<string, any> = {
          team_name: teamName,
          opponent: opponentName,
          game_date: gameDate,
          match_type: "team_report",
          notes:
            "Approved by the team from an official stat report. Admin may edit corrections at any time.",
          team_score: teamScore,
          opponent_score: opponentScore,
          is_upcoming: false,
          preview_is_active: false,
          game_title: `${homeName} vs ${awayName}`,
          title: `${homeName} vs ${awayName}`,
          opponent_name: opponentName,
          date: dateValue,
          status: "completed",
          home_score: homeScore,
          away_score: awayScore,
          home_team_name: homeName,
          away_team_name: awayName,
          period_scores: periodScores,
          verification_status: "verified",
          is_public: true,
          home_team_id:
            teamNameMatches && teamSide === "home" ? teamId : null,
          away_team_id:
            teamNameMatches && teamSide === "away" ? teamId : null,
          ...(requestedGameFormat ? { game_format: requestedGameFormat } : {}),
          ...(leagueName ? { competition_name: leagueName } : {}),
          ...(seasonLabel ? { season_label: seasonLabel } : {}),
          ...(division ? { division } : {}),
          ...(venue ? { venue } : {}),
          ...(officials.length ? { officials: officials.join(", ") } : {}),
        };

        const created = await db
          .from("games")
          .insert(insertPayload)
          .select(
            "id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public",
          )
          .single();

        if (created.error) {
          throw created.error;
        }

        gameId = created.data.id;
        createdGame = created.data;
      }
    }

    if (!gameId) {
      throw new Error("The canonical game could not be resolved.");
    }

    const gameResult = await db
      .from("games")
      .select(
        "id,title,game_title,game_date,home_team_name,away_team_name,home_team_id,away_team_id,home_score,away_score,verification_status,is_public,officials,period_scores,report_metadata",
      )
      .eq("id", gameId)
      .maybeSingle();

    if (gameResult.error) {
      throw gameResult.error;
    }

    if (!gameResult.data) {
      throw new Error("The canonical game could not be loaded after approval.");
    }

    const canonicalGame = gameResult.data;

    let teamSide: TeamSide | null = formTeamSide;

    if (canonicalGame.home_team_id === teamId) {
      teamSide = "home";
    } else if (canonicalGame.away_team_id === teamId) {
      teamSide = "away";
    }

    if (!teamSide) {
      teamSide = formTeamSide || "home";
    }

    const effectiveHomeRows =
      homeRows.length > 0
        ? homeRows
        : teamSide === "home"
          ? selectedRows
          : [];

    const effectiveAwayRows =
      awayRows.length > 0
        ? awayRows
        : teamSide === "away"
          ? selectedRows
          : [];

    const objectPath = `${teamId}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safeFilename(
      file.name,
    )}`;

    const uploaded = await admin.storage
      .from("team-stat-imports")
      .upload(objectPath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploaded.error) {
      throw uploaded.error;
    }

    const importResult = await db
      .from("team_stat_imports")
      .insert({
        team_id: teamId,
        game_id: gameId,
        uploaded_by_user_id: userId,
        file_name: file.name.slice(0, 300),
        storage_path: objectPath,
        mime_type: mimeType,
        file_size: file.size,
        extraction_status: matchedRows.length
          ? warnings.length
            ? "partial"
            : "parsed"
          : "review_required",
        extracted_rows: matchedRows,
        warnings,
      })
      .select(
        "id,game_id,file_name,mime_type,file_size,extraction_status,warnings,created_at",
      )
      .single();

    if (importResult.error) {
      throw importResult.error;
    }

    const importId = importResult.data.id;
    const canonicalLines: any[] = [];

    const sides: Array<{
      side: TeamSide;
      rows: NormalizedStatRow[];
      teamName: string;
      gameTeamId: string | null;
    }> = [
      {
        side: "home",
        rows: effectiveHomeRows,
        teamName:
          recordText(canonicalGame.home_team_name, 180) ||
          homeName ||
          "Home",
        gameTeamId: canonicalGame.home_team_id || null,
      },
      {
        side: "away",
        rows: effectiveAwayRows,
        teamName:
          recordText(canonicalGame.away_team_name, 180) ||
          awayName ||
          "Away",
        gameTeamId: canonicalGame.away_team_id || null,
      },
    ];

    for (const sideInfo of sides) {
      const isSubmittingSide = sideInfo.side === teamSide;

      sideInfo.rows.forEach((row, index) => {
        const rosterMember = isSubmittingSide
          ? matchRosterMember(row, rosterRows)
          : null;

        const playerId = rosterMember?.player_id || null;
        const identityType = rosterMember
          ? playerId
            ? "canonical_player"
            : "team_roster"
          : "game_only";

        const rowTeamId = isSubmittingSide
          ? sideInfo.gameTeamId || teamId
          : sideInfo.gameTeamId;

        const sourceLineKey = rosterMember
          ? `team:${teamId}:roster:${rosterMember.id}`
          : `report:${teamId}:${sideInfo.side}:${sourceKeyPart(
              row.player_name,
              `player${index + 1}`,
            )}:${sourceKeyPart(
              row.jersey_number,
              String(index + 1),
            )}`;

        canonicalLines.push({
          game_id: gameId,
          team_side: sideInfo.side,
          team_name: sideInfo.teamName,
          team_id: rowTeamId,
          roster_member_id: rosterMember?.id || null,
          player_id: playerId,
          identity_type: identityType,
          display_name: row.player_name,
          jersey_number: row.jersey_number || null,
          position: rosterMember?.position || null,
          minutes: row.minutes,
          points: row.points,
          two_made: row.two_made,
          two_attempted: row.two_attempted,
          three_made: row.three_made,
          three_attempted: row.three_attempted,
          ft_made: row.ft_made,
          ft_attempted: row.ft_attempted,
          offensive_rebounds: row.offensive_rebounds,
          defensive_rebounds: row.defensive_rebounds,
          rebounds: row.rebounds,
          assists: row.assists,
          turnovers: row.turnovers,
          steals: row.steals,
          blocks: row.blocks,
          fouls: row.fouls,
          plus_minus: row.plus_minus,
          period_values: {},
          extra_stats: {},
          source_line_key: sourceLineKey,
          source_type: "team_import",
          source_import_id: importId,
          source_session_id: null,
          source_submission_id: null,
          verification_status: "verified",
          is_public: true,
          verified_at: new Date().toISOString(),
          verified_by: userId,
        });
      });
    }

    if (!canonicalLines.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The report was stored, but no usable player rows were found. Check the preview before approving this game.",
        },
        { status: 400 },
      );
    }

    const canonicalWrite = await db
      .from("game_box_score_lines")
      .upsert(canonicalLines, {
        onConflict: "game_id,source_line_key",
      });

    if (canonicalWrite.error) {
      throw canonicalWrite.error;
    }

    const now = new Date().toISOString();
    const submittingCanonicalRows = canonicalLines.filter(
      (line) => line.team_side === teamSide && line.roster_member_id,
    );

    let intelligenceSessionId: string | null = null;

    if (submittingCanonicalRows.length) {
      const existingSession = await db
        .from("team_stat_sessions")
        .select("id")
        .eq("team_id", teamId)
        .eq("game_id", gameId)
        .eq("mode", "import")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession.error) {
        throw existingSession.error;
      }

      if (existingSession.data?.id) {
        intelligenceSessionId = existingSession.data.id;

        const sessionUpdate = await db
          .from("team_stat_sessions")
          .update({
            status: "approved",
            current_period: "Q4",
            source_import_id: importId,
            source_submission_id: null,
            submitted_at: now,
            reviewed_at: now,
            updated_at: now,
          })
          .eq("id", intelligenceSessionId)
          .eq("team_id", teamId);

        if (sessionUpdate.error) {
          throw sessionUpdate.error;
        }

        const clearOldLines = await db
          .from("team_player_stat_lines")
          .delete()
          .eq("session_id", intelligenceSessionId);

        if (clearOldLines.error) {
          throw clearOldLines.error;
        }
      } else {
        const sessionInsert = await db
          .from("team_stat_sessions")
          .insert({
            team_id: teamId,
            game_id: gameId,
            created_by_user_id: userId,
            mode: "import",
            status: "approved",
            current_period: "Q4",
            source_import_id: importId,
            source_submission_id: null,
            submitted_at: now,
            reviewed_at: now,
            updated_at: now,
          })
          .select("id")
          .single();

        if (sessionInsert.error) {
          throw sessionInsert.error;
        }

        intelligenceSessionId = sessionInsert.data.id;
      }

      const intelligenceLines = submittingCanonicalRows.map((line) => ({
        session_id: intelligenceSessionId,
        team_id: teamId,
        game_id: gameId,
        roster_member_id: line.roster_member_id,
        player_id: line.player_id,
        display_name: line.display_name,
        points: line.points,
        rebounds: line.rebounds,
        offensive_rebounds: line.offensive_rebounds,
        defensive_rebounds: line.defensive_rebounds,
        assists: line.assists,
        steals: line.steals,
        blocks: line.blocks,
        turnovers: line.turnovers,
        fouls: line.fouls,
        minutes: line.minutes,
        two_made: line.two_made,
        two_attempted: line.two_attempted,
        three_made: line.three_made,
        three_attempted: line.three_attempted,
        ft_made: line.ft_made,
        ft_attempted: line.ft_attempted,
        plus_minus: line.plus_minus,
        period_values: {},
        status: "approved",
        updated_at: now,
      }));

      const intelligenceWrite = await db
        .from("team_player_stat_lines")
        .insert(intelligenceLines);

      if (intelligenceWrite.error) {
        throw intelligenceWrite.error;
      }
    }

    const existingMetadata = jsonObject(canonicalGame.report_metadata);
    const existingHistory = Array.isArray(existingMetadata.team_report_imports)
      ? existingMetadata.team_report_imports
      : [];

    const reportMetadata = {
      ...existingMetadata,
      last_team_report_import_id: importId,
      last_team_report_team_id: teamId,
      approved_by_team_user_id: userId,
      approved_at: now,
      detected_officials: officials,
      detected_home_rows: effectiveHomeRows.length,
      detected_away_rows: effectiveAwayRows.length,
      team_report_imports: [
        ...existingHistory.slice(-9),
        {
          import_id: importId,
          team_id: teamId,
          captured_at: now,
          approved_at: now,
          home_rows: effectiveHomeRows.length,
          away_rows: effectiveAwayRows.length,
          officials,
        },
      ],
    };

    const gameUpdate: Record<string, any> = {
      verification_status: "verified",
      is_public: true,
      report_metadata: reportMetadata,
      ...(officials.length ? { officials: officials.join(", ") } : {}),
      ...(periodScores.length ? { period_scores: periodScores } : {}),
      ...(leagueName ? { competition_name: leagueName } : {}),
      ...(seasonLabel ? { season_label: seasonLabel } : {}),
      ...(division ? { division } : {}),
      ...(venue ? { venue } : {}),
      ...(requestedGameFormat ? { game_format: requestedGameFormat } : {}),
    };

    if (
      homeName &&
      awayName &&
      homeScore !== null &&
      awayScore !== null &&
      validScore(homeScore) &&
      validScore(awayScore)
    ) {
      gameUpdate.home_team_name = homeName;
      gameUpdate.away_team_name = awayName;
      gameUpdate.home_score = homeScore;
      gameUpdate.away_score = awayScore;
      gameUpdate.title = `${homeName} vs ${awayName}`;
      gameUpdate.game_title = `${homeName} vs ${awayName}`;

      if (teamSide === "home") {
        gameUpdate.team_score = homeScore;
        gameUpdate.opponent_score = awayScore;
      } else {
        gameUpdate.team_score = awayScore;
        gameUpdate.opponent_score = homeScore;
      }
    }

    const updatedGame = await db
      .from("games")
      .update(gameUpdate)
      .eq("id", gameId)
      .select(
        "id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public",
      )
      .single();

    if (updatedGame.error) {
      throw updatedGame.error;
    }

    return NextResponse.json(
      {
        ok: true,
        approved: true,
        import: importResult.data,
        game: updatedGame.data,
        game_id: gameId,
        rows: matchedRows,
        warnings,
        complete_report: {
          home_rows: effectiveHomeRows.length,
          away_rows: effectiveAwayRows.length,
          officials,
          canonical_rows_written: canonicalLines.length,
          roster_rows_linked: matchedRosterCount,
          intelligence_session_id: intelligenceSessionId,
        },
        message: `${
          updatedGame.data?.title ||
          updatedGame.data?.game_title ||
          "Game"
        } approved and saved. ${canonicalLines.length} player stat row${
          canonicalLines.length === 1 ? "" : "s"
        } are now in FACKTS. Admin can edit the game later if anything needs correction.`,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error) || "Stat sheet import failed.",
      },
      { status: 500 },
    );
  }
}

