"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";
import { resolveFacktsKingsSeason } from "@/lib/hoops/facktsKings";

type PlayerType = "fackts_player" | "guest_hooper" | "external";
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

  competition_slug?: string | null;
  season_label?: string | null;
  verification_status?: string | null;
  is_public?: boolean | null;

  match_number: string | null;
  match_title: string | null;
  match_type: string | null;
  court: string | null;

  participant_type: string | null;
  fackts_player_id: string | null;
  guest_hooper_id: string | null;
  participant_name: string | null;

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
  matchNumber: string;
  matchTitle: string;
  matchType: string;
  court: string;
  seasonLabel: string;
  verificationStatus: string;
  isPublic: boolean;

  player1Type: PlayerType;
  player1FacktsId: string;
  player1GuestId: string;
  player1ExternalName: string;

  player2Type: PlayerType;
  player2FacktsId: string;
  player2GuestId: string;
  player2ExternalName: string;

  matchDate: string;
  venue: string;
  location: string;

  player1Score: string;
  player2Score: string;
  status: MatchStatus;

  videoUrl: string;
  highlightUrl: string;
  notes: string;
};

const emptyForm: FormState = {
  matchNumber: "",
  matchTitle: "",
  matchType: "1v1",
  court: "",
  seasonLabel: "2026",
  verificationStatus: "scheduled",
  isPublic: true,

  player1Type: "fackts_player",
  player1FacktsId: "",
  player1GuestId: "",
  player1ExternalName: "",

  player2Type: "external",
  player2FacktsId: "",
  player2GuestId: "",
  player2ExternalName: "",

  matchDate: "",
  venue: "",
  location: "",

  player1Score: "",
  player2Score: "",
  status: "upcoming",

  videoUrl: "",
  highlightUrl: "",
  notes: "",
};

const ONE_ON_ONE_DRAFT_KEY = "fackts-admin-one-on-one-draft";

const playerTypeOptions = [
  { label: "FACKTS Player", value: "fackts_player" },
  { label: "Guest Hooper", value: "guest_hooper" },
  { label: "External Player", value: "external" },
];

const statusOptions = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const verificationOptions = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Pending verification", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Disputed / correction needed", value: "disputed" },
];

const matchTypeOptions = [
  { label: "1v1", value: "1v1" },
  { label: "Main Event", value: "Main Event" },
  { label: "Qualifier", value: "Qualifier" },
  { label: "Friendly", value: "Friendly" },
  { label: "Rematch", value: "Rematch" },
];

function getPersonName(person?: Player | GuestHooper | null) {
  if (!person) return "Unknown";
  return person.full_name || person.name || person.nickname || "Unknown";
}

function safeText(value?: string | null) {
  return value && value.trim() ? value : "Not added";
}

function statusLabel(status?: string | null) {
  if (!status) return "Upcoming";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function resultLabel(result?: string | null) {
  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  return "No result";
}

function getResult(player1Score: string, player2Score: string) {
  if (player1Score.trim() === "" || player2Score.trim() === "") return null;

  const score1 = Number(player1Score);
  const score2 = Number(player2Score);

  if (Number.isNaN(score1) || Number.isNaN(score2)) return null;
  if (score1 > score2) return "win";
  if (score1 < score2) return "loss";
  return null;
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (num: number) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function makeSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function saveDraftToBrowser(
  form: FormState,
  editingId: string,
  existingPosterUrl: string
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    ONE_ON_ONE_DRAFT_KEY,
    JSON.stringify({
      form,
      editingId,
      existingPosterUrl,
    })
  );
}

function loadDraftFromBrowser() {
  if (typeof window === "undefined") return null;

  try {
    const savedDraft = localStorage.getItem(ONE_ON_ONE_DRAFT_KEY);

    if (!savedDraft) return null;

    return JSON.parse(savedDraft) as {
      form?: Partial<FormState>;
      editingId?: string;
      existingPosterUrl?: string;
    };
  } catch {
    return null;
  }
}

function clearDraftFromBrowser() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ONE_ON_ONE_DRAFT_KEY);
}

