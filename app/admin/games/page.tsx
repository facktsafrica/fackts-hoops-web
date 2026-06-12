"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameStatus = "upcoming" | "completed" | "postponed" | "cancelled";

type GameRow = {
  id: string;
  title?: string | null;
  game_title?: string | null;
  opponent?: string | null;
  opponent_name?: string | null;
  team_name?: string | null;
  game_date?: string | null;
  date?: string | null;
  venue?: string | null;
  location?: string | null;
  status?: string | null;
  fackts_score?: number | string | null;
  opponent_score?: number | string | null;
  home_score?: number | string | null;
  away_score?: number | string | null;
  poster_url?: string | null;
  game_poster_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  game_video_url?: string | null;
  highlight_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type GameForm = {
  title: string;
  opponent: string;
  game_date: string;
  venue: string;
  location: string;
  status: GameStatus;
  fackts_score: string;
  opponent_score: string;
  poster_url: string;
  video_url: string;
  highlight_url: string;
  notes: string;
};

const emptyForm: GameForm = {
  title: "",
  opponent: "",
  game_date: "",
  venue: "",
  location: "",
  status: "upcoming",
  fackts_score: "",
  opponent_score: "",
  poster_url: "",
  video_url: "",
  highlight_url: "",
  notes: "",
};

function getTitle(game: GameRow) {
  return game.game_title || game.title || "FACKTS Game";
}

function getOpponent(game: GameRow) {
  return game.opponent || game.opponent_name || game.team_name || "Opponent";
}

function getGameDate(game: GameRow) {
  return game.game_date || game.date || "";
}

function getPosterUrl(game: GameRow) {
  return game.poster_url || game.game_poster_url || game.image_url || "";
}

function getVideoUrl(game: GameRow) {
  return game.video_url || game.game_video_url || "";
}

function getFacktsScore(game: GameRow) {
  return game.fackts_score ?? game.home_score ?? "";
}

function getOpponentScore(game: GameRow) {
  return game.opponent_score ?? game.away_score ?? "";
}

function formatDate(value?: string | null) {
  if (!value) return "No date added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date added";

  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function normalizeStatus(value?: string | null): GameStatus {
  const status = (value || "").toLowerCase().trim();

  if (status === "completed" || status === "played" || status === "final") {
    return "completed";
  }

  if (status === "postponed") return "postponed";
  if (status === "cancelled") return "cancelled";

  return "upcoming";
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const aTime = new Date(getGameDate(a) || a.created_at || "").getTime();
      const bTime = new Date(getGameDate(b) || b.created_at || "").getTime();

      const safeA = Number.isNaN(aTime) ? 0 : aTime;
      const safeB = Number.isNaN(bTime) ? 0 : bTime;

      return safeB - safeA;
    });
  }, [games]);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setGames([]);
      setLoading(false);
      return;
    }

    setGames((data || []) as GameRow[]);
    setLoading(false);
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePosterChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setPosterFile(file);
  }

  function resetForm() {
    setForm(emptyForm);
    setPosterFile(null);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
  }

  function startEdit(game: GameRow) {
    setEditingId(game.id);
    setPosterFile(null);
    setMessage("");
    setErrorMessage("");

    setForm({
      title: getTitle(game) === "FACKTS Game" ? "" : getTitle(game),
      opponent: getOpponent(game) === "Opponent" ? "" : getOpponent(game),
      game_date: toDateTimeLocal(getGameDate(game)),
      venue: game.venue || "",
      location: game.location || "",
      status: normalizeStatus(game.status),
      fackts_score: String(getFacktsScore(game) ?? ""),
      opponent_score: String(getOpponentScore(game) ?? ""),
      poster_url: getPosterUrl(game),
      video_url: getVideoUrl(game),
      highlight_url: game.highlight_url || "",
      notes: game.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadPoster() {
    if (!posterFile) return form.poster_url;

    const fileExt = posterFile.name.split(".").pop() || "png";
    const fileName = `game-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("game-posters")
      .upload(fileName, posterFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from("game-posters").getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const posterUrl = await uploadPoster();

      const payload = {
        game_title: form.title.trim() || null,
        opponent: form.opponent.trim() || null,
        game_date: form.game_date ? new Date(form.game_date).toISOString() : null,
        venue: form.venue.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        fackts_score: numberOrNull(form.fackts_score),
        opponent_score: numberOrNull(form.opponent_score),
        poster_url: posterUrl || null,
        video_url: form.video_url.trim() || null,
        highlight_url: form.highlight_url.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("games")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw new Error(error.message);
        }

        setMessage("Game updated successfully.");
      } else {
        const { error } = await supabase.from("games").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) {
          throw new Error(error.message);
        }

        setMessage("Game added successfully.");
      }

      resetForm();
      await loadGames();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGame(gameId: string) {
    const confirmed = window.confirm(
      "Delete this game from admin? This will remove the game record from the website."
    );

    if (!confirmed) return;

    setDeletingId(gameId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("games").delete().eq("id", gameId);

    if (error) {
      setErrorMessage(error.message);
      setDeletingId(null);
      return;
    }

    setMessage("Game deleted successfully.");
    setDeletingId(null);
    await loadGames();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Admin Panel
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Manage Games
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Add fixtures, update scores, restore posters, attach game video
                links, and manage completed results.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Admin Home
              </Link>

              <Link
                href="/games"
                className="rounded-full border border-orange-400/40 bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
              >
                View Public Games
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[430px_1fr] lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                {editingId ? "Editing Game" : "New Game"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {editingId ? "Update Game" : "Add Game"}
              </h2>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-4">
            <Field label="Game Title">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. FACKTS vs Juja All Stars"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <Field label="Opponent / Team">
              <input
                name="opponent"
                value={form.opponent}
                onChange={handleChange}
                placeholder="e.g. JKUAT, Langata Downtown, Juja Basketball League"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Game Date & Time">
                <input
                  type="datetime-local"
                  name="game_date"
                  value={form.game_date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </Field>

              <Field label="Status">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue">
                <input
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="e.g. JKUAT Court"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                />
              </Field>

              <Field label="Location">
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Juja"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="FACKTS Score">
                <input
                  type="number"
                  name="fackts_score"
                  value={form.fackts_score}
                  onChange={handleChange}
                  placeholder="e.g. 67"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                />
              </Field>

              <Field label="Opponent Score">
                <input
                  type="number"
                  name="opponent_score"
                  value={form.opponent_score}
                  onChange={handleChange}
                  placeholder="e.g. 63"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                />
              </Field>
            </div>

            <Field label="Game Poster Upload">
              <input
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-black file:text-black"
              />

              <p className="mt-2 text-xs text-zinc-500">
                Uploading a new poster will replace the poster URL for this
                game. Existing uploaded posters remain safe unless you overwrite
                them.
              </p>
            </Field>

            <Field label="Current Poster URL">
              <input
                name="poster_url"
                value={form.poster_url}
                onChange={handleChange}
                placeholder="Poster URL will appear here after upload"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />

              {form.poster_url ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <img
                    src={form.poster_url}
                    alt="Current game poster"
                    className="h-48 w-full object-cover"
                  />
                </div>
              ) : null}
            </Field>

            <Field label="Full Game Video Link">
              <input
                name="video_url"
                value={form.video_url}
                onChange={handleChange}
                placeholder="Paste YouTube, TikTok, Instagram, or Google Drive link"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <Field label="Highlight Video Link">
              <input
                name="highlight_url"
                value={form.highlight_url}
                onChange={handleChange}
                placeholder="Optional highlight link"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <Field label="Notes">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Short game notes, story, recap, or admin reminder"
                className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Game Changes"
                  : "Add Game"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Games Database
              </p>

              <h2 className="mt-1 text-2xl font-black">Existing Games</h2>
            </div>

            <button
              type="button"
              onClick={loadGames}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
              Loading games...
            </div>
          ) : sortedGames.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
              No games found yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGames.map((game) => {
                const posterUrl = getPosterUrl(game);
                const videoUrl = getVideoUrl(game);
                const facktsScore = getFacktsScore(game);
                const opponentScore = getOpponentScore(game);

                return (
                  <article
                    key={game.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-black"
                  >
                    {posterUrl ? (
                      <div className="h-52 w-full overflow-hidden bg-zinc-900">
                        <img
                          src={posterUrl}
                          alt={getTitle(game)}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-300">
                              {normalizeStatus(game.status)}
                            </span>

                            {videoUrl ? (
                              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
                                Video Added
                              </span>
                            ) : null}

                            {posterUrl ? (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase text-emerald-200">
                                Poster Added
                              </span>
                            ) : null}
                          </div>

                          <h3 className="truncate text-xl font-black text-white">
                            {getTitle(game)}
                          </h3>

                          <p className="mt-1 text-sm font-bold text-zinc-400">
                            FACKTS vs {getOpponent(game)}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {formatDate(getGameDate(game))}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {[game.venue, game.location]
                              .filter(Boolean)
                              .join(" • ") || "No venue/location added"}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl border border-white/10 bg-zinc-950 px-5 py-3 text-center">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                            Score
                          </p>

                          <p className="mt-1 text-2xl font-black text-white">
                            {facktsScore !== "" && facktsScore !== null
                              ? facktsScore
                              : "-"}{" "}
                            -{" "}
                            {opponentScore !== "" && opponentScore !== null
                              ? opponentScore
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {videoUrl ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                            Game Video Link
                          </p>

                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-sm font-bold text-blue-300 hover:text-blue-200"
                          >
                            {videoUrl}
                          </a>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(game)}
                          className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteGame(game.id)}
                          disabled={deletingId === game.id}
                          className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === game.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>

      {children}
    </label>
  );
}