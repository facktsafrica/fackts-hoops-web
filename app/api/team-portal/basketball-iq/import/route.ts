/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  parseStatDocument,
} from "@/lib/basketball-iq/documentImport";

import {
  createSupabaseAdminClient,
} from "@/lib/supabase/admin";

import {
  requireTeamCapability,
} from "@/lib/team-portal/access";

export const runtime = "nodejs";

const MAX_BYTES =
  15 * 1024 * 1024;

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

const MIME_BY_EXTENSION: Record<
  string,
  string
> = {
  csv: "text/csv",

  tsv:
    "text/tab-separated-values",

  txt: "text/plain",

  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  xls:
    "application/vnd.ms-excel",

  pdf:
    "application/pdf",

  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  doc:
    "application/msword",
};

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

type TeamSide =
  | "home"
  | "away";

function text(
  value:
    | FormDataEntryValue
    | null,
  max = 300,
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          max,
        )
    : "";
}

function safeFilename(
  value: string,
) {
  return (
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .slice(
        -120,
      ) ||
    "stat-sheet"
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

function recordText(
  value: unknown,
  max = 300,
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

function integer(
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

function normalizeRow(
  source: Record<
    string,
    unknown
  >,
): NormalizedStatRow | null {
  const playerName =
    recordText(
      source.player_name,
      180,
    );

  if (
    !playerName ||
    /^(total|team)$/i.test(
      playerName,
    )
  ) {
    return null;
  }

  const twoMade =
    integer(
      source.two_made,
    );

  const threeMade =
    integer(
      source.three_made,
    );

  const ftMade =
    integer(
      source.ft_made,
    );

  const offensiveRebounds =
    integer(
      source.offensive_rebounds,
    );

  const defensiveRebounds =
    integer(
      source.defensive_rebounds,
    );

  return {
    player_name:
      playerName,

    jersey_number:
      recordText(
        source.jersey_number,
        24,
      ) || undefined,

    points:
      integer(
        source.points,
      ) ||
      twoMade * 2 +
        threeMade * 3 +
        ftMade,

    rebounds:
      offensiveRebounds +
        defensiveRebounds ||
      integer(
        source.rebounds,
      ),

    offensive_rebounds:
      offensiveRebounds,

    defensive_rebounds:
      defensiveRebounds,

    assists:
      integer(
        source.assists,
      ),

    steals:
      integer(
        source.steals,
      ),

    blocks:
      integer(
        source.blocks,
      ),

    turnovers:
      integer(
        source.turnovers,
      ),

    fouls:
      integer(
        source.fouls,
      ),

    minutes:
      decimal(
        source.minutes,
      ),

    two_made:
      twoMade,

    two_attempted:
      Math.max(
        twoMade,
        integer(
          source.two_attempted,
        ),
      ),

    three_made:
      threeMade,

    three_attempted:
      Math.max(
        threeMade,
        integer(
          source.three_attempted,
        ),
      ),

    ft_made:
      ftMade,

    ft_attempted:
      Math.max(
        ftMade,
        integer(
          source.ft_attempted,
        ),
      ),

    plus_minus:
      integer(
        source.plus_minus,
        true,
      ),
  };
}

function clientRows(
  value: string,
  label =
    "browser OCR rows",
) {
  if (!value) {
    return [] as NormalizedStatRow[];
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        value,
      );
  } catch {
    throw new Error(
      `The ${label} were not valid JSON.`,
    );
  }

  if (
    !Array.isArray(
      parsed,
    ) ||
    parsed.length > 100
  ) {
    throw new Error(
      `The ${label} can contain no more than 100 player rows.`,
    );
  }

  return parsed.flatMap(
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
        normalizeRow(
          item as Record<
            string,
            unknown
          >,
        );

      return row
        ? [row]
        : [];
    },
  );
}

function normalizeParsedRows(
  rows: unknown[],
) {
  return rows.flatMap(
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
        normalizeRow(
          item as Record<
            string,
            unknown
          >,
        );

      return row
        ? [row]
        : [];
    },
  );
}

function stringList(
  value: string,
) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed =
      JSON.parse(
        value,
      );

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return Array.from(
      new Set(
        parsed
          .map(
            (
              item,
            ) =>
              recordText(
                item,
                500,
              ),
          )
          .filter(
            Boolean,
          ),
      ),
    ).slice(
      0,
      30,
    );
  } catch {
    return [];
  }
}

