export const revalidate = 60;

import Link from "next/link";
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
  is_active?: boolean | null;
};

const flagship = {
  id: "fackts-africa-health-checkup-cup-2025",
  title: "FACKTS Africa Health Checkup Cup 2025",
  organiser: "FACKTS Africa",
  date: "2025",
  venue: "KMTC Upper Hill",
  poster_url: "",
  status: "Completed",
  teams: "20+ teams",
  games: "Three-day tournament",
  coverage: ["Results", "Rosters", "Photography", "Highlights", "Interviews"],
};

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function loadEvents() {
  const supabase = supabaseClient();
  if (!supabase) return [] as EventRow[];

  const { data, error } = await supabase
    .from("fackts_calendar_events")
    .select("*")
    .eq("is_public", true)
    .order("event_date", { ascending: false });

  if (error) return [] as EventRow[];
  return (data ?? []) as EventRow[];
}

function eventState(event: EventRow) {
  if (event.is_active === false) return "Completed";
  if (!event.event_date) return "Upcoming";

  const now = Date.now();
  const start = new Date(event.event_date).getTime();
  const end = new Date(event.end_date || event.event_date).getTime();
  if (Number.isFinite(end) && end < now) return "Completed";
  if (Number.isFinite(start) && start <= now && end >= now) return "Live";
  return "Upcoming";
}

function formatDate(start?: string | null, end?: string | null) {
  if (!start) return "Date TBA";
  const first = new Date(start);
  if (Number.isNaN(first.getTime())) return "Date TBA";
  const label = first.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return label;
  const last = new Date(end);
  return `${label} – ${last.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  })}`;
}

function badge(status: string) {
  if (status === "Live") return "border-red-400/50 bg-red-500/20 text-red-100";
  if (status === "Completed") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
  return "border-orange-400/50 bg-orange-500/15 text-orange-100";
}

export default async function EventsPage() {
  const events = await loadEvents();
  const groups = ["Live", "Upcoming", "Completed"].map((status) => ({
    status,
    events: events.filter((event) => eventState(event) === status),
  }));

  return (
    <main className="fackts-public-bg min-h-screen text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950/65 backdrop-blur-sm">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">
          <span className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            Events by FACKTS
          </span>
          <h1 className="mt-4 max-w-5xl text-4xl font-black uppercase leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
            Every tournament. One complete story.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-200 sm:text-base">
            Basketball statistics, tournament operations, photography, video,
            interviews and final event reporting—built into one shareable event page.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/book-coverage" className="rounded-full bg-orange-500 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black hover:bg-orange-400">
              Book Event Coverage
            </Link>
            <a href="#covered-events" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:border-orange-400/70">
              View Covered Events
            </a>
          </div>
        </div>
      </section>

      <section id="covered-events" className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Flagship case study</p>
          <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">FACKTS Africa Health Checkup Cup</h2>
        </div>
        <FlagshipCard />
      </section>

      {groups.map((group) =>
        group.events.length ? (
          <section key={group.status} className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Tournament archive</p>
                <h2 className="mt-2 text-3xl font-black uppercase">{group.status} events</h2>
              </div>
              <span className="text-sm font-bold text-zinc-400">{group.events.length}</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {group.events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          </section>
        ) : null
      )}

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div
          className="overflow-hidden rounded-[2rem] border border-orange-400/30 bg-gradient-to-br from-orange-500/20 via-slate-950/90 to-blue-700/20 sm:p-10"
          style={{ padding: "clamp(1.5rem, 6vw, 2.5rem)" }}
        >
          <p className="text-[11px] font-black uppercase leading-tight tracking-[0.2em] text-orange-300 sm:text-xs sm:tracking-[0.24em]">
            Bring FACKTS courtside
          </p>
          <h2
            className="mt-3 max-w-3xl font-black uppercase"
            style={{ fontSize: "clamp(1.55rem, 7vw, 3rem)", lineHeight: 1.05 }}
          >
            Your next basketball event deserves a complete record.
          </h2>
          <Link
            href="/book-coverage"
            className="mt-6 flex w-full items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-black hover:bg-orange-400 sm:inline-flex sm:w-auto sm:px-6 sm:tracking-[0.12em]"
          >
            Request coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

function FlagshipCard() {
  return (
    <Link href={`/events/${flagship.id}`} className="group grid overflow-hidden rounded-[2rem] border border-orange-400/30 bg-slate-950/85 shadow-2xl shadow-black/40 backdrop-blur-md lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative min-h-[300px] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.4),transparent_48%),linear-gradient(145deg,#07142d,#020617)]">
        <div className="absolute inset-0 bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top opacity-45 transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${badge(flagship.status)}`}>{flagship.status}</span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-orange-300">Three days • Upper Hill</p>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <h3 className="text-3xl font-black uppercase leading-none sm:text-5xl">{flagship.title}</h3>
        <p className="mt-4 text-sm leading-7 text-zinc-300">A large-scale men’s and women’s basketball tournament hosted at KMTC Upper Hill, documented through rosters, team results, photography, speeches, interviews and event highlights.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Info label="Teams" value={flagship.teams} />
          <Info label="Format" value={flagship.games} />
          <Info label="Venue" value={flagship.venue} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {flagship.coverage.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-zinc-200">{item}</span>)}
        </div>
        <span className="mt-7 inline-flex rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black">View event case study</span>
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const status = eventState(event);
  return (
    <Link href={`/events/${event.id}`} className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/85 backdrop-blur-md hover:border-orange-400/60">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        {event.poster_url ? <img src={event.poster_url} alt={event.title || "FACKTS event"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top opacity-55" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-black uppercase ${badge(status)}`}>{status}</span>
      </div>
      <div className="p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">{event.event_type?.replaceAll("_", " ") || "Basketball event"}</p>
        <h3 className="mt-2 text-2xl font-black uppercase leading-tight">{event.title || "Untitled event"}</h3>
        <p className="mt-4 text-sm font-bold text-zinc-200">{formatDate(event.event_date, event.end_date)}</p>
        <p className="mt-1 text-sm text-zinc-400">{[event.venue, event.location].filter(Boolean).join(" • ") || "Venue TBA"}</p>
        <span className="mt-5 inline-flex text-xs font-black uppercase tracking-[0.12em] text-orange-300">View event →</span>
      </div>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/35 p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>;
}
