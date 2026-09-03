"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAdminPermission,
} from "@/app/components/AdminPermissionContext";

import {
  supabase,
} from "@/lib/supabase";
import type { GameCategory } from "@/lib/hoops/gameContext";

type GameStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "postponed"
  | "cancelled";

type TeamSide =
  | "home"
  | "away";

type TeamRow = {
  id: string;
  name: string;
  short_name?: string | null;
  slug?: string | null;
};

type LeagueRow = {
  id: string;
  name: string;
  short_name?: string | null;
  slug?: string | null;
};

type EventRow = {
  event_id: string;
  title: string;
};

type CompetitionRow = {
  id: string;
  name: string;
  short_name?: string | null;
  slug: string;
  current_season_label?: string | null;
};

type PeriodDraft = {
  period: string;
  home: string;
  away: string;
};

type GameRecord = {
  id: string;
  version?: number | null;

  title?: string | null;
  game_title?: string | null;

  event_id?: string | null;

  league_id?: string | null;
  season_label?: string | null;
  division?: string | null;

  competition_name?: string | null;
  competition_id?: string | null;
  game_category?: string | null;

  home_team_id?: string | null;
  away_team_id?: string | null;

  home_team_name?: string | null;
  away_team_name?: string | null;

  game_format?: string | null;
  match_type?: string | null;
  game_stage?: string | null;

  game_date?: string | null;
  date?: string | null;

  venue?: string | null;
  court?: string | null;
  location?: string | null;

  officials?: string | null;
  table_officials?: string | null;

  notes?: string | null;

  status?: string | null;

  home_score?: number | null;
  away_score?: number | null;

  period_scores?: unknown;

  verification_status?: string | null;

  is_public?: boolean | null;
};

type GameForm = {
  title: string;

  category: GameCategory;

  event_id: string;

  league_id: string;
  season_label: string;
  division: string;

  competition_name: string;
  competition_id: string;

  home_team_id: string;
  away_team_id: string;

  home_team_name: string;
  away_team_name: string;

  game_format: string;
  match_type: string;
  game_stage: string;

  game_date: string;

  venue: string;
  court: string;
  location: string;

  officials: string;
  table_officials: string;

  notes: string;

  status: GameStatus;

  home_score: string;
  away_score: string;

  verification_status: string;

  is_public: boolean;
};

type BoxLineDraft = {
  id?: string;

  team_side: TeamSide;

  team_name: string;

  team_id: string;

  roster_member_id: string;
  player_id: string;

  identity_type:
    | "canonical_player"
    | "team_roster"
    | "game_only"
    | "guest";

  display_name: string;

  jersey_number: string;
  position: string;

  is_starter: boolean;

  minutes: string;

  points: string;

  two_made: string;
  two_attempted: string;

  three_made: string;
  three_attempted: string;

  ft_made: string;
  ft_attempted: string;

  offensive_rebounds: string;
  defensive_rebounds: string;
  rebounds: string;

  assists: string;
  turnovers: string;
  steals: string;
  blocks: string;

  fouls: string;
  fouls_drawn: string;

  plus_minus: string;

  efficiency: string;
  pir: string;

  player_of_game: boolean;
};

const CONTROL =
  "w-full min-w-0 rounded-xl border border-white/10 bg-[#020817] px-3 py-3 text-sm text-white outline-none transition focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON =
  "rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[.04em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";

const SECONDARY =
  "rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-xs font-black uppercase text-slate-300 transition hover:border-orange-400/40";

const EMPTY_FORM: GameForm = {
  title: "",

  category: "other",

  event_id: "",

  league_id: "",
  season_label: "2026",
  division: "",

  competition_name:
    "FACKTS Hoops",
  competition_id: "",

  home_team_id: "",
  away_team_id: "",

  home_team_name: "",
  away_team_name: "",

  game_format: "5v5",
  match_type: "5v5",
  game_stage: "Game",

  game_date: "",

  venue: "",
  court: "",
  location: "",

  officials: "",
  table_officials: "",

  notes: "",

  status: "upcoming",

  home_score: "",
  away_score: "",

  verification_status:
    "unverified",

  is_public: true,
};

function toDateTimeLocal(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      offset *
        60 *
        1000,
  )
    .toISOString()
    .slice(
      0,
      16,
    );
}

function deriveCategory(
  game: GameRecord,
): GameCategory {
  if (
    [
      "one_on_one",
      "league",
      "court_takeover",
      "event",
      "competition",
      "friendly",
      "other",
    ].includes(game.game_category || "")
  ) {
    return game.game_category as GameCategory;
  }

  const text = [
    game.title,
    game.game_title,
    game.competition_name,
    game.game_format,
    game.match_type,
    game.game_stage,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /court takeover/.test(
      text,
    ) ||
    /\btakeover\b/.test(
      text,
    )
  ) {
    return "court_takeover";
  }

  if (
    /\b1\s*v\s*1\b/.test(
      text,
    ) ||
    /one[\s-]?on[\s-]?one/.test(
      text,
    ) ||
    /fackts kings/.test(
      text,
    )
  ) {
    return "one_on_one";
  }

  if (game.league_id) {
    return "league";
  }

  if (
    /\bfriendly\b/.test(
      text,
    ) ||
    /\bscrimmage\b/.test(
      text,
    )
  ) {
    return "friendly";
  }

  if (game.event_id) {
    return "event";
  }

  if (
    game.competition_name &&
    !/^fackts hoops$/i.test(
      game.competition_name,
    )
  ) {
    return "competition";
  }

  return "other";
}

function periodsFromGame(
  value: unknown,
) {
  if (
    !Array.isArray(value)
  ) {
    return defaultPeriods();
  }

  const result =
    value
      .slice(0, 12)
      .map(
        (
          item: any,
          index,
        ) => ({
          period:
            String(
              item?.period ??
                item?.label ??
                (index < 4
                  ? `Q${index + 1}`
                  : `OT${index - 3}`),
            ),

          home:
            item?.home ===
              null ||
            item?.home ===
              undefined
              ? ""
              : String(
                  item.home,
                ),

          away:
            item?.away ===
              null ||
            item?.away ===
              undefined
              ? ""
              : String(
                  item.away,
                ),
        }),
      );

  return result.length
    ? result
    : defaultPeriods();
}

