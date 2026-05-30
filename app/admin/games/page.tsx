"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: string;
  opponent?: string | null;
  game_date?: string | null;
  venue?: string | null;
  location?: string | null;
  match_type?: string | null;
  game_type?: string | null;
  team_score?: number | string | null;
  opponent_score?: number | string | null;
  fackts_score?: number | string | null;
  is_upcoming?: boolean | null;
  poster_url?: string | null;
  image_url?: string | null;
  poster_position?: string | null;
  video_url?: string | null;
  highlight_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type GameForm = {
  opponent: string;
  game_date: string;
  venue: string;
  match_type: string;
  team_score: string;
  opponent_score: string;
  is_upcoming: boolean;
  poster_url: string;
  poster_position: string;
  video_url: string;
  notes: string;
};

type SavedGameMemory = {
  form: GameForm;
  editingId: string | null;
};

const FORM_MEMORY_KEY = "fackts-admin-games-form-memory";

const emptyForm: GameForm = {
  opponent: "",
  game_date: "",
  venue: "",
  match_type: "Friendly",
  team_score: "",
  opponent_score: "",
  is_upcoming: true,
  poster_url: "",
  poster_position: "center center",
  video_url: "",
  notes: "",
};

const matchTypes = [
  "Friendly",
  "Court Takeover",
  "League Game",
  "Tournament",
  "Playoff",
  "Final",
  "1st Leg",
  "2nd Leg",
  "Game 1",
  "Game 2",
  "Game 3",
  "Game 4",
  "Game 5",
  "Scrimmage",
];

const imagePositions = [
  { label: "Center", value: "center center" },
  { label: "Top", value: "center top" },
  { label: "Bottom", value: "center bottom" },
  { label: "Left", value: "left center" },
  { label: "Right", value: "right center" },
  { label: "Top Left", value: "left top" },
  { label: "Top Right", value: "right top" },
  { label: "Bottom Left", value: "left bottom" },
  { label: "Bottom Right", value: "right bottom" },
];

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTeamScore(game: GameRow) {
  if (game.team_score !== null && game.team_score !== undefined) {
    return game.team_score;
  }

  if (game.fackts_score !== null && game.fackts_score !== undefined) {
    return game.fackts_score;
  }

  return null;
}

function getDisplayScore(game: GameRow) {
  const teamScore = getTeamScore(game);
  const opponentScore = game.opponent_score;

  if (
    teamScore === null ||
    teamScore === undefined ||
    opponentScore === null ||
    opponentScore === undefined
  ) {
    return "Score not posted";
  }

  return `${teamScore} - ${opponentScore}`;
}

function hasScore(game: GameRow) {
  const teamScore = getTeamScore(game);
  const opponentScore = game.opponent_score;

  return (
    teamScore !== null &&
    teamScore !== undefined &&
    opponentScore !== null &&
    opponentScore !== undefined
  );
}

function getGameStatus(game: GameRow) {
  if (game.is_upcoming && !hasScore(game)) return "Upcoming";

  if (hasScore(game)) {
    const teamScore = Number(getTeamScore(game) ?? 0);
    const opponentScore = Number(game.opponent_score ?? 0);

    if (teamScore > opponentScore) return "Win";
    if (teamScore < opponentScore) return "Loss";
    return "Draw";
  }

  return "Awaiting Result";
}

function getGameTitle(game: GameRow) {
  return `FACKTS vs ${game.opponent || "Opponent"}`;
}

function getGameVenue(game: GameRow) {
  return game.venue || game.location || "Venue not added";
}

function cleanUrl(value: string) {
  return value.trim();
}

function makeSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function saveFormMemory(form: GameForm, editingId: string | null) {
  if (typeof window === "undefined") return;

  const memory: SavedGameMemory = {
    form,
    editingId,
  };

  sessionStorage.setItem(FORM_MEMORY_KEY, JSON.stringify(memory));
}

function loadFormMemory() {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(FORM_MEMORY_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SavedGameMemory;

    if (!parsed?.form) return null;

    return parsed;
  } catch {
    sessionStorage.removeItem(FORM_MEMORY_KEY);
    return null;
  }
}

