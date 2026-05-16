"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type StatForm = {
  game_id: string;
  guest_hooper_id: string;
  points: string;
  rebounds: string;
  assists: string;
  steals: string;
  blocks: string;
  turnovers: string;
  fouls: string;
  three_pointers_made: string;
  plus_minus: string;
  is_player_of_the_game: boolean;
  notes: string;
};

const emptyForm: StatForm = {
  game_id: "",
  guest_hooper_id: "",
  points: "0",
  rebounds: "0",
  assists: "0",
  steals: "0",
  blocks: "0",
  turnovers: "0",
  fouls: "0",
  three_pointers_made: "0",
  plus_minus: "0",
  is_player_of_the_game: false,
  notes: "",
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function gameLabel(game: any) {
  const date = game.game_date ?? "Date TBA";
  const opponent = game.opponent ?? "Opponent";
  return `${date} - FACKTS vs ${opponent}`;
}

export default function AdminGuestGameStatsPage() {
  const [games, setGames] = useState<any[]>([]);
  const [guestHoopers, setGuestHoopers] = useState<any[]>([]);
  const [guestStats, setGuestStats] = useState<any[]>([]);
  const [form, setForm] = useState<StatForm>(emptyForm);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPageData(keepGameId?: string) {
    setLoadingPage(true);

    const [gamesResult, guestsResult, statsResult] = await Promise.all([
      supabase
        .from("games")
        .select("*")
        .order("game_date", { ascending: false }),

      supabase
        .from("guest_hoopers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("guest_game_stats")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (gamesResult.error) {
      setMessage(`Failed to load games: ${gamesResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (guestsResult.error) {
      setMessage(`Failed to load guest hoopers: ${guestsResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (statsResult.error) {
      setMessage(`Failed to load guest stats: ${statsResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    const loadedGames = gamesResult.data ?? [];
    const currentGameId = keepGameId || form.game_id || loadedGames[0]?.id || "";

    setGames(loadedGames);
    setGuestHoopers(guestsResult.data ?? []);
    setGuestStats(statsResult.data ?? []);

    setForm((prev) => ({
      ...prev,
      game_id: currentGameId,
    }));

    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField<K extends keyof StatForm>(field: K, value: StatForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const selectedGame = useMemo(() => {
    return games.find((game) => game.id === form.game_id) ?? null;
  }, [games, form.game_id]);

  const selectedGameStats = useMemo(() => {
    return guestStats.filter(
      (row) => String(row.game_id) === String(form.game_id)
    );
  }, [guestStats, form.game_id]);

  function getGuest(guestId: string) {
    return (
      guestHoopers.find((guest) => String(guest.id) === String(guestId)) ?? null
    );
  }

  function getExistingStat(guestId: string) {
    return (
      guestStats.find(
        (row) =>
          String(row.game_id) === String(form.game_id) &&
          String(row.guest_hooper_id) === String(guestId)
      ) ?? null
    );
  }

  function loadGuestIntoForm(guestId: string) {
    const existing = getExistingStat(guestId);

    if (!existing) {
      setForm((prev) => ({
        ...prev,
        guest_hooper_id: guestId,
        points: "0",
        rebounds: "0",
        assists: "0",
        steals: "0",
        blocks: "0",
        turnovers: "0",
        fouls: "0",
        three_pointers_made: "0",
        plus_minus: "0",
        is_player_of_the_game: false,
        notes: "",
      }));

      setMessage("Ready to feed new guest stats.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      guest_hooper_id: guestId,
      points: String(existing.points ?? 0),
      rebounds: String(existing.rebounds ?? 0),
      assists: String(existing.assists ?? 0),
      steals: String(existing.steals ?? 0),
      blocks: String(existing.blocks ?? 0),
      turnovers: String(existing.turnovers ?? 0),
      fouls: String(existing.fouls ?? 0),
      three_pointers_made: String(existing.three_pointers_made ?? 0),
      plus_minus: String(existing.plus_minus ?? 0),
      is_player_of_the_game: Boolean(existing.is_player_of_the_game),
      notes: existing.notes ?? "",
    }));

    setMessage("Existing guest stats loaded for editing.");
  }

  async function handleSaveStats(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    if (!form.game_id) {
      setMessage("Please select a game.");
      setLoading(false);
      return;
    }

    if (!form.guest_hooper_id) {
      setMessage("Please select a guest hooper.");
      setLoading(false);
      return;
    }

    if (form.is_player_of_the_game) {
      await supabase
        .from("guest_game_stats")
        .update({ is_player_of_the_game: false })
        .eq("game_id", form.game_id);
    }

    const payload = {
      game_id: form.game_id,
      guest_hooper_id: form.guest_hooper_id,
      points: numberValue(form.points),
      rebounds: numberValue(form.rebounds),
      assists: numberValue(form.assists),
      steals: numberValue(form.steals),
      blocks: numberValue(form.blocks),
      turnovers: numberValue(form.turnovers),
      fouls: numberValue(form.fouls),
      three_pointers_made: numberValue(form.three_pointers_made),
      plus_minus: numberValue(form.plus_minus),
      is_player_of_the_game: form.is_player_of_the_game,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = await supabase.from("guest_game_stats").upsert(payload, {
      onConflict: "game_id,guest_hooper_id",
    });

    if (result.error) {
      setMessage(`Failed to save guest stats: ${result.error.message}`);
      setLoading(false);
      return;
    }

    const currentGameId = form.game_id;

    setForm((prev) => ({
      ...emptyForm,
      game_id: prev.game_id,
    }));

    setMessage("Guest game stats saved.");
    await loadPageData(currentGameId);
    setLoading(false);
  }

  async function handleDeleteStat(rowId: string) {
    const yes = window.confirm("Delete these guest stats?");
    if (!yes) return;

    const result = await supabase
      .from("guest_game_stats")
      .delete()
      .eq("id", rowId);

    if (result.error) {
      setMessage(`Failed to delete guest stats: ${result.error.message}`);
      return;
    }

    const currentGameId = form.game_id;
    setMessage("Guest stats deleted.");
    await loadPageData(currentGameId);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
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
            Guest Game Stats
          </h1>

          <p className="mt-3 text-slate-400">
            Feed guest hooper stats for any selected game.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading guest game stats...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Enter Stats
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  Guest Game Performance
                </h2>
              </div>

              <form onSubmit={handleSaveStats} className="space-y-4">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Game
                  </div>

                  <select
                    value={form.game_id}
                    onChange={(event) => {
                      setForm({
                        ...emptyForm,
                        game_id: event.target.value,
                      });
                    }}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select game</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {gameLabel(game)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Guest Hooper
                  </div>

                  <select
                    value={form.guest_hooper_id}
                    onChange={(event) => loadGuestIntoForm(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select guest hooper</option>
                    {guestHoopers.map((guest) => {
                      const existing = getExistingStat(guest.id);

                      return (
                        <option key={guest.id} value={guest.id}>
                          {guest.full_name}
                          {guest.position ? ` - ${guest.position}` : ""}
                          {existing ? " - stats already fed" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <StatInput
                    label="Points"
                    value={form.points}
                    onChange={(value) => updateField("points", value)}
                  />

                  <StatInput
                    label="Rebounds"
                    value={form.rebounds}
                    onChange={(value) => updateField("rebounds", value)}
                  />

                  <StatInput
                    label="Assists"
                    value={form.assists}
                    onChange={(value) => updateField("assists", value)}
                  />

                  <StatInput
                    label="Steals"
                    value={form.steals}
                    onChange={(value) => updateField("steals", value)}
                  />

                  <StatInput
                    label="Blocks"
                    value={form.blocks}
                    onChange={(value) => updateField("blocks", value)}
                  />

                  <StatInput
                    label="Turnovers"
                    value={form.turnovers}
                    onChange={(value) => updateField("turnovers", value)}
                  />

                  <StatInput
                    label="Fouls"
                    value={form.fouls}
                    onChange={(value) => updateField("fouls", value)}
                  />

                  <StatInput
                    label="3PM"
                    value={form.three_pointers_made}
                    onChange={(value) =>
                      updateField("three_pointers_made", value)
                    }
                  />

                  <StatInput
                    label="+/-"
                    value={form.plus_minus}
                    onChange={(value) => updateField("plus_minus", value)}
                  />
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
                  <span className="text-sm font-medium text-slate-300">
                    Guest Player of the Game
                  </span>

                  <input
                    type="checkbox"
                    checked={form.is_player_of_the_game}
                    onChange={(event) =>
                      updateField("is_player_of_the_game", event.target.checked)
                    }
                    className="h-5 w-5 accent-orange-500"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Notes
                  </div>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={3}
                    placeholder="Optional notes about the performance"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Guest Stats"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Current Game Guest Stats
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedGame ? gameLabel(selectedGame) : "No game selected"}
                  </h2>
                </div>

                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {selectedGameStats.length} saved
                </div>
              </div>

              {guestHoopers.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No active guest hoopers found. Create guest hoopers first.
                </div>
              ) : (
                <div className="space-y-3">
                  {guestHoopers.map((guest) => {
                    const stat = getExistingStat(guest.id);

                    return (
                      <article
                        key={guest.id}
                        className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {guest.photo_url ? (
                              <img
                                src={guest.photo_url}
                                alt={guest.full_name}
                                className="h-14 w-14 rounded-2xl border border-slate-700 object-cover"
                                style={{
                                  objectPosition:
                                    guest.photo_position ?? "center center",
                                }}
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-sm font-black text-orange-300">
                                GH
                              </div>
                            )}

                            <div>
                              <div className="text-lg font-bold">
                                {guest.full_name}
                              </div>

                              <div className="mt-1 text-sm text-slate-400">
                                {guest.position ?? "Guest Hooper"}
                                {stat?.is_player_of_the_game
                                  ? " | Guest Player of the Game"
                                  : ""}
                              </div>

                              {!stat ? (
                                <div className="mt-1 text-xs font-bold text-orange-300">
                                  No stats fed for this selected game
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => loadGuestIntoForm(guest.id)}
                              className="rounded-2xl border border-orange-500/40 px-3 py-2 text-sm text-orange-300 hover:bg-orange-500/10"
                            >
                              {stat ? "Edit Stats" : "Feed Stats"}
                            </button>

                            {stat?.id ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteStat(stat.id)}
                                className="rounded-2xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {stat ? (
                          <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6">
                            <MiniStat label="PTS" value={stat.points ?? 0} />
                            <MiniStat label="REB" value={stat.rebounds ?? 0} />
                            <MiniStat label="AST" value={stat.assists ?? 0} />
                            <MiniStat label="STL" value={stat.steals ?? 0} />
                            <MiniStat label="BLK" value={stat.blocks ?? 0} />
                            <MiniStat
                              label="3PM"
                              value={stat.three_pointers_made ?? 0}
                            />
                          </div>
                        ) : null}
                      </article>
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
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-orange-300">{value}</div>
    </div>
  );
}