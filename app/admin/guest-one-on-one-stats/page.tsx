"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FormState = {
  guest_hooper_id: string;
  opponent_name: string;
  opponent_type: string;
  match_date: string;
  venue: string;
  points_scored: string;
  points_allowed: string;
  result: string;
  notes: string;
};

const emptyForm: FormState = {
  guest_hooper_id: "",
  opponent_name: "",
  opponent_type: "player",
  match_date: "",
  venue: "",
  points_scored: "0",
  points_allowed: "0",
  result: "pending",
  notes: "",
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resultToRecord(result: string) {
  const clean = result.toLowerCase();

  return {
    wins: clean === "win" ? 1 : 0,
    losses: clean === "loss" ? 1 : 0,
    matches_played: clean === "pending" ? 0 : 1,
  };
}

export default function AdminGuestOneOnOneStatsPage() {
  const [guestHoopers, setGuestHoopers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPageData() {
    setLoadingPage(true);
    setMessage("");

    const [guestsResult, matchesResult] = await Promise.all([
      supabase
        .from("guest_hoopers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("guest_one_on_one_stats")
        .select("*")
        .order("match_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (guestsResult.error) {
      setMessage(`Failed to load guest hoopers: ${guestsResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (matchesResult.error) {
      setMessage(`Failed to load guest 1v1 stats: ${matchesResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    setGuestHoopers(guestsResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function getGuest(guestId: string) {
    return (
      guestHoopers.find((guest) => String(guest.id) === String(guestId)) ?? null
    );
  }

  const selectedGuest = useMemo(() => {
    return getGuest(form.guest_hooper_id);
  }, [form.guest_hooper_id, guestHoopers]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function startEdit(match: any) {
    setEditingId(match.id);

    setForm({
      guest_hooper_id: match.guest_hooper_id ?? "",
      opponent_name: match.opponent_name ?? "",
      opponent_type: match.opponent_type ?? "player",
      match_date: match.match_date ?? "",
      venue: match.venue ?? "",
      points_scored: String(match.points_scored ?? 0),
      points_allowed: String(match.points_allowed ?? 0),
      result: match.result ?? "pending",
      notes: match.notes ?? "",
    });

    setMessage("Guest 1v1 match loaded for editing.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    if (!form.guest_hooper_id) {
      setMessage("Please select a guest hooper.");
      setLoading(false);
      return;
    }

    if (!form.opponent_name.trim()) {
      setMessage("Please enter the opponent name.");
      setLoading(false);
      return;
    }

    const record = resultToRecord(form.result);

    const payload = {
      guest_hooper_id: form.guest_hooper_id,
      opponent_name: form.opponent_name.trim(),
      opponent_type: form.opponent_type,
      match_date: form.match_date || null,
      venue: form.venue.trim() || null,
      points_scored: numberValue(form.points_scored),
      points_allowed: numberValue(form.points_allowed),
      result: form.result,
      wins: record.wins,
      losses: record.losses,
      matches_played: record.matches_played,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const result = await supabase
        .from("guest_one_on_one_stats")
        .update(payload)
        .eq("id", editingId);

      if (result.error) {
        setMessage(`Failed to update guest 1v1 stats: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Guest 1v1 stats updated.");
    } else {
      const result = await supabase
        .from("guest_one_on_one_stats")
        .insert([payload]);

      if (result.error) {
        setMessage(`Failed to save guest 1v1 stats: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Guest 1v1 stats saved.");
    }

    resetForm();
    await loadPageData();
    setLoading(false);
  }

  async function handleDelete(matchId: string) {
    const yes = window.confirm("Delete this guest 1v1 match?");
    if (!yes) return;

    const result = await supabase
      .from("guest_one_on_one_stats")
      .delete()
      .eq("id", matchId);

    if (result.error) {
      setMessage(`Failed to delete guest 1v1 match: ${result.error.message}`);
      return;
    }

    setMessage("Guest 1v1 match deleted.");
    await loadPageData();
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
            Guest 1v1 Stats
          </h1>

          <p className="mt-3 text-slate-400">
            Feed 1v1 match results for guest hoopers so guest 1v1 leaderboards
            can update.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading guest 1v1 stats...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  {editingId ? "Edit Match" : "Enter Match"}
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  {editingId ? "Update Guest 1v1 Result" : "Add Guest 1v1 Result"}
                </h2>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Guest Hooper
                  </div>

                  <select
                    value={form.guest_hooper_id}
                    onChange={(event) =>
                      updateField("guest_hooper_id", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select guest hooper</option>
                    {guestHoopers.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.full_name}
                        {guest.position ? ` - ${guest.position}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedGuest ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Selected:{" "}
                    <span className="font-black text-orange-300">
                      {selectedGuest.full_name}
                    </span>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Opponent Name
                    </div>

                    <input
                      value={form.opponent_name}
                      onChange={(event) =>
                        updateField("opponent_name", event.target.value)
                      }
                      placeholder="Example: Titus Ngayo"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Opponent Type
                    </div>

                    <select
                      value={form.opponent_type}
                      onChange={(event) =>
                        updateField("opponent_type", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      <option value="player">FACKTS Player</option>
                      <option value="guest">Guest Hooper</option>
                      <option value="external">External Player</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Match Date
                    </div>

                    <input
                      type="date"
                      value={form.match_date}
                      onChange={(event) =>
                        updateField("match_date", event.target.value)
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
                      onChange={(event) => updateField("venue", event.target.value)}
                      placeholder="Example: ACK Kahawa Sukari"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatInput
                    label="Guest Points"
                    value={form.points_scored}
                    onChange={(value) => updateField("points_scored", value)}
                  />

                  <StatInput
                    label="Opponent Points"
                    value={form.points_allowed}
                    onChange={(value) => updateField("points_allowed", value)}
                  />

                  <label className="block">
                    <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                      Result
                    </div>

                    <select
                      value={form.result}
                      onChange={(event) => updateField("result", event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-orange-400"
                    >
                      <option value="pending">Pending</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Notes
                  </div>

                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="Optional notes about the 1v1 battle"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Saving..."
                      : editingId
                      ? "Update Guest 1v1 Stats"
                      : "Save Guest 1v1 Stats"}
                  </button>

                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Saved Matches
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    Guest 1v1 Results
                  </h2>
                </div>

                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {matches.length} matches
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No guest 1v1 matches have been entered yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => {
                    const guest = getGuest(match.guest_hooper_id);

                    return (
                      <article
                        key={match.id}
                        className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {guest?.photo_url ? (
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
                                {guest?.full_name ?? "Unknown Guest"}
                              </div>

                              <div className="mt-1 text-sm text-slate-400">
                                vs {match.opponent_name ?? "Opponent"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {match.match_date ?? "Date TBA"}
                                {match.venue ? ` | ${match.venue}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(match)}
                              className="rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(match.id)}
                              className="rounded-2xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <MiniStat label="GF" value={match.points_scored ?? 0} />
                          <MiniStat label="GA" value={match.points_allowed ?? 0} />
                          <MiniStat
                            label="Result"
                            value={String(match.result ?? "pending").toUpperCase()}
                          />
                        </div>
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-black text-orange-300">{value}</div>
    </div>
  );
}