import Link from "next/link";
import { loadPublicTeamProfiles } from "@/lib/hoops/teamProfiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsPage() {
  const teams = await loadPublicTeamProfiles();

  return (
    <main className="min-h-screen bg-[#F3F6F9]/95 text-[#182230]">
      <section className="relative overflow-hidden bg-[#0B1F3A]/95 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(11,31,58,0.96),rgba(11,31,58,0.76)),url('/images/one-on-one-bg.png')] bg-cover bg-center" />
        <div className="relative mx-auto max-w-[1320px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
            Permanent organization profiles
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            Teams on FACKTS Hoops
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            This directory is for permanent teams and organizations with their own
            roster, games, statistics, training and media. Teams that only took
            part in an event remain inside that Event Hub.
          </p>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <DirectoryMetric value={String(teams.length)} label="Team profiles" />
            <DirectoryMetric value="Permanent" label="Directory standard" />
            <DirectoryMetric value="Event-linked" label="Competition records" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F58220]">
              Team directory
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.025em] text-[#0B1F3A] sm:text-4xl">
              Official team spaces
            </h2>
          </div>
          <Link
            href="/events"
            className="text-sm font-black text-[#0B1F3A] hover:text-[#F58220]"
          >
            Browse event participants →
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <article
              key={team.slug}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#102A4C]">
                {team.cover_image_url ? (
                  <img
                    src={team.cover_image_url}
                    alt={`${team.name} basketball`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full bg-[radial-gradient(circle_at_top_right,rgba(245,130,32,0.35),transparent_38%),linear-gradient(135deg,#102A4C,#071426)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-md bg-[#1F8A5B] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                  Permanent team profile
                </span>
                <div className="absolute bottom-4 left-4 flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-white/20 bg-[#0B1F3A] shadow-xl">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-orange-300">
                        {(team.short_name || team.name).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="text-white">
                    <p className="text-2xl font-black leading-tight">{team.name}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">
                      {team.team_type || "Basketball team"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                  {team.description ||
                    "A permanent basketball team profile connected to FACKTS coverage and statistics."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F3F6F9] p-3">
                  <SmallInfo
                    label="Base"
                    value={[team.city, team.country].filter(Boolean).join(", ") || "Not listed"}
                  />
                  <SmallInfo label="Profile" value="Roster + media" />
                </div>
                <Link
                  href={`/teams/${team.slug}`}
                  className="mt-5 flex w-full items-center justify-center rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#F58220]"
                >
                  Open Team Profile
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F58220]">
            Future client-team spaces
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#0B1F3A]">
            Ready for teams such as ABSA Basketball.
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            A contracted team can receive its own branded page for players,
            rosters, games, team statistics, training coverage and media. Event
            participants are never promoted into this directory automatically.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#071426]/95 text-white">
        <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
              Need a permanent team profile?
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">
              Document your team beyond one tournament.
            </h2>
          </div>
          <Link
            href="/book-coverage"
            className="flex min-h-12 items-center justify-center rounded-lg bg-[#F58220] px-6 py-3 text-sm font-black text-white hover:bg-[#dc6d10]"
          >
            Book Team Coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

function DirectoryMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-[#0B1F3A]">{value}</p>
    </div>
  );
}
