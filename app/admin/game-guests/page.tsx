"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type GuestRosterForm = {
  game_id: string;
  guest_hooper_id: string;
  roster_role: string;
  roster_status: string;
  notes: string;
};

const emptyForm: GuestRosterForm = {
  game_id: "",
  guest_hooper_id: "",
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

export default function AdminGameGuestsPage() {
  const [games, setGames] = useState<any[]>([]);
  const [guestHoopers, setGuestHoopers] = useState<any[]>([]);
  const [guestRosters, setGuestRosters] = useState<any[]>([]);
  const [form, setForm] = useState<GuestRosterForm>(emptyForm);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPageData() {
    setLoadingPage(true);
    setMessage("");

    const [gamesResult, guestsResult, rostersResult] = await Promise.all([
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
        .from("game_guest_rosters")
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

    if (rostersResult.error) {
      setMessage(`Failed to load guest rosters: ${rostersResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    const loadedGames = gamesResult.data ?? [];

    setGames(loadedGames);
    setGuestHoopers(guestsResult.data ?? []);
    setGuestRosters(rostersResult.data ?? []);

    const firstGame = loadedGames[0];

    setForm((prev) => ({
      ...prev,
      game_id: prev.game_id || firstGame?.id || "",
    }));

    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function updateField<K extends keyof GuestRosterForm>(
    field: K,
    value: GuestRosterForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const selectedGame = useMemo(() => {
    return games.find((game) => game.id === form.game_id) ?? null;
  }, [games, form.game_id]);

  const selectedGameGuestRoster = useMemo(() => {
    return guestRosters.filter((row) => row.game_id === form.game_id);
  }, [guestRosters, form.game_id]);

  const selectedGuestIds = useMemo(() => {
    return new Set(
      selectedGameGuestRoster.map((row) => row.guest_hooper_id)
    );
  }, [selectedGameGuestRoster]);

  const availableGuestHoopers = useMemo(() => {
    return guestHoopers.filter((guest) => !selectedGuestIds.has(guest.id));
  }, [guestHoopers, selectedGuestIds]);

  function getGuestHooper(guestId: string) {
    return guestHoopers.find((guest) => guest.id === guestId) ?? null;
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();

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

    const payload = {
      game_id: form.game_id,
      guest_hooper_id: form.guest_hooper_id,
      roster_role: form.roster_role,
      roster_status: form.roster_status,
      notes: form.notes.trim() || null,
    };

    const result = await supabase.from("game_guest_rosters").insert([payload]);

    if (result.error) {
      setMessage(`Failed to add guest hooper: ${result.error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Guest hooper added to game roster.");

    setForm((prev) => ({
      ...prev,
      guest_hooper_id: "",
      roster_role: "bench",
      roster_status: "confirmed",
      notes: "",
    }));

    await loadPageData();
    setLoading(false);
  }

  async function handleUpdateGuestRoster(
    rowId: string,
    updates: {
      roster_role?: string;
      roster_status?: string;
      notes?: string | null;
    }
  ) {
    setMessage("");

    const result = await supabase
      .from("game_guest_rosters")
      .update(updates)
      .eq("id", rowId);

    if (result.error) {
      setMessage(`Failed to update guest roster: ${result.error.message}`);
      return;
    }

    await loadPageData();
  }

  async function handleRemoveGuest(rowId: string) {
    const yes = window.confirm("Remove this guest hooper from the game roster?");
    if (!yes) return;

    const result = await supabase
      .from("game_guest_rosters")
      .delete()
      .eq("id", rowId);

    if (result.error) {
      setMessage(`Failed to remove guest hooper: ${result.error.message}`);
      return;
    }

    setMessage("Guest hooper removed from game roster.");
    await loadPageData();
  }

  const starters = selectedGameGuestRoster.filter(
    (row) => row.roster_role === "starter"
  );

  const bench = selectedGameGuestRoster.filter(
    (row) => row.roster_role === "bench"
  );

  const pending = selectedGameGuestRoster.filter(
    (row) => row.roster_status === "pending"
  );

  const unavailable = selectedGameGuestRoster.filter(
    (row) => row.roster_status === "unavailable"
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
            Game Guest Rosters
          </h1>

          <p className="mt-3 text-slate-400">
            Add guest hoopers to normal FACKTS games and manage their game roster status.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading guest game rosters...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Select Game
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  Add Guest Hooper to Game
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Use this when a visiting baller or community player joins a FACKTS game.
                </p>
              </div>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Game
                </div>

                <select
                  value={form.game_id}
                  onChange={(e) => updateField("game_id", e.target.value)}
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

                    {selectedGame.is_upcoming ? (
                      <div className="mt-3 inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                        UPCOMING GAME
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleAddGuest} className="mt-6 space-y-4">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Guest Hooper
                  </div>

                  <select
                    value={form.guest_hooper_id}
                    onChange={(e) =>
                      updateField("guest_hooper_id", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select guest hooper</option>
                    {availableGuestHoopers.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.full_name}
                        {guest.position ? ` — ${guest.position}` : ""}
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
                      onChange={(e) =>
                        updateField("roster_role", e.target.value)
                      }
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
                    placeholder="Optional note, for example: invited guest, visiting guard, trial player..."
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {loading ? "Adding..." : "Add Guest to Game"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Current Guest Roster
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedGame
                      ? `FACKTS vs ${selectedGame.opponent}`
                      : "No game selected"}
                  </h2>
                </div>

                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {selectedGameGuestRoster.length} guest hoopers listed
                </div>
              </div>

              {!selectedGame ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  Select a game to view guest hoopers.
                </div>
              ) : selectedGameGuestRoster.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No guest hoopers have been added to this game yet.
                </div>
              ) : (
                <div className="space-y-6">
                  <GuestGroup
                    title="Starters"
                    rows={starters}
                    getGuestHooper={getGuestHooper}
                    onUpdate={handleUpdateGuestRoster}
                    onRemove={handleRemoveGuest}
                  />

                  <GuestGroup
                    title="Bench"
                    rows={bench}
                    getGuestHooper={getGuestHooper}
                    onUpdate={handleUpdateGuestRoster}
                    onRemove={handleRemoveGuest}
                  />

                  {pending.length > 0 ? (
                    <GuestGroup
                      title="Pending"
                      rows={pending}
                      getGuestHooper={getGuestHooper}
                      onUpdate={handleUpdateGuestRoster}
                      onRemove={handleRemoveGuest}
                    />
                  ) : null}

                  {unavailable.length > 0 ? (
                    <GuestGroup
                      title="Unavailable"
                      rows={unavailable}
                      getGuestHooper={getGuestHooper}
                      onUpdate={handleUpdateGuestRoster}
                      onRemove={handleRemoveGuest}
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

function GuestGroup({
  title,
  rows,
  getGuestHooper,
  onUpdate,
  onRemove,
}: {
  title: string;
  rows: any[];
  getGuestHooper: (guestId: string) => any;
  onUpdate: (
    rowId: string,
    updates: {
      roster_role?: string;
      roster_status?: string;
      notes?: string | null;
    }
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
          No guest hoopers in this group.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const guest = getGuestHooper(row.guest_hooper_id);

            return (
              <div
                key={row.id}
                className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {guest?.photo_url ? (
                      <img
                        src={guest.photo_url}
                        alt={guest.full_name}
                        className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
                        style={{
                          objectPosition:
                            guest.photo_position ?? "center center",
                        }}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                        🏀
                      </div>
                    )}

                    <div>
                      <div className="text-lg font-bold">
                        {guest?.full_name ?? "Unknown Guest Hooper"}
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        Guest Hooper • {guest?.position ?? "Position TBA"}
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