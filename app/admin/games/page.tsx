"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";

type RosterParticipant = {
  player_id: string;
  team_side: string;
  roster_status: string;
  person?: { full_name?: string | null; name?: string | null; nickname?: string | null } | null;
};

type GameRow = {
  id: string;
  event_id?: string | null;
  title?: string | null;
  competition_name?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  game_format?: string | null;
  game_stage?: string | null;
  game_date?: string | null;
  venue?: string | null;
  court?: string | null;
  status: "upcoming" | "live" | "completed" | "postponed" | "cancelled";
  home_score?: number | null;
  team_score?: number | null;
  away_score?: number | null;
  opponent_score?: number | null;
  status_note?: string | null;
  verification_status?: string | null;
  version: number;
  roster_count: number;
  media_count: number;
  roster_participants: RosterParticipant[];
};

type EventRow = { event_id: string; title: string; is_public?: boolean };

type BulkRow = {
  setup_key: string;
  home_team_name: string;
  away_team_name: string;
  game_date: string;
  game_stage: string;
  court: string;
};

const transitions: Record<GameRow["status"], GameRow["status"][]> = {
  upcoming: ["upcoming", "live", "postponed", "cancelled"],
  live: ["live", "completed", "postponed", "cancelled"],
  completed: ["completed"],
  postponed: ["postponed", "upcoming", "cancelled"],
  cancelled: ["cancelled", "upcoming"],
};

