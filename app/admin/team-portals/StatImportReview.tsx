"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type JsonRecord = Record<string, any>;

type Props = {
  teamId: string;
  roster: JsonRecord[];
  onQueued?: () => void | Promise<void>;
};

const secondaryButton =
  "min-h-10 rounded-lg border border-white/10 bg-white/[.04] px-4 py-2 text-[10px] font-black uppercase text-white transition hover:border-orange-400/50 disabled:opacity-50";

const primaryButton =
  "min-h-10 rounded-lg bg-orange-500 px-4 py-2 text-[10px] font-black uppercase tracking-[.06em] text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";

function text(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function formatDate(
  value: unknown,
) {
  const date =
    new Date(
      text(value),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Date unavailable";
  }

  return date.toLocaleString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function gameTitle(
  item: JsonRecord,
) {
  const game =
    item.game || {};

  return (
    game.game_title ||
    game.title ||
    [
      game.home_team_name,
      game.away_team_name,
    ]
      .filter(Boolean)
      .join(" vs ") ||
    "Game not linked"
  );
}

function scoreLabel(
  item: JsonRecord,
) {
  const game =
    item.game || {};

  const home =
    game.home_score;

  const away =
    game.away_score;

  if (
    home === null ||
    home === undefined ||
    away === null ||
    away === undefined
  ) {
    return "Score unavailable";
  }

  return `${home} - ${away}`;
}

function statusLabel(
  item: JsonRecord,
) {
  if (
    item.saved_directly
  ) {
    return "LIVE";
  }

  if (
    item.needs_attention
  ) {
    return "NEEDS ATTENTION";
  }

  return "SAVED";
}

function statusClass(
  item: JsonRecord,
) {
  if (
    item.saved_directly
  ) {
    return "bg-emerald-500/15 text-emerald-300";
  }

  if (
    item.needs_attention
  ) {
    return "bg-yellow-500/15 text-yellow-200";
  }

  return "bg-cyan-500/15 text-cyan-200";
}

export default function StatImportReview({
  teamId,
}: Props) {
  const [
    imports,
    setImports,
  ] =
    useState<JsonRecord[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const load =
    useCallback(
      async () => {
        if (!teamId) {
          setImports([]);
          return;
        }

        setLoading(true);
        setMessage("");

        const response =
          await fetch(
            `/api/admin/team-portals/stats/review?team_id=${encodeURIComponent(
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

        setLoading(false);

        if (
          !response.ok ||
          !payload.ok
        ) {
          setMessage(
            payload.error ||
              "Recent stat imports could not be loaded.",
          );

          return;
        }

        setImports(
          payload.imports ||
            [],
        );
      },
      [teamId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const summary =
    useMemo(() => {
      const live =
        imports.filter(
          (item) =>
            item.saved_directly,
        ).length;

      const attention =
        imports.filter(
          (item) =>
            item.needs_attention,
        ).length;

      return {
        total:
          imports.length,

        live,

        attention,
      };
    }, [imports]);

  return (
    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.04] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-eyebrow">
            Team statistics
          </p>

          <h3 className="mt-2 text-xl font-black">
            Recent imports & corrections
          </h3>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
            Team-approved game reports save directly into FACKTS.
            Admin does not approve them again. Use this area only
            to spot problems, open the original evidence and edit
            the canonical game when a correction is needed.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void load()
          }
          disabled={
            loading
          }
          className={
            secondaryButton
          }
        >
          {loading
            ? "Refreshing..."
            : "Refresh imports"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Recent"
          value={
            summary.total
          }
        />

        <SummaryCard
          label="Live"
          value={
            summary.live
          }
        />

        <SummaryCard
          label="Needs attention"
          value={
            summary.attention
          }
        />
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {imports.map(
          (item) => {
            const game =
              item.game ||
              null;

            const gameId =
              text(
                game?.id ||
                  item.game_id,
              );

            const warnings =
              Array.isArray(
                item.warnings,
              )
                ? item.warnings
                    .map(String)
                    .filter(
                      Boolean,
                    )
                : [];

            const rowCount =
              Number(
                item.canonical_line_count ??
                  item.extracted_row_count ??
                  0,
              );

            const unmatched =
              Number(
                item.unmatched_row_count ||
                  0,
              );

            return (
              <article
                key={
                  item.id
                }
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${statusClass(
                          item,
                        )}`}
                      >
                        {statusLabel(
                          item,
                        )}
                      </span>

                      <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[8px] font-black uppercase text-slate-300">
                        {rowCount} canonical rows
                      </span>

                      {unmatched >
                      0 ? (
                        <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-[8px] font-black uppercase text-yellow-200">
                          {unmatched} unmatched
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 break-words text-sm font-black">
                      {gameTitle(
                        item,
                      )}
                    </p>

                    <p className="mt-1 text-2xl font-black text-white">
                      {scoreLabel(
                        item,
                      )}
                    </p>

                    <p className="mt-2 break-all text-xs text-slate-400">
                      {item.file_name ||
                        "Stored report"}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      {formatDate(
                        item.created_at,
                      )}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase">
                      <span
                        className={
                          item.game_is_live
                            ? "text-emerald-300"
                            : "text-slate-500"
                        }
                      >
                        Game{" "}
                        {item.game_is_live
                          ? "live"
                          : "not live"}
                      </span>

                      <span className="text-slate-700">
                        /
                      </span>

                      <span
                        className={
                          item.box_score_is_live
                            ? "text-emerald-300"
                            : "text-slate-500"
                        }
                      >
                        Box score{" "}
                        {item.box_score_is_live
                          ? "live"
                          : "not live"}
                      </span>
                    </div>

                    {warnings.length ? (
                      <div className="mt-4 grid gap-2">
                        {warnings
                          .slice(
                            0,
                            5,
                          )
                          .map(
                            (
                              warning,
                            ) => (
                              <p
                                key={
                                  warning
                                }
                                className="rounded-lg border border-yellow-400/15 bg-yellow-500/[.05] px-3 py-2 text-[10px] leading-4 text-yellow-100"
                              >
                                {
                                  warning
                                }
                              </p>
                            ),
                          )}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {gameId ? (
                      <Link
                        href={`/admin/games/editor?game_id=${encodeURIComponent(
                          gameId,
                        )}&team_id=${encodeURIComponent(
                          teamId,
                        )}`}
                        className={
                          primaryButton
                        }
                      >
                        Edit game
                      </Link>
                    ) : (
                      <span className="rounded-lg border border-yellow-400/20 bg-yellow-500/10 px-3 py-2 text-[9px] font-black uppercase text-yellow-200">
                        Game link missing
                      </span>
                    )}

                    {item.original_url ? (
                      <a
                        href={
                          item.original_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className={
                          secondaryButton
                        }
                      >
                        Open report
                      </a>
                    ) : null}

                    {gameId &&
                    item.game_is_live ? (
                      <Link
                        href={`/games/${encodeURIComponent(
                          gameId,
                        )}`}
                        target="_blank"
                        className={
                          secondaryButton
                        }
                      >
                        View public game
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          },
        )}

        {!loading &&
        !imports.length ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm font-black text-slate-300">
              No team stat imports yet.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Once the team uploads and approves an official report,
              it will appear here automatically.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}