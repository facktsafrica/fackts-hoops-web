/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  recordAdminAuditEvent,
} from "@/lib/admin/audit";

import {
  adminRolePresetDefinition,
  canAdmin,
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

const GAME_STATUSES = [
  "upcoming",
  "live",
  "completed",
  "postponed",
  "cancelled",
] as const;

const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "disputed",
] as const;

const IDENTITY_TYPES = [
  "canonical_player",
  "team_roster",
  "game_only",
  "guest",
] as const;

type GameStatus =
  (typeof GAME_STATUSES)[number];

type VerificationStatus =
  (typeof VERIFICATION_STATUSES)[number];

type TeamSide =
  | "home"
  | "away";

type JsonRecord =
  Record<string, any>;

const TRANSITIONS: Record<
  GameStatus,
  GameStatus[]
> = {
  upcoming: [
    "upcoming",
    "live",
    "postponed",
    "cancelled",
  ],

  live: [
    "live",
    "completed",
    "postponed",
    "cancelled",
  ],

  completed: [
    "completed",
  ],

  postponed: [
    "postponed",
    "upcoming",
    "cancelled",
  ],

  cancelled: [
    "cancelled",
    "upcoming",
  ],
};

function cleanText(
  value: unknown,
  max = 1000,
) {
  const cleaned =
    String(
      value ?? "",
    ).trim();

  return cleaned
    ? cleaned.slice(
        0,
        max,
      )
    : null;
}

function cleanStatus(
  value: unknown,
): GameStatus | null {
  const status =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  return GAME_STATUSES.includes(
    status as GameStatus,
  )
    ? (status as GameStatus)
    : null;
}

function cleanVerification(
  value: unknown,
): VerificationStatus {
  const status =
    String(
      value ??
        "unverified",
    )
      .trim()
      .toLowerCase();

  return VERIFICATION_STATUSES.includes(
    status as VerificationStatus,
  )
    ? (status as VerificationStatus)
    : "unverified";
}

function cleanBoolean(
  value: unknown,
  fallback = false,
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return fallback;
}

function nullableScore(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const score =
    Number(value);

  return Number.isInteger(
    score,
  ) &&
    score >= 0
    ? score
    : Number.NaN;
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
    )
  ) {
    return 0;
  }

  if (
    !allowNegative &&
    parsed < 0
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

function scoreErrors(
  status: GameStatus,
  home: number | null,
  away: number | null,
) {
  const errors:
    string[] = [];

  if (
    Number.isNaN(
      home,
    ) ||
    Number.isNaN(
      away,
    )
  ) {
    errors.push(
      "Scores must be whole numbers of zero or more.",
    );
  }

  if (
    [
      "upcoming",
      "postponed",
      "cancelled",
    ].includes(
      status,
    ) &&
    (home !== null ||
      away !== null)
  ) {
    errors.push(
      "Scheduled, postponed or cancelled games cannot carry a score.",
    );
  }

  if (
    status ===
      "completed" &&
    (home === null ||
      away === null)
  ) {
    errors.push(
      "Completed games require both final scores.",
    );
  }

  if (
    status ===
      "completed" &&
    home !== null &&
    away !== null &&
    home === away
  ) {
    errors.push(
      "A completed basketball game cannot finish tied.",
    );
  }

  return errors;
}

function normalizedStatus(
  value: unknown,
): GameStatus {
  const direct =
    cleanStatus(
      value,
    );

  if (direct) {
    return direct;
  }

  const legacy =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    [
      "scheduled",
      "draft",
      "pending",
    ].includes(
      legacy,
    )
  ) {
    return "upcoming";
  }

  if (
    [
      "finished",
      "final",
      "verified",
      "published",
    ].includes(
      legacy,
    )
  ) {
    return "completed";
  }

  return "upcoming";
}

function normalizePeriods(
  value: unknown,
) {
  const errors:
    string[] = [];

  if (
    value === undefined
  ) {
    return {
      supplied: false,
      value: null,
      errors,
    };
  }

  if (
    value === null ||
    value === ""
  ) {
    return {
      supplied: true,
      value: [],
      errors,
    };
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    return {
      supplied: true,
      value: [],
      errors: [
        "Period scores must be an array.",
      ],
    };
  }

  if (
    value.length >
    12
  ) {
    errors.push(
      "A game cannot contain more than 12 periods.",
    );
  }

  const periods =
    value
      .slice(
        0,
        12,
      )
      .map(
        (
          item,
          index,
        ) => {
          const row =
            item &&
            typeof item ===
              "object" &&
            !Array.isArray(
              item,
            )
              ? (item as JsonRecord)
              : {};

          const period =
            cleanText(
              row.period ??
                row.label,
              30,
            ) ||
            (index < 4
              ? `Q${index + 1}`
              : `OT${index - 3}`);

          const home =
            nullableScore(
              row.home,
            );

          const away =
            nullableScore(
              row.away,
            );

          if (
            home === null ||
            away === null ||
            Number.isNaN(
              home,
            ) ||
            Number.isNaN(
              away,
            )
          ) {
            errors.push(
              `${period} requires valid home and away scores.`,
            );
          }

          return {
            period,
            home:
              Number.isNaN(
                home,
              )
                ? 0
                : home ?? 0,

            away:
              Number.isNaN(
                away,
              )
                ? 0
                : away ?? 0,
          };
        },
      );

  return {
    supplied: true,
    value:
      periods,
    errors,
  };
}

async function activeAssignments(
  profileId: string,
) {
  const admin =
    createSupabaseAdminClient();

  const result =
    await admin
      .from(
        "admin_assignments",
      )
      .select(
        "resource_type,resource_id,permissions,starts_at,ends_at",
      )
      .eq(
        "admin_profile_id",
        profileId,
      )
      .eq(
        "is_active",
        true,
      );

  if (
    result.error
  ) {
    throw result.error;
  }

  const now =
    Date.now();

  return (
    result.data ?? []
  ).filter(
    (
      assignment,
    ) => {
      const starts =
        assignment.starts_at
          ? new Date(
              assignment.starts_at,
            ).getTime()
          : null;

      const ends =
        assignment.ends_at
          ? new Date(
              assignment.ends_at,
            ).getTime()
          : null;

      return (
        (starts ===
          null ||
          starts <=
            now) &&
        (ends ===
          null ||
          ends >
            now)
      );
    },
  );
}

