export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import EventsExplorer, { type EventDirectoryItem } from "./EventsExplorer";

type EventCase = {
  event_id: string;
  slug: string;
  title: string;
  summary: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  poster_url: string | null;
  hero_image_url: string | null;
  event_type: string | null;
  age_category: string | null;
  organizer_name?: string | null;
  created_at: string;
};

type CountRecord = {
  event_id: string;
  record_type: string;
  score_for: number | null;
  score_against: number | null;
};

function kenyaToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function lifecycle(event: EventCase, today: string): EventDirectoryItem["lifecycle"] {
  const inferredYear = Number(event.title.match(/\b(20\d{2})\b/)?.[1] || 0);
  const currentYear = Number(today.slice(0, 4));

  if (!event.start_date && !event.end_date) {
    return inferredYear && inferredYear < currentYear ? "completed" : "upcoming";
  }

  const start = event.start_date || event.end_date || today;
  const end = event.end_date || event.start_date || today;
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "live";
}

function formatDate(value: string | null) {
  if (!value) return "Date pending";
  return new Date(`${value}T12:00:00+03:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function dateRange(start: string | null, end: string | null) {
  if (!start && !end) return "Archive";
  if (!end || end === start) return formatDate(start || end);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function organizerName(event: EventCase) {
  if (event.organizer_name?.trim()) return event.organizer_name.trim();
  if (/fackts/i.test(event.title)) return "FACKTS Africa";
  return "Organizer pending";
}

async function loadEvents(): Promise<EventDirectoryItem[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("event_case_studies")
    .select("*")
    .eq("is_public", true)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`PUBLIC_EVENTS_LOAD_FAILED: ${error.message}`);
  const events = (data || []) as EventCase[];
  if (!events.length) return [];

  const ids = events.map((event) => event.event_id);
  const { data: recordData } = await db
    .from("event_records")
    .select("event_id,record_type,score_for,score_against")
    .in("event_id", ids)
    .eq("is_public", true)
    .in("status", ["verified", "published"]);

  const records = (recordData || []) as CountRecord[];
  const today = kenyaToday();

  return events
    .map((event): EventDirectoryItem => ({
      eventId: event.event_id,
      slug: event.slug || event.event_id,
      title: event.title,
      summary: event.summary || "",
      startDate: event.start_date,
      endDate: event.end_date,
      dateLabel: dateRange(event.start_date, event.end_date),
      venue: event.venue || "",
      location: event.location || "",
      imageUrl: event.poster_url || event.hero_image_url || "",
      eventType: event.event_type || "Basketball",
      ageCategory: event.age_category || "Open",
      organizer: organizerName(event),
      lifecycle: lifecycle(event, today),
      teamCount: records.filter((record) => record.event_id === event.event_id && record.record_type === "team").length,
      gameCount: records.filter((record) => record.event_id === event.event_id && record.record_type === "result" && record.score_for != null && record.score_against != null).length,
    }))
    .sort((a, b) => {
      const rank = { live: 0, upcoming: 1, completed: 2 };
      return rank[a.lifecycle] - rank[b.lifecycle]
        || String(a.startDate || "9999-12-31").localeCompare(String(b.startDate || "9999-12-31"));
    });
}

export default async function EventsPage() {
  const events = await loadEvents();

  return (
    <main className="fackts-public-bg min-h-screen overflow-x-clip text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950/55">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-6 md:pb-24 md:pt-16 lg:px-8">
          <div className="max-w-5xl">
            <span className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300">FACKTS event intelligence</span>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[.92] tracking-[-.035em] sm:text-6xl lg:text-8xl">Every tournament.<br /><span className="text-orange-400">One complete hub.</span></h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-200 sm:text-base">Discover upcoming, live and completed basketball events. Open one competition hub for its schedule, results, standings, teams, leaders, media, sponsors and organizer.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#event-directory" className="rounded-full bg-orange-500 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em] text-black hover:bg-orange-400">Explore events</a>
              <Link href="/book-coverage" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em] hover:border-orange-400">Book tournament coverage</Link>
            </div>
          </div>
        </div>
      </section>

      <EventsExplorer events={events} />

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-orange-400/30 bg-gradient-to-br from-orange-500/20 via-slate-950 to-blue-700/20 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">For tournament organizers</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-[.98] sm:text-5xl">Give your event the digital home it deserves.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">FACKTS combines event operations, verified statistics, photography, video and a shareable final competition record.</p>
            <Link href="/book-coverage" className="mt-6 flex w-full justify-center rounded-full bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black sm:inline-flex sm:w-auto">Request event coverage</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
