"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  opponent: string | null;
  game_date: string | null;
  venue: string | null;
  match_type: string | null;
  is_upcoming: boolean | null;
  preview_headline: string | null;
  preview_story: string | null;
  players_to_watch: string | null;
  preview_image_url: string | null;
  preview_video_url: string | null;
  preview_is_active: boolean | null;
};

type PreviewForm = {
  preview_headline: string;
  preview_story: string;
  players_to_watch: string;
  preview_image_url: string;
  preview_video_url: string;
  preview_is_active: boolean;
};

const emptyForm: PreviewForm = {
  preview_headline: "",
  preview_story: "",
  players_to_watch: "",
  preview_image_url: "",
  preview_video_url: "",
  preview_is_active: true,
};

function formatGameDate(value: string | null | undefined) {
  if (!value) return "Date TBA";

  try {
    const date = new Date(value);
    return date.toLocaleDateString("en-KE", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function AdminMatchPreviewsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [form, setForm] = useState<PreviewForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [message, setMessage] = useState("");

  const selectedGame = useMemo(() => {
    return games.find((game) => game.id === selectedGameId) ?? null;
  }, [games, selectedGameId]);

  async function loadGames(keepGameId?: string) {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("games")
      .select(
        `
        id,
        opponent,
        game_date,
        venue,
        match_type,
        is_upcoming,
        preview_headline,
        preview_story,
        players_to_watch,
        preview_image_url,
        preview_video_url,
        preview_is_active
      `
      )
      .order("game_date", { ascending: false });

    if (error) {
      setMessage(`Failed to load games: ${error.message}`);
      setGames([]);
      setLoading(false);
      return;
    }

    const loadedGames = (data ?? []) as Game[];
    setGames(loadedGames);

    const nextGameId =
      keepGameId && loadedGames.some((game) => game.id === keepGameId)
        ? keepGameId
        : loadedGames[0]?.id ?? "";

    setSelectedGameId(nextGameId);

    const game = loadedGames.find((item) => item.id === nextGameId);

    if (game) {
      setForm({
        preview_headline: game.preview_headline ?? "",
        preview_story: game.preview_story ?? "",
        players_to_watch: game.players_to_watch ?? "",
        preview_image_url: game.preview_image_url ?? "",
        preview_video_url: game.preview_video_url ?? "",
        preview_is_active: game.preview_is_active ?? true,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGames();
  }, []);

  function handleSelectGame(gameId: string) {
    setSelectedGameId(gameId);
    setMessage("");

    const game = games.find((item) => item.id === gameId);

    if (!game) {
      setForm(emptyForm);
      return;
    }

    setForm({
      preview_headline: game.preview_headline ?? "",
      preview_story: game.preview_story ?? "",
      players_to_watch: game.players_to_watch ?? "",
      preview_image_url: game.preview_image_url ?? "",
      preview_video_url: game.preview_video_url ?? "",
      preview_is_active: game.preview_is_active ?? true,
    });
  }

  async function uploadPreviewImage(file: File) {
    setMessage("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    setUploadingImage(true);

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";

    const safeOpponent = selectedGame?.opponent
      ? selectedGame.opponent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      : "match-preview";

    const filePath = `match-previews/${Date.now()}-${safeOpponent}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("media-thumbnails")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setMessage(`Image upload failed: ${uploadError.message}`);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage
      .from("media-thumbnails")
      .getPublicUrl(filePath);

    setForm((current) => ({
      ...current,
      preview_image_url: data.publicUrl,
    }));

    setMessage("Preview image uploaded. Remember to save the match preview.");
    setUploadingImage(false);
  }

  async function savePreview() {
    if (!selectedGameId) {
      setMessage("Select a game first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      preview_headline: form.preview_headline.trim() || null,
      preview_story: form.preview_story.trim() || null,
      players_to_watch: form.players_to_watch.trim() || null,
      preview_image_url: form.preview_image_url.trim() || null,
      preview_video_url: form.preview_video_url.trim() || null,
      preview_is_active: form.preview_is_active,
    };

    const { error } = await supabase
      .from("games")
      .update(payload)
      .eq("id", selectedGameId);

    if (error) {
      setMessage(`Failed to save preview: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Match preview saved.");
    await loadGames(selectedGameId);
    setSaving(false);
  }

  function applyQuickTemplate() {
    const opponent = selectedGame?.opponent ?? "Opponent";
    const venue = selectedGame?.venue ?? "the court";

    setForm((current) => ({
      ...current,
      preview_headline: "Game 2. Their turf. Our statement.",
      preview_story: `FACKTS heads into this matchup against ${opponent} with statement-game energy. The battle moves to ${venue}, where the home side will be looking to respond. The roster is taking shape, the matchup is heating up, and every possession will matter.`,
      players_to_watch:
        "Liam Mwaniki remains one to watch. Thomas Hanss brings leadership and control. Bench depth could decide the game.",
      preview_is_active: true,
    }));
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
                Match Previews
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Create the story before the game: rivalry angle, turf talk,
                players to watch, preview images, and video links.
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
                href="/games"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Public Games
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 xl:grid-cols-[420px,1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
              Select Game
            </div>
            <h2 className="mt-1 text-xl font-black">Preview Control</h2>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Loading games...
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              No games found.
            </div>
          ) : (
            <div className="grid gap-4">
              <label className="block">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Game
                </div>

                <select
                  value={selectedGameId}
                  onChange={(event) => handleSelectGame(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
                >
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {formatGameDate(game.game_date)} — FACKTS vs{" "}
                      {game.opponent ?? "Opponent"}
                    </option>
                  ))}
                </select>
              </label>

              {selectedGame ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-orange-300">
                    Selected
                  </div>

                  <div className="mt-3 text-2xl font-black">
                    FACKTS vs {selectedGame.opponent ?? "Opponent"}
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {formatGameDate(selectedGame.game_date)} •{" "}
                    {selectedGame.venue ?? "Venue TBA"} •{" "}
                    {selectedGame.match_type ?? "Game"}
                  </div>

                  <div className="mt-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                        form.preview_is_active
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {form.preview_is_active
                        ? "Preview Active"
                        : "Preview Hidden"}
                    </span>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={applyQuickTemplate}
                className="rounded-2xl border border-orange-500/40 px-4 py-3 text-sm font-bold text-orange-300 transition hover:bg-orange-500/10"
              >
                Apply FACKTS Quick Template
              </button>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                Match Story
              </div>
              <h2 className="mt-1 text-xl font-black">Edit Preview</h2>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.preview_is_active}
                onChange={(event) =>
                  setForm({ ...form, preview_is_active: event.target.checked })
                }
                className="h-5 w-5 accent-orange-500"
              />
              <span className="text-sm font-bold text-slate-200">Show</span>
            </label>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Preview Headline
              </div>

              <input
                value={form.preview_headline}
                onChange={(event) =>
                  setForm({ ...form, preview_headline: event.target.value })
                }
                placeholder="Example: Game 2. Their turf. Our statement."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Preview Story
              </div>

              <textarea
                value={form.preview_story}
                onChange={(event) =>
                  setForm({ ...form, preview_story: event.target.value })
                }
                rows={6}
                placeholder="Write the story angle before the game..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Players To Watch
              </div>

              <textarea
                value={form.players_to_watch}
                onChange={(event) =>
                  setForm({ ...form, players_to_watch: event.target.value })
                }
                rows={4}
                placeholder="Example: Liam remains unbeaten. Thomas brings leadership..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </label>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Preview Image
              </div>

              <div className="grid gap-4 md:grid-cols-[180px,1fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  {form.preview_image_url ? (
                    <img
                      src={form.preview_image_url}
                      alt="Match preview"
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                      No image uploaded
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadPreviewImage(file);
                    }}
                    className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-950"
                  />

                  <input
                    value={form.preview_image_url}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        preview_image_url: event.target.value,
                      })
                    }
                    placeholder="Or paste image URL"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                  />

                  <div className="text-xs leading-5 text-slate-500">
                    {uploadingImage
                      ? "Uploading image..."
                      : "Upload JPG, PNG, or WEBP. After upload, click Save Match Preview."}
                  </div>
                </div>
              </div>
            </div>

            <label className="block">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Preview Video URL
              </div>

              <input
                value={form.preview_video_url}
                onChange={(event) =>
                  setForm({ ...form, preview_video_url: event.target.value })
                }
                placeholder="Optional YouTube/video link"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </label>

            <button
              type="button"
              onClick={savePreview}
              disabled={saving || uploadingImage || !selectedGameId}
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Match Preview"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}