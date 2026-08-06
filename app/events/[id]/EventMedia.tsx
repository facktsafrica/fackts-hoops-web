"use client";

import { useState } from "react";

type MediaRow = {
  id: string;
  title: string;
  subtitle: string | null;
  details: string | null;
  division: string | null;
  url: string | null;
  image_url: string | null;
};

type Player =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string }
  | { kind: "unavailable" };

function cleanUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function mediaPlayer(value: string | null): Player {
  if (!value) return { kind: "unavailable" };

  try {
    const raw = cleanUrl(value);
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    if (/\.(mp4|webm|ogg|mov)(?:$|\?)/i.test(raw)) return { kind: "video", src: raw };

    if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const id = host === "youtu.be"
        ? parts[0]
        : url.searchParams.get("v") || (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live" ? parts[1] : "");
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
    }

    if (host.endsWith("vimeo.com")) {
      const id = [...parts].reverse().find((part) => /^\d+$/.test(part));
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }

    if (host.endsWith("tiktok.com")) {
      const videoIndex = parts.indexOf("video");
      const id = videoIndex >= 0 ? parts[videoIndex + 1] : "";
      if (id) return { kind: "iframe", src: `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?autoplay=0&controls=1` };
    }

    if (host.endsWith("instagram.com")) {
      const type = parts[0];
      const code = parts[1];
      if (["p", "reel", "tv"].includes(type) && code) {
        return { kind: "iframe", src: `https://www.instagram.com/${type}/${encodeURIComponent(code)}/embed/captioned/` };
      }
    }

    if (host.endsWith("facebook.com") || host === "fb.watch") {
      return { kind: "iframe", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=1280` };
    }

    if (host === "drive.google.com") {
      const fileIndex = parts.indexOf("d");
      const id = fileIndex >= 0 ? parts[fileIndex + 1] : url.searchParams.get("id");
      if (id) return { kind: "iframe", src: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` };
    }

    if (host.endsWith("streamable.com") && parts[0]) {
      return { kind: "iframe", src: `https://streamable.com/e/${encodeURIComponent(parts[0])}` };
    }

    if (host.endsWith("dailymotion.com") || host === "dai.ly") {
      const id = host === "dai.ly" ? parts[0] : parts[0] === "video" ? parts[1] : "";
      if (id) return { kind: "iframe", src: `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}` };
    }
  } catch {
    return { kind: "unavailable" };
  }

  return { kind: "unavailable" };
}

function VideoCard({ row }: { row: MediaRow }) {
  const [playing, setPlaying] = useState(false);
  const player = mediaPlayer(row.url);

  return <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950 transition hover:border-orange-400/50">
    <div className="relative aspect-video overflow-hidden bg-black">
      {playing && player.kind === "iframe" ? <iframe src={player.src} title={row.title} className="h-full w-full border-0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : null}
      {playing && player.kind === "video" ? <video src={player.src} title={row.title} className="h-full w-full bg-black object-contain" controls autoPlay playsInline preload="metadata" /> : null}
      {!playing ? <button type="button" onClick={() => setPlaying(true)} disabled={player.kind === "unavailable"} className="relative h-full w-full disabled:cursor-not-allowed" aria-label={`Play ${row.title}`}>
        {row.image_url ? <img src={row.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="block h-full w-full bg-gradient-to-br from-blue-950 to-orange-950/60" />}
        <span className="absolute inset-0 bg-black/20" />
        <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-lg text-black shadow-xl">▶</span></span>
        {player.kind === "unavailable" ? <span className="absolute inset-x-3 bottom-3 rounded-lg bg-black/80 px-3 py-2 text-[10px] font-bold text-zinc-200">This platform does not permit embedded playback for this link.</span> : null}
      </button> : null}
    </div>
    <div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">{row.subtitle || row.division || "Event video"}</p><h3 className="mt-2 break-words text-lg font-black uppercase leading-tight">{row.title}</h3>{row.details ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{row.details}</p> : null}</div>
  </article>;
}

export default function EventMedia({ media, gallery, searching }: { media: MediaRow[]; gallery: MediaRow[]; searching: boolean }) {
  return <section id="media" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-12 sm:px-6 lg:px-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Watch and relive</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">Event media</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Highlights, full games, interviews, speeches and approved photography from this event.</p></div><span className="shrink-0 text-[9px] font-black uppercase text-zinc-600">{media.length} videos · {gallery.length} photos</span></div>{media.length || gallery.length ? <><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{media.map((row) => <VideoCard key={row.id} row={row} />)}</div>{gallery.length ? <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{gallery.map((row) => <a key={row.id} href={row.url || row.image_url || undefined} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-slate-900 sm:rounded-2xl">{row.image_url ? <img src={row.image_url} alt={row.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"/><p className="absolute inset-x-3 bottom-3 break-words text-[10px] font-black uppercase leading-4 sm:text-xs">{row.title}</p></a>)}</div> : null}</> : <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/70 px-6 py-10 text-center"><p className="text-sm font-black uppercase text-zinc-200">{searching ? "No matching event media" : "Media coming soon"}</p><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-zinc-500">{searching ? "Clear the search to view all published media." : "Highlights, interviews, full games and approved photos will appear here after they are published in Events Admin."}</p></div>}</section>;
}