function defaultPeriods(): PeriodDraft[] {
  return [
    {
      period: "Q1",
      home: "",
      away: "",
    },
    {
      period: "Q2",
      home: "",
      away: "",
    },
    {
      period: "Q3",
      home: "",
      away: "",
    },
    {
      period: "Q4",
      home: "",
      away: "",
    },
  ];
}

function boxLineFromRow(
  row: any,
): BoxLineDraft {
  const value = (
    input: unknown,
  ) =>
    input === null ||
    input === undefined
      ? ""
      : String(input);

  return {
    id:
      row.id
        ? String(row.id)
        : undefined,

    team_side:
      row.team_side ===
      "away"
        ? "away"
        : "home",

    team_name:
      value(
        row.team_name,
      ),

    team_id:
      value(
        row.team_id,
      ),

    roster_member_id:
      value(
        row.roster_member_id,
      ),

    player_id:
      value(
        row.player_id,
      ),

    identity_type:
      row.identity_type ||
      (row.player_id
        ? "canonical_player"
        : row.roster_member_id
          ? "team_roster"
          : "game_only"),

    display_name:
      value(
        row.display_name,
      ),

    jersey_number:
      value(
        row.jersey_number,
      ),

    position:
      value(
        row.position,
      ),

    is_starter:
      Boolean(
        row.is_starter,
      ),

    minutes:
      value(
        row.minutes,
      ),

    points:
      value(
        row.points,
      ),

    two_made:
      value(
        row.two_made,
      ),

    two_attempted:
      value(
        row.two_attempted,
      ),

    three_made:
      value(
        row.three_made,
      ),

    three_attempted:
      value(
        row.three_attempted,
      ),

    ft_made:
      value(
        row.ft_made,
      ),

    ft_attempted:
      value(
        row.ft_attempted,
      ),

    offensive_rebounds:
      value(
        row.offensive_rebounds,
      ),

    defensive_rebounds:
      value(
        row.defensive_rebounds,
      ),

    rebounds:
      value(
        row.rebounds,
      ),

    assists:
      value(
        row.assists,
      ),

    turnovers:
      value(
        row.turnovers,
      ),

    steals:
      value(
        row.steals,
      ),

    blocks:
      value(
        row.blocks,
      ),

    fouls:
      value(
        row.fouls,
      ),

    fouls_drawn:
      value(
        row.fouls_drawn,
      ),

    plus_minus:
      value(
        row.plus_minus,
      ),

    efficiency:
      value(
        row.efficiency,
      ),

    pir:
      value(
        row.pir,
      ),

    player_of_game:
      Boolean(
        row.player_of_game,
      ),
  };
}

function newBoxLine(
  side: TeamSide,
  form: GameForm,
): BoxLineDraft {
  return {
    team_side:
      side,

    team_name:
      side === "home"
        ? form.home_team_name
        : form.away_team_name,

    team_id:
      side === "home"
        ? form.home_team_id
        : form.away_team_id,

    roster_member_id: "",
    player_id: "",

    identity_type:
      "game_only",

    display_name: "",

    jersey_number: "",
    position: "",

    is_starter: false,

    minutes: "",
    points: "",

    two_made: "",
    two_attempted: "",

    three_made: "",
    three_attempted: "",

    ft_made: "",
    ft_attempted: "",

    offensive_rebounds: "",
    defensive_rebounds: "",
    rebounds: "",

    assists: "",
    turnovers: "",
    steals: "",
    blocks: "",

    fouls: "",
    fouls_drawn: "",

    plus_minus: "",

    efficiency: "",
    pir: "",

    player_of_game: false,
  };
}

function scoreTotal(
  rows: BoxLineDraft[],
  side: TeamSide,
) {
  return rows
    .filter(
      (
        row,
      ) =>
        row.team_side ===
        side,
    )
    .reduce(
      (
        total,
        row,
      ) =>
        total +
        (Number(
          row.points,
        ) ||
          0),
      0,
    );
}

