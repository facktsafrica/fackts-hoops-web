import Link from "next/link";
import { notFound } from "next/navigation";

import TeamActions from "./TeamActions";
import TeamGamesExplorer from "./TeamGamesExplorer";

import GameMedia, {
  type GameMediaItem,
} from "@/app/games/[id]/GameMedia";

import {
  loadTeamProfileBundle,
  type TeamCompetitionRecord,
  type TeamGame,
  type TeamMember,
  type TrainingSession,
} from "@/lib/hoops/teamProfiles";

import {
  loadPublicTeamIntelligence,
  type PublicActivityRecord,
  type PublicPlayerRanking,
  type PublicTeamIntelligence,
} from "@/lib/hoops/publicTeamIntelligence";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type TeamTab =
  | "overview"
  | "roster"
  | "results"
  | "statistics"
  | "competitions"
  | "events"
  | "training"
  | "media";

const tabs: Array<{
  key: TeamTab;
  label: string;
}> = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "roster",
    label: "Roster",
  },
  {
    key: "results",
    label: "Results",
  },
  {
    key: "statistics",
    label: "Statistics",
  },
  {
    key: "competitions",
    label: "Leagues & competitions",
  },
  {
    key: "events",
    label: "Events",
  },
  {
    key: "training",
    label: "Training",
  },
  {
    key: "media",
    label: "Media",
  },
];

function formatDate(
  value?: string | null,
  includeTime = false,
) {
  if (!value) {
    return "Date not recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Date not recorded";
  }

  return date.toLocaleString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(includeTime
        ? {
            hour: "numeric",
            minute: "2-digit",
          }
        : {}),
    },
  );
}

function safeColor(
  value?: string | null,
  fallback = "#F58220",
) {
  return /^#[0-9a-f]{6}$/i.test(
    String(value || ""),
  )
    ? String(value)
    : fallback;
}

function score(
  game: TeamGame,
) {
  if (
    game.team_score == null ||
    game.opponent_score == null
  ) {
    return "–";
  }

  return `${game.team_score}–${game.opponent_score}`;
}

function normalizeTitle(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim();
}

function activityLabel(
  activity:
    PublicActivityRecord,
) {
  switch (
    activity.kind
  ) {
    case "league":
      return "League";

    case "event":
      return "Event";

    case "one_on_one":
      return "1 v 1 Competition";

    case "community_takeover":
      return "Community Court Takeover";

    case "high_school_takeover":
      return "High School Takeover";

    case "university_takeover":
      return "University Takeover";

    case "friendly":
      return "Friendly";

    case "competition":
      return "Competition";

    default:
      return "Basketball record";
  }
}