function newBulkRow(): BulkRow {
  return {
    setup_key: `bulk-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    home_team_name: "",
    away_team_name: "",
    game_date: "",
    game_stage: "Game",
    court: "",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: GameRow["status"]) {
  if (status === "live") return "border-red-400/30 bg-red-400/10 text-red-100";
  if (status === "completed") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (["postponed", "cancelled"].includes(status)) return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function GameControl({ game, onSaved, readOnly }: { game: GameRow; onSaved: () => void; readOnly: boolean }) {
  const [status, setStatus] = useState(game.status);
  const [homeScore, setHomeScore] = useState(String(game.home_score ?? game.team_score ?? ""));
  const [awayScore, setAwayScore] = useState(String(game.away_score ?? game.opponent_score ?? ""));
  const [statusNote, setStatusNote] = useState(game.status_note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const scoring = ["live", "completed"].includes(status);
  const statusChanged = status !== game.status;
  const noteRequired = statusChanged && ["postponed", "cancelled", "upcoming"].includes(status);

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/games", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: game.id,
        expected_version: game.version,
        status,
        home_score: scoring ? homeScore : null,
        away_score: scoring ? awayScore : null,
        status_note: statusNote,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Game update failed.");
    else {
      setMessage(result.message || "Game saved.");
      onSaved();
    }
    setSaving(false);
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusClass(game.status)}`}>{game.status}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-zinc-400">{game.game_format || "Basketball"}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-zinc-400">{game.verification_status || "unverified"}</span>
          </div>
          <h2 className="mt-3 text-xl font-black">{game.home_team_name || "Home"} <span className="text-zinc-600">vs</span> {game.away_team_name || "Away"}</h2>
          <p className="mt-1 text-sm text-zinc-500">{game.competition_name || "FACKTS Hoops"} · {game.game_stage || "Game"}</p>
        </div>
        <div className="text-right text-sm text-zinc-400">
          <p className="font-bold text-zinc-200">{formatDate(game.game_date)}</p>
          <p>{[game.venue, game.court].filter(Boolean).join(" · ") || "Venue not set"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl bg-black p-4 sm:grid-cols-5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:col-span-2">
          Status
          <select disabled={readOnly} value={status} onChange={(event) => {
            const next = event.target.value as GameRow["status"];
            setStatus(next);
            if (!["live", "completed"].includes(next)) { setHomeScore(""); setAwayScore(""); }
          }} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
            {transitions[game.status].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Home score
          <input type="number" min="0" step="1" disabled={readOnly || !scoring} value={homeScore} onChange={(event) => setHomeScore(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:opacity-40" />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Away score
          <input type="number" min="0" step="1" disabled={readOnly || !scoring} value={awayScore} onChange={(event) => setAwayScore(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white disabled:opacity-40" />
        </label>
        <button disabled={readOnly || saving} onClick={() => void save()} className="self-end rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-black hover:bg-orange-400 disabled:opacity-50">{readOnly ? "Read only" : saving ? "Saving…" : "Save"}</button>
        {(noteRequired || statusNote) ? (
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:col-span-5">
            Status note {noteRequired ? "— required" : ""}
            <textarea disabled={readOnly} value={statusNote} onChange={(event) => setStatusNote(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white disabled:opacity-50" />
          </label>
        ) : null}
      </div>

      {message ? <p className="mt-3 rounded-xl border border-white/10 bg-black p-3 text-sm text-zinc-300">{message}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/rosters/${game.id}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/40">Roster ({game.roster_count})</Link>
        <Link href={`/admin/stats?game_id=${encodeURIComponent(game.id)}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/40">Statistics</Link>
        <Link href={`/admin/highlights?game_id=${encodeURIComponent(game.id)}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/40">Media ({game.media_count})</Link>
        <Link href={`/games/${game.id}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/40">Match centre</Link>
      </div>
    </article>
  );
}

export default function GamesAdminPage() {
  const { readOnly } = useAdminPermission();
  const [games, setGames] = useState<GameRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [participantFilter, setParticipantFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkEvent, setBulkEvent] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([newBulkRow(), newBulkRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/games", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setGames([]);
      setMessage(result.error || "Games could not be loaded.");
    } else {
      setGames(result.games ?? []);
      setEvents(result.events ?? []);
      setMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialEvent = new URLSearchParams(window.location.search).get("event_id");
    const timer = window.setTimeout(() => {
      if (initialEvent) {
        setEventFilter(initialEvent);
        setBulkEvent(initialEvent);
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const participant = participantFilter.trim().toLowerCase();
    return games.filter((game) => {
      const names = game.roster_participants.map((row) => row.person?.full_name || row.person?.name || row.person?.nickname || "");
      const haystack = [game.title, game.home_team_name, game.away_team_name, game.competition_name, game.game_stage, game.venue, ...names].join(" ").toLowerCase();
      const participantHaystack = [game.home_team_name, game.away_team_name, ...names].join(" ").toLowerCase();
      const date = game.game_date?.slice(0, 10) || "";
      return (!query || haystack.includes(query)) && (eventFilter === "all" || game.event_id === eventFilter) && (statusFilter === "all" || game.status === statusFilter) && (!participant || participantHaystack.includes(participant)) && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
    });
  }, [dateFrom, dateTo, eventFilter, games, participantFilter, search, statusFilter]);

  const counts = useMemo(() => ({
    total: games.length,
    today: games.filter((game) => game.game_date?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    live: games.filter((game) => game.status === "live").length,
    unverified: games.filter((game) => game.status === "completed" && game.verification_status !== "verified").length,
  }), [games]);

  function updateBulk(index: number, key: keyof BulkRow, value: string) {
    setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  async function scheduleBulk() {
    if (!bulkEvent) { setMessage("Choose an event for the bulk schedule."); return; }
    setBulkSaving(true);
    setMessage("");
    const selectedEvent = events.find((event) => event.event_id === bulkEvent);
    const response = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ games: bulkRows.map((row) => ({ ...row, event_id: bulkEvent, competition_name: selectedEvent?.title, status: "upcoming", home_score: null, away_score: null })) }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Bulk schedule could not be saved.");
    else {
      setMessage(result.message || "Games scheduled.");
      setBulkRows([newBulkRow(), newBulkRow()]);
      setShowBulk(false);
      await load();
    }
    setBulkSaving(false);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Phase 1 operations</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Games Admin</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Schedule in batches, find games quickly, control valid status transitions, and manage scores without overwriting another Admin&apos;s changes.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!readOnly ? <Link href="/admin/games/editor" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-zinc-300 hover:border-orange-300/40">Full legacy editor</Link> : null}
            {!readOnly ? <button onClick={() => setShowBulk((value) => !value)} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black hover:bg-orange-400">{showBulk ? "Close scheduler" : "Bulk schedule"}</button> : null}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["All games", counts.total], ["Today", counts.today], ["Live", counts.live], ["Completed, unverified", counts.unverified]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-zinc-950 p-4"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>
          ))}
        </section>

        {showBulk ? (
          <section className="rounded-3xl border border-orange-400/25 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h2 className="text-xl font-black">Bulk scheduling</h2><p className="mt-1 text-sm text-zinc-500">Every row is validated before one batch write. Re-saving the same batch keys updates instead of duplicating.</p></div>
              <label className="min-w-72 text-xs font-black uppercase tracking-wider text-zinc-500">Event<select value={bulkEvent} onChange={(event) => setBulkEvent(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm normal-case text-white"><option value="">Choose event</option>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select></label>
            </div>
            <div className="mt-5 space-y-3">
              {bulkRows.map((row, index) => (
                <div key={row.setup_key} className="grid gap-3 rounded-2xl bg-black p-4 md:grid-cols-6">
                  <input value={row.home_team_name} onChange={(event) => updateBulk(index, "home_team_name", event.target.value)} placeholder="Home / side A" className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm md:col-span-2" />
                  <input value={row.away_team_name} onChange={(event) => updateBulk(index, "away_team_name", event.target.value)} placeholder="Away / side B" className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm md:col-span-2" />
                  <input type="datetime-local" value={row.game_date} onChange={(event) => updateBulk(index, "game_date", event.target.value)} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm" />
                  <button onClick={() => setBulkRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-black text-rose-200">Remove</button>
                  <input value={row.game_stage} onChange={(event) => updateBulk(index, "game_stage", event.target.value)} placeholder="Stage / round" className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm md:col-span-3" />
                  <input value={row.court} onChange={(event) => updateBulk(index, "court", event.target.value)} placeholder="Court" className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm md:col-span-3" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <button onClick={() => setBulkRows((current) => [...current, newBulkRow()])} className="rounded-xl border border-orange-300/30 px-4 py-2.5 text-sm font-black text-orange-200">Add row</button>
              <button disabled={bulkSaving || bulkRows.length === 0} onClick={() => void scheduleBulk()} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-black disabled:opacity-50">{bulkSaving ? "Validating and saving…" : `Schedule ${bulkRows.length} games`}</button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search games" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm xl:col-span-2" />
            <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="all">All events</option>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="all">All statuses</option>{Object.keys(transitions).map((status) => <option key={status}>{status}</option>)}</select>
            <input value={participantFilter} onChange={(event) => setParticipantFilter(event.target.value)} placeholder="Team / participant" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
            <button onClick={() => void load()} className="rounded-xl border border-white/10 px-3 py-3 text-sm font-black hover:border-orange-300/40">Refresh</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white" /></label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white" /></label>
          </div>
        </section>

        {message ? <p className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">{message}</p> : null}
        {loading ? <p className="rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center text-zinc-400">Loading games…</p> : filtered.length ? (
          <section className="grid gap-4 xl:grid-cols-2">{filtered.map((game) => <GameControl key={`${game.id}-${game.version}`} game={game} onSaved={() => void load()} readOnly={readOnly} />)}</section>
        ) : <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-10 text-center"><h2 className="text-xl font-black">No games match these filters</h2><p className="mt-2 text-sm text-zinc-500">Adjust the filters or add a bulk schedule.</p></div>}
      </div>
    </main>
  );
}
