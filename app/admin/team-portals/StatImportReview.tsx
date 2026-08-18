"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type JsonRecord = Record<string, any>;

type Props = {
  teamId: string;
  roster: JsonRecord[];
  onQueued?: () => void | Promise<void>;
};

const input =
  "admin-control min-h-10 w-full rounded-lg border border-blue-400/15 bg-slate-950/80 px-2.5 py-2 text-xs text-white outline-none transition focus:border-orange-400";

const primaryButton =
  "min-h-10 rounded-lg bg-orange-500 px-4 py-2 text-[10px] font-black uppercase tracking-[.06em] text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "min-h-10 rounded-lg border border-white/10 bg-white/[.04] px-4 py-2 text-[10px] font-black uppercase text-white transition hover:border-orange-400/50 disabled:opacity-50";

const dangerButton =
  "min-h-9 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase text-red-200 hover:bg-red-500/20 disabled:opacity-50";

const STAT_FIELDS: Array<{
  key: string;
  label: string;
  allowNegative?: boolean;
  decimal?: boolean;
}> = [
  { key: "points", label: "PTS" },
  { key: "offensive_rebounds", label: "OREB" },
  { key: "defensive_rebounds", label: "DREB" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "turnovers", label: "TO" },
  { key: "fouls", label: "PF" },
  { key: "minutes", label: "MIN", decimal: true },
  { key: "two_made", label: "2M" },
  { key: "two_attempted", label: "2A" },
  { key: "three_made", label: "3M" },
  { key: "three_attempted", label: "3A" },
  { key: "ft_made", label: "FTM" },
  { key: "ft_attempted", label: "FTA" },
  { key: "plus_minus", label: "+/-", allowNegative: true },
];