function assignmentMatchesGame(
  assignment: {
    resource_type:
      string;

    resource_id:
      string;

    permissions?:
      string[] | null;
  },

  game: JsonRecord,
) {
  if (
    assignment.permissions
      ?.length &&
    !assignment.permissions.includes(
      "games",
    )
  ) {
    return false;
  }

  if (
    assignment.resource_type ===
    "game"
  ) {
    return (
      assignment.resource_id ===
      String(
        game.id ??
          "",
      )
    );
  }

  if (
    assignment.resource_type ===
    "event"
  ) {
    return (
      assignment.resource_id ===
      String(
        game.event_id ??
          "",
      )
    );
  }

  if (
    assignment.resource_type ===
    "team"
  ) {
    return [
      game.home_team_id,
      game.away_team_id,
    ].some(
      (
        teamId,
      ) =>
        assignment.resource_id ===
        String(
          teamId ??
            "",
        ),
    );
  }

  return false;
}

async function gamesAccess(
  write: boolean,
  game?: JsonRecord,
) {
  const access =
    await getAdminAccess();

  if (
    !access.user ||
    !access.profile ||
    !canAdmin(
      access.profile,
      "games",
    )
  ) {
    return {
      ...access,
      allowed:
        false,
      assignments:
        [],
    };
  }

  const role =
    adminRolePresetDefinition(
      access.profile
        .role,
    );

  if (
    write &&
    role?.readOnly
  ) {
    return {
      ...access,
      allowed:
        false,
      assignments:
        [],
    };
  }

  if (
    !role?.requiresScope
  ) {
    return {
      ...access,
      allowed:
        true,
      assignments:
        null,
    };
  }

  const assignments =
    await activeAssignments(
      access.profile.id,
    );

  return {
    ...access,

    allowed:
      game
        ? assignments.some(
            (
              assignment,
            ) =>
              assignmentMatchesGame(
                assignment,
                game,
              ),
          )
        : true,

    assignments,
  };
}

function gameMutationPayload(
  body: JsonRecord,
  current?: JsonRecord,
) {
  const home =
    cleanText(
      body.home_team_name ??
        current?.home_team_name,
      180,
    );

  const away =
    cleanText(
      body.away_team_name ??
        current?.away_team_name,
      180,
    );

  const status =
    cleanStatus(
      body.status ??
        current?.status,
    ) ??
    normalizedStatus(
      current?.status,
    );

  const homeScoreValue =
    "home_score" in
    body
      ? body.home_score
      : "team_score" in
          body
        ? body.team_score
        : current?.home_score ??
          current?.team_score;

  const awayScoreValue =
    "away_score" in
    body
      ? body.away_score
      : "opponent_score" in
          body
        ? body.opponent_score
        : current?.away_score ??
          current?.opponent_score;

  const homeScore =
    nullableScore(
      homeScoreValue,
    );

  const awayScore =
    nullableScore(
      awayScoreValue,
    );

  const errors =
    scoreErrors(
      status,
      homeScore,
      awayScore,
    );

  if (
    !home ||
    !away
  ) {
    errors.push(
      "Both game sides are required.",
    );
  }

  const gameDateValue =
    cleanText(
      body.game_date ??
        current?.game_date ??
        current?.date,
      80,
    );

  if (
    !gameDateValue
  ) {
    errors.push(
      "Game date and time are required.",
    );
  }

  const gameDate =
    gameDateValue
      ? new Date(
          gameDateValue,
        )
      : null;

  if (
    gameDate &&
    Number.isNaN(
      gameDate.getTime(),
    )
  ) {
    errors.push(
      "Enter a valid game date and time.",
    );
  }

  const title =
    cleanText(
      body.title ??
        current?.title ??
        current?.game_title,
      240,
    ) ||
    `${home || "Home"} vs ${away || "Away"}`;

  const statusNote =
    cleanText(
      body.status_note ??
        current?.status_note,
      2000,
    );

  const periods =
    normalizePeriods(
      body.period_scores,
    );

  errors.push(
    ...periods.errors,
  );

  const verification =
    cleanVerification(
      body.verification_status ??
        current?.verification_status ??
        "unverified",
    );

  const requestedPublic =
    "is_public" in
    body
      ? cleanBoolean(
          body.is_public,
        )
      : cleanBoolean(
          current?.is_public,
          false,
        );

  /*
   * Completed results only become public after verification.
   * Upcoming fixtures may still be publicly visible.
   */
  const isPublic =
    status ===
      "completed" &&
    verification !==
      "verified"
      ? false
      : requestedPublic;

  const payload:
    JsonRecord = {
      event_id:
        cleanText(
          body.event_id ??
            current?.event_id,
          160,
        ),

      setup_key:
        cleanText(
          body.setup_key ??
            current?.setup_key,
          160,
        ),

      title,

      game_title:
        title,

      competition_name:
        cleanText(
          body.competition_name ??
            current?.competition_name,
          180,
        ),

      league_id:
        cleanText(
          body.league_id ??
            current?.league_id,
          100,
        ),

      season_label:
        cleanText(
          body.season_label ??
            current?.season_label,
          100,
        ),

      division:
        cleanText(
          body.division ??
            current?.division,
          100,
        ),

      home_team_id:
        cleanText(
          body.home_team_id ??
            current?.home_team_id,
          100,
        ),

      away_team_id:
        cleanText(
          body.away_team_id ??
            current?.away_team_id,
          100,
        ),

      home_team_name:
        home,

      away_team_name:
        away,

      /*
       * Legacy aliases remain populated for old pages.
       */
      team_name:
        home,

      opponent:
        away,

      opponent_name:
        away,

      game_format:
        cleanText(
          body.game_format ??
            current?.game_format,
          80,
        ) ||
        "5v5",

      match_type:
        cleanText(
          body.match_type ??
            current?.match_type ??
            body.game_format ??
            current?.game_format,
          80,
        ) ||
        "5v5",

      game_stage:
        cleanText(
          body.game_stage ??
            current?.game_stage,
          100,
        ) ||
        "Game",

      game_date:
        gameDate?.toISOString() ??
        null,

      date:
        gameDate?.toISOString() ??
        null,

      venue:
        cleanText(
          body.venue ??
            current?.venue,
          240,
        ),

      court:
        cleanText(
          body.court ??
            current?.court,
          120,
        ),

      location:
        cleanText(
          body.location ??
            current?.location,
          240,
        ),

      officials:
        cleanText(
          body.officials ??
            current?.officials,
          2000,
        ),

      table_officials:
        cleanText(
          body.table_officials ??
            current?.table_officials,
          2000,
        ),

      notes:
        cleanText(
          body.notes ??
            current?.notes,
          5000,
        ),

      status,

      status_note:
        statusNote,

      verification_status:
        verification,

      is_public:
        isPublic,

      is_upcoming:
        [
          "upcoming",
          "live",
        ].includes(
          status,
        ),

      home_score:
        homeScore,

      team_score:
        homeScore,

      fackts_score:
        homeScore,

      away_score:
        awayScore,

      opponent_score:
        awayScore,

      updated_at:
        new Date().toISOString(),
    };

  if (
    periods.supplied
  ) {
    payload.period_scores =
      periods.value;
  } else if (
    current &&
    "period_scores" in
      current
  ) {
    payload.period_scores =
      current.period_scores;
  }

  return {
    errors,
    status,
    statusNote,
    verification,
    isPublic,
    payload,
  };
}

