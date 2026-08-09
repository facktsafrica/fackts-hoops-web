import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCompetitionBySlug } from "@/lib/hoops/competitionDirectory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const competition = await loadCompetitionBySlug(slug);
  if (!competition) return { title: "Competition not found | FACKTS Hoops" };
  return {
    title: `${competition.name} | FACKTS Hoops`,
    description: competition.summary,
  };
}

export default async function CompetitionProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const competition = await loadCompetitionBySlug(slug);
  if (!competition) notFound();

  return (
    <main className="fackts-public-bg min-h-screen overflow-x-clip text-white">
      <section className="relative min-h-[520px] overflow-hidden border-b border-white/10">
        <img src={competition.imageUrl} alt={`${competition.name} basketball competition`} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-[#0b1f3a]/55" />
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-end px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[.12em]">
              <span className="rounded-full bg-orange-500 px-3 py-2 text-black">{competition.status}</span>
              <span className="rounded-full border border-white/20 bg-black/50 px-3 py-2">{competition.format}</span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-emerald-300">{competition.verificationStatus}</span>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{competition.organizer} · {competition.seasonLabel}</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-[.92] tracking-[-.035em] sm:text-6xl lg:text-8xl">{competition.name}</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-200 sm:text-base">{competition.summary}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/games" className="rounded-full bg-orange-500 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em] text-black">Browse match centres</Link>
              <Link href="/competitions" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em]">All competitions</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <article className="rounded-[1.7rem] border border-white/10 bg-slate-950/80 p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Competition record</p>
            <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">One identity across every season.</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-400">This permanent competition profile connects scheduled games, verified results, participating players, teams, media and reporting. Season filters prevent old and current statistics from being combined.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Info label="Current season" value={competition.seasonLabel} />
              <Info label="Format" value={competition.format} />
              <Info label="Venue" value={competition.venue || "Multiple venues"} />
              <Info label="Location" value={competition.location || "Location pending"} />
            </div>
          </article>

          <aside className="rounded-[1.7rem] border border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-slate-950 to-blue-700/15 p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Explore the evidence</p>
            <div className="mt-5 grid gap-3">
              <JourneyLink href="/games" title="Match Centres" text="Scores, rosters, box scores and video." />
              <JourneyLink href="/players" title="Players" text="Verified profiles and competition history." />
              <JourneyLink href="/teams" title="Teams" text="Permanent team identities and results." />
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#07162b]/90">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Need this system for your competition?</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-none sm:text-5xl">FACKTS can build the verified digital record.</h2>
          <Link href="/book-coverage" className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black">Book competition coverage</Link>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/35 p-4"><p className="text-[8px] font-black uppercase tracking-[.12em] text-zinc-600">{label}</p><p className="mt-2 text-sm font-black uppercase text-white">{value}</p></div>;
}

function JourneyLink({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link href={href} className="rounded-xl border border-white/10 bg-black/35 p-4 transition hover:border-orange-400/45"><span className="text-sm font-black uppercase">{title}</span><span className="mt-1 block text-xs leading-5 text-zinc-500">{text}</span></Link>;
}
