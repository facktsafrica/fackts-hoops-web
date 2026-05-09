"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MediaStory = {
  id: string;
  category: string;
  story_type: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  youtube_url: string;
  video_id: string | null;
  playlist_id: string | null;
  thumbnail_url: string | null;
  display_order: number;
  is_active: boolean;
};

function getThumbnail(story: MediaStory) {
  if (story.thumbnail_url) return story.thumbnail_url;
  if (story.video_id) return `https://img.youtube.com/vi/${story.video_id}/hqdefault.jpg`;
  return "/logos/fackts-hoops-logo.png";
}

function getEmbedUrl(story: MediaStory) {
  if (story.playlist_id) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${story.playlist_id}&rel=0&modestbranding=1`;
  }

  if (story.video_id) {
    return `https://www.youtube-nocookie.com/embed/${story.video_id}?rel=0&modestbranding=1&autoplay=1`;
  }

  return null;
}

export default function FacktsStories() {
  const [stories, setStories] = useState<MediaStory[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStories() {
    setLoading(true);

    const { data, error } = await supabase
      .from("media_stories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setStories([]);
    } else {
      setStories((data ?? []) as MediaStory[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStories();
  }, []);

  if (loading) {
    return (
      <section
        id="media-stories"
        className="border-t border-slate-800 bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading media stories...
          </div>
        </div>
      </section>
    );
  }

  if (stories.length === 0) {
    return (
      <section
        id="media-stories"
        className="border-t border-slate-800 bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              Media & Player Stories
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Watch the stories behind the game.
            </h2>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No active media stories have been published yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="media-stories"
      className="border-t border-slate-800 bg-slate-950"
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              Media & Player Stories
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Watch the stories behind the game.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
              Player interviews, game highlights, Court Takeover episodes,
              documentaries, player health conversations, and behind-the-scenes
              basketball culture from FACKTS Hoops.
            </p>
          </div>

          <a
            href="https://www.youtube.com/@facktsNBA"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-orange-500/40 px-4 py-3 text-sm font-bold text-orange-300 transition hover:bg-orange-500/10"
          >
            Open YouTube Channel
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => {
            const canEmbed = Boolean(story.video_id || story.playlist_id);
            const isPlaying = activeStoryId === story.id;
            const embedUrl = getEmbedUrl(story);

            return (
              <article
                key={story.id}
                className={`group overflow-hidden rounded-3xl border bg-slate-900 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-orange-950/20 ${
                  isPlaying
                    ? "border-orange-400/50"
                    : "border-slate-800 hover:border-orange-400/40"
                }`}
              >
                <div className="relative overflow-hidden bg-slate-950">
                  {isPlaying && embedUrl ? (
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        key={embedUrl}
                        src={embedUrl}
                        title={story.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  ) : (
                    <div className="relative h-52 overflow-hidden bg-slate-950">
                      <img
                        src={getThumbnail(story)}
                        alt={story.title}
                        className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

                      <div className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                        {story.story_type}
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                          {story.category}
                        </div>

                        <h3 className="mt-1 text-xl font-black leading-tight text-white">
                          {story.title}
                        </h3>

                        {story.subtitle ? (
                          <p className="mt-1 text-sm text-slate-300">
                            {story.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {isPlaying ? (
                    <div className="mb-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3">
                      <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                        Now Playing
                      </div>

                      <h3 className="mt-1 text-lg font-black text-white">
                        {story.title}
                      </h3>

                      {story.subtitle ? (
                        <p className="mt-1 text-sm text-slate-300">
                          {story.subtitle}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {story.description ? (
                    <p className="text-sm leading-6 text-slate-400">
                      {story.description}
                    </p>
                  ) : (
                    <p className="text-sm leading-6 text-slate-500">
                      No description added yet.
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {canEmbed ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStoryId(isPlaying ? null : story.id)
                        }
                        className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                          isPlaying
                            ? "border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                            : "bg-orange-500 text-slate-950 hover:bg-orange-400"
                        }`}
                      >
                        {isPlaying ? "Close Player" : "Watch Inside App"}
                      </button>
                    ) : null}

                    <a
                      href={story.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                    >
                      Open on YouTube
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}