function percentage(
  value: number,
) {
  return `${value.toFixed(
    1,
  )}%`;
}

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    tab?: string;
  }>;
}) {
  const [
    {
      slug,
    },
    query,
  ] = await Promise.all([
    params,
    searchParams,
  ]);

  const bundle =
    await loadTeamProfileBundle(
      slug,
    );

  if (!bundle) {
    notFound();
  }

  const {
    profile,
    roster,
    games,
    training,
    media,
    competitionRecords,
    leagueMemberships,
    performance,
    verifiedStats,
    canClaim,
  } = bundle;

  /*
   * NEW PUBLIC INTELLIGENCE LAYER
   *
   * This reads the canonical games +
   * canonical game_box_score_lines.
   *
   * If a database issue ever happens,
   * the old team page still remains usable.
   */
  let intelligence:
    | PublicTeamIntelligence
    | null = null;

  try {
    intelligence =
      await loadPublicTeamIntelligence(
        {
          id:
            profile.id,

          slug:
            profile.slug,

          name:
            profile.name,

          shortName:
            profile.short_name,

          aliases:
            profile.aliases,
        },
      );
  } catch (
    error
  ) {
    console.error(
      "Public team intelligence could not be loaded:",
      error,
    );
  }

  const requestedTab =
    String(
      query.tab ||
        "overview",
    ) as TeamTab;

  const activeTab =
    tabs.some(
      (
        tab,
      ) =>
        tab.key ===
        requestedTab,
    )
      ? requestedTab
      : "overview";

  const verified =
    profile.verification_status ===
    "verified";

  const isFackts =
    profile.slug ===
    "fackts-africa";

  const activeRoster =
    roster.filter(
      (
        member,
      ) =>
        member.status !==
        "alumni",
    );

  const alumni =
    roster.filter(
      (
        member,
      ) =>
        member.status ===
        "alumni",
    );

  /*
   * Existing database-linked public records.
   * We keep these because some Event Hubs may
   * exist without having a game linked yet.
   */
  const leagueRecordIds =
    new Set(
      leagueMemberships.map(
        (
          membership,
        ) =>
          membership.id,
      ),
    );

  const legacyLeagueRecords =
    competitionRecords.filter(
      (
        record,
      ) =>
        leagueRecordIds.has(
          record.id,
        ),
    );

  const legacyCompetitions =
    competitionRecords.filter(
      (
        record,
      ) =>
        record.record_type ===
          "competition" &&
        !leagueRecordIds.has(
          record.id,
        ),
    );

  const legacyEvents =
    competitionRecords.filter(
      (
        record,
      ) =>
        record.record_type ===
        "event",
    );

  /*
   * Canonical activity categories.
   */
  const activities =
    intelligence?.activities ||
    [];

  const leagueActivities =
    activities.filter(
      (
        activity,
      ) =>
        activity.kind ===
        "league",
    );

  const competitionActivities =
    activities.filter(
      (activity) =>
        ["community_takeover", "competition"].includes(activity.kind) ||
        (activity.kind === "one_on_one" && !isFackts),
    );

  const highSchoolActivities =
    activities.filter(
      (
        activity,
      ) =>
        activity.kind ===
        "high_school_takeover",
    );

  const universityActivities =
    activities.filter(
      (
        activity,
      ) =>
        activity.kind ===
        "university_takeover",
    );

  const eventActivities =
    activities.filter(
      (
        activity,
      ) =>
        activity.kind ===
        "event",
    );

  const otherActivities =
    activities.filter(
      (
        activity,
      ) =>
        [
          "friendly",
          "other",
        ].includes(
          activity.kind,
        ),
    );

  /*
   * Avoid showing the same hardcoded / legacy
   * competition twice once canonical games
   * are producing the same record.
   */
  const canonicalCompetitionTitles =
    new Set(
      competitionActivities.map(
        (
          activity,
        ) =>
          normalizeTitle(
            activity.title,
          ),
      ),
    );

  const canonicalEventTitles =
    new Set(
      eventActivities.map(
        (
          activity,
        ) =>
          normalizeTitle(
            activity.title,
          ),
      ),
    );

  const extraLegacyCompetitions =
    legacyCompetitions.filter(
      (
        record,
      ) =>
        !canonicalCompetitionTitles.has(
          normalizeTitle(
            record.title,
          ),
        ),
    );

  const extraLegacyEvents =
    legacyEvents.filter(
      (
        record,
      ) =>
        !canonicalEventTitles.has(
          normalizeTitle(
            record.title,
          ),
        ),
    );

  /*
   * Official team performance must come from the same team-fixture bundle
   * used by the Teams directory. Organization-owned competitions such as
   * FACKTS Kings remain separate from FACKTS Hoops team statistics.
   */
  const played = performance.played;
  const wins = performance.wins;
  const losses = performance.losses;
  const pointsFor = performance.pointsFor;
  const pointsAgainst = performance.pointsAgainst;
  const pointDifference = performance.pointDifference;
  const winPercentage = performance.winPercentage;

  const pointsPerGame =
    played
      ? pointsFor /
        played
      : 0;

  const allowedPerGame =
    played
      ? pointsAgainst /
        played
      : 0;

  /*
   * Canonical player rankings.
   *
   * If no canonical box scores exist yet,
   * we keep the older verified player stats
   * visible as a fallback.
   */
  /*
   * One statistics authority.
   *
   * publicTeamIntelligence already reconciles:
   * - player_game_stats
   * - guest_game_stats
   * - game_box_score_lines
   *
   * The page must not rebuild a smaller legacy version
   * of a player stat record because that would drop the
   * richer Court Takeover statistics.
   */
  /*
   * ONE statistics authority.
   *
   * publicTeamIntelligence already reconciles:
   * - player_game_stats
   * - guest_game_stats
   * - game_box_score_lines
   *
   * Do not rebuild a smaller legacy player object here.
   */
  const playerRankings: PublicPlayerRanking[] =
    intelligence?.players ?? [];

  const summary =
    intelligence?.summary;

  // The directory and profile must use the exact same official team-game set.
  // Organization-owned competitions such as FACKTS Kings are displayed as
  // competition history, never as FACKTS Hoops team fixtures.
  const publicGameCount = games.length;

  const publicLeagueCount =
    Math.max(
      leagueMemberships.length,
      summary?.leagues ||
        0,
    );

  const publicCompetitionCount =
    Math.max(
      legacyCompetitions.length,
      summary?.competitions ||
        0,
    );

  const publicEventCount =
    Math.max(
      legacyEvents.length,
      summary?.events ||
        0,
    );

  const highSchoolCount =
    summary?.highSchoolTakeovers ||
    0;

  const universityCount =
    summary?.universityTakeovers ||
    0;

  const mediaItems:
    GameMediaItem[] =
    media.map(
      (
        item,
      ) => ({
        id: item.id,

        title:
          item.title,

        mediaType:
          item.media_type ||
          "Team media",

        url:
          item.url,

        thumbnailUrl:
          item.thumbnail_url ||
          "",

        rightsStatus:
          item.rights_status ||
          undefined,
      }),
    );

  const tabHref = (
    tab: TeamTab,
  ) =>
    `/teams/${profile.slug}?tab=${tab}`;

  const seasonRecords = [
    ...legacyLeagueRecords,
    ...legacyCompetitions,
  ];

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,6,23,.80),rgba(2,6,23,.97)),url('/images/one-on-one-bg.png')",
      }}
    >
      {/* HERO */}

      <section className="relative min-h-[500px] overflow-hidden border-b border-white/10 bg-[#050b16] sm:min-h-[600px]">
        {profile.cover_image_url ? (
          <img
            src={
              profile.cover_image_url
            }
            alt={`${profile.name} basketball team`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-[#050b16] via-[#07162b]/80 to-[#07162b]/35" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(249,115,22,.20),transparent_32%)]" />

        <div className="relative mx-auto flex min-h-[500px] max-w-7xl flex-col justify-between px-4 py-8 sm:min-h-[600px] sm:px-6 sm:py-10 lg:px-8">
          <Link
            href="/teams"
            className="inline-flex w-fit rounded-xl border border-white/15 bg-black/45 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] backdrop-blur transition hover:border-orange-400/60"
          >
            â† All teams
          </Link>

          <div className="pb-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
                <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#0b1f3a] shadow-2xl sm:h-32 sm:w-32">
                  {profile.logo_url ? (
                    <img
                      src={
                        profile.logo_url
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-black text-orange-300">
                      {(
                        profile.short_name ||
                        profile.name
                      )
                        .slice(
                          0,
                          2,
                        )
                        .toUpperCase()}
                    </span>
                  )}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] ${
                        verified
                          ? "border-emerald-300/35 bg-emerald-500/20 text-emerald-200"
                          : "border-white/15 bg-black/45 text-zinc-300"
                      }`}
                    >
                      {verified
                        ? "âœ“ Verified team"
                        : "Team profile"}
                    </span>

                    <span className="rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-orange-200">
                      {profile.team_type?.replace(
                        /_/g,
                        " ",
                      ) ||
                        "Basketball team"}
                    </span>
                  </div>

                  <h1 className="mt-3 break-words text-4xl font-black uppercase leading-[.9] tracking-[-.04em] sm:text-6xl lg:text-7xl">
                    {
                      profile.name
                    }
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm font-bold text-zinc-300 sm:text-base">
                    {profile.tagline ||
                      "A permanent FACKTS Hoops team record."}
                  </p>

                  <p className="mt-3 text-[10px] font-black uppercase tracking-[.13em] text-zinc-400">
                    {[
                      profile.city,
                      profile.country,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        ", ",
                      ) ||
                      "Location not listed"}

                    {profile.founded_year
                      ? ` · Founded ${profile.founded_year}`
                      : ""}

                    {leagueMemberships.length
                      ? ` · ${leagueMemberships
                          .map(
                            (
                              membership,
                            ) =>
                              membership
                                .league
                                .short_name ||
                              membership
                                .league
                                .name,
                          )
                          .join(
                            " · ",
                          )}`
                      : profile.current_competition
                        ? ` · ${profile.current_competition}`
                        : ""}
                  </p>
                </div>
              </div>

              <TeamActions
                teamId={
                  profile.id
                }
                teamName={
                  profile.name
                }
                teamSlug={
                  profile.slug
                }
                claimStatus={
                  profile.claim_status ||
                  "unclaimed"
                }
                contactEmail={
                  profile.contact_email ||
                  ""
                }
                canClaim={
                  canClaim
                }
              />
            </div>

            <div className="mt-7 flex items-center gap-2">
              <span
                className="h-1.5 w-16 rounded-full"
                style={{
                  backgroundColor:
                    safeColor(
                      profile.primary_color,
                      "#0B1F3A",
                    ),
                }}
              />

              <span
                className="h-1.5 w-10 rounded-full"
                style={{
                  backgroundColor:
                    safeColor(
                      profile.secondary_color,
                    ),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PUBLIC RECORD METRICS */}

      <section className="border-b border-white/10 bg-[#07162b]/95">
        {isFackts ? (
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-4 sm:px-6 lg:grid-cols-8 lg:px-8">
            <TopMetric
              value={String(
                activeRoster.length,
              )}
              label="Active roster"
            />

            <TopMetric
              value={String(
                publicGameCount,
              )}
              label="Recorded games"
            />

            <TopMetric
              value={String(
                publicLeagueCount,
              )}
              label="Leagues"
            />

            <TopMetric
              value={String(
                publicCompetitionCount,
              )}
              label="Competitions"
            />

            <TopMetric
              value={String(
                publicEventCount,
              )}
              label="Events"
            />

            <TopMetric
              value={String(
                highSchoolCount,
              )}
              label="High school takeovers"
            />

            <TopMetric
              value={String(
                universityCount,
              )}
              label="University takeovers"
            />

            <TopMetric
              value={`${Math.round(
                winPercentage,
              )}%`}
              label="Team win rate"
            />
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-4 sm:px-6 lg:grid-cols-8 lg:px-8">
            <TopMetric
              value={String(
                activeRoster.length,
              )}
              label="Active roster"
            />

            <TopMetric
              value={String(
                publicGameCount,
              )}
              label="Games"
            />

            <TopMetric
              value={String(
                publicLeagueCount,
              )}
              label="Leagues"
            />

            <TopMetric
              value={String(
                publicCompetitionCount,
              )}
              label="Competitions"
            />

            <TopMetric
              value={String(
                publicEventCount,
              )}
              label="Events"
            />

            <TopMetric
              value={`${Math.round(
                winPercentage,
              )}%`}
              label="Win rate"
            />

            <TopMetric
              value={String(
                media.length,
              )}
              label="Media"
            />

            <TopMetric
              value={
                performance.currentStreak
              }
              label="Current streak"
            />
          </div>
        )}
      </section>

      {/* TABS */}

      <nav className="sticky top-[69px] z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {tabs.map(
            (
              tab,
            ) => (
              <Link
                key={
                  tab.key
                }
                href={tabHref(
                  tab.key,
                )}
                scroll={
                  false
                }
                className={`shrink-0 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] transition ${
                  activeTab ===
                  tab.key
                    ? "bg-orange-500 text-black"
                    : "border border-white/10 bg-white/[.03] text-zinc-400 hover:border-orange-400/45 hover:text-white"
                }`}
              >
                {
                  tab.label
                }
              </Link>
            ),
          )}
        </div>
      </nav>

      {/* OVERVIEW */}

      {activeTab ===
      "overview" ? (
        <>
          <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-16">
            <article className="rounded-[1.8rem] border border-white/10 bg-slate-950/85 p-6 sm:p-8">
              <SectionHeading
                eyebrow="Team overview"
                title={`About ${
                  profile.short_name ||
                  profile.name
                }`}
              />

              <p className="mt-5 text-sm leading-7 text-zinc-300 sm:text-base">
                {profile.description ||
                  "This permanent team profile connects its roster, games, statistics, events, competitions and media in one basketball record."}
              </p>

              {profile.organization_name &&
              profile.organization_name !==
                profile.name ? (
                <p className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-xs leading-5 text-blue-200">
                  Organization:{" "}
                  <strong>
                    {
                      profile.organization_name
                    }
                  </strong>
                </p>
              ) : null}
            </article>

            <article className="rounded-[1.8rem] border border-white/10 bg-[#07162b]/95 p-6 sm:p-8">
              <SectionHeading
                eyebrow="Team information"
                title="People and contact"
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Head coach"
                  value={
                    profile.coach_name ||
                    "Not listed"
                  }
                />

                <Info
                  label="Assistant coach"
                  value={
                    profile.assistant_coach_name ||
                    "Not listed"
                  }
                />

                <Info
                  label={
                    profile.manager_title ||
                    "Team manager"
                  }
                  value={
                    profile.manager_name ||
                    "Not listed"
                  }
                />

                <Info
                  label="League & division"
                  value={
                    leagueMemberships.length
                      ? leagueMemberships
                          .map(
                            (
                              membership,
                            ) =>
                              `${
                                membership
                                  .league
                                  .short_name ||
                                membership
                                  .league
                                  .name
                              } · ${
                                membership.division
                              }`,
                          )
                          .join(
                            "; ",
                          )
                      : [
                            profile.division,
                            profile.age_category,
                          ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " · ",
                          ) ||
                        "Not listed"
                  }
                />

                <Info
                  label="Public contact"
                  value={
                    profile.contact_email ||
                    "Through FACKTS"
                  }
                />

                <Info
                  label="Website"
                  value={
                    profile.website_url ||
                    "Not listed"
                  }
                />
              </div>
            </article>
          </section>

          {/* ORGANISATION / TEAM RECORD */}

          {activities.length ? (
            <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeading
                  eyebrow="Basketball footprint"
                  title={
                    isFackts
                      ? "FACKTS basketball record"
                      : "Where this team competes"
                  }
                  text="The record below is generated from games, leagues, events and competition data already recorded by the site."
                />

                <Link
                  href={tabHref(
                    "competitions",
                  )}
                  className="shrink-0 text-[9px] font-black uppercase tracking-[.12em] text-orange-300"
                >
                  Full record →
                </Link>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activities
                  .slice(
                    0,
                    6,
                  )
                  .map(
                    (
                      activity,
                    ) => (
                      <ActivityCard
                        key={
                          activity.key
                        }
                        activity={
                          activity
                        }
                      />
                    ),
                  )}
              </div>
            </section>
          ) : null}

          {/* LATEST GAMES */}

          <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
            <div className="flex items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Current form"
                title="Latest team record"
              />

              <Link
                href={tabHref(
                  "results",
                )}
                className="shrink-0 text-[9px] font-black uppercase tracking-[.12em] text-orange-300"
              >
                All results →
              </Link>
            </div>

            {games.length ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {games
                  .slice(
                    0,
                    3,
                  )
                  .map(
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
                      />
                    ),
                  )}
              </div>
            ) : (
              <EmptyState
                title="No team games published"
                body="Verified fixtures and results will appear here when connected by Teams Admin."
              />
            )}
          </section>

          {/* ROSTER + COMPETITIONS */}

          <section className="border-y border-white/10 bg-[#07162b]/80">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <SectionHeading
                    eyebrow="Roster"
                    title="Team members"
                  />

                  <Link
                    href={tabHref(
                      "roster",
                    )}
                    className="shrink-0 text-[9px] font-black uppercase text-orange-300"
                  >
                    Full roster →
                  </Link>
                </div>

                {activeRoster.length ? (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {activeRoster
                      .slice(
                        0,
                        6,
                      )
                      .map(
                        (
                          member,
                        ) => (
                          <MiniMember
                            key={
                              member.id
                            }
                            member={
                              member
                            }
                          />
                        ),
                      )}
                  </div>
                ) : (
                  <EmptyState
                    title="Roster coming soon"
                    body="Permanent team members will appear after publication."
                    compact
                  />
                )}
              </div>

              <div>
                <div className="flex items-end justify-between gap-3">
                  <SectionHeading
                    eyebrow="Competition history"
                    title="Competition record"
                  />

                  <Link
                    href={tabHref(
                      "competitions",
                    )}
                    className="shrink-0 text-[9px] font-black uppercase text-orange-300"
                  >
                    All competitions →
                  </Link>
                </div>

                {activities.length ? (
                  <div className="mt-6 grid gap-3">
                    {activities
                      .filter(
                        (
                          activity,
                        ) =>
                          activity.kind !==
                          "event",
                      )
                      .slice(
                        0,
                        4,
                      )
                      .map(
                        (
                          activity,
                        ) => (
                          <ActivityRow
                            key={
                              activity.key
                            }
                            activity={
                              activity
                            }
                          />
                        ),
                      )}
                  </div>
                ) : seasonRecords.length ? (
                  <div className="mt-6 grid gap-3">
                    {seasonRecords
                      .slice(
                        0,
                        3,
                      )
                      .map(
                        (
                          record,
                        ) => (
                          <CompetitionRow
                            key={
                              record.id
                            }
                            record={
                              record
                            }
                          />
                        ),
                      )}
                  </div>
                ) : (
                  <EmptyState
                    title="No league or competition linked"
                    body="League placement and competition history appear here when connected to this permanent team."
                    compact
                  />
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* ROSTER */}

      {activeTab ===
      "roster" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Official roster"
            title="Players and team staff"
            text="Members are linked to their public player profiles where available. Event-only entrants are not automatically added."
          />

          {activeRoster.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeRoster.map(
                (
                  member,
                ) => (
                  <MemberCard
                    key={
                      member.id
                    }
                    member={
                      member
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              title="Roster ready to be published"
              body="Teams Admin can link official players, guest hoopers and team staff without duplicating their profiles."
            />
          )}

          {alumni.length ? (
            <div className="mt-12">
              <SectionHeading
                eyebrow="Team history"
                title="Alumni"
              />

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {alumni.map(
                  (
                    member,
                  ) => (
                    <MemberCard
                      key={
                        member.id
                      }
                      member={
                        member
                      }
                      muted
                    />
                  ),
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* RESULTS */}

      {activeTab ===
      "results" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Fixtures and results"
            title="Team game record"
            text="Every game linked to this team lives here. Filter live, upcoming, final, postponed and cancelled records, then narrow the history by 1v1, 3v3, 5v5 or any other recorded format."
          />

          {games.length ? (
            <TeamGamesExplorer games={games} />
          ) : (
            <EmptyState
              title="No team games published"
              body="Verified fixtures and results will appear here when this team is linked as a participant in the canonical game record."
            />
          )}
        </section>
      ) : null}

      {/* STATISTICS */}

      {activeTab ===
      "statistics" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Canonical basketball data"
            title="Team statistics"
            text="The public record uses connected games and approved canonical box scores. Rankings update as verified games are added."
          />

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <PerformanceMetric
              value={
                played
              }
              label="Played"
            />

            <PerformanceMetric
              value={
                wins
              }
              label="Wins"
              tone="green"
            />

            <PerformanceMetric
              value={
                losses
              }
              label="Losses"
              tone="red"
            />

            <PerformanceMetric
              value={percentage(
                winPercentage,
              )}
              label="Win rate"
              tone="orange"
            />

            <PerformanceMetric
              value={
                pointsFor
              }
              label="Points for"
              tone="blue"
            />

            <PerformanceMetric
              value={
                pointsAgainst
              }
              label="Points against"
            />

            <PerformanceMetric
              value={pointsPerGame.toFixed(
                1,
              )}
              label="Points per game"
              tone="orange"
            />

            <PerformanceMetric
              value={allowedPerGame.toFixed(
                1,
              )}
              label="Allowed per game"
            />

            <PerformanceMetric
              value={`${
                pointDifference >
                0
                  ? "+"
                  : ""
              }${pointDifference}`}
              label="Point difference"
              tone={
                pointDifference >=
                0
                  ? "green"
                  : "red"
              }
            />

            <PerformanceMetric
              value={
                performance.currentStreak
              }
              label="Current streak"
            />

            <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-5">
              <p className="text-[9px] font-black uppercase tracking-[.13em] text-zinc-500">
                Last five
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {performance.lastFive.length ? (
                  performance.lastFive.map(
                    (
                      result,
                      index,
                    ) => (
                      <ResultPill
                        key={`${result}-${index}`}
                        result={
                          result
                        }
                      />
                    ),
                  )
                ) : (
                  <span className="text-2xl font-black text-zinc-600">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PLAYER RANKINGS */}

          <div className="mt-14">
            <SectionHeading
              eyebrow="Player rankings"
              title="Team leaders"
              text={
                isFackts
                  ? "Verified players across the FACKTS basketball record, including canonical FACKTS competition box scores."
                  : `Verified player production for ${profile.name}.`
              }
            />

            {playerRankings.length ? (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/90">
                <table className="w-full min-w-[880px] text-left">
                  <thead className="border-b border-white/10 bg-[#07162b]/80 text-[8px] font-black uppercase tracking-[.12em] text-zinc-400">
                    <tr>
                      <th className="p-4">
                        #
                      </th>

                      <th className="p-4">
                        Player
                      </th>

                      <th className="p-4">
                        GP
                      </th>

                      <th className="p-4">
                        PPG
                      </th>

                      <th className="p-4">
                        RPG
                      </th>

                      <th className="p-4">
                        APG
                      </th>

                      <th className="p-4">
                        PTS
                      </th>

                      <th className="p-4">
                        REB
                      </th>

                      <th className="p-4">
                        AST
                      </th>

                      <th className="p-4">
                        STL
                      </th>

                      <th className="p-4">
                        BLK
                      </th>

                      <th className="p-4">
                        3PM
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {playerRankings.map(
                      (
                        leader,
                        index,
                      ) => (
                        <tr
                          key={
                            leader.key
                          }
                          className="border-b border-white/[.06] text-sm transition hover:bg-white/[.03]"
                        >
                          <td className="p-4 font-black text-zinc-500">
                            {index +
                              1}
                          </td>

                          <td className="p-4">
                            {leader.profileHref ? (
                              <Link
                                href={
                                  leader.profileHref
                                }
                                className="font-black text-orange-300 transition hover:text-orange-200"
                              >
                                {
                                  leader.name
                                }
                              </Link>
                            ) : (
                              <span className="font-black text-white">
                                {
                                  leader.name
                                }
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            {
                              leader.gamesPlayed
                            }
                          </td>

                          <td className="p-4 text-lg font-black text-orange-300">
                            {leader.pointsPerGame.toFixed(
                              1,
                            )}
                          </td>

                          <td className="p-4">
                            {leader.reboundsPerGame.toFixed(
                              1,
                            )}
                          </td>

                          <td className="p-4">
                            {leader.assistsPerGame.toFixed(
                              1,
                            )}
                          </td>

                          <td className="p-4">
                            {
                              leader.points
                            }
                          </td>

                          <td className="p-4">
                            {
                              leader.rebounds
                            }
                          </td>

                          <td className="p-4">
                            {
                              leader.assists
                            }
                          </td>

                          <td className="p-4">
                            {
                              leader.steals
                            }
                          </td>

                          <td className="p-4">
                            {
                              leader.blocks
                            }
                          </td>

                          <td className="p-4">
                            {
                              leader.threePointers
                            }
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Player rankings activate with canonical box scores"
                body="Once a game has approved public player lines, the rankings appear here automatically."
              />
            )}
          </div>

          {/* STATS BY COMPETITION */}

          {activities.some(
            (
              activity,
            ) =>
              activity.leaders
                .length >
              0,
          ) ? (
            <div className="mt-14">
              <SectionHeading
                eyebrow="Competition splits"
                title="Stats by competition"
                text="Player production stays separated by league, competition, event and takeover programme instead of being mixed into one unexplained total."
              />

              <div className="mt-7 space-y-8">
                {activities
                  .filter(
                    (
                      activity,
                    ) =>
                      activity
                        .leaders
                        .length >
                      0,
                  )
                  .map(
                    (
                      activity,
                    ) => (
                      <CompetitionStatsCard
                        key={
                          activity.key
                        }
                        activity={
                          activity
                        }
                      />
                    ),
                  )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* LEAGUES + COMPETITIONS */}

      {activeTab ===
      "competitions" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Basketball footprint"
            title="Leagues & competitions"
            text="This page now reflects the competitions actually recorded by the site, including season leagues, FACKTS Kings and takeover programmes."
          />

          {/* LEAGUES */}

          <div className="mt-10">
            <SubHeading
              title="League records"
              text="Season and division-linked games."
            />

            {leagueActivities.length ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {leagueActivities.map(
                  (
                    activity,
                  ) => (
                    <ActivityCard
                      key={
                        activity.key
                      }
                      activity={
                        activity
                      }
                    />
                  ),
                )}
              </div>
            ) : legacyLeagueRecords.length ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {legacyLeagueRecords.map(
                  (
                    record,
                  ) => (
                    <CompetitionCard
                      key={
                        record.id
                      }
                      record={
                        record
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                title="No league assigned"
                body="When this team is placed in KBF, SIEL, NCL or another league, the public league record will appear here."
                compact
              />
            )}
          </div>

          {/* MAIN COMPETITIONS */}

          <div className="mt-14">
            <SubHeading
              title="Competitions"
              text={
                isFackts
                  ? "FACKTS-owned recurring basketball competitions."
                  : "Recurring and structured competitions this team has entered."
              }
            />

            {competitionActivities.length ||
            extraLegacyCompetitions.length ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {competitionActivities.map(
                  (
                    activity,
                  ) => (
                    <ActivityCard
                      key={
                        activity.key
                      }
                      activity={
                        activity
                      }
                    />
                  ),
                )}

                {extraLegacyCompetitions.map(
                  (
                    record,
                  ) => (
                    <CompetitionCard
                      key={
                        record.id
                      }
                      record={
                        record
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                title="No competition record yet"
                body="Structured competitions appear here when their games are connected to this team."
                compact
              />
            )}
          </div>

          {/* HIGH SCHOOL */}

          {highSchoolActivities.length ? (
            <div className="mt-14">
              <SubHeading
                title="High School Takeovers"
                text="FACKTS basketball activity recorded in high schools."
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {highSchoolActivities.map(
                  (
                    activity,
                  ) => (
                    <ActivityCard
                      key={
                        activity.key
                      }
                      activity={
                        activity
                      }
                    />
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* UNIVERSITY */}

          {universityActivities.length ? (
            <div className="mt-14">
              <SubHeading
                title="University Takeovers"
                text="FACKTS basketball activity recorded in universities and colleges."
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {universityActivities.map(
                  (
                    activity,
                  ) => (
                    <ActivityCard
                      key={
                        activity.key
                      }
                      activity={
                        activity
                      }
                    />
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* OTHER */}

          {otherActivities.length ? (
            <div className="mt-14">
              <SubHeading
                title="Other basketball records"
                text="Friendlies and other recorded team activity."
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {otherActivities.map(
                  (
                    activity,
                  ) => (
                    <ActivityCard
                      key={
                        activity.key
                      }
                      activity={
                        activity
                      }
                    />
                  ),
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* EVENTS */}

      {activeTab ===
      "events" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Event history"
            title="Events"
            text="One-off tournaments and Event Hubs are kept separate from recurring competitions and league seasons."
          />

          {eventActivities.length ||
          extraLegacyEvents.length ? (
            <>
              {eventActivities.length ? (
                <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {eventActivities.map(
                    (
                      activity,
                    ) => (
                      <ActivityCard
                        key={
                          activity.key
                        }
                        activity={
                          activity
                        }
                      />
                    ),
                  )}
                </div>
              ) : null}

              {extraLegacyEvents.length ? (
                <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {extraLegacyEvents.map(
                    (
                      record,
                    ) => (
                      <CompetitionCard
                        key={
                          record.id
                        }
                        record={
                          record
                        }
                      />
                    ),
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No events linked"
              body="Verified Event Hubs connected to this team will appear here."
            />
          )}
        </section>
      ) : null}

      {/* TRAINING */}

      {activeTab ===
      "training" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Team development"
            title="Training record"
            text="Approved sessions, focus areas, venues and team-development updates."
          />

          {training.length ? (
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {training.map(
                (
                  session,
                ) => (
                  <TrainingCard
                    key={
                      session.id
                    }
                    session={
                      session
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              title="Training updates coming soon"
              body="Approved team-development sessions will appear here after publication."
            />
          )}
        </section>
      ) : null}

      {/* MEDIA */}

      {activeTab ===
      "media" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            eyebrow="Team coverage"
            title="Media"
            text="Highlights, interviews, full games and training videos play inside the profile when the source platform permits embedding."
          />

          <div className="mt-7">
            <GameMedia
              items={
                mediaItems
              }
              emptyTitle="Team media coming soon"
              emptyText="Approved highlights, interviews, full games and training content will appear here after publication."
            />
          </div>
        </section>
      ) : null}

      {/* FOOTER CTA */}

      <section className="border-t border-white/10 bg-[#07162b]/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">
              Basketball documented properly
            </p>

            <h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">
              Players, games and
              history—connected.
            </h2>
          </div>

          <Link
            href="/book-coverage"
            className="shrink-0 rounded-xl bg-orange-500 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-black"
          >
            Book team coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   SMALL UI COMPONENTS
   ========================================================= */

function TopMetric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[.07] bg-black/25 px-3 py-3 text-center">
      <p className="text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-[.1em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-tight sm:text-4xl">
        {title}
      </h2>

      {text ? (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function SubHeading({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  return (
    <div>
      <h3 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
        {title}
      </h3>

      {text ? (
        <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
          {text}
        </p>
      ) : null}
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
    <div className="rounded-xl border border-white/[.08] bg-black/25 p-4">
      <p className="text-[8px] font-black uppercase tracking-[.12em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-zinc-200">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  body,
  compact = false,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${
        compact
          ? "mt-6 px-5 py-8"
          : "mt-7 px-6 py-12"
      } rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/60 text-center`}
    >
      <p className="text-sm font-black uppercase text-zinc-200">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-zinc-500">
        {body}
      </p>
    </div>
  );
}