export default function FullGameEditorPage() {
  const {
    readOnly,
  } =
    useAdminPermission();

  const [
    gameId,
    setGameId,
  ] = useState("");

  const [
    sourceTeamId,
    setSourceTeamId,
  ] = useState("");

  const [
    sourceCategory,
    setSourceCategory,
  ] =
    useState<GameCategory>(
      "other",
    );

  const [
    initialized,
    setInitialized,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    warnings,
    setWarnings,
  ] =
    useState<string[]>([]);

  const [
    version,
    setVersion,
  ] = useState(1);

  const [
    form,
    setForm,
  ] =
    useState<GameForm>(
      EMPTY_FORM,
    );

  const [
    periods,
    setPeriods,
  ] =
    useState<PeriodDraft[]>(
      defaultPeriods(),
    );

  const [
    boxLines,
    setBoxLines,
  ] =
    useState<
      BoxLineDraft[]
    >([]);

  const [
    deletedLineIds,
    setDeletedLineIds,
  ] =
    useState<string[]>(
      [],
    );

  const [
    teams,
    setTeams,
  ] =
    useState<TeamRow[]>(
      [],
    );

  const [
    leagues,
    setLeagues,
  ] =
    useState<
      LeagueRow[]
    >([]);

  const [
    events,
    setEvents,
  ] =
    useState<EventRow[]>(
      [],
    );

  const [
    competitions,
    setCompetitions,
  ] =
    useState<CompetitionRow[]>(
      [],
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    setGameId(
      params.get(
        "game_id",
      ) || "",
    );

    setSourceTeamId(
      params.get(
        "team_id",
      ) || "",
    );

    const category =
      params.get(
        "category",
      );

    if (
      [
        "one_on_one",
        "league",
        "court_takeover",
        "event",
        "competition",
        "friendly",
        "other",
      ].includes(
        category || "",
      )
    ) {
      setSourceCategory(
        category as GameCategory,
      );
    }

    setInitialized(
      true,
    );
  }, []);

  const loadExistingGame =
    useCallback(
      async (
        id: string,
      ) => {
        setLoading(
          true,
        );

        setError("");

        const response =
          await fetch(
            `/api/admin/games?id=${encodeURIComponent(
              id,
            )}`,
            {
              cache:
                "no-store",
            },
          );

        const result =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          !response.ok ||
          !result.ok
        ) {
          setError(
            result.error ||
              "Game could not be loaded.",
          );

          setLoading(
            false,
          );

          return;
        }

        const game =
          result.game as GameRecord;

        setVersion(
          Number(
            game.version ||
              1,
          ),
        );

        setTeams(
          result.teams ||
            [],
        );

        setLeagues(
          result.leagues ||
            [],
        );

        setEvents(
          result.events ||
            [],
        );

        setCompetitions(
          result.competitions ||
            [],
        );

        setForm({
          title:
            game.title ||
            game.game_title ||
            "",

          category:
            deriveCategory(
              game,
            ),

          event_id:
            game.event_id ||
            "",

          league_id:
            game.league_id ||
            "",

          season_label:
            game.season_label ||
            "2026",

          division:
            game.division ||
            "",

          competition_name:
            game.competition_name ||
            "FACKTS Hoops",

          competition_id:
            game.competition_id ||
            "",

          home_team_id:
            game.home_team_id ||
            "",

          away_team_id:
            game.away_team_id ||
            "",

          home_team_name:
            game.home_team_name ||
            "",

          away_team_name:
            game.away_team_name ||
            "",

          game_format:
            game.game_format ||
            "5v5",

          match_type:
            game.match_type ||
            game.game_format ||
            "5v5",

          game_stage:
            game.game_stage ||
            "Game",

          game_date:
            toDateTimeLocal(
              game.game_date ||
                game.date,
            ),

          venue:
            game.venue ||
            "",

          court:
            game.court ||
            "",

          location:
            game.location ||
            "",

          officials:
            game.officials ||
            "",

          table_officials:
            game.table_officials ||
            "",

          notes:
            game.notes ||
            "",

          status:
            [
              "upcoming",
              "live",
              "completed",
              "postponed",
              "cancelled",
            ].includes(
              game.status ||
                "",
            )
              ? (game.status as GameStatus)
              : "upcoming",

          home_score:
            game.home_score ===
              null ||
            game.home_score ===
              undefined
              ? ""
              : String(
                  game.home_score,
                ),

          away_score:
            game.away_score ===
              null ||
            game.away_score ===
              undefined
              ? ""
              : String(
                  game.away_score,
                ),

          verification_status:
            game.verification_status ||
            "unverified",

          is_public:
            game.is_public !==
            false,
        });

        setPeriods(
          periodsFromGame(
            game.period_scores,
          ),
        );

        setBoxLines(
          (
            result.box_score_lines ||
            []
          ).map(
            boxLineFromRow,
          ),
        );

        setDeletedLineIds(
          [],
        );

        setLoading(
          false,
        );
      },
      [],
    );

  const loadCreationMetadata =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        const [
          gamesResponse,
          teamsResult,
          leaguesResult,
          competitionsResult,
        ] =
          await Promise.all([
            fetch(
              "/api/admin/games",
              {
                cache:
                  "no-store",
              },
            ),

            supabase
              .from(
                "team_profiles",
              )
              .select(
                "id,name,short_name,slug",
              )
              .order(
                "name",
              ),

            supabase
              .from(
                "leagues",
              )
              .select(
                "id,name,short_name,slug",
              )
              .order(
                "name",
              ),

            supabase
              .from(
                "competitions",
              )
              .select(
                "id,name,short_name,slug,current_season_label",
              )
              .eq(
                "is_public",
                true,
              )
              .order(
                "name",
              ),
          ]);

        const gamesPayload =
          await gamesResponse
            .json()
            .catch(
              () => ({}),
            );

        setEvents(
          gamesPayload.events ||
            [],
        );

        setTeams(
          (teamsResult.data ||
            []) as TeamRow[],
        );

        setLeagues(
          (leaguesResult.data ||
            []) as LeagueRow[],
        );

        const competitionRows =
          (competitionsResult.data ||
            []) as CompetitionRow[];

        setCompetitions(
          competitionRows,
        );

        const startingTeam =
          (
            teamsResult.data ||
            []
          ).find(
            (
              team: any,
            ) =>
              team.id ===
              sourceTeamId,
          ) as
            | TeamRow
            | undefined;

        setForm(
          (
            current,
          ) => ({
            ...current,

            category:
              sourceCategory,

            home_team_id:
              startingTeam?.id ||
              "",

            home_team_name:
              startingTeam?.name ||
              "",

            ...categoryDefaults(
              sourceCategory,
              current,
              competitionRows,
            ),
          }),
        );

        setLoading(
          false,
        );
      },
      [
        sourceCategory,
        sourceTeamId,
      ],
    );

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (gameId) {
      void loadExistingGame(
        gameId,
      );
    } else {
      void loadCreationMetadata();
    }
  }, [
    gameId,
    initialized,
    loadCreationMetadata,
    loadExistingGame,
  ]);

  function updateForm(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >,
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (
        current,
      ) => ({
        ...current,
        [name]: value,
      }),
    );
  }

  function selectTeam(
    side: TeamSide,
    teamId: string,
  ) {
    const team =
      teams.find(
        (
          item,
        ) =>
          item.id ===
          teamId,
      );

    setForm(
      (
        current,
      ) => ({
        ...current,

        [`${side}_team_id`]:
          teamId,

        [`${side}_team_name`]:
          team?.name ||
          (side ===
          "home"
            ? current.home_team_name
            : current.away_team_name),
      }),
    );

    setBoxLines(
      (
        current,
      ) =>
        current.map(
          (
            line,
          ) =>
            line.team_side ===
            side
              ? {
                  ...line,

                  team_id:
                    teamId,

                  team_name:
                    team?.name ||
                    line.team_name,
                }
              : line,
        ),
    );
  }

  function changeCategory(
    category: GameCategory,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        category,

        ...categoryDefaults(
          category,
          current,
          competitions,
        ),
      }),
    );
  }

  function selectCompetition(
    competitionId: string,
  ) {
    const competition =
      competitions.find(
        (item) =>
          item.id === competitionId,
      );

    setForm((current) => ({
      ...current,
      competition_id: competitionId,
      competition_name:
        competition?.name ||
        current.competition_name,
      season_label:
        current.season_label ||
        competition?.current_season_label ||
        "",
    }));
  }

  function updatePeriod(
    index: number,
    key:
      | "period"
      | "home"
      | "away",
    value: string,
  ) {
    setPeriods(
      (
        current,
      ) =>
        current.map(
          (
            period,
            periodIndex,
          ) =>
            periodIndex ===
            index
              ? {
                  ...period,
                  [key]:
                    value,
                }
              : period,
        ),
    );
  }

  function addOvertime() {
    setPeriods(
      (
        current,
      ) => [
        ...current,

        {
          period: `OT${
            Math.max(
              0,
              current.length -
                4,
            ) + 1
          }`,

          home: "",
          away: "",
        },
      ],
    );
  }

  function updateBoxLine(
    index: number,
    key:
      keyof BoxLineDraft,
    value:
      | string
      | boolean,
  ) {
    setBoxLines(
      (
        current,
      ) =>
        current.map(
          (
            line,
            lineIndex,
          ) =>
            lineIndex ===
            index
              ? {
                  ...line,
                  [key]:
                    value,
                }
              : line,
        ),
    );
  }

  function selectPlayerOfGame(
    index: number,
  ) {
    setBoxLines(
      (
        current,
      ) =>
        current.map(
          (
            line,
            lineIndex,
          ) => ({
            ...line,

            player_of_game:
              lineIndex ===
              index,
          }),
        ),
    );
  }

  function removeBoxLine(
    index: number,
  ) {
    const line =
      boxLines[index];

    if (line?.id) {
      setDeletedLineIds(
        (
          current,
        ) =>
          Array.from(
            new Set([
              ...current,
              line.id!,
            ]),
          ),
      );
    }

    setBoxLines(
      (
        current,
      ) =>
        current.filter(
          (
            _,
            lineIndex,
          ) =>
            lineIndex !==
            index,
        ),
    );
  }

  async function saveGame() {
    if (readOnly) {
      return;
    }

    setSaving(
      true,
    );

    setMessage("");
    setError("");
    setWarnings([]);

    try {
      if (
        !form.home_team_name.trim() ||
        !form.away_team_name.trim()
      ) {
        throw new Error(
          "Add both home and away team names.",
        );
      }

      if (
        form.category ===
          "league" &&
        !form.league_id
      ) {
        throw new Error(
          "Choose the league for a League Game.",
        );
      }

      if (
        form.category === "league" &&
        (!form.season_label.trim() || !form.division.trim())
      ) {
        throw new Error(
          "Add both season and division for a League Game.",
        );
      }

      if (
        form.category === "league" &&
        !form.home_team_id &&
        !form.away_team_id
      ) {
        throw new Error(
          "Link at least one registered team for a League Game.",
        );
      }

      if (
        form.category ===
          "event" &&
        !form.event_id
      ) {
        throw new Error(
          "Choose the linked event for an Event game.",
        );
      }

      if (
        ["one_on_one", "court_takeover", "competition"].includes(form.category) &&
        !form.competition_id
      ) {
        throw new Error(
          "Choose the permanent competition profile for this game.",
        );
      }

      const gameDate =
        form.game_date
          ? new Date(
              form.game_date,
            ).toISOString()
          : null;

      const title =
        form.title.trim() ||
        `${form.home_team_name.trim()} vs ${form.away_team_name.trim()}`;

      const periodPayload =
        periods
          .filter(
            (
              period,
            ) =>
              period.home !==
                "" ||
              period.away !==
                "",
          )
          .map(
            (
              period,
            ) => ({
              period:
                period.period,

              home:
                period.home,

              away:
                period.away,
            }),
          );

      const boxScorePayload =
        boxLines
          .filter(
            (
              line,
            ) =>
              line.display_name.trim(),
          )
          .map(
            (
              line,
            ) => ({
              ...line,

              team_name:
                line.team_side ===
                "home"
                  ? form.home_team_name
                  : form.away_team_name,

              team_id:
                line.team_side ===
                "home"
                  ? form.home_team_id ||
                    null
                  : form.away_team_id ||
                    null,

              roster_member_id:
                line.roster_member_id ||
                null,

              player_id:
                line.player_id ||
                null,
            }),
          );

      const payload = {
        title,

        game_category:
          form.category,

        event_id:
          form.event_id ||
          null,

        competition_name:
          form.competition_name ||
          null,

        competition_id:
          form.competition_id ||
          null,

        league_id:
          form.league_id ||
          null,

        season_label:
          form.season_label ||
          null,

        division:
          form.division ||
          null,

        home_team_id:
          form.home_team_id ||
          null,

        away_team_id:
          form.away_team_id ||
          null,

        home_team_name:
          form.home_team_name,

        away_team_name:
          form.away_team_name,

        game_format:
          form.game_format,

        match_type:
          form.match_type,

        game_stage:
          form.game_stage,

        game_date:
          gameDate,

        venue:
          form.venue ||
          null,

        court:
          form.court ||
          null,

        location:
          form.location ||
          null,

        officials:
          form.officials ||
          null,

        table_officials:
          form.table_officials ||
          null,

        notes:
          form.notes ||
          null,

        status:
          form.status,

        home_score:
          form.status ===
            "completed" ||
          form.status ===
            "live"
            ? form.home_score
            : null,

        away_score:
          form.status ===
            "completed" ||
          form.status ===
            "live"
            ? form.away_score
            : null,

        period_scores:
          periodPayload,

        verification_status:
          form.verification_status,

        is_public:
          form.is_public,
      };

      if (gameId) {
        const response =
          await fetch(
            "/api/admin/games",
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  id:
                    gameId,

                  expected_version:
                    version,

                  ...payload,

                  box_score_lines:
                    boxScorePayload,

                  deleted_box_score_line_ids:
                    deletedLineIds,
                },
              ),
            },
          );

        const result =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ||
              "Game could not be saved.",
          );
        }

        setMessage(
          result.message ||
            "Game saved.",
        );

        setWarnings(
          result.integrity_warnings ||
            [],
        );

        await loadExistingGame(
          gameId,
        );
      } else {
        const response =
          await fetch(
            "/api/admin/games",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

        const result =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ||
              "Game could not be created.",
          );
        }

        const createdId =
          result.games?.[0]
            ?.id;

        if (!createdId) {
          throw new Error(
            "Game was created but its ID could not be resolved.",
          );
        }

        /*
         * The editor now becomes THIS game only.
         */
        window.location.href =
          `/admin/games/editor?game_id=${encodeURIComponent(
            createdId,
          )}`;
      }
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
        Error
          ? saveError.message
          : "Game could not be saved.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  const homeLines =
    useMemo(
      () =>
        boxLines
          .map(
            (
              line,
              index,
            ) => ({
              line,
              index,
            }),
          )
          .filter(
            (
              item,
            ) =>
              item.line
                .team_side ===
              "home",
          ),
      [boxLines],
    );

  const awayLines =
    useMemo(
      () =>
        boxLines
          .map(
            (
              line,
              index,
            ) => ({
              line,
              index,
            }),
          )
          .filter(
            (
              item,
            ) =>
              item.line
                .team_side ===
              "away",
          ),
      [boxLines],
    );

  const homeBoxPoints =
    scoreTotal(
      boxLines,
      "home",
    );

  const awayBoxPoints =
    scoreTotal(
      boxLines,
      "away",
    );

  const editorTitle =
    gameId
      ? form.title ||
        `${form.home_team_name || "Home"} vs ${form.away_team_name || "Away"}`
      : "Create Game";

  if (
    !initialized ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-[#020712] p-6 text-white">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-slate-950 p-10 text-center">
          Loading game
          editor…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020712] px-3 py-6 text-white sm:px-5 lg:px-7">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_32%),linear-gradient(135deg,#07162b,#020617)] p-5 sm:p-7">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                {gameId
                  ? "Specific Game Editor"
                  : "New Game"}
              </p>

              <h1 className="mt-2 break-words text-3xl font-black uppercase sm:text-5xl">
                {editorTitle}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {gameId
                  ? "Only this game is loaded. Edit the canonical match, box score and publication record here."
                  : "Create this game inside the team and category selected from the Games Hub."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/games"
                className={SECONDARY}
              >
                ← Back to Games
              </Link>

              {gameId ? (
                <Link
                  href={`/games/${gameId}`}
                  target="_blank"
                  className={SECONDARY}
                >
                  Match Centre ↗
                </Link>
              ) : null}

              {!readOnly ? (
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void saveGame()
                  }
                  className={BUTTON}
                >
                  {saving
                    ? "Saving…"
                    : gameId
                      ? "Save Game"
                      : "Create Game"}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {message ? (
          <Alert type="success">
            {message}
          </Alert>
        ) : null}

        {error ? (
          <Alert type="error">
            {error}
          </Alert>
        ) : null}

        {warnings.length ? (
          <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
            <p className="text-xs font-black uppercase text-amber-200">
              Integrity warnings
            </p>

            <div className="mt-3 grid gap-2 text-sm text-amber-100">
              {warnings.map(
                (
                  warning,
                ) => (
                  <p
                    key={
                      warning
                    }
                  >
                    • {warning}
                  </p>
                ),
              )}
            </div>
          </div>
        ) : null}

        <section className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Panel
              eyebrow="Game identity"
              title="Game & Category"
            >
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <Field label="Game category">
                  <select
                    value={
                      form.category
                    }
                    disabled={
                      readOnly
                    }
                    onChange={(
                      event,
                    ) =>
                      changeCategory(
                        event
                          .target
                          .value as GameCategory,
                      )
                    }
                    className={
                      CONTROL
                    }
                  >
                    <option value="one_on_one">
                      1v1
                    </option>

                    <option value="league">
                      League Game
                    </option>

                    <option value="court_takeover">
                      Court Takeover
                    </option>

                    <option value="event">
                      Event / Tournament
                    </option>

                    <option value="competition">
                      Competition
                    </option>

                    <option value="friendly">
                      Friendly
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </Field>

                <Field label="Game title">
                  <input
                    name="title"
                    value={
                      form.title
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="Home Team vs Away Team"
                    className={
                      CONTROL
                    }
                  />
                </Field>

                <Field label="Permanent competition profile">
                  <select
                    name="competition_id"
                    value={form.competition_id}
                    disabled={
                      readOnly ||
                      !["one_on_one", "court_takeover", "competition"].includes(form.category)
                    }
                    onChange={(event) => selectCompetition(event.target.value)}
                    className={CONTROL}
                  >
                    <option value="">No permanent competition</option>
                    {competitions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.short_name
                          ? `${competition.short_name} — ${competition.name}`
                          : competition.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Linked event">
                  <select
                    name="event_id"
                    value={
                      form.event_id
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  >
                    <option value="">
                      No linked event
                    </option>

                    {events.map(
                      (
                        event,
                      ) => (
                        <option
                          key={
                            event.event_id
                          }
                          value={
                            event.event_id
                          }
                        >
                          {
                            event.title
                          }
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Format">
                  <select
                    name="game_format"
                    value={
                      form.game_format
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  >
                    <option value="5v5">
                      5v5
                    </option>

                    <option value="3v3">
                      3v3
                    </option>

                    <option value="1v1">
                      1v1
                    </option>
                  </select>
                </Field>

                <Field label="Game stage">
                  <input
                    name="game_stage"
                    value={
                      form.game_stage
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="Game / Final / Semi-final"
                    className={
                      CONTROL
                    }
                  />
                </Field>
              </div>
              <p className="mt-4 rounded-xl border border-orange-400/15 bg-orange-500/[.06] px-4 py-3 text-xs leading-5 text-slate-400">
                This context controls counting. League games are isolated by league, season and division; 1v1 and Court Takeover records never become team fixtures unless the registered team IDs actually participate in a team-format game.
              </p>
            </Panel>

            <Panel
              eyebrow="Participants"
              title="Teams"
            >
              <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                <TeamEditor
                  label="Home team"
                  side="home"
                  teams={
                    teams
                  }
                  teamId={
                    form.home_team_id
                  }
                  teamName={
                    form.home_team_name
                  }
                  readOnly={
                    readOnly
                  }
                  onTeamSelect={
                    selectTeam
                  }
                  onNameChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        home_team_name:
                          value,
                      }),
                    )
                  }
                />

                <TeamEditor
                  label="Away team"
                  side="away"
                  teams={
                    teams
                  }
                  teamId={
                    form.away_team_id
                  }
                  teamName={
                    form.away_team_name
                  }
                  readOnly={
                    readOnly
                  }
                  onTeamSelect={
                    selectTeam
                  }
                  onNameChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        away_team_name:
                          value,
                      }),
                    )
                  }
                />
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Registered
                FACKTS teams can
                be linked above.
                An opponent that
                is not registered
                can simply be
                entered by name
                and its players
                can remain
                game-only
                identities.
              </p>
            </Panel>

            <Panel
              eyebrow="League structure"
              title="Competition Placement"
            >
              <div className="grid min-w-0 gap-4 md:grid-cols-3">
                <Field label="League">
                  <select
                    name="league_id"
                    value={
                      form.league_id
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  >
                    <option value="">
                      No league
                    </option>

                    {leagues.map(
                      (
                        league,
                      ) => (
                        <option
                          key={
                            league.id
                          }
                          value={
                            league.id
                          }
                        >
                          {league.short_name
                            ? `${league.short_name} — ${league.name}`
                            : league.name}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Season">
                  <input
                    name="season_label"
                    value={
                      form.season_label
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="2026"
                    className={
                      CONTROL
                    }
                  />
                </Field>

                <Field label="Division">
                  <input
                    name="division"
                    value={
                      form.division
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="Division 1"
                    className={
                      CONTROL
                    }
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              eyebrow="Match details"
              title="Schedule & Venue"
            >
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <Field label="Date and time">
                  <input
                    type="datetime-local"
                    name="game_date"
                    value={
                      form.game_date
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  />
                </Field>

                <Field label="Venue">
                  <input
                    name="venue"
                    value={
                      form.venue
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  />
                </Field>

                <Field label="Court">
                  <input
                    name="court"
                    value={
                      form.court
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  />
                </Field>

                <Field label="Location">
                  <input
                    name="location"
                    value={
                      form.location
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              eyebrow="Official score"
              title="Score & Periods"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={`${form.home_team_name || "Home"} final score`}
                >
                  <input
                    type="number"
                    min="0"
                    name="home_score"
                    value={
                      form.home_score
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  />
                </Field>

                <Field
                  label={`${form.away_team_name || "Away"} final score`}
                >
                  <input
                    type="number"
                    min="0"
                    name="away_score"
                    value={
                      form.away_score
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      CONTROL
                    }
                  />
                </Field>
              </div>

              <div className="mt-5 grid min-w-0 gap-3">
                {periods.map(
                  (
                    period,
                    index,
                  ) => (
                    <div
                      key={`${period.period}-${index}`}
                      className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-xl border border-white/[.06] bg-black/25 p-3"
                    >
                      <input
                        value={
                          period.period
                        }
                        disabled={
                          readOnly
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePeriod(
                            index,
                            "period",
                            event
                              .target
                              .value,
                          )
                        }
                        className={
                          CONTROL
                        }
                      />

                      <input
                        type="number"
                        min="0"
                        value={
                          period.home
                        }
                        disabled={
                          readOnly
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePeriod(
                            index,
                            "home",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Home"
                        className={
                          CONTROL
                        }
                      />

                      <input
                        type="number"
                        min="0"
                        value={
                          period.away
                        }
                        disabled={
                          readOnly
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePeriod(
                            index,
                            "away",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Away"
                        className={
                          CONTROL
                        }
                      />
                    </div>
                  ),
                )}
              </div>

              {!readOnly ? (
                <button
                  type="button"
                  onClick={
                    addOvertime
                  }
                  className="mt-3 rounded-xl border border-white/10 px-4 py-2.5 text-[10px] font-black uppercase"
                >
                  + Add Overtime
                </button>
              ) : null}
            </Panel>

            <Panel
              eyebrow="Game officials"
              title="Officials"
            >
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Field label="Referees / officials">
                  <textarea
                    name="officials"
                    value={
                      form.officials
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="Edward Kalume, Fabrice Simon"
                    className={`${CONTROL} min-h-28`}
                  />
                </Field>

                <Field label="Table officials">
                  <textarea
                    name="table_officials"
                    value={
                      form.table_officials
                    }
                    disabled={
                      readOnly
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="Scorer, timer, shot clock..."
                    className={`${CONTROL} min-h-28`}
                  />
                </Field>
              </div>
            </Panel>

            {gameId ? (
              <Panel
                eyebrow="Canonical statistics"
                title="Player Box Score"
              >
                <div className="grid gap-6">
                  <BoxScoreTeam
                    title={
                      form.home_team_name ||
                      "Home"
                    }
                    side="home"
                    rows={
                      homeLines
                    }
                    readOnly={
                      readOnly
                    }
                    onAdd={() =>
                      setBoxLines(
                        (
                          current,
                        ) => [
                          ...current,
                          newBoxLine(
                            "home",
                            form,
                          ),
                        ],
                      )
                    }
                    onUpdate={
                      updateBoxLine
                    }
                    onDelete={
                      removeBoxLine
                    }
                    onPlayerOfGame={
                      selectPlayerOfGame
                    }
                  />

                  <BoxScoreTeam
                    title={
                      form.away_team_name ||
                      "Away"
                    }
                    side="away"
                    rows={
                      awayLines
                    }
                    readOnly={
                      readOnly
                    }
                    onAdd={() =>
                      setBoxLines(
                        (
                          current,
                        ) => [
                          ...current,
                          newBoxLine(
                            "away",
                            form,
                          ),
                        ],
                      )
                    }
                    onUpdate={
                      updateBoxLine
                    }
                    onDelete={
                      removeBoxLine
                    }
                    onPlayerOfGame={
                      selectPlayerOfGame
                    }
                  />
                </div>
              </Panel>
            ) : null}

            <Panel
              eyebrow="Notes"
              title="Game Record Notes"
            >
              <textarea
                name="notes"
                value={
                  form.notes
                }
                disabled={
                  readOnly
                }
                onChange={
                  updateForm
                }
                className={`${CONTROL} min-h-36`}
                placeholder="Internal notes, source report notes, corrections..."
              />
            </Panel>
          </div>

          <aside className="min-w-0">
            <div className="sticky top-5 space-y-4">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950 p-5">
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
                  Game control
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Publication
                </h2>

                <div className="mt-5 grid gap-4">
                  <Field label="Status">
                    <select
                      name="status"
                      value={
                        form.status
                      }
                      disabled={
                        readOnly
                      }
                      onChange={
                        updateForm
                      }
                      className={
                        CONTROL
                      }
                    >
                      <option value="upcoming">
                        Upcoming
                      </option>

                      <option value="live">
                        Live
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="postponed">
                        Postponed
                      </option>

                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>
                  </Field>

                  <Field label="Verification">
                    <select
                      name="verification_status"
                      value={
                        form.verification_status
                      }
                      disabled={
                        readOnly
                      }
                      onChange={
                        updateForm
                      }
                      className={
                        CONTROL
                      }
                    >
                      <option value="unverified">
                        Unverified
                      </option>

                      <option value="pending">
                        Pending
                      </option>

                      <option value="verified">
                        Verified
                      </option>

                      <option value="disputed">
                        Disputed
                      </option>
                    </select>
                  </Field>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
                    <input
                      type="checkbox"
                      checked={
                        form.is_public
                      }
                      disabled={
                        readOnly
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            is_public:
                              event
                                .target
                                .checked,
                          }),
                        )
                      }
                    />

                    <span className="text-xs font-black uppercase">
                      Public Match Centre
                    </span>
                  </label>
                </div>

                {!readOnly ? (
                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void saveGame()
                    }
                    className={`${BUTTON} mt-5 w-full`}
                  >
                    {saving
                      ? "Saving…"
                      : gameId
                        ? "Save This Game"
                        : "Create Game"}
                  </button>
                ) : null}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950 p-5">
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
                  Score integrity
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <ScoreMetric
                    label="Home final"
                    value={
                      form.home_score ||
                      "—"
                    }
                  />

                  <ScoreMetric
                    label="Box total"
                    value={
                      homeBoxPoints
                    }
                  />

                  <ScoreMetric
                    label="Away final"
                    value={
                      form.away_score ||
                      "—"
                    }
                  />

                  <ScoreMetric
                    label="Box total"
                    value={
                      awayBoxPoints
                    }
                  />
                </div>
              </div>

              <Link
                href="/admin/games"
                className="block rounded-xl border border-white/10 bg-slate-950 px-4 py-4 text-center text-xs font-black uppercase text-slate-300"
              >
                ← Back to Games
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function categoryDefaults(
  category: GameCategory,
  current: GameForm,
  competitions: CompetitionRow[] = [],
): Partial<GameForm> {
  const kings = competitions.find((competition) => competition.slug === "fackts-kings");
  const takeovers = competitions.find((competition) => competition.slug === "court-takeovers");

  if (
    category ===
    "one_on_one"
  ) {
    return {
      game_format: "1v1",
      match_type: "1v1",
      event_id: "",
      league_id: "",
      division: "",
      home_team_id: "",
      away_team_id: "",
      competition_id: kings?.id || "",
      competition_name: kings?.name || "FACKTS Kings",
      season_label: kings?.current_season_label || current.season_label,
    };
  }

  if (
    category ===
    "court_takeover"
  ) {
    return {
      event_id: "",
      league_id: "",
      match_type:
        "court_takeover",
      competition_id: takeovers?.id || "",
      competition_name: takeovers?.name || "Court Takeovers",
      season_label: takeovers?.current_season_label || current.season_label,
    };
  }

  if (
    category ===
    "league"
  ) {
    return {
      event_id: "",
      competition_id: "",
      competition_name: "League",
      game_format:
        current.game_format ===
        "1v1"
          ? "5v5"
          : current.game_format,

      match_type:
        "league",
    };
  }

  if (
    category ===
    "friendly"
  ) {
    return {
      event_id: "",
      league_id: "",
      competition_id: "",
      match_type:
        "friendly",

      competition_name:
        "Friendly",
    };
  }

  if (
    category ===
    "event"
  ) {
    return {
      league_id: "",
      competition_id: "",
      match_type:
        "event",
    };
  }

  if (
    category ===
    "competition"
  ) {
    return {
      event_id: "",
      league_id: "",
      match_type:
        "competition",

      competition_name:
        current.competition_name ===
          "FACKTS Hoops"
          ? "Competition"
          : current.competition_name,
    };
  }

  return {
    event_id: "",
    league_id: "",
    competition_id: "",
    competition_name: "FACKTS Hoops",
    match_type:
      current.game_format ||
      "5v5",
  };
}

function TeamEditor({
  label,
  side,
  teams,
  teamId,
  teamName,
  readOnly,
  onTeamSelect,
  onNameChange,
}: {
  label: string;

  side: TeamSide;

  teams: TeamRow[];

  teamId: string;

  teamName: string;

  readOnly: boolean;

  onTeamSelect: (
    side: TeamSide,
    teamId: string,
  ) => void;

  onNameChange: (
    value: string,
  ) => void;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">
        {label}
      </p>

      <div className="mt-4 grid gap-3">
        <Field label="Registered team">
          <select
            value={
              teamId
            }
            disabled={
              readOnly
            }
            onChange={(
              event,
            ) =>
              onTeamSelect(
                side,
                event.target
                  .value,
              )
            }
            className={
              CONTROL
            }
          >
            <option value="">
              Not linked /
              external team
            </option>

            {teams.map(
              (
                team,
              ) => (
                <option
                  key={
                    team.id
                  }
                  value={
                    team.id
                  }
                >
                  {
                    team.name
                  }
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Displayed team name">
          <input
            value={
              teamName
            }
            disabled={
              readOnly
            }
            onChange={(
              event,
            ) =>
              onNameChange(
                event.target
                  .value,
              )
            }
            className={
              CONTROL
            }
          />
        </Field>
      </div>
    </div>
  );
}

function BoxScoreTeam({
  title,
  rows,
  readOnly,
  onAdd,
  onUpdate,
  onDelete,
  onPlayerOfGame,
}: {
  title: string;

  side: TeamSide;

  rows: Array<{
    line: BoxLineDraft;
    index: number;
  }>;

  readOnly: boolean;

  onAdd: () => void;

  onUpdate: (
    index: number,
    key:
      keyof BoxLineDraft,
    value:
      | string
      | boolean,
  ) => void;

  onDelete: (
    index: number,
  ) => void;

  onPlayerOfGame: (
    index: number,
  ) => void;
}) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">
            Canonical box
            score
          </p>

          <h3 className="mt-1 break-words text-xl font-black uppercase">
            {title}
          </h3>
        </div>

        {!readOnly ? (
          <button
            type="button"
            onClick={
              onAdd
            }
            className="rounded-xl border border-orange-400/30 px-4 py-2.5 text-[10px] font-black uppercase text-orange-200"
          >
            + Add Player
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid min-w-0 gap-4">
        {rows.map(
          ({
            line,
            index,
          }) => (
            <BoxScoreRow
              key={
                line.id ||
                `${line.team_side}-${index}`
              }
              line={
                line
              }
              index={
                index
              }
              readOnly={
                readOnly
              }
              onUpdate={
                onUpdate
              }
              onDelete={
                onDelete
              }
              onPlayerOfGame={
                onPlayerOfGame
              }
            />
          ),
        )}

        {!rows.length ? (
          <div className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-500">
            No player rows
            yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BoxScoreRow({
  line,
  index,
  readOnly,
  onUpdate,
  onDelete,
  onPlayerOfGame,
}: {
  line: BoxLineDraft;

  index: number;

  readOnly: boolean;

  onUpdate: (
    index: number,
    key:
      keyof BoxLineDraft,
    value:
      | string
      | boolean,
  ) => void;

  onDelete: (
    index: number,
  ) => void;

  onPlayerOfGame: (
    index: number,
  ) => void;
}) {
  const numericFields: Array<{
    key:
      keyof BoxLineDraft;
    label: string;
  }> = [
    {
      key: "minutes",
      label: "MIN",
    },
    {
      key: "points",
      label: "PTS",
    },
    {
      key: "two_made",
      label: "2PM",
    },
    {
      key: "two_attempted",
      label: "2PA",
    },
    {
      key: "three_made",
      label: "3PM",
    },
    {
      key: "three_attempted",
      label: "3PA",
    },
    {
      key: "ft_made",
      label: "FTM",
    },
    {
      key: "ft_attempted",
      label: "FTA",
    },
    {
      key: "offensive_rebounds",
      label: "OREB",
    },
    {
      key: "defensive_rebounds",
      label: "DREB",
    },
    {
      key: "rebounds",
      label: "REB",
    },
    {
      key: "assists",
      label: "AST",
    },
    {
      key: "steals",
      label: "STL",
    },
    {
      key: "blocks",
      label: "BLK",
    },
    {
      key: "turnovers",
      label: "TO",
    },
    {
      key: "fouls",
      label: "PF",
    },
    {
      key: "plus_minus",
      label: "+/-",
    },
  ];

  return (
    <article className="min-w-0 rounded-2xl border border-white/[.08] bg-[#030a18] p-4">
      <div className="grid min-w-0 gap-3 md:grid-cols-[90px_minmax(0,1fr)_160px]">
        <Field label="Jersey">
          <input
            value={
              line.jersey_number
            }
            disabled={
              readOnly
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                "jersey_number",
                event.target
                  .value,
              )
            }
            className={
              CONTROL
            }
          />
        </Field>

        <Field label="Player name">
          <input
            value={
              line.display_name
            }
            disabled={
              readOnly
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                "display_name",
                event.target
                  .value,
              )
            }
            className={
              CONTROL
            }
          />
        </Field>

        <Field label="Identity">
          <select
            value={
              line.identity_type
            }
            disabled={
              readOnly
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                "identity_type",
                event.target
                  .value,
              )
            }
            className={
              CONTROL
            }
          >
            <option value="canonical_player">
              FACKTS Player
            </option>

            <option value="team_roster">
              Team Roster
            </option>

            <option value="game_only">
              Game Only
            </option>

            <option value="guest">
              Guest
            </option>
          </select>
        </Field>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {numericFields.map(
          (
            field,
          ) => (
            <label
              key={
                field.key
              }
              className="min-w-0"
            >
              <span className="block text-[7px] font-black uppercase tracking-wider text-slate-600">
                {
                  field.label
                }
              </span>

              <input
                type="number"
                step={
                  field.key ===
                  "minutes"
                    ? "0.01"
                    : "1"
                }
                value={
                  String(
                    line[
                      field.key
                    ] ?? "",
                  )
                }
                disabled={
                  readOnly
                }
                onChange={(
                  event,
                ) =>
                  onUpdate(
                    index,
                    field.key,
                    event.target
                      .value,
                  )
                }
                className="mt-1 w-full min-w-0 rounded-lg border border-white/10 bg-black px-2 py-2 text-center text-xs font-black"
              />
            </label>
          ),
        )}
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[.06] px-3 py-2">
          <input
            type="radio"
            name="player-of-game"
            checked={
              line.player_of_game
            }
            disabled={
              readOnly
            }
            onChange={() =>
              onPlayerOfGame(
                index,
              )
            }
          />

          <span className="text-[9px] font-black uppercase text-yellow-200">
            Player of Game
          </span>
        </label>

        {!readOnly ? (
          <button
            type="button"
            onClick={() =>
              onDelete(
                index,
              )
            }
            className="rounded-xl border border-red-400/20 px-3 py-2 text-[9px] font-black uppercase text-red-300"
          >
            Remove Player
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
      <p className="text-[9px] font-black uppercase tracking-[.17em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[8px] font-black uppercase tracking-[.13em] text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function ScoreMetric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center">
      <p className="text-xl font-black">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>
    </div>
  );
}

function Alert({
  type,
  children,
}: {
  type:
    | "success"
    | "error";

  children:
    React.ReactNode;
}) {
  return (
    <div
      className={`mt-5 rounded-xl border p-4 text-sm ${
        type ===
        "success"
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/25 bg-red-500/10 text-red-100"
      }`}
    >
      {children}
    </div>
  );
}
