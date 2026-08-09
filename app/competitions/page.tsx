import type { Metadata } from "next";
import Link from "next/link";
import {
  loadCompetitionDirectory,
  type CompetitionDirectoryItem,
} from "@/lib/hoops/competitionDirectory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Competitions | FACKTS Hoops",
  description:
    "Explore FACKTS Kings, covered tournaments and complete basketball competition records.",
};

function dateLabel(item: CompetitionDirectoryItem) {
  if (!item.startDate) return item.seasonLabel;
  const start = new Date(`${item.startDate}T12:00:00+03:00`).toLocaleDateString(
    "en-KE",
    { day: "numeric", month: "short", year: "numeric" }
  );
  if (!item.endDate || item.endDate === item.startDate) return start;
  const end = new Date(`${item.endDate}T12:00:00+03:00`).toLocaleDateString(
    "en-KE",
    { day: "numeric", month: "short", year: "numeric" }
  );
  return `${start} – ${end}`;
}

export default async function CompetitionsPage() {
  const records = await loadCompetitionDirectory();
  const series = records.filter((item) => item.recordType === "series");
  const events = records.filter((item) => item.recordType === "event");
  const liveCount = records.filter((item) => item.status === "live").length;

  return (
    <main className="fackts-public-bg min-h-screen overflow-x-clip text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950/60">
        <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-6 md:pb-20 md:pt-16 lg:px-8">
          <span className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300">
            FACKTS competition network
          </span>
          <h1 className="mt-5 max-w-5xl text-4xl font-black uppercase leading-[.92] tracking-[-.035em] sm:text-6xl lg:text-8xl">
            Every competition.
            <br />
            <span className="text-orange-400">One trusted record.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-200 sm:text-base">
            Follow ongoing FACKTS series and completed event archives without mixing seasons, formats or unverified statistics.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#competition-directory" className="rounded-full bg-orange-500 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em] text-black hover:bg-orange-400">
              Explore competitions
            </a>
            <Link href="/book-coverage" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em] hover:border-orange-400">
              Book competition coverage
            </Link>
          </div>
          <div className="mt-9 grid max-w-3xl grid-cols-3 gap-2 sm:gap-3">
            <HeroStat value={String(records.length)} label="Published records" />
            <HeroStat value={String(liveCount)} label="Live series" />
            <HeroStat value={String(events.length)} label="Event hubs" />
          </div>
        </div>
      </section>

      <section id="competition-directory" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading eyebrow="Ongoing series" title="Follow the season as it happens." text="Standings, fixtures, results, player records and playable media stay tied to the correct competition and season." />
        {series.length ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {series.map((item) => <CompetitionCard key={`${item.recordType}-${item.id}`} item={item} />)}
          </div>
        ) : (
          <EmptyState text="No ongoing competition series have been published." />
        )}
      </section>

      <section className="border-y border-white/10 bg-[#07162b]/80">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading eyebrow="Competition archive" title="Completed events remain useful." text="Each Event Hub preserves the schedule, results, standings, people, media, sponsors and organizer in one permanent record." />
          {events.length ? (
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {events.map((item) => <CompetitionCard key={`${item.recordType}-${item.id}`} item={item} compact />)}
            </div>
          ) : (
            <EmptyState text="Published Event Hubs will appear here automatically." />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-orange-400/30 bg-gradient-to-br from-orange-500/20 via-slate-950 to-blue-700/20 p-6 sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">For organizers, clubs and institutions</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-[.98] sm:text-5xl">Your league or tournament can live here next.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">FACKTS combines competition operations, verified statistics, player records, photography, video and reporting.</p>
          <Link href="/book-coverage" className="mt-6 flex w-full justify-center rounded-full bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black sm:inline-flex sm:w-auto">Request competition coverage</Link>
        </div>
      </section>
    </main>
  );
}

function CompetitionCard({ item, compact = false }: { item: CompetitionDirectoryItem; compact?: boolean }) {
  const statusClass = item.status === "live" ? "bg-emerald-400 text-black" : item.status === "upcoming" ? "bg-blue-400 text-black" : "bg-white/15 text-white";
  return (
    <article className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950/85 transition hover:-translate-y-1 hover:border-orange-400/45">
      <div className={`relative overflow-hidden bg-[#0b1f3a] ${compact ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
        <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] ${statusClass}`}>{item.status}</span>
          <span className="rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.1em] text-white">{item.recordType === "event" ? "Event Hub" : item.format}</span>
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">{item.organizer} · {item.seasonLabel}</p>
          <h2 className={`mt-2 font-black uppercase leading-none ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}>{item.name}</h2>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-xs leading-6 text-zinc-400">{item.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[.1em] text-zinc-500">
          <span className="rounded-lg border border-white/10 px-3 py-2">{dateLabel(item)}</span>
          {(item.venue || item.location) ? <span className="rounded-lg border border-white/10 px-3 py-2">{item.venue || item.location}</span> : null}
          <span className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">{item.verificationStatus}</span>
        </div>
        <Link href={item.href} className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-[9px] font-black uppercase tracking-[.12em] text-black transition hover:bg-orange-400">
          {item.recordType === "event" ? "Open Event Hub" : "Open competition hub"}
        </Link>
      </div>
    </article>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-sm sm:p-4"><p className="text-2xl font-black text-orange-300 sm:text-4xl">{value}</p><p className="mt-1 break-words text-[7px] font-black uppercase tracking-[.1em] text-zinc-500 sm:text-[8px]">{label}</p></div>;
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{eyebrow}</p><h2 className="mt-2 max-w-4xl text-3xl font-black uppercase leading-none sm:text-5xl">{title}</h2><p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">{text}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/70 px-6 py-10 text-center text-sm text-zinc-500">{text}</div>;
}
