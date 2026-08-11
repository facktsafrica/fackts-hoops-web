"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  formatGameDate,
  getAwayScore,
  getAwayTeam,
  getCompetition,
  getGameDate,
  getGameFormat,
  getGameStatus,
  getGameTitle,
  getHomeScore,
  getHomeTeam,
  getStage,
  getStatusLabel,
  parsePeriodScores,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";

type EventRow = {
  event_id: string;
  title: string;
};

type GameForm = {
  title: string;
  event_id: string;
  competition_name: string;
  home_team_name: string;
  away_team_name: string;
  game_format: string;
  game_stage: string;
  game_date: string;
  venue: string;
  court: string;
  location: string;
  status: string;
  home_score: string;
  away_score: string;
  period_scores: string;
  officials: string;
  table_officials: string;
  home_roster: string;
  away_roster: string;
  poster_url: string;
  video_url: string;
  highlight_url: string;
  verification_status: string;
  verified_by: string;
  correction_status: string;
  correction_note: string;
  notes: string;
  is_public: boolean;
};

const emptyForm: GameForm = {
  title: "",
  event_id: "",
  competition_name: "FACKTS Hoops",
  home_team_name: "FACKTS",
  away_team_name: "",
  game_format: "5v5",
  game_stage: "Game",
  game_date: "",
  venue: "",
  court: "",
  location: "",
  status: "upcoming",
  home_score: "",
  away_score: "",
  period_scores: "",
  officials: "",
  table_officials: "",
  home_roster: "",
  away_roster: "",
  poster_url: "",
  video_url: "",
  highlight_url: "",
  verification_status: "unverified",
  verified_by: "",
  correction_status: "none",
  correction_note: "",
  notes: "",
  is_public: true,
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function periodsToText(value: unknown) {
  return parsePeriodScores(value)
    .map((period) => `${period.label}: ${period.home ?? ""}-${period.away ?? ""}`)
    .join("\n");
}

function parsePeriods(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([^:]+):\s*(-?\d+)\s*[-–]\s*(-?\d+)$/);
      if (!match) throw new Error(`Period line ${index + 1} must look like: Q1: 18-14`);
      return { label: match[1].trim(), home: Number(match[2]), away: Number(match[3]) };
    });
}

