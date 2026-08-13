import Link from "next/link";
import { notFound } from "next/navigation";
import TeamActions from "./TeamActions";
import GameMedia, { type GameMediaItem } from "@/app/games/[id]/GameMedia";
import {
  loadTeamProfileBundle,
  type TeamCompetitionRecord,
  type TeamGame,
  type TeamMember,
  type TrainingSession,
} from "@/lib/hoops/teamProfiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamTab = "overview" | "roster" | "results" | "statistics" | "competitions" | "events" | "training" | "media";

const tabs: Array<{ key: TeamTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "roster", label: "Roster" },
  { key: "results", label: "Results" },
  { key: "statistics", label: "Statistics" },
  { key: "competitions", label: "Competitions" },
  { key: "events", label: "Events" },
  { key: "training", label: "Training" },
  { key: "media", label: "Media" },
];

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function safeColor(value?: string | null, fallback = "#F58220") {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
}

function score(game: TeamGame) {
  if (game.team_score == null || game.opponent_score == null) return "–";
  return `${game.team_score}–${game.opponent_score}`;
}

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const bundle = await loadTeamProfileBundle(slug);
  if (!bundle) notFound();

  const {
    profile,
    roster,
    games,
    training,
    media,
    competitionRecords,
    performance,
    canClaim,
  } = bundle;
  const requestedTab = String(query.tab || "overview") as TeamTab;
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : "overview";
  const verified = profile.verification_status === "verified";
  const activeRoster = roster.filter((member) => member.status !== "alumni");
  const alumni = roster.filter((member) => member.status === "alumni");
  const completed = games.filter((game) => game.result);
  const upcoming = games.filter((game) => !game.result);
  const competitions = competitionRecords.filter((record) => record.record_type === "competition");
  const events = competitionRecords.filter((record) => record.record_type === "event");
  const mediaItems: GameMediaItem[] = media.map((item) => ({
    id: item.id,
    title: item.title,
    mediaType: item.media_type || "Team media",
    url: item.url,
    thumbnailUrl: item.thumbnail_url || "",
    rightsStatus: item.rights_status || undefined,
  }));

  const tabHref = (tab: TeamTab) => `/teams/${profile.slug}?tab=${tab}`;

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{ backgroundImage: "linear-gradient(rgba(2,6,23,.80),rgba(2,6,23,.97)),url('/images/one-on-one-bg.png')" }}
    >
      <section className="relative min-h-[500px] overflow-hidden border-b border-white/10 bg-[#050b16] sm:min-h-[600px]">
        {profile.cover_image_url ? <img src={profile.cover_image_url} alt={`${profile.name} basketball team`} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b16] via-[#07162b]/80 to-[#07162b]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(249,115,22,.20),transparent_32%)]" />
        <div className="relative mx-auto flex min-h-[500px] max-w-7xl flex-col justify-between px-4 py-8 sm:min-h-[600px] sm:px-6 sm:py-10 lg:px-8">
          <Link href="/teams" className="inline-flex w-fit rounded-xl border border-white/15 bg-black/45 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] backdrop-blur transition hover:border-orange-400/60">← All teams</Link>

          <div className="pb-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
                <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#0b1f3a] shadow-2xl sm:h-32 sm:w-32">
                  {profile.logo_url ? <img src={profile.logo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-3xl font-black text-orange-300">{(profile.short_name || profile.name).slice(0, 2).toUpperCase()}</span>}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] ${verified ? "border-emerald-300/35 bg-emerald-500/20 text-emerald-200" : "border-white/15 bg-black/45 text-zinc-300"}`}>{verified ? "✓ Verified team" : "Team profile"}</span>
                    <span className="rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-orange-200">{profile.team_type?.replace(/_/g, " ") || "Basketball team"}</span>
                  </div>
                  <h1 className="mt-3 break-words text-4xl font-black uppercase leading-[.9] tracking-[-.04em] sm:text-6xl lg:text-7xl">{profile.name}</h1>
                  <p className="mt-3 max-w-3xl text-sm font-bold text-zinc-300 sm:text-base">{profile.tagline || "A permanent FACKTS Hoops team record."}</p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[.13em] text-zinc-400">{[profile.city, profile.country].filter(Boolean).join(", ") || "Location not listed"}{profile.founded_year ? ` · Founded ${profile.founded_year}` : ""}{profile.current_competition ? ` · ${profile.current_competition}` : ""}</p>
                </div>
              </div>

              <TeamActions teamId={profile.id} teamName={profile.name} teamSlug={profile.slug} claimStatus={profile.claim_status || "unclaimed"} contactEmail={profile.contact_email || ""} canClaim={canClaim} />
            </div>

            <div className="mt-7 flex items-center gap-2">
              <span className="h-1.5 w-16 rounded-full" style={{ backgroundColor: safeColor(profile.primary_color, "#0B1F3A") }} />
              <span className="h-1.5 w-10 rounded-full" style={{ backgroundColor: safeColor(profile.secondary_color) }} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#07162b]/95">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-4 sm:px-6 lg:grid-cols-7 lg:px-8">
          <TopMetric value={String(activeRoster.length)} label="Active roster" />
          <TopMetric value={String(games.length)} label="Games" />
          <TopMetric value={String(competitions.length)} label="Competitions" />
          <TopMetric value={`${Math.round(performance.winPercentage)}%`} label="Win rate" />
          <TopMetric value={String(training.length)} label="Training" />
          <TopMetric value={String(media.length)} label="Media" />
          <TopMetric value={performance.currentStreak} label="Current streak" />
        </div>
      </section>

      <nav className="sticky top-[69px] z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {tabs.map((tab) => <Link key={tab.key} href={tabHref(tab.key)} scroll={false} className={`shrink-0 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] transition ${activeTab === tab.key ? "bg-orange-500 text-black" : "border border-white/10 bg-white/[.03] text-zinc-400 hover:border-orange-400/45 hover:text-white"}`}>{tab.label}</Link>)}
        </div>
      </nav>

      {activeTab === "overview" ? (
        <>
          <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-16">
            <article className="rounded-[1.8rem] border border-white/10 bg-slate-950/85 p-6 sm:p-8">
              <SectionHeading eyebrow="Team overview" title={`About ${profile.short_name || profile.name}`} />
              <p className="mt-5 text-sm leading-7 text-zinc-300 sm:text-base">{profile.description || "This permanent team profile connects its roster, games, statistics, events, training and media in one verified basketball record."}</p>
              {profile.organization_name && profile.organization_name !== profile.name ? <p className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-xs leading-5 text-blue-200">Organization: <strong>{profile.organization_name}</strong></p> : null}
            </article>

            <article className="rounded-[1.8rem] border border-white/10 bg-[#07162b]/95 p-6 sm:p-8">
              <SectionHeading eyebrow="Team information" title="People and contact" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Head coach" value={profile.coach_name || "Not listed"} />
                <Info label="Assistant coach" value={profile.assistant_coach_name || "Not listed"} />
                <Info label={profile.manager_title || "Team manager"} value={profile.manager_name || "Not listed"} />
                <Info label="Division" value={[profile.division, profile.age_category].filter(Boolean).join(" · ") || "Not listed"} />
                <Info label="Public contact" value={profile.contact_email || "Through FACKTS"} />
                <Info label="Website" value={profile.website_url || "Not listed"} />
              </div>
            </article>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
            <div className="flex items-end justify-between gap-4">
              <SectionHeading eyebrow="Current form" title="Latest team record" />
              <Link href={tabHref("results")} className="shrink-0 text-[9px] font-black uppercase tracking-[.12em] text-orange-300">All results →</Link>
            </div>
            {games.length ? <div className="mt-6 grid gap-4 lg:grid-cols-3">{games.slice(0, 3).map((game) => <GameCard key={game.id} game={game} />)}</div> : <EmptyState title="No team games published" body="Verified fixtures and results will appear here when connected by Teams Admin." />}
          </section>

          <section className="border-y border-white/10 bg-[#07162b]/80">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
              <div>
                <div className="flex items-end justify-between gap-3"><SectionHeading eyebrow="Roster" title="Team members" /><Link href={tabHref("roster")} className="shrink-0 text-[9px] font-black uppercase text-orange-300">Full roster →</Link></div>
                {activeRoster.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{activeRoster.slice(0, 6).map((member) => <MiniMember key={member.id} member={member} />)}</div> : <EmptyState title="Roster coming soon" body="Permanent team members will appear after publication." compact />}
              </div>
              <div>
                <div className="flex items-end justify-between gap-3"><SectionHeading eyebrow="Competition history" title="Competition record" /><Link href={tabHref("competitions")} className="shrink-0 text-[9px] font-black uppercase text-orange-300">All competitions →</Link></div>
                {competitions.length ? <div className="mt-6 grid gap-3">{competitions.slice(0, 3).map((record) => <CompetitionRow key={record.id} record={record} />)}</div> : <EmptyState title="No competition history linked" body="A competition appears here only when this permanent team actually participated or organized it." compact />}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "roster" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Official roster" title="Players and team staff" text="Members are linked to their public player profiles where available. Event-only entrants are not automatically added." />
          {activeRoster.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{activeRoster.map((member) => <MemberCard key={member.id} member={member} />)}</div> : <EmptyState title="Roster ready to be published" body="Teams Admin can link official players, guest hoopers and team staff without duplicating their profiles." />}
          {alumni.length ? <div className="mt-12"><SectionHeading eyebrow="Team history" title="Alumni" /><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{alumni.map((member) => <MemberCard key={member.id} member={member} muted />)}</div></div> : null}
        </section>
      ) : null}

      {activeTab === "results" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Fixtures and results" title="Team game record" text="Every linked game can open its Match Centre for the score, rosters, box score, media and downloadable report." />
          {completed.length ? <div className="mt-7 grid gap-4 lg:grid-cols-2">{completed.map((game) => <GameCard key={game.id} game={game} />)}</div> : <EmptyState title="No completed results" body="Final scores will appear here when verified or linked from the Games section." />}
          {upcoming.length ? <div className="mt-12"><SectionHeading eyebrow="Next up" title="Upcoming fixtures" /><div className="mt-6 grid gap-4 lg:grid-cols-2">{upcoming.map((game) => <GameCard key={game.id} game={game} />)}</div></div> : null}
        </section>
      ) : null}

      {activeTab === "statistics" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Verified team performance" title="Statistics" text="These figures are calculated only from connected games that contain both final scores. No missing result is treated as a win or loss." />
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <PerformanceMetric value={performance.played} label="Played" />
            <PerformanceMetric value={performance.wins} label="Wins" tone="green" />
            <PerformanceMetric value={performance.losses} label="Losses" tone="red" />
            <PerformanceMetric value={`${performance.winPercentage.toFixed(1)}%`} label="Win rate" tone="orange" />
            <PerformanceMetric value={performance.currentStreak} label="Streak" />
            <PerformanceMetric value={performance.pointsFor} label="Points for" tone="blue" />
            <PerformanceMetric value={performance.pointsAgainst} label="Points against" />
            <PerformanceMetric value={performance.averagePoints.toFixed(1)} label="Points per game" tone="orange" />
            <PerformanceMetric value={performance.averageAllowed.toFixed(1)} label="Allowed per game" />
            <PerformanceMetric value={`${performance.pointDifference > 0 ? "+" : ""}${performance.pointDifference}`} label="Point difference" tone={performance.pointDifference >= 0 ? "green" : "red"} />
            <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-5"><p className="text-[9px] font-black uppercase tracking-[.13em] text-zinc-600">Last five</p><div className="mt-4 flex flex-wrap gap-1.5">{performance.lastFive.length ? performance.lastFive.map((result, index) => <ResultPill key={`${result}-${index}`} result={result} />) : <span className="text-2xl font-black text-zinc-600">—</span>}</div></div>
          </div>
          {!performance.played ? <EmptyState title="Statistics need final scores" body="Link completed Match Centres or record verified team results to activate this dashboard." /> : null}
        </section>
      ) : null}

      {activeTab === "competitions" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Permanent competition record" title="Competitions & leaderboards" text="Season competitions, standings and leaderboards live here. FACKTS Kings is a competition—not a one-off Event Hub." />
          {competitions.length ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{competitions.map((record) => <CompetitionCard key={record.id} record={record} />)}</div> : <EmptyState title="No competitions linked" body="Competition participation appears here when it is connected to this permanent team." />}
          <Link href="/competitions/fackts-kings#standings" className="mt-7 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black">Open FACKTS Kings leaderboard</Link>
        </section>
      ) : null}

      {activeTab === "events" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="One-off coverage" title="Events" text="Tournaments, commissioned coverage and other one-off Event Hubs stay separate from permanent competitions and season standings." />
          {events.length ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((record) => <CompetitionCard key={record.id} record={record} />)}</div> : <EmptyState title="No events linked" body="Verified Event Hubs connected to this team will appear here." />}
        </section>
      ) : null}

      {activeTab === "training" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Team development" title="Training record" text="Publish approved sessions, focus areas, venues and development updates for players, supporters and team stakeholders." />
          {training.length ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{training.map((session) => <TrainingCard key={session.id} session={session} />)}</div> : <EmptyState title="Training updates coming soon" body="Approved team-development sessions will appear here after publication." />}
        </section>
      ) : null}

      {activeTab === "media" ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Team coverage" title="Media" text="Highlights, interviews, full games and training videos play inside the profile when the source platform permits embedding." />
          <div className="mt-7"><GameMedia items={mediaItems} emptyTitle="Team media coming soon" emptyText="Approved highlights, interviews, full games and training content will appear here after publication." /></div>
        </section>
      ) : null}

      <section className="border-t border-white/10 bg-[#07162b]/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Build your team record</p><h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">Players, games and visibility—connected.</h2></div>
          <Link href="/book-coverage" className="shrink-0 rounded-xl bg-orange-500 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-black">Book team coverage</Link>
        </div>
      </section>
    </main>
  );
}

