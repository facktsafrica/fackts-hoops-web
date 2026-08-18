"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { readBasketballReportPdf } from "@/lib/basketball-iq/browserReportOcr";

type JsonRecord = Record<string, any>;

type Mode =
  | "live"
  | "box_score"
  | "import"
  | "coach";

type StatRow = JsonRecord & {
  roster_member_id: string;
  player_id?: string | null;
  display_name: string;
  included: boolean;
};

const input =
  "w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--club-accent)]";

const primary =
  "max-w-full whitespace-normal rounded-xl bg-[var(--club-accent)] px-5 py-3 text-xs font-black uppercase tracking-[.08em] text-[var(--club-accent-text)] transition hover:brightness-110 disabled:opacity-45";

const secondary =
  "max-w-full whitespace-normal rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black text-white transition hover:border-[var(--club-accent)] disabled:opacity-45";

function blankRow(
  member: JsonRecord,
): StatRow {
  return {
    roster_member_id:
      member.id,

    player_id:
      member.player_id ||
      null,

    display_name:
      member.display_name ||
      "Player",

    jersey_number:
      member.jersey_number ||
      "",

    included: false,

    points: 0,

    rebounds: 0,

    offensive_rebounds: 0,

    defensive_rebounds: 0,

    assists: 0,

    steals: 0,

    blocks: 0,

    turnovers: 0,

    fouls: 0,

    minutes: 0,

    two_made: 0,

    two_attempted: 0,

    three_made: 0,

    three_attempted: 0,

    ft_made: 0,

    ft_attempted: 0,

    plus_minus: 0,

    period_values: {},
  };
}

function normalizeSavedRow(
  line: JsonRecord,
  roster: JsonRecord[],
): StatRow {
  const member =
    roster.find(
      (item) =>
        item.id ===
        line.roster_member_id,
    ) || line;

  return {
    ...blankRow(member),
    ...line,
    included: true,
  };
}

function metric(
  value: unknown,
  suffix = "",
) {
  return value === null ||
    value === undefined
    ? "â€”"
    : `${value}${suffix}`;
}

