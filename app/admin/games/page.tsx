"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameForm = {
  opponent: string;
  game_date: string;
  venue: string;
  match_type: string;
  team_score: string;
  opponent_score: string;
  is_upcoming: boolean;
  poster_url: string;
};

const emptyForm: GameForm = {
  opponent: "",
  game_date: "",
  venue: "",
  match_type: "",
  team_score: "",
  opponent_score: "",
  is_upcoming: false,
  poster_url: "",
};

const matchTypes = [
  "League Game",
  "Friendly",
  "Tournament",
  "Playoff",
  "Final",
  "Court Takeover",
  "Scrimmage",
  "Exhibition",
];

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);
  const [message, setMessage] = useState("");

  async function loadGames() {
    setLoadingGames(true);

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) {
      console.error("Load games error:", error);
      setMessage(`Failed to load games: ${error.message}`);
      setLoadingGames(false);
      return;
    }

    setGames(data ?? []);
    setLoadingGames(false);
  }

  useEffect(() => {
    loadGames();
  }, []);

  function updateField<K extends keyof GameForm>(field: K, value: GameForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function startEdit(game: any) {
    setEditingGameId(game.id);

    setForm({
      opponent: game.opponent ?? "",
      game_date: game.game_date ?? "",
      venue: game.venue ?? "",
      match_type: game.match_type ?? "",
      team_score: game.team_score?.toString() ?? "",
      opponent_score: game.opponent_score?.toString() ?? "",
      is_upcoming: game.is_upcoming ?? false,
      poster_url: game.poster_url ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingGameId(null);
    setMessage("");
  }

  async function handlePosterUpload(file: File) {
    if (!file) return;

    setUploadingPoster(true);
    setMessage("");

    const fileExt = file.name.split(".").pop();
    const cleanName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const filePath = `${Date.now()}-${cleanName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("game-posters")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Poster upload error:", uploadError);
      setMessage(`Poster upload failed: ${uploadError.message}`);
      setUploadingPoster(false);
      return;
    }

    const { data } = supabase.storage.from("game-posters").getPublicUrl(filePath);

    updateField("poster_url", data.publicUrl);
    setMessage("Poster uploaded successfully.");
    setUploadingPoster(false);
  }

  async function handleSaveGame(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      opponent: form.opponent.trim(),
      game_date: form.game_date || null,
      venue: form.venue.trim() || null,
      match_type: form.match_type.trim() || null,
      team_score: form.team_score === "" ? null : Number(form.team_score),
      opponent_score: form.opponent_score === "" ? null : Number(form.opponent_score),
      is_upcoming: form.is_upcoming,
      poster_url: form.poster_url.trim() || null,
    };

    if (!payload.opponent) {
      setMessage("Opponent is required.");
      setLoading(false);
      return;
    }

    if (form.is_upcoming) {
      const clearUpcoming = await supabase
        .from("games")
        .update({ is_upcoming: false })
        .neq("id", editingGameId ?? "00000000-0000-0000-0000-000000000000");

      if (clearUpcoming.error) {
        console.error("Clear upcoming error:", clearUpcoming.error);
        setMessage(`Failed to reset current upcoming game: ${clearUpcoming.error.message}`);
        setLoading(false);
        return;
      }
    }

    if (editingGameId) {
      const result = await supabase
        .from("games")
        .update(payload)
        .eq("id", editingGameId);

      if (result.error) {
        console.error("Update game error:", result.error);
        setMessage(`Failed to update game: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Game updated successfully.");
    } else {
      const result = await supabase.from("games").insert([payload]);

      if (result.error) {
        console.error("Create game error:", result.error);
        setMessage(`Failed to create game: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Game created successfully.");
    }

    resetForm();
    await loadGames();
    setLoading(false);
  }

  async function handleDeleteGame(gameId: string) {
    const yes = window.confirm("Delete this game?");
    if (!yes) return;

    const result = await supabase.from("games").delete().eq("id", gameId);

    if (result.error) {
      console.error("Delete game error:", result.error);
      setMessage(`Failed to delete game: ${result.error.message}`);
      return;
    }

    setMessage("Game deleted.");
    await loadGames();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to Admin
          </Link>

          <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Game Management
          </h1>

          <p className="mt-3 text-slate-400">
            Create games, update scores, mark the next game, and upload game posters.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr,1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  {editingGameId ? "Edit Game" : "New Game"}
                </div>
                <h2 className="mt-1 text-2xl font-bold">
                  {editingGameId ? "Update game" : "Create game"}
                </h2>
              </div>

              {editingGameId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4">
              <FormInput
                label="Opponent"
                value={form.opponent}
                onChange={(v) => updateField("opponent", v)}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Game Date"
                  value={form.game_date}
                  onChange={(v) => updateField("game_date", v)}
                  type="date"
                />

                <FormInput
                  label="Venue"
                  value={form.venue}
                  onChange={(v) => updateField("venue", v)}
                />
              </div>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Match Type
                </div>
                <select
                  value={form.match_type}
                  onChange={(e) => updateField("match_type", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select match type</option>
                  {matchTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="FACKTS Score"
                  value={form.team_score}
                  onChange={(v) => updateField("team_score", v)}
                  type="number"
                />

                <FormInput
                  label="Opponent Score"
                  value={form.opponent_score}
                  onChange={(v) => updateField("opponent_score", v)}
                  type="number"
                />
              </div>

              <div className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Game Poster Upload
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePosterUpload(file);
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300"
                />

                {uploadingPoster ? (
                  <div className="mt-3 text-sm text-orange-300">Uploading poster...</div>
                ) : null}

                {form.poster_url ? (
                  <div className="mt-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                      Current Poster Preview
                    </div>
                    <img
                      src={form.poster_url}
                      alt="Game poster preview"
                      className="max-h-72 w-full rounded-2xl border border-slate-700 object-cover"
                    />
                  </div>
                ) : null}
              </div>

              <FormInput
                label="Poster URL"
                value={form.poster_url}
                onChange={(v) => updateField("poster_url", v)}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-700 p-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.is_upcoming}
                  onChange={(e) => updateField("is_upcoming", e.target.checked)}
                  className="h-4 w-4"
                />
                Mark as next upcoming game
              </label>

              {message ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || uploadingPoster}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : editingGameId ? "Update Game" : "Create Game"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5">
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Game List
              </div>
              <h2 className="mt-1 text-2xl font-bold">All Games</h2>
            </div>

            {loadingGames ? (
              <div className="text-slate-400">Loading games...</div>
            ) : games.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                No games found yet.
              </div>
            ) : (
              <div className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
                  >
                    {game.poster_url ? (
                      <img
                        src={game.poster_url}
                        alt={`Poster for FACKTS vs ${game.opponent}`}
                        className="mb-4 max-h-56 w-full rounded-2xl border border-slate-800 object-cover"
                      />
                    ) : null}

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xl font-bold">
                            FACKTS vs {game.opponent}
                          </div>

                          {game.is_upcoming ? (
                            <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-slate-950">
                              UPCOMING
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 text-sm text-slate-400">
                          {game.game_date ?? "—"} • {game.venue ?? "—"} •{" "}
                          {game.match_type ?? "Game"}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                          {game.is_upcoming
                            ? "Upcoming game"
                            : `Score: ${game.team_score ?? 0} - ${
                                game.opponent_score ?? 0
                              }`}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(game)}
                          className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGame(game.id)}
                          className="rounded-2xl border border-rose-500/30 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
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
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}