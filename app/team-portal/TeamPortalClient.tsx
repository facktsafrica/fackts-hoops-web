"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import BasketballIQWorkspace from "./BasketballIQWorkspace";
import { supabase } from "@/lib/supabase";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  type TeamCapability,
} from "@/lib/team-portal/capabilities";
import { TEAM_PORTAL_TUTORIALS } from "@/lib/team-portal/tutorials";

type JsonRecord = Record<string, any>;

type PortalData = {
  portal: {
    team: JsonRecord;
    membership: JsonRecord;
    subscription: JsonRecord;
    capabilities: TeamCapability[];
  };
  roster: JsonRecord[];
  training: JsonRecord[];
  games: JsonRecord[];
  media_summary: JsonRecord;
  branding_submissions: JsonRecord[];
  media_submissions: JsonRecord[];
  stat_submissions: JsonRecord[];
  profile_requests: JsonRecord[];
  broadcast_channel: JsonRecord | null;
  broadcasts: JsonRecord[];
  league_memberships: JsonRecord[];
  leaderboard_links: JsonRecord[];
};

const tabs = [
  ["command", "Overview"],
  ["training", "Training"],
  ["team", "Team & Players"],
  ["media", "Media Readiness"],
  ["stats", "Basketball IQ"],
  ["live", "Live Studio"],
] as const;

type PortalTab = (typeof tabs)[number][0];
type PortalTheme = "club" | "midnight" | "arena";

type PortalTeamOption = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

const tabCapabilities: Partial<Record<PortalTab, TeamCapability>> = {
  training: "training_manage",
  team: "roster_manage",
  media: "media_submit",
  stats: "stats_submit",
  live: "broadcast_manage",
};

const workspaces: Array<{
  tab: PortalTab;
  capability: TeamCapability;
  label: string;
  description: string;
}> = [
  {
    tab: "training",
    capability: "training_manage",
    label: "Training",
    description:
      "Plan sessions, development work and training evidence.",
  },
  {
    tab: "team",
    capability: "roster_manage",
    label: "Team & Players",
    description:
      "Manage the public team roster without editing official player profiles.",
  },
  {
    tab: "media",
    capability: "media_submit",
    label: "Media Readiness",
    description:
      "Upload club images, posters, full games and highlights for review.",
  },
  {
    tab: "stats",
    capability: "stats_submit",
    label: "Basketball IQ",
    description:
      "Capture complete games, identify training priorities and brief linked players.",
  },
  {
    tab: "team",
    capability: "player_profile_request",
    label: "Profile Requests",
    description:
      "Request an official player profile; Super Admin remains the approver.",
  },
  {
    tab: "live",
    capability: "broadcast_manage",
    label: "Live Studio",
    description:
      "Connect YouTube and schedule games, training or team broadcasts.",
  },
];

const input =
  "w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--club-accent)]";

