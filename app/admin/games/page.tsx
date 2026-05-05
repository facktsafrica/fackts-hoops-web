"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type GameRow = {
  id: string;
  team_name: string;
  opponent: string;
  game_date: string;
  venue: string | null;
  match_type: string | null;
  notes: string | null;
  team_score: number;
  opponent_score: number;
};

type FormState = {
  id?: string;
  team_name: string;
  opponent: string;
  game_date: string;
  venue: string;
  match_type: string;
  notes: string;
  team_score: string;
  opponent_score: string;
};

const initialForm: FormState = {
  team_name: "FACKTS",
  opponent: "",
  game_date: "",
  venue: "",
  match_type: "League Game",
  notes: "",
  team_score: "0",
  opponent_score: "0",
};

export default function AdminGamesPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    try {
      const response = await fetch("/api/games");
      const result = await response.json();
      setGames(result.games || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadGameIntoForm(id: string) {
    try {
      const response = await fetch("/api/games");
      const result = await response.json();
      const found = (result.games || []).find((g: GameRow) => g.id === id);
      if (!found) return;

      setForm({
        id: found.id,
        team_name: found.team_name || "FACKTS",
        opponent: found.opponent || "",
        game_date: found.game_date || "",
        venue: found.venue || "",
        match_type: found.match_type || "League Game",
        notes: found.notes || "",
        team_score: String(found.team_score ?? 0),
        opponent_score: String(found.opponent_score ?? 0),
      });

      setMessage(`Loaded game vs ${found.opponent} for editing.`);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const method = form.id ? "PUT" : "POST";

    try {
      const response = await fetch("/api/games", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save game.");
        setLoading(false);
        return;
      }

      setMessage(
        form.id
          ? `Game updated: FACKTS vs ${result.game.opponent}`
          : `Game created: FACKTS vs ${result.game.opponent}`
      );

      setForm(initialForm);
      await loadGames();
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while saving game.");
    }

    setLoading(false);
  }

  function updateField(name: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function clearForm() {
    setForm(initialForm);
    setMessage("Form cleared.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">FACKTS Hoops Admin — Games</h1>
              <p className="mt-2 text-slate-300">
                Create and edit games directly in Supabase.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/admin"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Player Admin
              </Link>
              <Link
                href="/admin/stats"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Stats Admin
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Existing Games</h2>
              <button
                onClick={clearForm}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                New
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {games.length === 0 ? (
                <p className="text-sm text-slate-400">No games found.</p>
              ) : (
                games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => loadGameIntoForm(game.id)}
                    className="block w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left hover:bg-slate-800"
                  >
                    <div className="font-medium">FACKTS vs {game.opponent}</div>
                    <div className="text-sm text-slate-400">
                      {game.game_date} • {game.venue ?? "Venue TBA"}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      {game.team_score} - {game.opponent_score}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Team Name" value={form.team_name} onChange={(v) => updateField("team_name", v)} required />
              <Input label="Opponent" value={form.opponent} onChange={(v) => updateField("opponent", v)} required />
              <Input label="Game Date" type="date" value={form.game_date} onChange={(v) => updateField("game_date", v)} required />
              <Input label="Venue" value={form.venue} onChange={(v) => updateField("venue", v)} />
              <Input label="Match Type" value={form.match_type} onChange={(v) => updateField("match_type", v)} />
              <Input label="Notes" value={form.notes} onChange={(v) => updateField("notes", v)} />
              <Input label="FACKTS Score" type="number" value={form.team_score} onChange={(v) => updateField("team_score", v)} />
              <Input label="Opponent Score" type="number" value={form.opponent_score} onChange={(v) => updateField("opponent_score", v)} />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
              >
                {loading ? "Saving..." : form.id ? "Update Game" : "Create Game"}
              </button>

              <button
                type="button"
                onClick={clearForm}
                className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
              >
                Clear Form
              </button>

              {message && <p className="text-sm text-emerald-300">{message}</p>}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-400"
      />
    </label>
  );
}