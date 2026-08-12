"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ReportKey = "event_completion" | "competition_performance" | "participation" | "statistics" | "media_delivery" | "sponsor_summary";
type Row = Record<string, unknown>;
type Filters = { event_id: string; date_from: string; date_to: string; format: string; team: string; player: string };
type ReportResponse = {
  ok: boolean;
  error?: string;
  generated_at?: string;
  filters?: Filters;
  options?: { events: Array<{ event_id: string; title: string }>; formats: string[] };
  summary?: { events: number; participants: number; stat_lines: number; media_assets: number; partners: number };
  reports?: Record<ReportKey, Row[]>;
};

const emptyFilters: Filters = { event_id: "", date_from: "", date_to: "", format: "", team: "", player: "" };
const emptyReports: Record<ReportKey, Row[]> = { event_completion: [], competition_performance: [], participation: [], statistics: [], media_delivery: [], sponsor_summary: [] };

const reportConfig: Record<ReportKey, { label: string; description: string; columns: Array<[string, string]> }> = {
  event_completion: {
    label: "Event completion",
    description: "Setup, games, verification and delivery completion for each event.",
    columns: [["event", "Event"], ["format", "Format"], ["start_date", "Start"], ["setup_status", "Setup"], ["games", "Games"], ["completed_games", "Completed"], ["verified_stat_lines", "Verified stats"], ["delivered", "Delivered"], ["completion_percent", "Completion %"]],
  },
  competition_performance: {
    label: "Competition performance",
    description: "Season position for permanent competition properties, including FACKTS Kings matches, verification, players and media.",
    columns: [["competition", "Competition"], ["season", "Season"], ["format", "Format"], ["status", "Status"], ["matches", "Matches"], ["completed", "Completed"], ["scheduled", "Scheduled"], ["verified", "Verified"], ["players", "Players"], ["media", "Media"], ["completion_percent", "Completion %"]],
  },
  participation: {
    label: "Participation",
    description: "One canonical roster row per person and game, including guest and external classifications.",
    columns: [["event", "Event"], ["game", "Game"], ["game_date", "Date"], ["format", "Format"], ["person", "Person"], ["classification", "Type"], ["team", "Team"], ["role", "Role"], ["roster_status", "Status"], ["jersey", "Jersey"]],
  },
  statistics: {
    label: "Statistics",
    description: "Canonical shared stat lines with submission and verification state.",
    columns: [["event", "Event"], ["game", "Game"], ["game_date", "Date"], ["person", "Person"], ["classification", "Type"], ["team", "Team"], ["points", "PTS"], ["rebounds", "REB"], ["assists", "AST"], ["steals", "STL"], ["blocks", "BLK"], ["turnovers", "TO"], ["verification_status", "Verification"]],
  },
  media_delivery: {
    label: "Media delivery",
    description: "Governed event and game media with rights, publication and link-health state.",
    columns: [["event", "Event"], ["game", "Game"], ["title", "Asset"], ["media_type", "Type"], ["link_role", "Role"], ["rights_status", "Rights"], ["publish_status", "Publish"], ["public", "Public"], ["health_status", "Health"]],
  },
  sponsor_summary: {
    label: "Sponsor summary",
    description: "Partner recognition records alongside the event delivery position.",
    columns: [["event", "Event"], ["partner", "Partner"], ["category", "Category"], ["contribution", "Contribution"], ["recognition_note", "Recognition note"], ["record_status", "Record"], ["delivery_status", "Delivery"], ["public", "Public"]],
  },
};