const button =
  "max-w-full whitespace-normal break-words rounded-xl bg-[var(--club-accent)] px-5 py-3 text-xs font-black uppercase tracking-[.08em] text-[var(--club-accent-text)] shadow-lg transition hover:brightness-110 disabled:opacity-50";

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Status({
  ready,
  pending,
}: {
  ready: boolean;
  pending: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${
        ready
          ? "bg-emerald-500/20 text-emerald-300"
          : pending
            ? "bg-orange-500/20 text-orange-200"
            : "bg-red-500/15 text-red-300"
      }`}
    >
      {ready
        ? "Ready"
        : pending
          ? "In review"
          : "Missing"}
    </span>
  );
}

function safeColor(
  value: unknown,
  fallback: string,
) {
  const color = String(value || "").trim();

  return /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : fallback;
}

function withAlpha(
  color: string,
  alpha: string,
) {
  return `${safeColor(
    color,
    "#0B1F3A",
  )}${alpha}`;
}

function readableText(color: string) {
  const normalized = safeColor(
    color,
    "#F58220",
  ).slice(1);

  const red = Number.parseInt(
    normalized.slice(0, 2),
    16,
  );

  const green = Number.parseInt(
    normalized.slice(2, 4),
    16,
  );

  const blue = Number.parseInt(
    normalized.slice(4, 6),
    16,
  );

  return (
    (red * 299 +
      green * 587 +
      blue * 114) /
      1000 >
    165
  )
    ? "#06101f"
    : "#ffffff";
}

export default function TeamPortalClient({
  teamId,
  portalTeams,
}: {
  teamId: string;
  portalTeams: PortalTeamOption[];
}) {
  const [data, setData] =
    useState<PortalData | null>(null);

  const [tab, setTab] =
    useState<PortalTab>("command");

  const [theme, setTheme] =
    useState<PortalTheme>("club");

  const [loading, setLoading] =
    useState(true);

  const [working, setWorking] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [showWelcome, setShowWelcome] =
    useState(false);

  const [encoder, setEncoder] =
    useState<{
      ingestion_address: string;
      stream_name: string;
    } | null>(null);

  const load = useCallback(
    async () => {
      setLoading(true);

      const response = await fetch(
        `/api/team-portal?team_id=${encodeURIComponent(
          teamId,
        )}`,
        {
          cache: "no-store",
        },
      );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (
        response.ok &&
        payload.ok
      ) {
        setData(
          payload as PortalData,
        );
      } else {
        setMessage(
          payload.error ||
            "Team portal could not be loaded.",
        );
      }

      setLoading(false);
    },
    [teamId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        `fackts-club-theme:${teamId}`,
      );

    if (
      saved === "club" ||
      saved === "midnight" ||
      saved === "arena"
    ) {
      setTheme(saved);
    }
  }, [teamId]);

  useEffect(() => {
    setShowWelcome(
      window.localStorage.getItem(`fackts-portal-welcome:${teamId}`) !== "done",
    );
  }, [teamId]);

  function closeWelcome(nextTab?: PortalTab) {
    window.localStorage.setItem(`fackts-portal-welcome:${teamId}`, "done");
    setShowWelcome(false);
    if (nextTab) setTab(nextTab);
  }

  const has = (
    capability: TeamCapability,
  ) =>
    data?.portal.capabilities.includes(
      capability,
    ) || false;

  const team =
    data?.portal.team;

  const featuredTutorial =
    TEAM_PORTAL_TUTORIALS.find((tutorial) => tutorial.featured) ||
    TEAM_PORTAL_TUTORIALS[0];

  const primaryColor =
    safeColor(
      team?.primary_color,
      "#0B1F3A",
    );

  const accentColor =
    safeColor(
      team?.secondary_color,
      "#F58220",
    );

  const themePrimary =
    theme === "midnight"
      ? "#0B1F3A"
      : theme === "arena"
        ? "#27272A"
        : primaryColor;

  const themeAccent =
    theme === "arena"
      ? primaryColor
      : accentColor;

  const themeBase =
    theme === "arena"
      ? "#0d0d10"
      : theme === "midnight"
        ? "#020817"
        : "#030b1a";

  const portalStyle = {
    "--club-primary":
      themePrimary,

    "--club-accent":
      themeAccent,

    "--club-accent-text":
      readableText(
        themeAccent,
      ),

    background: `radial-gradient(circle at 8% 16%,${withAlpha(
      themePrimary,
      "28",
    )},transparent 30rem),radial-gradient(circle at 92% 38%,${withAlpha(
      themeAccent,
      "12",
    )},transparent 30rem),${themeBase}`,
  } as CSSProperties;

  const role = String(
    data?.portal.membership
      .role || "viewer",
  ).toLowerCase();

  const roleLabel =
    TEAM_ROLE_LABELS[role] ||
    "Team member";

  const roleDescription =
    TEAM_ROLE_DESCRIPTIONS[
      role
    ] ||
    TEAM_ROLE_DESCRIPTIONS.viewer;

  const visibleTabs =
    tabs.filter(
      ([key]) =>
        !tabCapabilities[
          key
        ] ||
        has(
          tabCapabilities[
            key
          ]!,
        ),
    );

  const missingActions =
    useMemo(
      () =>
        (data?.games
          .flatMap(
            (game) => [
              !game.poster
                .ready &&
              !game.poster
                .pending
                ? {
                    game,
                    role: "poster",
                    label:
                      "poster",
                  }
                : null,

              !game.full_game
                .ready &&
              !game.full_game
                .pending
                ? {
                    game,
                    role:
                      "full_game",
                    label:
                      "full game",
                  }
                : null,
            ],
          )
          .filter(
            Boolean,
          ) as Array<{
          game: JsonRecord;
          role: string;
          label: string;
        }>) || [],
      [data],
    );

  async function post(
    body: JsonRecord,
    successTab?: PortalTab,
  ) {
    setWorking(true);
    setMessage("");

    const response =
      await fetch(
        "/api/team-portal",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify({
            ...body,
            team_id: teamId,
          }),
        },
      );

    const payload =
      await response
        .json()
        .catch(() => ({}));

    setMessage(
      payload.message ||
        payload.error ||
        (response.ok
          ? "Saved."
          : "Update failed."),
    );

    setWorking(false);

    if (response.ok) {
      if (successTab) {
        setTab(
          successTab,
        );
      }

      await load();
    }

    return {
      response,
      payload,
    };
  }

  async function upload(
    form: HTMLFormElement,
  ) {
    setWorking(true);
    setMessage("");

    const body =
      new FormData(form);

    body.set(
      "team_id",
      teamId,
    );

    const response =
      await fetch(
        "/api/team-portal/upload",
        {
          method: "POST",
          body,
        },
      );

    const payload =
      await response
        .json()
        .catch(() => ({}));

    setMessage(
      payload.message ||
        payload.error ||
        (response.ok
          ? "Uploaded."
          : "Upload failed."),
    );

    setWorking(false);

    if (response.ok) {
      form.reset();
      await load();
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.assign(
      "/team-portal/login",
    );
  }

  function changeTheme(
    nextTheme: PortalTheme,
  ) {
    setTheme(nextTheme);

    window.localStorage.setItem(
      `fackts-club-theme:${teamId}`,
      nextTheme,
    );
  }

  if (
    loading &&
    !data
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030b1a] text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-950 p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">
            Team intelligence
          </p>

          <p className="mt-3 text-2xl font-black">
            Opening workspace…
          </p>
        </div>
      </main>
    );
  }

  if (
    !data ||
    !team
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030b1a] px-4 text-white">
        <div className="max-w-lg rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Portal unavailable
          </h1>

          <p className="mt-3 text-sm text-red-100">
            {message}
          </p>

          <Link
            href="/team-portal/login"
            className="mt-5 inline-block font-black text-orange-300"
          >
            Return to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen w-full max-w-full text-white"
      style={
        portalStyle
      }
    >
      <header className="relative w-full max-w-full overflow-hidden border-b border-white/15 bg-[#030b1a]">
        {team.cover_image_url ? (
          <img
            src={
              team.cover_image_url
            }
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        ) : null}

        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(100deg,#030914f7 5%,${withAlpha(
              themePrimary,
              "dc",
            )} 55%,#030914ee 100%)`,
          }}
        />

        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg,${themeAccent},${themePrimary},transparent)`,
          }}
        />

        <div className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl">
                {team.logo_url ? (
                  <img
                    src={
                      team.logo_url
                    }
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span
                    className="text-2xl font-black"
                    style={{
                      color:
                        themeAccent,
                    }}
                  >
                    {String(
                      team.short_name ||
                        team.name,
                    )
                      .slice(
                        0,
                        2,
                      )
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p
                  className="text-[9px] font-black uppercase tracking-[.22em]"
                  style={{
                    color:
                      themeAccent,
                  }}
                >
                  FACKTS Club
                  Intelligence
                </p>

                <h1 className="mt-2 max-w-full break-words text-3xl font-black uppercase leading-none sm:text-5xl">
                  {
                    team.name
                  }
                </h1>

                <p className="mt-2 max-w-full break-words text-sm text-slate-300">
                  Registered club
                  workspace ·{" "}
                  {
                    roleLabel
                  }{" "}
                  access
                </p>
              </div>
            </div>

            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              {portalTeams.length >
              1 ? (
                <label className="min-w-0 max-w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <span className="mr-2 text-[8px] font-black uppercase text-slate-400">
                    Club
                  </span>

                  <select
                    value={
                      teamId
                    }
                    onChange={(
                      event,
                    ) =>
                      window.location.assign(
                        `/team-portal?team_id=${encodeURIComponent(
                          event
                            .target
                            .value,
                        )}`,
                      )
                    }
                    className="min-w-0 max-w-full bg-transparent text-xs font-black text-white outline-none"
                  >
                    {portalTeams.map(
                      (
                        portalTeam,
                      ) => (
                        <option
                          key={
                            portalTeam.id
                          }
                          value={
                            portalTeam.id
                          }
                          className="bg-slate-950"
                        >
                          {
                            portalTeam.name
                          }{" "}
                          ·{" "}
                          {TEAM_ROLE_LABELS[
                            portalTeam
                              .role
                          ] ||
                            portalTeam.role}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : null}

              <label className="min-w-0 max-w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <span className="mr-2 text-[8px] font-black uppercase text-slate-400">
                  Theme
                </span>

                <select
                  value={
                    theme
                  }
                  onChange={(
                    event,
                  ) =>
                    changeTheme(
                      event
                        .target
                        .value as PortalTheme,
                    )
                  }
                  className="min-w-0 max-w-full bg-transparent text-xs font-black text-white outline-none"
                >
                  <option
                    value="club"
                    className="bg-slate-950"
                  >
                    Club
                  </option>

                  <option
                    value="midnight"
                    className="bg-slate-950"
                  >
                    Midnight
                  </option>

                  <option
                    value="arena"
                    className="bg-slate-950"
                  >
                    Arena
                  </option>
                </select>
              </label>

              <Link
                href={`/teams/${team.slug}`}
                className="max-w-full break-words rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
              >
                Public profile
              </Link>

              <button
                type="button"
                onClick={() => setShowWelcome(true)}
                className="relative z-10 max-w-full cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs font-black hover:border-orange-300 hover:text-orange-200"
              >
                Help &amp; tour
              </button>

              <button
                onClick={
                  logout
                }
                className="max-w-full rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs font-black text-red-200"
              >
                Logout
              </button>
            </div>
          </div>

          <nav
            aria-label="Club workspaces"
            className="mt-7 min-w-0"
          >
            <p className="mb-2 text-[8px] font-black uppercase tracking-[.16em] text-slate-500">
              Workspace menu
            </p>

            <div className="flex min-w-0 flex-wrap gap-2">
              {visibleTabs.map(
                ([
                  key,
                  label,
                ]) => (
                  <button
                    key={
                      key
                    }
                    onClick={() =>
                      setTab(
                        key,
                      )
                    }
                    style={
                      tab ===
                      key
                        ? {
                            backgroundColor:
                              themeAccent,

                            color:
                              readableText(
                                themeAccent,
                              ),
                          }
                        : undefined
                    }
                    className={`max-w-full whitespace-normal rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.1em] transition ${
                      tab ===
                      key
                        ? "shadow-lg"
                        : "border border-white/10 bg-black/25 text-slate-300 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {
                      label
                    }
                  </button>
                ),
              )}
            </div>
          </nav>
        </div>
      </header>

      {showWelcome ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Help and tutorials">
          <section className="mx-auto my-4 w-full max-w-4xl rounded-3xl border border-orange-400/25 bg-slate-950 p-5 shadow-2xl sm:my-10 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">Help &amp; tutorials</p>
                <h2 className="mt-2 text-2xl font-black">Welcome to your team workspace</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Choose a quick route below or watch the complete staff tutorial. Public records still require FACKTS verification.</p>
              </div>
              <button type="button" onClick={() => setShowWelcome(false)} className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:border-orange-300" aria-label="Close help">Close</button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
              <article className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">Featured tutorial · {featuredTutorial?.duration || "Video"}</p>
                <h3 className="mt-2 text-xl font-black">{featuredTutorial?.title || "Team Portal tutorial"}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{featuredTutorial?.description || "Learn how to use your club workspace."}</p>
                {featuredTutorial?.url ? (
                  <a href={featuredTutorial.url} target="_blank" rel="noreferrer" className={`${button} mt-5 inline-block`}>Watch on YouTube</a>
                ) : (
                  <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs text-amber-100">This tutorial video has not been published yet.</p>
                )}
              </article>

              <div className="grid gap-3">
                {has("training_manage") ? <button type="button" onClick={() => closeWelcome("training")} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[.04] p-4 text-left hover:border-orange-300"><span className="block font-black">Plan training</span><span className="mt-1 block text-xs text-slate-400">Create and review team sessions.</span></button> : null}
                {has("roster_manage") ? <button type="button" onClick={() => closeWelcome("team")} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[.04] p-4 text-left hover:border-orange-300"><span className="block font-black">Team &amp; players</span><span className="mt-1 block text-xs text-slate-400">Manage the working roster.</span></button> : null}
                {has("stats_submit") ? <button type="button" onClick={() => closeWelcome("stats")} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[.04] p-4 text-left hover:border-orange-300"><span className="block font-black">Basketball IQ</span><span className="mt-1 block text-xs text-slate-400">Capture a game and create coaching priorities.</span></button> : null}
              </div>
            </div>

            {TEAM_PORTAL_TUTORIALS.length > 1 ? (
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="text-lg font-black">More tutorials</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TEAM_PORTAL_TUTORIALS.filter((tutorial) => tutorial.id !== featuredTutorial?.id).map((tutorial) => (
                    <a key={tutorial.id} href={tutorial.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-black/25 p-4 hover:border-orange-300">
                      <span className="block text-[9px] font-black uppercase text-orange-300">{tutorial.duration}</span>
                      <span className="mt-2 block font-black">{tutorial.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-400">{tutorial.description}</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab ===
      "stats" ? (
        <Feature
          capability="stats_submit"
          active={has(
            "stats_submit",
          )}
          title="Basketball IQ"
        >
          <BasketballIQWorkspace
            teamId={
              teamId
            }
            roster={
              data.roster
            }
            games={
              data.games
            }
            onMessage={
              setMessage
            }
          />

          <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
            <Panel
              eyebrow="League result"
              title="Submit final score"
            >
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The complete
                player box score
                and the final
                league result use
                separate approval
                controls.
                Basketball never
                records an equal
                final score; finish
                overtime first.
              </p>

              {data
                .league_memberships
                .length ? (
                <form
                  onSubmit={(
                    event,
                  ) => {
                    event.preventDefault();

                    const form =
                      new FormData(
                        event.currentTarget,
                      );

                    void post(
                      {
                        action:
                          "submit_game_result",

                        league_id:
                          form.get(
                            "league_id",
                          ),

                        opponent_name:
                          form.get(
                            "opponent_name",
                          ),

                        game_date:
                          form.get(
                            "game_date",
                          ),

                        venue:
                          form.get(
                            "venue",
                          ),

                        team_score:
                          form.get(
                            "team_score",
                          ),

                        opponent_score:
                          form.get(
                            "opponent_score",
                          ),

                        notes:
                          form.get(
                            "notes",
                          ),
                      },
                      "stats",
                    );

                    event.currentTarget.reset();
                  }}
                  className="mt-5 grid min-w-0 gap-3"
                >
                  <select
                    name="league_id"
                    required
                    className={
                      input
                    }
                  >
                    <option value="">
                      Choose
                      league
                    </option>

                    {data.league_memberships.map(
                      (
                        membership,
                      ) => (
                        <option
                          key={
                            membership.id
                          }
                          value={
                            membership.league_id
                          }
                        >
                          {membership
                            .leagues
                            ?.name ||
                            "League"}{" "}
                          ·{" "}
                          {
                            membership.division
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <input
                    name="opponent_name"
                    required
                    placeholder="Opponent team"
                    className={
                      input
                    }
                  />

                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      name="game_date"
                      required
                      type="datetime-local"
                      className={
                        input
                      }
                    />

                    <input
                      name="venue"
                      placeholder="Venue"
                      className={
                        input
                      }
                    />
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      name="team_score"
                      required
                      type="number"
                      min="0"
                      placeholder={`${team.name} score`}
                      className={
                        input
                      }
                    />

                    <input
                      name="opponent_score"
                      required
                      type="number"
                      min="0"
                      placeholder="Opponent score"
                      className={
                        input
                      }
                    />
                  </div>

                  <textarea
                    name="notes"
                    rows={
                      3
                    }
                    placeholder="Scorer-sheet or correction note"
                    className={
                      input
                    }
                  />

                  <button
                    disabled={
                      working
                    }
                    className={
                      button
                    }
                  >
                    Send result
                    for
                    verification
                  </button>
                </form>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-500">
                  Super Admin
                  must place this
                  team in a
                  league before
                  league results
                  can be
                  submitted.
                </div>
              )}
            </Panel>

            <Panel
              eyebrow="Governance"
              title={`${data.stat_submissions.length} review records`}
            >
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Club data works
                internally as soon
                as it autosaves.
                Public statistics
                and standings
                change only after
                Super Admin
                approval.
              </p>

              <div className="mt-5 grid max-h-[28rem] min-w-0 gap-3 overflow-y-auto pr-1">
                {data.stat_submissions.map(
                  (
                    submission,
                  ) => {
                    const kind =
                      submission
                        .stat_payload
                        ?.submission_type;

                    const isResult =
                      kind ===
                      "game_result";

                    const isSession =
                      kind ===
                      "team_stat_session";

                    return (
                      <article
                        key={
                          submission.id
                        }
                        className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                      >
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                          <p className="min-w-0 break-words font-black">
                            {isResult
                              ? `vs ${
                                  submission
                                    .stat_payload
                                    ?.opponent_name ||
                                  "Opponent"
                                }`
                              : isSession
                                ? `Complete box score · ${
                                    submission
                                      .stat_payload
                                      ?.player_rows ||
                                    0
                                  } players`
                                : submission
                                    .stat_payload
                                    ?.player_name ||
                                  "Stat submission"}
                          </p>

                          <Status
                            ready={
                              submission.status ===
                              "approved"
                            }
                            pending={
                              submission.status ===
                              "pending"
                            }
                          />
                        </div>

                        <p className="mt-2 break-words text-xs text-slate-500">
                          {isResult
                            ? `${
                                submission
                                  .stat_payload
                                  ?.league_name ||
                                "League"
                              } · ${
                                submission
                                  .stat_payload
                                  ?.team_score
                              }–${
                                submission
                                  .stat_payload
                                  ?.opponent_score
                              }`
                            : isSession
                              ? `${
                                  submission
                                    .stat_payload
                                    ?.mode ||
                                  "Team"
                                } capture · ${
                                  submission
                                    .stat_payload
                                    ?.linked_official_players ||
                                  0
                                } official player links`
                              : `PTS ${
                                  submission
                                    .stat_payload
                                    ?.points ??
                                  "—"
                                } · REB ${
                                  submission
                                    .stat_payload
                                    ?.rebounds ??
                                  "—"
                                } · AST ${
                                  submission
                                    .stat_payload
                                    ?.assists ??
                                  "—"
                                }`}
                        </p>
                      </article>
                    );
                  },
                )}

                {!data
                  .stat_submissions
                  .length ? (
                  <Empty text="No result or stat submissions yet." />
                ) : null}
              </div>

              <div className="mt-5 grid min-w-0 gap-2">
                {data.leaderboard_links.map(
                  (
                    link,
                  ) => (
                    <Link
                      key={
                        link.href
                      }
                      href={
                        link.href
                      }
                      className="min-w-0 break-words rounded-xl border border-white/10 bg-black/25 p-4 text-sm font-black text-[var(--club-accent)]"
                    >
                      {
                        link.title
                      }{" "}
                      →
                    </Link>
                  ),
                )}
              </div>
            </Panel>
          </div>
        </Feature>
      ) : null}

      {message ? (
        <div className="mx-auto mt-5 w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="break-words rounded-2xl border border-orange-400/20 bg-orange-500/10 px-5 py-4 text-sm text-orange-100">
            {message}
          </div>
        </div>
      ) : null}

      {tab ===
      "command" ? (
        <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {has(
              "roster_manage",
            ) ? (
              <Metric
                label="Roster"
                value={
                  data.roster
                    .length
                }
              />
            ) : null}

            {has(
              "training_manage",
            ) ? (
              <Metric
                label="Training"
                value={
                  data.training
                    .length
                }
              />
            ) : null}

            {has(
              "stats_submit",
            ) ? (
              <Metric
                label="Games"
                value={
                  data.games
                    .length
                }
              />
            ) : null}

            {has(
              "media_submit",
            ) ? (
              <Metric
                label="Media gaps"
                value={
                  data
                    .media_summary
                    .missing_posters +
                  data
                    .media_summary
                    .missing_full_games
                }
                tone="orange"
              />
            ) : null}

            {has(
              "stats_submit",
            ) ||
            has(
              "media_submit",
            ) ? (
              <Metric
                label="In review"
                value={
                  (has(
                    "media_submit",
                  )
                    ? data
                        .media_summary
                        .pending
                    : 0) +
                  (has(
                    "stats_submit",
                  )
                    ? data.stat_submissions.filter(
                        (
                          item,
                        ) =>
                          item.status ===
                          "pending",
                      )
                        .length
                    : 0)
                }
              />
            ) : null}
          </div>

          <div className="mt-6 min-w-0">
            <Panel
              eyebrow={`${roleLabel} access`}
              title="Choose a workspace"
            >
              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-400">
                {
                  roleDescription
                }{" "}
                Select a
                workspace below
                to start
                working.
              </p>

              <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workspaces
                  .filter(
                    (
                      workspace,
                    ) =>
                      has(
                        workspace.capability,
                      ),
                  )
                  .map(
                    (
                      workspace,
                    ) => (
                      <WorkspaceCard
                        key={`${workspace.tab}-${workspace.capability}`}
                        workspace={
                          workspace
                        }
                        onOpen={() =>
                          setTab(
                            workspace.tab,
                          )
                        }
                      />
                    ),
                  )}
              </div>
            </Panel>
          </div>

          <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
            {has(
              "media_submit",
            ) ? (
              <Panel
                eyebrow="Next best actions"
                title="What needs attention"
              >
                {missingActions.length ? (
                  <div className="mt-5 grid min-w-0 gap-3">
                    {missingActions
                      .slice(
                        0,
                        8,
                      )
                      .map(
                        (
                          item,
                        ) => (
                          <button
                            key={`${item.game.id}-${item.role}`}
                            onClick={() =>
                              setTab(
                                "media",
                              )
                            }
                            className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/25 p-4 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-black">
                                Add{" "}
                                {
                                  item.label
                                }
                              </p>

                              <p className="mt-1 break-words text-xs text-slate-500">
                                {
                                  item
                                    .game
                                    .title
                                }
                              </p>
                            </div>

                            <span className="shrink-0 text-xs font-black text-orange-300">
                              Fix →
                            </span>
                          </button>
                        ),
                      )}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">
                    All linked
                    games have
                    posters and
                    full-game
                    coverage, or
                    submissions
                    are already
                    in review.
                  </p>
                )}
              </Panel>
            ) : null}

            {has(
              "stats_submit",
            ) ? (
              <Panel
                eyebrow="Competition intelligence"
                title="Leaderboards"
              >
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  The club
                  appears in the
                  public portal
                  and standings
                  for every
                  league, season
                  and division
                  assigned by
                  FACKTS.
                </p>

                <div className="mt-5 grid min-w-0 gap-3">
                  {data.leaderboard_links.map(
                    (
                      link,
                    ) => (
                      <Link
                        key={
                          link.href
                        }
                        href={
                          link.href
                        }
                        className="min-w-0 break-words rounded-xl border border-white/15 bg-white/[.04] p-4 text-sm font-black text-[var(--club-accent)]"
                      >
                        {
                          link.title
                        }{" "}
                        →
                      </Link>
                    ),
                  )}
                </div>
              </Panel>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab ===
      "training" ? (
        <Feature
          capability="training_manage"
          active={has(
            "training_manage",
          )}
          title="Training workspace"
        >
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <Panel
              eyebrow="New session"
              title="Plan training"
            >
              <form
                onSubmit={(
                  event,
                ) => {
                  event.preventDefault();

                  const form =
                    new FormData(
                      event.currentTarget,
                    );

                  void post(
                    {
                      action:
                        "create_training",

                      title:
                        form.get(
                          "title",
                        ),

                      session_date:
                        form.get(
                          "session_date",
                        ),

                      venue:
                        form.get(
                          "venue",
                        ),

                      focus_area:
                        form.get(
                          "focus_area",
                        ),

                      summary:
                        form.get(
                          "summary",
                        ),
                    },
                    "training",
                  );

                  event.currentTarget.reset();
                }}
                className="mt-5 grid min-w-0 gap-3"
              >
                <input
                  name="title"
                  required
                  placeholder="Session title"
                  className={
                    input
                  }
                />

                <input
                  name="session_date"
                  required
                  type="datetime-local"
                  className={
                    input
                  }
                />

                <input
                  name="focus_area"
                  placeholder="Focus area"
                  className={
                    input
                  }
                />

                <input
                  name="venue"
                  placeholder="Venue"
                  className={
                    input
                  }
                />

                <textarea
                  name="summary"
                  rows={
                    4
                  }
                  placeholder="Session plan or summary"
                  className={
                    input
                  }
                />

                <button
                  disabled={
                    working
                  }
                  className={
                    button
                  }
                >
                  Save session
                </button>
              </form>
            </Panel>

            <Panel
              eyebrow="Development calendar"
              title={`${data.training.length} sessions`}
            >
              <div className="mt-5 grid min-w-0 gap-3">
                {data.training.map(
                  (
                    session,
                  ) => (
                    <article
                      key={
                        session.id
                      }
                      className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-black">
                            {
                              session.title
                            }
                          </p>

                          <p className="mt-1 break-words text-xs text-slate-500">
                            {formatDate(
                              session.session_date,
                            )}{" "}
                            ·{" "}
                            {session.venue ||
                              "Venue TBA"}
                          </p>
                        </div>

                        <Status
                          ready={
                            session.submission_status ===
                            "published"
                          }
                          pending={
                            session.submission_status ===
                            "pending"
                          }
                        />
                      </div>

                      <p className="mt-3 break-words text-sm text-slate-400">
                        {session.focus_area ||
                          session.summary ||
                          "Development session"}
                      </p>

                      <form
                        onSubmit={(
                          event,
                        ) => {
                          event.preventDefault();

                          void upload(
                            event.currentTarget,
                          );
                        }}
                        className="mt-4 flex min-w-0 flex-wrap gap-2"
                      >
                        <input
                          type="hidden"
                          name="kind"
                          value="training"
                        />

                        <input
                          type="hidden"
                          name="training_id"
                          value={
                            session.id
                          }
                        />

                        <input
                          name="file"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          required
                          className="min-w-0 flex-[1_1_12rem] text-xs text-slate-400"
                        />

                        <button
                          disabled={
                            working
                          }
                          className="max-w-full rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase"
                        >
                          Attach
                          image
                        </button>
                      </form>
                    </article>
                  ),
                )}

                {!data
                  .training
                  .length ? (
                  <Empty text="No team training sessions have been added yet." />
                ) : null}
              </div>
            </Panel>
          </div>
        </Feature>
      ) : null}

      {tab ===
      "team" ? (
        <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <Feature
              capability="roster_manage"
              active={has(
                "roster_manage",
              )}
              title="Roster management"
              compact
            >
              <Panel
                eyebrow="Public team roster"
                title="Add team member"
              >
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  The player will
                  appear on this
                  club’s public
                  roster. This
                  does not create
                  an official
                  FACKTS player
                  profile.
                </p>

                <form
                  onSubmit={(
                    event,
                  ) => {
                    event.preventDefault();

                    const form =
                      new FormData(
                        event.currentTarget,
                      );

                    void post(
                      {
                        action:
                          "add_roster_member",

                        display_name:
                          form.get(
                            "display_name",
                          ),

                        nickname:
                          form.get(
                            "nickname",
                          ),

                        jersey_number:
                          form.get(
                            "jersey_number",
                          ),

                        position:
                          form.get(
                            "position",
                          ),
                      },
                    );

                    event.currentTarget.reset();
                  }}
                  className="mt-5 grid min-w-0 gap-3"
                >
                  <input
                    name="display_name"
                    required
                    placeholder="Player name"
                    className={
                      input
                    }
                  />

                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      name="nickname"
                      placeholder="Nickname"
                      className={
                        input
                      }
                    />

                    <input
                      name="jersey_number"
                      placeholder="Jersey #"
                      className={
                        input
                      }
                    />
                  </div>

                  <input
                    name="position"
                    placeholder="Position"
                    className={
                      input
                    }
                  />

                  <button
                    disabled={
                      working
                    }
                    className={
                      button
                    }
                  >
                    Add to team
                    roster
                  </button>
                </form>
              </Panel>
            </Feature>

            <Panel
              eyebrow="Team people"
              title={`${data.roster.length} active roster records`}
            >
              <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                {data.roster.map(
                  (
                    member,
                  ) => (
                    <article
                      key={
                        member.id
                      }
                      className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                    >
                      <p className="break-words font-black">
                        {
                          member.display_name
                        }
                      </p>

                      <p className="mt-1 break-words text-xs uppercase text-slate-500">
                        {member.position ||
                          member.role ||
                          "Player"}

                        {member.jersey_number
                          ? ` · #${member.jersey_number}`
                          : ""}
                      </p>

                      <div className="mt-3 flex min-w-0 flex-wrap gap-3">
                        {has(
                          "player_profile_request",
                        ) ? (
                          <button
                            onClick={() => {
                              const bio =
                                window.prompt(
                                  `Profile notes for ${member.display_name}`,
                                );

                              if (
                                bio
                              ) {
                                void post(
                                  {
                                    action:
                                      "request_player_profile",

                                    roster_member_id:
                                      member.id,

                                    position:
                                      member.position,

                                    bio,
                                  },
                                );
                              }
                            }}
                            className="max-w-full break-words text-left text-[9px] font-black uppercase text-[var(--club-accent)]"
                          >
                            Request
                            official
                            profile →
                          </button>
                        ) : null}

                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${member.display_name} from the active team roster?`,
                              )
                            ) {
                              void post(
                                {
                                  action:
                                    "remove_roster_member",

                                  roster_member_id:
                                    member.id,
                                },
                              );
                            }
                          }}
                          className="max-w-full break-words text-[9px] font-black uppercase text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ),
                )}

                {!data
                  .roster
                  .length ? (
                  <Empty text="No active team roster records yet." />
                ) : null}
              </div>
            </Panel>
          </div>
        </section>
      ) : null}

      {tab ===
      "media" ? (
        <Feature
          capability="media_submit"
          active={has(
            "media_submit",
          )}
          title="Media readiness"
        >
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
            <div className="grid min-w-0 gap-6">
              {has(
                "branding_submit",
              ) ? (
                <Panel
                  eyebrow="Team identity"
                  title="Hero & logo uploads"
                >
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Uploads
                    remain
                    private until
                    Super Admin
                    approves the
                    public
                    change.
                  </p>

                  <div className="mt-5 grid min-w-0 gap-4">
                    {[
                      "hero",
                      "logo",
                    ].map(
                      (
                        kind,
                      ) => (
                        <form
                          key={
                            kind
                          }
                          onSubmit={(
                            event,
                          ) => {
                            event.preventDefault();

                            void upload(
                              event.currentTarget,
                            );
                          }}
                          className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                        >
                          <input
                            type="hidden"
                            name="kind"
                            value={
                              kind
                            }
                          />

                          <p className="mb-3 text-xs font-black uppercase">
                            {kind ===
                            "hero"
                              ? "Hero page image"
                              : "Team logo"}
                          </p>

                          <input
                            name="file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            required
                            className="w-full min-w-0 max-w-full text-xs text-slate-400"
                          />

                          <button
                            disabled={
                              working
                            }
                            className={`${button} mt-3`}
                          >
                            Upload{" "}
                            {
                              kind
                            }
                          </button>
                        </form>
                      ),
                    )}
                  </div>
                </Panel>
              ) : null}

              <Panel
                eyebrow="Team photos"
                title="Upload gallery image"
              >
                <form
                  onSubmit={(
                    event,
                  ) => {
                    event.preventDefault();

                    void upload(
                      event.currentTarget,
                    );
                  }}
                  className="mt-5 grid min-w-0 gap-3"
                >
                  <input
                    type="hidden"
                    name="kind"
                    value="gallery"
                  />

                  <input
                    name="title"
                    required
                    placeholder="Photo title"
                    className={
                      input
                    }
                  />

                  <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    required
                    className="w-full min-w-0 max-w-full text-xs text-slate-400"
                  />

                  <button
                    disabled={
                      working
                    }
                    className={
                      button
                    }
                  >
                    Upload team
                    photo
                  </button>
                </form>
              </Panel>

              <Panel
                eyebrow="Link coverage"
                title="Full game or highlight"
              >
                <form
                  onSubmit={(
                    event,
                  ) => {
                    event.preventDefault();

                    const form =
                      new FormData(
                        event.currentTarget,
                      );

                    void post(
                      {
                        action:
                          "submit_media_url",

                        owner_type:
                          "game",

                        owner_id:
                          form.get(
                            "game_id",
                          ),

                        title:
                          form.get(
                            "title",
                          ),

                        url:
                          form.get(
                            "url",
                          ),

                        thumbnail_url:
                          form.get(
                            "thumbnail_url",
                          ),

                        link_role:
                          form.get(
                            "link_role",
                          ),
                      },
                      "media",
                    );

                    event.currentTarget.reset();
                  }}
                  className="mt-5 grid min-w-0 gap-3"
                >
                  <select
                    name="game_id"
                    required
                    className={
                      input
                    }
                  >
                    <option value="">
                      Choose game
                    </option>

                    {data.games.map(
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
                          {
                            game.title
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    name="link_role"
                    className={
                      input
                    }
                  >
                    <option value="full_game">
                      Full game
                    </option>

                    <option value="highlight">
                      Highlight
                    </option>
                  </select>

                  <input
                    name="title"
                    required
                    placeholder="Media title"
                    className={
                      input
                    }
                  />

                  <input
                    name="url"
                    type="url"
                    required
                    placeholder="YouTube or approved source URL"
                    className={
                      input
                    }
                  />

                  <input
                    name="thumbnail_url"
                    type="url"
                    placeholder="Optional thumbnail URL"
                    className={
                      input
                    }
                  />

                  <button
                    disabled={
                      working
                    }
                    className={
                      button
                    }
                  >
                    Send for
                    review
                  </button>
                </form>
              </Panel>
            </div>

            <Panel
              eyebrow="Game coverage audit"
              title="Posters, full games & highlights"
            >
              <div className="mt-5 grid min-w-0 gap-3">
                {data.games.slice(0, 24).map(
                  (
                    game,
                  ) => (
                    <article
                      key={
                        game.id
                      }
                      className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-black">
                          {
                            game.title
                          }
                        </p>

                        <p className="mt-1 break-words text-xs text-slate-600">
                          {formatDate(
                            game.game_date,
                          )}
                        </p>
                      </div>

                      <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="min-w-0">
                          <p className="mb-2 text-[8px] font-black uppercase tracking-[.1em] text-slate-600">
                            Poster
                          </p>

                          <Status
                            {...game.poster}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="mb-2 text-[8px] font-black uppercase tracking-[.1em] text-slate-600">
                            Full
                            game
                          </p>

                          <Status
                            {...game.full_game}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="mb-2 text-[8px] font-black uppercase tracking-[.1em] text-slate-600">
                            Highlights
                          </p>

                          <Status
                            {...game.highlights}
                          />
                        </div>
                      </div>

                      <div className="mt-4 min-w-0">
                        {!game
                          .poster
                          .ready &&
                        !game
                          .poster
                          .pending ? (
                          <form
                            onSubmit={(
                              event,
                            ) => {
                              event.preventDefault();

                              void upload(
                                event.currentTarget,
                              );
                            }}
                            className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
                          >
                            <input
                              type="hidden"
                              name="kind"
                              value="poster"
                            />

                            <input
                              type="hidden"
                              name="game_id"
                              value={
                                game.id
                              }
                            />

                            <input
                              type="hidden"
                              name="title"
                              value={`${game.title} poster`}
                            />

                            <input
                              name="file"
                              type="file"
                              accept="image/*"
                              required
                              className="w-full min-w-0 flex-1 text-[9px] text-slate-500"
                            />

                            <button
                              disabled={
                                working
                              }
                              className="max-w-full rounded-lg bg-orange-500 px-3 py-2 text-[8px] font-black text-black"
                            >
                              Upload
                              poster
                            </button>
                          </form>
                        ) : (
                          <Link
                            href={`/games/${game.id}`}
                            className="break-words text-[9px] font-black uppercase text-orange-300"
                          >
                            Open
                            game →
                          </Link>
                        )}
                      </div>
                    </article>
                  ),
                )}

                {!data
                  .games
                  .length ? (
                  <Empty text="No games are linked to this permanent team yet." />
                ) : null}

                {data.games.length > 24 ? (
                  <p className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs text-slate-400">
                    Showing the 24 most recent linked games. Use the game selector above for older matches.
                  </p>
                ) : null}
              </div>
            </Panel>
          </div>
        </Feature>
      ) : null}

      {tab ===
      "live" ? (
        <Feature
          capability="broadcast_manage"
          active={has(
            "broadcast_manage",
          )}
          title="YouTube Live Studio"
        >
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
            <Panel
              eyebrow="Secure channel"
              title={
                data.broadcast_channel
                  ? data
                      .broadcast_channel
                      .channel_title ||
                    "YouTube connected"
                  : "Connect YouTube"
              }
            >
              <p className="mt-3 text-sm leading-6 text-slate-400">
                OAuth
                credentials stay
                encrypted on the
                server. Teams
                never receive
                Super Admin
                access.
              </p>

              <a
                href={`/api/team-portal/youtube/connect?team_id=${encodeURIComponent(
                  teamId,
                )}`}
                className={`${button} mt-5 inline-flex`}
              >
                {data.broadcast_channel
                  ? "Reconnect channel"
                  : "Connect YouTube channel"}
              </a>
            </Panel>

            <Panel
              eyebrow="Game, training or show"
              title="Schedule broadcast"
            >
              <form
                onSubmit={async (
                  event,
                ) => {
                  event.preventDefault();

                  const form =
                    new FormData(
                      event.currentTarget,
                    );

                  setWorking(
                    true,
                  );

                  const response =
                    await fetch(
                      "/api/team-portal/youtube/broadcast",
                      {
                        method:
                          "POST",

                        headers: {
                          "content-type":
                            "application/json",
                        },

                        body: JSON.stringify(
                          {
                            team_id:
                              teamId,

                            title:
                              form.get(
                                "title",
                              ),

                            description:
                              form.get(
                                "description",
                              ),

                            scheduled_start:
                              form.get(
                                "scheduled_start",
                              ),

                            broadcast_type:
                              form.get(
                                "broadcast_type",
                              ),

                            game_id:
                              form.get(
                                "game_id",
                              ) ||
                              null,

                            training_session_id:
                              form.get(
                                "training_session_id",
                              ) ||
                              null,

                            privacy_status:
                              form.get(
                                "privacy_status",
                              ),
                          },
                        ),
                      },
                    );

                  const payload =
                    await response
                      .json()
                      .catch(
                        () =>
                          ({}),
                      );

                  setMessage(
                    payload.message ||
                      payload.error ||
                      "Broadcast request finished.",
                  );

                  if (
                    response.ok
                  ) {
                    setEncoder(
                      payload.encoder,
                    );

                    await load();
                  }

                  setWorking(
                    false,
                  );
                }}
                className="mt-5 grid min-w-0 gap-3"
              >
                <input
                  name="title"
                  required
                  placeholder="Broadcast title"
                  className={
                    input
                  }
                />

                <input
                  name="scheduled_start"
                  required
                  type="datetime-local"
                  className={
                    input
                  }
                />

                <select
                  name="broadcast_type"
                  className={
                    input
                  }
                >
                  <option value="game">
                    Live game
                  </option>

                  <option value="training">
                    Training
                    stream
                  </option>

                  <option value="show">
                    Team
                    broadcast /
                    show
                  </option>
                </select>

                <select
                  name="game_id"
                  className={
                    input
                  }
                >
                  <option value="">
                    Game (when
                    applicable)
                  </option>

                  {data.games.map(
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
                        {
                          game.title
                        }
                      </option>
                    ),
                  )}
                </select>

                <select
                  name="training_session_id"
                  className={
                    input
                  }
                >
                  <option value="">
                    Training
                    session
                    (when
                    applicable)
                  </option>

                  {data.training.map(
                    (
                      session,
                    ) => (
                      <option
                        key={
                          session.id
                        }
                        value={
                          session.id
                        }
                      >
                        {
                          session.title
                        }
                      </option>
                    ),
                  )}
                </select>

                <select
                  name="privacy_status"
                  className={
                    input
                  }
                >
                  <option value="unlisted">
                    Unlisted
                  </option>

                  <option value="private">
                    Private
                  </option>

                  <option value="public">
                    Public
                  </option>
                </select>

                <textarea
                  name="description"
                  rows={
                    3
                  }
                  placeholder="Description"
                  className={
                    input
                  }
                />

                <button
                  disabled={
                    working ||
                    !data.broadcast_channel
                  }
                  className={
                    button
                  }
                >
                  Create
                  YouTube
                  broadcast
                </button>
              </form>

              {encoder ? (
                <div className="mt-5 min-w-0 rounded-xl border border-red-400/30 bg-red-500/10 p-4">
                  <p className="text-xs font-black uppercase text-red-200">
                    Shown once —
                    copy into
                    your encoder
                  </p>

                  <p className="mt-3 break-all text-xs text-slate-300">
                    Server:{" "}
                    {
                      encoder.ingestion_address
                    }
                  </p>

                  <p className="mt-2 break-all text-xs text-slate-300">
                    Stream key:{" "}
                    {
                      encoder.stream_name
                    }
                  </p>
                </div>
              ) : null}
            </Panel>
          </div>
        </Feature>
      ) : null}
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?:
    | "default"
    | "orange";
}) {
  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-white/10 bg-slate-950 p-5">
      <p
        className={`break-words text-3xl font-black ${
          tone ===
          "orange"
            ? "text-[var(--club-accent)]"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 break-words text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
        {label}
      </p>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 max-w-full rounded-[1.5rem] border border-white/10 bg-slate-950 p-5 sm:p-6">
      <p className="break-words text-[9px] font-black uppercase tracking-[.18em] text-[var(--club-accent)]">
        {eyebrow}
      </p>

      <h2 className="mt-2 max-w-full break-words text-2xl font-black uppercase">
        {title}
      </h2>

      {children}
    </section>
  );
}

function WorkspaceCard({
  workspace,
  onOpen,
}: {
  workspace:
    (typeof workspaces)[number];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onOpen
      }
      className="min-w-0 max-w-full rounded-xl border border-emerald-400/20 bg-emerald-500/[.07] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--club-accent)] hover:bg-white/[.06]"
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0 break-words text-base font-black uppercase">
          {
            workspace.label
          }
        </span>

        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[7px] font-black uppercase text-emerald-300">
          Open
        </span>
      </span>

      <span className="mt-2 block max-w-full break-words text-xs leading-5 text-slate-400">
        {
          workspace.description
        }
      </span>

      <span className="mt-4 block max-w-full break-words text-[8px] font-black uppercase tracking-[.1em] text-[var(--club-accent)]">
        Enter workspace →
      </span>
    </button>
  );
}

function Feature({
  active,
  children,
  compact = false,
}: {
  capability: TeamCapability;
  active: boolean;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (!active) {
    return null;
  }

  return (
    <section
      className={
        compact
          ? "min-w-0 max-w-full"
          : "mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      }
    >
      {children}
    </section>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="min-w-0 max-w-full break-words rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
