"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAdminPermission,
} from "@/app/components/AdminPermissionContext";
import { getGameCategory } from "@/lib/hoops/gameContext";

type RosterParticipant = {
  player_id: string;
  team_side: string;
  roster_status: string;

  person?: {
    full_name?: string | null;
    name?: string | null;
    nickname?: string | null;
  } | null;
};

type GameStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "postponed"
  | "cancelled";

type GameRow = {
  id: string;

  game_category?:
    | string
    | null;

  competition_id?:
    | string
    | null;

  event_id?:
    | string
    | null;

  league_id?:
    | string
    | null;

  home_team_id?:
    | string
    | null;

  away_team_id?:
    | string
    | null;

  title?:
    | string
    | null;

  game_title?:
    | string
    | null;

  competition_name?:
    | string
    | null;

  season_label?:
    | string
    | null;

  division?:
    | string
    | null;

  home_team_name?:
    | string
    | null;

  away_team_name?:
    | string
    | null;

  game_format?:
    | string
    | null;

  match_type?:
    | string
    | null;

  game_stage?:
    | string
    | null;

  game_date?:
    | string
    | null;

  venue?:
    | string
    | null;

  court?:
    | string
    | null;

  status: GameStatus;

  home_score?:
    | number
    | null;

  team_score?:
    | number
    | null;

  away_score?:
    | number
    | null;

  opponent_score?:
    | number
    | null;

  status_note?:
    | string
    | null;

  verification_status?:
    | string
    | null;

  is_public?:
    | boolean
    | null;

  version: number;

  roster_count: number;
  media_count: number;

  roster_participants:
    RosterParticipant[];
};

type EventRow = {
  event_id: string;
  title: string;
  is_public?: boolean;
};

type CategoryKey =
  | "all"
  | "one_on_one"
  | "league"
  | "court_takeover"
  | "event"
  | "competition"
  | "friendly"
  | "other";

type TeamFolder = {
  key: string;

  name: string;

  teamId?:
    | string
    | null;

  kind:
    | "fackts"
    | "team";

  games: GameRow[];
};

type BulkRow = {
  setup_key: string;
  home_team_name: string;
  away_team_name: string;
  game_date: string;
  game_stage: string;
  court: string;
};

const categories: Array<{
  key: CategoryKey;
  label: string;
  description: string;
}> = [
  {
    key: "all",
    label: "All Games",
    description:
      "Everything inside this team folder.",
  },

  {
    key: "one_on_one",
    label: "1v1",
    description:
      "FACKTS Kings and other one-on-one competition games.",
  },

  {
    key: "league",
    label: "League Games",
    description:
      "KBF, SIEL, NCL and other linked league fixtures.",
  },

  {
    key: "court_takeover",
    label: "Court Takeovers",
    description:
      "FACKTS Court Takeover games.",
  },

  {
    key: "event",
    label: "Events",
    description:
      "Tournament and event-linked games.",
  },

  {
    key: "competition",
    label: "Competitions",
    description:
      "Structured competitions outside the league/event categories.",
  },

  {
    key: "friendly",
    label: "Friendlies",
    description:
      "Friendly games and scrimmages.",
  },

  {
    key: "other",
    label: "Other",
    description:
      "Games that still need a final category.",
  },
];

const transitions: Record<
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

function newBulkRow(): BulkRow {
  return {
    setup_key: `bulk-${
      globalThis.crypto
        ?.randomUUID?.() ||
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
    }`,

    home_team_name: "",
    away_team_name: "",
    game_date: "",
    game_stage: "Game",
    court: "",
  };
}

function normalize(
  value: unknown,
) {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase();
}

