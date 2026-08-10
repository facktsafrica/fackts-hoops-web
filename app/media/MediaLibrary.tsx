"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MediaFilter, MediaLibraryItem } from "./mediaTypes";

const FULL_GAME_FILTERS: MediaFilter[] = ["Court Takeovers", "Friendlies", "1v1s"];
const FILTERS: MediaFilter[] = ["All", ...FULL_GAME_FILTERS, "Highlights", "Interviews", "Stories", "Training", "Other"];

type Player =
  | { kind: "iframe"; src: string; generic?: boolean }
  | { kind: "video"; src: string };

function cleanUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function playerFor(value: string): Player {
  const raw = cleanUrl(value);
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    if (/\.(mp4|webm|ogg|mov)(?:$|\?)/i.test(raw)) return { kind: "video", src: raw };
    if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const id = host === "youtu.be" ? parts[0] : url.searchParams.get("v") || (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : "");
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&autoplay=1` };
    }
    if (host.endsWith("vimeo.com")) {
      const id = [...parts].reverse().find((part) => /^\d+$/.test(part));
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}?autoplay=1` };
    }
    if (host.endsWith("tiktok.com")) {
      const index = parts.indexOf("video");
      const id = index >= 0 ? parts[index + 1] : "";
      if (id) return { kind: "iframe", src: `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?autoplay=1&controls=1` };
    }
    if (host.endsWith("instagram.com")) {
      const type = parts[0];
      const code = parts[1];
      if (["p", "reel", "tv"].includes(type) && code) return { kind: "iframe", src: `https://www.instagram.com/${type}/${encodeURIComponent(code)}/embed/captioned/` };
    }
    if (host.endsWith("facebook.com") || host === "fb.watch") return { kind: "iframe", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&autoplay=true&width=1280` };
    if (host.endsWith("dailymotion.com") || host === "dai.ly") {
      const id = host === "dai.ly" ? parts[0] : parts[0] === "video" ? parts[1] : "";
      if (id) return { kind: "iframe", src: `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}?autoplay=1` };
    }
    if (host === "drive.google.com") {
      const index = parts.indexOf("d");
      const id = index >= 0 ? parts[index + 1] : url.searchParams.get("id");
      if (id) return { kind: "iframe", src: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` };
    }
    if (host.endsWith("streamable.com") && parts[0]) return { kind: "iframe", src: `https://streamable.com/e/${encodeURIComponent(parts[0])}?autoplay=1` };
    if ((host === "x.com" || host.endsWith("twitter.com")) && parts.includes("status")) {
      const id = parts[parts.indexOf("status") + 1];
      if (id) return { kind: "iframe", src: `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}` };
    }
  } catch {
    return { kind: "iframe", src: raw, generic: true };
  }
  return { kind: "iframe", src: raw, generic: true };
}