function clearFormMemory() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(FORM_MEMORY_KEY);
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [memoryLoaded, setMemoryLoaded] = useState(false);

  async function loadGames() {
    setLoadingPage(true);
    setMessage("");

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to load games: ${error.message}`);
      setLoadingPage(false);
      return;
    }

    setGames((data || []) as GameRow[]);
    setLoadingPage(false);
  }

  useEffect(() => {
    const memory = loadFormMemory();

    if (memory) {
      setForm({
        ...emptyForm,
        ...memory.form,
      });

      setEditingId(memory.editingId || null);
    }

    setMemoryLoaded(true);
    loadGames();
  }, []);

  useEffect(() => {
    if (!memoryLoaded) return;

    const hasSomething =
      form.opponent.trim() ||
      form.game_date.trim() ||
      form.venue.trim() ||
      form.team_score.trim() ||
      form.opponent_score.trim() ||
      form.poster_url.trim() ||
      form.video_url.trim() ||
      form.notes.trim() ||
      editingId;

    if (hasSomething) {
      saveFormMemory(form, editingId);
    }
  }, [form, editingId, memoryLoaded]);

  function updateField<K extends keyof GameForm>(field: K, value: GameForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleEdit(game: GameRow) {
    setEditingId(game.id);
    setPosterFile(null);

    const savedVideoUrl = game.video_url || game.highlight_url || "";
    const savedTeamScore = getTeamScore(game);

    const nextForm: GameForm = {
      opponent: game.opponent || "",
      game_date: game.game_date || "",
      venue: game.venue || game.location || "",
      match_type: game.match_type || game.game_type || "Friendly",
      team_score:
        savedTeamScore !== null && savedTeamScore !== undefined
          ? String(savedTeamScore)
          : "",
      opponent_score:
        game.opponent_score !== null && game.opponent_score !== undefined
          ? String(game.opponent_score)
          : "",
      is_upcoming: Boolean(game.is_upcoming),
      poster_url: game.poster_url || game.image_url || "",
      poster_position: game.poster_position || "center center",
      video_url: savedVideoUrl,
      notes: game.notes || "",
    };

    setForm(nextForm);
    saveFormMemory(nextForm, game.id);

    setMessage("Editing selected game.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setPosterFile(null);
    setForm(emptyForm);
    clearFormMemory();
    setMessage("Edit cancelled.");
  }

  async function uploadPosterImage() {
    if (!posterFile) return form.poster_url.trim() || null;

    const cleanName = makeSafeFileName(posterFile.name);
    const fileName = cleanName || `game-poster-${Date.now()}.jpg`;
    const filePath = `posters/${Date.now()}-${fileName}`;

    const uploadResult = await supabase.storage
      .from("game-posters")
      .upload(filePath, posterFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    const publicUrlResult = supabase.storage
      .from("game-posters")
      .getPublicUrl(filePath);

    return publicUrlResult.data.publicUrl;
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    if (!form.opponent.trim()) {
      setMessage("Please enter the opponent name.");
      setSaving(false);
      return;
    }

    if (!form.game_date) {
      setMessage("Please enter the game date.");
      setSaving(false);
      return;
    }

    let posterUrl: string | null = null;

    try {
      posterUrl = await uploadPosterImage();
    } catch (error: any) {
      setMessage(`Poster upload failed: ${error.message}`);
      setSaving(false);
      return;
    }

    const teamScore = numberOrNull(form.team_score);
    const opponentScore = numberOrNull(form.opponent_score);
    const scoreHasBeenEntered = teamScore !== null && opponentScore !== null;
    const videoUrl = cleanUrl(form.video_url);

    const payload = {
      opponent: form.opponent.trim(),
      game_date: form.game_date,
      venue: form.venue.trim() || null,
      match_type: form.match_type,
      team_score: teamScore,
      opponent_score: opponentScore,
      is_upcoming: scoreHasBeenEntered ? false : form.is_upcoming,
      poster_url: posterUrl,
      poster_position: form.poster_position || "center center",
      video_url: videoUrl || null,
      highlight_url: videoUrl || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const saveResult = editingId
      ? await supabase
          .from("games")
          .update(payload)
          .eq("id", editingId)
          .select("id, video_url, highlight_url, poster_url")
          .single()
      : await supabase
          .from("games")
          .insert(payload)
          .select("id, video_url, highlight_url, poster_url")
          .single();

    if (saveResult.error) {
      setMessage(
        editingId
          ? `Failed to update game: ${saveResult.error.message}`
          : `Failed to save game: ${saveResult.error.message}`
      );
      setSaving(false);
      return;
    }

    const savedVideo =
      saveResult.data?.video_url || saveResult.data?.highlight_url || "";

    const savedPoster = saveResult.data?.poster_url || "";

    setMessage(
      `${editingId ? "Game updated." : "Game saved."} ${
        savedPoster ? "Poster saved." : "No poster uploaded."
      } ${savedVideo ? "Video link saved." : "No video link saved."}`
    );

    setEditingId(null);
    setPosterFile(null);
    setForm({
      ...emptyForm,
      match_type: form.match_type,
      venue: form.venue,
    });

    clearFormMemory();

    await loadGames();
    setSaving(false);
  }

  async function handleDelete(gameId: string) {
    const yes = window.confirm("Delete this game?");
    if (!yes) return;

    const { error } = await supabase.from("games").delete().eq("id", gameId);

    if (error) {
      setMessage(`Failed to delete game: ${error.message}`);
      return;
    }

    if (editingId === gameId) {
      setEditingId(null);
      setPosterFile(null);
      setForm(emptyForm);
      clearFormMemory();
    }

    setMessage("Game deleted.");
    await loadGames();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
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
            Games
          </h1>

          <p className="mt-3 text-slate-400">
            Create fixtures, update game scores, add posters, and link full game
            videos for fans to watch inside the app.
          </p>
        </header>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading games...
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    {editingId ? "Edit Game" : "Add Game"}
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    {editingId ? "Update Game" : "Create Game"}
                  </h2>
                </div>

                {editingId ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Opponent
                  </div>

                  <input
                    value={form.opponent}
                    onChange={(event) =>
                      updateField("opponent", event.target.value)
                    }
                    placeholder="Example: ACK Baptist"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Game Date
                    </div>

                    <input
                      type="date"
                      value={form.game_date}
                      onChange={(event) =>
                        updateField("game_date", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Venue
                    </div>

                    <input
                      value={form.venue}
                      onChange={(event) =>
                        updateField("venue", event.target.value)
                      }
                      placeholder="Example: ACK Kahawa Sukari"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Match Type
                  </div>

                  <select
                    value={form.match_type}
                    onChange={(event) =>
                      updateField("match_type", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    {matchTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      FACKTS Score
                    </div>

                    <input
                      type="number"
                      value={form.team_score}
                      onChange={(event) =>
                        updateField("team_score", event.target.value)
                      }
                      placeholder="Leave blank"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Opponent Score
                    </div>

                    <input
                      type="number"
                      value={form.opponent_score}
                      onChange={(event) =>
                        updateField("opponent_score", event.target.value)
                      }
                      placeholder="Leave blank"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
                    <span className="text-sm font-medium text-slate-300">
                      Upcoming
                    </span>

                    <input
                      type="checkbox"
                      checked={form.is_upcoming}
                      onChange={(event) =>
                        updateField("is_upcoming", event.target.checked)
                      }
                      className="h-5 w-5 accent-orange-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Upload Poster Image
                  </div>

                  {form.poster_url ? (
                    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <img
                        src={form.poster_url}
                        alt="Current game poster"
                        className="h-24 w-20 rounded-xl object-cover"
                        style={{
                          objectPosition:
                            form.poster_position || "center center",
                        }}
                      />

                      <div>
                        <div className="text-sm font-bold text-white">
                          Current poster will remain
                        </div>
                        <div className="text-xs text-slate-500">
                          Upload a new image only if you want to replace it.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setPosterFile(event.target.files?.[0] || null)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-black"
                  />

                  {posterFile ? (
                    <p className="mt-2 text-xs font-bold text-orange-300">
                      Selected: {posterFile.name}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Poster Position
                  </div>

                  <select
                    value={form.poster_position}
                    onChange={(event) =>
                      updateField("poster_position", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    {imagePositions.map((position) => (
                      <option key={position.value} value={position.value}>
                        {position.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Game Video Link
                  </div>

                  <input
                    value={form.video_url}
                    onChange={(event) =>
                      updateField("video_url", event.target.value)
                    }
                    placeholder="Paste YouTube, Vimeo, or direct video link"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Notes
                  </div>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    rows={3}
                    placeholder="Optional game notes"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? editingId
                      ? "Updating..."
                      : "Saving..."
                    : editingId
                    ? "Update Game"
                    : "Save Game"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Saved Games
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    Fixtures & Results
                  </h2>
                </div>

                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {games.length} games
                </div>
              </div>

              {games.length > 0 ? (
                <div className="space-y-3">
                  {games.map((game) => (
                    <article
                      key={game.id}
                      className={
                        editingId === game.id
                          ? "rounded-2xl border border-orange-500/60 bg-orange-500/10 p-4"
                          : "rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      }
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        {game.poster_url || game.image_url ? (
                          <img
                            src={game.poster_url || game.image_url || ""}
                            alt={getGameTitle(game)}
                            className="h-28 w-20 rounded-xl object-cover"
                            style={{
                              objectPosition:
                                game.poster_position || "center center",
                            }}
                          />
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-black text-white">
                            {getGameTitle(game)}
                          </div>

                          <div className="mt-1 text-sm text-slate-400">
                            {game.game_date || "Date not added"} |{" "}
                            {getGameVenue(game)}
                          </div>

                          <div className="mt-2 text-sm font-bold text-orange-300">
                            {getDisplayScore(game)} | {getGameStatus(game)}
                          </div>

                          {game.video_url || game.highlight_url ? (
                            <div className="mt-2 text-xs font-bold text-orange-300">
                              Video linked
                            </div>
                          ) : (
                            <div className="mt-2 text-xs font-bold text-slate-600">
                              No video linked
                            </div>
                          )}

                          {game.notes ? (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {game.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(game)}
                            className="rounded-2xl border border-orange-500/40 px-3 py-2 text-sm text-orange-300 hover:bg-orange-500/10"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(game.id)}
                            className="rounded-2xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  No games have been added yet.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}