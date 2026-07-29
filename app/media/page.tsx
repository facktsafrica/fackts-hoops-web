import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type MediaStory = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  label?: string | null;
  category?: string | null;
  story_type?: string | null;
  description?: string | null;
  youtube_url?: string | null;
  video_url?: string | null;
  url?: string | null;
  video_id?: string | null;
  playlist_id?: string | null;
  thumbnail_url?: string | null;
  display_order?: number | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  created_at?: string | null;
};

async function getMediaStories() {
  const { data, error } = await supabase
    .from("media_stories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Media stories error:", error.message);
    return [];
  }

  return (data ?? []) as MediaStory[];
}

function getStoryTitle(story: MediaStory) {
  return story.title || story.label || "Untitled Story";
}

function getStoryUrl(story: MediaStory) {
  return story.youtube_url || story.video_url || story.url || "";
}

function getCategory(story: MediaStory) {
  return story.category || "Media Story";
}

function getStoryType(story: MediaStory) {
  return story.story_type || "Story";
}

function getYouTubeId(url: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").split("?")[0];
    }

    if (parsed.hostname.includes("youtube.com")) {
      const watchId = parsed.searchParams.get("v");

      if (watchId) return watchId;

      if (parsed.pathname.includes("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] ?? "";
      }

      if (parsed.pathname.includes("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? "";
      }
    }

    return "";
  } catch {
    return "";
  }
}

