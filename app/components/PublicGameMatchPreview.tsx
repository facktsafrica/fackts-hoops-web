"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GamePreview = {
  id: string;
  opponent: string | null;
  game_date: string | null;
  venue: string | null;
  match_type: string | null;
  preview_headline: string | null;
  preview_story: string | null;
  players_to_watch: string | null;
  preview_image_url: string | null;
  preview_video_url: string | null;
  preview_is_active: boolean | null;
};

function getGameIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "games" && parts[1]) {
    return parts[1];
  }

  return "";
}

function getVideoEmbedUrl(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "").split("?")[0];
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      }

      if (parsed.pathname.includes("/shorts/")) {
        const shortId = parsed.pathname.split("/shorts/")[1]?.split("/")[0];

        if (shortId) {
          return `https://www.youtube-nocookie.com/embed/${shortId}?rel=0&modestbranding=1`;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function PublicGameMatchPreview() {
  const pathname = usePathname();

  const gameId = useMemo(() => getGameIdFromPath(pathname), [pathname]);

  const [game, setGame] = useState<GamePreview | null>(null);
  const [loading, setLoading] = useState(false);

  const shouldLoad =
    pathname.startsWith("/games/") &&
    !pathname.startsWith("/games/id") &&
    gameId.length > 10;

  useEffect(() => {
    async function loadPreview() {
      if (!shouldLoad) {
        setGame(null);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("games")
        .select(
          `
          id,
          opponent,
          game_date,
          venue,
          match_type,
          preview_headline,
          preview_story,
          players_to_watch,
          preview_image_url,
          preview_video_url,
          preview_is_active
        `
        )
        .eq("id", gameId)
        .maybeSingle();

      if (error || !data) {
        setGame(null);
      } else {
        setGame(data as GamePreview);
      }

      setLoading(false);
    }

    loadPreview();
  }, [gameId, shouldLoad]);

  if (!shouldLoad || loading || !game) {
    return null;
  }

  const hasPreview =
    game.preview_is_active !== false &&
    (game.preview_headline ||
      game.preview_story ||
      game.players_to_watch ||
      game.preview_image_url ||
      game.preview_video_url);

  if (!hasPreview) {
    return null;
  }

  const embedUrl = getVideoEmbedUrl(game.preview_video_url);

  return (
    <section className="border-b border-slate-800 bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 md:p-6">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Match Preview
          </div>

          <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
            {game.preview_headline ?? "The game story is loading."}
          </h2>

          {game.preview_story ? (
            <p className="mt-5 text-sm leading-7 text-slate-300 md:text-base">
              {game.preview_story}
            </p>
          ) : null}

          {game.players_to_watch ? (
            <div className="mt-6 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Players To Watch
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                {game.players_to_watch}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          {game.preview_image_url ? (
            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
              <img
                src={game.preview_image_url}
                alt="Match preview"
                className="h-72 w-full object-cover md:h-96"
              />
            </div>
          ) : null}

          {embedUrl ? (
            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-black shadow-xl shadow-black/20">
              <iframe
                src={embedUrl}
                title="Match preview video"
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : game.preview_video_url ? (
            <a
              href={game.preview_video_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-sm font-bold text-orange-300 transition hover:border-orange-500/40"
            >
              Watch preview video
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}