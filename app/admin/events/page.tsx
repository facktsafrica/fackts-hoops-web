"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";

type SetupProgress = {
  current_stage: string;
  completed_stages: string[];
  validation_status: "needs_review" | "valid" | "blocked";
  validation_errors: Array<{ code?: string; message?: string }>;
  updated_at: string;
};

type EventRow = {
  id: string;
  event_id: string;
  title: string;
  slug: string;
  summary?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  status: string;
  is_public: boolean;
  event_type?: string | null;
  age_category?: string | null;
  organizer_name?: string | null;
  source_kind?: "event" | "competition";
  competition_slug?: string | null;
  season_label?: string | null;
  verification_status?: string | null;
  setup?: SetupProgress | null;
  counts: {
    games: number;
    completed_games: number;
    participants: number;
    deliverables: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function statusClass(status: string) {
  if (["published", "valid", "live", "completed", "verified"].includes(status)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (["blocked", "archived", "cancelled", "disputed"].includes(status)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

export default function EventsAdminPage() {
  const { readOnly } = useAdminPermission();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "all" | "draft" | "completed">("active");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("all");
  const [organizer, setOrganizer] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletingEventId, setDeletingEventId] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/events", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setEvents([]);
      setMessage(result.error || "Events could not be loaded.");
    } else {
      setEvents(result.events ?? []);
      setMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  async function deleteEvent(event: EventRow) {
    if (readOnly || deletingEventId) return;
    const confirmationTitle = window.prompt(
      `Delete “${event.title}” and all linked event records?\n\nType the exact event title to confirm:`,
    );
    if (confirmationTitle === null) return;
    if (confirmationTitle.trim() !== event.title) {
      setMessage("Event not deleted: the title did not match exactly.");
      return;
    }

    setDeletingEventId(event.event_id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.event_id,
          confirmation_title: confirmationTitle.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Event could not be deleted.");
      }
      setEvents((current) =>
        current.filter((item) => item.event_id !== event.event_id)
      );
      setMessage(`“${event.title}” was deleted.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Event could not be deleted."
      );
    } finally {
      setDeletingEventId("");
    }
  }

  const formats = useMemo(
    () =>
      Array.from(new Set(events.map((event) => event.event_type).filter(Boolean))) as string[],
    [events]
  );
  const organizers = useMemo(
    () =>
      Array.from(
        new Set(events.map((event) => event.organizer_name).filter(Boolean))
      ) as string[],
    [events]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        !query ||
        [
          event.title,
          event.event_id,
          event.organizer_name,
          event.venue,
          event.location,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));
      const matchesStatus = status === "all" || event.status === status;
      const matchesFormat = format === "all" || event.event_type === format;
      const matchesOrganizer =
        organizer === "all" || event.organizer_name === organizer;
      const matchesVisibility =
        visibility === "all" ||
        (visibility === "public" ? event.is_public : !event.is_public);
      const matchesFrom =
        !dateFrom || !event.start_date || event.start_date >= dateFrom;
      const matchesTo = !dateTo || !event.start_date || event.start_date <= dateTo;
      const matchesView =
        view === "all" ||
        (view === "active" && ["live", "upcoming", "published"].includes(event.status)) ||
        (view === "draft" && event.status === "draft") ||
        (view === "completed" && ["completed", "archived"].includes(event.status));
      return (
        matchesSearch &&
        matchesStatus &&
        matchesFormat &&
        matchesOrganizer &&
        matchesVisibility &&
        matchesFrom &&
        matchesTo &&
        matchesView
      );
    });
  }, [dateFrom, dateTo, events, format, organizer, search, status, view, visibility]);

  const counts = useMemo(
    () => ({
      total: events.length,
      active: events.filter((event) => ["live", "upcoming", "published"].includes(event.status)).length,
      competitions: events.filter((event) => event.source_kind === "competition").length,
      draft: events.filter((event) => event.status === "draft").length,
      completed: events.filter((event) => ["completed", "archived"].includes(event.status)).length,
    }),
    [events]
  );

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
              Portfolio command
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">Events & Competitions</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              One executive register for tournaments, commissioned events and permanent
              competition properties—including FACKTS Kings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!readOnly ? (
              <>
                <Link
                  href="/admin/events/content"
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-zinc-200 transition hover:border-orange-300/50 hover:text-orange-200"
                >
                  Event content
                </Link>
                <Link
                  href="/admin/events/new"
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
                >
                  Create event
                </Link>
                <Link
                  href="/admin/corrections?entity_type=event"
                  className="rounded-2xl border border-blue-400/35 bg-blue-400/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:border-blue-300/60"
                >
                  Data corrections
                </Link>
              </>
            ) : null}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["All events", counts.total],
            ["Active now", counts.active],
            ["Competitions", counts.competitions],
            ["Completed", counts.completed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950 p-2" aria-label="Event register views">
          {([
            ["active", "Active"],
            ["all", "All records"],
            ["draft", `Drafts ${counts.draft}`],
            ["completed", "Completed"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition ${view === value ? "bg-orange-500 text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <label className="xl:col-span-2">
              <span className="sr-only">Search events</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, organizer, venue or ID"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-orange-400"
              />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <select value={format} onChange={(event) => setFormat(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">
              <option value="all">All formats</option>
              {formats.map((value) => <option key={value}>{value}</option>)}
            </select>
            <select value={organizer} onChange={(event) => setOrganizer(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">
              <option value="all">All organizers</option>
              {organizers.map((value) => <option key={value}>{value}</option>)}
            </select>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">
              <option value="all">Any visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <button onClick={() => void loadEvents()} className="rounded-xl border border-white/10 px-3 py-3 text-sm font-black hover:border-orange-300/50">
              Refresh
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              From
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-zinc-200" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              To
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-zinc-200" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch(""); setStatus("all"); setFormat("all"); setOrganizer("all");
              setVisibility("all"); setDateFrom(""); setDateTo(""); setView("active");
            }}
            className="mt-4 text-xs font-black text-orange-300 hover:text-orange-200"
          >
            Clear every filter
          </button>
        </section>

        {message ? (
          <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">{message}</p>
        ) : null}

        {loading ? (
          <p className="rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center text-zinc-400">Loading events…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-10 text-center">
            <h2 className="text-xl font-black">{events.length ? "No records match these filters" : "No event records loaded"}</h2>
            <p className="mt-2 text-sm text-zinc-500">{events.length ? "Clear the filters to restore the full register." : "Refresh the register. FACKTS Kings will appear here from Competition Profiles."}</p>
          </div>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {filtered.map((event) => {
              const isCompetition = event.source_kind === "competition";
              const setupStatus = isCompetition
                ? event.verification_status ?? "needs_review"
                : event.setup?.validation_status ?? "needs_review";
              return (
                <article key={event.event_id} className={`relative overflow-hidden rounded-3xl border bg-zinc-950 p-5 ${isCompetition ? "border-orange-400/25" : "border-white/10"}`}>
                  {isCompetition ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-blue-500 to-transparent" /> : null}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusClass(event.status)}`}>{event.status}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusClass(setupStatus)}`}>{isCompetition ? "Evidence" : "Setup"} {setupStatus.replace("_", " ")}</span>
                        {isCompetition ? <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-orange-200">Competition property</span> : null}
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-zinc-400">{event.is_public ? "Public" : "Private"}</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-black">{event.title}</h2>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{isCompetition ? `${event.season_label || "Current"} season · ${event.competition_slug}` : event.event_id}</p>
                    </div>
                    <div className="text-right text-sm text-zinc-400">
                      <p className="font-bold text-zinc-200">{formatDate(event.start_date)}</p>
                      <p>{event.venue || event.location || "Venue not set"}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Games", event.counts.games],
                      ["Finished", event.counts.completed_games],
                      ["Participants", event.counts.participants],
                      ["Deliverables", event.counts.deliverables],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-black p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">{label}</p>
                        <p className="mt-1 text-lg font-black">{value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-sm text-zinc-400">
                    {[event.event_type, event.age_category, event.organizer_name]
                      .filter(Boolean)
                      .join(" · ") || "Format and organizer details need review."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {isCompetition ? (
                      <>
                        <Link href="/admin/one-on-one" className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-black hover:bg-orange-400">Manage Kings battles</Link>
                        {!readOnly ? <Link href="/admin/competitions" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/50">Competition profile</Link> : null}
                        <Link href={`/admin/reports?event_id=${encodeURIComponent(event.event_id)}`} className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100 hover:border-blue-300/60">Competition report</Link>
                        {event.is_public ? <Link href={`/competitions/${event.competition_slug || event.slug}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/50">Public competition hub</Link> : null}
                      </>
                    ) : (
                      <>
                        <Link href={`/admin/events/${event.event_id}/setup`} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-black hover:bg-orange-400">{readOnly ? "View setup" : "Edit setup"}</Link>
                        <Link href={`/admin/games?event_id=${encodeURIComponent(event.event_id)}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/50">Games</Link>
                        <Link href={`/admin/rosters?event_id=${encodeURIComponent(event.event_id)}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/50">Participants</Link>
                        {!readOnly ? <Link href={`/admin/events/content?event_id=${encodeURIComponent(event.event_id)}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/50">Content</Link> : null}
                        {!readOnly ? <Link href={`/admin/corrections?entity_type=event&entity_id=${encodeURIComponent(event.event_id)}`} className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100 hover:border-blue-300/60">Correct data</Link> : null}
                        {!readOnly ? <button type="button" onClick={() => void deleteEvent(event)} disabled={Boolean(deletingEventId)} className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-black text-rose-100 hover:border-rose-300/60 disabled:cursor-not-allowed disabled:opacity-50">{deletingEventId === event.event_id ? "Deleting…" : "Delete event"}</button> : null}
                        {event.is_public ? <Link href={`/events/${event.slug}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/50">Public overview</Link> : null}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
