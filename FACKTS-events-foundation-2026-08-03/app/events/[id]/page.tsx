export const revalidate = 60;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type EventRow = {
  id: string;
  title?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  notes?: string | null;
  is_public?: boolean | null;
};

const flagshipId = "fackts-africa-health-checkup-cup-2025";

const partners = [
  ["KMTC Upper Hill", "Principal venue partner; hosted the three-day event"],
  ["Made by Kelzz", "Bag partner and advertising support"],
  ["Wisma Insurance Agency", "Event partner"],
  ["Physical Therapy Services Kenya", "Health and physical-therapy partner"],
  ["Westlands Medical Centre", "Medical partner"],
  ["KIPROD Risk Management Services", "Institutional partner"],
  ["Neuro Kid Warriors", "Community and health partner"],
];

const officials = [
  ["Peter", "Referee"],
  ["Jamal", "Referee"],
  ["Emmanuel", "Referee support"],
  ["Julian", "Table official"],
  ["Kevin Jakait", "Table operations support"],
  ["Thomas Hanss", "Team coordination and scheduling"],
  ["Liam Mwaniki", "Event MC support"],
];

async function getEvent(id: string) {
  if (id === flagshipId) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  const supabase = createClient(url, key);
  const { data } = await supabase.from("fackts_calendar_events").select("*").eq("id", id).eq("is_public", true).maybeSingle();
  return data as EventRow | null;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (id !== flagshipId && !event) notFound();

  if (event) return <StandardEvent event={event} />;

  return (
    <main className="fackts-public-bg min-h-screen text-white">
      <section className="relative min-h-[66vh] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-blue-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />
        <div className="relative mx-auto flex min-h-[66vh] max-w-7xl items-end px-5 py-12 sm:px-6 lg:px-8">
          <div className="max-w-5xl">
            <Link href="/events" className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">← All events</Link>
            <div className="mt-5 flex flex-wrap gap-2"><Tag>Completed</Tag><Tag>2025 case study</Tag><Tag>Men’s & women’s divisions</Tag></div>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-8xl">FACKTS Africa Health Checkup Cup</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-200">A three-day basketball tournament hosted at KMTC Upper Hill, bringing together more than 20 teams with results, rosters, photography, highlights, speeches and interviews documented by FACKTS Africa.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat value="3 days" label="Tournament" />
          <Stat value="20+" label="Teams represented" />
          <Stat value="500+" label="Event photographs" />
          <Stat value="2" label="Divisions" />
        </div>
      </section>

      <Section eyebrow="Event record" title="What FACKTS documented">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["Team rosters and positions", "Fixtures and final team scores", "Men’s and women’s divisions", "Coaches and tournament officials", "Press conference and speeches", "Highlights, interviews and photography"].map((item, index) => <Feature key={item} number={index + 1} text={item} />)}
        </div>
        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-50"><strong>Data availability:</strong> Final team scores were recorded. Individual player statistics were not captured reliably for these historical games and will not be estimated.</div>
      </Section>

      <Section eyebrow="Tournament data" title="Teams, fixtures and results">
        <div className="grid gap-4 lg:grid-cols-3">
          <Coming title="Participating teams" text="Official team names, divisions and temporary event crests are being verified." />
          <Coming title="Day 1–3 results" text="Handwritten result sheets are being transcribed and checked before publication." />
          <Coming title="Standings & winners" text="Standings, knockout progression, champions and awards will appear once verified." />
        </div>
      </Section>

      <Section eyebrow="Event operations" title="Officials and contributors">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {officials.map(([name, role]) => <Person key={name} name={name} role={role} />)}
          <Person name="Samuel Kingori (King Ori)" role="Event organisation and KMTC coordination" />
          <Person name="Lenny Odawa" role="Public-address equipment support" />
          <Person name="Ham Odor / Oras Empire" role="Event order and crowd-management support" />
        </div>
      </Section>

      <Section eyebrow="2025 event partners" title="Partners who made it possible">
        <div className="grid gap-3 md:grid-cols-2">
          {partners.map(([name, role]) => <Person key={name} name={name} role={role} />)}
        </div>
      </Section>

      <Section eyebrow="Media archive" title="The tournament in pictures and video">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Event photography", "Tournament highlight", "Opening speeches", "Interviews & short videos"].map((item) => <Coming key={item} title={item} text="Media will be added after consent and link review." />)}
        </div>
      </Section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-orange-400/35 bg-gradient-to-br from-orange-500/20 via-slate-950 to-blue-700/20 p-7 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Book FACKTS</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase sm:text-5xl">Let us document your tournament from first fixture to final report.</h2>
          <Link href="/book-coverage" className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black">Book event coverage</Link>
        </div>
      </section>
    </main>
  );
}

function StandardEvent({ event }: { event: EventRow }) {
  return <main className="fackts-public-bg min-h-screen px-5 py-12 text-white"><div className="mx-auto max-w-6xl"><Link href="/events" className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">← All events</Link><div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/85"><div className="relative min-h-[320px] bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top">{event.poster_url ? <img src={event.poster_url} alt={event.title || "FACKTS event"} className="absolute inset-0 h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" /><h1 className="absolute bottom-6 left-6 right-6 text-4xl font-black uppercase sm:text-6xl">{event.title}</h1></div><div className="p-6 sm:p-8"><p className="text-sm font-bold text-orange-300">{[event.venue, event.location].filter(Boolean).join(" • ") || "Venue TBA"}</p><p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-300">{event.notes || "Event details will be published here."}</p></div></div></div></main>;
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 lg:px-8"><p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">{eyebrow}</p><h2 className="mt-2 mb-5 text-3xl font-black uppercase sm:text-5xl">{title}</h2>{children}</section>; }
function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-[11px] font-black uppercase text-orange-100">{children}</span>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur"><p className="text-2xl font-black text-orange-300 sm:text-3xl">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p></div>; }
function Feature({ number, text }: { number: number; text: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5"><span className="text-xs font-black text-orange-300">0{number}</span><p className="mt-3 font-black uppercase">{text}</p></div>; }
function Coming({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5"><h3 className="font-black uppercase text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p></div>; }
function Person({ name, role }: { name: string; role: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4"><p className="font-black text-white">{name}</p><p className="mt-1 text-sm text-zinc-400">{role}</p></div>; }