function blankRow(): JsonRecord {
  return {
    player_name: "",
    jersey_number: "",
    roster_member_id: null,
    player_id: null,

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
  };
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function gameTitle(item: JsonRecord) {
  const game = item.game || {};

  return (
    game.game_title ||
    game.title ||
    [game.home_team_name, game.away_team_name]
      .filter(Boolean)
      .join(" vs ") ||
    "Linked game"
  );
}

export default function StatImportReview({
  teamId,
  roster,
  onQueued,
}: Props) {
  const [imports, setImports] = useState<JsonRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<JsonRecord[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const selected = imports.find((item) => item.id === selectedId) || null;

  const load = useCallback(async () => {
    if (!teamId) {
      setImports([]);
      return;
    }

    setLoading(true);

    const response = await fetch(
      `/api/admin/team-portals/stats/review?team_id=${encodeURIComponent(
        teamId,
      )}`,
      { cache: "no-store" },
    );

    const payload = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok || !payload.ok) {
      setMessage(
        payload.error || "Stored stat imports could not be loaded.",
      );
      return;
    }

    setImports(payload.imports || []);
  }, [teamId]);

  useEffect(() => {
    setSelectedId("");
    setRows([]);
    setWarnings([]);
    setMessage("");
    void load();
  }, [load]);

  const totalPoints = useMemo(
    () =>
      rows.reduce(
        (total, row) => total + Number(row.points || 0),
        0,
      ),
    [rows],
  );

  const unmatchedCount = useMemo(
    () => rows.filter((row) => !row.roster_member_id).length,
    [rows],
  );

  const expectedScore = useMemo(() => {
    if (!selected?.game) return null;

    const game = selected.game;

    if (game.home_team_id === teamId) {
      return Number(game.home_score ?? game.team_score);
    }

    if (game.away_team_id === teamId) {
      return Number(game.away_score ?? game.opponent_score);
    }

    return null;
  }, [selected, teamId]);

  const scoreMatches =
    expectedScore !== null &&
    Number.isFinite(expectedScore) &&
    totalPoints === expectedScore;

  function openImport(item: JsonRecord) {
    setSelectedId(item.id);
    setRows(
      Array.isArray(item.extracted_rows)
        ? item.extracted_rows.map((row: JsonRecord) => ({
            ...blankRow(),
            ...row,
          }))
        : [],
    );
    setWarnings(
      Array.isArray(item.warnings)
        ? item.warnings.map(String)
        : [],
    );
    setMessage("");
  }

  function updateRow(
    index: number,
    field: string,
    value: unknown,
  ) {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const next = {
          ...row,
          [field]: value,
        };

        if (
          field === "offensive_rebounds" ||
          field === "defensive_rebounds"
        ) {
          next.rebounds =
            Number(
              field === "offensive_rebounds"
                ? value
                : next.offensive_rebounds || 0,
            ) +
            Number(
              field === "defensive_rebounds"
                ? value
                : next.defensive_rebounds || 0,
            );
        }

        return next;
      }),
    );
  }

  function matchRoster(index: number, rosterMemberId: string) {
    const member = roster.find(
      (item) => item.id === rosterMemberId,
    );

    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        if (!member) {
          return {
            ...row,
            roster_member_id: null,
            player_id: null,
          };
        }

        return {
          ...row,
          roster_member_id: member.id,
          player_id: member.player_id || null,

          player_name:
            row.player_name ||
            member.display_name ||
            member.nickname ||
            "Player",

          jersey_number:
            row.jersey_number ||
            member.jersey_number ||
            "",
        };
      }),
    );
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function removeRow(index: number) {
    if (
      !window.confirm(
        "Remove this player row from the correction draft?",
      )
    ) {
      return;
    }

    setRows((current) =>
      current.filter((_, rowIndex) => rowIndex !== index),
    );
  }

  async function saveWork() {
    if (!selected) return;

    setWorking(true);
    setMessage("");

    const response = await fetch(
      "/api/admin/team-portals/stats/review",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "save_import",
          team_id: teamId,
          import_id: selected.id,
          rows,
          warnings,
        }),
      },
    );

    const payload = await response.json().catch(() => ({}));

    setWorking(false);

    setMessage(
      payload.message ||
        payload.error ||
        (response.ok
          ? "Review saved."
          : "Review could not be saved."),
    );

    if (response.ok) {
      const keepId = selected.id;

      await load();

      setSelectedId(keepId);
    }
  }

  async function sendToGovernance() {
    if (!selected) return;

    if (!rows.length) {
      setMessage(
        "Add the player box score before sending it to governance.",
      );
      return;
    }

    if (rows.some((row) => !row.roster_member_id)) {
      setMessage(
        "Match every Eagles row to an active Eagles roster member before sending it to governance.",
      );
      return;
    }

    if (!selected.game_id) {
      setMessage(
        "This import has no canonical game attached.",
      );
      return;
    }

    if (
      expectedScore !== null &&
      Number.isFinite(expectedScore) &&
      totalPoints !== expectedScore
    ) {
      const proceed = window.confirm(
        `Player points currently total ${totalPoints}, but the official team score is ${expectedScore}. Send anyway to the governance queue? Final approval will still reject a score mismatch.`,
      );

      if (!proceed) return;
    }

    setWorking(true);
    setMessage("");

    /*
     * Save the corrected draft first so refresh/logout never loses
     * the Admin work.
     */
    const saveResponse = await fetch(
      "/api/admin/team-portals/stats/review",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "save_import",
          team_id: teamId,
          import_id: selected.id,
          rows,
          warnings,
        }),
      },
    );

    const savePayload = await saveResponse
      .json()
      .catch(() => ({}));

    if (!saveResponse.ok) {
      setWorking(false);
      setMessage(
        savePayload.error ||
          "The correction draft could not be saved.",
      );
      return;
    }

    /*
     * Reuse the current official Team Stat Import pipeline.
     * This creates team_stat_session + stat lines + submission.
     */
    const response = await fetch(
      "/api/admin/team-portals/stats/import",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          team_id: teamId,
          game_id: selected.game_id,
          import_id: selected.id,
          rows,
        }),
      },
    );

    const payload = await response.json().catch(() => ({}));

    setWorking(false);

    setMessage(
      payload.message ||
        payload.error ||
        (response.ok
          ? "Sent to governance."
          : "Could not create the stats submission."),
    );

    if (response.ok) {
      setSelectedId("");
      setRows([]);
      setWarnings([]);

      await load();

      if (onQueued) {
        await onQueued();
      }
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.04] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-eyebrow">
            Persistent recovery
          </p>

          <h3 className="mt-2 text-xl font-black">
            Stat imports needing review
          </h3>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
            Uploaded reports remain here even when automatic
            extraction fails. Open the saved evidence, repair the
            box score and continue without uploading the file again.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || working}
          className={secondaryButton}
        >
          {loading ? "Loading…" : "Refresh imports"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-500/10 p-3 text-xs leading-5 text-orange-100">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {imports.map((item) => {
          const active = item.id === selectedId;

          return (
            <article
              key={item.id}
              className={`rounded-xl border p-4 ${
                active
                  ? "border-orange-400/50 bg-orange-500/[.08]"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[8px] font-black uppercase text-orange-200">
                      {item.extraction_status}
                    </span>

                    <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[8px] font-black uppercase text-slate-300">
                      {item.extracted_row_count || 0} rows
                    </span>

                    {item.unmatched_row_count ? (
                      <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[8px] font-black uppercase text-red-200">
                        {item.unmatched_row_count} unmatched
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 break-all text-sm font-black">
                    {item.file_name}
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {gameTitle(item)}
                  </p>

                  <p className="mt-1 text-[9px] uppercase text-slate-600">
                    Uploaded {formatDate(item.created_at)}
                  </p>

                  {item.warnings?.length ? (
                    <div className="mt-3 grid gap-1">
                      {item.warnings.map(
                        (warning: string, index: number) => (
                          <p
                            key={`${item.id}-warning-${index}`}
                            className="text-[10px] leading-4 text-amber-200"
                          >
                            ⚠ {warning}
                          </p>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.original_url ? (
                    <a
                      href={item.original_url}
                      target="_blank"
                      rel="noreferrer"
                      className={secondaryButton}
                    >
                      Open original report ↗
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openImport(item)}
                    className={primaryButton}
                  >
                    Open review
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!loading && !imports.length ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm font-black">
              No unresolved stat imports
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Uploaded reports needing correction will remain here
              until they enter the normal governance queue.
            </p>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-orange-400/25 bg-slate-950/70">
          <div className="border-b border-white/10 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="admin-eyebrow">
                  Correction workspace
                </p>

                <h4 className="mt-2 text-xl font-black">
                  {gameTitle(selected)}
                </h4>

                <p className="mt-2 text-xs text-slate-500">
                  {selected.file_name}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div
                  className={`rounded-xl border px-4 py-2 ${
                    scoreMatches
                      ? "border-emerald-400/25 bg-emerald-500/10"
                      : "border-red-400/25 bg-red-500/10"
                  }`}
                >
                  <p className="text-[8px] font-black uppercase text-slate-500">
                    Player points
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {totalPoints}
                    {expectedScore !== null
                      ? ` / ${expectedScore}`
                      : ""}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-2">
                  <p className="text-[8px] font-black uppercase text-slate-500">
                    Unmatched
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {unmatchedCount}
                  </p>
                </div>
              </div>
            </div>

            {expectedScore !== null && !scoreMatches ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">
                Player points total {totalPoints}, but the official
                Eagles score is {expectedScore}. Correct the missing
                or misread statistics before final approval.
              </div>
            ) : null}

            {!rows.length ? (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
                No structured player rows were extracted. The
                original report remains attached. Use{" "}
                <strong>Add player row</strong> below to reconstruct
                the box score manually.
              </div>
            ) : null}
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addRow}
                disabled={working}
                className={secondaryButton}
              >
                + Add player row
              </button>

              <button
                type="button"
                onClick={() => void saveWork()}
                disabled={working}
                className={secondaryButton}
              >
                Save correction draft
              </button>

              <button
                type="button"
                onClick={() => void sendToGovernance()}
                disabled={
                  working ||
                  !rows.length ||
                  unmatchedCount > 0
                }
                className={primaryButton}
              >
                Send to review queue
              </button>

              {selected.original_url ? (
                <a
                  href={selected.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className={secondaryButton}
                >
                  Original PDF ↗
                </a>
              ) : null}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-[1700px] w-full border-collapse text-left">
                <thead className="bg-black/40">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[190px] bg-[#071326] px-3 py-3 text-[8px] font-black uppercase text-slate-500">
                      Player
                    </th>

                    <th className="min-w-[190px] px-3 py-3 text-[8px] font-black uppercase text-slate-500">
                      Roster match
                    </th>

                    <th className="min-w-[70px] px-2 py-3 text-[8px] font-black uppercase text-slate-500">
                      #
                    </th>

                    {STAT_FIELDS.map((field) => (
                      <th
                        key={field.key}
                        className="min-w-[76px] px-2 py-3 text-[8px] font-black uppercase text-slate-500"
                      >
                        {field.label}
                      </th>
                    ))}

                    <th className="min-w-[90px] px-2 py-3 text-[8px] font-black uppercase text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${selected.id}-${index}`}
                      className="border-t border-white/[.06]"
                    >
                      <td className="sticky left-0 z-10 bg-[#071326] px-2 py-2">
                        <input
                          value={row.player_name || ""}
                          onChange={(event) =>
                            updateRow(
                              index,
                              "player_name",
                              event.target.value,
                            )
                          }
                          placeholder="Player name"
                          className={input}
                        />
                      </td>

                      <td className="px-2 py-2">
                        <select
                          value={row.roster_member_id || ""}
                          onChange={(event) =>
                            matchRoster(
                              index,
                              event.target.value,
                            )
                          }
                          className={input}
                        >
                          <option value="">
                            Match Eagles roster player
                          </option>

                          {roster.map((member) => (
                            <option
                              key={member.id}
                              value={member.id}
                            >
                              {member.display_name ||
                                member.nickname ||
                                "Player"}
                              {member.jersey_number
                                ? ` · #${member.jersey_number}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2 py-2">
                        <input
                          value={row.jersey_number || ""}
                          onChange={(event) =>
                            updateRow(
                              index,
                              "jersey_number",
                              event.target.value,
                            )
                          }
                          className={input}
                        />
                      </td>

                      {STAT_FIELDS.map((field) => (
                        <td
                          key={field.key}
                          className="px-2 py-2"
                        >
                          <input
                            type="number"
                            min={
                              field.allowNegative
                                ? undefined
                                : 0
                            }
                            step={
                              field.decimal ? "0.01" : "1"
                            }
                            value={row[field.key] ?? 0}
                            onChange={(event) =>
                              updateRow(
                                index,
                                field.key,
                                field.decimal
                                  ? Number(
                                      event.target.value || 0,
                                    )
                                  : Number(
                                      event.target.value || 0,
                                    ),
                              )
                            }
                            className={input}
                          />
                        </td>
                      ))}

                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          disabled={working}
                          className={dangerButton}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length ? (
              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                OREB + DREB automatically updates REB. Save the draft
                whenever you want; the same stored import will reopen
                after refresh.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}