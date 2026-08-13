"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";

type MediaLink = {
  id: string;
  owner_type: string;
  owner_id: string;
  original_owner_type?: string;
  link_role: string;
  game_id?: string | null;
  game_title?: string | null;
  event_id?: string | null;
  event_title?: string | null;
};

type MediaAsset = {
  id: string;
  url: string;
  title?: string | null;
  thumbnail_url?: string | null;
  platform?: string | null;
  media_type: string;
  rights_status: string;
  publish_status: string;
  health_status: string;
  conflict_status: string;
  is_public: boolean;
  subject_count: number;
  updated_at: string;
  metadata?: Record<string, unknown> | null;
  links: MediaLink[];
};

type EventOption = { event_id: string; title: string };
type GameOption = { id: string; event_id?: string | null; title: string; competition_name: string; game_date?: string | null };
type Summary = { total: number; review: number; public: number; broken: number; unlinked: number };

const blankSummary: Summary = { total: 0, review: 0, public: 0, broken: 0, unlinked: 0 };
const control = "h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-orange-400";

function readable(value?: string | null) {
  return String(value || "Not set").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value: string) {
  if (["approved", "published", "healthy", "clear"].includes(value)) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (["restricted", "withdrawn", "expired", "broken", "conflicting_rights"].includes(value)) return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  return "border-amber-400/25 bg-amber-400/10 text-amber-100";
}

function ownerLabel(asset: MediaAsset) {
  const link = asset.links[0];
  if (!link) return "Unlinked media";
  if (link.game_title) return link.game_title;
  if (link.event_title) return link.event_title;
  return `${readable(link.owner_type)} · ${link.owner_id}`;
}