function gameSearchText(
  game: GameRow,
) {
  return [
    game.title,
    game.game_title,
    game.competition_name,
    game.season_label,
    game.division,
    game.home_team_name,
    game.away_team_name,
    game.game_format,
    game.match_type,
    game.game_stage,
    game.venue,
    game.court,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function categoryForGame(
  game: GameRow,
): Exclude<
  CategoryKey,
  "all"
> {
  return getGameCategory(game);
}

function isFacktsOwnedGame(
  game: GameRow,
) {
  const category =
    categoryForGame(
      game,
    );

  const text =
    gameSearchText(
      game,
    );

  /*
   * FACKTS is an organisation folder.
   *
   * Games can also remain inside their actual club folder.
   * This is intentional: FACKTS can own the competition
   * while Eagles, Shields, etc. remain the participating team.
   */
  if (
    [
      "one_on_one",
      "court_takeover",
      "event",
    ].includes(
      category,
    )
  ) {
    return true;
  }

  if (
    /\bfackts\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (
    !game.home_team_id &&
    !game.away_team_id
  ) {
    return true;
  }

  return false;
}

function formatDate(
  value?:
    | string
    | null,
) {
  if (!value) {
    return "Date not set";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    date,
  );
}

function statusClass(
  status: GameStatus,
) {
  if (
    status ===
    "live"
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-100";
  }

  if (
    status ===
    "completed"
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (
    [
      "postponed",
      "cancelled",
    ].includes(
      status,
    )
  ) {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function categoryLabel(
  game: GameRow,
) {
  const category =
    categoryForGame(
      game,
    );

  return (
    categories.find(
      (
        item,
      ) =>
        item.key ===
        category,
    )?.label ||
    "Other"
  );
}

function GameCard({
  game,
  readOnly,
  onSaved,
}: {
  game: GameRow;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [
    status,
    setStatus,
  ] =
    useState<GameStatus>(
      game.status,
    );

  const [
    homeScore,
    setHomeScore,
  ] = useState(
    String(
      game.home_score ??
        game.team_score ??
        "",
    ),
  );

  const [
    awayScore,
    setAwayScore,
  ] = useState(
    String(
      game.away_score ??
        game.opponent_score ??
        "",
    ),
  );

  const [
    statusNote,
    setStatusNote,
  ] = useState(
    game.status_note ??
      "",
  );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const scoring =
    [
      "live",
      "completed",
    ].includes(
      status,
    );

  const statusChanged =
    status !==
    game.status;

  const noteRequired =
    statusChanged &&
    [
      "postponed",
      "cancelled",
      "upcoming",
    ].includes(
      status,
    );

  async function save() {
    setSaving(true);

    setMessage("");

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
                game.id,

              expected_version:
                game.version,

              status,

              home_score:
                scoring
                  ? homeScore
                  : null,

              away_score:
                scoring
                  ? awayScore
                  : null,

              status_note:
                statusNote,
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
      setMessage(
        result.error ||
          "Game update failed.",
      );
    } else {
      setMessage(
        result.message ||
          "Game saved.",
      );

      onSaved();
    }

    setSaving(false);
  }

  return (
    <article className="min-w-0 rounded-3xl border border-white/10 bg-slate-950 p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${statusClass(
                game.status,
              )}`}
            >
              {
                game.status
              }
            </span>

            <span className="rounded-full border border-orange-400/20 bg-orange-500/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-orange-200">
              {categoryLabel(
                game,
              )}
            </span>

            {game.season_label ? (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                {
                  game.season_label
                }
              </span>
            ) : null}

            {game.division ? (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                {
                  game.division
                }
              </span>
            ) : null}

            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
              {game.verification_status ||
                "unverified"}
            </span>
          </div>

          <h2 className="mt-4 break-words text-xl font-black sm:text-2xl">
            {game.home_team_name ||
              "Home"}

            <span className="mx-2 text-slate-600">
              vs
            </span>

            {game.away_team_name ||
              "Away"}
          </h2>

          <p className="mt-2 break-words text-xs leading-5 text-slate-500">
            {game.competition_name ||
              "FACKTS Hoops"}

            {" · "}

            {game.game_stage ||
              "Game"}
          </p>
        </div>

        <div className="shrink-0 text-left text-sm text-slate-400 lg:text-right">
          <p className="font-bold text-slate-200">
            {formatDate(
              game.game_date,
            )}
          </p>

          <p className="mt-1">
            {[
              game.venue,
              game.court,
            ]
              .filter(
                Boolean,
              )
              .join(" · ") ||
              "Venue not set"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 rounded-2xl border border-white/[.06] bg-black/30 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_110px_110px_auto]">
        <label className="min-w-0 text-[9px] font-black uppercase tracking-wider text-slate-500">
          Status

          <select
            disabled={
              readOnly
            }
            value={
              status
            }
            onChange={(
              event,
            ) => {
              const next =
                event.target
                  .value as GameStatus;

              setStatus(
                next,
              );

              if (
                ![
                  "live",
                  "completed",
                ].includes(
                  next,
                )
              ) {
                setHomeScore(
                  "",
                );

                setAwayScore(
                  "",
                );
              }
            }}
            className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            {transitions[
              game.status
            ].map(
              (
                value,
              ) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {value}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="min-w-0 text-[9px] font-black uppercase tracking-wider text-slate-500">
          Home score

          <input
            type="number"
            min="0"
            step="1"
            disabled={
              readOnly ||
              !scoring
            }
            value={
              homeScore
            }
            onChange={(
              event,
            ) =>
              setHomeScore(
                event.target
                  .value,
              )
            }
            className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-black text-white disabled:opacity-40"
          />
        </label>

        <label className="min-w-0 text-[9px] font-black uppercase tracking-wider text-slate-500">
          Away score

          <input
            type="number"
            min="0"
            step="1"
            disabled={
              readOnly ||
              !scoring
            }
            value={
              awayScore
            }
            onChange={(
              event,
            ) =>
              setAwayScore(
                event.target
                  .value,
              )
            }
            className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-black text-white disabled:opacity-40"
          />
        </label>

        <button
          type="button"
          disabled={
            readOnly ||
            saving
          }
          onClick={() =>
            void save()
          }
          className="self-end rounded-xl bg-orange-500 px-4 py-3 text-xs font-black uppercase text-black transition hover:bg-orange-400 disabled:opacity-50"
        >
          {readOnly
            ? "Read only"
            : saving
              ? "Saving…"
              : "Quick Save"}
        </button>

        {noteRequired ||
        statusNote ? (
          <label className="min-w-0 text-[9px] font-black uppercase tracking-wider text-slate-500 md:col-span-2 xl:col-span-4">
            Status note{" "}
            {noteRequired
              ? "— required"
              : ""}

            <textarea
              disabled={
                readOnly
              }
              value={
                statusNote
              }
              onChange={(
                event,
              ) =>
                setStatusNote(
                  event.target
                    .value,
                )
              }
              className="mt-2 min-h-20 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white disabled:opacity-50"
            />
          </label>
        ) : null}
      </div>

      {message ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        <Link
          href={`/admin/games/editor?game_id=${encodeURIComponent(
            game.id,
          )}`}
          className="rounded-xl bg-white px-4 py-2.5 text-[10px] font-black uppercase text-black"
        >
          Full Game Editor
        </Link>

        <Link
          href={`/admin/rosters/${game.id}`}
          className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-black uppercase hover:border-orange-300/40"
        >
          Roster (
          {
            game.roster_count
          }
          )
        </Link>

        <Link
          href={`/admin/stats?game_id=${encodeURIComponent(
            game.id,
          )}`}
          className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-black uppercase hover:border-orange-300/40"
        >
          Statistics
        </Link>

        <Link
          href={`/admin/media?game_id=${encodeURIComponent(
            game.id,
          )}`}
          className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-black uppercase hover:border-orange-300/40"
        >
          Media (
          {
            game.media_count
          }
          )
        </Link>

        <Link
          href={`/games/${game.id}`}
          target="_blank"
          className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-black uppercase hover:border-orange-300/40"
        >
          Match Centre ↗
        </Link>
      </div>
    </article>
  );
}

export default function GamesAdminPage() {
  const {
    readOnly,
  } =
    useAdminPermission();

  const [
    games,
    setGames,
  ] =
    useState<GameRow[]>(
      [],
    );

  const [
    events,
    setEvents,
  ] =
    useState<EventRow[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  const [
    selectedTeamKey,
    setSelectedTeamKey,
  ] =
    useState(
      "fackts",
    );

  const [
    category,
    setCategory,
  ] =
    useState<CategoryKey>(
      "all",
    );

  const [
    showBulk,
    setShowBulk,
  ] =
    useState(false);

  const [
    bulkEvent,
    setBulkEvent,
  ] =
    useState("");

  const [
    bulkRows,
    setBulkRows,
  ] =
    useState<BulkRow[]>([
      newBulkRow(),
      newBulkRow(),
    ]);

  const [
    bulkSaving,
    setBulkSaving,
  ] =
    useState(false);

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        const response =
          await fetch(
            "/api/admin/games",
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
          setGames(
            [],
          );

          setMessage(
            result.error ||
              "Games could not be loaded.",
          );
        } else {
          setGames(
            result.games ||
              [],
          );

          setEvents(
            result.events ||
              [],
          );

          setMessage(
            "",
          );
        }

        setLoading(
          false,
        );
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const teamFolders =
    useMemo<
      TeamFolder[]
    >(() => {
      const folderMap =
        new Map<
          string,
          TeamFolder
        >();

      folderMap.set(
        "fackts",
        {
          key:
            "fackts",

          name:
            "FACKTS",

          teamId:
            null,

          kind:
            "fackts",

          games:
            games.filter(
              isFacktsOwnedGame,
            ),
        },
      );

      function ensureTeam(
        teamId:
          | string
          | null
          | undefined,

        teamName:
          | string
          | null
          | undefined,
      ) {
        if (
          !teamId
        ) {
          return;
        }

        const key =
          `team:${teamId}`;

        if (
          !folderMap.has(
            key,
          )
        ) {
          folderMap.set(
            key,
            {
              key,

              teamId,

              name:
                teamName ||
                "Registered Team",

              kind:
                "team",

              games:
                [],
            },
          );
        }
      }

      games.forEach(
        (
          game,
        ) => {
          ensureTeam(
            game.home_team_id,
            game.home_team_name,
          );

          ensureTeam(
            game.away_team_id,
            game.away_team_name,
          );

          if (
            game.home_team_id
          ) {
            folderMap
              .get(
                `team:${game.home_team_id}`,
              )
              ?.games.push(
                game,
              );
          }

          if (
            game.away_team_id &&
            game.away_team_id !==
              game.home_team_id
          ) {
            folderMap
              .get(
                `team:${game.away_team_id}`,
              )
              ?.games.push(
                game,
              );
          }
        },
      );

      return Array.from(
        folderMap.values(),
      ).sort(
        (
          left,
          right,
        ) => {
          if (
            left.kind ===
            "fackts"
          ) {
            return -1;
          }

          if (
            right.kind ===
            "fackts"
          ) {
            return 1;
          }

          return left.name.localeCompare(
            right.name,
          );
        },
      );
    }, [games]);

  useEffect(() => {
    if (
      !teamFolders.some(
        (
          folder,
        ) =>
          folder.key ===
          selectedTeamKey,
      )
    ) {
      setSelectedTeamKey(
        "fackts",
      );
    }
  }, [
    selectedTeamKey,
    teamFolders,
  ]);

  const selectedFolder =
    teamFolders.find(
      (
        folder,
      ) =>
        folder.key ===
        selectedTeamKey,
    ) ||
    teamFolders[0] ||
    null;

  const categoryCounts =
    useMemo(
      () => {
        const counts: Record<
          CategoryKey,
          number
        > = {
          all:
            selectedFolder
              ?.games
              .length ||
            0,

          one_on_one:
            0,

          league:
            0,

          court_takeover:
            0,

          event:
            0,

          competition:
            0,

          friendly:
            0,

          other:
            0,
        };

        (
          selectedFolder
            ?.games ||
          []
        ).forEach(
          (
            game,
          ) => {
            counts[
              categoryForGame(
                game,
              )
            ] += 1;
          },
        );

        return counts;
      },
      [
        selectedFolder,
      ],
    );

  const visibleGames =
    useMemo(
      () => {
        const query =
          normalize(
            search,
          );

        return (
          selectedFolder
            ?.games ||
          []
        )
          .filter(
            (
              game,
            ) =>
              category ===
                "all" ||
              categoryForGame(
                game,
              ) ===
                category,
          )
          .filter(
            (
              game,
            ) =>
              statusFilter ===
                "all" ||
              game.status ===
                statusFilter,
          )
          .filter(
            (
              game,
            ) =>
              !query ||
              gameSearchText(
                game,
              ).includes(
                query,
              ),
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.game_date ||
                  0,
              ).getTime() -
              new Date(
                left.game_date ||
                  0,
              ).getTime(),
          );
      },
      [
        category,
        search,
        selectedFolder,
        statusFilter,
      ],
    );

  const totalCompleted =
    games.filter(
      (
        game,
      ) =>
        game.status ===
        "completed",
    ).length;

  const totalLive =
    games.filter(
      (
        game,
      ) =>
        game.status ===
        "live",
    ).length;

  const totalUnverified =
    games.filter(
      (
        game,
      ) =>
        game.status ===
          "completed" &&
        game.verification_status !==
          "verified",
    ).length;

  function chooseTeam(
    key: string,
  ) {
    setSelectedTeamKey(
      key,
    );

    setCategory(
      "all",
    );

    setSearch(
      "",
    );

    setStatusFilter(
      "all",
    );
  }

  function updateBulk(
    index: number,
    key:
      keyof BulkRow,
    value: string,
  ) {
    setBulkRows(
      (
        current,
      ) =>
        current.map(
          (
            row,
            rowIndex,
          ) =>
            rowIndex ===
            index
              ? {
                  ...row,
                  [key]:
                    value,
                }
              : row,
        ),
    );
  }

  async function scheduleBulk() {
    if (
      !bulkEvent
    ) {
      setMessage(
        "Choose an event for the bulk schedule.",
      );

      return;
    }

    setBulkSaving(
      true,
    );

    setMessage(
      "",
    );

    const selectedEvent =
      events.find(
        (
          event,
        ) =>
          event.event_id ===
          bulkEvent,
      );

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

          body: JSON.stringify(
            {
              games:
                bulkRows.map(
                  (
                    row,
                  ) => ({
                    ...row,

                    event_id:
                      bulkEvent,

                    competition_name:
                      selectedEvent?.title,

                    status:
                      "upcoming",

                    home_score:
                      null,

                    away_score:
                      null,
                  }),
                ),
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
      setMessage(
        result.error ||
          "Bulk schedule could not be saved.",
      );
    } else {
      setMessage(
        result.message ||
          "Games scheduled.",
      );

      setBulkRows([
        newBulkRow(),
        newBulkRow(),
      ]);

      setShowBulk(
        false,
      );

      await load();
    }

    setBulkSaving(
      false,
    );
  }

  const createUrl =
    selectedFolder
      ? `/admin/games/editor?${
          selectedFolder.teamId
            ? `team_id=${encodeURIComponent(
                selectedFolder.teamId,
              )}&`
            : "team=fackts&"
        }category=${encodeURIComponent(
          category ===
            "all"
            ? "other"
            : category,
        )}`
      : "/admin/games/editor";

  return (
    <main className="min-h-screen bg-[#020712] px-3 py-6 text-white sm:px-5 lg:px-7">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_32%),linear-gradient(135deg,#07162b,#020617)] p-5 shadow-2xl sm:p-7">
          <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-orange-300">
                FACKTS Hoops
                Operations
              </p>

              <h1 className="mt-2 break-words text-3xl font-black uppercase sm:text-5xl">
                Team Games Hub
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Enter through the
                team first, then
                work inside its
                league games,
                competitions,
                events, 1v1s,
                court takeovers
                and other game
                records.
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap gap-2">
              {!readOnly ? (
                <Link
                  href={
                    createUrl
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-orange-400"
                >
                  + New Game
                </Link>
              ) : null}

              {!readOnly ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowBulk(
                      (
                        value,
                      ) =>
                        !value,
                    )
                  }
                  className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black uppercase text-slate-300"
                >
                  Bulk Schedule
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-7 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <DashboardMetric
              label="All games"
              value={
                games.length
              }
            />

            <DashboardMetric
              label="Completed"
              value={
                totalCompleted
              }
            />

            <DashboardMetric
              label="Live"
              value={
                totalLive
              }
            />

            <DashboardMetric
              label="Needs verification"
              value={
                totalUnverified
              }
            />
          </div>
        </header>

        {message ? (
          <div className="mt-5 rounded-xl border border-orange-400/20 bg-orange-500/[.08] p-4 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        {showBulk ? (
          <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">
                  Batch scheduling
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Schedule Event
                  Games
                </h2>
              </div>

              <select
                value={
                  bulkEvent
                }
                onChange={(
                  event,
                ) =>
                  setBulkEvent(
                    event.target
                      .value,
                  )
                }
                className="min-w-0 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white lg:min-w-80"
              >
                <option value="">
                  Choose event
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
            </div>

            <div className="mt-5 grid gap-3">
              {bulkRows.map(
                (
                  row,
                  index,
                ) => (
                  <div
                    key={
                      row.setup_key
                    }
                    className="grid min-w-0 gap-2 rounded-xl border border-white/[.07] bg-black/30 p-3 md:grid-cols-5"
                  >
                    <input
                      value={
                        row.home_team_name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBulk(
                          index,
                          "home_team_name",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Home team"
                      className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm"
                    />

                    <input
                      value={
                        row.away_team_name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBulk(
                          index,
                          "away_team_name",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Away team"
                      className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm"
                    />

                    <input
                      type="datetime-local"
                      value={
                        row.game_date
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBulk(
                          index,
                          "game_date",
                          event.target
                            .value,
                        )
                      }
                      className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm"
                    />

                    <input
                      value={
                        row.game_stage
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBulk(
                          index,
                          "game_stage",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Stage"
                      className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm"
                    />

                    <input
                      value={
                        row.court
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBulk(
                          index,
                          "court",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Court"
                      className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm"
                    />
                  </div>
                ),
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setBulkRows(
                    (
                      current,
                    ) => [
                      ...current,
                      newBulkRow(),
                    ],
                  )
                }
                className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase"
              >
                + Add Row
              </button>

              <button
                type="button"
                disabled={
                  bulkSaving
                }
                onClick={() =>
                  void scheduleBulk()
                }
                className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-50"
              >
                {bulkSaving
                  ? "Saving…"
                  : "Schedule Games"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">
                Step 1
              </p>

              <h2 className="mt-2 text-2xl font-black uppercase">
                Select Team
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                FACKTS-owned
                competitions have
                their own
                organisation
                folder. Registered
                clubs keep their
                own game folders.
              </p>
            </div>

            <span className="self-start rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-black uppercase text-slate-400 lg:self-auto">
              {
                teamFolders.length
              }{" "}
              folders
            </span>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamFolders.map(
              (
                folder,
              ) => (
                <button
                  key={
                    folder.key
                  }
                  type="button"
                  onClick={() =>
                    chooseTeam(
                      folder.key,
                    )
                  }
                  className={`min-w-0 rounded-2xl border p-5 text-left transition ${
                    selectedTeamKey ===
                    folder.key
                      ? "border-orange-400 bg-orange-500/[.08]"
                      : "border-white/10 bg-black/25 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-[.16em] text-orange-300">
                        {folder.kind ===
                        "fackts"
                          ? "Organisation"
                          : "Registered Team"}
                      </p>

                      <h3 className="mt-2 break-words text-lg font-black uppercase">
                        {
                          folder.name
                        }
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full bg-white/[.06] px-2.5 py-1.5 text-[9px] font-black text-slate-300">
                      {
                        folder.games.length
                      }
                    </span>
                  </div>
                </button>
              ),
            )}
          </div>
        </section>

        {selectedFolder ? (
          <>
            <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
              <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">
                    Step 2 ·{" "}
                    {
                      selectedFolder.name
                    }
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-black uppercase">
                    Select Game
                    Category
                  </h2>
                </div>

                {!readOnly ? (
                  <Link
                    href={
                      createUrl
                    }
                    className="self-start rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase text-black xl:self-auto"
                  >
                    + Add Game to{" "}
                    {
                      selectedFolder.name
                    }
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map(
                  (
                    item,
                  ) => (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() =>
                        setCategory(
                          item.key,
                        )
                      }
                      className={`min-w-0 rounded-xl border p-4 text-left transition ${
                        category ===
                        item.key
                          ? "border-orange-400 bg-orange-500/[.08]"
                          : "border-white/10 bg-black/20 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase">
                          {
                            item.label
                          }
                        </span>

                        <span className="rounded-full bg-white/[.06] px-2 py-1 text-[8px] font-black">
                          {
                            categoryCounts[
                              item.key
                            ]
                          }
                        </span>
                      </div>

                      <p className="mt-2 break-words text-[9px] leading-4 text-slate-600">
                        {
                          item.description
                        }
                      </p>
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 sm:p-6">
              <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_auto]">
                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder={`Search ${selectedFolder.name} games…`}
                  className="min-w-0 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none focus:border-orange-400"
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setStatusFilter(
                      event.target
                        .value,
                    )
                  }
                  className="min-w-0 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm"
                >
                  <option value="all">
                    All statuses
                  </option>

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

                <button
                  type="button"
                  onClick={() =>
                    void load()
                  }
                  className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  <span className="font-black text-white">
                    {
                      visibleGames.length
                    }
                  </span>{" "}
                  game
                  {visibleGames.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  in this view
                </p>

                <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                  {
                    categories.find(
                      (
                        item,
                      ) =>
                        item.key ===
                        category,
                    )?.label
                  }
                </p>
              </div>

              <div className="mt-5 grid min-w-0 gap-4">
                {loading ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                    Loading games…
                  </p>
                ) : visibleGames.length ? (
                  visibleGames.map(
                    (
                      game,
                    ) => (
                      <GameCard
                        key={
                          game.id
                        }
                        game={
                          game
                        }
                        readOnly={
                          readOnly
                        }
                        onSaved={() =>
                          void load()
                        }
                      />
                    ),
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
                    <p className="text-lg font-black">
                      No games in
                      this category
                      yet.
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Add the first
                      game directly
                      into{" "}
                      {
                        selectedFolder.name
                      }
                      .
                    </p>

                    {!readOnly ? (
                      <Link
                        href={
                          createUrl
                        }
                        className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase text-black"
                      >
                        + Add Game
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function DashboardMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-2xl font-black sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 break-words text-[8px] font-black uppercase tracking-[.13em] text-slate-600">
        {label}
      </p>
    </div>
  );
}