function display(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvValue(value: unknown) {
  let output = display(value);
  if (/^[=+\-@]/.test(output)) output = `'${output}`;
  return `"${output.replaceAll('"', '""')}"`;
}

function statusClass(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (["verified", "valid", "delivered", "published", "yes"].includes(status)) return "text-emerald-200";
  if (["disputed", "blocked", "broken", "withdrawn", "no"].includes(status)) return "text-rose-200";
  if (["pending", "review", "unverified", "missing", "draft"].includes(status)) return "text-amber-200";
  return "text-zinc-300";
}

export default function ReportsAdminPage() {
  const [active, setActive] = useState<ReportKey>("event_completion");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [reports, setReports] = useState<Record<ReportKey, Row[]>>(emptyReports);
  const [options, setOptions] = useState<{ events: Array<{ event_id: string; title: string }>; formats: string[] }>({ events: [], formats: [] });
  const [summary, setSummary] = useState({ events: 0, participants: 0, stat_lines: 0, media_assets: 0, partners: 0 });
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setMessage("");
    const query = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => { if (value.trim()) query.set(key, value.trim()); });
    const response = await fetch(`/api/admin/reports?${query.toString()}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as ReportResponse;
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Reports could not be loaded.");
    } else {
      setReports(result.reports ?? emptyReports);
      setSummary(result.summary ?? { events: 0, participants: 0, stat_lines: 0, media_assets: 0, partners: 0 });
      setGeneratedAt(result.generated_at ?? "");
      setOptions((current) => ({
        events: Array.from(new Map([...current.events, ...(result.options?.events ?? [])].map((event) => [event.event_id, event])).values()).sort((a, b) => a.title.localeCompare(b.title)),
        formats: Array.from(new Set([...current.formats, ...(result.options?.formats ?? [])])).sort(),
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const requestedEvent = new URLSearchParams(window.location.search).get("event_id") || "";
    const initialFilters = { ...emptyFilters, event_id: requestedEvent };
    if (requestedEvent) setFilters(initialFilters);
    const timer = window.setTimeout(() => void load(initialFilters), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const rows = reports[active] ?? [];
  const config = reportConfig[active];
  const summaryCards = useMemo(() => [
    ["Events", summary.events], ["Participation rows", summary.participants], ["Stat lines", summary.stat_lines], ["Media links", summary.media_assets], ["Partners", summary.partners],
  ], [summary]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(filters);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    void load(emptyFilters);
  }

  function exportCsv() {
    const columns = config.columns;
    const lines = [columns.map(([, label]) => csvValue(label)).join(","), ...rows.map((row) => columns.map(([key]) => csvValue(row[key])).join(","))];
    const blob = new Blob(["\ufeff", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fackts-${active.replaceAll("_", "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function actionFor(row: Row) {
    if (active === "event_completion" && row.event_id) return <Link href={`/admin/events/${row.event_id}/setup`} className="font-black text-orange-300">Open setup</Link>;
    if (active === "competition_performance" && row.competition_slug) return <Link href="/admin/one-on-one" className="font-black text-orange-300">Manage competition</Link>;
    if (active === "participation" && row.game_id) return <Link href={`/admin/rosters?game_id=${row.game_id}`} className="font-black text-orange-300">Open roster</Link>;
    if (active === "statistics" && row.game_id) return <Link href={`/admin/stats?game_id=${row.game_id}`} className="font-black text-orange-300">Open stats</Link>;
    if (active === "media_delivery" && row.url) return <a href={String(row.url)} target="_blank" rel="noreferrer" className="font-black text-orange-300">Open asset</a>;
    if (active === "sponsor_summary") return <Link href="/admin/events/content" className="font-black text-orange-300">Event content</Link>;
    return null;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl border border-white/10 bg-zinc-950 p-6 print:border-0 print:bg-white print:p-0 print:text-black">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300 print:text-black">Executive intelligence suite</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Reports & Evidence</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 print:text-zinc-700">Live operational reporting for events, FACKTS Kings, participation, verified statistics, media delivery and partner recognition.</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button onClick={() => window.print()} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black">Print view</button>
              <button onClick={exportCsv} disabled={!rows.length} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black disabled:opacity-40">Export {config.label} CSV</button>
            </div>
          </div>
          {generatedAt ? <p className="mt-4 text-xs text-zinc-600 print:text-zinc-600">Generated {new Date(generatedAt).toLocaleString("en-KE")}</p> : null}
        </header>

        <form onSubmit={applyFilters} className="rounded-3xl border border-white/10 bg-zinc-950 p-5 print:hidden">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">Event<select value={filters.event_id} onChange={(event) => setFilters({ ...filters, event_id: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white"><option value="">All events</option>{options.events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select></label>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">From<input type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white" /></label>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">To<input type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white" /></label>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">Format<select value={filters.format} onChange={(event) => setFilters({ ...filters, format: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white"><option value="">All formats</option>{options.formats.map((format) => <option key={format}>{format}</option>)}</select></label>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">Team<input value={filters.team} onChange={(event) => setFilters({ ...filters, team: event.target.value })} placeholder="Name or ID" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white" /></label>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">Player<input value={filters.player} onChange={(event) => setFilters({ ...filters, player: event.target.value })} placeholder="Name or ID" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white" /></label>
          </div>
          <div className="mt-4 flex gap-2"><button disabled={loading} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">{loading ? "Refreshing…" : "Apply filters"}</button><button type="button" onClick={resetFilters} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-zinc-300">Reset</button></div>
        </form>

        {message ? <p className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">{message}</p> : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5">
          {summaryCards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-zinc-950 p-4 print:border-zinc-300 print:bg-white print:text-black"><p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
        </section>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950 p-2 print:hidden" aria-label="Report types">
          {(Object.keys(reportConfig) as ReportKey[]).map((key) => <button key={key} onClick={() => setActive(key)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black ${active === key ? "bg-orange-500 text-black" : "text-zinc-400 hover:bg-white/5"}`}>{reportConfig[key].label} <span className="ml-1 opacity-60">{reports[key].length}</span></button>)}
        </nav>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 print:border-zinc-300 print:bg-white print:text-black">
          <div className="border-b border-white/10 p-5 print:border-zinc-300"><p className="text-xs font-black uppercase tracking-wider text-orange-300 print:text-black">{config.label}</p><h2 className="mt-1 text-2xl font-black">{rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"}</h2><p className="mt-2 text-sm text-zinc-500">{config.description}</p></div>
          {loading && !rows.length ? <p className="p-10 text-center text-zinc-500">Loading live report data…</p> : rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-black text-[10px] uppercase tracking-wider text-zinc-500 print:bg-zinc-100 print:text-zinc-700"><tr>{config.columns.map(([key, label]) => <th key={key} className="px-4 py-3 font-black">{label}</th>)}<th className="px-4 py-3 font-black print:hidden">Action</th></tr></thead><tbody>{rows.slice(0, 1000).map((row, index) => <tr key={`${String(row.event_id || row.game_id || row.asset_id || row.partner_id)}-${index}`} className="border-t border-white/5 align-top print:border-zinc-200">{config.columns.map(([key]) => <td key={key} className={`max-w-sm px-4 py-3 ${statusClass(row[key])}`}>{display(row[key])}</td>)}<td className="whitespace-nowrap px-4 py-3 text-xs print:hidden">{actionFor(row)}</td></tr>)}</tbody></table>{rows.length > 1000 ? <p className="border-t border-white/10 p-4 text-xs text-zinc-500 print:hidden">Showing the first 1,000 rows. CSV export includes all {rows.length.toLocaleString()} rows.</p> : null}</div> : <div className="p-10 text-center"><h3 className="text-lg font-black">No rows match these filters</h3><p className="mt-2 text-sm text-zinc-500">Reset or broaden the event, date, format, team or player filter.</p></div>}
        </section>
      </div>
    </main>
  );
}
