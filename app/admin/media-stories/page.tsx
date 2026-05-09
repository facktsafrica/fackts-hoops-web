"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  display_order: "100",
  is_active: true,
};

const categories = [
  "All Categories",
  "Player Interviews",
  "Game Highlights",
  "Court Takeover Series",
  "Documentaries",
  "Player Health & Awareness",
  "Behind the Scenes",
];

const formCategories = categories.filter(
  (category) => category !== "All Categories"
);

const storyTypes = [
  "Player Feature",
  "Game Highlights",
  "Playlist",
  "Documentary",
  "Awareness Episode",
  "Shorts Channel",
  "Behind the Scenes",
];

const pageSizeOptions = [12, 24, 48, 96];

function extractYouTubeIds(url: string) {
  const cleanUrl = url.trim();

  let videoId = "";
  let playlistId = "";

  try {
    const parsed = new URL(cleanUrl);

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "").split("?")[0];
    }

    if (parsed.hostname.includes("youtube.com")) {
      const watchVideoId = parsed.searchParams.get("v");
      const listId = parsed.searchParams.get("list");

      if (watchVideoId) videoId = watchVideoId;
      if (listId) playlistId = listId;

      if (parsed.pathname.includes("/shorts/")) {
        videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] ?? "";
      }

      if (parsed.pathname.includes("/playlist")) {
        playlistId = parsed.searchParams.get("list") ?? "";
      }
    }
  } catch {
    // Leave blank.
  }

  return { videoId, playlistId };
}

function getThumbnail(story: MediaStory) {
  if (story.thumbnail_url) return story.thumbnail_url;
  if (story.video_id) return `https://img.youtube.com/vi/${story.video_id}/hqdefault.jpg`;
  return "/logos/fackts-hoops-logo.png";
}

