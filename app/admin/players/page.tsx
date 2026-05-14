"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PlayerForm = {
  full_name: string;
  nickname: string;
  jersey_number: string;
  position: string;
  role: string;
  age: string;
  height: string;
  dominant_hand: string;
  highest_level: string;
  years_played: string;
  current_team: string;
  previous_teams: string;
  style_of_play: string;
  strengths: string;
  improvements: string;
  followers_range: string;
  photo_url: string;
  photo_position: string;
  is_active: boolean;
  is_featured: boolean;
};

const emptyForm: PlayerForm = {
  full_name: "",
  nickname: "",
  jersey_number: "",
  position: "",
  role: "",
  age: "",
  height: "",
  dominant_hand: "",
  highest_level: "",
  years_played: "",
  current_team: "",
  previous_teams: "",
  style_of_play: "",
  strengths: "",
  improvements: "",
  followers_range: "",
  photo_url: "",
  photo_position: "center center",
  is_active: true,
  is_featured: false,
};

const positionOptions = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Guard",
  "Forward",
  "Big",
  "Wing",
  "Combo Guard",
  "Stretch Forward",
  "Utility Player",
];

const highestLevelOptions = [
  "Street / Pick-up",
  "Academy",
  "High School",
  "College",
  "University",
  "County League",
  "Regional League",
  "National League",
  "Semi-Pro",
  "Professional",
  "International",
];
const playerRoleOptions = [
  "Player",
  "Captain",
  "Co-Captain",
  "Guest Hooper",
  "Prospect",
  "Featured Player",
  "Starter",
  "Bench",
  "Injured",
  "Inactive",
];

const heightOptions = [
  "Below 5'0",
  "5'0",
  "5'1",
  "5'2",
  "5'3",
  "5'4",
  "5'5",
  "5'6",
  "5'7",
  "5'8",
  "5'9",
  "5'10",
  "5'11",
  "6'0",
  "6'1",
  "6'2",
  "6'3",
  "6'4",
  "6'5",
  "6'6",
  "6'7",
  "6'8",
  "6'9",
  "6'10",
  "6'11",
  "7'0",
  "Above 7'0",
];

