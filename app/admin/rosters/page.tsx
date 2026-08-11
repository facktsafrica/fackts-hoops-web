"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";
import { parseRosterFile } from "@/lib/admin/rosterFileParser";

type GameRow = {
  id: string;
  event_id?: string | null;
  title?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  game_date?: string | null;
  status?: string | null;
  venue?: string | null;
};

type Person = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: string | number | null;
  player_type?: string | null;
};

type RosterRow = {
  id: string;
  player_id: string;
  roster_role?: string | null;
  roster_status?: string | null;
  team_side?: string | null;
  jersey_snapshot?: string | null;
  person?: Person | null;
};

type ImportBatch = {
  id: string;
  game_id: string;
  file_name: string;
  file_type?: string | null;
  status: "staged" | "validated" | "blocked" | "committed" | "cancelled";
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  created_at: string;
  committed_at?: string | null;
};

type ImportRow = {
  id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  display_name?: string | null;
  normalized_name?: string | null;
  candidate_player_id?: string | null;
  match_status: string;
  match_confidence?: number | null;
  jersey_number?: string | null;
  roster_role?: string | null;
  roster_status?: string | null;
  team_side?: string | null;
  participation_role?: string | null;
  validation_errors: string[];
};

function personName(person?: Person | null) {
  return person?.full_name || person?.name || person?.nickname || "Unnamed person";
}

