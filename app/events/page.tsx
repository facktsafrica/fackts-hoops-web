export const revalidate = 60;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type EventCase = { event_id: string; slug: string; title: string; summary: string | null; start_date: string | null; end_date: string | null; venue: string | null; location: string | null; poster_url: string | null; hero_image_url: string | null; photo_count: number; status: string };

async function loadEvents() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [] as EventCase[];
  const { data } = await createClient(url, key).from("event_case_studies").select("event_id,slug,title,summary,start_date,end_date,venue,location,poster_url,hero_image_url,photo_count,status").eq("is_public", true).eq("status", "published").order("start_date", { ascending: false, nullsFirst: false });
  return (data || []) as EventCase[];
}

function dateLabel(value: string | null) {
  if (!value) return "Date archive pending";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default async function EventsPage() {
  const events = await loadEvents();
  return <main className="fackts-public-bg min-h-screen text-white">
    <section className="relative overflow-hidden border-b border-white/10 bg-slate-950/65">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">
        <span className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[.2em] text-orange-300">Events by FACKTS</span>
        <h1 className="mt-4 max-w-5xl text-4xl font-black uppercase leading-[.94] sm:text-6xl lg:text-7xl">Every tournament. One complete story.</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-200 sm:text-base">Statistics, tournament operations, photography, video, interviews and final event reporting in one shareable record.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/book-coverage" className="rounded-full bg-orange-500 px-6 py-3 text-center text-xs font-black uppercase text-black hover:bg-orange-400">Book event coverage</Link><a href="#covered-events" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-center text-xs font-black uppercase hover:border-orange-400">View covered events</a></div>
      </div>
    </section>
    <section id="covered-events" className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Event archive</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Covered events</h2>
      {events.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map(event => <Link key={event.event_id} href={`/events/${event.slug}`} className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/85 hover:border-orange-400/60">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">{event.poster_url || event.hero_image_url ? <img src={event.poster_url || event.hero_image_url || ""} alt={event.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top opacity-60" />}<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" /></div>
        <div className="p-5"><p className="text-xs font-black uppercase tracking-[.16em] text-orange-300">{dateLabel(event.start_date)}</p><h3 className="mt-2 text-2xl font-black uppercase leading-tight">{event.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-300">{event.summary || "Open the complete event record."}</p><p className="mt-4 text-sm font-bold text-zinc-400">{[event.venue,event.location].filter(Boolean).join(" • ")}</p><span className="mt-5 inline-flex text-xs font-black uppercase text-orange-300">View event →</span></div>
      </Link>)}</div> : <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-7 text-zinc-300">Published event records will appear here.</div>}
    </section>
    <section className="relative z-10 mx-auto max-w-7xl px-5 pb-14 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-orange-400/30 bg-gradient-to-br from-orange-500/20 via-slate-950 to-blue-700/20 p-6 sm:p-10"><p className="text-xs font-black uppercase tracking-[.18em] text-orange-300">Bring FACKTS courtside</p><h2 className="mt-3 max-w-3xl text-2xl font-black uppercase leading-tight sm:text-5xl">Your next basketball event deserves a complete record.</h2><Link href="/book-coverage" className="mt-6 flex w-full justify-center rounded-full bg-orange-500 px-6 py-3 text-xs font-black uppercase text-black sm:inline-flex sm:w-auto">Request coverage</Link></div></section>
  </main>;
}
