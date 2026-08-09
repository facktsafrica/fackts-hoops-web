"use client";

import { useState } from "react";

export type GameMediaItem = {
  id: string;
  title: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string;
  rightsStatus?: string;
};

type Player =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string }
  | { kind: "unavailable" };

function cleanUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function playerFor(value: string): Player {
  try {
    const raw = cleanUrl(value);
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    if (/\.(mp4|webm|ogg|mov)(?:$|\?)/i.test(raw)) return { kind: "video", src: raw };

    if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const id = host === "youtu.be"
        ? parts[0]
        : url.searchParams.get("v") || (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : "");
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
    }

    if (host.endsWith("vimeo.com")) {
      const id = [...parts].reverse().find((part) => /^\d+$/.test(part));
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }

    if (host.endsWith("tiktok.com")) {
      const index = parts.indexOf("video");
      const id = index >= 0 ? parts[index + 1] : "";
      if (id) return { kind: "iframe", src: `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?autoplay=0&controls=1` };
    }

    if (host.endsWith("instagram.com")) {
      const type = parts[0];
      const code = parts[1];
      if (["p", "reel", "tv"].includes(type) && code) return { kind: "iframe", src: `https://www.instagram.com/${type}/${encodeURIComponent(code)}/embed/captioned/` };
    }

    if (host.endsWith("facebook.com") || host === "fb.watch") {
      return { kind: "iframe", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=1280` };
    }

    if (host === "drive.google.com") {
      const index = parts.indexOf("d");
      const id = index >= 0 ? parts[index + 1] : url.searchParams.get("id");
      if (id) return { kind: "iframe", src: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` };
    }

    if (host.endsWith("streamable.com") && parts[0]) return { kind: "iframe", src: `https://streamable.com/e/${encodeURIComponent(parts[0])}` };
  } catch {
    return { kind: "unavailable" };
  }

  return { kind: "unavailable" };
}

export default function GameMedia({
  items,
  emptyTitle = "Match media coming soon",
  emptyText = "Full games, highlights and approved photos will appear here after publication.",
}: {
  items: GameMediaItem[];
  emptyTitle?: string;
  emptyText?: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/70 px-6 py-10 text-center">
        <p className="text-sm font-black uppercase text-zinc-200">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-zinc-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => <MediaCard key={item.id} item={item} />)}
    </div>
  );
}

function MediaCard({ item }: { item: GameMediaItem }) {
  const [playing, setPlaying] = useState(false);
  const player = playerFor(item.url);

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950 transition hover:border-orange-400/50">
      <div className="relative aspect-video overflow-hidden bg-black">
        {playing && player.kind === "iframe" ? (
          <iframe src={player.src} title={item.title} className="h-full w-full border-0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : null}
        {playing && player.kind === "video" ? (
          <video src={player.src} title={item.title} className="h-full w-full bg-black object-contain" controls autoPlay playsInline preload="metadata" />
        ) : null}
        {!playing ? (
          <button type="button" onClick={() => setPlaying(true)} disabled={player.kind === "unavailable"} className="relative h-full w-full disabled:cursor-not-allowed" aria-label={`Play ${item.title}`}>
            {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="block h-full w-full bg-gradient-to-br from-blue-950 to-orange-950/60" />}
            <span className="absolute inset-0 bg-black/20" />
            <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-lg text-black shadow-xl">▶</span></span>
            {player.kind === "unavailable" ? <span className="absolute inset-x-3 bottom-3 rounded-lg bg-black/80 px-3 py-2 text-[10px] font-bold text-zinc-200">This platform does not permit embedded playback for this link.</span> : null}
          </button>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">{item.mediaType}</p>
        <h3 className="mt-2 break-words text-lg font-black uppercase leading-tight">{item.title}</h3>
        {item.rightsStatus ? <p className="mt-2 text-[9px] font-bold uppercase tracking-[.1em] text-zinc-600">Rights: {item.rightsStatus}</p> : null}
      </div>
    </article>
  );
}
