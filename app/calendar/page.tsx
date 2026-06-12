export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type CalendarEvent = {
  id: string;
  title: string;
  event_type?: string | null;
  event_format?: string | null;
  opponent_or_partner?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  description?: string | null;
  status?: string | null;
  is_featured?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function normalizeStatus(value?: string | null) {
  const status = (value || "").toLowerCase().trim();

  if (status === "completed") return "Completed";
  if (status === "postponed") return "Postponed";
  if (status === "cancelled") return "Cancelled";

  return "Upcoming";
}

function formatDate(value?: string | null) {
  if (!value) return "Date not added";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Date not added";

  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDay(value?: string | null) {
  if (!value) return "TBA";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "TBA";

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
  });
}

function formatMonth(value?: string | null) {
  if (!value) return "DATE";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "DATE";

  return date
    .toLocaleDateString("en-KE", {
      month: "short",
    })
    .toUpperCase();
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const [hour, minute] = value.split(":");
  if (!hour || !minute) return value;

  const date = new Date();
  date.setHours(Number(hour));
  date.setMinutes(Number(minute));

  return date.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRange(event: CalendarEvent) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) return `${start} - ${end}`;
  if (start) return start;

  return "Time TBA";
}

function getLocation(event: CalendarEvent) {
  return [event.venue, event.location].filter(Boolean).join(" • ") || "Venue TBA";
}

function getStatusClass(status?: string | null) {
  const cleanStatus = normalizeStatus(status);

  if (cleanStatus === "Completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (cleanStatus === "Postponed") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200";
  }

  if (cleanStatus === "Cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-orange-500/30 bg-orange-500/10 text-orange-200";
}

async function getEvents() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return [];
  }

  return (data || []) as CalendarEvent[];
}

export default async function CalendarPage() {
  const events = await getEvents();

  const upcomingEvents = events.filter(
    (event) => normalizeStatus(event.status) === "Upcoming"
  );

  const completedEvents = events.filter(
    (event) => normalizeStatus(event.status) === "Completed"
  );

  const featuredEvent =
    events.find(
      (event) => event.is_featured && normalizeStatus(event.status) === "Upcoming"
    ) || upcomingEvents[0];

  const otherUpcoming = featuredEvent
    ? upcomingEvents.filter((event) => event.id !== featuredEvent.id)
    : upcomingEvents;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Court Take Over Series
              </div>

              <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Next Games & Events
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Follow the full FACKTS calendar: Court Take Overs, 1v1 battles,
                3v3 runs, 5v5 games, school showcases, media days, and community
                activations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Home
              </Link>

              <Link
                href="/games"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Games
              </Link>

              <Link
                href="/one-on-one"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                1v1
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <StatCard label="Calendar Items" value={events.length} />
            <StatCard label="Upcoming" value={upcomingEvents.length} />
            <StatCard label="Completed" value={completedEvents.length} />
            <StatCard
              label="Featured"
              value={events.filter((event) => event.is_featured).length}
            />
          </div>
        </div>
      </section>

      {featuredEvent ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Featured
            </p>

            <h2 className="text-3xl font-black">Main Calendar Highlight</h2>
          </div>

          <article className="overflow-hidden rounded-3xl border border-orange-500/30 bg-zinc-950 shadow-2xl shadow-orange-950/20 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            {featuredEvent.poster_url ? (
              <div className="h-72 overflow-hidden bg-zinc-900 lg:h-full">
                <img
                  src={featuredEvent.poster_url}
                  alt={featuredEvent.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505] lg:h-full">
                <div className="text-center">
                  <p className="text-7xl font-black text-orange-500">F</p>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    FACKTS Africa
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
                    featuredEvent.status
                  )}`}
                >
                  {normalizeStatus(featuredEvent.status)}
                </span>

                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
                  {featuredEvent.event_format || "Format"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase text-zinc-300">
                  {featuredEvent.event_type || "Event"}
                </span>
              </div>

              <h2 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">
                {featuredEvent.title}
              </h2>

              {featuredEvent.opponent_or_partner ? (
                <p className="mt-3 text-lg font-black text-orange-300">
                  {featuredEvent.opponent_or_partner}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniInfo label="Date" value={formatDate(featuredEvent.event_date)} />
                <MiniInfo label="Time" value={getTimeRange(featuredEvent)} />
                <MiniInfo label="Venue" value={getLocation(featuredEvent)} />
              </div>

              {featuredEvent.description ? (
                <p className="mt-6 text-sm leading-7 text-zinc-400">
                  {featuredEvent.description}
                </p>
              ) : null}

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Series Energy
                </p>

                <p className="mt-2 text-2xl font-black uppercase">
                  No Limits. Just Legacy.
                </p>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Upcoming" title="Next Calendar Items" />

        {otherUpcoming.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {otherUpcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyBox text="No other upcoming calendar items added yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Archive" title="Completed Events" />

        {completedEvents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {completedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyBox text="No completed events yet." />
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="text-3xl font-black">{title}</h2>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
      {text}
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 transition hover:-translate-y-1 hover:border-orange-400/50">
      {event.poster_url ? (
        <div className="h-56 overflow-hidden bg-zinc-900">
          <img
            src={event.poster_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="p-5">
        <div className="mb-4 flex items-start gap-4">
          <div className="shrink-0 overflow-hidden rounded-2xl border border-orange-500/30 bg-orange-500 text-center text-black">
            <div className="bg-black px-3 py-1 text-[10px] font-black uppercase text-orange-300">
              {formatMonth(event.event_date)}
            </div>

            <div className="px-4 py-2 text-2xl font-black">
              {formatDay(event.event_date)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${getStatusClass(
                  event.status
                )}`}
              >
                {normalizeStatus(event.status)}
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-zinc-300">
                {event.event_format || "Format"}
              </span>
            </div>

            <h3 className="text-xl font-black text-white">{event.title}</h3>

            <p className="mt-1 text-sm font-bold text-orange-300">
              {event.event_type || "Event"}
            </p>
          </div>
        </div>

        {event.opponent_or_partner ? (
          <p className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm font-bold text-zinc-300">
            {event.opponent_or_partner}
          </p>
        ) : null}

        <div className="mt-4 space-y-2 text-sm text-zinc-400">
          <p>
            <span className="font-black text-zinc-200">Date:</span>{" "}
            {formatDate(event.event_date)}
          </p>

          <p>
            <span className="font-black text-zinc-200">Time:</span>{" "}
            {getTimeRange(event)}
          </p>

          <p>
            <span className="font-black text-zinc-200">Venue:</span>{" "}
            {getLocation(event)}
          </p>
        </div>

        {event.description ? (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-500">
            {event.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}