"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";

type GameRow = {
  id: string;
  home_team_name?: string | null;
  away_team_name?: string | null;
  game_date?: string | null;
  status?: string | null;
  game_format?: string | null;
  verification_status?: string | null;
  home_score?: number | null;
  team_score?: number | null;
  away_score?: number | null;
  opponent_score?: number | null;
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
  team_side: string;
  roster_role?: string | null;
  person?: Person | null;
};

type StatRow = Record<string, unknown> & {
  id: string;
  player_id: string;
  autosave_version: number;
  period_values?: Record<string, Record<string, number>> | null;
  entry_status?: string | null;
  verification_status?: string | null;
};

type FieldDefinition = {
  field_key: string;
  label: string;
  data_type: "integer" | "decimal" | "boolean" | "duration" | "json";
  display_order: number;
};

type StatForm = {
  values: Record<string, string>;
  periods: Record<string, Record<string, string>>;
  version: number;
  statId?: string;
  verified: boolean;
};

type SaveState = "Saved" | "Unsaved" | "Saving" | "Conflict" | "Error" | "Verified";

const periodFields = ["points", "rebounds", "assists", "steals", "blocks", "turnovers", "fouls"];
const fallbackFields: FieldDefinition[] = [
  ["points", "Points"], ["rebounds", "Rebounds"], ["assists", "Assists"], ["steals", "Steals"], ["blocks", "Blocks"], ["turnovers", "Turnovers"], ["fouls", "Fouls"], ["minutes", "Minutes"], ["plus_minus", "Plus / Minus"], ["offensive_rebounds", "Offensive Rebounds"], ["defensive_rebounds", "Defensive Rebounds"], ["two_made", "2PT Made"], ["two_attempted", "2PT Attempted"], ["three_made", "3PT Made"], ["three_attempted", "3PT Attempted"], ["ft_made", "FT Made"], ["ft_attempted", "FT Attempted"],
].map(([field_key, label], index) => ({ field_key, label, data_type: field_key === "minutes" ? "decimal" : "integer", display_order: index * 10 })) as FieldDefinition[];
const periods = ["total", "Q1", "Q2", "Q3", "Q4", "OT1"];

function personName(person?: Person | null) {
  return person?.full_name || person?.name || person?.nickname || "Unnamed participant";
}

