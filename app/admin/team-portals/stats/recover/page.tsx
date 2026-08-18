"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import {
  useState,
} from "react";

import {
  readBasketballReportPdf,
} from "@/lib/basketball-iq/browserReportOcr";

type JsonRecord =
  Record<string, any>;

type RecoveryData = {
  import: JsonRecord;
  game: JsonRecord | null;
  team: JsonRecord | null;
  roster: JsonRecord[];
};

const input =
  "w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400";

const primary =
  "rounded-xl bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[.06em] text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";

const secondary =
  "rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black text-white transition hover:border-orange-400/50 disabled:opacity-50";

function points(
  rows: JsonRecord[],
) {
  return rows.reduce(
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
}

export default function HistoricalStatRecoveryPage() {
  const [
    importId,
    setImportId,
  ] = useState(
    "9995aaa4-3ed6-44c2-8f96-ed5119ac9df4",
  );

  const [
    recoveryData,
    setRecoveryData,
  ] =
    useState<RecoveryData | null>(
      null,
    );

  const [
    report,
    setReport,
  ] =
    useState<JsonRecord | null>(
      null,
    );

  const [
    preview,
    setPreview,
  ] =
    useState<JsonRecord | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    progress,
    setProgress,
  ] =
    useState("");

  const [
    working,
    setWorking,
  ] =
    useState(false);

  const [
    recovered,
    setRecovered,
  ] =
    useState(false);

  async function readOriginal() {
    if (
      !importId.trim()
    ) {
      setMessage(
        "Enter a stat import ID.",
      );

      return;
    }

    setWorking(true);

    setRecovered(false);

    setPreview(null);

    setReport(null);

    setRecoveryData(
      null,
    );

    setMessage("");

    setProgress(
      "Opening stored import…",
    );

    try {
      const metadataResponse =
        await fetch(
          `/api/admin/team-portals/stats/recover?import_id=${encodeURIComponent(
            importId.trim(),
          )}`,
          {
            cache:
              "no-store",
          },
        );

      const metadata =
        await metadataResponse
          .json()
          .catch(
            () => ({}),
          );

      if (
        !metadataResponse.ok
      ) {
        throw new Error(
          metadata.error ||
            "The stored import could not be opened.",
        );
      }

      const data =
        metadata as RecoveryData;

      setRecoveryData(
        data,
      );

      setProgress(
        "Downloading original private report…",
      );

      const fileResponse =
        await fetch(
          `/api/admin/team-portals/stats/recover?import_id=${encodeURIComponent(
            importId.trim(),
          )}&file=1`,
          {
            cache:
              "no-store",
          },
        );

      if (
        !fileResponse.ok
      ) {
        const errorPayload =
          await fileResponse
            .json()
            .catch(
              () => ({}),
            );

        throw new Error(
          errorPayload.error ||
            "The original report could not be downloaded.",
        );
      }

      const blob =
        await fileResponse.blob();

      const file =
        new File(
          [
            blob,
          ],
          data.import
            ?.file_name ||
            "stored-report.pdf",
          {
            type:
              data.import
                ?.mime_type ||
              blob.type ||
              "application/pdf",
          },
        );

      setProgress(
        "Re-reading original Basketball Stats Assistant report…",
      );

      const parsedReport =
        await readBasketballReportPdf(
          file,
          data.roster ||
            [],
          (
            nextProgress,
          ) =>
            setProgress(
              nextProgress,
            ),
        );

      setReport(
        parsedReport as unknown as JsonRecord,
      );

      setProgress(
        "Checking recovered game data…",
      );

      const previewResponse =
        await fetch(
          "/api/admin/team-portals/stats/recover",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify(
              {
                import_id:
                  importId.trim(),

                commit:
                  false,

                home_rows:
                  parsedReport.home_rows ||
                  [],

                away_rows:
                  parsedReport.away_rows ||
                  [],

                officials:
                  parsedReport.officials ||
                  [],

                period_scores:
                  parsedReport.match
                    ?.period_scores ||
                  [],
              },
            ),
          },
        );

      const previewPayload =
        await previewResponse
          .json()
          .catch(
            () => ({}),
          );

      if (
        !previewResponse.ok
      ) {
        throw new Error(
          previewPayload.error ||
            "The recovery preview could not be prepared.",
        );
      }

      setPreview(
        previewPayload.preview ||
          null,
      );

      setMessage(
        "Original stored report re-read successfully. Review the recovered information below before applying it.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Recovery failed.",
      );
    } finally {
      setWorking(false);

      setProgress("");
    }
  }

  async function applyRecovery() {
    if (
      !report ||
      !preview
    ) {
      setMessage(
        "Re-read and preview the original report first.",
      );

      return;
    }

    const opponentRows =
      Number(
        preview.opponent_side ===
          "home"
          ? preview.home_rows
          : preview.away_rows,
      );

    const confirmed =
      window.confirm(
        `Apply recovery to ${
          preview.game_title ||
          "this game"
        }?\n\nThis will restore ${opponentRows} opponent player rows and ${
          report.officials
            ?.length ||
          0
        } detected officials into the canonical game record.`,
      );

    if (!confirmed) {
      return;
    }

    setWorking(true);

    setMessage("");

    setProgress(
      "Applying recovered game data…",
    );

    try {
      const response =
        await fetch(
          "/api/admin/team-portals/stats/recover",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify(
              {
                import_id:
                  importId.trim(),

                commit:
                  true,

                home_rows:
                  report.home_rows ||
                  [],

                away_rows:
                  report.away_rows ||
                  [],

                officials:
                  report.officials ||
                  [],

                period_scores:
                  report.match
                    ?.period_scores ||
                  [],
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

      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ||
            "Recovery could not be applied.",
        );
      }

      setRecovered(true);

      setMessage(
        payload.message ||
          "Historical report recovered successfully.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Recovery could not be applied.",
      );
    } finally {
      setWorking(false);

      setProgress("");
    }
  }

  const homeRows =
    report?.home_rows ||
    [];

  const awayRows =
    report?.away_rows ||
    [];

  const officials =
    report?.officials ||
    [];

  return (
    <main className="admin-page-shell min-h-screen p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="admin-hero-panel overflow-hidden p-6 sm:p-8">
          <p className="admin-eyebrow">
            Historical recovery
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="admin-title">
                Recover Stored
                Game Report
              </h1>

              <p className="admin-subtitle mt-3 max-w-4xl">
                Re-read a
                Basketball Stats
                Assistant PDF that
                is already stored
                privately by
                FACKTS. No
                re-upload is
                required.
              </p>
            </div>

            <Link
              href="/admin/team-portals"
              className={
                secondary
              }
            >
              ← Club Portals
            </Link>
          </div>
        </header>

        {message ? (
          <div
            role="status"
            className={`mt-5 rounded-xl border p-4 text-sm ${
              recovered
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                : "border-orange-400/25 bg-orange-500/10 text-orange-100"
            }`}
          >
            {message}
          </div>
        ) : null}

        <section className="admin-panel mt-6 p-5 sm:p-6">
          <p className="admin-eyebrow">
            Source import
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Re-read original
            evidence
          </h2>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="min-w-0">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-[.14em] text-slate-500">
                Team stat
                import ID
              </span>

              <input
                value={
                  importId
                }
                onChange={(
                  event,
                ) =>
                  setImportId(
                    event.target
                      .value,
                  )
                }
                className={
                  input
                }
              />
            </label>

            <button
              type="button"
              disabled={
                working
              }
              onClick={() =>
                void readOriginal()
              }
              className={
                primary
              }
            >
              {working
                ? progress ||
                  "Working…"
                : "Re-read Original Report"}
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            The current field is
            preloaded with the
            verified Eagles vs
            Mab source import so
            we can complete the
            historical recovery
            first.
          </p>
        </section>

        {recoveryData ? (
          <section className="admin-panel mt-6 p-5 sm:p-6">
            <p className="admin-eyebrow">
              Stored source
            </p>

            <div className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Info
                label="File"
                value={
                  recoveryData
                    .import
                    ?.file_name ||
                  "Stored report"
                }
              />

              <Info
                label="Team"
                value={
                  recoveryData
                    .team
                    ?.name ||
                  "Team"
                }
              />

              <Info
                label="Game"
                value={
                  recoveryData
                    .game
                    ?.title ||
                  recoveryData
                    .game
                    ?.game_title ||
                  "Linked game"
                }
              />

              <Info
                label="Original status"
                value={
                  recoveryData
                    .import
                    ?.extraction_status ||
                  "Unknown"
                }
              />
            </div>
          </section>
        ) : null}

        {report ? (
          <section className="admin-panel mt-6 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="admin-eyebrow">
                  OCR recovery
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Complete Report
                  Preview
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  Nothing below
                  changes the
                  official game
                  until Apply
                  Recovery is
                  confirmed.
                </p>
              </div>

              {preview ? (
                <button
                  type="button"
                  disabled={
                    working ||
                    recovered
                  }
                  onClick={() =>
                    void applyRecovery()
                  }
                  className={
                    primary
                  }
                >
                  {recovered
                    ? "Recovery Applied"
                    : working
                      ? progress ||
                        "Applying…"
                      : "Apply Recovery"}
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Home players"
                value={
                  homeRows.length
                }
              />

              <Metric
                label="Home points"
                value={points(
                  homeRows,
                )}
              />

              <Metric
                label="Away players"
                value={
                  awayRows.length
                }
              />

              <Metric
                label="Away points"
                value={points(
                  awayRows,
                )}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <RosterPreview
                title={
                  report.match
                    ?.home_team_name ||
                  recoveryData
                    ?.game
                    ?.home_team_name ||
                  "Home team"
                }
                rows={
                  homeRows
                }
              />

              <RosterPreview
                title={
                  report.match
                    ?.away_team_name ||
                  recoveryData
                    ?.game
                    ?.away_team_name ||
                  "Away team"
                }
                rows={
                  awayRows
                }
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">
                  Detected
                  officials
                </p>

                {officials.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {officials.map(
                      (
                        official:
                          string,
                      ) => (
                        <span
                          key={
                            official
                          }
                          className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-100"
                        >
                          {
                            official
                          }
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No officials
                    detected.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">
                  Period scores
                </p>

                {report.match
                  ?.period_scores
                  ?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {report.match.period_scores.map(
                      (
                        period:
                          JsonRecord,
                        index:
                          number,
                      ) => (
                        <div
                          key={`${period.period}-${index}`}
                          className="rounded-xl border border-white/10 bg-slate-950 p-3 text-center"
                        >
                          <p className="text-[8px] font-black uppercase text-slate-500">
                            {period.period ||
                              `P${index + 1}`}
                          </p>

                          <p className="mt-2 text-lg font-black">
                            {
                              period.home
                            }
                            –
                            {
                              period.away
                            }
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No period
                    scores
                    detected.
                  </p>
                )}
              </div>
            </div>

            {preview ? (
              <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/[.06] p-5">
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-blue-200">
                  Canonical
                  recovery plan
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Info
                    label="Submitting side"
                    value={
                      preview.submitting_side ||
                      "Unknown"
                    }
                  />

                  <Info
                    label="Opponent side"
                    value={
                      preview.opponent_side ||
                      "Unknown"
                    }
                  />

                  <Info
                    label="Opponent rows"
                    value={String(
                      preview.opponent_side ===
                        "home"
                        ? preview.home_rows
                        : preview.away_rows,
                    )}
                  />

                  <Info
                    label="Officials"
                    value={String(
                      preview.officials
                        ?.length ||
                        0,
                    )}
                  />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {recovered &&
        recoveryData?.game ? (
          <section className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-6">
            <p className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-200">
              Recovery complete
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Now verify Match
              Centre
            </h2>

            <p className="mt-3 text-sm leading-6 text-emerald-50/80">
              The opponent box
              score and recovered
              officials have been
              written into the
              existing canonical
              game. Open the game
              and confirm both
              teams are present.
            </p>

            <Link
              href={`/games/${recoveryData.game.id}`}
              target="_blank"
              className="mt-5 inline-flex rounded-xl bg-emerald-400 px-5 py-3 text-xs font-black uppercase text-emerald-950"
            >
              Open Match Centre
              ↗
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function RosterPreview({
  title,
  rows,
}: {
  title: string;
  rows: JsonRecord[];
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">
            Recovered box score
          </p>

          <h3 className="mt-2 break-words text-xl font-black">
            {title}
          </h3>
        </div>

        <span className="shrink-0 rounded-full bg-white/[.05] px-3 py-2 text-[8px] font-black uppercase text-slate-400">
          {rows.length} players
        </span>
      </div>

      <div className="mt-4 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {rows.map(
          (
            row,
            index,
          ) => (
            <article
              key={`${row.player_name}-${row.jersey_number}-${index}`}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-white/[.07] bg-slate-950 p-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-black">
                  {row.player_name ||
                    "Player"}
                </p>

                <p className="mt-1 text-[8px] font-black uppercase text-slate-600">
                  {row.jersey_number
                    ? `#${row.jersey_number}`
                    : "No jersey"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat
                  label="PTS"
                  value={
                    row.points ||
                    0
                  }
                />

                <MiniStat
                  label="REB"
                  value={
                    row.rebounds ||
                    0
                  }
                />

                <MiniStat
                  label="AST"
                  value={
                    row.assists ||
                    0
                  }
                />
              </div>
            </article>
          ),
        )}

        {!rows.length ? (
          <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
            No player rows
            recovered.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="min-w-[3rem] rounded-lg bg-black/30 px-2 py-2">
      <p className="text-xs font-black">
        {value}
      </p>

      <p className="mt-0.5 text-[6px] font-black uppercase text-slate-600">
        {label}
      </p>
    </div>
  );
}