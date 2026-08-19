/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isSuperAdmin,
} from "@/lib/admin/permissions";

import {
  getAdminAccess,
} from "@/lib/auth/server";

import {
  createSupabaseAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type JsonRecord =
  Record<string, any>;

function text(
  value: unknown,
  max = 500,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(0, max);
}

function isUuid(
  value: unknown,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text(value, 100),
  );
}

function objectRows(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [] as JsonRecord[];
  }

  return value.filter(
    (
      item,
    ): item is JsonRecord =>
      Boolean(item) &&
      typeof item ===
        "object" &&
      !Array.isArray(
        item,
      ),
  );
}

function stringList(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [] as string[];
  }

  return value
    .map(
      (item) =>
        text(
          item,
          1000,
        ),
    )
    .filter(Boolean)
    .slice(0, 100);
}

async function requireSuperAdmin() {
  const access =
    await getAdminAccess();

  return {
    ...access,

    allowed: Boolean(
      access.user &&
        access.profile &&
        isSuperAdmin(
          access.profile,
        ),
    ),
  };
}

export async function GET(
  request: NextRequest,
) {
  const access =
    await requireSuperAdmin();

  if (
    !access.allowed
  ) {
    return NextResponse.json(
      {
        ok: false,

        error:
          "Super Admin access required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const requestedTeamId =
      text(
        request.nextUrl
          .searchParams
          .get(
            "team_id",
          ),
        100,
      );

    const admin =
      createSupabaseAdminClient();

    /*
     * Some of the canonical basketball tables
     * are newer than the generated Supabase
     * typings in this repo.
     */
    const db =
      admin as any;

    /*
     * IMPORTANT:
     *
     * We deliberately do NOT filter by
     * extraction_status or session status.
     *
     * Admin must be able to inspect successful,
     * approved, partial and failed imports.
     */
    let importQuery =
      db
        .from(
          "team_stat_imports",
        )
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
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(120);

    if (
      requestedTeamId
    ) {
      importQuery =
        importQuery.eq(
          "team_id",
          requestedTeamId,
        );
    }

    const importResult =
      await importQuery;

    if (
      importResult.error
    ) {
      throw importResult.error;
    }

    const imports =
      (importResult.data ??
        []) as JsonRecord[];

    if (
      !imports.length
    ) {
      return NextResponse.json({
        ok: true,

        imports: [],
      });
    }

    const importIds =
      imports
        .map(
          (item) =>
            text(
              item.id,
              100,
            ),
        )
        .filter(Boolean);

    const teamIds =
      Array.from(
        new Set(
          imports
            .map(
              (item) =>
                text(
                  item.team_id,
                  100,
                ),
            )
            .filter(Boolean),
        ),
      );

    /*
     * games.id is UUID.
     * Ignore legacy non-UUID portal references
     * instead of allowing one old record to break
     * the whole Admin page.
     */
    const gameIds =
      Array.from(
        new Set(
          imports
            .map(
              (item) =>
                text(
                  item.game_id,
                  100,
                ),
            )
            .filter(
              (value) =>
                isUuid(
                  value,
                ),
            ),
        ),
      );

    const sessionPromise =
      importIds.length
        ? db
            .from(
              "team_stat_sessions",
            )
            .select(
              [
                "id",
                "team_id",
                "game_id",
                "source_import_id",
                "status",
                "mode",
                "submitted_at",
                "reviewed_at",
                "created_at",
                "updated_at",
              ].join(
                ",",
              ),
            )
            .in(
              "source_import_id",
              importIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          });

    const gamePromise =
      gameIds.length
        ? db
            .from(
              "games",
            )
            .select(
              [
                "id",
                "title",
                "game_title",
                "game_date",
                "date",
                "status",
                "home_team_id",
                "away_team_id",
                "home_team_name",
                "away_team_name",
                "home_score",
                "away_score",
                "team_score",
                "opponent_score",
                "game_format",
                "match_type",
                "league_id",
                "season_label",
                "division",
                "competition_name",
                "venue",
                "officials",
                "verification_status",
                "is_public",
              ].join(
                ",",
              ),
            )
            .in(
              "id",
              gameIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          });

    const teamPromise =
      teamIds.length
        ? db
            .from(
              "team_profiles",
            )
            .select(
              "id,name,short_name,slug",
            )
            .in(
              "id",
              teamIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          });

    /*
     * This is the most useful debugging check.
     *
     * It tells Admin whether the uploaded report
     * actually reached the canonical game box score.
     */
    const canonicalPromise =
      importIds.length
        ? db
            .from(
              "game_box_score_lines",
            )
            .select(
              [
                "id",
                "game_id",
                "team_side",
                "team_name",
                "team_id",
                "roster_member_id",
                "player_id",
                "identity_type",
                "display_name",
                "jersey_number",
                "points",
                "verification_status",
                "is_public",
                "source_import_id",
              ].join(
                ",",
              ),
            )
            .in(
              "source_import_id",
              importIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          });

    const [
      sessionResult,
      gameResult,
      teamResult,
      canonicalResult,
    ] =
      await Promise.all([
        sessionPromise,
        gamePromise,
        teamPromise,
        canonicalPromise,
      ]);

    for (
      const result of [
        sessionResult,
        gameResult,
        teamResult,
        canonicalResult,
      ]
    ) {
      if (
        result.error
      ) {
        throw result.error;
      }
    }

    const sessions =
      (sessionResult.data ??
        []) as JsonRecord[];

    const games =
      (gameResult.data ??
        []) as JsonRecord[];

    const teams =
      (teamResult.data ??
        []) as JsonRecord[];

    const canonicalLines =
      (canonicalResult.data ??
        []) as JsonRecord[];

    const gameById =
      new Map(
        games.map(
          (game) => [
            text(
              game.id,
              100,
            ),
            game,
          ],
        ),
      );

    const teamById =
      new Map(
        teams.map(
          (team) => [
            text(
              team.id,
              100,
            ),
            team,
          ],
        ),
      );

    /*
     * An import can theoretically have more
     * than one historical stat session.
     *
     * Keep the most recently updated one.
     */
    const sessionByImport =
      new Map<
        string,
        JsonRecord
      >();

    for (
      const session of
      sessions
    ) {
      const importId =
        text(
          session.source_import_id,
          100,
        );

      if (
        !importId
      ) {
        continue;
      }

      const existing =
        sessionByImport.get(
          importId,
        );

      if (
        !existing
      ) {
        sessionByImport.set(
          importId,
          session,
        );

        continue;
      }

      const existingTime =
        new Date(
          text(
            existing.updated_at,
          ) || 0,
        ).getTime();

      const nextTime =
        new Date(
          text(
            session.updated_at,
          ) || 0,
        ).getTime();

      if (
        nextTime >=
        existingTime
      ) {
        sessionByImport.set(
          importId,
          session,
        );
      }
    }

    const linesByImport =
      new Map<
        string,
        JsonRecord[]
      >();

    for (
      const line of
      canonicalLines
    ) {
      const importId =
        text(
          line.source_import_id,
          100,
        );

      if (
        !importId
      ) {
        continue;
      }

      const existing =
        linesByImport.get(
          importId,
        ) || [];

      existing.push(
        line,
      );

      linesByImport.set(
        importId,
        existing,
      );
    }

    const output =
      await Promise.all(
        imports.map(
          async (
            item,
          ) => {
            const importId =
              text(
                item.id,
                100,
              );

            const gameId =
              text(
                item.game_id,
                100,
              );

            const teamId =
              text(
                item.team_id,
                100,
              );

            const extractedRows =
              objectRows(
                item.extracted_rows,
              );

            const warnings =
              stringList(
                item.warnings,
              );

            const unmatchedRows =
              extractedRows.filter(
                (row) =>
                  !text(
                    row.roster_member_id,
                    100,
                  ),
              ).length;

            const game =
              gameById.get(
                gameId,
              ) || null;

            const team =
              teamById.get(
                teamId,
              ) || null;

            const session =
              sessionByImport.get(
                importId,
              ) || null;

            const lines =
              linesByImport.get(
                importId,
              ) || [];

            const verifiedLines =
              lines.filter(
                (line) =>
                  line.verification_status ===
                    "verified" &&
                  line.is_public ===
                    true,
              ).length;

            let originalUrl:
              | string
              | null =
              null;

            const storagePath =
              text(
                item.storage_path,
                1000,
              );

            if (
              storagePath
            ) {
              const signed =
                await admin.storage
                  .from(
                    "team-stat-imports",
                  )
                  .createSignedUrl(
                    storagePath,
                    60 *
                      30,
                  );

              if (
                !signed.error
              ) {
                originalUrl =
                  signed.data
                    .signedUrl;
              }
            }

            const gameIsLive =
              Boolean(
                game &&
                  game.verification_status ===
                    "verified" &&
                  game.is_public ===
                    true,
              );

            const boxScoreIsLive =
              lines.length >
                0 &&
              verifiedLines ===
                lines.length;

            return {
              ...item,

              extracted_rows:
                extractedRows,

              warnings,

              extracted_row_count:
                extractedRows.length,

              unmatched_row_count:
                unmatchedRows,

              team,

              game,

              session,

              original_url:
                originalUrl,

              canonical_line_count:
                lines.length,

              canonical_verified_line_count:
                verifiedLines,

              game_is_live:
                gameIsLive,

              box_score_is_live:
                boxScoreIsLive,

              saved_directly:
                gameIsLive &&
                boxScoreIsLive,

              /*
               * This is information for Admin,
               * not an approval gate.
               */
              needs_attention:
                !game ||
                !lines.length ||
                warnings.length >
                  0,
            };
          },
        ),
      );

    return NextResponse.json({
      ok: true,

      imports:
        output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Recent team stat imports could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}