function gameName(game?: GameRow | null) {
  return `${game?.home_team_name || "Home"} vs ${game?.away_team_name || "Away"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function numberPayload(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value || 0)]));
}

function periodPayload(values: Record<string, Record<string, string>>) {
  return Object.fromEntries(Object.entries(values).map(([period, fields]) => [period, numberPayload(fields)]));
}

export default function SharedStatsPage() {
  const { readOnly } = useAdminPermission();
  const [games, setGames] = useState<GameRow[]>([]);
  const [game, setGame] = useState<GameRow | null>(null);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [forms, setForms] = useState<Record<string, StatForm>>({});
  const [fields, setFields] = useState<FieldDefinition[]>(fallbackFields);
  const [activePlayerId, setActivePlayerId] = useState("");
  const [activePeriod, setActivePeriod] = useState("total");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [legacyCount, setLegacyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [message, setMessage] = useState("");

  const formsRef = useRef<Record<string, StatForm>>({});
  const timersRef = useRef<Record<string, number>>({});
  const savingRef = useRef<Record<string, boolean>>({});
  const sequenceRef = useRef<Record<string, number>>({});

  const hydrate = useCallback((result: Record<string, unknown>, preferredClassification?: string) => {
    const loadedGames = (result.games ?? []) as GameRow[];
    const loadedGame = (result.game ?? null) as GameRow | null;
    const loadedRoster = (result.roster ?? []) as RosterRow[];
    const stats = (result.stats ?? []) as StatRow[];
    const definitions = (result.field_definitions ?? []) as FieldDefinition[];
    const config = (result.field_config ?? []) as Array<{ field_key: string }>;
    const visibleKeys = new Set(config.map((item) => item.field_key));
    const configuredFields = definitions.filter((field) => !visibleKeys.size || visibleKeys.has(field.field_key));
    const nextFields = configuredFields.length ? configuredFields : fallbackFields;
    const statsByPlayer = new Map(stats.map((stat) => [stat.player_id, stat]));
    const nextForms: Record<string, StatForm> = {};
    const nextStates: Record<string, SaveState> = {};

    loadedRoster.forEach((row) => {
      const stat = statsByPlayer.get(row.player_id);
      const preservedFields = Array.from(
        new Set([...fallbackFields, ...nextFields].map((field) => field.field_key))
      );
      const values = Object.fromEntries(
        preservedFields.map((field) => [field, String(stat?.[field] ?? 0)])
      );
      const statPeriods = stat?.period_values && typeof stat.period_values === "object" ? stat.period_values : {};
      const periodValues = Object.fromEntries(Object.entries(statPeriods).map(([period, periodRow]) => [period, Object.fromEntries(periodFields.map((field) => [field, String(periodRow?.[field] ?? 0)]))]));
      const verified = stat?.verification_status === "verified" || stat?.entry_status === "verified";
      nextForms[row.player_id] = { values, periods: periodValues, version: Number(stat?.autosave_version ?? 0), statId: stat?.id, verified };
      nextStates[row.player_id] = verified ? "Verified" : "Saved";
    });

    formsRef.current = nextForms;
    setForms(nextForms);
    setSaveStates(nextStates);
    setFields(nextFields);
    setGames(loadedGames);
    setGame(loadedGame);
    setSelectedGameId(loadedGame?.id ?? "");
    setRoster(loadedRoster);
    setLegacyCount(Number(result.legacy_guest_stats ?? 0));
    setActivePlayerId((current) => {
      if (loadedRoster.some((row) => row.player_id === current)) return current;
      const preferred = preferredClassification === "guest"
        ? loadedRoster.find((row) => ["guest", "guest_hooper", "external", "legacy_guest"].some((value) => String(row.person?.player_type ?? "").includes(value)))
        : null;
      return preferred?.player_id || loadedRoster[0]?.player_id || "";
    });
  }, []);

  const load = useCallback(async (gameId?: string, classification?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gameId) params.set("game_id", gameId);
    const response = await fetch(`/api/admin/stats?${params}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage(result.error || "Statistics could not be loaded.");
    else { hydrate(result, classification); setMessage(""); }
    setLoading(false);
  }, [hydrate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialGame = params.get("game_id") || "";
    const classification = params.get("classification") || "";
    const timers = timersRef.current;
    const timer = window.setTimeout(() => void load(initialGame, classification), 0);
    return () => {
      window.clearTimeout(timer);
      Object.values(timers).forEach((pending) => window.clearTimeout(pending));
    };
  }, [load]);

  const activeRoster = roster.find((row) => row.player_id === activePlayerId) ?? null;
  const activeForm = forms[activePlayerId] ?? null;
  const entryAllowed = ["live", "completed"].includes(String(game?.status));
  const displayedFields = activePeriod === "total" ? fields : fields.filter((field) => periodFields.includes(field.field_key));

  async function flush(playerId: string) {
    if (savingRef.current[playerId]) return;
    const form = formsRef.current[playerId];
    if (!form || form.verified || !game) return;
    savingRef.current[playerId] = true;
    const sequence = sequenceRef.current[playerId] ?? 0;
    setSaveStates((current) => ({ ...current, [playerId]: "Saving" }));
    const response = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "autosave",
        game_id: game.id,
        player_id: playerId,
        expected_version: form.version,
        values: numberPayload(form.values),
        period_values: periodPayload(form.periods),
        last_period: activePeriod === "total" ? null : activePeriod,
      }),
    });
    const result = await response.json().catch(() => ({}));
    savingRef.current[playerId] = false;
    if (!response.ok || !result.ok) {
      setSaveStates((current) => ({ ...current, [playerId]: result.conflict ? "Conflict" : "Error" }));
      setMessage(result.error || "Autosave failed.");
      return;
    }
    const nextVersion = Number(result.stat?.autosave_version ?? form.version + 1);
    formsRef.current[playerId] = { ...formsRef.current[playerId], version: nextVersion, statId: result.stat?.id };
    setForms((current) => ({ ...current, [playerId]: { ...current[playerId], version: nextVersion, statId: result.stat?.id } }));
    if ((sequenceRef.current[playerId] ?? 0) > sequence) {
      window.setTimeout(() => void flush(playerId), 0);
    } else {
      setSaveStates((current) => ({ ...current, [playerId]: "Saved" }));
    }
  }

  function queueAutosave(playerId: string, next: StatForm) {
    formsRef.current[playerId] = next;
    setForms((current) => ({ ...current, [playerId]: next }));
    sequenceRef.current[playerId] = (sequenceRef.current[playerId] ?? 0) + 1;
    setSaveStates((current) => ({ ...current, [playerId]: "Unsaved" }));
    if (timersRef.current[playerId]) window.clearTimeout(timersRef.current[playerId]);
    timersRef.current[playerId] = window.setTimeout(() => void flush(playerId), 900);
  }

  function updateField(field: string, value: string) {
    if (readOnly || !activePlayerId || !activeForm || activeForm.verified || !entryAllowed) return;
    let next: StatForm;
    if (activePeriod === "total") {
      next = { ...activeForm, values: { ...activeForm.values, [field]: value } };
    } else {
      const nextPeriods = { ...activeForm.periods, [activePeriod]: { ...(activeForm.periods[activePeriod] ?? Object.fromEntries(periodFields.map((key) => [key, "0"]))), [field]: value } };
      const nextValues = { ...activeForm.values };
      for (const periodField of periodFields) {
        nextValues[periodField] = String(Object.values(nextPeriods).reduce((sum, period) => sum + Number(period[periodField] || 0), 0));
      }
      next = { ...activeForm, values: nextValues, periods: nextPeriods };
    }
    queueAutosave(activePlayerId, next);
  }

  async function workflow(action: "submit_game" | "verify_game") {
    const pending = Object.values(saveStates).some((state) => ["Unsaved", "Saving", "Conflict", "Error"].includes(state));
    if (pending) {
      setMessage("Wait for every participant to show Saved, and resolve any autosave errors first.");
      return;
    }
    if (!game) return;
    setWorkflowSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, game_id: game.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) setMessage([result.error, ...(result.errors ?? []).slice(1)].filter(Boolean).join(" "));
    else { setMessage(result.message || "Statistics workflow updated."); await load(game.id); }
    setWorkflowSaving(false);
  }

  const totals = useMemo(() => roster.reduce((result, row) => {
    const side = row.team_side === "away" ? "away" : "home";
    result[side] += Number(forms[row.player_id]?.values.points || 0);
    return result;
  }, { home: 0, away: 0 }), [forms, roster]);

  return (
    <main className="min-h-screen bg-black px-4 py-20 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">One shared engine</p><h1 className="mt-2 text-3xl font-black">Game Statistics</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Roster-bound mobile entry for every canonical participant, including guests. Autosave versions prevent accidental overwrites.</p></div>
            {!readOnly ? <div className="flex flex-wrap gap-2"><Link href="/admin/stats/editor" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">Legacy official editor</Link><Link href="/admin/guest-game-stats/legacy" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">Legacy guest records ({legacyCount})</Link></div> : null}
          </div>
          <label className="mt-5 block text-xs font-black uppercase tracking-wider text-zinc-500">Game<select value={selectedGameId} onChange={(event) => void load(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm normal-case text-white"><option value="">Choose game</option>{games.map((item) => <option key={item.id} value={item.id}>{formatDate(item.game_date)} — {gameName(item)}</option>)}</select></label>
        </header>

        {game ? (
          <section className="grid gap-3 rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:grid-cols-4">
            <div className="sm:col-span-2"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Selected game</p><h2 className="mt-1 text-2xl font-black">{gameName(game)}</h2><p className="mt-1 text-sm capitalize text-zinc-500">{game.status} · {game.game_format || "basketball"} · {game.verification_status || "unverified"}</p></div>
            <div className="rounded-2xl bg-black p-4"><p className="text-xs font-black uppercase text-zinc-500">Home points</p><p className="mt-1 text-3xl font-black">{totals.home}<span className="text-sm text-zinc-600"> / {game.home_score ?? game.team_score ?? "—"}</span></p></div>
            <div className="rounded-2xl bg-black p-4"><p className="text-xs font-black uppercase text-zinc-500">Away points</p><p className="mt-1 text-3xl font-black">{totals.away}<span className="text-sm text-zinc-600"> / {game.away_score ?? game.opponent_score ?? "—"}</span></p></div>
          </section>
        ) : null}

        {!entryAllowed && game ? <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Move the game to Live or Completed before entering statistics.</p> : null}
        {readOnly ? <p className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-100">Read-only access: canonical statistics and workflow status are visible, but entry, submission and verification are disabled.</p> : null}
        {message ? <p className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">{message}</p> : null}

        {roster.length ? (
          <>
            <section className="overflow-x-auto rounded-3xl border border-white/10 bg-zinc-950 p-3">
              <div className="flex min-w-max gap-2">{roster.map((row) => {
                const state = saveStates[row.player_id] || "Saved";
                return <button key={row.id} onClick={() => setActivePlayerId(row.player_id)} className={`min-w-40 rounded-2xl border p-3 text-left ${activePlayerId === row.player_id ? "border-orange-400 bg-orange-400/10" : "border-white/10 bg-black"}`}><span className="block text-xs font-black">#{row.person?.jersey_number ?? "—"} {personName(row.person)}</span><span className="mt-1 block text-[10px] uppercase tracking-wider text-zinc-500">{row.person?.player_type || "person"} · {state}</span></button>;
              })}</div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-orange-300">{activeRoster?.team_side || "home"} · {activeRoster?.roster_role || "roster"}</p><h2 className="mt-1 text-2xl font-black">{personName(activeRoster?.person)}</h2></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${saveStates[activePlayerId] === "Saved" || saveStates[activePlayerId] === "Verified" ? "border-emerald-400/25 text-emerald-200" : "border-amber-400/25 text-amber-200"}`}>{saveStates[activePlayerId] || "Saved"}</span></div>

              <div className="mt-5 flex flex-wrap gap-2">{periods.map((period) => <button key={period} onClick={() => setActivePeriod(period)} className={`rounded-xl px-3 py-2 text-xs font-black ${activePeriod === period ? "bg-orange-500 text-black" : "border border-white/10 bg-black text-zinc-400"}`}>{period === "total" ? "Game total" : period}</button>)}</div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{displayedFields.map((field) => {
                const value = activePeriod === "total" ? activeForm?.values[field.field_key] ?? "0" : activeForm?.periods[activePeriod]?.[field.field_key] ?? "0";
                return <label key={field.field_key} className="rounded-2xl bg-black p-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">{field.label}<input type="number" min={field.field_key === "plus_minus" ? undefined : "0"} step={field.data_type === "decimal" ? "0.1" : "1"} disabled={readOnly || !entryAllowed || activeForm?.verified} value={value} onChange={(event) => updateField(field.field_key, event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-2xl font-black normal-case text-white outline-none focus:border-orange-400 disabled:opacity-40" /></label>;
              })}</div>

              {activeForm?.verified ? <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><span>Verified values are locked.</span>{!readOnly ? <Link href={`/admin/corrections?entity_type=stat&entity_id=${encodeURIComponent(activeForm.statId || "")}`} className="font-black underline">Request correction</Link> : null}</div> : null}
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-zinc-950 p-5"><div><p className="font-black">Submission and verification</p><p className="mt-1 text-sm text-zinc-500">Submission validates every rostered line. Verification also reconciles participant points to final scores and locks edits.</p></div><div className="flex flex-wrap gap-2"><button disabled={readOnly || workflowSaving || !entryAllowed} onClick={() => void workflow("submit_game")} className="rounded-xl border border-orange-300/30 px-4 py-2.5 text-sm font-black text-orange-200 disabled:opacity-40">Submit all</button><button disabled={readOnly || workflowSaving || game?.status !== "completed"} onClick={() => void workflow("verify_game")} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-black disabled:opacity-40">Verify and lock</button></div></section>
          </>
        ) : loading ? <p className="rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center text-zinc-500">Loading shared statistics…</p> : <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-10 text-center"><h2 className="text-xl font-black">No eligible roster participants</h2><p className="mt-2 text-sm text-zinc-500">Build the canonical game roster before entering statistics.</p></div>}
      </div>
    </main>
  );
}
