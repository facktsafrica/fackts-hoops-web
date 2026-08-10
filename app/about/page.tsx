import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About FACKTS Hoops",
  description:
    "Learn how FACKTS Hoops connects basketball competition, statistics, player and team records, and watchable media.",
};

const platformPillars = [
  {
    number: "01",
    title: "Competition",
    text: "Tournament homes, schedules, results, standings and match centres that keep every competition easy to follow.",
  },
  {
    number: "02",
    title: "Statistics",
    text: "Player and team performance records that turn a game into useful basketball intelligence.",
  },
  {
    number: "03",
    title: "Profiles",
    text: "Permanent player and team pages that build identity, history and a credible body of work over time.",
  },
  {
    number: "04",
    title: "Media",
    text: "Full games, highlights, interviews and event stories connected to the people and competitions they belong to.",
  },
];

const reasons = [
  {
    title: "Visibility",
    text: "Players, teams and organizers deserve work that remains findable after the final whistle.",
  },
  {
    title: "Opportunity",
    text: "Reliable records and media make it easier for talent, events and basketball communities to be discovered.",
  },
  {
    title: "Continuity",
    text: "Every result, profile and video should add to a connected history instead of disappearing into a social feed.",
  },
];

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F8] text-[#172033]">
      <section className="relative isolate overflow-hidden bg-[#07182E] text-white">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/images/HOME%20PAGE%20BACKGROUND.png')" }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(7,24,46,0.98)_0%,rgba(7,24,46,0.92)_50%,rgba(7,24,46,0.58)_100%)]" />
        <div className="absolute -right-24 top-4 -z-10 h-80 w-80 rounded-full bg-[#F58220]/20 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-8 lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#F8A65D]">
              About FACKTS Hoops
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[0.94] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Basketball,
              <span className="block text-[#F58220]">documented properly.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              FACKTS Hoops is a basketball competition, data and media platform.
              We help organizers run visible events, give players and teams
              permanent records, and keep the game connected long after the
              final whistle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/competitions"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#F58220] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-[#07182E] hover:bg-[#ff9a43]"
              >
                Explore Competitions
                <ArrowIcon />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-white hover:border-[#F58220] hover:bg-white/15"
              >
                Contact Us
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F8A65D]">
                  The platform
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                  One connected basketball record
                </h2>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F58220] text-sm font-black text-[#07182E]">
                FH
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-5">
              {platformPillars.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[10px] font-black text-[#F8A65D]">{pillar.number}</p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.05em] text-white">
                    {pillar.title}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E56F0E]">
                What FACKTS does
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-[#0B1F3A] sm:text-5xl">
                From one game to a lasting record.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                The platform connects every part of the basketball story. A
                result can lead to a match centre, player performance, team
                record, competition standing and watchable media without
                sending the audience to five different places.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {platformPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-[1.5rem] border border-slate-200 bg-[#F8FAFC] p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[11px] font-black text-[#E56F0E]">{pillar.number}</p>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F58220]" />
                  </div>
                  <h3 className="mt-8 text-xl font-black uppercase tracking-[-0.02em] text-[#0B1F3A]">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-4 lg:grid-cols-3">
          {reasons.map((reason) => (
            <article key={reason.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E56F0E]">
                Why it matters
              </p>
              <h2 className="mt-4 text-2xl font-black uppercase tracking-[-0.03em] text-[#0B1F3A]">
                {reason.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{reason.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-6 rounded-[1.75rem] bg-[#0B1F3A] p-7 text-white sm:p-9 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F8A65D]">
              Work with FACKTS
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-4xl">
              Put your next tournament on the record.
            </h2>
          </div>
          <Link
            href="/book-coverage"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-[#F58220] px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#07182E] hover:bg-[#ff9a43]"
          >
            Book Tournament Coverage
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </main>
  );
}