function jsonArray(
  value: string,
) {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        value,
      );

    return Array.isArray(
      parsed,
    )
      ? parsed.slice(
          0,
          12,
        )
      : [];
  } catch {
    return [];
  }
}

function jsonObject(
  value: unknown,
): Record<
  string,
  any
> {
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
    ...(value as Record<
      string,
      any
    >),
  };
}

function distance(
  left: string,
  right: string,
) {
  const row =
    Array.from(
      {
        length:
          right.length +
          1,
      },
      (
        _,
        index,
      ) =>
        index,
    );

  for (
    let leftIndex = 1;
    leftIndex <=
    left.length;
    leftIndex += 1
  ) {
    let diagonal =
      row[0];

    row[0] =
      leftIndex;

    for (
      let rightIndex = 1;
      rightIndex <=
      right.length;
      rightIndex += 1
    ) {
      const previous =
        row[
          rightIndex
        ];

      row[
        rightIndex
      ] = Math.min(
        row[
          rightIndex
        ] + 1,

        row[
          rightIndex -
            1
        ] + 1,

        diagonal +
          (left[
            leftIndex -
              1
          ] ===
          right[
            rightIndex -
              1
          ]
            ? 0
            : 1),
      );

      diagonal =
        previous;
    }
  }

  return row[
    right.length
  ];
}

function nameTokenKey(
  value: unknown,
) {
  return String(
    value || "",
  )
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join("");
}

function namesMatch(
  left: unknown,
  right: unknown,
) {
  const first =
    identity(left);

  const second =
    identity(right);

  const firstTokens =
    nameTokenKey(left);

  const secondTokens =
    nameTokenKey(right);

  return Boolean(
    first &&
      second &&
      (
        first === second ||
        (
          firstTokens &&
          firstTokens ===
            secondTokens
        ) ||
        first.includes(
          second,
        ) ||
        second.includes(
          first,
        ) ||
        distance(
          first,
          second,
        ) <= 2
      ),
  );
}