export default function AdminOneOnOnePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [guests, setGuests] = useState<GuestHooper[]>([]);
  const [matches, setMatches] = useState<OneOnOneRow[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState("");

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [existingPosterUrl, setExistingPosterUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);

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
      supabase.from("players").select("*").eq("player_type", FACKTS_PLAYER_TYPE),
      supabase.from("guest_hoopers").select("*"),
      supabase
        .from("guest_one_on_one_stats")
        .select("*")
        .order("match_number", { ascending: true })
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
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = loadDraftFromBrowser();

      if (draft?.form) {
        setForm({
          ...emptyForm,
          ...draft.form,
        });

        setEditingId(draft.editingId || "");
        setExistingPosterUrl(draft.existingPosterUrl || "");
      }

      setDraftLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;

    saveDraftToBrowser(form, editingId, existingPosterUrl);
  }, [form, editingId, existingPosterUrl, draftLoaded]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePlayer1TypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as PlayerType;

    setForm((prev) => ({
      ...prev,
      player1Type: value,
      player1FacktsId: value === "fackts_player" ? prev.player1FacktsId : "",
      player1GuestId: value === "guest_hooper" ? prev.player1GuestId : "",
      player1ExternalName: value === "external" ? prev.player1ExternalName : "",
    }));
  }

  function handlePlayer2TypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as PlayerType;

    setForm((prev) => ({
      ...prev,
      player2Type: value,
      player2FacktsId: value === "fackts_player" ? prev.player2FacktsId : "",
      player2GuestId: value === "guest_hooper" ? prev.player2GuestId : "",
      player2ExternalName: value === "external" ? prev.player2ExternalName : "",
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setPosterFile(null);
    setPosterPreview("");
    setExistingPosterUrl("");
    setMessage("");
    clearDraftFromBrowser();
  }

  function getPlayer1Name(row: OneOnOneRow) {
    if (row.participant_type === "fackts_player" && row.fackts_player_id) {
      return getPersonName(playerMap.get(row.fackts_player_id));
    }

    if (row.participant_type === "guest_hooper" && row.guest_hooper_id) {
      return getPersonName(guestMap.get(row.guest_hooper_id));
    }

    return row.participant_name || "External Player";
  }

  function getPlayer2Name(row: OneOnOneRow) {
    if (row.opponent_type === "fackts_player" && row.opponent_player_id) {
      return getPersonName(playerMap.get(row.opponent_player_id));
    }

    if (row.opponent_type === "guest_hooper" && row.opponent_guest_hooper_id) {
      return getPersonName(guestMap.get(row.opponent_guest_hooper_id));
    }

    return row.opponent_name || "External Player";
  }

  function getWinnerName(row: OneOnOneRow) {
    if (row.status !== "completed") return "Not decided";

    const score1 = row.points_scored ?? null;
    const score2 = row.points_allowed ?? null;

    if (score1 === null || score2 === null) return "Not decided";
    if (score1 > score2) return getPlayer1Name(row);
    if (score2 > score1) return getPlayer2Name(row);

    return "Not decided";
  }

  function editMatch(row: OneOnOneRow) {
    setEditingId(row.id);

    setForm({
      matchNumber: row.match_number || "",
      matchTitle: row.match_title || "",
      matchType: row.match_type || "1v1",
      court: row.court || "",
      seasonLabel: resolveFacktsKingsSeason(row),
      verificationStatus: row.verification_status || (row.status === "completed" ? "verified" : "scheduled"),
      isPublic: row.is_public !== false,

      player1Type: (row.participant_type as PlayerType) || "fackts_player",
      player1FacktsId: row.fackts_player_id || "",
      player1GuestId: row.guest_hooper_id || "",
      player1ExternalName: row.participant_name || "",

      player2Type: (row.opponent_type as PlayerType) || "external",
      player2FacktsId: row.opponent_player_id || "",
      player2GuestId: row.opponent_guest_hooper_id || "",
      player2ExternalName: row.opponent_name || "",

      matchDate: toInputDateTime(row.match_date),
      venue: row.venue || "",
      location: row.location || "",

      player1Score:
        row.points_scored === null || row.points_scored === undefined
          ? ""
          : String(row.points_scored),
      player2Score:
        row.points_allowed === null || row.points_allowed === undefined
          ? ""
          : String(row.points_allowed),
      status: (row.status as MatchStatus) || "upcoming",

      videoUrl: row.video_url || "",
      highlightUrl: row.highlight_url || "",
      notes: row.notes || "",
    });

    setPosterFile(null);
    setPosterPreview("");
    setExistingPosterUrl(row.poster_url || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPoster() {
    if (!posterFile) return existingPosterUrl || null;

    const safeName =
      makeSafeFileName(posterFile.name) || `one-on-one-poster-${Date.now()}.jpg`;

    const filePath = `posters/${Date.now()}-${safeName}`;

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

  function validateForm() {
    if (form.player1Type === "fackts_player" && !form.player1FacktsId) {
      return "Select Player 1.";
    }

    if (form.player1Type === "guest_hooper" && !form.player1GuestId) {
      return "Select Player 1 guest hooper.";
    }

    if (form.player1Type === "external" && !form.player1ExternalName.trim()) {
      return "Enter Player 1 external name.";
    }

    if (form.player2Type === "fackts_player" && !form.player2FacktsId) {
      return "Select Player 2.";
    }

    if (form.player2Type === "guest_hooper" && !form.player2GuestId) {
      return "Select Player 2 guest hooper.";
    }

    if (form.player2Type === "external" && !form.player2ExternalName.trim()) {
      return "Enter Player 2 external name.";
    }

    if (form.player1Score.trim() && Number.isNaN(Number(form.player1Score))) {
      return "Player 1 score must be a number.";
    }

    if (form.player2Score.trim() && Number.isNaN(Number(form.player2Score))) {
      return "Player 2 score must be a number.";
    }

    if (
      form.player1Score.trim() &&
      form.player2Score.trim() &&
      Number(form.player1Score) === Number(form.player2Score)
    ) {
      return "A completed basketball result must have a winner. Enter the overtime final score.";
    }

    return "";
  }

  async function saveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);
    setMessage("");

    let uploadedPosterUrl: string | null = null;

    try {
      uploadedPosterUrl = await uploadPoster();
    } catch (error: unknown) {
      setMessage(`Poster upload failed: ${getErrorMessage(error)}`);
      setSaving(false);
      return;
    }

    const score1 =
      form.player1Score.trim() === "" ? null : Number(form.player1Score);
    const score2 =
      form.player2Score.trim() === "" ? null : Number(form.player2Score);

    const player1Name =
      form.player1Type === "fackts_player"
        ? getPersonName(playerMap.get(form.player1FacktsId))
        : form.player1Type === "guest_hooper"
          ? getPersonName(guestMap.get(form.player1GuestId))
          : form.player1ExternalName.trim();
    const player2Name =
      form.player2Type === "fackts_player"
        ? getPersonName(playerMap.get(form.player2FacktsId))
        : form.player2Type === "guest_hooper"
          ? getPersonName(guestMap.get(form.player2GuestId))
          : form.player2ExternalName.trim();

    const payload = {
      competition_slug: "fackts-kings",
      season_label: form.seasonLabel.trim() || "2026",
      verification_status: form.verificationStatus,
      is_public: form.isPublic,
      match_number: form.matchNumber.trim() || null,
      match_title: form.matchTitle.trim() || null,
      match_type: form.matchType,
      court: form.court.trim() || null,

      participant_type: form.player1Type,
      fackts_player_id:
        form.player1Type === "fackts_player" ? form.player1FacktsId : null,
      guest_hooper_id:
        form.player1Type === "guest_hooper" ? form.player1GuestId : null,
      participant_name: player1Name,

      opponent_type: form.player2Type,
      opponent_player_id:
        form.player2Type === "fackts_player" ? form.player2FacktsId : null,
      opponent_guest_hooper_id:
        form.player2Type === "guest_hooper" ? form.player2GuestId : null,
      opponent_name: player2Name,

      match_date: form.matchDate ? new Date(form.matchDate).toISOString() : null,
      venue: form.venue.trim() || null,
      location: form.location.trim() || null,

      points_scored: score1,
      points_allowed: score2,
      result: getResult(form.player1Score, form.player2Score),
      status: form.status,

      poster_url: uploadedPosterUrl,
      video_url: form.videoUrl.trim() || null,
      highlight_url: form.highlightUrl.trim() || null,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("guest_one_on_one_stats")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("guest_one_on_one_stats").insert(payload);

    if (result.error) {
      setMessage(`Failed to save 1v1 match: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setMessage(editingId ? "1v1 match updated." : "1v1 match created.");
    setSaving(false);
    resetForm();
    await loadData();
  }

  async function deleteMatch(row: OneOnOneRow) {
    const confirmed = window.confirm(
      `Delete ${getPlayer1Name(row)} vs ${getPlayer2Name(row)}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("guest_one_on_one_stats")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage(`Failed to delete 1v1 match: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("1v1 match deleted.");
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
              FACKTS Kings Match Setup
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Set up season-scoped FACKTS Kings battles, upload posters,
              update scores, verify records and manage the public competition hub.
            </p>

            <p className="mt-2 text-xs font-bold text-slate-500">
              Draft autosaves while typing. After saving or clearing, the form
              resets cleanly.
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
              href="/competitions/fackts-kings"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
            >
              View FACKTS Kings
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
                {editingId ? "Update 1v1 Match" : "Set Up New 1v1 Match"}
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
            <FieldInput
              label="Match Number"
              value={form.matchNumber}
              onChange={(value) => updateField("matchNumber", value)}
              placeholder="Example: 1, 2, 3, Main Event"
            />

            <FieldInput
              label="Match Title"
              value={form.matchTitle}
              onChange={(value) => updateField("matchTitle", value)}
              placeholder="Example: Opening Battle / Main Event"
            />

            <FieldSelect
              label="Match Type"
              value={form.matchType}
              onChange={(event) => updateField("matchType", event.target.value)}
              options={matchTypeOptions}
            />

            <FieldInput
              label="Court"
              value={form.court}
              onChange={(value) => updateField("court", value)}
              placeholder="Example: Court 1"
            />

            <FieldInput
              label="Season"
              value={form.seasonLabel}
              onChange={(value) => updateField("seasonLabel", value)}
              placeholder="Example: 2026"
            />

            <FieldSelect
              label="Verification Status"
              value={form.verificationStatus}
              onChange={(event) => updateField("verificationStatus", event.target.value)}
              options={verificationOptions}
            />

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 text-sm font-bold text-slate-300">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => updateField("isPublic", event.target.checked)}
              />
              Publish this matchup in the competition hub
            </label>

            <FieldSelect
              label="Player 1 Type"
              value={form.player1Type}
              onChange={handlePlayer1TypeChange}
              options={playerTypeOptions}
            />

            {form.player1Type === "fackts_player" ? (
              <FieldSelect
                label="Player 1"
                value={form.player1FacktsId}
                onChange={(event) =>
                  updateField("player1FacktsId", event.target.value)
                }
                options={[
                  { label: "Select Player 1", value: "" },
                  ...players.map((player) => ({
                    label: getPersonName(player),
                    value: player.id,
                  })),
                ]}
              />
            ) : null}

            {form.player1Type === "guest_hooper" ? (
              <FieldSelect
                label="Player 1 Guest Hooper"
                value={form.player1GuestId}
                onChange={(event) =>
                  updateField("player1GuestId", event.target.value)
                }
                options={[
                  { label: "Select Player 1", value: "" },
                  ...guests.map((guest) => ({
                    label: getPersonName(guest),
                    value: guest.id,
                  })),
                ]}
              />
            ) : null}

            {form.player1Type === "external" ? (
              <FieldInput
                label="Player 1 External Name"
                value={form.player1ExternalName}
                onChange={(value) => updateField("player1ExternalName", value)}
                placeholder="Example: Juja Champ"
              />
            ) : null}

            <FieldSelect
              label="Player 2 Type"
              value={form.player2Type}
              onChange={handlePlayer2TypeChange}
              options={playerTypeOptions}
            />

            {form.player2Type === "fackts_player" ? (
              <FieldSelect
                label="Player 2"
                value={form.player2FacktsId}
                onChange={(event) =>
                  updateField("player2FacktsId", event.target.value)
                }
                options={[
                  { label: "Select Player 2", value: "" },
                  ...players.map((player) => ({
                    label: getPersonName(player),
                    value: player.id,
                  })),
                ]}
              />
            ) : null}

            {form.player2Type === "guest_hooper" ? (
              <FieldSelect
                label="Player 2 Guest Hooper"
                value={form.player2GuestId}
                onChange={(event) =>
                  updateField("player2GuestId", event.target.value)
                }
                options={[
                  { label: "Select Player 2", value: "" },
                  ...guests.map((guest) => ({
                    label: getPersonName(guest),
                    value: guest.id,
                  })),
                ]}
              />
            ) : null}

            {form.player2Type === "external" ? (
              <FieldInput
                label="Player 2 External Name"
                value={form.player2ExternalName}
                onChange={(value) => updateField("player2ExternalName", value)}
                placeholder="Example: ISO7 / Juja Hooper"
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
              options={statusOptions}
            />

            <FieldInput
              label="Player 1 Score"
              type="number"
              value={form.player1Score}
              onChange={(value) => updateField("player1Score", value)}
              placeholder="Example: 11"
            />

            <FieldInput
              label="Player 2 Score"
              type="number"
              value={form.player2Score}
              onChange={(value) => updateField("player2Score", value)}
              placeholder="Example: 8"
            />

            <label className="block">
              <div className="mb-2 text-sm font-bold text-slate-300">
                Upload Match Poster
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setPosterFile(file);

                  if (file) {
                    setPosterPreview(URL.createObjectURL(file));
                  } else {
                    setPosterPreview("");
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
              />

              {posterFile ? (
                <div className="mt-2 text-xs font-bold text-orange-300">
                  Selected: {posterFile.name}
                </div>
              ) : null}

              <div className="mt-2 text-xs leading-5 text-slate-500">
                Note: selected upload files cannot be restored by the browser
                after leaving the page. Links/text are autosaved.
              </div>
            </label>

            <FieldInput
              label="Full Game Video Link"
              value={form.videoUrl}
              onChange={(value) => updateField("videoUrl", value)}
              placeholder="YouTube, Vimeo, or MP4 link"
            />

            <FieldInput
              label="Highlight Video Link"
              value={form.highlightUrl}
              onChange={(value) => updateField("highlightUrl", value)}
              placeholder="Optional highlight link"
            />
          </div>

          {posterPreview || existingPosterUrl ? (
            <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
              <img
                src={posterPreview || existingPosterUrl}
                alt="1v1 poster preview"
                className="max-h-[460px] w-full object-cover"
              />
            </div>
          ) : null}

          <label className="mt-4 block">
            <div className="mb-2 text-sm font-bold text-slate-300">Notes</div>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={4}
              placeholder="Add match story, callouts, rules, or notes..."
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
                ? "Update FACKTS Kings Match"
                : "Create FACKTS Kings Match"}
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
                Existing FACKTS Kings Matches
              </p>
              <h2 className="mt-2 text-2xl font-black">Manage Fight Card</h2>
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
              Loading 1v1 matches...
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
              No 1v1 matches found yet.
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                          {match.match_number
                            ? `#${match.match_number}`
                            : "No Order"}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                          {safeText(match.match_type)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                          {statusLabel(match.status)}
                        </span>

                        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
                          {resolveFacktsKingsSeason(match)} · {match.verification_status || "pending"}
                        </span>
                      </div>

                      <div className="mt-3 text-xl font-black text-white">
                        {getPlayer1Name(match)} vs {getPlayer2Name(match)}
                      </div>

                      {match.match_title ? (
                        <div className="mt-1 text-sm font-bold text-orange-200">
                          {match.match_title}
                        </div>
                      ) : null}

                      <div className="mt-1 text-sm leading-6 text-slate-400">
                        {safeText(match.venue)} • {safeText(match.location)} •{" "}
                        {safeText(match.court)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                          Score: {match.points_scored ?? "-"} -{" "}
                          {match.points_allowed ?? "-"}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                          Result: {resultLabel(match.result)}
                        </span>

                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                          Winner: {getWinnerName(match)}
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
