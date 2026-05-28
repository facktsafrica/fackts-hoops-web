"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
};

type GuestHooper = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
};

type OneOnOneRow = {
  id: string;

  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;

  opponent_type?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  opponent_name?: string | null;

  match_date?: string | null;
  venue?: string | null;
  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  result?: string | null;
  notes?: string | null;
  poster_url?: string | null;
  video_url?: string | null;
  highlight_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormState = {
  participant_type: "fackts_player" | "guest_hooper";
  participant_id: string;

  opponent_type: "fackts_player" | "guest_hooper" | "external";
  opponent_id: string;
  opponent_name: string;

  match_date: string;
  venue: string;
  points_scored: string;
  points_allowed: string;
  result: "pending" | "win" | "loss" | "draw";
  notes: string;
  video_url: string;
};

const emptyForm: FormState = {
  participant_type: "fackts_player",
  participant_id: "",

  opponent_type: "fackts_player",
  opponent_id: "",
  opponent_name: "",

  match_date: "",
  venue: "",
  points_scored: "0",
  points_allowed: "0",
  result: "pending",
  notes: "",
  video_url: "",
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPersonName(person: Player | GuestHooper | null | undefined) {
  if (!person) return "Unknown";
  return person.full_name || person.name || person.nickname || "Unnamed";
}

function getScoreResult(pointsScored: string, pointsAllowed: string) {
  const scored = numberValue(pointsScored);
  const allowed = numberValue(pointsAllowed);

  if (scored > allowed) return "win";
  if (scored < allowed) return "loss";
  if (scored === allowed && (scored > 0 || allowed > 0)) return "draw";

  return "pending";
}

function getResultLabel(result?: string | null) {
  const clean = (result || "").toLowerCase();

  if (clean === "win") return "Win";
  if (clean === "loss") return "Loss";
  if (clean === "draw") return "Draw";

  return "Pending";
}

function makeSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeParticipantType(
  row: OneOnOneRow
): "fackts_player" | "guest_hooper" {
  if (row.participant_type === "guest_hooper") return "guest_hooper";
  if (row.guest_hooper_id && !row.fackts_player_id) return "guest_hooper";
  return "fackts_player";
}

function normalizeOpponentType(
  row: OneOnOneRow
): "fackts_player" | "guest_hooper" | "external" {
  if (row.opponent_type === "fackts_player") return "fackts_player";
  if (row.opponent_type === "guest_hooper") return "guest_hooper";
  if (row.opponent_player_id) return "fackts_player";
  if (row.opponent_guest_hooper_id) return "guest_hooper";
  return "external";
}

function normalizeResult(result?: string | null): FormState["result"] {
  const clean = (result || "").toLowerCase();

  if (clean === "win") return "win";
  if (clean === "loss") return "loss";
  if (clean === "draw") return "draw";

  return "pending";
}

export default function AdminGuestOneOnOneStatsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [guestHoopers, setGuestHoopers] = useState<GuestHooper[]>([]);
  const [rows, setRows] = useState<OneOnOneRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingPosterUrl, setExistingPosterUrl] = useState<string | null>(
    null
  );
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPageData() {
    setLoadingPage(true);
    setMessage("");

    const [playersResult, guestsResult, rowsResult] = await Promise.all([
      supabase.from("players").select("*").order("created_at", {
        ascending: false,
      }),
      supabase.from("guest_hoopers").select("*").order("created_at", {
        ascending: false,
      }),
      supabase.from("guest_one_on_one_stats").select("*").order("created_at", {
        ascending: false,
      }),
    ]);

    if (playersResult.error) {
      setMessage(
        `Failed to load FACKTS players: ${playersResult.error.message}`
      );
      setLoadingPage(false);
      return;
    }

    if (guestsResult.error) {
      setMessage(`Failed to load guest hoopers: ${guestsResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (rowsResult.error) {
      setMessage(`Failed to load 1-on-1 results: ${rowsResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    setPlayers((playersResult.data || []) as Player[]);
    setGuestHoopers((guestsResult.data || []) as GuestHooper[]);
    setRows((rowsResult.data || []) as OneOnOneRow[]);
    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const participantOptions = useMemo(() => {
    if (form.participant_type === "fackts_player") {
      return players
        .map((player) => ({
          id: String(player.id),
          name: getPersonName(player),
          sub: player.position || "FACKTS Player",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return guestHoopers
      .map((guest) => ({
        id: String(guest.id),
        name: getPersonName(guest),
        sub: guest.position || "Guest Hooper",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [form.participant_type, players, guestHoopers]);

  const opponentOptions = useMemo(() => {
    if (form.opponent_type === "fackts_player") {
      return players
        .map((player) => ({
          id: String(player.id),
          name: getPersonName(player),
          sub: player.position || "FACKTS Player",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (form.opponent_type === "guest_hooper") {
      return guestHoopers
        .map((guest) => ({
          id: String(guest.id),
          name: getPersonName(guest),
          sub: guest.position || "Guest Hooper",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return [];
  }, [form.opponent_type, players, guestHoopers]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function findPlayer(id?: string | null) {
    if (!id) return null;
    return players.find((player) => String(player.id) === String(id)) || null;
  }

  function findGuest(id?: string | null) {
    if (!id) return null;
    return guestHoopers.find((guest) => String(guest.id) === String(id)) || null;
  }

  function getParticipantName(row: OneOnOneRow) {
    if (row.participant_type === "fackts_player" || row.fackts_player_id) {
      return getPersonName(findPlayer(row.fackts_player_id));
    }

    if (row.guest_hooper_id) {
      return getPersonName(findGuest(row.guest_hooper_id));
    }

    return "Participant";
  }

  function getOpponentName(row: OneOnOneRow) {
    if (row.opponent_type === "fackts_player" || row.opponent_player_id) {
      return getPersonName(findPlayer(row.opponent_player_id));
    }

    if (row.opponent_type === "guest_hooper" || row.opponent_guest_hooper_id) {
      return getPersonName(findGuest(row.opponent_guest_hooper_id));
    }

    return row.opponent_name || "Opponent";
  }

  async function uploadPoster() {
    if (!posterFile) return null;

    const fileExt = posterFile.name.split(".").pop() || "jpg";
    const cleanName = makeSafeFileName(posterFile.name);
    const filePath = `matchups/${Date.now()}-${
      cleanName || `poster.${fileExt}`
    }`;

    const uploadResult = await supabase.storage
      .from("one-on-one-posters")
      .upload(filePath, posterFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    const publicUrlResult = supabase.storage
      .from("one-on-one-posters")
      .getPublicUrl(filePath);

    return publicUrlResult.data.publicUrl;
  }

  function handleEdit(row: OneOnOneRow) {
    const participantType = normalizeParticipantType(row);
    const opponentType = normalizeOpponentType(row);

    setEditingId(row.id);
    setExistingPosterUrl(row.poster_url || null);
    setPosterFile(null);

    setForm({
      participant_type: participantType,
      participant_id:
        participantType === "fackts_player"
          ? String(row.fackts_player_id || "")
          : String(row.guest_hooper_id || ""),

      opponent_type: opponentType,
      opponent_id:
        opponentType === "fackts_player"
          ? String(row.opponent_player_id || "")
          : opponentType === "guest_hooper"
          ? String(row.opponent_guest_hooper_id || "")
          : "",

      opponent_name: opponentType === "external" ? row.opponent_name || "" : "",

      match_date: row.match_date || "",
      venue: row.venue || "",
      points_scored: String(row.points_scored ?? "0"),
      points_allowed: String(row.points_allowed ?? "0"),
      result: normalizeResult(row.result),
      notes: row.notes || "",
      video_url: row.video_url || "",
    });

    setMessage("Editing selected 1-on-1 game.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setExistingPosterUrl(null);
    setPosterFile(null);
    setForm(emptyForm);
    setMessage("Edit cancelled.");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    if (!form.participant_id) {
      setMessage("Please select the first participant.");
      setSaving(false);
      return;
    }

    if (form.opponent_type === "external") {
      if (!form.opponent_name.trim()) {
        setMessage("Please type the external opponent name.");
        setSaving(false);
        return;
      }
    } else if (!form.opponent_id) {
      setMessage("Please select the opponent.");
      setSaving(false);
      return;
    }

    if (
      form.opponent_type !== "external" &&
      form.participant_type === form.opponent_type &&
      form.participant_id === form.opponent_id
    ) {
      setMessage("A player cannot play 1-on-1 against themselves.");
      setSaving(false);
      return;
    }

    let posterUrl: string | null = existingPosterUrl;

    try {
      const uploadedPosterUrl = await uploadPoster();
      if (uploadedPosterUrl) posterUrl = uploadedPosterUrl;
    } catch (error: any) {
      setMessage(`Poster upload failed: ${error.message}`);
      setSaving(false);
      return;
    }

    let opponentName = form.opponent_name.trim();
    let opponentPlayerId: string | null = null;
    let opponentGuestHooperId: string | null = null;

    if (form.opponent_type === "fackts_player") {
      opponentPlayerId = form.opponent_id;
      opponentName = getPersonName(findPlayer(form.opponent_id));
    }

    if (form.opponent_type === "guest_hooper") {
      opponentGuestHooperId = form.opponent_id;
      opponentName = getPersonName(findGuest(form.opponent_id));
    }

    const autoResult = getScoreResult(form.points_scored, form.points_allowed);
    const finalResult = form.result === "pending" ? autoResult : form.result;

    const payload = {
      participant_type: form.participant_type,

      fackts_player_id:
        form.participant_type === "fackts_player" ? form.participant_id : null,

      guest_hooper_id:
        form.participant_type === "guest_hooper" ? form.participant_id : null,

      opponent_type: form.opponent_type,
      opponent_player_id: opponentPlayerId,
      opponent_guest_hooper_id: opponentGuestHooperId,
      opponent_name: opponentName,

      match_date: form.match_date || null,
      venue: form.venue.trim() || null,
      points_scored: numberValue(form.points_scored),
      points_allowed: numberValue(form.points_allowed),
      result: finalResult,
      notes: form.notes.trim() || null,
      poster_url: posterUrl,
      video_url: form.video_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("guest_one_on_one_stats")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("guest_one_on_one_stats").insert(payload);

    if (result.error) {
      setMessage(
        editingId
          ? `Failed to update 1-on-1 result: ${result.error.message}`
          : `Failed to save 1-on-1 result: ${result.error.message}`
      );
      setSaving(false);
      return;
    }

    setMessage(editingId ? "1-on-1 game updated." : "1-on-1 game saved.");

    const keepGameInfo = {
      participant_type: form.participant_type,
      participant_id: form.participant_id,
      opponent_type: form.opponent_type,
      opponent_id: form.opponent_id,
      opponent_name: form.opponent_name,
      match_date: form.match_date,
      venue: form.venue,
      video_url: form.video_url,
    };

    setEditingId(null);
    setExistingPosterUrl(null);
    setPosterFile(null);

    setForm({
      ...emptyForm,
      ...keepGameInfo,
      points_scored: "0",
      points_allowed: "0",
      result: "pending",
      notes: "",
    });

    await loadPageData();
    setSaving(false);
  }

  async function handleDelete(rowId: string) {
    const yes = window.confirm("Delete this 1-on-1 result?");
    if (!yes) return;

    const result = await supabase
      .from("guest_one_on_one_stats")
      .delete()
      .eq("id", rowId);

    if (result.error) {
      setMessage(`Failed to delete result: ${result.error.message}`);
      return;
    }

    if (editingId === rowId) {
      setEditingId(null);
      setExistingPosterUrl(null);
      setPosterFile(null);
      setForm(emptyForm);
    }

    setMessage("1-on-1 result deleted.");
    await loadPageData();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl">
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
            Add 1-on-1 Game / Result
          </h1>

          <p className="mt-3 text-slate-400">
            Record FACKTS vs FACKTS, FACKTS vs guest, guest vs guest, or external
            1-on-1 matchups.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading 1-on-1 form...
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    {editingId ? "Edit Match" : "Enter Match"}
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    {editingId
                      ? "Edit 1-on-1 Game / Result"
                      : "Add 1-on-1 Game / Result"}
                  </h2>
                </div>

                {editingId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Participant Type
                    </div>

                    <select
                      value={form.participant_type}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          participant_type: event.target
                            .value as FormState["participant_type"],
                          participant_id: "",
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      <option value="fackts_player">FACKTS Player</option>
                      <option value="guest_hooper">Guest Hooper</option>
                    </select>
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Participant
                    </div>

                    <select
                      value={form.participant_id}
                      onChange={(event) =>
                        updateField("participant_id", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      <option value="">Select participant</option>
                      {participantOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} - {option.sub}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Opponent Type
                    </div>

                    <select
                      value={form.opponent_type}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          opponent_type: event.target
                            .value as FormState["opponent_type"],
                          opponent_id: "",
                          opponent_name: "",
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      <option value="fackts_player">FACKTS Player</option>
                      <option value="guest_hooper">Guest Hooper</option>
                      <option value="external">External Hooper</option>
                    </select>
                  </label>

                  {form.opponent_type === "external" ? (
                    <label className="block">
                      <div className="mb-2 text-sm font-medium text-slate-300">
                        External Opponent Name
                      </div>

                      <input
                        value={form.opponent_name}
                        onChange={(event) =>
                          updateField("opponent_name", event.target.value)
                        }
                        placeholder="Example: Hanns"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <div className="mb-2 text-sm font-medium text-slate-300">
                        Opponent
                      </div>

                      <select
                        value={form.opponent_id}
                        onChange={(event) =>
                          updateField("opponent_id", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                      >
                        <option value="">Select opponent</option>
                        {opponentOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} - {option.sub}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                      placeholder="Example: KMTC, Upper Hill"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Participant Points
                    </div>

                    <input
                      type="number"
                      value={form.points_scored}
                      onChange={(event) =>
                        updateField("points_scored", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Opponent Points
                    </div>

                    <input
                      type="number"
                      value={form.points_allowed}
                      onChange={(event) =>
                        updateField("points_allowed", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-300">
                      Result
                    </div>

                    <select
                      value={form.result}
                      onChange={(event) =>
                        updateField(
                          "result",
                          event.target.value as FormState["result"]
                        )
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    >
                      <option value="pending">Auto / Pending</option>
                      <option value="win">Participant Win</option>
                      <option value="loss">Participant Loss</option>
                      <option value="draw">Draw</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Matchup Poster
                  </div>

                  {existingPosterUrl && !posterFile ? (
                    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <img
                        src={existingPosterUrl}
                        alt="Current matchup poster"
                        className="h-24 w-16 rounded-xl object-cover"
                      />

                      <div>
                        <div className="text-sm font-bold text-white">
                          Current poster will remain
                        </div>

                        <div className="text-xs text-slate-500">
                          Upload a new image below only if you want to replace it.
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
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-950"
                  />

                  {posterFile ? (
                    <p className="mt-2 text-xs text-orange-300">
                      Selected: {posterFile.name}
                    </p>
                  ) : null}
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
                    placeholder="Paste YouTube, Shorts, Vimeo, or direct video link"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    This creates one simple Play button on the public 1-on-1 card.
                  </p>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Notes
                  </div>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={3}
                    placeholder="Optional notes about the 1-on-1 battle"
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
                    ? "Update 1-on-1 Game"
                    : "Save 1-on-1 Game"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    Saved Matches
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    1-on-1 Games / Results
                  </h2>
                </div>

                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {rows.length} matches
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <article
                      key={row.id}
                      className={
                        editingId === row.id
                          ? "rounded-2xl border border-orange-500/60 bg-orange-500/10 p-4"
                          : "rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      }
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        {row.poster_url ? (
                          <img
                            src={row.poster_url}
                            alt={`${getParticipantName(row)} vs ${getOpponentName(row)}`}
                            className="h-28 w-20 rounded-xl object-cover"
                          />
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-black text-white">
                            {getParticipantName(row)} vs {getOpponentName(row)}
                          </div>

                          <div className="mt-1 text-sm text-slate-400">
                            {row.match_date || "Date not added"} |{" "}
                            {row.venue || "Venue not added"}
                          </div>

                          <div className="mt-2 text-sm font-bold text-orange-300">
                            {row.points_scored ?? 0} - {row.points_allowed ?? 0} |{" "}
                            {getResultLabel(row.result)}
                          </div>

                          {row.video_url ? (
                            <p className="mt-2 text-xs font-bold text-orange-300">
                              Video linked
                            </p>
                          ) : null}

                          {row.notes ? (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {row.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="rounded-2xl border border-orange-500/40 px-3 py-2 text-sm text-orange-300 hover:bg-orange-500/10"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
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
                  No 1-on-1 games have been entered yet.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}