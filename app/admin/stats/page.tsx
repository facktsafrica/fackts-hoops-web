"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Player = {
  id: string;
  full_name: string;
  jersey_number: string | null;
};

type Game = {
  id: string;
  opponent: string;
  game_date: string;
};

type FormState = {
  game_id: string;
  player_id: string;
  points: string;
  rebounds: string;
  offensive_rebounds: string;
  defensive_rebounds: string;
  assists: string;
  steals: string;
  blocks: string;
  turnovers: string;
  fouls: string;
  minutes: string;
  plus_minus: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  player_of_game: boolean;
  two_made: string;
  two_attempted: string;
  three_made: string;
  three_attempted: string;
  ft_made: string;
  ft_attempted: string;
};

const makeBlankStats = () => ({
  points: "0",
  rebounds: "0",
  offensive_rebounds: "0",
  defensive_rebounds: "0",
  assists: "0",
  steals: "0",
  blocks: "0",
  turnovers: "0",
  fouls: "0",
  minutes: "0",
  plus_minus: "0",
  q1: "0",
  q2: "0",
  q3: "0",
  q4: "0",
  player_of_game: false,
  two_made: "0",
  two_attempted: "0",
  three_made: "0",
  three_attempted: "0",
  ft_made: "0",
  ft_attempted: "0",
});

const initialForm: FormState = {
  game_id: "",
  player_id: "",
  ...makeBlankStats(),
};

export default function AdminStatsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [playersRes, gamesRes] = await Promise.all([
          fetch("/api/admin/players-list"),
          fetch("/api/admin/games-list"),
        ]);

        const playersJson = await playersRes.json();
        const gamesJson = await gamesRes.json();

        setPlayers(playersJson.players || []);
        setGames(gamesJson.games || []);
      } catch (error) {
        console.error("Failed to load admin lists:", error);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    async function loadExistingStats() {
      if (!form.game_id || !form.player_id) return;

      try {
        const response = await fetch(
          `/api/stats?game_id=${encodeURIComponent(form.game_id)}&player_id=${encodeURIComponent(form.player_id)}`
        );
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load saved stats.");
          return;
        }

        if (!result.stat) {
          setForm((prev) => ({
            game_id: prev.game_id,
            player_id: prev.player_id,
            ...makeBlankStats(),
          }));
          return;
        }

        const s = result.stat;
        setForm({
          game_id: s.game_id,
          player_id: s.player_id,
          points: String(s.points ?? 0),
          rebounds: String(s.rebounds ?? 0),
          offensive_rebounds: String(s.offensive_rebounds ?? 0),
          defensive_rebounds: String(s.defensive_rebounds ?? 0),
          assists: String(s.assists ?? 0),
          steals: String(s.steals ?? 0),
          blocks: String(s.blocks ?? 0),
          turnovers: String(s.turnovers ?? 0),
          fouls: String(s.fouls ?? 0),
          minutes: String(s.minutes ?? 0),
          plus_minus: String(s.plus_minus ?? 0),
          q1: String(s.q1 ?? 0),
          q2: String(s.q2 ?? 0),
          q3: String(s.q3 ?? 0),
          q4: String(s.q4 ?? 0),
          player_of_game: Boolean(s.player_of_game),
          two_made: String(s.two_made ?? 0),
          two_attempted: String(s.two_attempted ?? 0),
          three_made: String(s.three_made ?? 0),
          three_attempted: String(s.three_attempted ?? 0),
          ft_made: String(s.ft_made ?? 0),
          ft_attempted: String(s.ft_attempted ?? 0),
        });
      } catch (error) {
        console.error(error);
      }
    }

    loadExistingStats();
  }, [form.game_id, form.player_id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save stats.");
        setLoading(false);
        return;
      }

      setMessage("Stats saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while saving stats.");
    }

    setLoading(false);
  }

  function updateField(name: keyof FormState, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleGameChange(value: string) {
    setForm({
      game_id: value,
      player_id: "",
      ...makeBlankStats(),
    });
    setMessage("");
  }

  function handlePlayerChange(value: string) {
    setForm((prev) => ({
      game_id: prev.game_id,
      player_id: value,
      ...makeBlankStats(),
    }));
    setMessage("");
  }

  function clearCurrentStats() {
    setForm((prev) => ({
      game_id: prev.game_id,
      player_id: prev.player_id,
      ...makeBlankStats(),
    }));
    setMessage("Stats fields cleared.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">FACKTS Hoops Admin — Stats</h1>
              <p className="mt-2 text-slate-300">
                Enter player stats for a selected game.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Link href="/admin" className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                Player Admin
              </Link>
              <Link href="/admin/games" className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                Game Admin
              </Link>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Game</span>
              <select
                value={form.game_id}
                onChange={(e) => handleGameChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              >
                <option value="">Select game</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.game_date} - {game.opponent}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Player</span>
              <select
                value={form.player_id}
                onChange={(e) => handlePlayerChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              >
                <option value="">Select player</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.jersey_number ?? "—"} {player.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Num label="Points" value={form.points} onChange={(v) => updateField("points", v)} />
            <Num label="Rebounds" value={form.rebounds} onChange={(v) => updateField("rebounds", v)} />
            <Num label="Off Reb" value={form.offensive_rebounds} onChange={(v) => updateField("offensive_rebounds", v)} />
            <Num label="Def Reb" value={form.defensive_rebounds} onChange={(v) => updateField("defensive_rebounds", v)} />
            <Num label="Assists" value={form.assists} onChange={(v) => updateField("assists", v)} />
            <Num label="Steals" value={form.steals} onChange={(v) => updateField("steals", v)} />
            <Num label="Blocks" value={form.blocks} onChange={(v) => updateField("blocks", v)} />
            <Num label="Turnovers" value={form.turnovers} onChange={(v) => updateField("turnovers", v)} />
            <Num label="Fouls" value={form.fouls} onChange={(v) => updateField("fouls", v)} />
            <Num label="Minutes" value={form.minutes} onChange={(v) => updateField("minutes", v)} />
            <Num label="+/-" value={form.plus_minus} onChange={(v) => updateField("plus_minus", v)} />
            <Num label="Q1" value={form.q1} onChange={(v) => updateField("q1", v)} />
            <Num label="Q2" value={form.q2} onChange={(v) => updateField("q2", v)} />
            <Num label="Q3" value={form.q3} onChange={(v) => updateField("q3", v)} />
            <Num label="Q4" value={form.q4} onChange={(v) => updateField("q4", v)} />
            <Num label="2 Made" value={form.two_made} onChange={(v) => updateField("two_made", v)} />
            <Num label="2 Att" value={form.two_attempted} onChange={(v) => updateField("two_attempted", v)} />
            <Num label="3 Made" value={form.three_made} onChange={(v) => updateField("three_made", v)} />
            <Num label="3 Att" value={form.three_attempted} onChange={(v) => updateField("three_attempted", v)} />
            <Num label="FT Made" value={form.ft_made} onChange={(v) => updateField("ft_made", v)} />
            <Num label="FT Att" value={form.ft_attempted} onChange={(v) => updateField("ft_attempted", v)} />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.player_of_game}
              onChange={(e) => updateField("player_of_game", e.target.checked)}
            />
            <span className="text-sm text-slate-300">Player of the Game</span>
          </label>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Stats"}
            </button>

            <button
              type="button"
              onClick={clearCurrentStats}
              className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
            >
              Clear Stats
            </button>

            {message && <p className="text-sm text-emerald-300">{message}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-400"
      />
    </label>
  );
}