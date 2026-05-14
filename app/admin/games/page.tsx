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
  poster_position: string;
};

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

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [message, setMessage] = useState("");

  async function loadGames() {
    setLoadingPage(true);
    setMessage("");

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) {
      setMessage(`Failed to load games: ${error.message}`);
      setLoadingPage(false);
      return;
    }

    setGames(data ?? []);
    setLoadingPage(false);
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

  function resetForm() {
    setForm(emptyForm);
    setEditingGameId(null);
    setMessage("");
  }

  function startEdit(game: any) {
    setEditingGameId(game.id);

    setForm({
      opponent: game.opponent ?? "",
      game_date: game.game_date ?? "",
      venue: game.venue ?? "",
      match_type: game.match_type ?? "Friendly",
      team_score:
        game.team_score === null || game.team_score === undefined
          ? ""
          : String(game.team_score),
      opponent_score:
        game.opponent_score === null || game.opponent_score === undefined
          ? ""
          : String(game.opponent_score),
      is_upcoming: game.is_upcoming ?? false,
      poster_url: game.poster_url ?? "",
      poster_position: game.poster_position ?? "center center",
    });

    setMessage(`Editing FACKTS vs ${game.opponent}. Make changes above, then click Update Game.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    const safeOpponent = form.opponent
      ? form.opponent.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()
      : "opponent";

    const filePath = `games/${Date.now()}-fackts-vs-${safeOpponent}-${cleanName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("game-posters")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setMessage(`Poster upload failed: ${uploadError.message}`);
      setUploadingPoster(false);
      return;
    }

    const { data } = supabase.storage.from("game-posters").getPublicUrl(filePath);

    updateField("poster_url", data.publicUrl);
    setMessage("Poster uploaded. Remember to click Create Game or Update Game.");
    setUploadingPoster(false);
  }

  function buildPayload() {
    const isUpcoming = form.is_upcoming;

    return {
      opponent: form.opponent.trim(),
      game_date: form.game_date || null,
      venue: form.venue.trim() || null,
      match_type: form.match_type || "Friendly",
      is_upcoming: isUpcoming,

      // Very important:
      // Upcoming games must not have scores.
      // Completed games may have scores, but blank scores stay null.
      team_score: isUpcoming
        ? null
        : form.team_score === ""
        ? null
        : Number(form.team_score),

      opponent_score: isUpcoming
        ? null
        : form.opponent_score === ""
        ? null
        : Number(form.opponent_score),

      poster_url: form.poster_url.trim() || null,
      poster_position: form.poster_position || "center center",
    };
  }

  async function handleSaveGame(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (!form.opponent.trim()) {
      setMessage("Opponent name is required.");
      setLoading(false);
      return;
    }

    const payload = buildPayload();

    // Important:
    // We are NOT clearing other upcoming games.
    // This allows a full season schedule to have many upcoming games.

    if (editingGameId) {
      const result = await supabase
        .from("games")
        .update(payload)
        .eq("id", editingGameId);

      if (result.error) {
        setMessage(`Failed to update game: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Game updated successfully.");
    } else {
      const result = await supabase.from("games").insert([payload]);

      if (result.error) {
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
      setMessage(`Failed to delete game: ${result.error.message}`);
      return;
    }

    setMessage("Game deleted.");
    await loadGames();
  }

  function getGameLabel(game: any) {
    if (game.is_upcoming) return "UPCOMING";

    const hasScores =
      game.team_score !== null &&
      game.team_score !== undefined &&
      game.opponent_score !== null &&
      game.opponent_score !== undefined;

    if (!hasScores) return "FINAL";

    const facktsScore = Number(game.team_score);
    const opponentScore = Number(game.opponent_score);

    if (facktsScore > opponentScore) return "WIN";
    if (opponentScore > facktsScore) return "LOSS";

    // Basketball should not end in a draw.
    return "CHECK SCORE";
  }

  function getGameLabelClass(label: string) {
    if (label === "UPCOMING") return "bg-orange-500 text-slate-950";
    if (label === "WIN") return "bg-emerald-500 text-slate-950";
    if (label === "LOSS") return "bg-rose-500 text-white";
    if (label === "CHECK SCORE") return "bg-yellow-400 text-slate-950";
    return "bg-slate-700 text-slate-200";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              â† Back to Admin
            </Link>

            <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Admin
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Games
            </h1>

            <p className="mt-3 max-w-3xl text-slate-400">
              Create games, upload posters, edit past games, and add as many upcoming games as needed.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10"
          >
            View Public Home â†’
          </Link>
        </div>

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
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
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
                  onChange={(value) => updateField("opponent", value)}
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Game Date"
                    value={form.game_date}
                    onChange={(value) => updateField("game_date", value)}
                    type="date"
                  />

                  <FormInput
                    label="Venue"
                    value={form.venue}
                    onChange={(value) => updateField("venue", value)}
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
                    {matchTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_upcoming}
                    onChange={(e) => updateField("is_upcoming", e.target.checked)}
                    className="h-4 w-4"
                  />
                  This is an upcoming game
                </label>

                {!form.is_upcoming ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="FACKTS Score"
                      value={form.team_score}
                      onChange={(value) => updateField("team_score", value)}
                      type="number"
                    />

                    <FormInput
                      label="Opponent Score"
                      value={form.opponent_score}
                      onChange={(value) => updateField("opponent_score", value)}
                      type="number"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                    Upcoming games do not use scores. Scores will remain blank until the game is completed.
                  </div>
                )}

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
                    <div className="mt-3 text-sm text-orange-300">
                      Uploading poster...
                    </div>
                  ) : null}

                  {form.poster_url ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        Poster Preview
                      </div>

                      <img
                        src={form.poster_url}
                        alt="Game poster preview"
                        className="h-72 w-full rounded-2xl border border-slate-700 object-cover"
                        style={{ objectPosition: form.poster_position }}
                      />

                      <div className="mt-3 text-sm text-slate-500">
                        Poster uploaded. Adjust focus below if needed, then save the game.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
                      No poster uploaded yet.
                    </div>
                  )}
                </div>

                <FormInput
                  label="Poster URL"
                  value={form.poster_url}
                  onChange={(value) => updateField("poster_url", value)}
                />

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Poster Focus Position
                  </div>

                  <select
                    value={form.poster_position}
                    onChange={(e) =>
                      updateField("poster_position", e.target.value)
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

                <button
                  type="submit"
                  disabled={loading || uploadingPoster}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {loading
                    ? "Saving..."
                    : editingGameId
                    ? "Update Game"
                    : "Create Game"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Game List
                </div>

                <h2 className="mt-1 text-2xl font-bold">All Games</h2>

                <p className="mt-2 text-sm text-slate-500">
                  You can keep many games as upcoming at the same time.
                </p>
              </div>

              {games.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No games created yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {games.map((game) => {
                    const label = getGameLabel(game);

                    return (
                      <div
                        key={game.id}
                        className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
                      >
                        {game.poster_url ? (
                          <img
                            src={game.poster_url}
                            alt={`FACKTS vs ${game.opponent}`}
                            className="h-56 w-full object-cover"
                            style={{
                              objectPosition:
                                game.poster_position ?? "center center",
                            }}
                          />
                        ) : null}

                        <div className="p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${getGameLabelClass(
                                label
                              )}`}
                            >
                              {label}
                            </span>

                            <div className="text-sm text-slate-400">
                              {game.game_date ?? "Date TBA"} â€¢{" "}
                              {game.venue ?? "Venue TBA"}
                            </div>
                          </div>

                          <div className="text-2xl font-black">
                            FACKTS vs {game.opponent ?? "Opponent"}
                          </div>

                          <div className="mt-2 text-sm text-slate-400">
                            {game.match_type ?? "Game"}
                          </div>

                          {!game.is_upcoming ? (
                            <div className="mt-4 inline-flex rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg font-black">
                              <span className="text-orange-300">
                                {game.team_score ?? "-"}
                              </span>
                              <span className="mx-3 text-slate-500">-</span>
                              <span>{game.opponent_score ?? "-"}</span>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 text-sm text-orange-300">
                              Upcoming game. No score recorded yet.
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={`/games/${game.id}`}
                              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              onClick={() => startEdit(game)}
                              className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/10"
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
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
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