function gameName(game: GameRow) {
  return `${game.home_team_name || "Home"} vs ${game.away_team_name || "Away"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function fileHash(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export default function RostersAdminPage() {
  const { readOnly } = useAdminPermission();
  const [games, setGames] = useState<GameRow[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [game, setGame] = useState<GameRow | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [defaultSide, setDefaultSide] = useState("home");
  const [loading, setLoading] = useState(true);
  const [staging, setStaging] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [savingRowId, setSavingRowId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (gameId?: string, batchId?: string, eventId?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gameId) params.set("game_id", gameId);
    if (batchId) params.set("batch_id", batchId);
    if (eventId) params.set("event_id", eventId);
    const response = await fetch(`/api/admin/rosters?${params}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Rosters could not be loaded.");
    } else {
      setGames(result.games ?? []);
      setGame(result.game ?? null);
      setSelectedGameId(result.game?.id ?? "");
      setPeople(result.people ?? []);
      setRoster(result.roster ?? []);
      setBatches(result.batches ?? []);
      setBatch(result.active_batch ?? null);
      setRows(result.import_rows ?? []);
      setMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialGame = params.get("game_id") || "";
    const initialEvent = params.get("event_id") || "";
    const timer = window.setTimeout(() => void load(initialGame, undefined, initialEvent), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => ({
    total: roster.length,
    home: roster.filter((row) => row.team_side === "home").length,
    away: roster.filter((row) => row.team_side === "away").length,
    pending: roster.filter((row) => row.roster_status === "pending").length,
  }), [roster]);

  function chooseGame(value: string) {
    setSelectedGameId(value);
    setBatch(null);
    setRows([]);
    setFile(null);
    void load(value);
  }

  async function stageFile() {
    if (!file || !selectedGameId) {
      setMessage("Choose a game and a CSV or XLSX file.");
      return;
    }
    setStaging(true);
    setMessage("Parsing the file locally…");
    try {
      const [parsed, hash] = await Promise.all([parseRosterFile(file), fileHash(file)]);
      setMessage(`Parsed ${parsed.rows.length} rows. Validating and matching canonical people…`);
      const response = await fetch("/api/admin/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stage",
          game_id: selectedGameId,
          file_name: file.name,
          file_hash: hash,
          file_type: parsed.fileType,
          default_team_side: defaultSide,
          rows: parsed.rows,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setMessage(result.error || "Roster file could not be staged.");
        if (result.existing_batch?.id) await load(selectedGameId, result.existing_batch.id);
      } else {
        setBatch(result.batch);
        setRows(result.rows ?? []);
        setPeople(result.people ?? people);
        setMessage(result.message || "Roster file staged.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Roster file could not be parsed.");
    }
    setStaging(false);
  }

  function updateRow(index: number, key: keyof ImportRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  async function saveCorrection(row: ImportRow) {
    if (!batch) return;
    setSavingRowId(row.id);
    setMessage("");
    const response = await fetch("/api/admin/rosters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batch_id: batch.id,
        row_id: row.id,
        candidate_player_id: row.candidate_player_id,
        display_name: row.display_name,
        jersey_number: row.jersey_number,
        roster_role: row.roster_role,
        roster_status: row.roster_status,
        team_side: row.team_side,
        participation_role: row.participation_role,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Import row could not be saved.");
    else {
      setBatch(result.batch);
      setRows(result.rows ?? []);
      setPeople(result.people ?? people);
      setMessage(result.message || "Row saved.");
    }
    setSavingRowId("");
  }

  async function commit() {
    if (!batch || batch.status !== "validated") return;
    setCommitting(true);
    setMessage("");
    const response = await fetch("/api/admin/rosters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "commit", batch_id: batch.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Roster import could not be committed.");
    else {
      setMessage(result.message || "Roster committed.");
      await load(selectedGameId, batch.id);
    }
    setCommitting(false);
  }

  function fileChanged(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setBatch(null);
    setRows([]);
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Canonical participation</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Rosters Admin</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Upload, parse, validate, match, preview, correct, confirm and commit. Invalid files never partially enter the canonical game roster.</p>
          </div>
          {!readOnly ? <Link href="/admin/rosters/editor" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-zinc-300 hover:border-orange-300/40">Manual legacy editor</Link> : null}
        </header>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <label className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Game
            <select value={selectedGameId} onChange={(event) => chooseGame(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm normal-case text-white">
              <option value="">Choose game</option>
              {games.map((item) => <option key={item.id} value={item.id}>{formatDate(item.game_date)} — {gameName(item)}</option>)}
            </select>
          </label>
        </section>

        {game ? (
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-orange-300">Selected game</p><h2 className="mt-2 text-2xl font-black">{gameName(game)}</h2><p className="mt-1 text-sm text-zinc-500">{formatDate(game.game_date)} · {game.venue || "Venue not set"}</p></div>
              <Link href={`/admin/rosters/${game.id}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-orange-300/40">Roster preview</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Roster", counts.total], ["Home", counts.home], ["Away", counts.away], ["Pending", counts.pending]].map(([label, value]) => <div key={label} className="rounded-xl bg-black p-3"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div>
          </section>
        ) : null}

        {readOnly ? <p className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-100">Read-only access: committed rosters and import evidence are visible, but import and correction controls are disabled.</p> : null}

        {!readOnly ? <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr,0.35fr,auto] lg:items-end">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">
              CSV or Excel workbook (.xlsx)
              <input type="file" accept=".csv,.tsv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={fileChanged} className="mt-2 block w-full rounded-xl border border-dashed border-white/15 bg-black px-4 py-3 text-sm normal-case text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:font-black file:text-black" />
            </label>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Default team side
              <select value={defaultSide} onChange={(event) => setDefaultSide(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case text-white"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select>
            </label>
            <button disabled={!file || !selectedGameId || staging} onClick={() => void stageFile()} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black hover:bg-orange-400 disabled:opacity-50">{staging ? "Parsing and matching…" : "Stage import"}</button>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">Recognized columns: full_name/name, player_id, email, phone, jersey_number, roster_role, roster_status, team_side and participation_role. The first worksheet is used for XLSX files.</p>
        </section> : null}

        {message ? <p className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">{message}</p> : null}

        {batch ? (
          <section className="space-y-4">
            <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-950 p-5">
              <div><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Import preview · {batch.file_name}</p><h2 className="mt-1 text-xl font-black capitalize">{batch.status}</h2><p className="mt-2 text-sm text-zinc-400">{batch.valid_rows} valid · {batch.error_rows} needing review · {batch.total_rows} total</p></div>
              <button disabled={batch.status !== "validated" || committing} onClick={() => void commit()} className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">{committing ? "Committing atomically…" : "Confirm and commit all rows"}</button>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <article key={row.id} className={`rounded-3xl border p-4 ${row.validation_errors.length ? "border-rose-400/25 bg-rose-400/5" : "border-emerald-400/20 bg-zinc-950"}`}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 xl:col-span-2">Canonical person<select value={row.candidate_player_id || ""} onChange={(event) => {
                      const id = event.target.value;
                      updateRow(index, "candidate_player_id", id);
                      const selected = people.find((person) => person.id === id);
                      if (selected) updateRow(index, "display_name", personName(selected));
                    }} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white"><option value="">Select canonical person</option>{people.map((person) => <option key={person.id} value={person.id}>{personName(person)} · {person.player_type || "person"}</option>)}</select></label>
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Display name<input value={row.display_name || ""} onChange={(event) => updateRow(index, "display_name", event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white" /></label>
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Jersey<input value={row.jersey_number || ""} onChange={(event) => updateRow(index, "jersey_number", event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white" /></label>
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Team side<select value={row.team_side || "home"} onChange={(event) => updateRow(index, "team_side", event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></label>
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Lineup role<select value={row.roster_role || "bench"} onChange={(event) => updateRow(index, "roster_role", event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm normal-case text-white"><option value="starter">Starter</option><option value="bench">Bench</option></select></label>
                    <button disabled={savingRowId === row.id} onClick={() => void saveCorrection(row)} className="self-end rounded-xl border border-orange-300/30 px-3 py-2 text-xs font-black text-orange-200 hover:bg-orange-400/10 disabled:opacity-50">{savingRowId === row.id ? "Saving…" : "Save row"}</button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-white/10 px-2 py-1 font-black uppercase text-zinc-400">Row {row.row_number}</span><span className="rounded-full border border-white/10 px-2 py-1 font-black uppercase text-zinc-400">{row.match_status}{row.match_confidence ? ` ${row.match_confidence}%` : ""}</span></div>
                  {row.validation_errors.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-100">{row.validation_errors.map((error, errorIndex) => <li key={`${error}-${errorIndex}`}>{error}</li>)}</ul> : <p className="mt-3 text-sm font-bold text-emerald-200">Row is valid.</p>}
                </article>
              ))}
            </div>
            </fieldset>
          </section>
        ) : null}

        {batches.length ? (
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5"><h2 className="text-lg font-black">Recent import batches</h2><div className="mt-3 grid gap-2">{batches.map((item) => <button key={item.id} onClick={() => void load(selectedGameId, item.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black px-4 py-3 text-left text-sm"><span className="font-bold">{item.file_name}</span><span className="text-zinc-500">{item.status} · {item.valid_rows}/{item.total_rows} valid</span></button>)}</div></section>
        ) : null}

        {roster.length ? (
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5"><h2 className="text-lg font-black">Committed canonical roster</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{roster.map((row) => <div key={row.id} className="rounded-xl bg-black p-3"><p className="font-black">#{row.jersey_snapshot || row.person?.jersey_number || "—"} {personName(row.person)}</p><p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{row.team_side || "home"} · {row.roster_role || "bench"} · {row.roster_status || "confirmed"}</p></div>)}</div></section>
        ) : null}

        {loading ? <p className="text-center text-sm text-zinc-500">Loading roster operations…</p> : null}
      </div>
    </main>
  );
}
