import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

const REVIEWABLE_STATUSES = [
  "parsed",
  "partial",
  "review_required",
  "failed",
];

const STAT_FIELDS = [
  "points",
  "rebounds",
  "offensive_rebounds",
  "defensive_rebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "fouls",
  "two_made",
  "two_attempted",
  "three_made",
  "three_attempted",
  "ft_made",
  "ft_attempted",
] as const;

function text(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function wholeNumber(value: unknown, allowNegative = false) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) return 0;

  const integer = Math.trunc(parsed);

  if (!allowNegative && integer < 0) return 0;

  return integer;
}

function decimalNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return Math.round(parsed * 100) / 100;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => text(item, 1000))
    .filter(Boolean)
    .slice(0, 50);
}

function rowObjects(value: unknown) {
  if (!Array.isArray(value)) return [] as JsonRecord[];

  return value
    .filter(
      (item): item is JsonRecord =>
        Boolean(item) &&
        typeof item === "object" &&
        !Array.isArray(item),
    )
    .slice(0, 100);
}

async function requireSuperAdmin() {
  const access = await getAdminAccess();

  return {
    ...access,
    allowed: Boolean(
      access.user &&
        access.profile &&
        isSuperAdmin(access.profile),
    ),
  };
}

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin();

  if (!access.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Super Admin access required.",
      },
      { status: 403 },
    );
  }

  try {
    const admin = createSupabaseAdminClient();

    const requestedTeamId = text(
      request.nextUrl.searchParams.get("team_id"),
      100,
    );

    let importQuery = admin
      .from("team_stat_imports")
      .select(
        [
          "id",
          "team_id",
          "game_id",
          "uploaded_by_user_id",
          "file_name",
          "storage_path",
          "mime_type",
          "file_size",
          "extraction_status",
          "extracted_rows",
          "warnings",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .in("extraction_status", REVIEWABLE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(150);

    if (requestedTeamId) {
      importQuery = importQuery.eq("team_id", requestedTeamId);
    }

    const importResult = await importQuery;

    if (importResult.error) {
      throw importResult.error;
    }

    const imports = (importResult.data ?? []) as unknown as JsonRecord[];

    if (!imports.length) {
      return NextResponse.json({
        ok: true,
        imports: [],
      });
    }

    const importIds = imports
      .map((item) => text(item.id, 100))
      .filter(Boolean);

    const gameIds = Array.from(
      new Set(
        imports
          .map((item) => text(item.game_id, 160))
          .filter(Boolean),
      ),
    );

    const sessionPromise = importIds.length
      ? admin
          .from("team_stat_sessions")
          .select(
            "id,team_id,game_id,source_import_id,status,submitted_at,reviewed_at,updated_at",
          )
          .in("source_import_id", importIds)
      : Promise.resolve({
          data: [],
          error: null,
        });

    const gamePromise = gameIds.length
      ? admin
          .from("games")
          .select(
            [
              "id",
              "title",
              "game_title",
              "game_date",
              "status",
              "home_team_id",
              "away_team_id",
              "home_team_name",
              "away_team_name",
              "home_score",
              "away_score",
              "team_score",
              "opponent_score",
              "verification_status",
              "is_public",
            ].join(","),
          )
          .in("id", gameIds)
      : Promise.resolve({
          data: [],
          error: null,
        });

    const [sessionResult, gameResult] = await Promise.all([
      sessionPromise,
      gamePromise,
    ]);

    if (sessionResult.error) {
      throw sessionResult.error;
    }

    if (gameResult.error) {
      throw gameResult.error;
    }

    const sessions = (sessionResult.data ?? []) as JsonRecord[];
    const games = (gameResult.data ?? []) as JsonRecord[];

    const sessionByImport = new Map<string, JsonRecord>();

    for (const session of sessions) {
      const sourceImportId = text(session.source_import_id, 100);

      if (!sourceImportId) continue;

      const existing = sessionByImport.get(sourceImportId);

      if (!existing) {
        sessionByImport.set(sourceImportId, session);
        continue;
      }

      const existingUpdated = new Date(
        text(existing.updated_at) || 0,
      ).getTime();

      const nextUpdated = new Date(
        text(session.updated_at) || 0,
      ).getTime();

      if (nextUpdated >= existingUpdated) {
        sessionByImport.set(sourceImportId, session);
      }
    }

    const gameById = new Map(
      games.map((game) => [
        text(game.id, 160),
        game,
      ]),
    );

    /*
     * Once an import has already reached a submitted or approved
     * stat session, it belongs in the normal governance queue rather
     * than the unresolved-import queue.
     *
     * Rejected sessions deliberately remain recoverable so Admin can
     * correct the original import instead of uploading the document again.
     */
    const reviewable = imports.filter((item) => {
      const importId = text(item.id, 100);
      const session = sessionByImport.get(importId);

      if (!session) return true;

      const status = text(session.status, 40);

      return !["submitted", "approved", "archived"].includes(status);
    });

    const output = await Promise.all(
      reviewable.map(async (item) => {
        const importId = text(item.id, 100);
        const gameId = text(item.game_id, 160);
        const storagePath = text(item.storage_path, 1000);

        const game = gameById.get(gameId) ?? null;
        const session = sessionByImport.get(importId) ?? null;

        let originalUrl: string | null = null;

        if (storagePath) {
          const signed = await admin.storage
            .from("team-stat-imports")
            .createSignedUrl(storagePath, 60 * 30);

          if (!signed.error) {
            originalUrl = signed.data.signedUrl;
          }
        }

        const extractedRows = rowObjects(item.extracted_rows);
        const warnings = stringList(item.warnings);

        const unmatchedRows = extractedRows.filter(
          (row) => !text(row.roster_member_id, 100),
        ).length;

        return {
          ...item,

          extracted_rows: extractedRows,
          warnings,

          extracted_row_count: extractedRows.length,
          unmatched_row_count: unmatchedRows,

          requires_manual_review:
            extractedRows.length === 0 ||
            unmatchedRows > 0 ||
            warnings.length > 0 ||
            text(item.extraction_status, 50) !== "parsed",

          game,
          session,

          /*
           * This URL expires automatically.
           * The Storage bucket remains private.
           */
          original_url: originalUrl,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      imports: output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Stat imports could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin();

  if (!access.allowed || !access.user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Super Admin access required.",
      },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as JsonRecord;

    const action = text(body.action, 80);

    if (action !== "save_import") {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported stat import review action.",
        },
        { status: 400 },
      );
    }

    const teamId = text(body.team_id, 100);
    const importId = text(body.import_id, 100);

    if (!teamId || !importId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Team and stat import are required.",
        },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    const currentImport = await admin
      .from("team_stat_imports")
      .select(
        "id,team_id,game_id,file_name,storage_path,extraction_status,extracted_rows,warnings",
      )
      .eq("id", importId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (currentImport.error) {
      throw currentImport.error;
    }

    if (!currentImport.data) {
      return NextResponse.json(
        {
          ok: false,
          error: "That stat import could not be found for this team.",
        },
        { status: 404 },
      );
    }

    const submittedRows = rowObjects(body.rows);
    const submittedWarnings = stringList(body.warnings);

    const rosterResult = await admin
      .from("team_roster_members")
      .select(
        "id,player_id,display_name,nickname,jersey_number,status",
      )
      .eq("team_id", teamId)
      .eq("status", "active")
      .limit(500);

    if (rosterResult.error) {
      throw rosterResult.error;
    }

    const roster = (rosterResult.data ?? []) as JsonRecord[];

    const rosterById = new Map(
      roster.map((member) => [
        text(member.id, 100),
        member,
      ]),
    );

    let invalidRosterMatches = 0;

    const correctedRows = submittedRows.map((row) => {
      const requestedRosterMemberId = text(
        row.roster_member_id,
        100,
      );

      const member = requestedRosterMemberId
        ? rosterById.get(requestedRosterMemberId)
        : null;

      if (requestedRosterMemberId && !member) {
        invalidRosterMatches += 1;
      }

      const playerName =
        text(row.player_name, 180) ||
        text(row.display_name, 180) ||
        text(member?.display_name, 180) ||
        "Player";

      const offensiveRebounds = wholeNumber(
        row.offensive_rebounds,
      );

      const defensiveRebounds = wholeNumber(
        row.defensive_rebounds,
      );

      const suppliedRebounds = wholeNumber(
        row.rebounds,
      );

      const twoMade = wholeNumber(row.two_made);
      const twoAttempted = Math.max(
        twoMade,
        wholeNumber(row.two_attempted),
      );

      const threeMade = wholeNumber(row.three_made);
      const threeAttempted = Math.max(
        threeMade,
        wholeNumber(row.three_attempted),
      );

      const ftMade = wholeNumber(row.ft_made);
      const ftAttempted = Math.max(
        ftMade,
        wholeNumber(row.ft_attempted),
      );

      const output: JsonRecord = {
        player_name: playerName,

        jersey_number:
          text(row.jersey_number, 24) ||
          text(member?.jersey_number, 24) ||
          undefined,

        roster_member_id: member
          ? text(member.id, 100)
          : null,

        player_id: member?.player_id
          ? text(member.player_id, 100)
          : null,

        points: wholeNumber(row.points),

        rebounds:
          offensiveRebounds + defensiveRebounds > 0
            ? offensiveRebounds + defensiveRebounds
            : suppliedRebounds,

        offensive_rebounds: offensiveRebounds,
        defensive_rebounds: defensiveRebounds,

        assists: wholeNumber(row.assists),
        steals: wholeNumber(row.steals),
        blocks: wholeNumber(row.blocks),
        turnovers: wholeNumber(row.turnovers),
        fouls: wholeNumber(row.fouls),

        minutes: decimalNumber(row.minutes),

        two_made: twoMade,
        two_attempted: twoAttempted,

        three_made: threeMade,
        three_attempted: threeAttempted,

        ft_made: ftMade,
        ft_attempted: ftAttempted,

        plus_minus: wholeNumber(
          row.plus_minus,
          true,
        ),
      };

      /*
       * Keep any additional harmless parser metadata so that
       * future OCR improvements do not lose source information.
       */
      if (
        row.period_values &&
        typeof row.period_values === "object" &&
        !Array.isArray(row.period_values)
      ) {
        output.period_values = row.period_values;
      }

      return output;
    });

    const unmatchedRows = correctedRows.filter(
      (row) => !text(row.roster_member_id, 100),
    ).length;

    const generatedWarnings: string[] = [];

    if (invalidRosterMatches > 0) {
      generatedWarnings.push(
        `${invalidRosterMatches} saved roster match${
          invalidRosterMatches === 1 ? " is" : "es are"
        } no longer valid and must be selected again.`,
      );
    }

    if (unmatchedRows > 0) {
      generatedWarnings.push(
        `${unmatchedRows} player row${
          unmatchedRows === 1 ? "" : "s"
        } still need an active roster match before submission.`,
      );
    }

    if (!correctedRows.length) {
      generatedWarnings.push(
        "No structured player rows are currently saved. Use the original report to add the box score manually.",
      );
    }

    const warnings = Array.from(
      new Set([
        ...submittedWarnings,
        ...generatedWarnings,
      ]),
    );

    const extractionStatus = !correctedRows.length
      ? "review_required"
      : unmatchedRows > 0 || warnings.length > 0
        ? "partial"
        : "parsed";

    const updated = await admin
      .from("team_stat_imports")
      .update({
        extracted_rows: correctedRows,
        warnings,
        extraction_status: extractionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", importId)
      .eq("team_id", teamId)
      .select(
        [
          "id",
          "team_id",
          "game_id",
          "file_name",
          "storage_path",
          "mime_type",
          "file_size",
          "extraction_status",
          "extracted_rows",
          "warnings",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .single();

    if (updated.error) {
      throw updated.error;
    }

    return NextResponse.json({
      ok: true,
      import: updated.data,
      message:
        unmatchedRows > 0
          ? `Review saved. ${unmatchedRows} player row${
              unmatchedRows === 1 ? "" : "s"
            } still need roster matching.`
          : correctedRows.length
            ? "Stat import corrections saved. This review can now survive refresh or logout."
            : "The import remains saved for manual reconstruction. The original report has not been lost.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Stat import review could not be saved.",
      },
      { status: 500 },
    );
  }
}