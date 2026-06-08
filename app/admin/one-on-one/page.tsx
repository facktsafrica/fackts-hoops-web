"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { supabase } from "@/lib/supabase";

type PersonType = "fackts_player" | "guest_hooper" | "external";
type MatchStatus = "upcoming" | "completed" | "cancelled";

type Player = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | null;
};

type GuestHooper = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
};

type OneOnOneRow = {
  id: string;
  participant_type: string | null;
  fackts_player_id: string | null;
  guest_hooper_id: string | null;

  opponent_type: string | null;
  opponent_player_id: string | null;
  opponent_guest_hooper_id: string | null;
  opponent_name: string | null;

  match_date: string | null;
  venue: string | null;
  location: string | null;

  points_scored: number | null;
  points_allowed: number | null;
  result: string | null;
  status: string | null;
  notes: string | null;
  poster_url: string | null;
  video_url: string | null;
  highlight_url: string | null;

  created_at: string | null;
};

type FormState = {
  participantType: PersonType;
  facktsPlayerId: string;
  guestHooperId: string;

  opponentType: PersonType;
  opponentPlayerId: string;
  opponentGuestHooperId: string;
  opponentName: string;

  matchDate: string;
  venue: string;
  location: string;

  pointsScored: string;
  pointsAllowed: string;
  status: MatchStatus;
  notes: string;
  posterUrl: string;
  videoUrl: string;
  highlightUrl: string;
};

const emptyForm: FormState = {
  participantType: "fackts_player",
  facktsPlayerId: "",
  guestHooperId: "",

  opponentType: "external",
  opponentPlayerId: "",
  opponentGuestHooperId: "",
  opponentName: "",

  matchDate: "",
  venue: "",
  location: "",

  pointsScored: "",
  pointsAllowed: "",
  status: "upcoming",
  notes: "",
  posterUrl: "",
  videoUrl: "",
  highlightUrl: "",
};

function getPersonName(person?: Player | GuestHooper | null) {
  if (!person) return "Unknown";
  return person.full_name || person.name || person.nickname || "Unknown";
}

function getResult(pointsScored: string, pointsAllowed: string) {
  if (pointsScored.trim() === "" || pointsAllowed.trim() === "") return null;

  const scored = Number(pointsScored);
  const allowed = Number(pointsAllowed);

  if (Number.isNaN(scored) || Number.isNaN(allowed)) return null;
  if (scored > allowed) return "win";
  if (scored < allowed) return "loss";
  return "draw";
}