function TopMetric({ value, label }: { value: string; label: string }) { return <div className="min-w-0 rounded-xl border border-white/[.07] bg-black/25 px-3 py-3 text-center"><p className="truncate text-xl font-black text-white">{value}</p><p className="mt-1 truncate text-[7px] font-black uppercase tracking-[.1em] text-zinc-600">{label}</p></div>; }
function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) { return <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">{eyebrow}</p><h2 className="mt-2 break-words text-2xl font-black uppercase tracking-tight sm:text-4xl">{title}</h2>{text ? <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{text}</p> : null}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/[.08] bg-black/25 p-4"><p className="text-[8px] font-black uppercase tracking-[.12em] text-zinc-600">{label}</p><p className="mt-2 break-words text-sm font-black text-zinc-200">{value}</p></div>; }
function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) { return <div className={`${compact ? "mt-6 px-5 py-8" : "mt-7 px-6 py-12"} rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/60 text-center`}><p className="text-sm font-black uppercase text-zinc-200">{title}</p><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-zinc-500">{body}</p></div>; }

function MiniMember({ member }: { member: TeamMember }) { const card = <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950"><div className="aspect-square bg-[#0b1f3a]">{member.photo_url ? <img src={member.photo_url} alt={member.display_name} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl font-black text-orange-300">{member.display_name.slice(0, 2).toUpperCase()}</div>}</div><div className="p-3"><p className="truncate text-xs font-black uppercase">{member.display_name}</p><p className="mt-1 truncate text-[8px] font-bold uppercase text-zinc-600">{member.position || member.role || "Team member"}</p></div></div>; return member.profile_href ? <Link href={member.profile_href}>{card}</Link> : card; }

function MemberCard({ member, muted = false }: { member: TeamMember; muted?: boolean }) { const content = <><div className="relative aspect-[4/3] overflow-hidden bg-[#0b1f3a]">{member.photo_url ? <img src={member.photo_url} alt={member.display_name} loading="lazy" className={`h-full w-full object-cover ${muted ? "grayscale" : ""}`} /> : <div className="grid h-full place-items-center text-4xl font-black text-orange-300">{member.display_name.slice(0, 2).toUpperCase()}</div>}{member.jersey_number != null ? <span className="absolute left-3 top-3 rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-black text-black">#{member.jersey_number}</span> : null}{member.is_captain ? <span className="absolute right-3 top-3 rounded-lg border border-white/15 bg-black/65 px-2.5 py-1 text-[8px] font-black uppercase text-white">Captain</span> : null}</div><div className="p-4"><h3 className="text-lg font-black uppercase">{member.display_name}</h3>{member.nickname ? <p className="mt-1 text-sm font-bold text-orange-300">“{member.nickname}”</p> : null}<p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-zinc-600">{member.position || member.role || "Team member"}</p></div></>; const classes=`overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 transition ${member.profile_href ? "hover:-translate-y-1 hover:border-orange-400/45" : ""} ${muted ? "opacity-70" : ""}`; return member.profile_href ? <Link href={member.profile_href} className={classes}>{content}</Link> : <article className={classes}>{content}</article>; }

function GameCard({ game }: { game: TeamGame }) { const card = <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 transition hover:border-orange-400/40"><div className="flex items-start justify-between gap-4 border-b border-white/[.07] p-5"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">{game.competition_name || "Team game"}</span>{game.result ? <ResultPill result={game.result} /> : <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[7px] font-black uppercase text-blue-300">Upcoming</span>}</div><h3 className="mt-3 break-words text-xl font-black uppercase">{game.title || `vs ${game.opponent_name || "Opponent"}`}</h3><p className="mt-2 text-[10px] font-bold text-zinc-500">{formatDate(game.game_date, true)}{game.venue ? ` · ${game.venue}` : ""}</p></div><div className="shrink-0 text-right"><p className="text-3xl font-black">{score(game)}</p><p className="mt-1 text-[8px] font-black uppercase text-zinc-600">vs {game.opponent_name || "Opponent"}</p></div></div>{game.game_id ? <div className="px-5 py-3 text-[9px] font-black uppercase tracking-[.12em] text-orange-300">Open Match Centre →</div> : <div className="px-5 py-3 text-[9px] font-black uppercase tracking-[.12em] text-zinc-600">Team record</div>}</article>; return game.game_id ? <Link href={`/games/${game.game_id}`}>{card}</Link> : card; }

function ResultPill({ result }: { result: "W" | "L" }) { return <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[8px] font-black ${result === "W" ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}>{result}</span>; }
function PerformanceMetric({ value, label, tone = "default" }: { value: string | number; label: string; tone?: "default" | "green" | "red" | "orange" | "blue" }) { const colors={default:"text-white",green:"text-emerald-300",red:"text-red-300",orange:"text-orange-300",blue:"text-blue-300"}; return <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-5"><p className={`text-3xl font-black ${colors[tone]}`}>{value}</p><p className="mt-2 text-[8px] font-black uppercase tracking-[.13em] text-zinc-600">{label}</p></div>; }

function CompetitionRow({ record }: { record: TeamCompetitionRecord }) { return <Link href={record.href} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950 p-4 transition hover:border-orange-400/40"><div className="min-w-0"><p className="truncate text-sm font-black uppercase">{record.title}</p><p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.1em] text-zinc-600">{record.status || record.division || "Competition record"}</p></div><span className="shrink-0 text-[9px] font-black text-orange-300">Open →</span></Link>; }
function CompetitionCard({ record }: { record: TeamCompetitionRecord }) { return <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85"><div className="relative aspect-[16/10] overflow-hidden bg-[#0b1f3a]">{record.image_url ? <img src={record.image_url} alt={record.title} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="grid h-full place-items-center bg-[radial-gradient(circle,rgba(245,130,32,.22),transparent_60%),#0b1f3a] text-4xl font-black text-orange-300">FH</div>}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"/><span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1.5 text-[8px] font-black uppercase text-black">{record.record_type === "event" ? "Event Hub" : "Competition"}</span></div><div className="p-5"><p className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">{record.start_date ? formatDate(record.start_date) : record.status || "FACKTS record"}</p><h3 className="mt-2 text-xl font-black uppercase">{record.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">{record.summary || "Published competition record"}</p>{record.final_position ? <p className="mt-3 text-[9px] font-black uppercase text-emerald-300">Finish: {record.final_position}</p> : null}<Link href={record.href} className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-[.12em] transition hover:border-orange-400/45">{record.record_type === "event" ? "Open Event Hub" : "Open Competition"}</Link></div></article>; }
function TrainingCard({ session }: { session: TrainingSession }) { return <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85">{session.image_url ? <div className="aspect-video overflow-hidden"><img src={session.image_url} alt={session.title} loading="lazy" className="h-full w-full object-cover" /></div> : null}<div className="p-5"><p className="text-[8px] font-black uppercase tracking-[.14em] text-orange-300">{formatDate(session.session_date)}</p><h3 className="mt-2 text-xl font-black uppercase">{session.title}</h3><p className="mt-2 text-[9px] font-bold uppercase text-blue-300">{session.focus_area || session.venue || "Team development"}</p>{session.summary ? <p className="mt-3 text-xs leading-5 text-zinc-500">{session.summary}</p> : null}</div></article>; }