function normalizeBoxScoreLine(
  row: JsonRecord,
) {
  const id =
    cleanText(
      row.id,
      100,
    );

  const side =
    String(
      row.team_side ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    side !== "home" &&
    side !== "away"
  ) {
    throw new Error(
      "Every box-score row must be assigned to home or away.",
    );
  }

  const displayName =
    cleanText(
      row.display_name,
      180,
    );

  if (
    !displayName
  ) {
    throw new Error(
      "Every box-score row requires a player name.",
    );
  }

  const identityType =
    IDENTITY_TYPES.includes(
      row.identity_type,
    )
      ? row.identity_type
      : row.player_id
        ? "canonical_player"
        : row.roster_member_id
          ? "team_roster"
          : "game_only";

  const offensiveRebounds =
    whole(
      row.offensive_rebounds,
    );

  const defensiveRebounds =
    whole(
      row.defensive_rebounds,
    );

  const twoMade =
    whole(
      row.two_made,
    );

  const twoAttempted =
    Math.max(
      twoMade,
      whole(
        row.two_attempted,
      ),
    );

  const threeMade =
    whole(
      row.three_made,
    );

  const threeAttempted =
    Math.max(
      threeMade,
      whole(
        row.three_attempted,
      ),
    );

  const ftMade =
    whole(
      row.ft_made,
    );

  const ftAttempted =
    Math.max(
      ftMade,
      whole(
        row.ft_attempted,
      ),
    );

  return {
    id,

    team_side:
      side as TeamSide,

    team_name:
      cleanText(
        row.team_name,
        180,
      ),

    team_id:
      cleanText(
        row.team_id,
        100,
      ),

    roster_member_id:
      cleanText(
        row.roster_member_id,
        100,
      ),

    player_id:
      cleanText(
        row.player_id,
        100,
      ),

    identity_type:
      identityType,

    display_name:
      displayName,

    jersey_number:
      cleanText(
        row.jersey_number,
        24,
      ),

    position:
      cleanText(
        row.position,
        80,
      ),

    is_starter:
      cleanBoolean(
        row.is_starter,
        false,
      ),

    minutes:
      decimal(
        row.minutes,
      ),

    points:
      whole(
        row.points,
      ),

    field_goals_made:
      twoMade +
      threeMade,

    field_goals_attempted:
      twoAttempted +
      threeAttempted,

    two_made:
      twoMade,

    two_attempted:
      twoAttempted,

    three_made:
      threeMade,

    three_attempted:
      threeAttempted,

    ft_made:
      ftMade,

    ft_attempted:
      ftAttempted,

    offensive_rebounds:
      offensiveRebounds,

    defensive_rebounds:
      defensiveRebounds,

    rebounds:
      offensiveRebounds +
        defensiveRebounds ||
      whole(
        row.rebounds,
      ),

    assists:
      whole(
        row.assists,
      ),

    turnovers:
      whole(
        row.turnovers,
      ),

    steals:
      whole(
        row.steals,
      ),

    blocks:
      whole(
        row.blocks,
      ),

    fouls:
      whole(
        row.fouls,
      ),

    fouls_drawn:
      whole(
        row.fouls_drawn,
      ),

    plus_minus:
      whole(
        row.plus_minus,
        true,
      ),

    efficiency:
      row.efficiency ===
        null ||
      row.efficiency ===
        undefined ||
      row.efficiency ===
        ""
        ? null
        : Number(
            row.efficiency,
          ),

    pir:
      row.pir ===
        null ||
      row.pir ===
        undefined ||
      row.pir ===
        ""
        ? null
        : Number(
            row.pir,
          ),

    player_of_game:
      cleanBoolean(
        row.player_of_game,
        false,
      ),

    period_values:
      row.period_values &&
      typeof row.period_values ===
        "object" &&
      !Array.isArray(
        row.period_values,
      )
        ? row.period_values
        : {},

    extra_stats:
      row.extra_stats &&
      typeof row.extra_stats ===
        "object" &&
      !Array.isArray(
        row.extra_stats,
      )
        ? row.extra_stats
        : {},
  };
}