function matchRosterMember(
  row: NormalizedStatRow,
  rosterRows: any[],
) {
  const jersey =
    identity(
      row.jersey_number,
    );

  const byName =
    rosterRows.filter(
      (
        member: {
          display_name?: string;
          nickname?:
            | string
            | null;
        },
      ) =>
        [
          member.display_name,
          member.nickname,
        ].some(
          (name) =>
            namesMatch(
              name,
              row.player_name,
            ),
        ),
    );

  const byJersey =
    jersey
      ? rosterRows.filter(
          (
            member: {
              jersey_number?:
                | string
                | null;
            },
          ) =>
            identity(
              member.jersey_number,
            ) === jersey,
        )
      : [];

  if (
    byName.length === 1
  ) {
    return byName[0];
  }

  if (
    byJersey.length === 1
  ) {
    return byJersey[0];
  }

  const byNameAndJersey =
    jersey
      ? byName.filter(
          (
            member: {
              jersey_number?:
                | string
                | null;
            },
          ) =>
            identity(
              member.jersey_number,
            ) === jersey,
        )
      : [];

  return byNameAndJersey.length ===
    1
    ? byNameAndJersey[0]
    : null;
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

export async function POST(
  request: NextRequest,
) {
  try {
    const form =
      await request.formData();

    const file =
      form.get(
        "file",
      );

    const requestedTeamId =
      text(
        form.get(
          "team_id",
        ),
        100,
      ) || null;

    let gameId =
      text(
        form.get(
          "game_id",
        ),
        160,
      );

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Choose an Excel, CSV, PDF or Word stat sheet.",
        },
        {
          status: 400,
        },
      );
    }

    const extension =
      file.name
        .toLowerCase()
        .split(".")
        .pop() || "";

    const mimeType =
      file.type &&
      file.type !==
        "application/octet-stream"
        ? file.type
        : MIME_BY_EXTENSION[
            extension
          ] ||
          "text/plain";

    if (
      !EXTENSIONS.has(
        extension,
      ) ||
      file.size <= 0 ||
      file.size >
        MAX_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Use CSV, Excel, PDF, TXT or Word up to 15 MB.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      gameId &&
      !/^[a-z0-9-]{1,160}$/i.test(
        gameId,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "The selected game reference is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const access =
      await requireTeamCapability(
        "stats_submit",
        requestedTeamId,
      );

    if (
      !access.user
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Team login required.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !access.permitted ||
      !access.membership
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Statistics access is not active for this account.",
        },
        {
          status: 403,
        },
      );
    }

    const admin =
      createSupabaseAdminClient();

    /*
     * The canonical game-box-score migration is newer than
     * some generated Supabase typings in the repo.
     * Use the same admin client without allowing stale
     * generated types to block the runtime tables.
     */
    const db =
      admin as any;

    const teamId =
      access.membership
        .team_id;

    const [
      roster,
      teamProfile,
    ] =
      await Promise.all([
        db
          .from(
            "team_roster_members",
          )
          .select(
            "id,player_id,display_name,nickname,jersey_number,position",
          )
          .eq(
            "team_id",
            teamId,
          )
          .eq(
            "status",
            "active",
          )
          .limit(
            500,
          ),

        db
          .from(
            "team_profiles",
          )
          .select(
            "id,name,short_name",
          )
          .eq(
            "id",
            teamId,
          )
          .maybeSingle(),
      ]);

    for (const result of [
      roster,
      teamProfile,
    ]) {
      if (
        result.error
      ) {
        throw result.error;
      }
    }

    if (
      !teamProfile.data
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "The registered team profile could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !(roster.data ?? [])
        .length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Add the team players before importing a player box score.",
        },
        {
          status: 409,
        },
      );
    }

    let createdGame:
      | Record<
          string,
          any
        >
      | null = null;

    let formTeamSide:
      | TeamSide
      | null =
      null;

    const submittedSide =
      text(
        form.get(
          "team_side",
        ),
        10,
      );

    if (
      submittedSide ===
        "home" ||
      submittedSide ===
        "away"
    ) {
      formTeamSide =
        submittedSide;
    }

    if (gameId) {
      const [
        canonical,
        attached,
      ] =
        await Promise.all([
          db
            .from(
              "games",
            )
            .select(
              "id,home_team_id,away_team_id",
            )
            .eq(
              "id",
              gameId,
            )
            .maybeSingle(),

          db
            .from(
              "team_games",
            )
            .select(
              "id,game_id",
            )
            .eq(
              "team_id",
              teamId,
            )
            .or(
              `id.eq.${gameId},game_id.eq.${gameId}`,
            )
            .limit(
              1,
            )
            .maybeSingle(),
        ]);

      for (const result of [
        canonical,
        attached,
      ]) {
        if (
          result.error
        ) {
          throw result.error;
        }
      }

      const canonicalOwned =
        canonical.data &&
        [
          canonical.data
            .home_team_id,
          canonical.data
            .away_team_id,
        ].includes(
          teamId,
        );

      if (
        !canonicalOwned &&
        !attached.data
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "That game is not assigned to this team.",
          },
          {
            status: 403,
          },
        );
      }

      /*
       * Some older team-game records use their own row id
       * in the portal but point at the canonical game.
       */
      if (
        !canonical.data &&
        attached.data
          ?.game_id
      ) {
        gameId =
          attached.data
            .game_id;
      }
    } else {
      if (
        text(
          form.get(
            "create_game",
          ),
          10,
        ) !== "true"
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Confirm the match detected in the report, or choose an existing game.",
          },
          {
            status: 400,
          },
        );
      }

      const homeName =
        text(
          form.get(
            "home_team_name",
          ),
          180,
        );

      const awayName =
        text(
          form.get(
            "away_team_name",
          ),
          180,
        );

      const gameDate =
        text(
          form.get(
            "game_date",
          ),
          10,
        );

      const teamSide: TeamSide =
        formTeamSide ===
        "away"
          ? "away"
          : "home";

      formTeamSide =
        teamSide;

      const homeScore =
        Number(
          text(
            form.get(
              "home_score",
            ),
            4,
          ),
        );

      const awayScore =
        Number(
          text(
            form.get(
              "away_score",
            ),
            4,
          ),
        );

      if (
        !homeName ||
        !awayName ||
        !/^20\d{2}-\d{2}-\d{2}$/.test(
          gameDate,
        )
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Confirm both teams and the game date extracted from the report.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        ![
          homeScore,
          awayScore,
        ].every(
          (
            score,
          ) =>
            Number.isInteger(
              score,
            ) &&
            score >= 0,
        ) ||
        homeScore ===
          awayScore
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Confirm valid final scores. Basketball games require an overtime winner.",
          },
          {
            status: 400,
          },
        );
      }

      const teamName =
        teamProfile.data
          .name;

      const detectedTeamName =
        teamSide ===
        "home"
          ? homeName
          : awayName;

      if (
        !namesMatch(
          teamName,
          detectedTeamName,
        ) &&
        !namesMatch(
          teamProfile.data
            .short_name,
          detectedTeamName,
        )
      ) {
        return NextResponse.json(
          {
            ok: false,

            error: `The report's ${teamSide} team (${detectedTeamName}) does not match ${teamName}. Correct the team side before creating the game.`,
          },
          {
            status: 409,
          },
        );
      }

      const sideColumn =
        teamSide ===
        "home"
          ? "home_team_id"
          : "away_team_id";

      const existing =
        await db
          .from(
            "games",
          )
          .select(
            "id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public",
          )
          .eq(
            sideColumn,
            teamId,
          )
          .eq(
            "game_date",
            gameDate,
          )
          .eq(
            "home_score",
            homeScore,
          )
          .eq(
            "away_score",
            awayScore,
          )
          .limit(
            1,
          )
          .maybeSingle();

      if (
        existing.error
      ) {
        throw existing.error;
      }

      if (
        existing.data
      ) {
        gameId =
          existing.data.id;

        createdGame =
          existing.data;
      } else {
        const opponentName =
          teamSide ===
          "home"
            ? awayName
            : homeName;

        const teamScore =
          teamSide ===
          "home"
            ? homeScore
            : awayScore;

        const opponentScore =
          teamSide ===
          "home"
            ? awayScore
            : homeScore;

        const created =
          await db
            .from(
              "games",
            )
            .insert({
              team_name:
                teamName,

              opponent:
                opponentName,

              game_date:
                gameDate,

              match_type:
                "team_report",

              notes:
                "Created from a private team stat report. Requires Super Admin verification before publication.",

              team_score:
                teamScore,

              opponent_score:
                opponentScore,

              is_upcoming:
                false,

              preview_is_active:
                false,

              game_title: `${homeName} vs ${awayName}`,

              title: `${homeName} vs ${awayName}`,

              opponent_name:
                opponentName,

              date: `${gameDate}T12:00:00+03:00`,

              status:
                "completed",

              home_score:
                homeScore,

              away_score:
                awayScore,

              home_team_name:
                homeName,

              away_team_name:
                awayName,

              game_format:
                "5v5",

              period_scores:
                jsonArray(
                  text(
                    form.get(
                      "period_scores",
                    ),
                    5000,
                  ),
                ),

              verification_status:
                "unverified",

              is_public:
                false,

              home_team_id:
                teamSide ===
                "home"
                  ? teamId
                  : null,

              away_team_id:
                teamSide ===
                "away"
                  ? teamId
                  : null,
            })
            .select(
              "id,title,game_title,game_date,home_team_name,away_team_name,home_score,away_score,verification_status,is_public",
            )
            .single();

        if (
          created.error
        ) {
          throw created.error;
        }

        gameId =
          created.data.id;

        createdGame =
          created.data;
      }
    }

    if (!gameId) {
      throw new Error(
        "The canonical game could not be resolved.",
      );
    }

    /*
     * Load the canonical match so home/away identity,
     * publication status and existing report metadata
     * are known before we preserve the complete report.
     */
    const gameResult =
      await db
        .from(
          "games",
        )
        .select(
          "id,title,game_title,game_date,home_team_name,away_team_name,home_team_id,away_team_id,home_score,away_score,verification_status,is_public,officials,period_scores,report_metadata",
        )
        .eq(
          "id",
          gameId,
        )
        .maybeSingle();

    if (
      gameResult.error
    ) {
      throw gameResult.error;
    }

    const canonicalGame =
      gameResult.data;

    let teamSide:
      | TeamSide
      | null =
      formTeamSide;

    if (
      canonicalGame
        ?.home_team_id ===
      teamId
    ) {
      teamSide =
        "home";
    } else if (
      canonicalGame
        ?.away_team_id ===
      teamId
    ) {
      teamSide =
        "away";
    }

    /*
     * For a normal Basketball Stats Assistant PDF,
     * the browser sends this explicitly.
     */
    if (
      !teamSide &&
      formTeamSide
    ) {
      teamSide =
        formTeamSide;
    }

    const buffer =
      Buffer.from(
        await file.arrayBuffer(),
      );

    const browserOcr =
      text(
        form.get(
          "browser_ocr",
        ),
        10,
      ) === "true";

    const ocrRows =
      clientRows(
        text(
          form.get(
            "ocr_rows",
          ),
          250000,
        ),
        "selected-team OCR rows",
      );

    const homeRows =
      clientRows(
        text(
          form.get(
            "ocr_home_rows",
          ),
          250000,
        ),
        "home-team OCR rows",
      );

    const awayRows =
      clientRows(
        text(
          form.get(
            "ocr_away_rows",
          ),
          250000,
        ),
        "away-team OCR rows",
      );

    const officials =
      stringList(
        text(
          form.get(
            "ocr_officials",
          ),
          20000,
        ),
      ).filter(
        (
          item,
        ) =>
          !/^none$/i.test(
            item,
          ),
      );

    const periodScores =
      jsonArray(
        text(
          form.get(
            "period_scores",
          ),
          5000,
        ),
      );

    const parsed =
      browserOcr
        ? {
            rows: [],
            warnings: [],
          }
        : await parseStatDocument(
            buffer,
            file.name,
            mimeType,
          );

    const sourceRows =
      browserOcr
        ? ocrRows
        : normalizeParsedRows(
            parsed.rows as unknown[],
          );

    const rosterRows =
      roster.data ?? [];

    const matchedRows =
      sourceRows.map(
        (
          row,
        ) => {
          const match =
            matchRosterMember(
              row,
              rosterRows,
            );

          return {
            ...row,

            roster_member_id:
              match?.id ||
              null,

            player_id:
              match?.player_id ||
              null,
          };
        },
      );

    const unmatched =
      matchedRows.filter(
        (
          row,
        ) =>
          !row.roster_member_id,
      ).length;

    const warnings =
      Array.from(
        new Set([
          ...(browserOcr
            ? stringList(
                text(
                  form.get(
                    "ocr_warnings",
                  ),
                  20000,
                ),
              )
            : parsed.warnings),
        ]),
      );

    if (unmatched) {
      warnings.push(
        `${unmatched} extracted row${
          unmatched ===
          1
            ? ""
            : "s"
        } could not be matched automatically. Choose the correct roster player before saving.`,
      );
    }

    if (
      browserOcr &&
      !homeRows.length
    ) {
      warnings.push(
        "The home-team box score was not preserved from this report.",
      );
    }

    if (
      browserOcr &&
      !awayRows.length
    ) {
      warnings.push(
        "The away-team box score was not preserved from this report.",
      );
    }

    const objectPath = `${teamId}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safeFilename(
      file.name,
    )}`;

    const uploaded =
      await admin.storage
        .from(
          "team-stat-imports",
        )
        .upload(
          objectPath,
          buffer,
          {
            contentType:
              mimeType,

            upsert:
              false,
          },
        );

    if (
      uploaded.error
    ) {
      throw uploaded.error;
    }

    /*
     * Keep the submitting-team rows in team_stat_imports
     * because the current Admin review screen edits this
     * exact payload.
     */
    const result =
      await db
        .from(
          "team_stat_imports",
        )
        .insert({
          team_id:
            teamId,

          game_id:
            gameId,

          uploaded_by_user_id:
            access.user.id,

          file_name:
            file.name.slice(
              0,
              300,
            ),

          storage_path:
            objectPath,

          mime_type:
            mimeType,

          file_size:
            file.size,

          extraction_status:
            matchedRows.length
              ? warnings.length
                ? "partial"
                : "parsed"
              : "review_required",

          extracted_rows:
            matchedRows,

          warnings,
        })
        .select(
          "id,game_id,file_name,mime_type,file_size,extraction_status,warnings,created_at",
        )
        .single();

    if (
      result.error
    ) {
      throw result.error;
    }

    const importId =
      result.data.id;

    /*
     * ===================================================
     * COMPLETE REPORT → CANONICAL PENDING GAME BOX SCORE
     * ===================================================
     *
     * Submitting-team rows:
     * - link to team roster where matching is safe
     * - remain PENDING and PRIVATE until Admin approves
     *
     * Opponent rows:
     * - live only inside this game as game_only identity
     * - do NOT create permanent players
     * - do NOT feed permanent career stats yet
     */
    let canonicalRowsWritten =
      0;

    if (
      canonicalGame &&
      browserOcr &&
      (homeRows.length ||
        awayRows.length)
    ) {
      const homeName =
        recordText(
          canonicalGame.home_team_name ||
            text(
              form.get(
                "home_team_name",
              ),
              180,
            ) ||
            "Home",
          180,
        );

      const awayName =
        recordText(
          canonicalGame.away_team_name ||
            text(
              form.get(
                "away_team_name",
              ),
              180,
            ) ||
            "Away",
          180,
        );

      const sides: Array<{
        side: TeamSide;
        rows: NormalizedStatRow[];
        teamName: string;
        teamId:
          | string
          | null;
      }> = [
        {
          side:
            "home",

          rows:
            homeRows,

          teamName:
            homeName,

          teamId:
            canonicalGame.home_team_id ||
            (teamSide ===
            "home"
              ? teamId
              : null),
        },

        {
          side:
            "away",

          rows:
            awayRows,

          teamName:
            awayName,

          teamId:
            canonicalGame.away_team_id ||
            (teamSide ===
            "away"
              ? teamId
              : null),
        },
      ];

      const canonicalLines: any[] =
        [];

      for (
        const sideInfo of
        sides
      ) {
        const isSubmittingSide =
          sideInfo.side ===
          teamSide;

        sideInfo.rows.forEach(
          (
            row,
            index,
          ) => {
            const rosterMember =
              isSubmittingSide
                ? matchRosterMember(
                    row,
                    rosterRows,
                  )
                : null;

            /*
             * A submitting-team row that could not safely
             * match the roster remains in the import review
             * rather than being guessed into canonical data.
             */
            if (
              isSubmittingSide &&
              !rosterMember
            ) {
              return;
            }

            const playerId =
              rosterMember
                ?.player_id ||
              null;

            const identityType =
              isSubmittingSide
                ? playerId
                  ? "canonical_player"
                  : "team_roster"
                : "game_only";

            const key =
              isSubmittingSide &&
              rosterMember
                ? `team:${teamId}:roster:${rosterMember.id}`
                : `report:${teamId}:${sideInfo.side}:${sourceKeyPart(
                    row.player_name,
                    `player${index + 1}`,
                  )}:${sourceKeyPart(
                    row.jersey_number,
                    String(
                      index +
                        1,
                    ),
                  )}`;

            canonicalLines.push({
              game_id:
                gameId,

              team_side:
                sideInfo.side,

              team_name:
                sideInfo.teamName,

              team_id:
                sideInfo.teamId,

              roster_member_id:
                rosterMember
                  ?.id ||
                null,

              player_id:
                playerId,

              identity_type:
                identityType,

              display_name:
                row.player_name,

              jersey_number:
                row.jersey_number ||
                null,

              position:
                rosterMember
                  ?.position ||
                null,

              minutes:
                row.minutes,

              points:
                row.points,

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

              plus_minus:
                row.plus_minus,

              period_values:
                {},

              extra_stats:
                {},

              source_line_key:
                key,

              source_type:
                "team_import",

              source_import_id:
                importId,

              source_session_id:
                null,

              source_submission_id:
                null,

              verification_status:
                "pending",

              is_public:
                false,

              verified_at:
                null,

              verified_by:
                null,
            });
          },
        );
      }

      if (
        canonicalLines.length
      ) {
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

        canonicalRowsWritten =
          canonicalLines.length;
      }
    }

    /*
     * Preserve report-level information on the game.
     *
     * For private/unverified games we can populate
     * officials and periods directly.
     *
     * For a verified/public game we DO NOT silently
     * overwrite official metadata. The report evidence
     * remains in report_metadata for Admin review.
     */
    if (
      canonicalGame
    ) {
      const existingMetadata =
        jsonObject(
          canonicalGame.report_metadata,
        );

      const existingHistory =
        Array.isArray(
          existingMetadata.team_report_imports,
        )
          ? existingMetadata.team_report_imports
          : [];

      const reportMetadata =
        {
          ...existingMetadata,

          last_team_report_import_id:
            importId,

          last_team_report_team_id:
            teamId,

          detected_officials:
            officials,

          detected_home_rows:
            homeRows.length,

          detected_away_rows:
            awayRows.length,

          team_report_imports:
            [
              ...existingHistory.slice(
                -9,
              ),

              {
                import_id:
                  importId,

                team_id:
                  teamId,

                captured_at:
                  new Date().toISOString(),

                home_rows:
                  homeRows.length,

                away_rows:
                  awayRows.length,

                officials,
              },
            ],
        };

      const gameUpdate: Record<
        string,
        any
      > = {
        report_metadata:
          reportMetadata,
      };

      const canDirectlyPopulate =
        canonicalGame.verification_status !==
          "verified" ||
        canonicalGame.is_public !==
          true;

      if (
        canDirectlyPopulate &&
        officials.length
      ) {
        gameUpdate.officials =
          officials.join(
            ", ",
          );
      }

      if (
        canDirectlyPopulate &&
        periodScores.length
      ) {
        gameUpdate.period_scores =
          periodScores;
      }

      const updatedGame =
        await db
          .from(
            "games",
          )
          .update(
            gameUpdate,
          )
          .eq(
            "id",
            gameId,
          );

      if (
        updatedGame.error
      ) {
        throw updatedGame.error;
      }
    }

    const gameMessage =
      createdGame
        ? ` ${
            createdGame.title ||
            createdGame.game_title ||
            "The detected game"
          } was created privately and remains unverified.`
        : "";

    const fullReportMessage =
      browserOcr &&
      (homeRows.length ||
        awayRows.length)
        ? ` Full report preserved: ${homeRows.length} home rows, ${awayRows.length} away rows${
            officials.length
              ? ` and ${officials.length} official${officials.length === 1 ? "" : "s"}`
              : ""
          }.`
        : "";

    return NextResponse.json(
      {
        ok: true,

        import:
          result.data,

        game:
          createdGame,

        game_id:
          gameId,

        rows:
          matchedRows,

        warnings,

        complete_report: {
          home_rows:
            homeRows.length,

          away_rows:
            awayRows.length,

          officials,

          canonical_rows_written:
            canonicalRowsWritten,
        },

        message:
          matchedRows.length
            ? `${matchedRows.length} submitting-team player row${
                matchedRows.length ===
                1
                  ? ""
                  : "s"
              } extracted.${fullReportMessage}${gameMessage} Review every value before saving.`
            : `File stored as private evidence.${fullReportMessage}${gameMessage} No safe submitting-team rows were detected, so complete the review manually.`,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : JSON.stringify(error) || "Stat sheet import failed.",
      },
      {
        status: 500,
      },
    );
  }
}
