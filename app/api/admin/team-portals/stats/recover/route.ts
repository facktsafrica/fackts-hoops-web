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

type TeamSide =
  | "home"
  | "away";

type RecoveryRow = {
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

async function superAdminAccess() {
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

function text(
  value: unknown,
  max = 500,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(
      0,
      max,
    );
}

function identity(
  value: unknown,
) {
  return String(
    value || "",
  )
    .toLowerCase()
    .normalize(
      "NFKD",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function whole(
  value: unknown,
  allowNegative = false,
) {
  const parsed =
    Number(
      value ?? 0,
    );

  if (
    !Number.isFinite(
      parsed,
    ) ||
    !Number.isInteger(
      parsed,
    ) ||
    (!allowNegative &&
      parsed < 0)
  ) {
    return 0;
  }

  return parsed;
}

function decimal(
  value: unknown,
) {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  ) &&
    parsed >= 0
    ? parsed
    : 0;
}

function normalizeRows(
  value: unknown,
): RecoveryRow[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .slice(
      0,
      100,
    )
    .flatMap(
      (
        item,
      ) => {
        if (
          !item ||
          typeof item !==
            "object" ||
          Array.isArray(
            item,
          )
        ) {
          return [];
        }

        const row =
          item as JsonRecord;

        const playerName =
          text(
            row.player_name,
            180,
          );

        if (
          !playerName ||
          /^(total|team)$/i.test(
            playerName,
          )
        ) {
          return [];
        }

        const twoMade =
          whole(
            row.two_made,
          );

        const threeMade =
          whole(
            row.three_made,
          );

        const ftMade =
          whole(
            row.ft_made,
          );

        const offensiveRebounds =
          whole(
            row.offensive_rebounds,
          );

        const defensiveRebounds =
          whole(
            row.defensive_rebounds,
          );

        return [
          {
            player_name:
              playerName,

            jersey_number:
              text(
                row.jersey_number,
                24,
              ) ||
              undefined,

            points:
              whole(
                row.points,
              ) ||
              twoMade * 2 +
                threeMade * 3 +
                ftMade,

            rebounds:
              offensiveRebounds +
                defensiveRebounds ||
              whole(
                row.rebounds,
              ),

            offensive_rebounds:
              offensiveRebounds,

            defensive_rebounds:
              defensiveRebounds,

            assists:
              whole(
                row.assists,
              ),

            steals:
              whole(
                row.steals,
              ),

            blocks:
              whole(
                row.blocks,
              ),

            turnovers:
              whole(
                row.turnovers,
              ),

            fouls:
              whole(
                row.fouls,
              ),

            minutes:
              decimal(
                row.minutes,
              ),

            two_made:
              twoMade,

            two_attempted:
              Math.max(
                twoMade,
                whole(
                  row.two_attempted,
                ),
              ),

            three_made:
              threeMade,

            three_attempted:
              Math.max(
                threeMade,
                whole(
                  row.three_attempted,
                ),
              ),

            ft_made:
              ftMade,

            ft_attempted:
              Math.max(
                ftMade,
                whole(
                  row.ft_attempted,
                ),
              ),

            plus_minus:
              whole(
                row.plus_minus,
                true,
              ),
          },
        ];
      },
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

  return Array.from(
    new Set(
      value
        .map(
          (
            item,
          ) =>
            text(
              item,
              200,
            ),
        )
        .filter(
          (
            item,
          ) =>
            item &&
            !/^none$/i.test(
              item,
            ),
        ),
    ),
  ).slice(
    0,
    20,
  );
}

function jsonObject(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return {};
  }

  return {
    ...(value as JsonRecord),
  };
}

function sourceKeyPart(
  value: unknown,
  fallback: string,
) {
  return (
    identity(
      value,
    ) ||
    fallback
  ).slice(
    0,
    80,
  );
}

export async function GET(
  request: NextRequest,
) {
  const access =
    await superAdminAccess();

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
    const importId =
      text(
        request.nextUrl
          .searchParams
          .get(
            "import_id",
          ),
        100,
      );

    const wantsFile =
      request.nextUrl
        .searchParams
        .get(
          "file",
        ) === "1";

    if (!importId) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Choose a stat import.",
        },
        {
          status: 400,
        },
      );
    }

    const admin =
      createSupabaseAdminClient();

    const db =
      admin as any;

    const importResult =
      await db
        .from(
          "team_stat_imports",
        )
        .select(
          "id,team_id,game_id,file_name,storage_path,mime_type,file_size,extraction_status,extracted_rows,warnings,created_at",
        )
        .eq(
          "id",
          importId,
        )
        .maybeSingle();

    if (
      importResult.error
    ) {
      throw importResult.error;
    }

    if (
      !importResult.data
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "That stat import could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const statImport =
      importResult.data;

    if (wantsFile) {
      const downloaded =
        await admin.storage
          .from(
            "team-stat-imports",
          )
          .download(
            statImport.storage_path,
          );

      if (
        downloaded.error ||
        !downloaded.data
      ) {
        throw (
          downloaded.error ||
          new Error(
            "The original report could not be downloaded.",
          )
        );
      }

      const bytes =
        await downloaded.data.arrayBuffer();

      return new Response(
        bytes,
        {
          status: 200,

          headers: {
            "content-type":
              statImport.mime_type ||
              "application/pdf",

            "content-disposition": `inline; filename="${String(
              statImport.file_name ||
                "report.pdf",
            ).replace(
              /"/g,
              "",
            )}"`,

            "cache-control":
              "no-store",
          },
        },
      );
    }

    const [
      gameResult,
      teamResult,
      rosterResult,
    ] =
      await Promise.all([
        db
          .from(
            "games",
          )
          .select(
            "id,title,game_title,game_date,home_team_id,away_team_id,home_team_name,away_team_name,home_score,away_score,period_scores,officials,verification_status,is_public,report_metadata",
          )
          .eq(
            "id",
            statImport.game_id,
          )
          .maybeSingle(),

        db
          .from(
            "team_profiles",
          )
          .select(
            "id,name,short_name",
          )
          .eq(
            "id",
            statImport.team_id,
          )
          .maybeSingle(),

        db
          .from(
            "team_roster_members",
          )
          .select(
            "id,player_id,display_name,nickname,jersey_number,position,status",
          )
          .eq(
            "team_id",
            statImport.team_id,
          )
          .eq(
            "status",
            "active",
          )
          .order(
            "display_name",
          ),
      ]);

    for (const result of [
      gameResult,
      teamResult,
      rosterResult,
    ]) {
      if (
        result.error
      ) {
        throw result.error;
      }
    }

    return NextResponse.json({
      ok: true,

      import:
        statImport,

      game:
        gameResult.data ||
        null,

      team:
        teamResult.data ||
        null,

      roster:
        rosterResult.data ||
        [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "The original report could not be opened.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const access =
    await superAdminAccess();

  if (
    !access.allowed ||
    !access.user
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
    const body =
      (await request.json()) as JsonRecord;

    const importId =
      text(
        body.import_id,
        100,
      );

    const commit =
      body.commit ===
      true;

    if (!importId) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Choose a stat import.",
        },
        {
          status: 400,
        },
      );
    }

    const homeRows =
      normalizeRows(
        body.home_rows,
      );

    const awayRows =
      normalizeRows(
        body.away_rows,
      );

    const officials =
      stringList(
        body.officials,
      );

    const periodScores =
      Array.isArray(
        body.period_scores,
      )
        ? body.period_scores.slice(
            0,
            12,
          )
        : [];

    if (
      !homeRows.length &&
      !awayRows.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "The recovered report does not contain a usable home or away box score.",
        },
        {
          status: 400,
        },
      );
    }

    const admin =
      createSupabaseAdminClient();

    const db =
      admin as any;

    const importResult =
      await db
        .from(
          "team_stat_imports",
        )
        .select(
          "id,team_id,game_id,file_name,extraction_status,extracted_rows,warnings",
        )
        .eq(
          "id",
          importId,
        )
        .maybeSingle();

    if (
      importResult.error
    ) {
      throw importResult.error;
    }

    if (
      !importResult.data
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "That stat import could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const statImport =
      importResult.data;

    const gameResult =
      await db
        .from(
          "games",
        )
        .select(
          "id,title,game_title,home_team_id,away_team_id,home_team_name,away_team_name,home_score,away_score,verification_status,is_public,report_metadata",
        )
        .eq(
          "id",
          statImport.game_id,
        )
        .maybeSingle();

    if (
      gameResult.error
    ) {
      throw gameResult.error;
    }

    if (
      !gameResult.data
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "The game linked to this import could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const game =
      gameResult.data;

    let submittingSide:
      | TeamSide
      | null =
      null;

    if (
      game.home_team_id ===
      statImport.team_id
    ) {
      submittingSide =
        "home";
    }

    if (
      game.away_team_id ===
      statImport.team_id
    ) {
      submittingSide =
        "away";
    }

    if (
      !submittingSide
    ) {
      /*
       * Historical imports may pre-date the canonical
       * home/away team IDs. The original reviewed rows
       * belong to the submitting team, so compare the
       * two sides against the team profile.
       */
      const teamResult =
        await db
          .from(
            "team_profiles",
          )
          .select(
            "id,name,short_name",
          )
          .eq(
            "id",
            statImport.team_id,
          )
          .maybeSingle();

      if (
        teamResult.error
      ) {
        throw teamResult.error;
      }

      const teamName =
        identity(
          teamResult.data
            ?.name,
        );

      const shortName =
        identity(
          teamResult.data
            ?.short_name,
        );

      const homeName =
        identity(
          game.home_team_name,
        );

      const awayName =
        identity(
          game.away_team_name,
        );

      if (
        teamName &&
        (homeName.includes(
          teamName,
        ) ||
          teamName.includes(
            homeName,
          ) ||
          (shortName &&
            homeName.includes(
              shortName,
            )))
      ) {
        submittingSide =
          "home";
      } else if (
        teamName &&
        (awayName.includes(
          teamName,
        ) ||
          teamName.includes(
            awayName,
          ) ||
          (shortName &&
            awayName.includes(
              shortName,
            )))
      ) {
        submittingSide =
          "away";
      }
    }

    const opponentSide: TeamSide | null =
      submittingSide ===
      "home"
        ? "away"
        : submittingSide ===
            "away"
          ? "home"
          : null;

    const preview = {
      import_id:
        importId,

      game_id:
        game.id,

      game_title:
        game.title ||
        game.game_title ||
        "Game",

      submitting_side:
        submittingSide,

      opponent_side:
        opponentSide,

      home_rows:
        homeRows.length,

      away_rows:
        awayRows.length,

      home_points:
        homeRows.reduce(
          (
            total,
            row,
          ) =>
            total +
            row.points,
          0,
        ),

      away_points:
        awayRows.reduce(
          (
            total,
            row,
          ) =>
            total +
            row.points,
          0,
        ),

      officials,
    };

    if (!commit) {
      return NextResponse.json({
        ok: true,

        committed:
          false,

        preview,
      });
    }

    if (
      !opponentSide
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "The submitting team side could not be determined. Fix the game's home/away team assignment before applying recovery.",
        },
        {
          status: 409,
        },
      );
    }

    const opponentRows =
      opponentSide ===
      "home"
        ? homeRows
        : awayRows;

    if (
      !opponentRows.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "The opponent box score is empty, so nothing can be recovered.",
        },
        {
          status: 409,
        },
      );
    }

    const opponentTeamName =
      opponentSide ===
      "home"
        ? text(
            game.home_team_name,
            180,
          ) ||
          "Home"
        : text(
            game.away_team_name,
            180,
          ) ||
          "Away";

    const opponentTeamId =
      opponentSide ===
      "home"
        ? game.home_team_id ||
          null
        : game.away_team_id ||
          null;

    const canonicalLines =
      opponentRows.map(
        (
          row,
          index,
        ) => ({
          game_id:
            game.id,

          team_side:
            opponentSide,

          team_name:
            opponentTeamName,

          team_id:
            opponentTeamId,

          roster_member_id:
            null,

          player_id:
            null,

          identity_type:
            "game_only",

          display_name:
            row.player_name,

          jersey_number:
            row.jersey_number ||
            null,

          position:
            null,

          is_starter:
            false,

          minutes:
            row.minutes,

          points:
            row.points,

          field_goals_made:
            row.two_made +
            row.three_made,

          field_goals_attempted:
            row.two_attempted +
            row.three_attempted,

          two_made:
            row.two_made,

          two_attempted:
            row.two_attempted,

          three_made:
            row.three_made,

          three_attempted:
            row.three_attempted,

          ft_made:
            row.ft_made,

          ft_attempted:
            row.ft_attempted,

          offensive_rebounds:
            row.offensive_rebounds,

          defensive_rebounds:
            row.defensive_rebounds,

          rebounds:
            row.rebounds,

          assists:
            row.assists,

          turnovers:
            row.turnovers,

          steals:
            row.steals,

          blocks:
            row.blocks,

          fouls:
            row.fouls,

          fouls_drawn:
            0,

          plus_minus:
            row.plus_minus,

          efficiency:
            null,

          pir:
            null,

          player_of_game:
            false,

          period_values:
            {},

          extra_stats:
            {},

          source_line_key: `report:${statImport.team_id}:${opponentSide}:${sourceKeyPart(
            row.player_name,
            `player${index + 1}`,
          )}:${sourceKeyPart(
            row.jersey_number,
            String(
              index + 1,
            ),
          )}`,

          source_type:
            "team_import",

          source_import_id:
            importId,

          source_session_id:
            null,

          source_submission_id:
            null,

          verification_status:
            "verified",

          is_public:
            game.is_public ===
            true,

          verified_at:
            new Date().toISOString(),

          verified_by:
            access.user.id,
        }),
      );

    const canonicalWrite =
      await db
        .from(
          "game_box_score_lines",
        )
        .upsert(
          canonicalLines,
          {
            onConflict:
              "game_id,source_line_key",
          },
        );

    if (
      canonicalWrite.error
    ) {
      throw canonicalWrite.error;
    }

    const existingMetadata =
      jsonObject(
        game.report_metadata,
      );

    const recoveryHistory =
      Array.isArray(
        existingMetadata.recoveries,
      )
        ? existingMetadata.recoveries
        : [];

    const gameUpdate: JsonRecord =
      {
        report_metadata: {
          ...existingMetadata,

          recoveries: [
            ...recoveryHistory.slice(
              -9,
            ),

            {
              import_id:
                importId,

              recovered_at:
                new Date().toISOString(),

              recovered_by:
                access.user.id,

              opponent_side:
                opponentSide,

              opponent_rows:
                opponentRows.length,

              officials,
            },
          ],

          last_recovered_import_id:
            importId,
        },
      };

    if (
      officials.length
    ) {
      gameUpdate.officials =
        officials.join(
          ", ",
        );
    }

    if (
      periodScores.length
    ) {
      gameUpdate.period_scores =
        periodScores;
    }

    const gameUpdateResult =
      await db
        .from(
          "games",
        )
        .update(
          gameUpdate,
        )
        .eq(
          "id",
          game.id,
        );

    if (
      gameUpdateResult.error
    ) {
      throw gameUpdateResult.error;
    }

    const oldWarnings =
      Array.isArray(
        statImport.warnings,
      )
        ? statImport.warnings
        : [];

    const importUpdate =
      await db
        .from(
          "team_stat_imports",
        )
        .update({
          extraction_status:
            "parsed",

          warnings:
            Array.from(
              new Set([
                ...oldWarnings,

                `Recovered complete report on ${new Date().toISOString()}: ${opponentRows.length} opponent rows and ${officials.length} officials.`,
              ]),
            ),
        })
        .eq(
          "id",
          importId,
        );

    if (
      importUpdate.error
    ) {
      throw importUpdate.error;
    }

    return NextResponse.json({
      ok: true,

      committed:
        true,

      preview,

      recovered: {
        opponent_rows:
          opponentRows.length,

        officials:
          officials.length,

        game_id:
          game.id,
      },

      message: `${opponentRows.length} opponent player rows recovered into the canonical game box score${
        officials.length
          ? ` and ${officials.length} officials restored`
          : ""
      }.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "The historical stat report could not be recovered.",
      },
      {
        status: 500,
      },
    );
  }
}