const followersRangeOptions = [
  "0-100",
  "100-500",
  "500-1K",
  "1K-5K",
  "5K-10K",
  "10K-50K",
  "50K+",
];
const imagePositions = [
  { label: "Center", value: "center center" },
  { label: "Top", value: "center top" },
  { label: "Bottom", value: "center bottom" },
  { label: "Left", value: "left center" },
  { label: "Right", value: "right center" },
  { label: "Top Left", value: "left top" },
  { label: "Top Right", value: "right top" },
  { label: "Bottom Left", value: "left bottom" },
  { label: "Bottom Right", value: "right bottom" },
];

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPlayers() {
    setLoadingPlayers(true);
    setMessage("");

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("jersey_number", { ascending: true });

    if (error) {
      console.error("Load players error:", error);
      setMessage(`Failed to load players: ${error.message}`);
      setLoadingPlayers(false);
      return;
    }

    setPlayers(data ?? []);
    setLoadingPlayers(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  function updateField<K extends keyof PlayerForm>(field: K, value: PlayerForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function startEdit(player: any) {
    setEditingPlayerId(player.id);

    setForm({
      full_name: player.full_name ?? "",
      nickname: player.nickname ?? "",
      jersey_number: player.jersey_number?.toString() ?? "",
      position: player.position ?? "",
      role: player.role ?? "",
      age: player.age?.toString() ?? "",
      height: player.height ?? "",
      dominant_hand: player.dominant_hand ?? "",
      highest_level: player.highest_level ?? "",
      years_played: player.years_played?.toString() ?? "",
      current_team: player.current_team ?? "",
      previous_teams: player.previous_teams ?? "",
      style_of_play: player.style_of_play ?? "",
      strengths: player.strengths ?? "",
      improvements: player.improvements ?? "",
      followers_range: player.followers_range ?? "",
      photo_url: player.photo_url ?? "",
      photo_position: player.photo_position ?? "center center",
      is_active: player.is_active ?? true,
      is_featured: player.is_featured ?? false,
    });

    setMessage(`Editing ${player.full_name}. Make changes above, then click Update Player.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPlayerId(null);
    setMessage("");
  }

  async function handlePhotoUpload(file: File) {
    if (!file) return;

    setUploadingPhoto(true);
    setMessage("");

    const fileExt = file.name.split(".").pop();
    const cleanName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const safePlayerName = form.full_name
      ? form.full_name.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()
      : "player";

    const filePath = `${Date.now()}-${safePlayerName}-${cleanName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Player photo upload error:", uploadError);
      setMessage(`Photo upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage.from("player-photos").getPublicUrl(filePath);

    updateField("photo_url", data.publicUrl);
    setMessage("Player photo uploaded. Click Update Player to save it.");
    setUploadingPhoto(false);
  }

  async function handleSavePlayer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      full_name: form.full_name.trim(),
      nickname: form.nickname.trim() || null,
      jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
      position: form.position.trim() || null,
      role: form.role.trim() || null,
      age: form.age ? Number(form.age) : null,
      height: form.height.trim() || null,
      dominant_hand: form.dominant_hand.trim() || null,
      highest_level: form.highest_level.trim() || null,
      years_played: form.years_played ? Number(form.years_played) : null,
      current_team: form.current_team.trim() || null,
      previous_teams: form.previous_teams.trim() || null,
      style_of_play: form.style_of_play.trim() || null,
      strengths: form.strengths.trim() || null,
      improvements: form.improvements.trim() || null,
      followers_range: form.followers_range.trim() || null,
      photo_url: form.photo_url.trim() || null,
      photo_position: form.photo_position || "center center",
      is_active: form.is_active,
      is_featured: form.is_featured,
    };

    if (!payload.full_name) {
      setMessage("Player name is required.");
      setLoading(false);
      return;
    }

    if (form.is_featured) {
      const clearFeatured = await supabase
        .from("players")
        .update({ is_featured: false })
        .neq("id", editingPlayerId ?? "00000000-0000-0000-0000-000000000000");

      if (clearFeatured.error) {
        console.error("Clear featured player error:", clearFeatured.error);
        setMessage(`Failed to reset featured player: ${clearFeatured.error.message}`);
        setLoading(false);
        return;
      }
    }

    if (editingPlayerId) {
      const result = await supabase
        .from("players")
        .update(payload)
        .eq("id", editingPlayerId);

      if (result.error) {
        console.error("Update player error:", result.error);
        setMessage(`Failed to update player: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Player updated successfully.");
    } else {
      const result = await supabase.from("players").insert([payload]);

      if (result.error) {
        console.error("Create player error:", result.error);
        setMessage(`Failed to create player: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Player created successfully.");
    }

    resetForm();
    await loadPlayers();
    setLoading(false);
  }

  async function handleDeletePlayer(playerId: string) {
    const yes = window.confirm("Delete this player?");
    if (!yes) return;

    const result = await supabase.from("players").delete().eq("id", playerId);

    if (result.error) {
      console.error("Delete player error:", result.error);
      setMessage(`Failed to delete player: ${result.error.message}`);
      return;
    }

    setMessage("Player deleted.");
    await loadPlayers();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            â† Back to Admin
          </Link>

          <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Player Management
          </h1>

          <p className="mt-3 text-slate-400">
            Create players, upload photos, edit profiles, feature players, and adjust photo focus.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr,1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  {editingPlayerId ? "Edit Player" : "New Player"}
                </div>
                <h2 className="mt-1 text-2xl font-bold">
                  {editingPlayerId ? "Update player" : "Create player"}
                </h2>
              </div>

              {editingPlayerId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <FormInput
                label="Full Name"
                value={form.full_name}
                onChange={(v) => updateField("full_name", v)}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Nickname"
                  value={form.nickname}
                  onChange={(v) => updateField("nickname", v)}
                />
                <FormInput
                  label="Jersey Number"
                  value={form.jersey_number}
                  onChange={(v) => updateField("jersey_number", v)}
                  type="number"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect
                  label="Position"
                  value={form.position}
                  onChange={(v) => updateField("position", v)}
                  options={positionOptions}
                  placeholder="Select position"
                />
                <FormSelect
                  label="Role"
                  value={form.role}
                  onChange={(v) => updateField("role", v)}
                  options={playerRoleOptions}
                  placeholder="Select role"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormInput
                  label="Age"
                  value={form.age}
                  onChange={(v) => updateField("age", v)}
                  type="number"
                />
                <FormSelect
                  label="Height"
                  value={form.height}
                  onChange={(v) => updateField("height", v)}
                  options={heightOptions}
                  placeholder="Select height"
                />
                <FormInput
                  label="Dominant Hand"
                  value={form.dominant_hand}
                  onChange={(v) => updateField("dominant_hand", v)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormSelect
                  label="Highest Level"
                  value={form.highest_level}
                  onChange={(v) => updateField("highest_level", v)}
                  options={highestLevelOptions}
                  placeholder="Select highest level"
                />
                <FormInput
                  label="Years Played"
                  value={form.years_played}
                  onChange={(v) => updateField("years_played", v)}
                  type="number"
                />
                <FormSelect
                  label="Followers Range"
                  value={form.followers_range}
                  onChange={(v) => updateField("followers_range", v)}
                  options={followersRangeOptions}
                  placeholder="Select followers range"
                />
              </div>

              <FormInput
                label="Current Team"
                value={form.current_team}
                onChange={(v) => updateField("current_team", v)}
              />

              <FormTextarea
                label="Previous Teams"
                value={form.previous_teams}
                onChange={(v) => updateField("previous_teams", v)}
              />

              <FormTextarea
                label="Style of Play"
                value={form.style_of_play}
                onChange={(v) => updateField("style_of_play", v)}
              />

              <FormTextarea
                label="Strengths"
                value={form.strengths}
                onChange={(v) => updateField("strengths", v)}
              />

              <FormTextarea
                label="Improvement Areas"
                value={form.improvements}
                onChange={(v) => updateField("improvements", v)}
              />

              <div className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Player Photo Upload
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300"
                />

                {uploadingPhoto ? (
                  <div className="mt-3 text-sm text-orange-300">
                    Uploading photo...
                  </div>
                ) : null}

                {form.photo_url ? (
                  <div className="mt-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                      Current Photo Preview
                    </div>

                    <img
                      src={form.photo_url}
                      alt="Player preview"
                      className="h-72 w-full rounded-2xl border border-slate-700 object-cover"
                      style={{ objectPosition: form.photo_position }}
                    />
                  </div>
                ) : null}
              </div>

              <FormInput
                label="Photo URL"
                value={form.photo_url}
                onChange={(v) => updateField("photo_url", v)}
              />

              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Photo Focus Position
                </div>
                <select
                  value={form.photo_position}
                  onChange={(e) => updateField("photo_position", e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  {imagePositions.map((position) => (
                    <option key={position.value} value={position.value}>
                      {position.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-700 p-4 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => updateField("is_active", e.target.checked)}
                    className="h-4 w-4"
                  />
                  Active player
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-700 p-4 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => updateField("is_featured", e.target.checked)}
                    className="h-4 w-4"
                  />
                  Featured player
                </label>
              </div>

              {message ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || uploadingPhoto}
                className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {loading
                  ? "Saving..."
                  : editingPlayerId
                  ? "Update Player"
                  : "Create Player"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="mb-5">
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Player List
              </div>
              <h2 className="mt-1 text-2xl font-bold">All Players</h2>
              <p className="mt-2 text-sm text-slate-500">
                Click Edit. The form on the left/top will load that player.
              </p>
            </div>

            {loadingPlayers ? (
              <div className="text-slate-400">Loading players...</div>
            ) : players.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                No players found yet.
              </div>
            ) : (
              <div className="space-y-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-4">
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
                            ðŸ€
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xl font-bold">{player.full_name}</div>

                            {player.is_featured ? (
                              <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-slate-950">
                                FEATURED
                              </span>
                            ) : null}

                            {player.is_active ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="rounded-full bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-300">
                                INACTIVE
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-sm text-slate-400">
                            #{player.jersey_number ?? "â€”"} â€¢ {player.position ?? "â€”"} â€¢{" "}
                            {player.role ?? "â€”"}
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {player.current_team ?? "No current team"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(player)}
                          className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/10"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(player.id)}
                          className="rounded-2xl border border-rose-500/30 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
function FormTextarea({
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
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