export default function AdminMediaPage() {
  const { readOnly } = useAdminPermission();
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [games, setGames] = useState<GameOption[]>([]);
  const [summary, setSummary] = useState<Summary>(blankSummary);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [gameFilter, setGameFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (state !== "all") params.set("state", state);
    if (gameFilter) params.set("game_id", gameFilter);
    if (eventFilter) params.set("event_id", eventFilter);
    const response = await fetch(`/api/admin/media?${params.toString()}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Media could not be loaded.");
      setMedia([]);
    } else {
      setMedia(result.media ?? []);
      setEvents(result.options?.events ?? []);
      setGames(result.options?.games ?? []);
      setSummary(result.summary ?? blankSummary);
      setMessage("");
    }
    setLoading(false);
  }, [eventFilter, gameFilter, query, state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setGameFilter(params.get("game_id") || "");
      setEventFilter(params.get("event_id") || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleGames = useMemo(
    () => eventFilter ? games.filter((game) => game.event_id === eventFilter) : games,
    [eventFilter, games]
  );

  async function createMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || saving) return;
    const form = new FormData(event.currentTarget);
    const ownerType = String(form.get("owner_type") || "game");
    const ownerId = ownerType === "event" ? String(form.get("event_id") || "") : String(form.get("game_id") || "");
    setSaving(true);
    setMessage("Saving media privately for review…");
    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        url: form.get("url"),
        thumbnail_url: form.get("thumbnail_url"),
        platform: form.get("platform"),
        media_type: form.get("media_type"),
        link_role: form.get("link_role"),
        owner_type: ownerType,
        owner_id: ownerId,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Media could not be saved.");
      return;
    }
    event.currentTarget.reset();
    setShowCreate(false);
    setMessage(result.message || "Media saved.");
    await load();
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || readOnly || saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("Saving governed media review…");
    const response = await fetch("/api/admin/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        title: form.get("title"),
        thumbnail_url: form.get("thumbnail_url"),
        platform: form.get("platform"),
        media_type: form.get("media_type"),
        rights_status: form.get("rights_status"),
        publish_status: form.get("publish_status"),
        health_status: form.get("health_status"),
        conflict_status: form.get("conflict_status"),
        is_public: form.get("is_public") === "on",
        no_identifiable_people_confirmed: form.get("no_identifiable_people_confirmed") === "on",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Media review could not be saved.");
      return;
    }
    setSelected(null);
    setMessage(result.message || "Media review saved.");
    await load();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_58%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Governed content operations</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Media Intelligence Centre</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">One catalogue for full games, highlights, interviews, photographs and event media—linked to the correct owner, reviewed for rights and reflected in operational reports.</p>
            </div>
            {!readOnly ? <button onClick={() => setShowCreate((current) => !current)} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black hover:bg-orange-400">{showCreate ? "Close form" : "Add media"}</button> : null}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["All assets", summary.total, "all"],
            ["Needs review", summary.review, "review"],
            ["Public", summary.public, "public"],
            ["Broken links", summary.broken, "broken"],
            ["Unlinked", summary.unlinked, "unlinked"],
          ].map(([label, value, target]) => <button key={String(label)} onClick={() => setState(String(target))} className={`rounded-2xl border p-4 text-left transition ${state === target ? "border-orange-400/50 bg-orange-400/10" : "border-white/10 bg-zinc-950 hover:border-blue-400/35"}`}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{Number(value).toLocaleString()}</p></button>)}
        </section>

        {showCreate ? <section className="rounded-3xl border border-orange-400/25 bg-zinc-950 p-5 sm:p-7"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">New governed asset</p><h2 className="mt-1 text-2xl font-black">Link media to its source</h2><p className="mt-2 text-sm text-zinc-500">New media is private and pending by default. Publication is a separate rights-and-consent decision.</p></div><form onSubmit={createMedia} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Media title" wide><input name="title" required className={control} placeholder="e.g. Hanss vs BR full game" /></Field><Field label="Media URL" wide><input name="url" type="url" required className={control} placeholder="https://…" /></Field><Field label="Thumbnail URL" wide><input name="thumbnail_url" type="url" className={control} placeholder="Optional image URL" /></Field><Field label="Platform"><select name="platform" className={control}><option>YouTube</option><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Google Drive</option><option>FACKTS Website</option><option>Other</option></select></Field><Field label="Media type"><select name="media_type" defaultValue="video" className={control}><option value="video">Video</option><option value="image">Image</option><option value="audio">Audio</option><option value="document">Document</option><option value="link">Link</option></select></Field><Field label="Media role"><select name="link_role" defaultValue="full_game" className={control}><option value="full_game">Full game</option><option value="highlight">Game highlights</option><option value="interview">Interview</option><option value="recap">Event recap</option><option value="poster">Poster</option><option value="gallery">Gallery</option><option value="attachment">Other attachment</option></select></Field><Field label="Owner type"><select name="owner_type" defaultValue="game" className={control}><option value="game">Game</option><option value="event">Event</option></select></Field><Field label="Game"><select name="game_id" className={control}><option value="">Choose game</option>{games.map((game) => <option key={game.id} value={game.id}>{game.title} · {game.competition_name}</option>)}</select></Field><Field label="Event"><select name="event_id" className={control}><option value="">Choose event</option>{events.map((item) => <option key={item.event_id} value={item.event_id}>{item.title}</option>)}</select></Field><div className="flex items-end md:col-span-2 xl:col-span-4"><button disabled={saving} className="min-h-12 w-full rounded-xl bg-orange-500 px-6 text-sm font-black text-black disabled:opacity-50 sm:ml-auto sm:w-auto">{saving ? "Saving…" : "Save private asset"}</button></div></form></section> : null}

        {message ? <p className="rounded-2xl border border-blue-400/25 bg-blue-400/10 p-4 text-sm text-blue-100">{message}</p> : null}

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, platform, game or event" className={`${control} xl:col-span-2`} />
            <select value={state} onChange={(event) => setState(event.target.value)} className={control}><option value="all">All workflow states</option><option value="review">Needs review</option><option value="public">Public</option><option value="broken">Broken</option><option value="unlinked">Unlinked</option></select>
            <select value={eventFilter} onChange={(event) => { setEventFilter(event.target.value); setGameFilter(""); }} className={control}><option value="">All events</option>{events.map((item) => <option key={item.event_id} value={item.event_id}>{item.title}</option>)}</select>
            <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)} className={control}><option value="">All games</option>{visibleGames.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}</select>
          </div>
        </section>

        {loading ? <div className="rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center text-zinc-500">Loading governed media…</div> : media.length ? <section className="grid gap-4 xl:grid-cols-2">{media.map((asset) => <article key={asset.id} className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"><div className="grid sm:grid-cols-[10rem_minmax(0,1fr)]">{asset.thumbnail_url ? <img src={asset.thumbnail_url} alt="" className="h-44 w-full bg-black object-cover sm:h-full" /> : <div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-500/15 to-orange-500/10 text-xs font-black uppercase tracking-[0.2em] text-zinc-600 sm:h-full">{asset.media_type}</div>}<div className="min-w-0 p-5"><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusTone(asset.rights_status)}`}>Rights {readable(asset.rights_status)}</span><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusTone(asset.publish_status)}`}>{readable(asset.publish_status)}</span><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusTone(asset.health_status)}`}>{readable(asset.health_status)}</span>{asset.is_public ? <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-[9px] font-black uppercase text-blue-100">Public</span> : null}</div><h2 className="mt-3 truncate text-xl font-black">{asset.title || "Untitled media"}</h2><p className="mt-1 truncate text-sm text-zinc-400">{ownerLabel(asset)}</p><p className="mt-2 text-xs text-zinc-600">{asset.platform || "Platform not set"} · {readable(asset.links[0]?.link_role || asset.media_type)} · {asset.subject_count} identified subject{asset.subject_count === 1 ? "" : "s"}</p><div className="mt-4 flex flex-wrap gap-2"><a href={asset.url} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:border-blue-300/50">Open asset</a>{!readOnly ? <button onClick={() => setSelected(asset)} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-black">Review & publish</button> : null}</div></div></div></article>)}</section> : <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-12 text-center"><h2 className="text-xl font-black">No media matches this view</h2><p className="mt-2 text-sm text-zinc-500">Clear filters or add a new governed media asset.</p></div>}

        {selected ? <section className="fixed inset-0 z-[140] overflow-y-auto bg-black/85 p-4 backdrop-blur-md"><button type="button" aria-label="Close review" onClick={() => setSelected(null)} className="fixed inset-0" /><div className="relative mx-auto my-8 max-w-4xl rounded-[2rem] border border-blue-400/20 bg-[#061329] p-5 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Governed review</p><h2 className="mt-2 text-2xl font-black">{selected.title || "Untitled media"}</h2><p className="mt-2 text-sm text-zinc-400">{ownerLabel(selected)}</p></div><button onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black">Close</button></div><form onSubmit={saveReview} className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Title" wide><input name="title" defaultValue={selected.title || ""} className={control} /></Field><Field label="Thumbnail URL" wide><input name="thumbnail_url" type="url" defaultValue={selected.thumbnail_url || ""} className={control} /></Field><Field label="Platform"><input name="platform" defaultValue={selected.platform || ""} className={control} /></Field><Field label="Media type"><select name="media_type" defaultValue={selected.media_type} className={control}><option value="video">Video</option><option value="image">Image</option><option value="audio">Audio</option><option value="document">Document</option><option value="link">Link</option><option value="other">Other</option></select></Field><Field label="Rights status"><select name="rights_status" defaultValue={selected.rights_status} className={control}><option value="unknown">Unknown</option><option value="pending">Pending evidence</option><option value="approved">Approved</option><option value="restricted">Restricted</option><option value="expired">Expired</option><option value="withdrawn">Withdrawn</option></select></Field><Field label="Publication workflow"><select name="publish_status" defaultValue={selected.publish_status} className={control}><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="archived">Archived</option></select></Field><Field label="Link health"><select name="health_status" defaultValue={selected.health_status} className={control}><option value="unchecked">Unchecked</option><option value="healthy">Healthy</option><option value="warning">Warning</option><option value="broken">Broken</option></select></Field><Field label="Conflict status"><select name="conflict_status" defaultValue={selected.conflict_status} className={control}><option value="needs_review">Needs review</option><option value="clear">Clear</option><option value="conflicting_rights">Conflicting rights</option><option value="duplicate_candidate">Duplicate candidate</option></select></Field><label className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-black px-4 text-sm font-bold"><input name="is_public" type="checkbox" defaultChecked={selected.is_public} className="h-5 w-5 accent-orange-500" /> Make public after every safeguard passes</label><label className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-black px-4 text-sm font-bold"><input name="no_identifiable_people_confirmed" type="checkbox" defaultChecked={selected.metadata?.no_identifiable_people_confirmed === true} className="h-5 w-5 accent-orange-500" /> Confirm no identifiable people appear</label><div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100 sm:col-span-2">A Game asset automatically inherits its roster as identified subjects. Public publication requires approved rights and current evidence-backed consent for every identified person.</div><div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black">Cancel</button><button disabled={saving} className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-black text-black disabled:opacity-50">{saving ? "Saving…" : "Save governed review"}</button></div></form></div></section> : null}
      </div>
    </main>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 ${wide ? "md:col-span-2 xl:col-span-2" : ""}`}><span className="mb-2 block">{label}</span>{children}</label>;
}
