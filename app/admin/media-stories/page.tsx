"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
  is_featured: boolean;
  created_at?: string;
};

type FormState = {
  category: string;
  story_type: string;
  title: string;
  subtitle: string;
  description: string;
  youtube_url: string;
  video_id: string;
  playlist_id: string;
  thumbnail_url: string;
  display_order: string;
  is_active: boolean;
  is_featured: boolean;
};

const emptyForm: FormState = {
  category: "Player Interviews",
  story_type: "Player Feature",
  title: "",
  subtitle: "",
  description: "",
  youtube_url: "",
  video_id: "",
  playlist_id: "",
  thumbnail_url: "",
  display_order: "1",
  is_active: true,
  is_featured: false,
};

const categoryOptions = [
  "Player Interviews",
  "Game Highlights",
  "Full Games",
  "FACKTS Kings",
  "Court Takeovers",
  "Event Coverage",
  "Documentaries",
  "Behind the Scenes",
  "Health & Awareness",
  "Community Stories",
  "Training",
  "Other",
];

const storyTypeOptions = [
  "Player Feature",
  "Interview",
  "Highlight",
  "Full Game",
  "Press Conference",
  "Player Breakdown",
  "Documentary",
  "Short Clip",
  "Episode",
  "Awareness Story",
  "Behind the Scenes",
  "Other",
];