function getEmbedUrl(story: MediaStory) {
  const url = getStoryUrl(story);
  const videoId = story.video_id || getYouTubeId(url);

  if (!videoId) return "";

  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

function getThumbnail(story: MediaStory) {
  if (story.thumbnail_url) return story.thumbnail_url;

  const videoId = story.video_id || getYouTubeId(getStoryUrl(story));

  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  return "";
}

function groupByCategory(stories: MediaStory[]) {
  const groups = new Map<string, MediaStory[]>();

  stories.forEach((story) => {
    const category = getCategory(story);
    const current = groups.get(category) ?? [];
    current.push(story);
    groups.set(category, current);
  });

  return Array.from(groups.entries());
}

export default async function MediaPage() {
  const stories = await getMediaStories();

  const explicitlyFeatured = stories.filter(
    (story) => story.is_featured === true
  );

  const featuredStory =
    explicitlyFeatured.length > 0 ? explicitlyFeatured[0] : stories[0] ?? null;

  const remainingStories = featuredStory
    ? stories.filter((story) => story.id !== featuredStory.id)
    : stories;

  const groupedStories = groupByCategory(remainingStories);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-12">
          <Link
            href="/"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            Back Home
          </Link>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950">
                FACKTS Media
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight md:text-6xl">
                Stories from the{" "}
                <span className="text-orange-400">Court</span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-lg md:leading-8">
                Player interviews, game highlights, Court Takeover episodes,
                documentaries, health awareness, and behind-the-scenes moments.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <HeroMiniStat label="Stories" value={String(stories.length)} />
              <HeroMiniStat
                label="Categories"
                value={String(groupedStories.length)}
              />
              <HeroMiniStat label="Featured" value={featuredStory ? "Yes" : "No"} />
            </div>
          </div>
        </div>
      </section>

      {featuredStory ? <FeaturedMediaStory story={featuredStory} /> : null}

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-10">
        {stories.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400 md:rounded-3xl md:p-6">
            No media stories are live yet.
          </div>
        ) : remainingStories.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400 md:rounded-3xl md:p-6">
            Only the featured story is live right now. More stories will appear
            here once added.
          </div>
        ) : (
          <div className="grid gap-8">
            {groupedStories.map(([category, categoryStories]) => (
              <section key={category}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                      Category
                    </div>

                    <h2 className="mt-1 text-xl font-black md:text-3xl">
                      {category}
                    </h2>
                  </div>

                  <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300">
                    {categoryStories.length} stories
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
                  {categoryStories.map((story) => (
                    <MediaStoryCard key={story.id} story={story} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function FeaturedMediaStory({ story }: { story: MediaStory }) {
  const title = getStoryTitle(story);
  const thumbnail = getThumbnail(story);
  const embedUrl = getEmbedUrl(story);
  const url = getStoryUrl(story);

  return (
    <section className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:grid-cols-[1.15fr,0.85fr] md:items-center md:px-6 md:py-8">
        <div className="rounded-[2rem] border border-orange-500/25 bg-slate-900 p-5 shadow-2xl shadow-orange-950/20 md:p-6">
          <div className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">
            Featured Story
          </div>

          <div className="mt-4 text-xs uppercase tracking-[0.25em] text-orange-300">
            {getCategory(story)} - {getStoryType(story)}
          </div>

          <h2 className="mt-3 text-2xl font-black leading-tight md:text-4xl">
            {title}
          </h2>

          {story.subtitle ? (
            <p className="mt-3 text-sm font-semibold text-orange-300 md:text-base">
              {story.subtitle}
            </p>
          ) : null}

          {story.description ? (
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {story.description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Open Story
              </a>
            ) : null}

            <Link
              href="/contact"
              className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
            >
              Work With FACKTS
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-800 bg-black shadow-2xl shadow-black/30">
          <div className="relative">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={title}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : thumbnail ? (
              <img
                src={thumbnail}
                alt={title}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-950 to-orange-950/30">
                <PlayBadge size="large" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MediaStoryCard({ story }: { story: MediaStory }) {
  const title = getStoryTitle(story);
  const url = getStoryUrl(story);
  const thumbnail = getThumbnail(story);
  const embedUrl = getEmbedUrl(story);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-orange-400/30 hover:shadow-orange-950/20 md:rounded-[2rem] md:shadow-xl">
      <div className="relative h-36 overflow-hidden bg-slate-950 md:h-48">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 to-orange-950/30">
            <PlayBadge size="large" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

        <div className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
          {getCategory(story)}
        </div>

        <div className="absolute bottom-3 right-3">
          <PlayBadge size="small" />
        </div>
      </div>

      <div className="p-3 md:p-5">
        <h3 className="line-clamp-2 text-base font-black leading-tight md:text-xl">
          {title}
        </h3>

        {story.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400 md:text-sm md:leading-6">
            {story.description}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          {embedUrl ? (
            <details className="group rounded-2xl border border-slate-800 bg-slate-950">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-orange-300">
                Play inside app
              </summary>

              <div className="overflow-hidden rounded-b-2xl border-t border-slate-800 bg-black">
                <iframe
                  src={embedUrl}
                  title={title}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </details>
          ) : null}

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-orange-500 px-4 py-2.5 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400 md:py-3"
            >
              Open Story
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PlayBadge({ size = "small" }: { size?: "small" | "large" }) {
  const wrapperSize =
    size === "large" ? "h-20 w-20 rounded-[1.75rem]" : "h-12 w-12 rounded-2xl";

  const triangleSize =
    size === "large"
      ? "border-y-[12px] border-l-[18px] ml-1"
      : "border-y-[7px] border-l-[11px] ml-0.5";

  return (
    <div className={`relative ${wrapperSize}`}>
      <div className="absolute inset-0 animate-ping rounded-[inherit] bg-orange-500/20" />

      <div className="absolute inset-0 rounded-[inherit] border border-white/20 bg-white/10 shadow-2xl shadow-orange-950/40 backdrop-blur-md" />

      <div className="absolute inset-[3px] rounded-[inherit] bg-orange-500 shadow-lg shadow-orange-500/25 transition group-hover:bg-orange-400">
        <div className="flex h-full w-full items-center justify-center">
          <span
            className={`block h-0 w-0 border-y-transparent border-l-slate-950 ${triangleSize}`}
          />
        </div>
      </div>
    </div>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 backdrop-blur md:p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 md:text-xs">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-orange-300 md:text-2xl">
        {value}
      </div>
    </div>
  );
}