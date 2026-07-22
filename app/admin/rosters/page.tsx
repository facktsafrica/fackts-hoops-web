"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

type RosterForm = {
  game_id: string;
  player_id: string;
  roster_role: string;
  roster_status: string;
  notes: string;
};

const emptyForm: RosterForm = {
  game_id: "",
  player_id: "",
  roster_role: "bench",
  roster_status: "confirmed",
  notes: "",
};

const rosterRoles = [
  { label: "Starter", value: "starter" },
  { label: "Bench", value: "bench" },
];

const rosterStatuses = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Unavailable", value: "unavailable" },
];

export default function AdminRostersPage() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [form, setForm] = useState<RosterForm>(emptyForm);

  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPageData(keepGameId?: string) {
    setLoadingPage(true);
    setMessage("");

    const [gamesResult, playersResult, rostersResult] = await Promise.all([
      supabase
        .from("games")
        .select("*")
        .eq("is_upcoming", true)
        .order("game_date", { ascending: true }),

      supabase
        .from("players")
        .select("*")
        .eq("is_active", true)
        .eq("player_type", FACKTS_PLAYER_TYPE)
        .order("jersey_number", { ascending: true }),

      supabase
        .from("game_rosters")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (gamesResult.error) {
      setMessage(`Failed to load games: ${gamesResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (playersResult.error) {
      setMessage(`Failed to load players: ${playersResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (rostersResult.error) {
      setMessage(`Failed to load rosters: ${rostersResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    const upcomingGames = gamesResult.data ?? [];

    setGames(upcomingGames);
    setPlayers(playersResult.data ?? []);
    setRosters(rostersResult.data ?? []);

    const currentGameStillExists = upcomingGames.some(
      (game) => game.id === keepGameId
    );

    const nextGameId = currentGameStillExists
      ? keepGameId
      : upcomingGames[0]?.id ?? "";

    setForm((prev) => ({
      ...prev,
      game_id: nextGameId || "",
    }));

    setLoadingPage(false);
  }

  async function refreshRostersOnly() {
    const { data, error } = await supabase
      .from("game_rosters")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to refresh rosters: ${error.message}`);
      return;
    }

    setRosters(data ?? []);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function updateField<K extends keyof RosterForm>(field: K, value: RosterForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const selectedGame = useMemo(() => {
    return games.find((game) => game.id === form.game_id) ?? null;
  }, [games, form.game_id]);

  const selectedGameRoster = useMemo(() => {
    return rosters.filter((row) => row.game_id === form.game_id);
  }, [rosters, form.game_id]);

  const rosterPlayerIds = useMemo(() => {
    return new Set(selectedGameRoster.map((row) => row.player_id));
  }, [selectedGameRoster]);

  const availablePlayers = useMemo(() => {
    return players.filter((player) => !rosterPlayerIds.has(player.id));
  }, [players, rosterPlayerIds]);

  function getPlayer(playerId: string) {
    return players.find((player) => player.id === playerId) ?? null;
  }

  async function handleAddRosterPlayer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!form.game_id) {
      setMessage("Please select an upcoming game.");
      setLoading(false);
      return;
    }

    if (!form.player_id) {
      setMessage("Please select a player.");
      setLoading(false);
      return;
    }

    const alreadyAddedToThisGame = selectedGameRoster.some(
      (row) => row.player_id === form.player_id
    );

    if (alreadyAddedToThisGame) {
      setMessage("This player is already on this selected game roster.");
      setLoading(false);
      return;
    }

    const payload = {
      game_id: form.game_id,
      player_id: form.player_id,
      roster_role: form.roster_role,
      roster_status: form.roster_status,
      notes: form.notes.trim() || null,
    };

    const result = await supabase.from("game_rosters").insert([payload]);

    if (result.error) {
      setMessage(`Failed to add player to roster: ${result.error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Player added to selected game roster.");

    setForm((prev) => ({
      ...prev,
      player_id: "",
      roster_role: "bench",
      roster_status: "confirmed",
      notes: "",
    }));

    await refreshRostersOnly();
    setLoading(false);
  }

  async function handleUpdateRosterRow(
    rowId: string,
    updates: { roster_role?: string; roster_status?: string; notes?: string | null }
  ) {
    setMessage("");

    const result = await supabase
      .from("game_rosters")
      .update(updates)
      .eq("id", rowId);

    if (result.error) {
      setMessage(`Failed to update roster: ${result.error.message}`);
      return;
    }

    await refreshRostersOnly();
  }

  async function handleRemoveRosterPlayer(rowId: string) {
    const yes = window.confirm("Remove this player from the selected game roster?");
    if (!yes) return;

    const result = await supabase.from("game_rosters").delete().eq("id", rowId);

    if (result.error) {
      setMessage(`Failed to remove player: ${result.error.message}`);
      return;
    }

    setMessage("Player removed from selected game roster.");
    await refreshRostersOnly();
  }

  const starters = selectedGameRoster.filter(
    (row) => row.roster_role === "starter"
  );

  const bench = selectedGameRoster.filter(
    (row) => row.roster_role === "bench"
  );

  const pending = selectedGameRoster.filter(
    (row) => row.roster_status === "pending"
  );

  const unavailable = selectedGameRoster.filter(
    (row) => row.roster_status === "unavailable"
  );

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
            Game Rosters
          </h1>

          <p className="mt-3 text-slate-400">
            Select any upcoming game and build its roster. The same player can
            appear in different games, but not twice in the same game.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading rosters...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Select Game
                </div>
                <h2 className="mt-1 text-2xl font-bold">Build Game Roster</h2>
              </div>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Upcoming Game
                </div>
                <select
                  value={form.game_id}
                  onChange={(e) => updateField("game_id", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select upcoming game</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.game_date ?? "Date TBA"} — FACKTS vs{" "}
                      {game.opponent ?? "Opponent"} — {game.venue ?? "Venue TBA"}
                    </option>
                  ))}
                </select>
              </label>

              {games.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  No upcoming games found. Go to Admin Games and mark games as
                  upcoming.
                </div>
              ) : null}

              {selectedGame ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
                  {selectedGame.poster_url ? (
                    <img
                      src={selectedGame.poster_url}
                      alt={`Poster for FACKTS vs ${selectedGame.opponent}`}
                      className="h-56 w-full object-cover"
                      style={{
                        objectPosition:
                          selectedGame.poster_position ?? "center center",
                      }}
                    />
                  ) : null}

                  <div className="p-5">
                    <div className="text-sm uppercase tracking-wide text-orange-300">
                      Selected Upcoming Game
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      FACKTS vs {selectedGame.opponent ?? "Opponent"}
                    </div>

                    <div className="mt-2 text-sm text-slate-400">
                      {selectedGame.game_date ?? "Date TBA"} •{" "}
                      {selectedGame.venue ?? "Venue TBA"} •{" "}
                      {selectedGame.match_type ?? "Game"}
                    </div>

                    <div className="mt-3 inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                      UPCOMING GAME
                    </div>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleAddRosterPlayer} className="mt-6 space-y-4">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Add Player
                  </div>
                  <select
                    value={form.player_id}
                    onChange={(e) => updateField("player_id", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select player</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        #{player.jersey_number ?? "—"} {player.full_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Role
                    </div>
                    <select
                      value={form.roster_role}
                      onChange={(e) => updateField("roster_role", e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      {rosterRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Status
                    </div>
                    <select
                      value={form.roster_status}
                      onChange={(e) =>
                        updateField("roster_status", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      {rosterStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Notes
                  </div>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    placeholder="Optional note, for example: late arrival, captain, injury check..."
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading || !form.game_id}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Adding..." : "Add Player to Selected Game"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Current Roster
                  </div>
                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedGame
                      ? `FACKTS vs ${selectedGame.opponent ?? "Opponent"}`
                      : "No game selected"}
                  </h2>
                </div>

                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {selectedGameRoster.length} players listed
                </div>
              </div>

              {!selectedGame ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  Select an upcoming game to view its roster.
                </div>
              ) : selectedGameRoster.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No roster has been added for this selected game yet.
                </div>
              ) : (
                <div className="space-y-6">
                  <RosterGroup
                    title="Starters"
                    rows={starters}
                    getPlayer={getPlayer}
                    onUpdate={handleUpdateRosterRow}
                    onRemove={handleRemoveRosterPlayer}
                  />

                  <RosterGroup
                    title="Bench"
                    rows={bench}
                    getPlayer={getPlayer}
                    onUpdate={handleUpdateRosterRow}
                    onRemove={handleRemoveRosterPlayer}
                  />

                  {pending.length > 0 ? (
                    <RosterGroup
                      title="Pending"
                      rows={pending}
                      getPlayer={getPlayer}
                      onUpdate={handleUpdateRosterRow}
                      onRemove={handleRemoveRosterPlayer}
                    />
                  ) : null}

                  {unavailable.length > 0 ? (
                    <RosterGroup
                      title="Unavailable"
                      rows={unavailable}
                      getPlayer={getPlayer}
                      onUpdate={handleUpdateRosterRow}
                      onRemove={handleRemoveRosterPlayer}
                    />
                  ) : null}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function RosterGroup({
  title,
  rows,
  getPlayer,
  onUpdate,
  onRemove,
}: {
  title: string;
  rows: any[];
  getPlayer: (playerId: string) => any;
  onUpdate: (
    rowId: string,
    updates: { roster_role?: string; roster_status?: string; notes?: string | null }
  ) => void;
  onRemove: (rowId: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-orange-300">
        {title}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
          No players in this group.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const player = getPlayer(row.player_id);

            return (
              <div
                key={row.id}
                className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {player?.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.full_name}
                        className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
                        style={{
                          objectPosition:
                            player.photo_position ?? "center center",
                        }}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                        🏀
                      </div>
                    )}

                    <div>
                      <div className="text-lg font-bold">
                        #{player?.jersey_number ?? "—"}{" "}
                        {player?.full_name ?? "Unknown Player"}
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        {player?.position ?? "Position TBA"} •{" "}
                        {player?.role ?? "Player"}
                      </div>

                      {row.notes ? (
                        <div className="mt-2 text-sm text-slate-500">
                          Note: {row.notes}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      value={row.roster_role ?? "bench"}
                      onChange={(e) =>
                        onUpdate(row.id, { roster_role: e.target.value })
                      }
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
                    >
                      <option value="starter">Starter</option>
                      <option value="bench">Bench</option>
                    </select>

                    <select
                      value={row.roster_status ?? "confirmed"}
                      onChange={(e) =>
                        onUpdate(row.id, { roster_status: e.target.value })
                      }
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="unavailable">Unavailable</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      className="rounded-2xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
