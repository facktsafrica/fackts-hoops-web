import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadTeamProfileBundle,
  type TeamGame,
} from "@/lib/hoops/teamProfiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function gameScore(game: TeamGame) {
  if (game.team_score == null || game.opponent_score == null) return "—";
  return `${game.team_score} – ${game.opponent_score}`;
}

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await loadTeamProfileBundle(slug);

  if (!bundle) notFound();

  const { profile, roster, games, training, media } = bundle;

  return (
    <main className="min-h-screen bg-[#F3F6F9]/95 text-[#182230]">
      <section className="relative min-h-[430px] overflow-hidden bg-[#071426] text-white sm:min-h-[520px]">
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt={`${profile.name} basketball team`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#0B1F3A]/65 to-[#0B1F3A]/35" />
        <div className="relative mx-auto flex min-h-[430px] max-w-[1320px] flex-col justify-end px-4 py-10 sm:min-h-[520px] sm:px-6 lg:px-8 lg:py-14">
          <Link
            href="/teams"
            className="mb-6 inline-flex w-fit rounded-lg border border-white/20 bg-[#071426]/60 px-3 py-2 text-xs font-black text-white backdrop-blur-md hover:border-orange-300"
          >
            ← All Teams
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-[#0B1F3A] shadow-2xl sm:h-28 sm:w-28">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-orange-300">
                  {(profile.short_name || profile.name).slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
                {profile.team_type || "Basketball team"}
              </p>
              <h1 className="mt-2 text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-6xl">
                {profile.name}
              </h1>
              <p className="mt-3 text-sm font-bold text-slate-300">
                {[profile.city, profile.country].filter(Boolean).join(", ") ||
                  "Location not listed"}
                {profile.founded_year ? ` · Founded ${profile.founded_year}` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric value={String(roster.length)} label="Active roster" />
          <Metric value={String(games.length)} label="Games listed" />
          <Metric value={String(training.length)} label="Training records" />
          <Metric value={String(media.length)} label="Media items" />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1320px] gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <SectionLabel>Team overview</SectionLabel>
          <h2 className="mt-2 text-3xl font-black uppercase text-[#0B1F3A]">
            About {profile.short_name || profile.name}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {profile.description ||
              "This team profile connects its roster, games, statistics, training and media in one permanent basketball record."}
          </p>
        </div>

        <div className="rounded-2xl bg-[#0B1F3A] p-6 text-white sm:p-8">
          <SectionLabel light>Team information</SectionLabel>
          <div className="mt-5 grid gap-4">
            <InfoRow label="Head coach" value={profile.coach_name || "Not listed"} />
            <InfoRow
              label="Location"
              value={[profile.city, profile.country].filter(Boolean).join(", ") || "Not listed"}
            />
            <InfoRow label="Contact" value={profile.contact_email || "Through FACKTS"} />
            <InfoRow label="Website" value={profile.website_url || "Not listed"} />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/95">
        <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <SectionHeading
            eyebrow="Roster"
            title="Players and team staff"
            text="Permanent team members appear here. Event-only participants remain inside their event record."
          />

          {roster.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {roster.map((member) => {
                const content = (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#102A4C]">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.display_name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-4xl font-black text-orange-300">
                          {member.display_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {member.jersey_number != null ? (
                        <span className="absolute left-3 top-3 rounded-md bg-[#F58220] px-2.5 py-1 text-xs font-black text-white">
                          #{member.jersey_number}
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-black text-[#0B1F3A]">
                        {member.display_name}
                      </h3>
                      {member.nickname ? (
                        <p className="mt-1 text-sm font-bold text-[#F58220]">
                          “{member.nickname}”
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        {member.position || member.role || "Team member"}
                      </p>
                    </div>
                  </>
                );

                return member.profile_href ? (
                  <Link
                    key={member.id}
                    href={member.profile_href}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-[#F3F6F9] transition hover:-translate-y-1 hover:border-[#F58220]"
                  >
                    {content}
                  </Link>
                ) : (
                  <article
                    key={member.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-[#F3F6F9]"
                  >
                    {content}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="The team roster is ready to be added." />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <SectionHeading
          eyebrow="Games and statistics"
          title="Team record"
          text="Results remain connected to the team rather than being mixed with unrelated event participants."
        />

        {games.length ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {games.slice(0, 8).map((game) => (
              <article
                key={game.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F58220]">
                      {game.competition_name || game.status || "Team game"}
                    </p>
                    <h3 className="mt-2 truncate text-xl font-black text-[#0B1F3A]">
                      {game.title || `${profile.short_name || profile.name} vs ${game.opponent_name || "Opponent"}`}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(game.game_date)}
                      {game.venue ? ` · ${game.venue}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-2xl font-black text-[#0B1F3A]">
                    {gameScore(game)}
                  </span>
                </div>
                {game.game_id ? (
                  <Link
                    href={`/games/${game.game_id}`}
                    className="mt-4 inline-flex text-xs font-black text-[#0B1F3A] hover:text-[#F58220]"
                  >
                    Open game record →
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="No team games have been published yet." />
        )}
      </section>

      <section className="border-t border-white/10 bg-[#071426]/95 text-white">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-14">
          <div>
            <SectionHeading
              eyebrow="Training"
              title="Team development"
              text="Training sessions, focus areas and team-development media can be published here."
              dark
            />
            {training.length ? (
              <div className="mt-6 grid gap-3">
                {training.slice(0, 4).map((session) => (
                  <article
                    key={session.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">
                      {formatDate(session.session_date)}
                    </p>
                    <h3 className="mt-2 font-black">{session.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {session.focus_area || session.venue || "Training session"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <DarkEmpty text="Training records will appear here." />
            )}
          </div>

          <div>
            <SectionHeading
              eyebrow="Team media"
              title="Stories and coverage"
              text="Team interviews, highlights, announcements and training content stay attached to this profile."
              dark
            />
            {media.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {media.slice(0, 6).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:border-orange-300"
                  >
                    <div className="aspect-video bg-[#102A4C]">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-300">
                        {item.media_type || "Team media"}
                      </p>
                      <h3 className="mt-2 font-black">{item.title}</h3>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <DarkEmpty text="Team media will appear here." />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-3xl font-black text-[#0B1F3A]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function SectionLabel({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`text-[10px] font-black uppercase tracking-[0.18em] ${
        light ? "text-orange-300" : "text-[#F58220]"
      }`}
    >
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F58220]">
        {eyebrow}
      </p>
      <h2
        className={`mt-2 text-2xl font-black uppercase sm:text-4xl ${
          dark ? "text-white" : "text-[#0B1F3A]"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-3 text-sm leading-6 ${dark ? "text-slate-400" : "text-slate-600"}`}>
        {text}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-500">
      {text}
    </div>
  );
}

function DarkEmpty({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
      {text}
    </div>
  );
}