function MiniMember({
  member,
}: {
  member: TeamMember;
}) {
  const card = (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <div className="aspect-square bg-[#0b1f3a]">
        {member.photo_url ? (
          <img
            src={
              member.photo_url
            }
            alt={
              member.display_name
            }
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-3xl font-black text-orange-300">
            {member.display_name
              .slice(
                0,
                2,
              )
              .toUpperCase()}
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="truncate text-xs font-black uppercase">
          {
            member.display_name
          }
        </p>

        <p className="mt-1 truncate text-[8px] font-bold uppercase text-zinc-500">
          {member.position ||
            member.role ||
            "Team member"}
        </p>
      </div>
    </div>
  );

  return member.profile_href ? (
    <Link
      href={
        member.profile_href
      }
    >
      {card}
    </Link>
  ) : (
    card
  );
}

function MemberCard({
  member,
  muted = false,
}: {
  member: TeamMember;
  muted?: boolean;
}) {
  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b1f3a]">
        {member.photo_url ? (
          <img
            src={
              member.photo_url
            }
            alt={
              member.display_name
            }
            loading="lazy"
            className={`h-full w-full object-cover ${
              muted
                ? "grayscale"
                : ""
            }`}
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl font-black text-orange-300">
            {member.display_name
              .slice(
                0,
                2,
              )
              .toUpperCase()}
          </div>
        )}

        {member.jersey_number !=
        null ? (
          <span className="absolute left-3 top-3 rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-black text-black">
            #
            {
              member.jersey_number
            }
          </span>
        ) : null}

        {member.is_captain ? (
          <span className="absolute right-3 top-3 rounded-lg border border-white/15 bg-black/65 px-2.5 py-1 text-[8px] font-black uppercase text-white">
            Captain
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-black uppercase">
          {
            member.display_name
          }
        </h3>

        {member.nickname ? (
          <p className="mt-1 text-sm font-bold text-orange-300">
            â€œ
            {
              member.nickname
            }
            â€
          </p>
        ) : null}

        <p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">
          {member.position ||
            member.role ||
            "Team member"}
        </p>
      </div>
    </>
  );

  const classes =
    `overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 transition ${
      member.profile_href
        ? "hover:-translate-y-1 hover:border-orange-400/45"
        : ""
    } ${
      muted
        ? "opacity-70"
        : ""
    }`;

  return member.profile_href ? (
    <Link
      href={
        member.profile_href
      }
      className={
        classes
      }
    >
      {content}
    </Link>
  ) : (
    <article
      className={
        classes
      }
    >
      {content}
    </article>
  );
}

function GameCard({
  game,
}: {
  game: TeamGame;
}) {
  const card = (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 transition hover:border-orange-400/40">
      <div className="flex items-start justify-between gap-4 border-b border-white/[.07] p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
              {game.competition_name ||
                "Team game"}
            </span>

            {game.result ? (
              <ResultPill
                result={
                  game.result
                }
              />
            ) : (
              <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[7px] font-black uppercase text-blue-300">
                Upcoming
              </span>
            )}
          </div>

          <h3 className="mt-3 break-words text-xl font-black uppercase">
            {game.title ||
              `vs ${
                game.opponent_name ||
                "Opponent"
              }`}
          </h3>

          <p className="mt-2 text-[10px] font-bold text-zinc-500">
            {formatDate(
              game.game_date,
              true,
            )}

            {game.venue
              ? ` · ${game.venue}`
              : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-black">
            {score(
              game,
            )}
          </p>

          <p className="mt-1 text-[8px] font-black uppercase text-zinc-500">
            vs{" "}
            {game.opponent_name ||
              "Opponent"}
          </p>
        </div>
      </div>

      {game.game_id ? (
        <div className="px-5 py-3 text-[9px] font-black uppercase tracking-[.12em] text-orange-300">
          Open Match Centre →
        </div>
      ) : (
        <div className="px-5 py-3 text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">
          Team record
        </div>
      )}
    </article>
  );

  return game.game_id ? (
    <Link
      href={`/games/${game.game_id}`}
    >
      {card}
    </Link>
  ) : (
    card
  );
}

function ResultPill({
  result,
}: {
  result: "W" | "L";
}) {
  return (
    <span
      className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[8px] font-black ${
        result ===
        "W"
          ? "bg-emerald-500 text-black"
          : "bg-red-500 text-white"
      }`}
    >
      {result}
    </span>
  );
}

function PerformanceMetric({
  value,
  label,
  tone = "default",
}: {
  value:
    | string
    | number;

  label: string;

  tone?:
    | "default"
    | "green"
    | "red"
    | "orange"
    | "blue";
}) {
  const colors = {
    default:
      "text-white",
    green:
      "text-emerald-300",
    red:
      "text-red-300",
    orange:
      "text-orange-300",
    blue:
      "text-blue-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-5">
      <p
        className={`text-3xl font-black ${colors[tone]}`}
      >
        {value}
      </p>

      <p className="mt-2 text-[8px] font-black uppercase tracking-[.13em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   CANONICAL ACTIVITY COMPONENTS
   ========================================================= */

function ActivityRow({
  activity,
}: {
  activity:
    PublicActivityRecord;
}) {
  const content = (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950 p-4 transition hover:border-orange-400/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-black uppercase">
          {
            activity.title
          }
        </p>

        <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.1em] text-zinc-500">
          {activityLabel(
            activity,
          )}

          {activity.division
            ? ` · ${activity.division}`
            : ""}

          {activity.seasonLabel
            ? ` · ${activity.seasonLabel}`
            : ""}
        </p>
      </div>

      <span className="shrink-0 text-[9px] font-black text-orange-300">
        {activity.gameCount}{" "}
        {activity.gameCount ===
        1
          ? "game"
          : "games"}
      </span>
    </div>
  );

  return activity.href ? (
    <Link
      href={
        activity.href
      }
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function ActivityCard({
  activity,
}: {
  activity:
    PublicActivityRecord;
}) {
  const body = (
    <article className="h-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/90 transition hover:-translate-y-1 hover:border-orange-400/40">
      <div className="border-b border-white/[.07] bg-[#07162b]/80 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-500 px-3 py-1 text-[8px] font-black uppercase tracking-[.1em] text-black">
            {activityLabel(
              activity,
            )}
          </span>

          {activity.seasonLabel ? (
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[8px] font-black uppercase text-zinc-300">
              {
                activity.seasonLabel
              }
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 text-xl font-black uppercase leading-tight">
          {
            activity.title
          }
        </h3>

        {activity.division ? (
          <p className="mt-2 text-[9px] font-black uppercase tracking-[.12em] text-blue-300">
            {
              activity.division
            }
          </p>
        ) : null}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-2">
          <MiniMetric
            value={
              activity.gameCount
            }
            label="Games"
          />

          <MiniMetric
            value={
              activity.wins
            }
            label="Wins"
          />

          <MiniMetric
            value={
              activity.losses
            }
            label="Losses"
          />
        </div>

        {activity.completedGames >
        0 ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[.07] bg-black/25 px-4 py-3">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[.12em] text-zinc-500">
                Points
              </p>

              <p className="mt-1 text-sm font-black">
                {
                  activity.pointsFor
                }{" "}
                –{" "}
                {
                  activity.pointsAgainst
                }
              </p>
            </div>

            <div className="text-right">
              <p className="text-[7px] font-black uppercase tracking-[.12em] text-zinc-500">
                Record
              </p>

              <p className="mt-1 text-sm font-black text-orange-300">
                {
                  activity.wins
                }
                -
                {
                  activity.losses
                }
              </p>
            </div>
          </div>
        ) : null}

        {activity.leaders.length ? (
          <div className="mt-5">
            <p className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-500">
              Stat leaders
            </p>

            <div className="mt-3 space-y-2">
              {activity.leaders
                .slice(
                  0,
                  3,
                )
                .map(
                  (
                    leader,
                    index,
                  ) => (
                    <div
                      key={
                        leader.key
                      }
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/[.035] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black">
                          {index +
                            1}
                          .{" "}
                          {
                            leader.name
                          }
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-black text-orange-300">
                        {leader.pointsPerGame.toFixed(
                          1,
                        )}{" "}
                        PPG
                      </p>
                    </div>
                  ),
                )}
            </div>
          </div>
        ) : null}

        {activity.href ? (
          <p className="mt-5 text-[9px] font-black uppercase tracking-[.12em] text-orange-300">
            Open record →
          </p>
        ) : null}
      </div>
    </article>
  );

  return activity.href ? (
    <Link
      href={
        activity.href
      }
      className="block h-full"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

function CompetitionStatsCard({
  activity,
}: {
  activity: PublicActivityRecord;
}) {
  const boards: Array<{
    title: string;
    label: string;
    players: PublicPlayerRanking[];
    value: (player: PublicPlayerRanking) => number;
    decimal?: boolean;
  }> = [
    {
      title: "Points Per Game",
      label: "PPG",
      players: activity.leaderboards.pointsPerGame,
      value: (player) => player.pointsPerGame,
      decimal: true,
    },
    {
      title: "Total Points Leaders",
      label: "PTS",
      players: activity.leaderboards.totalPoints,
      value: (player) => player.points,
    },
    {
      title: "Assists Per Game",
      label: "APG",
      players: activity.leaderboards.assistsPerGame,
      value: (player) => player.assistsPerGame,
      decimal: true,
    },
    {
      title: "Rebounds Per Game",
      label: "RPG",
      players: activity.leaderboards.reboundsPerGame,
      value: (player) => player.reboundsPerGame,
      decimal: true,
    },
    {
      title: "Steals Per Game",
      label: "SPG",
      players: activity.leaderboards.stealsPerGame,
      value: (player) => player.stealsPerGame,
      decimal: true,
    },
    {
      title: "Blocks Per Game",
      label: "BPG",
      players: activity.leaderboards.blocksPerGame,
      value: (player) => player.blocksPerGame,
      decimal: true,
    },
    {
      title: "3-Point Leaders",
      label: "3PM",
      players: activity.leaderboards.threePointersMade,
      value: (player) => player.threeMade,
    },
    {
      title: "Games Played",
      label: "GP",
      players: activity.leaderboards.gamesPlayed,
      value: (player) => player.gamesPlayed,
    },
  ];

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90">
      <div className="border-b border-white/[.07] bg-[#07162b]/90 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
              {activityLabel(activity)}
            </p>

            <h3 className="mt-2 text-2xl font-black uppercase sm:text-4xl">
              {activity.title}
            </h3>

            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Leaderboards are calculated only from games belonging to this
              competition. Court Takeover statistics do not mix with FACKTS
              Kings or unrelated games.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2">
            <MiniMetric
              value={activity.gameCount}
              label="Games"
            />

            <MiniMetric
              value={activity.leaders.length}
              label="Players"
            />

            <MiniMetric
              value={activity.completedGames}
              label="Finals"
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {activity.leaders.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {boards.map((board) => (
              <StatLeaderboardCard
                key={`${activity.key}-${board.label}`}
                title={board.title}
                label={board.label}
                players={board.players}
                value={board.value}
                decimal={board.decimal}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 px-5 py-8 text-center">
            <p className="text-sm font-black uppercase text-zinc-200">
              No statistics linked yet
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              Games are recorded for this competition, but no usable player
              statistics were resolved for those games.
            </p>
          </div>
        )}

        {activity.href ? (
          <Link
            href={activity.href}
            className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-orange-400/30 bg-orange-500/10 px-5 text-[9px] font-black uppercase tracking-[.13em] text-orange-300 transition hover:border-orange-300 hover:bg-orange-500/15"
          >
            Open {activity.title} →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function StatLeaderboardCard({
  title,
  label,
  players,
  value,
  decimal = false,
}: {
  title: string;
  label: string;
  players: PublicPlayerRanking[];
  value: (player: PublicPlayerRanking) => number;
  decimal?: boolean;
}) {
  /*
   * The historical FACKTS leaderboard cards displayed
   * the top seven. We preserve that behaviour here.
   *
   * The complete player table above still retains every
   * resolved player record.
   */
  const topPlayers = players.slice(0, 7);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#08111f] shadow-lg shadow-black/20">
      <div className="border-b border-white/[.07] bg-black/30 px-4 py-3">
        <p className="text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
          {label}
        </p>

        <h4 className="mt-1 text-sm font-black uppercase leading-tight text-white">
          {title}
        </h4>
      </div>

      <div className="divide-y divide-white/[.06]">
        {topPlayers.length ? (
          topPlayers.map((player, index) => {
            const statValue = value(player);

            const content = (
              <>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/40 text-[10px] font-black text-orange-300 ring-1 ring-white/[.07]">
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black text-white">
                    {player.name}
                  </p>

                  <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.08em] text-zinc-600">
                    {player.gamesPlayed} GP
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-base font-black leading-none text-orange-300">
                    {decimal
                      ? statValue.toFixed(1)
                      : Math.round(statValue)}
                  </p>

                  <p className="mt-1 text-[7px] font-black uppercase text-zinc-600">
                    {label}
                  </p>
                </div>
              </>
            );

            const rowClasses =
              "grid grid-cols-[28px_minmax(0,1fr)_48px] items-center gap-2 px-3 py-2.5 transition hover:bg-white/[.035]";

            return player.profileHref ? (
              <Link
                key={player.key}
                href={player.profileHref}
                className={rowClasses}
              >
                {content}
              </Link>
            ) : (
              <div
                key={player.key}
                className={rowClasses}
              >
                {content}
              </div>
            );
          })
        ) : (
          <div className="px-4 py-7 text-center text-[10px] font-bold uppercase text-zinc-600">
            No data
          </div>
        )}
      </div>
    </section>
  );
}

function MiniMetric({
  value,
  label,
}: {
  value:
    | string
    | number;

  label: string;
}) {
  return (
    <div className="rounded-lg border border-white/[.07] bg-black/25 p-3 text-center">
      <p className="text-lg font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-[.1em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   LEGACY / SUPPORTING PUBLIC CARDS
   ========================================================= */

function CompetitionRow({
  record,
}: {
  record:
    TeamCompetitionRecord;
}) {
  return (
    <Link
      href={
        record.href
      }
      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950 p-4 transition hover:border-orange-400/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-black uppercase">
          {
            record.title
          }
        </p>

        <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.1em] text-zinc-500">
          {record.status ||
            record.division ||
            "Competition record"}
        </p>
      </div>

      <span className="shrink-0 text-[9px] font-black text-orange-300">
        Open →
      </span>
    </Link>
  );
}

function CompetitionCard({
  record,
}: {
  record:
    TeamCompetitionRecord;
}) {
  const recordLabel =
    record.record_type ===
    "event"
      ? "Event Hub"
      : record.record_type ===
          "league"
        ? "League"
        : "Competition";

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0b1f3a]">
        {record.image_url ? (
          <img
            src={
              record.image_url
            }
            alt={
              record.title
            }
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle,rgba(245,130,32,.22),transparent_60%),#0b1f3a] text-4xl font-black text-orange-300">
            FH
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1.5 text-[8px] font-black uppercase text-black">
          {
            recordLabel
          }
        </span>
      </div>

      <div className="p-5">
        <p className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
          {record.start_date
            ? formatDate(
                record.start_date,
              )
            : record.status ||
              "FACKTS record"}
        </p>

        <h3 className="mt-2 text-xl font-black uppercase">
          {
            record.title
          }
        </h3>

        <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">
          {record.summary ||
            "Published competition record"}
        </p>

        {record.final_position ? (
          <p className="mt-3 text-[9px] font-black uppercase text-emerald-300">
            Finish:{" "}
            {
              record.final_position
            }
          </p>
        ) : null}

        <Link
          href={
            record.href
          }
          className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-[.12em] transition hover:border-orange-400/45"
        >
          Open{" "}
          {
            recordLabel
          }
        </Link>
      </div>
    </article>
  );
}

function TrainingCard({
  session,
}: {
  session:
    TrainingSession;
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85">
      {session.image_url ? (
        <div className="aspect-video overflow-hidden">
          <img
            src={
              session.image_url
            }
            alt={
              session.title
            }
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="p-5">
        <p className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
          {formatDate(
            session.session_date,
          )}
        </p>

        <h3 className="mt-2 text-xl font-black uppercase">
          {
            session.title
          }
        </h3>

        <p className="mt-2 text-[9px] font-bold uppercase text-blue-300">
          {session.focus_area ||
            session.venue ||
            "Team development"}
        </p>

        {session.summary ? (
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            {
              session.summary
            }
          </p>
        ) : null}
      </div>
    </article>
  );
}