function statusLabel(status?: string | null) {
  if (!status) return "Upcoming";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function resultLabel(result?: string | null) {
  if (!result) return "No result";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function safeText(value?: string | null) {
  return value && value.trim() ? value : "Not added";
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (num: number) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminOneOnOnePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [guests, setGuests] = useState<GuestHooper[]>([]);
  const [matches, setMatches] = useState<OneOnOneRow[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const guestMap = useMemo(() => {
    const map = new Map<string, GuestHooper>();
    guests.forEach((guest) => map.set(guest.id, guest));
    return map;
  }, [guests]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [playersResult, guestsResult, matchesResult] = await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("guest_hoopers").select("*"),
      supabase
        .from("guest_one_on_one_stats")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (playersResult.error) {
      setMessage(`Failed to load players: ${playersResult.error.message}`);
    }

    if (guestsResult.error) {
      setMessage(`Failed to load guest hoopers: ${guestsResult.error.message}`);
    }

    if (matchesResult.error) {
      setMessage(`Failed to load 1v1 games: ${matchesResult.error.message}`);
    }

    const cleanPlayers = ((playersResult.data ?? []) as Player[]).sort((a, b) =>
      getPersonName(a).localeCompare(getPersonName(b))
    );

    const cleanGuests = ((guestsResult.data ?? []) as GuestHooper[]).sort(
      (a, b) => getPersonName(a).localeCompare(getPersonName(b))
    );

    setPlayers(cleanPlayers);
    setGuests(cleanGuests);
    setMatches((matchesResult.data ?? []) as OneOnOneRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleParticipantTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as PersonType;

    setForm((prev) => ({
      ...prev,
      participantType: value,
      facktsPlayerId: value === "fackts_player" ? prev.facktsPlayerId : "",
      guestHooperId: value === "guest_hooper" ? prev.guestHooperId : "",
    }));
  }

  function handleOpponentTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as PersonType;

    setForm((prev) => ({
      ...prev,
      opponentType: value,
      opponentPlayerId: value === "fackts_player" ? prev.opponentPlayerId : "",
      opponentGuestHooperId:
        value === "guest_hooper" ? prev.opponentGuestHooperId : "",
      opponentName: value === "external" ? prev.opponentName : "",
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setMessage("");
  }

  function getParticipantName(row: OneOnOneRow) {
    if (row.participant_type === "fackts_player" && row.fackts_player_id) {
      return getPersonName(playerMap.get(row.fackts_player_id));
    }

    if (row.participant_type === "guest_hooper" && row.guest_hooper_id) {
      return getPersonName(guestMap.get(row.guest_hooper_id));
    }

    return "External Player";
  }

  function getOpponentName(row: OneOnOneRow) {
    if (row.opponent_type === "fackts_player" && row.opponent_player_id) {
      return getPersonName(playerMap.get(row.opponent_player_id));
    }

    if (row.opponent_type === "guest_hooper" && row.opponent_guest_hooper_id) {
      return getPersonName(guestMap.get(row.opponent_guest_hooper_id));
    }

    return row.opponent_name || "External Opponent";
  }

  function editMatch(row: OneOnOneRow) {
    setEditingId(row.id);

    setForm({
      participantType: (row.participant_type as PersonType) || "fackts_player",
      facktsPlayerId: row.fackts_player_id || "",
      guestHooperId: row.guest_hooper_id || "",

      opponentType: (row.opponent_type as PersonType) || "external",
      opponentPlayerId: row.opponent_player_id || "",
      opponentGuestHooperId: row.opponent_guest_hooper_id || "",
      opponentName: row.opponent_name || "",

      matchDate: toInputDateTime(row.match_date),
      venue: row.venue || "",
      location: row.location || "",

      pointsScored:
        row.points_scored === null || row.points_scored === undefined
          ? ""
          : String(row.points_scored),
      pointsAllowed:
        row.points_allowed === null || row.points_allowed === undefined
          ? ""
          : String(row.points_allowed),
      status: (row.status as MatchStatus) || "upcoming",
      notes: row.notes || "",
      posterUrl: row.poster_url || "",
      videoUrl: row.video_url || "",
      highlightUrl: row.highlight_url || "",
    });

    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (form.participantType === "fackts_player" && !form.facktsPlayerId) {
      setMessage("Select the FACKTS player.");
      setSaving(false);
      return;
    }

    if (form.participantType === "guest_hooper" && !form.guestHooperId) {
      setMessage("Select the guest hooper.");
      setSaving(false);
      return;
    }

    if (form.opponentType === "fackts_player" && !form.opponentPlayerId) {
      setMessage("Select the opponent FACKTS player.");
      setSaving(false);
      return;
    }

    if (form.opponentType === "guest_hooper" && !form.opponentGuestHooperId) {
      setMessage("Select the opponent guest hooper.");
      setSaving(false);
      return;
    }

    if (form.opponentType === "external" && !form.opponentName.trim()) {
      setMessage("Type the external opponent name.");
      setSaving(false);
      return;
    }

    const scored =
      form.pointsScored.trim() === "" ? null : Number(form.pointsScored);
    const allowed =
      form.pointsAllowed.trim() === "" ? null : Number(form.pointsAllowed);

    if (scored !== null && Number.isNaN(scored)) {
      setMessage("Points scored must be a number.");
      setSaving(false);
      return;
    }

    if (allowed !== null && Number.isNaN(allowed)) {
      setMessage("Points allowed must be a number.");
      setSaving(false);
      return;
    }

    const payload = {
      participant_type: form.participantType,
      fackts_player_id:
        form.participantType === "fackts_player" ? form.facktsPlayerId : null,
      guest_hooper_id:
        form.participantType === "guest_hooper" ? form.guestHooperId : null,

      opponent_type: form.opponentType,
      opponent_player_id:
        form.opponentType === "fackts_player" ? form.opponentPlayerId : null,
      opponent_guest_hooper_id:
        form.opponentType === "guest_hooper"
          ? form.opponentGuestHooperId
          : null,
      opponent_name:
        form.opponentType === "external" ? form.opponentName.trim() : null,

      match_date: form.matchDate ? new Date(form.matchDate).toISOString() : null,
      venue: form.venue.trim() || null,
      location: form.location.trim() || null,

      points_scored: scored,
      points_allowed: allowed,
      result: getResult(form.pointsScored, form.pointsAllowed),
      status: form.status,
      notes: form.notes.trim() || null,
      poster_url: form.posterUrl.trim() || null,
      video_url: form.videoUrl.trim() || null,
      highlight_url: form.highlightUrl.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("guest_one_on_one_stats")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("guest_one_on_one_stats").insert(payload);

    if (result.error) {
      setMessage(`Failed to save 1v1 game: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setMessage(editingId ? "1v1 game updated." : "1v1 game created.");
    setSaving(false);
    resetForm();
    await loadData();
  }

  async function deleteMatch(row: OneOnOneRow) {
    const confirmed = window.confirm(
      `Delete this 1v1 game: ${getParticipantName(row)} vs ${getOpponentName(
        row
      )}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("guest_one_on_one_stats")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage(`Failed to delete 1v1 game: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("1v1 game deleted.");
    setSaving(false);

    if (editingId === row.id) resetForm();
    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">
              FACKTS Admin
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Manage One-on-One Games
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Set up 1v1 battles, update scores, add venue details, and attach
              videos or highlights. The public 1v1 page will read from this.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
            >
              Back to Admin
            </Link>

            <Link
              href="/one-on-one"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
            >
              View Public 1v1
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {message}
          </div>
        ) : null}

        <form
          onSubmit={saveMatch}
          className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-5"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                {editingId ? "Edit Match" : "Create Match"}
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {editingId ? "Update 1v1 Game" : "Set Up New 1v1 Game"}
              </h2>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldSelect
              label="Participant Type"
              value={form.participantType}
              onChange={handleParticipantTypeChange}
              options={[
                { label: "FACKTS Player", value: "fackts_player" },
                { label: "Guest Hooper", value: "guest_hooper" },
              ]}
            />

            {form.participantType === "fackts_player" ? (
              <FieldSelect
                label="FACKTS Player"
                value={form.facktsPlayerId}
                onChange={(event) =>
                  updateField("facktsPlayerId", event.target.value)
                }
                options={[
                  { label: "Select FACKTS player", value: "" },
                  ...players.map((player) => ({
                    label: getPersonName(player),
                    value: player.id,
                  })),
                ]}
              />
            ) : (
              <FieldSelect
                label="Guest Hooper"
                value={form.guestHooperId}
                onChange={(event) =>
                  updateField("guestHooperId", event.target.value)
                }
                options={[
                  { label: "Select guest hooper", value: "" },
                  ...guests.map((guest) => ({
                    label: getPersonName(guest),
                    value: guest.id,
                  })),
                ]}
              />
            )}

            <FieldSelect
              label="Opponent Type"
              value={form.opponentType}
              onChange={handleOpponentTypeChange}
              options={[
                { label: "External Opponent", value: "external" },
                { label: "FACKTS Player", value: "fackts_player" },
                { label: "Guest Hooper", value: "guest_hooper" },
              ]}
            />

            {form.opponentType === "fackts_player" ? (
              <FieldSelect
                label="Opponent FACKTS Player"
                value={form.opponentPlayerId}
                onChange={(event) =>
                  updateField("opponentPlayerId", event.target.value)
                }
                options={[
                  { label: "Select opponent player", value: "" },
                  ...players.map((player) => ({
                    label: getPersonName(player),
                    value: player.id,
                  })),
                ]}
              />
            ) : null}

            {form.opponentType === "guest_hooper" ? (
              <FieldSelect
                label="Opponent Guest Hooper"
                value={form.opponentGuestHooperId}
                onChange={(event) =>
                  updateField("opponentGuestHooperId", event.target.value)
                }
                options={[
                  { label: "Select opponent guest", value: "" },
                  ...guests.map((guest) => ({
                    label: getPersonName(guest),
                    value: guest.id,
                  })),
                ]}
              />
            ) : null}

            {form.opponentType === "external" ? (
              <FieldInput
                label="External Opponent Name"
                value={form.opponentName}
                onChange={(value) => updateField("opponentName", value)}
                placeholder="Example: ISO7 / Juja Hooper / Langata Champ"
              />
            ) : null}

            <FieldInput
              label="Match Date & Time"
              type="datetime-local"
              value={form.matchDate}
              onChange={(value) => updateField("matchDate", value)}
              placeholder=""
            />

            <FieldInput
              label="Venue"
              value={form.venue}
              onChange={(value) => updateField("venue", value)}
              placeholder="Example: Langata Downtown"
            />

            <FieldInput
              label="Location"
              value={form.location}
              onChange={(value) => updateField("location", value)}
              placeholder="Example: Nairobi"
            />

            <FieldSelect
              label="Status"
              value={form.status}
              onChange={(event) =>
                updateField("status", event.target.value as MatchStatus)
              }
              options={[
                { label: "Upcoming", value: "upcoming" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
              ]}
            />

            <FieldInput
              label="Participant Points"
              type="number"
              value={form.pointsScored}
              onChange={(value) => updateField("pointsScored", value)}
              placeholder="Example: 11"
            />

            <FieldInput
              label="Opponent Points"
              type="number"
              value={form.pointsAllowed}
              onChange={(value) => updateField("pointsAllowed", value)}
              placeholder="Example: 8"
            />

            <FieldInput
              label="Poster URL"
              value={form.posterUrl}
              onChange={(value) => updateField("posterUrl", value)}
              placeholder="Optional poster image URL"
            />

            <FieldInput
              label="Video URL"
              value={form.videoUrl}
              onChange={(value) => updateField("videoUrl", value)}
              placeholder="YouTube, Vimeo, or MP4 link"
            />

            <FieldInput
              label="Highlight URL"
              value={form.highlightUrl}
              onChange={(value) => updateField("highlightUrl", value)}
              placeholder="Optional highlight link"
            />
          </div>

          <label className="mt-4 block">
            <div className="mb-2 text-sm font-bold text-slate-300">Notes</div>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={4}
              placeholder="Add match story, rules, callouts, or notes..."
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update 1v1 Game"
                : "Create 1v1 Game"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
            >
              Clear Form
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Existing 1v1 Games
              </p>
              <h2 className="mt-2 text-2xl font-black">Manage Records</h2>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
              Loading 1v1 games...
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
              No 1v1 games found yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-black text-white">
                        {getParticipantName(match)} vs {getOpponentName(match)}
                      </div>

                      <div className="mt-1 text-sm leading-6 text-slate-400">
                        {safeText(match.venue)} • {safeText(match.location)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-orange-200">
                          {statusLabel(match.status)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                          {match.points_scored ?? "-"} -{" "}
                          {match.points_allowed ?? "-"}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                          {resultLabel(match.result)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editMatch(match)}
                        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMatch(match)}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200 transition hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {match.match_date ? (
                    <div className="mt-3 text-xs text-slate-500">
                      Date: {new Date(match.match_date).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-300">{label}</div>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}