async function loadDetail(
  db: any,
  id: string,
  access: any,
) {
  const gameResult =
    await db
      .from(
        "games",
      )
      .select("*")
      .eq(
        "id",
        id,
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
    return {
      error:
        "Game not found.",
      status: 404,
    };
  }

  if (
    access.assignments &&
    !access.assignments.some(
      (
        assignment: any,
      ) =>
        assignmentMatchesGame(
          assignment,
          gameResult.data,
        ),
    )
  ) {
    return {
      error:
        "You cannot access this game.",
      status: 403,
    };
  }

  const [
    linesResult,
    leaguesResult,
    teamsResult,
    eventsResult,
  ] =
    await Promise.all([
      db
        .from(
          "game_box_score_lines",
        )
        .select("*")
        .eq(
          "game_id",
          id,
        )
        .order(
          "team_side",
        )
        .order(
          "jersey_number",
        )
        .order(
          "display_name",
        ),

      db
        .from(
          "leagues",
        )
        .select("*")
        .order(
          "name",
        ),

      db
        .from(
          "team_profiles",
        )
        .select(
          "id,name,short_name,slug",
        )
        .order(
          "name",
        ),

      db
        .from(
          "event_case_studies",
        )
        .select(
          "event_id,title,start_date,end_date,is_public",
        )
        .order(
          "start_date",
          {
            ascending:
              false,
          },
        ),
    ]);

  for (
    const result of [
      linesResult,
      leaguesResult,
      teamsResult,
      eventsResult,
    ]
  ) {
    if (
      result.error
    ) {
      throw result.error;
    }
  }

  return {
    game: {
      ...gameResult.data,

      status:
        normalizedStatus(
          gameResult.data
            .status,
        ),
    },

    box_score_lines:
      linesResult.data ??
      [],

    leagues:
      leaguesResult.data ??
      [],

    teams:
      teamsResult.data ??
      [],

    events:
      eventsResult.data ??
      [],
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    const access =
      await gamesAccess(
        false,
      );

    if (
      !access.allowed ||
      !access.profile
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Games access is required.",
        },
        {
          status: 403,
        },
      );
    }

    const admin =
      createSupabaseAdminClient();

    const db =
      admin as any;

    const detailId =
      cleanText(
        request.nextUrl
          .searchParams
          .get(
            "id",
          ),
        100,
      );

    if (detailId) {
      const detail =
        await loadDetail(
          db,
          detailId,
          access,
        );

      if (
        "error" in
        detail
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              detail.error,
          },
          {
            status:
              detail.status,
          },
        );
      }

      return NextResponse.json({
        ok: true,
        ...detail,
      });
    }

    const eventId =
      cleanText(
        request.nextUrl
          .searchParams
          .get(
            "event_id",
          ),
        160,
      );

    const status =
      cleanStatus(
        request.nextUrl
          .searchParams
          .get(
            "status",
          ),
      );

    const from =
      cleanText(
        request.nextUrl
          .searchParams
          .get(
            "date_from",
          ),
        30,
      );

    const to =
      cleanText(
        request.nextUrl
          .searchParams
          .get(
            "date_to",
          ),
        30,
      );

    const query =
      cleanText(
        request.nextUrl
          .searchParams
          .get(
            "q",
          ),
        180,
      )?.toLowerCase() ??
      "";

    const participant =
      cleanText(
        request.nextUrl
          .searchParams
          .get(
            "participant",
          ),
        180,
      )?.toLowerCase() ??
      "";

    let gamesQuery =
      db
        .from(
          "games",
        )
        .select("*")
        .order(
          "game_date",
          {
            ascending:
              false,
          },
        )
        .limit(
          1000,
        );

    if (eventId) {
      gamesQuery =
        gamesQuery.eq(
          "event_id",
          eventId,
        );
    }

    if (status) {
      gamesQuery =
        gamesQuery.eq(
          "status",
          status,
        );
    }

    if (from) {
      gamesQuery =
        gamesQuery.gte(
          "game_date",
          `${from}T00:00:00`,
        );
    }

    if (to) {
      gamesQuery =
        gamesQuery.lte(
          "game_date",
          `${to}T23:59:59.999`,
        );
    }

    const gamesResult =
      await gamesQuery;

    if (
      gamesResult.error
    ) {
      throw gamesResult.error;
    }

    let games =
      (
        gamesResult.data ??
        []
      ).map(
        (
          game: JsonRecord,
        ) => ({
          ...game,

          status:
            normalizedStatus(
              game.status,
            ),
        }),
      );

    if (
      access.assignments
    ) {
      games =
        games.filter(
          (
            game: JsonRecord,
          ) =>
            access.assignments?.some(
              (
                assignment: any,
              ) =>
                assignmentMatchesGame(
                  assignment,
                  game,
                ),
            ),
        );
    }

    const gameIds =
      games.map(
        (
          game: JsonRecord,
        ) =>
          String(
            game.id,
          ),
      );

    const legacyOneOnOneIds =
      games
        .map(
          (
            game: JsonRecord,
          ) =>
            String(
              game.legacy_one_on_one_id ??
                "",
            ),
        )
        .filter(
          Boolean,
        );

    const [
      eventsResult,
      rostersResult,
      legacyMediaResult,
      gameMediaLinksResult,
      oneOnOneMediaLinksResult,
    ] =
      await Promise.all([
        db
          .from(
            "event_case_studies",
          )
          .select(
            "event_id,title,start_date,end_date,is_public",
          )
          .order(
            "start_date",
            {
              ascending:
                false,
            },
          ),

        gameIds.length
          ? db
              .from(
                "game_rosters",
              )
              .select(
                "game_id,player_id,team_side,roster_status",
              )
              .in(
                "game_id",
                gameIds,
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        gameIds.length
          ? db
              .from(
                "game_media",
              )
              .select(
                "id,game_id",
              )
              .in(
                "game_id",
                gameIds,
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        gameIds.length
          ? db
              .from(
                "media_links",
              )
              .select(
                "asset_id,owner_id",
              )
              .eq(
                "owner_type",
                "game",
              )
              .in(
                "owner_id",
                gameIds,
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        legacyOneOnOneIds.length
          ? db
              .from(
                "media_links",
              )
              .select(
                "asset_id,owner_id",
              )
              .eq(
                "owner_type",
                "one_on_one",
              )
              .in(
                "owner_id",
                legacyOneOnOneIds,
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

    for (
      const result of [
        eventsResult,
        rostersResult,
        legacyMediaResult,
        gameMediaLinksResult,
        oneOnOneMediaLinksResult,
      ]
    ) {
      if (
        result.error
      ) {
        throw result.error;
      }
    }

    const playerIds =
      Array.from(
        new Set(
          (
            rostersResult.data ??
            []
          )
            .map(
              (
                row: JsonRecord,
              ) =>
                row.player_id,
            )
            .filter(
              Boolean,
            ),
        ),
      );

    const playersResult =
      playerIds.length
        ? await db
            .from(
              "players",
            )
            .select(
              "id,full_name,name,nickname,player_type",
            )
            .in(
              "id",
              playerIds,
            )
        : {
            data: [],
            error: null,
          };

    if (
      playersResult.error
    ) {
      throw playersResult.error;
    }

    const playersById =
      new Map(
        (
          playersResult.data ??
          []
        ).map(
          (
            player: JsonRecord,
          ) => [
            player.id,
            player,
          ],
        ),
      );

    const enriched =
      games
        .map(
          (
            game: JsonRecord,
          ) => {
            const roster =
              (
                rostersResult.data ??
                []
              )
                .filter(
                  (
                    row: JsonRecord,
                  ) =>
                    String(
                      row.game_id,
                    ) ===
                    String(
                      game.id,
                    ),
                )
                .map(
                  (
                    row: JsonRecord,
                  ) => ({
                    ...row,

                    person:
                      playersById.get(
                        row.player_id,
                      ) ??
                      null,
                  }),
                );

            const canonicalAssetIds =
              new Set([
                ...(
                  gameMediaLinksResult.data ??
                  []
                )
                  .filter(
                    (
                      row: JsonRecord,
                    ) =>
                      String(
                        row.owner_id,
                      ) ===
                      String(
                        game.id,
                      ),
                  )
                  .map(
                    (
                      row: JsonRecord,
                    ) =>
                      String(
                        row.asset_id,
                      ),
                  ),

                ...(
                  oneOnOneMediaLinksResult.data ??
                  []
                )
                  .filter(
                    (
                      row: JsonRecord,
                    ) =>
                      String(
                        row.owner_id,
                      ) ===
                      String(
                        game.legacy_one_on_one_id ??
                          "",
                      ),
                  )
                  .map(
                    (
                      row: JsonRecord,
                    ) =>
                      String(
                        row.asset_id,
                      ),
                  ),
              ]);

            const legacyCount =
              (
                legacyMediaResult.data ??
                []
              ).filter(
                (
                  row: JsonRecord,
                ) =>
                  String(
                    row.game_id,
                  ) ===
                  String(
                    game.id,
                  ),
              ).length;

            return {
              ...game,

              roster_participants:
                roster,

              roster_count:
                roster.filter(
                  (
                    row: JsonRecord,
                  ) =>
                    row.roster_status !==
                    "withdrawn",
                ).length,

              media_count:
                Math.max(
                  canonicalAssetIds.size,
                  legacyCount,
                ),
            };
          },
        )
        .filter(
          (
            game: JsonRecord,
          ) => {
            const names =
              game.roster_participants.map(
                (
                  row: JsonRecord,
                ) =>
                  row.person
                    ?.full_name ||
                  row.person
                    ?.name ||
                  row.person
                    ?.nickname ||
                  "",
              );

            const haystack = [
              game.title,
              game.home_team_name,
              game.away_team_name,
              game.competition_name,
              game.season_label,
              game.division,
              game.game_stage,
              game.venue,
              ...names,
            ]
              .join(" ")
              .toLowerCase();

            const teamHaystack = [
              game.home_team_name,
              game.away_team_name,
              ...names,
            ]
              .join(" ")
              .toLowerCase();

            return (
              (!query ||
                haystack.includes(
                  query,
                )) &&
              (!participant ||
                teamHaystack.includes(
                  participant,
                ))
            );
          },
        );

    return NextResponse.json({
      ok: true,

      games:
        enriched,

      events:
        eventsResult.data ??
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
            : "Games could not be loaded.",
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
  try {
    const body =
      (await request.json()) as JsonRecord;

    const rows =
      Array.isArray(
        body.games,
      )
        ? body.games
        : [body];

    if (
      !rows.length ||
      rows.length > 200
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bulk scheduling supports 1 to 200 games at a time.",
        },
        {
          status: 400,
        },
      );
    }

    const eventIds =
      new Set(
        rows
          .map(
            (
              row,
            ) =>
              cleanText(
                (
                  row as JsonRecord
                ).event_id,
                160,
              ),
          )
          .filter(
            Boolean,
          ),
      );

    if (
      rows.length > 1 &&
      (eventIds.size !==
        1 ||
        !Array.from(
          eventIds,
        )[0])
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bulk scheduling requires one event for the entire batch.",
        },
        {
          status: 400,
        },
      );
    }

    const normalizedRows =
      rows.map(
        (
          row,
        ) =>
          gameMutationPayload(
            row as JsonRecord,
          ),
      );

    const errors =
      normalizedRows.flatMap(
        (
          row,
          index,
        ) =>
          row.errors.map(
            (
              error,
            ) =>
              `Game ${index + 1}: ${error}`,
          ),
      );

    const keys =
      normalizedRows
        .map(
          (
            row,
          ) =>
            String(
              row.payload.setup_key ??
                "",
            ),
        )
        .filter(
          Boolean,
        );

    if (
      new Set(
        keys,
      ).size !==
      keys.length
    ) {
      errors.push(
        "Bulk rows must not repeat the same setup key.",
      );
    }

    if (
      errors.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            errors[0],

          errors,
        },
        {
          status: 400,
        },
      );
    }

    const access =
      await gamesAccess(
        true,
        normalizedRows[0]
          .payload,
      );

    if (
      !access.allowed ||
      !access.user ||
      !access.profile
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "You cannot schedule games for this event or team.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      access.assignments &&
      normalizedRows.some(
        (
          row,
        ) =>
          !access.assignments?.some(
            (
              assignment: any,
            ) =>
              assignmentMatchesGame(
                assignment,
                row.payload,
              ),
          ),
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "One or more games fall outside your assigned scope.",
        },
        {
          status: 403,
        },
      );
    }

    const admin =
      createSupabaseAdminClient();

    const db =
      admin as any;

    const eventId =
      normalizedRows[0]
        .payload
        .event_id;

    const eventResult =
      eventId
        ? await db
            .from(
              "event_case_studies",
            )
            .select(
              "is_public",
            )
            .eq(
              "event_id",
              eventId,
            )
            .maybeSingle()
        : {
            data: null,
            error: null,
          };

    if (
      eventResult.error
    ) {
      throw eventResult.error;
    }

const now =
  new Date().toISOString();

const profileId =
  access.profile.id;

const payloads =
  normalizedRows.map(
    (
      row,
    ) => ({
      ...row.payload,

      setup_key:
        row.payload
          .setup_key ||
        `bulk-${crypto.randomUUID()}`,

      is_public:
        row.status ===
        "completed"
          ? row.isPublic
          : eventResult
                .data
                ?.is_public ===
              true,

      status_changed_at:
        now,

      status_changed_by:
        profileId,

      created_at:
        now,
    }),
  );

    const result =
      await db
        .from(
          "games",
        )
        .upsert(
          payloads,
          {
            onConflict:
              "event_id,setup_key",
          },
        )
        .select("*");

    if (
      result.error
    ) {
      throw result.error;
    }

    const auditAssignment =
      access.assignments?.find(
        (
          assignment: any,
        ) =>
          assignmentMatchesGame(
            assignment,
            normalizedRows[0]
              .payload,
          ),
      );

    await recordAdminAuditEvent(
      access.supabase,
      {
        action:
          rows.length > 1
            ? "bulk_schedule"
            : "create",

        entityType:
          "game",

        capability:
          "games",

        resourceType:
          auditAssignment?.resource_type ??
          (eventId
            ? "event"
            : null),

        resourceId:
          auditAssignment?.resource_id ??
          eventId ??
          null,

        after:
          result.data,

        metadata: {
          count:
            result.data
              ?.length ??
            0,

          source:
            "games_admin",
        },
      },
    );

    return NextResponse.json(
      {
        ok: true,

        games:
          result.data ??
          [],

        message: `${
          result.data
            ?.length ??
          0
        } game${
          result.data
            ?.length ===
          1
            ? ""
            : "s"
        } scheduled.`,
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
            : "Games could not be scheduled.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as JsonRecord;

    const id =
      cleanText(
        body.id,
        100,
      );

    const expectedVersion =
      Number(
        body.expected_version,
      );

    if (
      !id ||
      !Number.isInteger(
        expectedVersion,
      ) ||
      expectedVersion < 1
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Game ID and current version are required.",
        },
        {
          status: 400,
        },
      );
    }

    const access =
      await gamesAccess(
        true,
      );

    if (
      !access.allowed ||
      !access.user ||
      !access.profile
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "You cannot update this game.",
        },
        {
          status: 403,
        },
      );
    }

    const admin =
      createSupabaseAdminClient();

    const db =
      admin as any;

    const existing =
      await db
        .from(
          "games",
        )
        .select("*")
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      existing.error
    ) {
      throw existing.error;
    }

    if (
      !existing.data
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Game not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      access.assignments &&
      !access.assignments.some(
        (
          assignment: any,
        ) =>
          assignmentMatchesGame(
            assignment,
            existing.data,
          ),
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "You cannot update this game.",
        },
        {
          status: 403,
        },
      );
    }

    const currentStatus =
      normalizedStatus(
        existing.data
          .status,
      );

    const mutation =
      gameMutationPayload(
        body,
        existing.data,
      );

    if (
      !TRANSITIONS[
        currentStatus
      ].includes(
        mutation.status,
      )
    ) {
      mutation.errors.push(
        `A ${currentStatus} game cannot move directly to ${mutation.status}.`,
      );
    }

    if (
      mutation.status !==
        currentStatus &&
      [
        "postponed",
        "cancelled",
        "upcoming",
      ].includes(
        mutation.status,
      ) &&
      !mutation.statusNote
    ) {
      mutation.errors.push(
        "Add a status note for postponement, cancellation or reopening.",
      );
    }

    const suppliedLines =
      Array.isArray(
        body.box_score_lines,
      )
        ? body.box_score_lines.map(
            (
              row,
            ) =>
              normalizeBoxScoreLine(
                row as JsonRecord,
              ),
          )
        : null;

    const deletedIds =
      Array.isArray(
        body.deleted_box_score_line_ids,
      )
        ? Array.from(
            new Set(
              body.deleted_box_score_line_ids
                .map(
                  (
                    value: unknown,
                  ) =>
                    cleanText(
                      value,
                      100,
                    ),
                )
                .filter(
                  Boolean,
                ),
            ),
          )
        : [];

    let existingLines:
      JsonRecord[] = [];

    if (
      suppliedLines ||
      deletedIds.length
    ) {
      const existingLinesResult =
        await db
          .from(
            "game_box_score_lines",
          )
          .select("*")
          .eq(
            "game_id",
            id,
          );

      if (
        existingLinesResult.error
      ) {
        throw existingLinesResult.error;
      }

      existingLines =
        existingLinesResult.data ??
        [];

      const existingIds =
        new Set(
          existingLines.map(
            (
              line,
            ) =>
              String(
                line.id,
              ),
          ),
        );

      for (
        const deletedId of
        deletedIds
      ) {
        if (
          !existingIds.has(
            String(
              deletedId,
            ),
          )
        ) {
          mutation.errors.push(
            "One deleted box-score row does not belong to this game.",
          );
        }
      }

      for (
        const line of
        suppliedLines ??
        []
      ) {
        if (
          line.id &&
          !existingIds.has(
            line.id,
          )
        ) {
          mutation.errors.push(
            `${line.display_name} does not belong to this game's canonical box score.`,
          );
        }
      }

      /*
       * Build the prospective box score so we can enforce
       * a single explicit Player of Game before writing.
       */
      const prospective =
        new Map<
          string,
          JsonRecord
        >();

      existingLines.forEach(
        (
          line,
        ) => {
          if (
            !deletedIds.includes(
              String(
                line.id,
              ),
            )
          ) {
            prospective.set(
              String(
                line.id,
              ),
              line,
            );
          }
        },
      );

      (
        suppliedLines ??
        []
      ).forEach(
        (
          line,
          index,
        ) => {
          prospective.set(
            line.id ||
              `new-${index}`,
            line,
          );
        },
      );

      const pogCount =
        Array.from(
          prospective.values(),
        ).filter(
          (
            line,
          ) =>
            cleanBoolean(
              line.player_of_game,
              false,
            ),
        ).length;

      if (
        pogCount > 1
      ) {
        mutation.errors.push(
          "Only one player can be marked Player of Game.",
        );
      }
    }

    if (
      mutation.errors.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            mutation.errors[0],

          errors:
            mutation.errors,
        },
        {
          status: 400,
        },
      );
    }

    const statusChanged =
      mutation.status !==
      currentStatus;

    const now =
      new Date().toISOString();

    const verificationChanged =
      mutation.verification !==
      cleanVerification(
        existing.data
          .verification_status,
      );

    const gamePayload = {
      ...mutation.payload,

      verified_at:
        mutation.verification ===
        "verified"
          ? existing.data
                .verified_at ||
            now
          : null,

      verified_by:
        mutation.verification ===
        "verified"
          ? existing.data
                .verified_by ||
            access.profile.id
          : null,

      status_changed_at:
        statusChanged
          ? now
          : existing.data
              .status_changed_at,

      status_changed_by:
        statusChanged
          ? access.profile.id
          : existing.data
              .status_changed_by,
    };

    const result =
      await db
        .from(
          "games",
        )
        .update(
          gamePayload,
        )
        .eq(
          "id",
          id,
        )
        .eq(
          "version",
          expectedVersion,
        )
        .select("*")
        .maybeSingle();

    if (
      result.error
    ) {
      throw result.error;
    }

    if (
      !result.data
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "This game changed in another session. Reload before saving again.",

          conflict:
            true,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * =================================================
     * CANONICAL BOX SCORE EDITING
     * =================================================
     */
    if (
      deletedIds.length
    ) {
      const deletion =
        await db
          .from(
            "game_box_score_lines",
          )
          .delete()
          .eq(
            "game_id",
            id,
          )
          .in(
            "id",
            deletedIds,
          );

      if (
        deletion.error
      ) {
        throw deletion.error;
      }
    }

    if (
      suppliedLines
    ) {
      const existingById =
        new Map(
          existingLines.map(
            (
              line,
            ) => [
              String(
                line.id,
              ),
              line,
            ],
          ),
        );

      for (
        const line of
        suppliedLines
      ) {
        const linePublic =
          mutation.status ===
            "completed" &&
          mutation.verification ===
            "verified" &&
          mutation.isPublic;

        const lineVerification =
          mutation.verification ===
          "verified"
            ? "verified"
            : mutation.verification ===
                "disputed"
              ? "disputed"
              : "pending";

        if (
          line.id
        ) {
          const source =
            existingById.get(
              line.id,
            );

          if (!source) {
            continue;
          }

          const updateResult =
            await db
              .from(
                "game_box_score_lines",
              )
              .update({
                team_side:
                  line.team_side,

                team_name:
                  line.team_name ||
                  (line.team_side ===
                  "home"
                    ? result.data
                        .home_team_name
                    : result.data
                        .away_team_name),

                team_id:
                  line.team_id,

                roster_member_id:
                  line.roster_member_id,

                player_id:
                  line.player_id,

                identity_type:
                  line.identity_type,

                display_name:
                  line.display_name,

                jersey_number:
                  line.jersey_number,

                position:
                  line.position,

                is_starter:
                  line.is_starter,

                minutes:
                  line.minutes,

                points:
                  line.points,

                field_goals_made:
                  line.field_goals_made,

                field_goals_attempted:
                  line.field_goals_attempted,

                two_made:
                  line.two_made,

                two_attempted:
                  line.two_attempted,

                three_made:
                  line.three_made,

                three_attempted:
                  line.three_attempted,

                ft_made:
                  line.ft_made,

                ft_attempted:
                  line.ft_attempted,

                offensive_rebounds:
                  line.offensive_rebounds,

                defensive_rebounds:
                  line.defensive_rebounds,

                rebounds:
                  line.rebounds,

                assists:
                  line.assists,

                turnovers:
                  line.turnovers,

                steals:
                  line.steals,

                blocks:
                  line.blocks,

                fouls:
                  line.fouls,

                fouls_drawn:
                  line.fouls_drawn,

                plus_minus:
                  line.plus_minus,

                efficiency:
                  line.efficiency,

                pir:
                  line.pir,

                player_of_game:
                  line.player_of_game,

                period_values:
                  line.period_values,

                extra_stats:
                  line.extra_stats,

                verification_status:
                  lineVerification,

                is_public:
                  linePublic,

                verified_at:
                  lineVerification ===
                  "verified"
                    ? source
                          .verified_at ||
                      now
                    : null,

                verified_by:
                  lineVerification ===
                  "verified"
                    ? source
                          .verified_by ||
                      access.user.id
                    : null,

                updated_at:
                  now,
              })
              .eq(
                "id",
                line.id,
              )
              .eq(
                "game_id",
                id,
              );

          if (
            updateResult.error
          ) {
            throw updateResult.error;
          }
        } else {
          const insertResult =
            await db
              .from(
                "game_box_score_lines",
              )
              .insert({
                game_id:
                  id,

                team_side:
                  line.team_side,

                team_name:
                  line.team_name ||
                  (line.team_side ===
                  "home"
                    ? result.data
                        .home_team_name
                    : result.data
                        .away_team_name),

                team_id:
                  line.team_id,

                roster_member_id:
                  line.roster_member_id,

                player_id:
                  line.player_id,

                identity_type:
                  line.identity_type,

                display_name:
                  line.display_name,

                jersey_number:
                  line.jersey_number,

                position:
                  line.position,

                is_starter:
                  line.is_starter,

                minutes:
                  line.minutes,

                points:
                  line.points,

                field_goals_made:
                  line.field_goals_made,

                field_goals_attempted:
                  line.field_goals_attempted,

                two_made:
                  line.two_made,

                two_attempted:
                  line.two_attempted,

                three_made:
                  line.three_made,

                three_attempted:
                  line.three_attempted,

                ft_made:
                  line.ft_made,

                ft_attempted:
                  line.ft_attempted,

                offensive_rebounds:
                  line.offensive_rebounds,

                defensive_rebounds:
                  line.defensive_rebounds,

                rebounds:
                  line.rebounds,

                assists:
                  line.assists,

                turnovers:
                  line.turnovers,

                steals:
                  line.steals,

                blocks:
                  line.blocks,

                fouls:
                  line.fouls,

                fouls_drawn:
                  line.fouls_drawn,

                plus_minus:
                  line.plus_minus,

                efficiency:
                  line.efficiency,

                pir:
                  line.pir,

                player_of_game:
                  line.player_of_game,

                period_values:
                  line.period_values,

                extra_stats:
                  line.extra_stats,

                source_line_key:
                  `admin:${id}:${line.team_side}:${crypto.randomUUID()}`,

                source_type:
                  "admin_manual",

                verification_status:
                  lineVerification,

                is_public:
                  linePublic,

                verified_at:
                  lineVerification ===
                  "verified"
                    ? now
                    : null,

                verified_by:
                  lineVerification ===
                  "verified"
                    ? access.user.id
                    : null,

                created_at:
                  now,

                updated_at:
                  now,
              });

          if (
            insertResult.error
          ) {
            throw insertResult.error;
          }
        }
      }
    }

    /*
     * Integrity warnings do not block manual editing.
     * They tell Admin whether the canonical player points
     * reconcile with the final scoreboard.
     */
    const finalLines =
      await db
        .from(
          "game_box_score_lines",
        )
        .select(
          "team_side,points,player_of_game",
        )
        .eq(
          "game_id",
          id,
        );

    if (
      finalLines.error
    ) {
      throw finalLines.error;
    }

    const homePoints =
      (
        finalLines.data ??
        []
      )
        .filter(
          (
            line: JsonRecord,
          ) =>
            line.team_side ===
            "home",
        )
        .reduce(
          (
            total: number,
            line: JsonRecord,
          ) =>
            total +
            whole(
              line.points,
            ),
          0,
        );

    const awayPoints =
      (
        finalLines.data ??
        []
      )
        .filter(
          (
            line: JsonRecord,
          ) =>
            line.team_side ===
            "away",
        )
        .reduce(
          (
            total: number,
            line: JsonRecord,
          ) =>
            total +
            whole(
              line.points,
            ),
          0,
        );

    const integrityWarnings:
      string[] = [];

    if (
      result.data.status ===
      "completed"
    ) {
      if (
        result.data
          .home_score !==
          null &&
        homePoints !==
          Number(
            result.data
              .home_score,
          )
      ) {
        integrityWarnings.push(
          `Home box-score points total ${homePoints}; final score is ${result.data.home_score}.`,
        );
      }

      if (
        result.data
          .away_score !==
          null &&
        awayPoints !==
          Number(
            result.data
              .away_score,
          )
      ) {
        integrityWarnings.push(
          `Away box-score points total ${awayPoints}; final score is ${result.data.away_score}.`,
        );
      }
    }

    const auditAssignment =
      access.assignments?.find(
        (
          assignment: any,
        ) =>
          assignmentMatchesGame(
            assignment,
            existing.data,
          ),
      );

    await recordAdminAuditEvent(
      access.supabase,
      {
        action:
          statusChanged
            ? "status_change"
            : "update",

        entityType:
          "game",

        entityId:
          id,

        capability:
          "games",

        resourceType:
          auditAssignment?.resource_type ??
          "game",

        resourceId:
          auditAssignment?.resource_id ??
          id,

        before:
          existing.data,

        after:
          result.data,

        metadata: {
          source:
            "full_game_editor",

          box_score_rows:
            suppliedLines
              ?.length ??
            0,

          deleted_box_score_rows:
            deletedIds.length,

          verification_changed:
            verificationChanged,

          integrity_warnings:
            integrityWarnings,
        },
      },
    );

    return NextResponse.json({
      ok: true,

      game:
        result.data,

      integrity_warnings:
        integrityWarnings,

      message:
        integrityWarnings.length
          ? `Game saved with ${integrityWarnings.length} box-score integrity warning${integrityWarnings.length === 1 ? "" : "s"}.`
          : statusChanged
            ? "Game status updated."
            : "Game record saved.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Game could not be updated.",
      },
      {
        status: 500,
      },
    );
  }
}