export default function LegacyGameEditorPage() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => new Date(getGameDate(b) || 0).getTime() - new Date(getGameDate(a) || 0).getTime()),
    [games]
  );

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const [gamesResult, eventsResult] = await Promise.all([
      supabase.from("games").select("*").order("game_date", { ascending: false }),
      supabase.from("event_case_studies").select("event_id,title").order("start_date", { ascending: false }),
    ]);

    if (gamesResult.error) {
      setErrorMessage(gamesResult.error.message);
      setGames([]);
    } else {
      setGames((gamesResult.data || []) as GameRecord[]);
    }

    setEvents((eventsResult.data || []) as EventRow[]);
    setLoading(false);
  }

  function update(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function reset() {
    setForm(emptyForm);
    setPosterFile(null);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
  }

  function startEdit(game: GameRecord) {
    setEditingId(game.id);
    setPosterFile(null);
    setMessage("");
    setErrorMessage("");
    setForm({
      title: getGameTitle(game),
      event_id: game.event_id || "",
      competition_name: getCompetition(game),
      home_team_name: getHomeTeam(game),
      away_team_name: getAwayTeam(game) === "Opponent" ? "" : getAwayTeam(game),
      game_format: getGameFormat(game),
      game_stage: getStage(game),
      game_date: toDateTimeLocal(getGameDate(game)),
      venue: game.venue || "",
      court: game.court || "",
      location: game.location || "",
      status: getGameStatus(game),
      home_score: String(getHomeScore(game) ?? ""),
      away_score: String(getAwayScore(game) ?? ""),
      period_scores: periodsToText(game.period_scores),
      officials: game.officials || "",
      table_officials: game.table_officials || "",
      home_roster: game.home_roster || "",
      away_roster: game.away_roster || "",
      poster_url: game.poster_url || game.game_poster_url || game.image_url || "",
      video_url: game.video_url || game.game_video_url || "",
      highlight_url: game.highlight_url || "",
      verification_status: game.verification_status || "unverified",
      verified_by: game.verified_by || "",
      correction_status: game.correction_status || "none",
      correction_note: game.correction_note || "",
      notes: game.notes || "",
      is_public: game.is_public !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPoster() {
    if (!posterFile) return form.poster_url;
    const extension = posterFile.name.split(".").pop() || "png";
    const fileName = `game-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const result = await supabase.storage.from("game-posters").upload(fileName, posterFile, { cacheControl: "3600", upsert: false });
    if (result.error) throw new Error(result.error.message);
    return supabase.storage.from("game-posters").getPublicUrl(fileName).data.publicUrl;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!form.home_team_name.trim() || !form.away_team_name.trim()) throw new Error("Add both home and away team names.");
      const periodScores = parsePeriods(form.period_scores);
      const posterUrl = await uploadPoster();
      const homeScore = numberOrNull(form.home_score);
      const awayScore = numberOrNull(form.away_score);
      const gameDate = form.game_date ? new Date(form.game_date).toISOString() : null;
      const now = new Date().toISOString();
      const title = form.title.trim() || `${form.home_team_name.trim()} vs ${form.away_team_name.trim()}`;

      const payload = {
        title,
        game_title: title,
        event_id: form.event_id || null,
        competition_name: form.competition_name.trim() || null,
        home_team_name: form.home_team_name.trim(),
        away_team_name: form.away_team_name.trim(),
        opponent: form.away_team_name.trim(),
        opponent_name: form.away_team_name.trim(),
        team_name: form.away_team_name.trim(),
        game_format: form.game_format.trim() || null,
        match_type: form.game_format.trim() || null,
        game_stage: form.game_stage.trim() || null,
        game_date: gameDate,
        date: gameDate,
        venue: form.venue.trim() || null,
        court: form.court.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        is_upcoming: ["upcoming", "live"].includes(form.status),
        home_score: homeScore,
        team_score: homeScore,
        fackts_score: homeScore,
        away_score: awayScore,
        opponent_score: awayScore,
        period_scores: periodScores,
        officials: form.officials.trim() || null,
        table_officials: form.table_officials.trim() || null,
        home_roster: form.home_roster.trim() || null,
        away_roster: form.away_roster.trim() || null,
        poster_url: posterUrl || null,
        game_poster_url: posterUrl || null,
        image_url: posterUrl || null,
        video_url: form.video_url.trim() || null,
        game_video_url: form.video_url.trim() || null,
        highlight_url: form.highlight_url.trim() || null,
        verification_status: form.verification_status,
        verified_at: form.verification_status === "verified" ? now : null,
        verified_by: form.verification_status === "verified" ? form.verified_by.trim() || "FACKTS Admin" : null,
        correction_status: form.correction_status,
        correction_note: form.correction_note.trim() || null,
        notes: form.notes.trim() || null,
        is_public: form.is_public,
        updated_at: now,
      };

      let gameId = editingId || "";
      if (editingId) {
        const result = await supabase.from("games").update(payload).eq("id", editingId);
        if (result.error) throw new Error(result.error.message);
        setMessage("Game match centre updated.");
      } else {
        const result = await supabase.from("games").insert({ ...payload, created_at: now }).select("id").single();
        if (result.error) throw new Error(result.error.message);
        gameId = result.data.id;
        setMessage("Game created.");
      }

      if (["upcoming", "live"].includes(form.status) && gameId) {
        await fetch("/api/notification-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "admin.game_changed", game_id: gameId }) }).catch(() => undefined);
      }

      setForm(emptyForm);
      setPosterFile(null);
      setEditingId(null);
      await loadPage();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(gameId: string) {
    if (!window.confirm("Delete this game and remove its public match centre?")) return;
    setDeletingId(gameId);
    setErrorMessage("");
    const result = await supabase.from("games").delete().eq("id", gameId);
    if (result.error) setErrorMessage(result.error.message);
    else {
      setMessage("Game deleted.");
      await loadPage();
    }
    setDeletingId(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.2),transparent_35%),linear-gradient(135deg,#07162b,#020617)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">FACKTS Admin</p><h1 className="mt-2 text-4xl font-black uppercase">Games and match centres</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Schedule fixtures, publish results, link events, verify records and control every public game page.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/admin" className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black">Admin home</Link><Link href="/games" className="rounded-xl bg-orange-500 px-4 py-3 text-xs font-black text-black">View public games</Link></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 xl:grid-cols-[470px_1fr] lg:px-8">
        <form onSubmit={save} className="h-fit rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">{editingId ? "Editing record" : "New record"}</p><h2 className="mt-1 text-2xl font-black">{editingId ? "Update game" : "Create game"}</h2></div>{editingId ? <button type="button" onClick={reset} className="rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase">Cancel</button> : null}</div>
          {message ? <Alert color="green">{message}</Alert> : null}
          {errorMessage ? <Alert color="red">{errorMessage}</Alert> : null}

          <div className="mt-5 space-y-5">
            <Field label="Game title"><input name="title" value={form.title} onChange={update} placeholder="Leave blank to use Home Team vs Away Team" className={control} /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Home team"><input name="home_team_name" value={form.home_team_name} onChange={update} className={control} required /></Field><Field label="Away team"><input name="away_team_name" value={form.away_team_name} onChange={update} className={control} required /></Field></div>
            <Field label="Linked event"><select name="event_id" value={form.event_id} onChange={update} className={control}><option value="">Standalone game</option>{events.map((item) => <option key={item.event_id} value={item.event_id}>{item.title}</option>)}</select></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Competition"><input name="competition_name" value={form.competition_name} onChange={update} className={control} /></Field><Field label="Format"><select name="game_format" value={form.game_format} onChange={update} className={control}><option>5v5</option><option>3x3</option><option>1v1</option><option>Training game</option><option>Other</option></select></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Stage / round"><input name="game_stage" value={form.game_stage} onChange={update} placeholder="Group Stage, Game 8, Final" className={control} /></Field><Field label="Status"><select name="status" value={form.status} onChange={update} className={control}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="completed">Completed</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select></Field></div>
            <Field label="Date and time"><input type="datetime-local" name="game_date" value={form.game_date} onChange={update} className={control} /></Field>
            <div className="grid gap-3 sm:grid-cols-3"><Field label="Venue"><input name="venue" value={form.venue} onChange={update} className={control} /></Field><Field label="Court"><input name="court" value={form.court} onChange={update} className={control} /></Field><Field label="Location"><input name="location" value={form.location} onChange={update} className={control} /></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Home score"><input type="number" name="home_score" value={form.home_score} onChange={update} className={control} /></Field><Field label="Away score"><input type="number" name="away_score" value={form.away_score} onChange={update} className={control} /></Field></div>
            <Field label="Period scores"><textarea name="period_scores" value={form.period_scores} onChange={update} placeholder={'Q1: 18-14\nQ2: 16-20\nQ3: 21-17\nQ4: 12-10'} rows={4} className={control} /><Hint>One period per line using “Q1: home-away”.</Hint></Field>

            <details className="rounded-2xl border border-white/10 bg-black/20"><summary className="cursor-pointer px-4 py-4 text-xs font-black uppercase tracking-[.1em] text-orange-300">Rosters and officials</summary><div className="space-y-4 border-t border-white/10 p-4"><Field label="Home roster"><textarea name="home_roster" value={form.home_roster} onChange={update} rows={5} placeholder="One player per line" className={control} /></Field><Field label="Away roster"><textarea name="away_roster" value={form.away_roster} onChange={update} rows={5} placeholder="One player per line" className={control} /></Field><Field label="Game officials"><textarea name="officials" value={form.officials} onChange={update} rows={3} placeholder="One official per line" className={control} /></Field><Field label="Table officials"><textarea name="table_officials" value={form.table_officials} onChange={update} rows={3} placeholder="One official per line" className={control} /></Field></div></details>

            <details className="rounded-2xl border border-white/10 bg-black/20"><summary className="cursor-pointer px-4 py-4 text-xs font-black uppercase tracking-[.1em] text-orange-300">Media and poster</summary><div className="space-y-4 border-t border-white/10 p-4"><Field label="Poster upload"><input type="file" accept="image/*" onChange={(event) => setPosterFile(event.target.files?.[0] || null)} className={control} /></Field><Field label="Poster URL"><input name="poster_url" value={form.poster_url} onChange={update} className={control} /></Field>{form.poster_url ? <img src={form.poster_url} alt="Current poster" className="h-44 w-full rounded-xl object-cover" /> : null}<Field label="Full game video"><input name="video_url" value={form.video_url} onChange={update} placeholder="YouTube, Facebook, Instagram, TikTok or direct video" className={control} /></Field><Field label="Highlights"><input name="highlight_url" value={form.highlight_url} onChange={update} className={control} /></Field></div></details>

            <details className="rounded-2xl border border-white/10 bg-black/20"><summary className="cursor-pointer px-4 py-4 text-xs font-black uppercase tracking-[.1em] text-orange-300">Evidence and corrections</summary><div className="space-y-4 border-t border-white/10 p-4"><Field label="Verification"><select name="verification_status" value={form.verification_status} onChange={update} className={control}><option value="unverified">Unverified</option><option value="pending">Pending verification</option><option value="verified">Verified</option><option value="disputed">Under review</option></select></Field><Field label="Verified by"><input name="verified_by" value={form.verified_by} onChange={update} className={control} /></Field><Field label="Correction status"><select name="correction_status" value={form.correction_status} onChange={update} className={control}><option value="none">No correction</option><option value="open">Correction requested</option><option value="corrected">Corrected</option></select></Field><Field label="Correction note"><textarea name="correction_note" value={form.correction_note} onChange={update} rows={3} className={control} /></Field></div></details>

            <Field label="Public match note"><textarea name="notes" value={form.notes} onChange={update} rows={4} className={control} /></Field>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><input type="checkbox" checked={form.is_public} onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))} className="h-5 w-5 accent-orange-500" /><span><span className="block text-xs font-black uppercase">Publish match centre</span><span className="mt-1 block text-[10px] text-zinc-500">Turn off to keep this game in Admin only.</span></span></label>
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-orange-500 px-5 py-4 text-xs font-black uppercase tracking-[.12em] text-black disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update match centre" : "Create match centre"}</button>
          </div>
        </form>

        <div>
          <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">Game register</p><h2 className="mt-1 text-3xl font-black">{games.length} games</h2></div><div className="flex gap-2"><Link href="/admin/rosters" className="rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black uppercase">Rosters</Link><Link href="/admin/stats" className="rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black uppercase">Stats</Link></div></div>
          {loading ? <div className="rounded-2xl border border-white/10 p-6 text-zinc-500">Loading games...</div> : sortedGames.length ? <div className="space-y-4">{sortedGames.map((game) => <GameAdminCard key={game.id} game={game} editing={editingId === game.id} deleting={deletingId === game.id} onEdit={() => startEdit(game)} onDelete={() => void remove(game.id)} />)}</div> : <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">No games have been created.</div>}
        </div>
      </section>
    </main>
  );
}

const control = "w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-orange-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.1em] text-zinc-400">{label}</span>{children}</label>; }
function Hint({ children }: { children: React.ReactNode }) { return <span className="mt-2 block text-[9px] leading-4 text-zinc-600">{children}</span>; }
function Alert({ children, color }: { children: React.ReactNode; color: "green" | "red" }) { return <div className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${color === "green" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>{children}</div>; }

function GameAdminCard({ game, editing, deleting, onEdit, onDelete }: { game: GameRecord; editing: boolean; deleting: boolean; onEdit: () => void; onDelete: () => void }) {
  return <article className={`overflow-hidden rounded-2xl border bg-slate-900/75 ${editing ? "border-orange-400" : "border-white/10"}`}><div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-orange-500/15 px-3 py-1 text-[8px] font-black uppercase text-orange-300">{getStatusLabel(getGameStatus(game))}</span><span className="rounded-full bg-white/[.05] px-3 py-1 text-[8px] font-black uppercase text-zinc-400">{game.verification_status || "Unverified"}</span>{game.is_public === false ? <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[8px] font-black uppercase text-rose-300">Private</span> : null}</div><h3 className="mt-3 break-words text-xl font-black uppercase">{getHomeTeam(game)} <span className="text-orange-300">{getHomeScore(game) ?? "–"}–{getAwayScore(game) ?? "–"}</span> {getAwayTeam(game)}</h3><p className="mt-2 text-xs text-zinc-500">{formatGameDate(getGameDate(game))} · {game.venue || "Venue TBA"}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.1em] text-blue-300">{getCompetition(game)} · {getStage(game)} · {getGameFormat(game)}</p></div><div className="flex flex-wrap items-start gap-2 md:max-w-[220px] md:justify-end"><Link href={`/games/${game.id}`} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase">View</Link><Link href={`/rosters/${game.id}`} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase">Roster</Link><button type="button" onClick={onEdit} className="rounded-lg bg-orange-500 px-3 py-2 text-[9px] font-black uppercase text-black">Edit</button><button type="button" onClick={onDelete} disabled={deleting} className="rounded-lg border border-red-500/30 px-3 py-2 text-[9px] font-black uppercase text-red-300 disabled:opacity-50">{deleting ? "Deleting" : "Delete"}</button></div></div></article>;
}