export default function AdminMediaStoriesPage() {
  const [stories, setStories] = useState<MediaStory[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All");
  const [pageSize, setPageSize] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);

  const editingStory = useMemo(
    () => stories.find((story) => story.id === editingId) ?? null,
    [stories, editingId]
  );

  const filteredStories = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return stories.filter((story) => {
      const matchesSearch =
        !search ||
        story.title?.toLowerCase().includes(search) ||
        story.subtitle?.toLowerCase().includes(search) ||
        story.category?.toLowerCase().includes(search) ||
        story.story_type?.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" || story.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && story.is_active) ||
        (statusFilter === "Hidden" && !story.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stories, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStories.length / pageSize));

  const pagedStories = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredStories.slice(start, start + pageSize);
  }, [filteredStories, currentPage, totalPages, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, pageSize]);

  async function loadStories() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("media_stories")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setStories([]);
    } else {
      setStories((data ?? []) as MediaStory[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStories();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
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
      display_order: String(story.display_order ?? 100),
      is_active: story.is_active ?? true,
    });

    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleYouTubeBlur() {
    const ids = extractYouTubeIds(form.youtube_url);

    setForm((current) => ({
      ...current,
      video_id: current.video_id || ids.videoId,
      playlist_id: current.playlist_id || ids.playlistId,
      story_type:
        ids.playlistId && !ids.videoId && current.story_type !== "Playlist"
          ? "Playlist"
          : current.story_type,
    }));
  }

  async function handleThumbnailUpload(file: File) {
    setErrorMessage("");
    setMessage("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeTitle = form.title
      ? form.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      : "media-story";

    const filePath = `${Date.now()}-${safeTitle}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("media-thumbnails")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("media-thumbnails")
      .getPublicUrl(filePath);

    setForm((current) => ({
      ...current,
      thumbnail_url: data.publicUrl,
    }));

    setMessage("Thumbnail uploaded.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const ids = extractYouTubeIds(form.youtube_url);

    const payload = {
      category: form.category.trim(),
      story_type: form.story_type.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      youtube_url: form.youtube_url.trim(),
      video_id: form.video_id.trim() || ids.videoId || null,
      playlist_id: form.playlist_id.trim() || ids.playlistId || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      display_order: Number(form.display_order || 100),
      is_active: form.is_active,
    };

    if (
      !payload.title ||
      !payload.category ||
      !payload.story_type ||
      !payload.youtube_url
    ) {
      setErrorMessage("Please fill in category, story type, title, and YouTube URL.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("media_stories")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMessage("Media story updated.");
        resetForm();
        await loadStories();
      }
    } else {
      const { error } = await supabase.from("media_stories").insert(payload);

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMessage("Media story added.");
        resetForm();
        await loadStories();
      }
    }

    setSaving(false);
  }

  async function toggleActive(story: MediaStory) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("media_stories")
      .update({ is_active: !story.is_active })
      .eq("id", story.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadStories();
  }

  async function deleteStory(story: MediaStory) {
    const confirmed = window.confirm(`Delete "${story.title}"?`);
    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("media_stories")
      .delete()
      .eq("id", story.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (editingId === story.id) resetForm();

    setMessage("Media story deleted.");
    await loadStories();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                Admin
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                Media Stories
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Manage homepage videos, interviews, documentaries, playlists,
                thumbnails, display order, and visibility.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Dashboard
              </Link>

              <Link
                href="/"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Homepage
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 xl:grid-cols-[420px,1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                {editingStory ? "Edit Story" : "Add Story"}
              </div>

              <h2 className="mt-1 text-xl font-black">
                {editingStory ? editingStory.title : "New story"}
              </h2>
            </div>

            {editingStory ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Category
              </span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              >
                {formCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Story Type
              </span>
              <select
                value={form.story_type}
                onChange={(event) =>
                  setForm({ ...form, story_type: event.target.value })
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              >
                {storyTypes.map((storyType) => (
                  <option key={storyType} value={storyType}>
                    {storyType}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Title
              </span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                placeholder="Beyond Injury"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Subtitle
              </span>
              <input
                value={form.subtitle}
                onChange={(event) =>
                  setForm({ ...form, subtitle: event.target.value })
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                placeholder="Player Health Beyond the Court"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                rows={3}
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                placeholder="Short description..."
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                YouTube URL
              </span>
              <input
                value={form.youtube_url}
                onChange={(event) =>
                  setForm({ ...form, youtube_url: event.target.value })
                }
                onBlur={handleYouTubeBlur}
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                placeholder="Paste YouTube link"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Video ID
                </span>
                <input
                  value={form.video_id}
                  onChange={(event) =>
                    setForm({ ...form, video_id: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                  placeholder="Auto"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Playlist ID
                </span>
                <input
                  value={form.playlist_id}
                  onChange={(event) =>
                    setForm({ ...form, playlist_id: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                  placeholder="Auto"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Thumbnail
              </div>

              <div className="mt-3 grid gap-3">
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  {form.thumbnail_url ? (
                    <img
                      src={form.thumbnail_url}
                      alt="Thumbnail preview"
                      className="h-20 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 items-center justify-center text-[11px] text-slate-500">
                      No image
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                  }}
                  className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-950"
                />

                <input
                  value={form.thumbnail_url}
                  onChange={(event) =>
                    setForm({ ...form, thumbnail_url: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                  placeholder="Or paste thumbnail URL"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Order
                </span>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(event) =>
                    setForm({ ...form, display_order: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                  className="h-5 w-5 accent-orange-500"
                />
                <span className="text-sm font-bold text-slate-200">
                  Show
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingStory
                ? "Update Story"
                : "Add Story"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                Current Stories
              </div>

              <h2 className="mt-1 text-xl font-black">
                {filteredStories.length} of {stories.length} stories
              </h2>
            </div>

            <button
              type="button"
              onClick={loadStories}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr,190px,140px,120px]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search stories..."
              className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Hidden">Hidden</option>
            </select>

            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              Loading media stories...
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              No media stories match your filters.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {pagedStories.map((story) => (
                  <div
                    key={story.id}
                    className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 transition hover:-translate-y-0.5 hover:border-orange-400/30"
                  >
                    <div className="relative h-28 overflow-hidden bg-slate-900">
                      <img
                        src={getThumbnail(story)}
                        alt={story.title}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                      <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                        <span className="rounded-full bg-orange-500 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-950">
                          {story.story_type}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                            story.is_active
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {story.is_active ? "Live" : "Hidden"}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="truncate text-sm font-black text-white">
                          {story.title}
                        </h3>

                        <div className="mt-1 truncate text-[11px] font-semibold text-orange-300">
                          {story.category}
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                          Order #{story.display_order}
                        </div>

                        {story.subtitle ? (
                          <div className="truncate text-[11px] text-slate-500">
                            {story.subtitle}
                          </div>
                        ) : null}
                      </div>

                      {story.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {story.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          No description.
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(story)}
                          className="rounded-xl bg-orange-500 px-2 py-1.5 text-[11px] font-black text-slate-950 transition hover:bg-orange-400"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(story)}
                          className="rounded-xl border border-slate-700 px-2 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-800"
                        >
                          {story.is_active ? "Hide" : "Show"}
                        </button>

                        <a
                          href={story.youtube_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-700 px-2 py-1.5 text-center text-[11px] font-bold text-slate-200 transition hover:bg-slate-800"
                        >
                          View
                        </a>

                        <button
                          type="button"
                          onClick={() => deleteStory(story)}
                          className="rounded-xl border border-rose-500/40 px-2 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/10"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <div className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
