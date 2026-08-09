"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type EventDirectoryItem = {
  eventId: string;
  slug: string;
  title: string;
  summary: string;
  startDate: string | null;
  endDate: string | null;
  dateLabel: string;
  venue: string;
  location: string;
  imageUrl: string;
  eventType: string;
  ageCategory: string;
  organizer: string;
  lifecycle: "live" | "upcoming" | "completed";
  teamCount: number;
  gameCount: number;
};

const statusOptions = [
  { value: "all", label: "All events" },
  { value: "live", label: "Live now" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
] as const;

function statusClass(status: EventDirectoryItem["lifecycle"]) {
  if (status === "live") return "border-red-300/40 bg-red-500 text-white";
  if (status === "upcoming") return "border-blue-300/35 bg-blue-500/20 text-blue-100";
  return "border-white/15 bg-black/55 text-zinc-200";
}

function statusLabel(status: EventDirectoryItem["lifecycle"]) {
  if (status === "live") return "Live";
  if (status === "upcoming") return "Upcoming";
  return "Completed";
}

function cleanOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function EventsExplorer({ events }: { events: EventDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [eventType, setEventType] = useState("all");
  const [location, setLocation] = useState("all");
  const [organizer, setOrganizer] = useState("all");

  const eventTypes = useMemo(() => cleanOptions(events.map((event) => event.eventType)), [events]);
  const locations = useMemo(() => cleanOptions(events.map((event) => event.location)), [events]);
  const organizers = useMemo(() => cleanOptions(events.map((event) => event.organizer)), [events]);

  const counts = useMemo(
    () => ({
      all: events.length,
      live: events.filter((event) => event.lifecycle === "live").length,
      upcoming: events.filter((event) => event.lifecycle === "upcoming").length,
      completed: events.filter((event) => event.lifecycle === "completed").length,
    }),
    [events]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesQuery = !needle || [
        event.title,
        event.summary,
        event.organizer,
        event.location,
        event.venue,
        event.eventType,
        event.ageCategory,
      ].some((value) => value.toLowerCase().includes(needle));

      return matchesQuery
        && (status === "all" || event.lifecycle === status)
        && (eventType === "all" || event.eventType === eventType)
        && (location === "all" || event.location === location)
        && (organizer === "all" || event.organizer === organizer);
    });
  }, [eventType, events, location, organizer, query, status]);

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setEventType("all");
    setLocation("all");
    setOrganizer("all");
  }

  return (
    <>
      <section className="relative z-20 mx-auto -mt-8 max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/95 p-3 shadow-[0_28px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-5">
          <label htmlFor="event-directory-search" className="sr-only">Search basketball events</label>
          <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 focus-within:border-orange-400/60">
            <span aria-hidden="true" className="text-xl text-orange-300">⌕</span>
            <input
              id="event-directory-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search an event, organizer, venue or location"
              className="min-w-0 flex-1 bg-transparent py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
            />
            {query ? <button type="button" onClick={() => setQuery("")} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300" aria-label="Clear event search">×</button> : null}
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] transition ${status === option.value ? "border-orange-400 bg-orange-500 text-black" : "border-white/10 bg-white/[.035] text-zinc-300 hover:border-orange-400/50"}`}
              >
                {option.label} <span className="ml-1 opacity-70">{counts[option.value]}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <FilterSelect label="Event type" value={eventType} onChange={setEventType} options={eventTypes} />
            <FilterSelect label="Location" value={location} onChange={setLocation} options={locations} />
            <FilterSelect label="Organizer" value={organizer} onChange={setOrganizer} options={organizers} />
          </div>
        </div>
      </section>

      <section id="event-directory" className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Basketball event directory</p>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">Find the full competition record.</h2>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-zinc-500">{filtered.length} {filtered.length === 1 ? "event" : "events"} found</p>
        </div>

        {filtered.length ? (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <article key={event.eventId} className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 shadow-[0_18px_60px_rgba(0,0,0,.25)] transition hover:-translate-y-1 hover:border-orange-400/50">
                <Link href={`/events/${event.slug}`} className="block">
                  <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.25),transparent_35%),linear-gradient(135deg,#0f172a,#020617)]">
                    {event.imageUrl ? <img src={event.imageUrl} alt={event.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="h-full bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top opacity-45" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
                    <span className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] shadow-lg ${statusClass(event.lifecycle)}`}>{statusLabel(event.lifecycle)}</span>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[.14em] text-orange-200">{event.eventType} · {event.ageCategory}</p>
                      <span className="shrink-0 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[9px] font-black uppercase text-white backdrop-blur">{event.dateLabel}</span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-300">By {event.organizer}</p>
                    <h3 className="mt-2 text-2xl font-black uppercase leading-[1.02] tracking-[-.02em] text-white">{event.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{event.summary || "Open the event hub for the schedule, results, teams, media and competition record."}</p>

                    <div className="mt-5 grid grid-cols-2 gap-2 border-y border-white/[.07] py-4 text-xs">
                      <div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">Venue</p><p className="mt-1 truncate font-bold text-zinc-200">{event.venue || event.location || "To be announced"}</p></div>
                      <div className="min-w-0 text-right"><p className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">Event record</p><p className="mt-1 font-bold text-zinc-200">{event.teamCount} teams · {event.gameCount} games</p></div>
                    </div>

                    <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-orange-300">View event hub <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-[2rem] border border-dashed border-white/15 bg-slate-950/75 px-6 py-14 text-center">
            <p className="text-lg font-black uppercase text-white">No event matches those filters.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Clear the filters to return to the complete FACKTS event directory.</p>
            <button type="button" onClick={resetFilters} className="mt-5 rounded-full bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-black">Clear filters</button>
          </div>
        )}
      </section>
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2">
      <span className="block text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full bg-transparent text-xs font-bold text-white outline-none">
        <option value="all" className="bg-slate-950">All {label.toLowerCase()}s</option>
        {options.map((option) => <option key={option} value={option} className="bg-slate-950">{option}</option>)}
      </select>
    </label>
  );
}