function extractYouTubeId(url: string) {
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

function getYouTubeThumbnail(url: string, videoId: string) {
  const cleanId = videoId || extractYouTubeId(url);

  if (!cleanId) return "";

  return `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;
}

export default function AdminMediaStoriesPage() {
  const [stories, setStories] = useState<MediaStory[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadStories() {
    setLoadingPage(true);
    setMessage("");

    const { data, error } = await supabase
      .from("media_stories")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to load media stories: ${error.message}`);
      setLoadingPage(false);
      return;
    }

    setStories((data ?? []) as MediaStory[]);
    setLoadingPage(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStories(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function startEdit(story: MediaStory) {
    setEditingId(story.id);

    setForm({
      category: story.category ?? "Player Interviews",
      story_type: story.story_type ?? "Player Feature",
      title: story.title ?? "",
      subtitle: story.subtitle ?? "",
      description: story.description ?? "",
      youtube_url: story.youtube_url ?? "",
      video_id: story.video_id ?? "",
      playlist_id: story.playlist_id ?? "",
      thumbnail_url: story.thumbnail_url ?? "",
      display_order: String(story.display_order ?? 1),
      is_active: story.is_active ?? true,
      is_featured: story.is_featured ?? false,
    });

    setMessage(`Editing: ${story.title}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
    const cleanVideoId = form.video_id.trim() || extractYouTubeId(form.youtube_url);
    const cleanThumbnail =
      form.thumbnail_url.trim() || getYouTubeThumbnail(form.youtube_url, cleanVideoId);

    return {
      category: form.category,
      story_type: form.story_type,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      youtube_url: form.youtube_url.trim(),
      video_id: cleanVideoId || null,
      playlist_id: form.playlist_id.trim() || null,
      thumbnail_url: cleanThumbnail || null,
      display_order: Number(form.display_order || 1),
      is_active: form.is_active,
      is_featured: form.is_featured,
    };
  }

  async function handleSaveStory(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (!form.title.trim()) {
      setMessage("Title is required.");
      setLoading(false);
      return;
    }

    if (!form.youtube_url.trim()) {
      setMessage("A video or social media URL is required.");
      setLoading(false);
      return;
    }

    const payload = buildPayload();

    if (payload.is_featured) {
      const clearFeaturedQuery = supabase
        .from("media_stories")
        .update({ is_featured: false });

      if (editingId) {
        await clearFeaturedQuery.neq("id", editingId);
      } else {
        await clearFeaturedQuery.neq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    if (editingId) {
      const result = await supabase
        .from("media_stories")
        .update(payload)
        .eq("id", editingId);

      if (result.error) {
        setMessage(`Failed to update media story: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Media story updated successfully.");
    } else {
      const result = await supabase.from("media_stories").insert([payload]);

      if (result.error) {
        setMessage(`Failed to create media story: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Media story created successfully.");
    }

    resetForm();
    await loadStories();
    setLoading(false);
  }

  async function handleDeleteStory(storyId: string) {
    const yes = window.confirm("Delete this media story?");
    if (!yes) return;

    const result = await supabase.from("media_stories").delete().eq("id", storyId);

    if (result.error) {
      setMessage(`Failed to delete media story: ${result.error.message}`);
      return;
    }

    setMessage("Media story deleted.");
    await loadStories();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Back to Admin
          </Link>

          <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Media Stories
          </h1>

          <p className="mt-3 text-slate-400">
            Publish editorial media from YouTube, Instagram, TikTok, Facebook,
            Vimeo, Google Drive or a direct video link. Game, player, team and
            event media already flow into the public library automatically.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="mb-5">
              <div className="text-sm uppercase tracking-wide text-orange-300">
                {editingId ? "Edit Story" : "Add Story"}
              </div>

              <h2 className="mt-1 text-2xl font-bold">
                {editingId ? "Update Media Story" : "Create Media Story"}
              </h2>
            </div>

            <form onSubmit={handleSaveStory} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect
                  label="Category"
                  value={form.category}
                  onChange={(value) => updateField("category", value)}
                  options={categoryOptions}
                />

                <FormSelect
                  label="Story Type"
                  value={form.story_type}
                  onChange={(value) => updateField("story_type", value)}
                  options={storyTypeOptions}
                />
              </div>

              <FormInput
                label="Title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                placeholder="Example: Beyond Injury - RTI Comeback Story"
              />

              <FormInput
                label="Subtitle"
                value={form.subtitle}
                onChange={(value) => updateField("subtitle", value)}
                placeholder="Optional short subtitle"
              />

              <FormTextarea
                label="Description"
                value={form.description}
                onChange={(value) => updateField("description", value)}
                placeholder="Brief story description"
              />

              <FormInput
                label="Video or social media URL"
                value={form.youtube_url}
                onChange={(value) => updateField("youtube_url", value)}
                placeholder="YouTube, Instagram, TikTok, Facebook, Vimeo or direct video"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="YouTube Video ID"
                  value={form.video_id}
                  onChange={(value) => updateField("video_id", value)}
                  placeholder="Optional. Auto-detected if blank."
                />

                <FormInput
                  label="YouTube Playlist ID"
                  value={form.playlist_id}
                  onChange={(value) => updateField("playlist_id", value)}
                  placeholder="Optional"
                />
              </div>

              <FormInput
                label="Thumbnail URL"
                value={form.thumbnail_url}
                onChange={(value) => updateField("thumbnail_url", value)}
                placeholder="Optional. YouTube thumbnail used if blank."
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <FormInput
                  label="Display Order"
                  value={form.display_order}
                  onChange={(value) => updateField("display_order", value)}
                  type="number"
                />

                <ToggleBox
                  label="Active"
                  checked={form.is_active}
                  onChange={(value) => updateField("is_active", value)}
                />

                <ToggleBox
                  label="Featured"
                  checked={form.is_featured}
                  onChange={(value) => updateField("is_featured", value)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Saving..."
                    : editingId
                    ? "Update Media Story"
                    : "Create Media Story"}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Story List
                </div>

                <h2 className="mt-1 text-2xl font-bold">Saved Media Stories</h2>
              </div>

              <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {stories.length} stories
              </div>
            </div>

            {loadingPage ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                Loading media stories...
              </div>
            ) : stories.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                No media stories have been added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {stories.map((story) => (
                  <article
                    key={story.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-4">
                        {story.thumbnail_url ? (
                          <img
                            src={story.thumbnail_url}
                            alt={story.title}
                            className="h-20 w-28 rounded-2xl border border-slate-800 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-sm font-black text-orange-300">
                            MEDIA
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            {story.is_featured ? (
                              <span className="rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-slate-950">
                                FEATURED
                              </span>
                            ) : null}

                            {story.is_active ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] font-black text-slate-300">
                                HIDDEN
                              </span>
                            )}

                            <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-400">
                              {story.category}
                            </span>
                          </div>

                          <h3 className="mt-2 truncate text-lg font-black">
                            {story.title}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                            {story.subtitle || story.description || story.story_type}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(story)}
                          className="rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStory(story.id)}
                          className="rounded-2xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-full cursor-pointer items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-orange-500"
      />
    </label>
  );
}
