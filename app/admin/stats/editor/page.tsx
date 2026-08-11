"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

type StatForm = {
  points: string;
  three_pointers_made: string;
  rebounds: string;
  assists: string;
  steals: string;
  blocks: string;
  plus_minus: string;
};

const emptyStatForm: StatForm = {
  points: "0",
  three_pointers_made: "0",
  rebounds: "0",
  assists: "0",
  steals: "0",
  blocks: "0",
  plus_minus: "0",
};

export default function LegacyStatsEditorPage() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [forms, setForms] = useState<Record<string, StatForm>>({});
  const [loadingPage, setLoadingPage] = useState(true);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadPageData() {
    setLoadingPage(true);
    setMessage("");

    const [gamesResult, playersResult, rostersResult] = await Promise.all([
      supabase.from("games").select("*").order("game_date", { ascending: false }),
      supabase
        .from("players")
        .select("*")
        .eq("is_active", true)
        .eq("player_type", FACKTS_PLAYER_TYPE)
        .order("jersey_number", { ascending: true }),
      supabase
        .from("game_rosters")
        .select("*")
        .order("created_at", { ascending: true }),
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

    const loadedGames = gamesResult.data ?? [];
    const loadedPlayers = playersResult.data ?? [];

    setGames(loadedGames);
    setPlayers(loadedPlayers);
    setRosters(rostersResult.data ?? []);

    const firstGame = loadedGames[0];

    if (firstGame) {
      setSelectedGameId(firstGame.id);
      await loadStatsForGame(firstGame.id, loadedPlayers);
    }

    setLoadingPage(false);
  }

  async function loadStatsForGame(gameId: string, loadedPlayers?: any[]) {
    setMessage("");

    const { data, error } = await supabase
      .from("player_game_stats")
      .select("*")
      .eq("game_id", gameId);

    if (error) {
      setMessage(`Failed to load stats: ${error.message}`);
      return;
    }

    const loadedStats = data ?? [];
    setStats(loadedStats);

    const playerList = loadedPlayers ?? players;
    const nextForms: Record<string, StatForm> = {};

    playerList.forEach((player) => {
      const existing = loadedStats.find((row: any) => row.player_id === player.id);

      nextForms[player.id] = {
        points: String(existing?.points ?? 0),
        three_pointers_made: String(existing?.three_pointers_made ?? 0),
        rebounds: String(existing?.rebounds ?? 0),
        assists: String(existing?.assists ?? 0),
        steals: String(existing?.steals ?? 0),
        blocks: String(existing?.blocks ?? 0),
        plus_minus: String(existing?.plus_minus ?? 0),
      };
    });

    setForms(nextForms);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  async function handleGameChange(gameId: string) {
    setSelectedGameId(gameId);
    await loadStatsForGame(gameId);
  }

  const selectedGame = useMemo(() => {
    return games.find((game) => game.id === selectedGameId) ?? null;
  }, [games, selectedGameId]);

  const selectedGameRoster = useMemo(() => {
    return rosters.filter((row) => row.game_id === selectedGameId);
  }, [rosters, selectedGameId]);

  const rosterPlayerIds = useMemo(() => {
    return selectedGameRoster
      .filter((row) => row.roster_status !== "unavailable")
      .map((row) => row.player_id);
  }, [selectedGameRoster]);

  const playersForStats = useMemo(() => {
    if (rosterPlayerIds.length === 0) {
      return players;
    }

    const orderedRoster = selectedGameRoster.filter(
      (row) => row.roster_status !== "unavailable"
    );

    return orderedRoster
      .map((row) => players.find((player) => player.id === row.player_id))
      .filter(Boolean);
  }, [players, rosterPlayerIds, selectedGameRoster]);

  function getRosterRow(playerId: string) {
    return selectedGameRoster.find((row) => row.player_id === playerId) ?? null;
  }

  function getExistingStat(playerId: string) {
    return stats.find((row) => row.player_id === playerId) ?? null;
  }

  function updateStatField(playerId: string, field: keyof StatForm, value: string) {
    setForms((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] ?? emptyStatForm),
        [field]: value,
      },
    }));
  }

  function toNumber(value: string) {
    if (value === "" || value === null || value === undefined) return 0;
    return Number(value);
  }

  async function savePlayerStats(playerId: string) {
    if (!selectedGameId) {
      setMessage("Please select a game first.");
      return;
    }

    setSavingPlayerId(playerId);
    setMessage("");

    const form = forms[playerId] ?? emptyStatForm;
    const existing = getExistingStat(playerId);

    const payload = {
      game_id: selectedGameId,
      player_id: playerId,
      points: toNumber(form.points),
      three_pointers_made: toNumber(form.three_pointers_made),
      rebounds: toNumber(form.rebounds),
      assists: toNumber(form.assists),
      steals: toNumber(form.steals),
      blocks: toNumber(form.blocks),
      plus_minus: toNumber(form.plus_minus),
    };

    if (existing) {
      const result = await supabase
        .from("player_game_stats")
        .update(payload)
        .eq("id", existing.id);

      if (result.error) {
        setMessage(`Failed to update stats: ${result.error.message}`);
        setSavingPlayerId(null);
        return;
      }
    } else {
      const result = await supabase.from("player_game_stats").insert([payload]);

      if (result.error) {
        setMessage(`Failed to create stats: ${result.error.message}`);
        setSavingPlayerId(null);
        return;
      }
    }

    await loadStatsForGame(selectedGameId);
    setMessage("Stats saved.");
    setSavingPlayerId(null);
  }

  async function saveAllStats() {
    if (!selectedGameId) {
      setMessage("Please select a game first.");
      return;
    }

    setMessage("Saving all visible player stats...");

    for (const player of playersForStats) {
      const form = forms[player.id] ?? emptyStatForm;
      const existing = getExistingStat(player.id);

      const payload = {
        game_id: selectedGameId,
        player_id: player.id,
        points: toNumber(form.points),
        three_pointers_made: toNumber(form.three_pointers_made),
        rebounds: toNumber(form.rebounds),
        assists: toNumber(form.assists),
        steals: toNumber(form.steals),
        blocks: toNumber(form.blocks),
        plus_minus: toNumber(form.plus_minus),
      };

      if (existing) {
        const result = await supabase
          .from("player_game_stats")
          .update(payload)
          .eq("id", existing.id);

        if (result.error) {
          setMessage(`Failed while saving ${player.full_name}: ${result.error.message}`);
          return;
        }
      } else {
        const result = await supabase.from("player_game_stats").insert([payload]);

        if (result.error) {
          setMessage(`Failed while creating ${player.full_name}: ${result.error.message}`);
          return;
        }
      }
    }

    await loadStatsForGame(selectedGameId);
    setMessage("All stats saved successfully.");
  }

  async function markPlayerOfGame(playerId: string) {
    if (!selectedGameId) {
      setMessage("Please select a game first.");
      return;
    }

    setMessage("Updating Player of the Game...");

    const existing = getExistingStat(playerId);

    if (!existing) {
      await savePlayerStats(playerId);
    }

    const clearResult = await supabase
      .from("player_game_stats")
      .update({ player_of_game: false })
      .eq("game_id", selectedGameId);

    if (clearResult.error) {
      setMessage(`Failed to clear previous Player of the Game: ${clearResult.error.message}`);
      return;
    }

    const latestStatsResult = await supabase
      .from("player_game_stats")
      .select("*")
      .eq("game_id", selectedGameId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (latestStatsResult.error || !latestStatsResult.data) {
      setMessage("Could not find this player's saved stats. Save stats first, then mark Player of the Game.");
      return;
    }

    const setResult = await supabase
      .from("player_game_stats")
      .update({ player_of_game: true })
      .eq("id", latestStatsResult.data.id);

    if (setResult.error) {
      setMessage(`Failed to set Player of the Game: ${setResult.error.message}`);
      return;
    }

    await loadStatsForGame(selectedGameId);
    setMessage("Player of the Game updated.");
  }

  const totals = playersForStats.reduce(
    (acc: any, player: any) => {
      const form = forms[player.id] ?? emptyStatForm;
      acc.points += toNumber(form.points);
      acc.three_pointers_made += toNumber(form.three_pointers_made);
      acc.rebounds += toNumber(form.rebounds);
      acc.assists += toNumber(form.assists);
      acc.steals += toNumber(form.steals);
      acc.blocks += toNumber(form.blocks);
      return acc;
    },
    {
      points: 0,
      three_pointers_made: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
    }
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
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

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Game Stats
          </h1>

          <p className="mt-3 text-slate-400">
            Enter player stats using the confirmed roster for each game. This now includes 3-pointers made.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading stats page...
          </div>
        ) : (
          <>
            <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr,1fr] lg:items-end">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Select Game
                  </div>
                  <select
                    value={selectedGameId}
                    onChange={(e) => handleGameChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select game</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.game_date ?? "Date TBA"} — FACKTS vs {game.opponent}
                        {game.is_upcoming ? " — UPCOMING" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveAllStats}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400"
                  >
                    Save All Visible Stats
                  </button>

                  {selectedGame ? (
                    <Link
                      href={`/games/${selectedGame.id}`}
                      className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      View Game Page
                    </Link>
                  ) : null}
                </div>
              </div>

              {selectedGame ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
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
                      Selected Game
                    </div>
                    <div className="mt-2 text-2xl font-black">
                      FACKTS vs {selectedGame.opponent}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {selectedGame.game_date ?? "Date TBA"} •{" "}
                      {selectedGame.venue ?? "Venue TBA"} •{" "}
                      {selectedGame.match_type ?? "Game"}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <Summary label="PTS" value={String(totals.points)} />
                      <Summary label="3PM" value={String(totals.three_pointers_made)} />
                      <Summary label="REB" value={String(totals.rebounds)} />
                      <Summary label="AST" value={String(totals.assists)} />
                      <Summary label="STL" value={String(totals.steals)} />
                      <Summary label="BLK" value={String(totals.blocks)} />
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Player Entry
                  </div>
                  <h2 className="mt-1 text-2xl font-bold">
                    {playersForStats.length} players available
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    If a game has a roster, only roster players appear here. If not, all active players appear.
                  </p>
                </div>
              </div>

              {playersForStats.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No players found for this game.
                </div>
              ) : (
                <div className="space-y-4">
                  {playersForStats.map((player: any) => {
                    const rosterRow = getRosterRow(player.id);
                    const existingStat = getExistingStat(player.id);
                    const form = forms[player.id] ?? emptyStatForm;

                    return (
                      <div
                        key={player.id}
                        className="rounded-3xl border border-slate-800 bg-slate-950 p-5"
                      >
                        <div className="grid gap-5 xl:grid-cols-[1fr,1.4fr] xl:items-center">
                          <div className="flex items-center gap-4">
                            {player.photo_url ? (
                              <img
                                src={player.photo_url}
                                alt={player.full_name}
                                className="h-20 w-20 rounded-2xl border border-slate-700 object-cover"
                                style={{
                                  objectPosition:
                                    player.photo_position ?? "center center",
                                }}
                              />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
                                🏀
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-xl font-bold">
                                  #{player.jersey_number ?? "—"} {player.full_name}
                                </div>

                                {existingStat?.player_of_game ? (
                                  <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-black text-slate-950">
                                    PLAYER OF GAME
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-1 text-sm text-slate-400">
                                {player.position ?? "Position TBA"} •{" "}
                                {player.role ?? "Player"}
                              </div>

                              {rosterRow ? (
                                <div className="mt-2 text-xs text-slate-500">
                                  Roster: {rosterRow.roster_role ?? "bench"} •{" "}
                                  {rosterRow.roster_status ?? "confirmed"}
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-slate-600">
                                  Not from roster list
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
                              <StatInput
                                label="PTS"
                                value={form.points}
                                onChange={(value) =>
                                  updateStatField(player.id, "points", value)
                                }
                              />
                              <StatInput
                                label="3PM"
                                value={form.three_pointers_made}
                                onChange={(value) =>
                                  updateStatField(
                                    player.id,
                                    "three_pointers_made",
                                    value
                                  )
                                }
                              />
                              <StatInput
                                label="REB"
                                value={form.rebounds}
                                onChange={(value) =>
                                  updateStatField(player.id, "rebounds", value)
                                }
                              />
                              <StatInput
                                label="AST"
                                value={form.assists}
                                onChange={(value) =>
                                  updateStatField(player.id, "assists", value)
                                }
                              />
                              <StatInput
                                label="STL"
                                value={form.steals}
                                onChange={(value) =>
                                  updateStatField(player.id, "steals", value)
                                }
                              />
                              <StatInput
                                label="BLK"
                                value={form.blocks}
                                onChange={(value) =>
                                  updateStatField(player.id, "blocks", value)
                                }
                              />
                              <StatInput
                                label="+/-"
                                value={form.plus_minus}
                                onChange={(value) =>
                                  updateStatField(player.id, "plus_minus", value)
                                }
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => savePlayerStats(player.id)}
                                disabled={savingPlayerId === player.id}
                                className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-60"
                              >
                                {savingPlayerId === player.id ? "Saving..." : "Save Stats"}
                              </button>

                              <button
                                type="button"
                                onClick={() => markPlayerOfGame(player.id)}
                                className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10"
                              >
                                Mark Player of Game
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatInput({
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
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}