function formatDate(value: string) {
  if (!value) return "Published media";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Published media";
  return date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MediaLibrary({ items, initialQuery = "" }: { items: MediaLibraryItem[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<MediaFilter>("All");
  const [competition, setCompetition] = useState("All competitions");
  const [active, setActive] = useState<MediaLibraryItem | null>(null);

  const competitions = useMemo(() => [
    "All competitions",
    ...Array.from(new Set(items.map((item) => item.competition).filter(Boolean))).sort(),
  ], [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "All" && item.filter !== filter) return false;
      if (competition !== "All competitions" && item.competition !== competition) return false;
      if (!needle) return true;
      return [item.title, item.description, item.mediaType, item.platform, item.sourceLabel, item.competition]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [competition, filter, items, query]);

  const featured = items.find((item) => item.featured) || items[0] || null;
  const fullGames = items.filter((item) => FULL_GAME_FILTERS.includes(item.filter)).length;
  const connectedRecords = new Set(items.map((item) => `${item.sourceKind}-${item.sourceHref}`)).size;

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setActive(null);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [active]);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#020712] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(249,115,22,.2),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(37,99,235,.18),transparent_34%),linear-gradient(135deg,#020617_0%,#071b35_52%,#020617_100%)]" />
        <div className="absolute inset-0 opacity-[.055] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-9 sm:px-6 sm:py-14 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="inline-flex rounded-full border border-orange-400/35 bg-orange-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[.22em] text-orange-300">FACKTS Media Network</p>
            <h1 className="mt-5 max-w-2xl text-4xl font-black uppercase leading-[.92] tracking-[-.045em] sm:text-6xl lg:text-7xl">Every game.<br/><span className="text-orange-400">Every story.</span><br/>One library.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">Watch FACKTS coverage without hunting through separate pages. Full games, highlights, interviews and basketball stories stay connected to the people and competitions behind them.</p>
            <div className="mt-7 grid grid-cols-3 gap-2">
              <HeroStat value={String(items.length)} label="Videos" />
              <HeroStat value={String(fullGames)} label="Full games" />
              <HeroStat value={String(connectedRecords)} label="Records linked" />
            </div>
          </div>

          {featured ? (
            <button type="button" onClick={() => setActive(featured)} className="group relative overflow-hidden rounded-[1.7rem] border border-white/15 bg-black text-left shadow-2xl shadow-black/50" aria-label={`Play ${featured.title}`}>
              <div className="relative aspect-video overflow-hidden">
                {featured.thumbnailUrl ? <img src={featured.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.035]" /> : <div className="h-full w-full bg-gradient-to-br from-blue-950 via-slate-950 to-orange-950" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-2 text-[8px] font-black uppercase tracking-[.15em] text-black">Featured now</span>
                <span className="absolute inset-0 grid place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full border border-white/30 bg-white/90 pl-1 text-2xl text-black shadow-2xl transition group-hover:scale-110">▶</span></span>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">{featured.mediaType} · {featured.platform}</p>
                  <h2 className="mt-2 max-w-2xl text-2xl font-black uppercase leading-tight sm:text-4xl">{featured.title}</h2>
                  <p className="mt-2 text-xs font-bold text-zinc-300">{featured.sourceLabel}</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="grid aspect-video place-items-center rounded-[1.7rem] border border-dashed border-white/15 bg-black/35 p-8 text-center text-sm text-zinc-400">Published FACKTS videos will appear here automatically.</div>
          )}
        </div>
      </section>

      <section className="sticky top-[72px] z-30 border-b border-white/10 bg-[#020712]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <span className="sr-only">Search media</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a player, game, team, event or video…" className="h-12 w-full rounded-xl border border-white/10 bg-white/[.06] px-4 pr-12 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-orange-400/60" />
              {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10" aria-label="Clear search">×</button> : <span className="absolute right-4 top-3 text-lg text-zinc-600">⌕</span>}
            </label>
            <select value={competition} onChange={(event) => setCompetition(event.target.value)} className="h-12 min-w-56 rounded-xl border border-white/10 bg-slate-950 px-4 text-xs font-black uppercase text-white outline-none focus:border-orange-400/60" aria-label="Filter by competition">
              {competitions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[.1em] transition ${filter === item ? "bg-orange-500 text-black" : "border border-white/10 bg-white/[.04] text-zinc-400 hover:border-orange-400/40 hover:text-white"}`}>{item}</button>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">Watch inside FACKTS</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">{filter === "All" ? "Latest media" : filter}</h2>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-zinc-600">{filtered.length} {filtered.length === 1 ? "video" : "videos"} found</p>
        </div>

        {filtered.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => <MediaCard key={item.id} item={item} onPlay={() => setActive(item)} />)}
          </div>
        ) : (
          <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/15 bg-white/[.025] px-6 py-14 text-center">
            <p className="text-base font-black uppercase">No matching media</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Clear the search or choose another category. New videos appear here as soon as they are published in their game, player, team, event or Media Admin record.</p>
            <button type="button" onClick={() => { setQuery(""); setFilter("All"); setCompetition("All competitions"); }} className="mt-5 rounded-full bg-orange-500 px-5 py-3 text-[9px] font-black uppercase tracking-[.12em] text-black">Show all media</button>
          </div>
        )}
      </section>

      <section className="border-t border-white/10 bg-[#07162b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">Bring your competition to life</p><h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">Stats tell the result. Media makes people care.</h2></div>
          <Link href="/book-coverage" className="shrink-0 rounded-full bg-orange-500 px-6 py-3 text-center text-[10px] font-black uppercase tracking-[.12em] text-black">Book coverage</Link>
        </div>
      </section>

      {active ? <MediaModal item={active} onClose={() => setActive(null)} /> : null}
    </main>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-4"><p className="text-xl font-black text-orange-300 sm:text-3xl">{value}</p><p className="mt-1 text-[7px] font-black uppercase tracking-[.12em] text-zinc-500 sm:text-[9px]">{label}</p></div>;
}

function MediaCard({ item, onPlay }: { item: MediaLibraryItem; onPlay: () => void }) {
  return <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 transition hover:border-orange-400/45">
    <button type="button" onClick={onPlay} className="relative block aspect-video w-full overflow-hidden bg-black text-left" aria-label={`Play ${item.title}`}>
      {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-90" /> : <span className="block h-full w-full bg-gradient-to-br from-blue-950 via-slate-950 to-orange-950/60" />}
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.12em] text-white backdrop-blur">{item.platform}</span>
      <span className="absolute inset-0 grid place-items-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-orange-500 pl-0.5 text-base text-black shadow-xl transition group-hover:scale-110">▶</span></span>
      <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.12em] text-orange-300">{item.mediaType}</span>
    </button>
    <div className="p-4">
      <div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate text-[8px] font-black uppercase tracking-[.12em] text-orange-300">{item.competition}</p><p className="shrink-0 text-[8px] font-bold text-zinc-600">{formatDate(item.publishedAt)}</p></div>
      <h3 className="mt-2 line-clamp-2 text-lg font-black uppercase leading-tight">{item.title}</h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{item.description || `${item.sourceKind} media from ${item.sourceLabel}`}</p>
      <Link href={item.sourceHref} className="mt-4 inline-flex text-[8px] font-black uppercase tracking-[.12em] text-zinc-300 hover:text-orange-300">Open {item.sourceKind.toLowerCase()} record →</Link>
    </div>
  </article>;
}

function MediaModal({ item, onClose }: { item: MediaLibraryItem; onClose: () => void }) {
  const player = playerFor(item.url);
  return <div className="fixed inset-0 z-[180] overflow-y-auto bg-black/90 p-3 backdrop-blur-lg sm:p-6" role="dialog" aria-modal="true" aria-label={`Playing ${item.title}`}>
    <button type="button" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" aria-label="Close video" />
    <div className="relative mx-auto my-4 max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#050b16] shadow-2xl sm:my-8">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-[9px] font-black uppercase tracking-[.14em] text-orange-300">{item.mediaType} · {item.platform}</p>
        <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-xl text-white hover:bg-white/10" aria-label="Close video">×</button>
      </div>
      <div className="aspect-video bg-black">
        {player.kind === "video" ? <video src={player.src} title={item.title} className="h-full w-full object-contain" controls autoPlay playsInline preload="metadata" /> : <iframe src={player.src} title={item.title} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox={player.generic ? "allow-scripts allow-same-origin allow-presentation allow-popups" : undefined} />}
      </div>
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">{item.competition}</p><h2 className="mt-2 text-2xl font-black uppercase leading-tight sm:text-4xl">{item.title}</h2>{item.description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{item.description}</p> : null}<p className="mt-3 text-[8px] font-bold uppercase tracking-[.1em] text-zinc-600">{item.rightsStatus}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><Link href={item.sourceHref} onClick={onClose} className="rounded-full bg-orange-500 px-5 py-3 text-center text-[9px] font-black uppercase tracking-[.1em] text-black">Open connected record</Link><a href={item.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-5 py-3 text-center text-[9px] font-black uppercase tracking-[.1em] text-white">Original source</a></div>
      </div>
    </div>
  </div>;
}