export default function BasketballIQWorkspace({
  teamId,
  roster,
  games,
  onMessage,
}: {
  teamId: string;
  roster: JsonRecord[];
  games: JsonRecord[];
  onMessage: (
    message: string,
  ) => void;
}) {
  const [data, setData] =
    useState<JsonRecord | null>(
      null,
    );

  const [mode, setMode] =
    useState<Mode>("live");

  const [gameId, setGameId] =
    useState(
      games[0]?.id || "",
    );

  const [
    sessionId,
    setSessionId,
  ] = useState("");

  const [
    sourceImportId,
    setSourceImportId,
  ] = useState("");

  const [
    currentPeriod,
    setCurrentPeriod,
  ] = useState("Q1");

  const [rows, setRows] =
    useState<StatRow[]>(
      () =>
        roster.map(
          blankRow,
        ),
    );

  const [
    activePlayerId,
    setActivePlayerId,
  ] = useState(
    roster[0]?.id || "",
  );

  const [dirty, setDirty] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    lastSaved,
    setLastSaved,
  ] = useState("");

  const [
    history,
    setHistory,
  ] = useState<StatRow[]>(
    [],
  );

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  const [
    importRows,
    setImportRows,
  ] = useState<
    JsonRecord[]
  >([]);

  const [
    importWarnings,
    setImportWarnings,
  ] = useState<string[]>(
    [],
  );

  const [
    importing,
    setImporting,
  ] = useState(false);

  const [
    importProgress,
    setImportProgress,
  ] = useState("");

  const [
    reportFile,
    setReportFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    reportDraft,
    setReportDraft,
  ] =
    useState<JsonRecord | null>(
      null,
    );

  const [
    createdGames,
    setCreatedGames,
  ] = useState<
    JsonRecord[]
  >([]);

  const [
    briefing,
    setBriefing,
  ] = useState({
    audience: "team",
    roster_member_id: "",
    title: "",
    focus_area: "",
    body: "",
    source_type: "coach",
  });

  const revision =
    useRef(0);

  const load =
    useCallback(
      async () => {
        const response =
          await fetch(
            `/api/team-portal/basketball-iq?team_id=${encodeURIComponent(
              teamId,
            )}`,
            {
              cache:
                "no-store",
            },
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          response.ok &&
          payload.ok
        ) {
          setData(
            payload,
          );
        } else {
          onMessage(
            payload.error ||
              "Basketball IQ could not be loaded.",
          );
        }
      },
      [
        onMessage,
        teamId,
      ],
    );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      hydrated ||
      !data
    ) {
      return;
    }

    const draft =
      data.sessions?.find(
        (
          session: JsonRecord,
        ) =>
          session.status ===
          "draft",
      );

    if (draft) {
      const saved =
        data.lines?.filter(
          (
            line: JsonRecord,
          ) =>
            line.session_id ===
            draft.id,
        ) || [];

      const savedByRoster =
        new Map<
          string,
          StatRow
        >(
          saved.map(
            (
              line: JsonRecord,
            ) => [
              String(
                line.roster_member_id,
              ),
              normalizeSavedRow(
                line,
                roster,
              ),
            ],
          ),
        );

      setRows(
        roster.map(
          (
            member,
          ) =>
            savedByRoster.get(
              member.id,
            ) ||
            blankRow(
              member,
            ),
        ),
      );

      setSessionId(
        draft.id,
      );

      setGameId(
        draft.game_id,
      );

      setCurrentPeriod(
        draft.current_period ||
          "Q1",
      );

      setMode(
        draft.mode ===
          "box_score" ||
          draft.mode ===
            "import"
          ? draft.mode
          : "live",
      );

      setSourceImportId(
        draft.source_import_id ||
          "",
      );

      setActivePlayerId(
        saved[0]
          ?.roster_member_id ||
          roster[0]?.id ||
          "",
      );

      setLastSaved(
        draft.updated_at ||
          "",
      );
    } else {
      setRows(
        roster.map(
          blankRow,
        ),
      );

      setActivePlayerId(
        roster[0]?.id ||
          "",
      );
    }

    setHydrated(true);
  }, [
    data,
    hydrated,
    roster,
  ]);

  const persist =
    useCallback(
      async () => {
        const included =
          rows.filter(
            (
              row,
            ) =>
              row.included,
          );

        if (
          !gameId ||
          !included.length
        ) {
          return "";
        }

        const savedRevision =
          revision.current;

        setSaving(true);

        const response =
          await fetch(
            "/api/team-portal/basketball-iq",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  action:
                    "save_session",

                  team_id:
                    teamId,

                  session_id:
                    sessionId ||
                    null,

                  game_id:
                    gameId,

                  mode:
                    mode ===
                    "coach"
                      ? "box_score"
                      : mode,

                  current_period:
                    currentPeriod,

                  source_import_id:
                    sourceImportId ||
                    null,

                  rows:
                    included,
                },
              ),
            },
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({}),
            );

        setSaving(false);

        if (
          !response.ok
        ) {
          onMessage(
            payload.error ||
              "Club stats could not be saved.",
          );

          return "";
        }

        const id =
          payload.session
            ?.id ||
          sessionId;

        setSessionId(id);

        if (
          revision.current ===
          savedRevision
        ) {
          setDirty(false);
        }

        setLastSaved(
          new Date().toISOString(),
        );

        void load();

        return id;
      },
      [
        currentPeriod,
        gameId,
        load,
        mode,
        onMessage,
        rows,
        sessionId,
        sourceImportId,
        teamId,
      ],
    );

  useEffect(() => {
    if (
      !dirty ||
      saving
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void persist();
        },
        1200,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    dirty,
    persist,
    saving,
  ]);

  const activeRow =
    rows.find(
      (
        row,
      ) =>
        row.roster_member_id ===
        activePlayerId,
    ) || rows[0];

  const includedRows =
    rows.filter(
      (
        row,
      ) =>
        row.included,
    );

  const teamScore =
    includedRows.reduce(
      (
        total,
        row,
      ) =>
        total +
        Number(
          row.points ||
            0,
        ),
      0,
    );

  const modes: Array<
    [
      Mode,
      string,
      string,
    ]
  > = [
    [
      "live",
      "Live Court",
      "Fast taps during play",
    ],

    [
      "box_score",
      "Box Score",
      "Manual player stats",
    ],

    [
      "import",
      "Import",
      "Excel, PDF or Word",
    ],

    [
      "coach",
      "Briefings",
      "Share development work",
    ],
  ];

  function startNew(
    nextMode: Mode =
      "live",
    force = false,
  ) {
    if (
      !force &&
      dirty &&
      !window.confirm(
        "Start a new session before the current autosave finishes?",
      )
    ) {
      return;
    }

    setSessionId("");

    setSourceImportId("");

    setRows(
      roster.map(
        blankRow,
      ),
    );

    setActivePlayerId(
      roster[0]?.id ||
        "",
    );

    setCurrentPeriod(
      "Q1",
    );

    setMode(nextMode);

    setHistory([]);

    setDirty(false);

    setLastSaved("");

    revision.current =
      0;
  }

  function changeGame(
    nextGameId: string,
  ) {
    if (
      dirty &&
      !window.confirm(
        "Change games and discard any changes that have not autosaved?",
      )
    ) {
      return;
    }

    startNew(
      mode === "coach"
        ? "live"
        : mode,
      true,
    );

    setGameId(
      nextGameId,
    );
  }

  function updateRow(
    rosterMemberId: string,
    field: string,
    raw: unknown,
  ) {
    setRows(
      (
        current,
      ) =>
        current.map(
          (
            row,
          ) =>
            row.roster_member_id ===
            rosterMemberId
              ? {
                  ...row,

                  included:
                    true,

                  [field]:
                    field ===
                    "plus_minus"
                      ? Number(
                          raw ||
                            0,
                        )
                      : Math.max(
                          0,
                          Number(
                            raw ||
                              0,
                          ),
                        ),
                }
              : row,
        ),
    );

    revision.current +=
      1;

    setDirty(true);
  }

  function tap(
    changes: Record<
      string,
      number
    >,
    periodField?: string,
  ) {
    if (!activeRow) {
      return;
    }

    setHistory(
      (
        current,
      ) => [
        ...current.slice(
          -29,
        ),

        {
          ...activeRow,

          period_values:
            structuredClone(
              activeRow.period_values ||
                {},
            ),
        },
      ],
    );

    setRows(
      (
        current,
      ) =>
        current.map(
          (
            row,
          ) => {
            if (
              row.roster_member_id !==
              activeRow.roster_member_id
            ) {
              return row;
            }

            const next: StatRow =
              {
                ...row,

                included:
                  true,

                period_values:
                  structuredClone(
                    row.period_values ||
                      {},
                  ),
              };

            for (
              const [
                field,
                delta,
              ] of Object.entries(
                changes,
              )
            ) {
              next[
                field
              ] = Math.max(
                0,
                Number(
                  next[
                    field
                  ] ||
                    0,
                ) +
                  delta,
              );
            }

            if (
              periodField
            ) {
              const periodValues =
                {
                  ...(next
                    .period_values[
                    currentPeriod
                  ] || {}),
                };

              periodValues[
                periodField
              ] = Math.max(
                0,
                Number(
                  periodValues[
                    periodField
                  ] ||
                    0,
                ) +
                  Number(
                    changes[
                      periodField
                    ] ||
                      1,
                  ),
              );

              next.period_values[
                currentPeriod
              ] =
                periodValues;
            }

            return next;
          },
        ),
    );

    revision.current +=
      1;

    setDirty(true);
  }

  function undo() {
    const previous =
      history.at(-1);

    if (!previous) {
      return;
    }

    setRows(
      (
        current,
      ) =>
        current.map(
          (
            row,
          ) =>
            row.roster_member_id ===
            previous.roster_member_id
              ? previous
              : row,
        ),
    );

    setHistory(
      (
        current,
      ) =>
        current.slice(
          0,
          -1,
        ),
    );

    revision.current +=
      1;

    setDirty(true);
  }

  async function submitSession() {
    const savedId =
      await persist();

    if (!savedId) {
      onMessage(
        "Add at least one participating player and save the game first.",
      );

      return;
    }

    const response =
      await fetch(
        "/api/team-portal/basketball-iq",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify(
            {
              action:
                "submit_session",

              team_id:
                teamId,

              session_id:
                savedId,
            },
          ),
        },
      );

    const payload =
      await response
        .json()
        .catch(() => ({}));

    onMessage(
      payload.message ||
        payload.error ||
        "Submission finished.",
    );

    if (response.ok) {
      await load();

      startNew(
        "live",
        true,
      );
    }
  }

  async function storeImport(
    file: File,
    report: JsonRecord | null =
      null,
  ) {
    setImporting(true);

    setImportProgress(
      "Securing the reportâ€¦",
    );

    const formData =
      new FormData();

    formData.set(
      "file",
      file,
    );

    formData.set(
      "team_id",
      teamId,
    );

    formData.set(
      "game_id",
      gameId,
    );

    if (report) {
      formData.set(
        "browser_ocr",
        "true",
      );
    }

    if (
      report?.match
    ) {
      formData.set(
        "home_team_name",
        String(
          (report as JsonRecord).match
            .home_team_name ??
            "",
        ),
      );

      formData.set(
        "away_team_name",
        String(
          (report as JsonRecord).match
            .away_team_name ??
            "",
        ),
      );

      formData.set(
        "game_date",
        String(
          (report as JsonRecord).match
            .game_date ??
            "",
        ),
      );

      formData.set(
        "home_score",
        String(
          (report as JsonRecord).match
            .home_score ??
            "",
        ),
      );

      formData.set(
        "away_score",
        String(
          (report as JsonRecord).match
            .away_score ??
            "",
        ),
      );

      formData.set(
        "team_side",
        String(
          (report as JsonRecord).match
            .team_side ??
            "",
        ),
      );

      formData.set(
        "period_scores",
        JSON.stringify(
          (report as JsonRecord).match
            .period_scores ||
            [],
        ),
      );
    }

    if (
      !gameId &&
      report?.match
    ) {
      formData.set(
        "create_game",
        "true",
      );
    }

    if (
      report?.rows
        ?.length
    ) {
      formData.set(
        "ocr_rows",
        JSON.stringify(
          report.rows,
        ),
      );
    }

    if (
      report?.home_rows
        ?.length
    ) {
      formData.set(
        "ocr_home_rows",
        JSON.stringify(
          report.home_rows,
        ),
      );
    }

    if (
      report?.away_rows
        ?.length
    ) {
      formData.set(
        "ocr_away_rows",
        JSON.stringify(
          report.away_rows,
        ),
      );
    }

    if (
      report?.officials
        ?.length
    ) {
      formData.set(
        "ocr_officials",
        JSON.stringify(
          report.officials,
        ),
      );
    }

    if (
      report?.warnings
        ?.length
    ) {
      formData.set(
        "ocr_warnings",
        JSON.stringify(
          report.warnings,
        ),
      );
    }

    try {
      const response =
        await fetch(
          "/api/team-portal/basketball-iq/import",
          {
            method:
              "POST",

            body:
              formData,
          },
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({}),
          );

      onMessage(
        payload.message ||
          payload.error ||
          "Import finished.",
      );

      if (
        response.ok
      ) {
        setImportRows(
          payload.rows ||
            [],
        );

        setImportWarnings(
          payload.warnings ||
            [],
        );

        setSourceImportId(
          payload.import
            ?.id ||
            "",
        );

        if (
          payload.game_id
        ) {
          setGameId(
            payload.game_id,
          );
        }

        if (
          payload.game
        ) {
          setCreatedGames(
            (
              current,
            ) => [
              payload.game,

              ...current.filter(
                (
                  game,
                ) =>
                  game.id !==
                  payload.game.id,
              ),
            ],
          );
        }

        setReportDraft(
          null,
        );

        setReportFile(
          null,
        );

        await load();
      }
    } finally {
      setImporting(false);

      setImportProgress(
        "",
      );
    }
  }

  async function uploadImport(
    form: HTMLFormElement,
  ) {
    const file =
      new FormData(
        form,
      ).get("file");

    if (
      !(file instanceof File) ||
      !file.size
    ) {
      onMessage(
        "Choose a stat report first.",
      );

      return;
    }

    if (
      !roster.length
    ) {
      onMessage(
        "Add the team players before importing their box score.",
      );

      return;
    }

    const isPdf =
      file.name
        .toLowerCase()
        .endsWith(
          ".pdf",
        ) ||
      file.type ===
        "application/pdf";

    if (!isPdf) {
      if (!gameId) {
        onMessage(
          "For Excel, CSV and Word imports, choose an existing game. PDF game reports can create a missing match automatically.",
        );

        return;
      }

      await storeImport(
        file,
      );

      form.reset();

      return;
    }

    setImporting(true);

    setImportProgress(
      "Opening the reportâ€¦",
    );

    try {
      const report =
        await readBasketballReportPdf(
          file,
          roster,
          setImportProgress,
        );

      setImportWarnings(
        report.warnings,
      );

      if (
        !(report as JsonRecord).match
      ) {
        onMessage(
          "The report pages were read, but the game header needs manual confirmation. Nothing has been saved yet.",
        );

        setReportFile(
          file,
        );

        setReportDraft({
          match: {
            home_team_name:
  (report as JsonRecord).match
    ?.home_team_name ||
  "",

away_team_name:
  (report as JsonRecord).match
    ?.away_team_name ||
  "",

            game_date:
              (report as JsonRecord).match
                ?.game_date ||
              "",

            home_score:
              (report as JsonRecord).match
                ?.home_score ||
              0,

            away_score:
              (report as JsonRecord).match
                ?.away_score ||
              0,

            team_side:
              (report as JsonRecord).match
                ?.team_side ||
              "home",
            period_scores:
              (report as JsonRecord).match
                ?.period_scores ||
              [],
          },

          rows:
            report.rows ||
            [],

          home_rows:
            report.home_rows ||
            [],

          away_rows:
            report.away_rows ||
            [],

          officials:
            report.officials ||
            [],

          warnings:
            report.warnings ||
            [],
        });
      } else if (
        !gameId
      ) {
        setReportFile(
          file,
        );

        setReportDraft(
          report,
        );

        onMessage(
          `${(report as JsonRecord).match.home_team_name} ${(report as JsonRecord).match.home_score}â€“${(report as JsonRecord).match.away_score} ${(report as JsonRecord).match.away_team_name} detected. Confirm it below before the private game is created.`,
        );
      } else {
        await storeImport(
          file,
          report,
        );
      }

      form.reset();
    } catch (error) {
      onMessage(
        error instanceof
          Error
          ? error.message
          : "The image-based PDF could not be read.",
      );
    } finally {
      setImporting(false);

      setImportProgress(
        "",
      );
    }
  }

  function updateMatch(
    field: string,
    value:
      | string
      | number,
  ) {
    setReportDraft(
      (
        current,
      ) =>
        current
          ? {
              ...current,

              rows:
                field ===
                "team_side"
                  ? (value ===
                    "away"
                      ? current.away_rows
                      : current.home_rows) ||
                    current.rows
                  : current.rows,

              match: {
                ...current.match,

                [field]:
                  value,
              },
            }
          : current,
    );
  }

  function loadImport() {
    if (
      !importRows.length
    ) {
      onMessage(
        "No extracted rows are ready. Enter the box score manually and the uploaded file will remain as evidence.",
      );

      setMode(
        "box_score",
      );

      return;
    }

    if (
      importRows.some(
        (
          row,
        ) =>
          !row.roster_member_id,
      )
    ) {
      onMessage(
        "Match every imported row to a team roster player first.",
      );

      return;
    }

    if (
      new Set(
        importRows.map(
          (
            row,
          ) =>
            row.roster_member_id,
        ),
      ).size !==
      importRows.length
    ) {
      onMessage(
        "Two imported rows are matched to the same roster player. Correct the matches before loading the box score.",
      );

      return;
    }

    const byRoster =
      new Map(
        importRows.map(
          (
            row,
          ) => [
            row.roster_member_id,
            row,
          ],
        ),
      );

    setRows(
      roster.map(
        (
          member,
        ) => ({
          ...blankRow(
            member,
          ),

          ...(byRoster.get(
            member.id,
          ) || {}),

          roster_member_id:
            member.id,

          player_id:
            member.player_id ||
            null,

          display_name:
            member.display_name,

          included:
            byRoster.has(
              member.id,
            ),
        }),
      ),
    );

    setSessionId("");

    setMode(
      "box_score",
    );

    revision.current +=
      1;

    setDirty(true);

    onMessage(
      "Imported rows loaded into the review grid. Confirm every value, then submit the complete game.",
    );
  }

  function applyRecommendation(
    recommendation: JsonRecord,
  ) {
    setBriefing({
      audience:
        recommendation.audience ||
        "team",

      roster_member_id:
        recommendation.roster_member_id ||
        "",

      title:
        recommendation.headline ||
        "Development focus",

      focus_area:
        recommendation.focus ||
        "",

      body: `${recommendation.evidence}\n\nTraining action: ${recommendation.training}`,

      source_type:
        "data_led",
    });

    setMode("coach");
  }

  async function publishBriefing(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const response =
      await fetch(
        "/api/team-portal/basketball-iq",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify(
            {
              action:
                "publish_briefing",

              team_id:
                teamId,

              ...briefing,

              linked_session_id:
                sessionId ||
                null,
            },
          ),
        },
      );

    const payload =
      await response
        .json()
        .catch(() => ({}));

    onMessage(
      payload.message ||
        payload.error ||
        "Briefing finished.",
    );

    if (
      response.ok
    ) {
      setBriefing({
        audience:
          "team",

        roster_member_id:
          "",

        title: "",

        focus_area:
          "",

        body: "",

        source_type:
          "coach",
      });

      await load();
    }
  }

  const intelligence =
    data?.intelligence || {
      metrics: {},
      recommendations: [],
      player_recommendations:
        [],
      sample_games: 0,
    };

  const activeSessions =
    data?.sessions
      ?.filter(
        (
          session: JsonRecord,
        ) =>
          session.status !==
          "draft",
      )
      .slice(0, 5) ||
    [];

  const availableGames = [
    ...createdGames,

    ...games.filter(
      (
        game,
      ) =>
        !createdGames.some(
          (
            created,
          ) =>
            created.id ===
            game.id,
        ),
    ),
  ];

  return (
    <div className="grid w-full min-w-0 max-w-full gap-6">
      <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-2xl">
        <div className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(249,115,22,.14),transparent_48%)] p-4 sm:p-7">
          <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--club-accent)]">
                Basketball IQ
              </p>

              <h2 className="mt-2 max-w-full break-words text-3xl font-black uppercase sm:text-4xl">
                Performance
                command desk
              </h2>

              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-400">
                Capture the game
                once. Use it
                immediately for
                training
                decisions. Super
                Admin still
                controls what
                becomes an
                official public
                record.
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-2">
              <IQMetric
                label="Sample"
                value={`${intelligence.sample_games}G`}
              />

              <IQMetric
                label="PPG"
                value={metric(
                  intelligence
                    .metrics
                    ?.points_per_game,
                )}
              />

              <IQMetric
                label="AST/TO"
                value={metric(
                  intelligence
                    .metrics
                    ?.assist_turnover_ratio,
                )}
              />
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
          {(
            intelligence.recommendations ||
            []
          ).map(
            (
              recommendation: JsonRecord,
            ) => (
              <Recommendation
                key={
                  recommendation.id
                }
                item={
                  recommendation
                }
                onUse={() =>
                  applyRecommendation(
                    recommendation,
                  )
                }
              />
            ),
          )}
        </div>
      </section>

      <section className="w-full min-w-0 max-w-full rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <label className="min-w-0">
            <span className="mb-2 block text-[9px] font-black uppercase tracking-[.14em] text-slate-500">
              Game being
              worked
            </span>

            <select
              value={
                gameId
              }
              onChange={(
                event,
              ) =>
                changeGame(
                  event
                    .target
                    .value,
                )
              }
              className={
                input
              }
            >
              <option value="">
                Choose a
                linked gameâ€”or
                create one from
                a PDF report
              </option>

              {availableGames.map(
                (
                  game,
                ) => (
                  <option
                    key={
                      game.id
                    }
                    value={
                      game.id
                    }
                  >
                    {game.title ||
                      game.game_title}

                    {game.verification_status ===
                      "unverified" ||
                    game.official_game ===
                      false
                      ? " Â· awaiting verification"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="flex min-w-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                startNew(
                  "live",
                )
              }
              className={
                secondary
              }
            >
              New game session
            </button>

            <button
              type="button"
              disabled={
                !includedRows.length ||
                saving
              }
              onClick={() =>
                void submitSession()
              }
              className={
                primary
              }
            >
              Submit complete
              game
            </button>
          </div>
        </div>

        {!availableGames.length ? (
          <div className="mt-5 rounded-xl border border-dashed border-orange-400/25 bg-orange-500/[.05] p-5 text-sm text-orange-100">
            No game is linked
            yet. Open Import
            and upload the PDF
            reportâ€”the portal
            will read the match
            and let you create
            it privately for
            Super Admin
            verification.
          </div>
        ) : null}

        {!roster.length ? (
          <div className="mt-5 rounded-xl border border-dashed border-orange-400/25 bg-orange-500/[.05] p-5 text-sm text-orange-100">
            Add players under
            Team &amp; Players
            before opening a
            stat session.
          </div>
        ) : null}

        <div className="mt-5 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {modes.map(
            ([
              key,
              label,
              hint,
            ]) => (
              <button
                key={
                  key
                }
                onClick={() =>
                  setMode(
                    key,
                  )
                }
                className={`min-w-0 rounded-xl border p-4 text-left transition ${
                  mode ===
                  key
                    ? "border-[var(--club-accent)] bg-white/[.08]"
                    : "border-white/10 bg-black/20 hover:border-white/25"
                }`}
              >
                <span className="block break-words text-xs font-black uppercase">
                  {
                    label
                  }
                </span>

                <span className="mt-1 block break-words text-[10px] text-slate-500">
                  {
                    hint
                  }
                </span>
              </button>
            ),
          )}
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-[.1em]">
          <span
            className={
              saving
                ? "text-orange-300"
                : dirty
                  ? "text-yellow-300"
                  : "text-emerald-300"
            }
          >
            {saving
              ? "Autosavingâ€¦"
              : dirty
                ? "Unsaved changes"
                : lastSaved
                  ? `Saved ${new Date(
                      lastSaved,
                    ).toLocaleTimeString(
                      "en-KE",
                      {
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                      },
                    )}`
                  : "Ready"}
          </span>

          <span className="text-slate-700">
            Â·
          </span>

          <span className="text-slate-500">
            {
              includedRows.length
            }{" "}
            participating
            players
          </span>

          <span className="text-slate-700">
            Â·
          </span>

          <span className="text-slate-500">
            Team points{" "}
            {
              teamScore
            }
          </span>
        </div>
      </section>

      {mode ===
      "live" ? (
        <section className="grid w-full min-w-0 max-w-full gap-6 xl:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
          <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-5">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
              On court
            </p>

            <h3 className="mt-2 break-words text-2xl font-black uppercase">
              Choose player
            </h3>

            <div className="mt-5 grid min-w-0 max-h-[34rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
              {rows.map(
                (
                  row,
                ) => (
                  <button
                    key={
                      row.roster_member_id
                    }
                    onClick={() =>
                      setActivePlayerId(
                        row.roster_member_id,
                      )
                    }
                    className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 text-left ${
                      activePlayerId ===
                      row.roster_member_id
                        ? "border-[var(--club-accent)] bg-white/[.08]"
                        : "border-white/10 bg-black/25"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-black">
                        {
                          row.display_name
                        }
                      </span>

                      <span className="mt-1 block break-words text-[9px] uppercase text-slate-500">
                        {row.jersey_number
                          ? `#${row.jersey_number}`
                          : "Roster"}

                        {row.player_id
                          ? " Â· linked"
                          : " Â· club record"}
                      </span>
                    </span>

                    <span className="shrink-0 text-xl font-black text-[var(--club-accent)]">
                      {
                        row.points
                      }
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
            {activeRow ? (
              <>
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
                      Active
                      player
                    </p>

                    <h3 className="mt-2 break-words text-3xl font-black uppercase">
                      {
                        activeRow.display_name
                      }
                    </h3>

                    <p className="mt-2 break-words text-sm text-slate-500">
                      PTS{" "}
                      {
                        activeRow.points
                      }{" "}
                      Â· REB{" "}
                      {
                        activeRow.rebounds
                      }{" "}
                      Â· AST{" "}
                      {
                        activeRow.assists
                      }{" "}
                      Â· TO{" "}
                      {
                        activeRow.turnovers
                      }
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-2">
                    {[
                      "Q1",
                      "Q2",
                      "Q3",
                      "Q4",
                      "OT1",
                    ].map(
                      (
                        item,
                      ) => (
                        <button
                          key={
                            item
                          }
                          onClick={() =>
                            setCurrentPeriod(
                              item,
                            )
                          }
                          className={`rounded-lg px-3 py-2 text-[9px] font-black ${
                            currentPeriod ===
                            item
                              ? "bg-[var(--club-accent)] text-[var(--club-accent-text)]"
                              : "border border-white/10 bg-black/25"
                          }`}
                        >
                          {
                            item
                          }
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-6 grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
                  <Tap
                    label="+1"
                    hint="Free throw"
                    featured
                    onClick={() =>
                      tap(
                        {
                          points: 1,
                          ft_made: 1,
                          ft_attempted: 1,
                        },
                        "points",
                      )
                    }
                  />

                  <Tap
                    label="+2"
                    hint="Two-point make"
                    featured
                    onClick={() =>
                      tap(
                        {
                          points: 2,
                          two_made: 1,
                          two_attempted: 1,
                        },
                        "points",
                      )
                    }
                  />

                  <Tap
                    label="+3"
                    hint="Three-point make"
                    featured
                    onClick={() =>
                      tap(
                        {
                          points: 3,
                          three_made: 1,
                          three_attempted: 1,
                        },
                        "points",
                      )
                    }
                  />
                </div>

                <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {[
                    [
                      "OREB",
                      {
                        rebounds: 1,
                        offensive_rebounds:
                          1,
                      },
                      "rebounds",
                    ],

                    [
                      "DREB",
                      {
                        rebounds: 1,
                        defensive_rebounds:
                          1,
                      },
                      "rebounds",
                    ],

                    [
                      "AST",
                      {
                        assists: 1,
                      },
                      "assists",
                    ],

                    [
                      "STL",
                      {
                        steals: 1,
                      },
                      "steals",
                    ],

                    [
                      "BLK",
                      {
                        blocks: 1,
                      },
                      "blocks",
                    ],

                    [
                      "TOV",
                      {
                        turnovers: 1,
                      },
                      "turnovers",
                    ],

                    [
                      "FOUL",
                      {
                        fouls: 1,
                      },
                      "fouls",
                    ],
                  ].map(
                    ([
                      label,
                      changes,
                      field,
                    ]) => (
                      <Tap
                        key={String(
                          label,
                        )}
                        label={String(
                          label,
                        )}
                        onClick={() =>
                          tap(
                            changes as Record<
                              string,
                              number
                            >,
                            String(
                              field,
                            ),
                          )
                        }
                      />
                    ),
                  )}

                  <Tap
                    label="UNDO"
                    danger
                    onClick={
                      undo
                    }
                  />
                </div>

                <div className="mt-5 min-w-0 rounded-xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[9px] font-black uppercase text-slate-500">
                    Missed
                    shots
                  </p>

                  <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      onClick={() =>
                        tap({
                          ft_attempted:
                            1,
                        })
                      }
                      className={
                        secondary
                      }
                    >
                      FT miss
                    </button>

                    <button
                      onClick={() =>
                        tap({
                          two_attempted:
                            1,
                        })
                      }
                      className={
                        secondary
                      }
                    >
                      2PT miss
                    </button>

                    <button
                      onClick={() =>
                        tap({
                          three_attempted:
                            1,
                        })
                      }
                      className={
                        secondary
                      }
                    >
                      3PT miss
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Choose a roster
                player.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {mode ===
      "box_score" ? (
        <BoxScore
          rows={
            rows
          }
          onToggle={(
            id,
            included,
          ) => {
            setRows(
              (
                current,
              ) =>
                current.map(
                  (
                    row,
                  ) =>
                    row.roster_member_id ===
                    id
                      ? {
                          ...row,
                          included,
                        }
                      : row,
                ),
            );

            revision.current +=
              1;

            setDirty(
              true,
            );
          }}
          onChange={
            updateRow
          }
        />
      ) : null}

      {mode ===
      "import" ? (
        <section className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
          <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
              Private source
              evidence
            </p>

            <h3 className="mt-2 break-words text-2xl font-black uppercase">
              Upload stat
              report
            </h3>

            <p className="mt-3 break-words text-sm leading-6 text-slate-400">
              Upload the report
              even when the game
              is missing.
              Image-based
              Basketball Stats
              Assistant PDFs are
              read securely in
              this browser, then
              you confirm the
              detected match
              before an
              unverified game is
              created.
            </p>

            <form
              onSubmit={(
                event,
              ) => {
                event.preventDefault();

                void uploadImport(
                  event.currentTarget,
                );
              }}
              className="mt-5 grid min-w-0 gap-3"
            >
              <input
                name="file"
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.docx,.doc"
                required
                className="w-full min-w-0 max-w-full rounded-xl border border-dashed border-white/15 bg-black/25 p-5 text-xs text-slate-400"
              />

              <button
                disabled={
                  importing ||
                  !roster.length
                }
                className={
                  primary
                }
              >
                {importing
                  ? importProgress ||
                    "Reading documentâ€¦"
                  : gameId
                    ? "Upload and extract rows"
                    : "Read report and create missing game"}
              </button>
            </form>

            {reportDraft?.match &&
            reportFile ? (
              <div className="mt-5 min-w-0 rounded-2xl border border-[var(--club-accent)]/35 bg-[var(--club-accent)]/[.06] p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--club-accent)]">
                      Confirm
                      detected
                      match
                    </p>

                    <p className="mt-1 break-words text-xs text-slate-400">
                      Nothing is
                      public. The
                      new game
                      will wait
                      for Super
                      Admin
                      verification.
                    </p>
                  </div>

                  <span className="self-start rounded-full bg-black/30 px-2.5 py-1 text-[8px] font-black uppercase text-slate-300">
                    {reportDraft
                      .rows
                      ?.length ||
                      0}{" "}
                    player rows
                  </span>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Home team
                    </span>

                    <input
                      value={
                        reportDraft
                          .match
                          .home_team_name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMatch(
                          "home_team_name",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        input
                      }
                    />
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Away team
                    </span>

                    <input
                      value={
                        reportDraft
                          .match
                          .away_team_name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMatch(
                          "away_team_name",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        input
                      }
                    />
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Game date
                    </span>

                    <input
                      type="date"
                      value={
                        reportDraft
                          .match
                          .game_date
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMatch(
                          "game_date",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        input
                      }
                    />
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Your team
                      side
                    </span>

                    <select
                      value={
                        reportDraft
                          .match
                          .team_side
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMatch(
                          "team_side",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        input
                      }
                    >
                      <option value="home">
                        Home
                      </option>

                      <option value="away">
                        Away
                      </option>
                    </select>
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Home score
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        reportDraft
                          .match
                          .home_score
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMatch(
                          "home_score",
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      className={
                        input
                      }
                    />
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Away score
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        reportDraft
                          .match
                          .away_score
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMatch(
                          "away_score",
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      className={
                        input
                      }
                    />
                  </label>
                </div>

                {reportDraft
                  .officials
                  ?.length ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase text-slate-500">
                      Detected
                      officials
                    </p>

                    <p className="mt-2 break-words text-xs text-slate-300">
                      {reportDraft.officials.join(
                        " Â· ",
                      )}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      importing
                    }
                    onClick={() =>
                      void storeImport(
                        reportFile,
                        reportDraft,
                      )
                    }
                    className={
                      primary
                    }
                  >
                    {importing
                      ? importProgress ||
                        "Savingâ€¦"
                      : "Confirm, create game and continue"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      importing
                    }
                    onClick={() => {
                      setReportDraft(
                        null,
                      );

                      setReportFile(
                        null,
                      );
                    }}
                    className={
                      secondary
                    }
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {importWarnings.length ? (
              <div className="mt-5 grid min-w-0 gap-2">
                {importWarnings.map(
                  (
                    warning,
                  ) => (
                    <p
                      key={
                        warning
                      }
                      className="break-words rounded-lg border border-yellow-400/15 bg-yellow-500/[.06] p-3 text-xs leading-5 text-yellow-100"
                    >
                      {
                        warning
                      }
                    </p>
                  ),
                )}
              </div>
            ) : null}

            <div className="mt-6 min-w-0">
              <p className="text-[9px] font-black uppercase text-slate-500">
                Recent imports
              </p>

              <div className="mt-3 grid min-w-0 gap-2">
                {(
                  data?.imports ||
                  []
                )
                  .slice(
                    0,
                    5,
                  )
                  .map(
                    (
                      item: JsonRecord,
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <p className="truncate text-xs font-black">
                          {
                            item.file_name
                          }
                        </p>

                        <p className="mt-1 text-[9px] uppercase text-slate-600">
                          {
                            item.extraction_status
                          }
                        </p>
                      </div>
                    ),
                  )}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
                  Human review
                  required
                </p>

                <h3 className="mt-2 break-words text-2xl font-black uppercase">
                  Match extracted
                  players
                </h3>
              </div>

              <button
                disabled={
                  !importRows.length
                }
                onClick={
                  loadImport
                }
                className={
                  primary
                }
              >
                Load review
                grid
              </button>
            </div>

            <div className="mt-5 grid min-w-0 gap-3">
              {importRows.map(
                (
                  row,
                  index,
                ) => (
                  <div
                    key={`${row.player_name}-${index}`}
                    className="grid min-w-0 gap-3 rounded-xl border border-white/10 bg-black/25 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-black">
                        {
                          row.player_name
                        }
                      </p>

                      <p className="mt-1 break-words text-[9px] text-slate-500">
                        PTS{" "}
                        {
                          row.points
                        }{" "}
                        Â· REB{" "}
                        {
                          row.rebounds
                        }{" "}
                        Â· AST{" "}
                        {
                          row.assists
                        }
                      </p>
                    </div>

                    <select
                      value={
                        row.roster_member_id ||
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        setImportRows(
                          (
                            current,
                          ) =>
                            current.map(
                              (
                                item,
                                itemIndex,
                              ) =>
                                itemIndex ===
                                index
                                  ? {
                                      ...item,

                                      roster_member_id:
                                        event
                                          .target
                                          .value ||
                                        null,
                                    }
                                  : item,
                            ),
                        )
                      }
                      className={
                        input
                      }
                    >
                      <option value="">
                        Choose
                        roster
                        player
                      </option>

                      {roster.map(
                        (
                          member,
                        ) => (
                          <option
                            key={
                              member.id
                            }
                            value={
                              member.id
                            }
                          >
                            {
                              member.display_name
                            }

                            {member.jersey_number
                              ? ` Â· #${member.jersey_number}`
                              : ""}
                          </option>
                        ),
                      )}
                    </select>

                    <span
                      className={`self-start rounded-full px-2.5 py-1 text-[8px] font-black uppercase sm:self-auto ${
                        row.roster_member_id
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-yellow-500/15 text-yellow-200"
                      }`}
                    >
                      {row.roster_member_id
                        ? "Matched"
                        : "Check"}
                    </span>
                  </div>
                ),
              )}

              {!importRows.length ? (
                <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
                  Upload a stat
                  report to begin
                  the review.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {mode ===
      "coach" ? (
        <section className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
              Performance
              knowledge
            </p>

            <h3 className="mt-2 break-words text-2xl font-black uppercase">
              Publish a
              briefing
            </h3>

            <p className="mt-3 break-words text-sm leading-6 text-slate-400">
              Combine what the
              numbers show with
              what the coaching
              and performance
              staff see. Team
              messages reach all
              linked player
              logins; player
              messages stay
              targeted.
            </p>

            {data?.can_publish_briefings ? (
              <form
                onSubmit={
                  publishBriefing
                }
                className="mt-5 grid min-w-0 gap-3"
              >
                <select
                  value={
                    briefing.audience
                  }
                  onChange={(
                    event,
                  ) =>
                    setBriefing(
                      (
                        current,
                      ) => ({
                        ...current,

                        audience:
                          event
                            .target
                            .value,

                        roster_member_id:
                          "",
                      }),
                    )
                  }
                  className={
                    input
                  }
                >
                  <option value="team">
                    Whole team
                  </option>

                  <option value="player">
                    One player
                  </option>
                </select>

                {briefing.audience ===
                "player" ? (
                  <select
                    required
                    value={
                      briefing.roster_member_id
                    }
                    onChange={(
                      event,
                    ) =>
                      setBriefing(
                        (
                          current,
                        ) => ({
                          ...current,

                          roster_member_id:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className={
                      input
                    }
                  >
                    <option value="">
                      Choose
                      linked
                      player
                    </option>

                    {roster.map(
                      (
                        member,
                      ) => (
                        <option
                          key={
                            member.id
                          }
                          value={
                            member.id
                          }
                          disabled={
                            !member.player_id
                          }
                        >
                          {
                            member.display_name
                          }

                          {member.player_id
                            ? ""
                            : " Â· login not linked"}
                        </option>
                      ),
                    )}
                  </select>
                ) : null}

                <input
                  required
                  value={
                    briefing.title
                  }
                  onChange={(
                    event,
                  ) =>
                    setBriefing(
                      (
                        current,
                      ) => ({
                        ...current,

                        title:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Briefing title"
                  className={
                    input
                  }
                />

                <input
                  value={
                    briefing.focus_area
                  }
                  onChange={(
                    event,
                  ) =>
                    setBriefing(
                      (
                        current,
                      ) => ({
                        ...current,

                        focus_area:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Training focus"
                  className={
                    input
                  }
                />

                <textarea
                  required
                  rows={
                    7
                  }
                  value={
                    briefing.body
                  }
                  onChange={(
                    event,
                  ) =>
                    setBriefing(
                      (
                        current,
                      ) => ({
                        ...current,

                        body:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="What the player or team needs to know and do next"
                  className={
                    input
                  }
                />

                <button
                  className={
                    primary
                  }
                >
                  Publish
                  briefing
                </button>
              </form>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-6">
            <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
                Player-by-player
                alerts
              </p>

              <h3 className="mt-2 break-words text-2xl font-black uppercase">
                Individual
                development
              </h3>

              <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                {(
                  intelligence.player_recommendations ||
                  []
                ).map(
                  (
                    item: JsonRecord,
                  ) => (
                    <Recommendation
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      onUse={() =>
                        applyRecommendation(
                          item,
                        )
                      }
                    />
                  ),
                )}

                {!(
                  intelligence.player_recommendations ||
                  []
                ).length ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-500 sm:col-span-2">
                    No individual
                    alert has
                    crossed the
                    action
                    threshold yet.
                    More complete
                    player box
                    scores will
                    improve the
                    view.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
                Published
              </p>

              <h3 className="mt-2 break-words text-2xl font-black uppercase">
                Briefing history
              </h3>

              <div className="mt-5 grid min-w-0 gap-3">
                {(
                  data?.briefings ||
                  []
                ).map(
                  (
                    item: JsonRecord,
                  ) => (
                    <article
                      key={
                        item.id
                      }
                      className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <p className="min-w-0 break-words font-black">
                          {
                            item.title
                          }
                        </p>

                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[8px] font-black uppercase text-emerald-300">
                          {
                            item.audience
                          }
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-line break-words text-xs leading-5 text-slate-400">
                        {
                          item.body
                        }
                      </p>
                    </article>
                  ),
                )}

                {!(
                  data?.briefings ||
                  []
                ).length ? (
                  <p className="text-sm text-slate-500">
                    No coach
                    briefings
                    published yet.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeSessions.length ? (
        <section className="w-full min-w-0 max-w-full rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
            Governed history
          </p>

          <h3 className="mt-2 break-words text-2xl font-black uppercase">
            Recent complete
            games
          </h3>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {activeSessions.map(
              (
                session: JsonRecord,
              ) => (
                <article
                  key={
                    session.id
                  }
                  className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <p className="break-words text-xs font-black uppercase">
                    {availableGames.find(
                      (
                        game,
                      ) =>
                        game.id ===
                        session.game_id,
                    )?.title ||
                      "Linked game"}
                  </p>

                  <p className="mt-2 break-words text-[9px] uppercase text-slate-500">
                    {String(
                      session.mode ||
                        "game",
                    ).replaceAll(
                      "_",
                      " ",
                    )}{" "}
                    Â·{" "}
                    {
                      session.status
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function IQMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="truncate text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 truncate text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
        {label}
      </p>
    </div>
  );
}

function Recommendation({
  item,
  onUse,
}: {
  item: JsonRecord;
  onUse: () => void;
}) {
  return (
    <article
      className={`min-w-0 rounded-xl border p-4 ${
        item.priority ===
        "high"
          ? "border-red-400/20 bg-red-500/[.06]"
          : item.priority ===
              "positive"
            ? "border-emerald-400/20 bg-emerald-500/[.06]"
            : "border-orange-400/20 bg-orange-500/[.05]"
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[8px] font-black uppercase tracking-[.12em] text-[var(--club-accent)]">
          {
            item.focus
          }
        </p>

        <span className="shrink-0 rounded-full bg-black/30 px-2 py-1 text-[7px] font-black uppercase text-slate-400">
          {
            item.priority
          }
        </span>
      </div>

      <h3 className="mt-2 break-words text-base font-black leading-tight">
        {
          item.headline
        }
      </h3>

      <p className="mt-2 break-words text-xs leading-5 text-slate-400">
        {
          item.evidence
        }
      </p>

      <p className="mt-3 break-words text-xs leading-5 text-slate-300">
        {
          item.training
        }
      </p>

      <button
        onClick={
          onUse
        }
        className="mt-4 max-w-full break-words text-left text-[8px] font-black uppercase text-[var(--club-accent)]"
      >
        Send as briefing â†’
      </button>
    </article>
  );
}

function Tap({
  label,
  hint,
  featured = false,
  danger = false,
  onClick,
}: {
  label: string;
  hint?: string;
  featured?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`min-w-0 min-h-20 rounded-xl border p-2 text-center transition active:scale-95 sm:p-3 ${
        featured
          ? "border-[var(--club-accent)] bg-[var(--club-accent)] text-[var(--club-accent-text)]"
          : danger
            ? "border-red-400/25 bg-red-500/10 text-red-200"
            : "border-white/10 bg-white/[.04] hover:border-[var(--club-accent)]"
      }`}
    >
      <span
        className={`block break-words font-black ${
          featured
            ? "text-2xl sm:text-3xl"
            : "text-sm"
        }`}
      >
        {label}
      </span>

      {hint ? (
        <span className="mt-1 block break-words text-[7px] font-bold uppercase opacity-70 sm:text-[8px]">
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <span className="min-w-[3.5rem] rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-center">
      <span className="block text-sm font-black text-white">
        {Number(
          value || 0,
        )}
      </span>

      <span className="mt-0.5 block text-[7px] font-black uppercase text-slate-600">
        {label}
      </span>
    </span>
  );
}

function BoxScore({
  rows,
  onToggle,
  onChange,
}: {
  rows: StatRow[];

  onToggle: (
    id: string,
    included: boolean,
  ) => void;

  onChange: (
    id: string,
    field: string,
    value: unknown,
  ) => void;
}) {
  const groups = [
    {
      title: "Core",

      fields: [
        [
          "points",
          "PTS",
        ],

        [
          "minutes",
          "MIN",
        ],

        [
          "plus_minus",
          "+/-",
        ],
      ],
    },

    {
      title:
        "Rebounding & playmaking",

      fields: [
        [
          "offensive_rebounds",
          "OREB",
        ],

        [
          "defensive_rebounds",
          "DREB",
        ],

        [
          "assists",
          "AST",
        ],

        [
          "turnovers",
          "TO",
        ],
      ],
    },

    {
      title: "Defence",

      fields: [
        [
          "steals",
          "STL",
        ],

        [
          "blocks",
          "BLK",
        ],

        [
          "fouls",
          "PF",
        ],
      ],
    },

    {
      title: "2PT",

      fields: [
        [
          "two_made",
          "Made",
        ],

        [
          "two_attempted",
          "Attempts",
        ],
      ],
    },

    {
      title: "3PT",

      fields: [
        [
          "three_made",
          "Made",
        ],

        [
          "three_attempted",
          "Attempts",
        ],
      ],
    },

    {
      title:
        "Free throws",

      fields: [
        [
          "ft_made",
          "Made",
        ],

        [
          "ft_attempted",
          "Attempts",
        ],
      ],
    },
  ] as const;

  return (
    <section className="w-full min-w-0 max-w-full rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
          Premium compact
          entry
        </p>

        <h3 className="mt-2 break-words text-2xl font-black uppercase">
          Player box score
        </h3>

        <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-400">
          Mark only players
          who participated.
          Rebounds total
          automatically from
          offensive and
          defensive rebounds.
        </p>
      </div>

      <div className="mt-5 grid min-w-0 gap-4">
        {rows.map(
          (
            row,
          ) => (
            <article
              key={
                row.roster_member_id
              }
              className={`min-w-0 rounded-2xl border p-4 transition sm:p-5 ${
                row.included
                  ? "border-[var(--club-accent)]/40 bg-white/[.035]"
                  : "border-white/10 bg-black/20 opacity-70"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      row.included
                    }
                    onChange={(
                      event,
                    ) =>
                      onToggle(
                        row.roster_member_id,
                        event
                          .target
                          .checked,
                      )
                    }
                    className="h-5 w-5 shrink-0 accent-orange-500"
                  />

                  <span className="min-w-0">
                    <span className="block break-words text-sm font-black">
                      {
                        row.display_name
                      }
                    </span>

                    <span className="mt-1 block break-words text-[9px] font-bold uppercase text-slate-600">
                      {row.jersey_number
                        ? `#${row.jersey_number}`
                        : "Roster"}

                      {row.player_id
                        ? " Â· linked player"
                        : " Â· club record"}
                    </span>
                  </span>
                </label>

                <div className="flex min-w-0 flex-wrap gap-2">
                  <StatBadge
                    label="PTS"
                    value={
                      row.points
                    }
                  />

                  <StatBadge
                    label="REB"
                    value={
                      Number(
                        row.offensive_rebounds ||
                          0,
                      ) +
                      Number(
                        row.defensive_rebounds ||
                          0,
                      )
                    }
                  />

                  <StatBadge
                    label="AST"
                    value={
                      row.assists
                    }
                  />
                </div>
              </div>

              {row.included ? (
                <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groups.map(
                    (
                      group,
                    ) => (
                      <div
                        key={
                          group.title
                        }
                        className="min-w-0 rounded-xl border border-white/[.08] bg-black/25 p-3"
                      >
                        <p className="mb-3 break-words text-[8px] font-black uppercase tracking-[.14em] text-slate-500">
                          {
                            group.title
                          }
                        </p>

                        <div
                          className={`grid min-w-0 gap-2 ${
                            group
                              .fields
                              .length >=
                            3
                              ? "grid-cols-2 sm:grid-cols-3"
                              : "grid-cols-2"
                          }`}
                        >
                          {group.fields.map(
                            ([
                              field,
                              label,
                            ]) => (
                              <label
                                key={
                                  field
                                }
                                className="min-w-0"
                              >
                                <span className="mb-1.5 block break-words text-[8px] font-black uppercase text-slate-600">
                                  {
                                    label
                                  }
                                </span>

                                <input
                                  aria-label={`${row.display_name} ${field}`}
                                  type="number"
                                  min={
                                    field ===
                                    "plus_minus"
                                      ? undefined
                                      : "0"
                                  }
                                  step={
                                    field ===
                                    "minutes"
                                      ? "0.1"
                                      : "1"
                                  }
                                  value={
                                    row[
                                      field
                                    ] ??
                                    0
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    onChange(
                                      row.roster_member_id,
                                      field,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className="w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-black/35 px-2 py-2.5 text-center text-xs font-black outline-none transition focus:border-[var(--club-accent)]"
                                />
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onToggle(
                      row.roster_member_id,
                      true,
                    )
                  }
                  className="mt-4 max-w-full break-words text-left text-[9px] font-black uppercase text-[var(--club-accent)]"
                >
                  Add player to
                  this game â†’
                </button>
              )}
            </article>
          ),
        )}
      </div>
    </section>
  );
}

