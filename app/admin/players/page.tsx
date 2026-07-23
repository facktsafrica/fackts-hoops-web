"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  EXTERNAL_PLAYER_TYPE,
  FACKTS_PLAYER_TYPE,
  GUEST_HOOPER_TYPE,
  PROSPECT_PLAYER_TYPE,
  playerClassificationLabel,
} from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

type PlayerRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | string | null;
  role?: string | null;
  player_type?: string | null;
  position?: string | null;
  height?: string | null;
  weight?: string | null;
  wingspan?: string | null;
  vertical_leap?: string | null;
  speed?: string | null;
  standing_reach?: string | null;
  age?: string | null;
  date_of_birth?: string | null;
  location?: string | null;
  dominant_hand?: string | null;
  current_team?: string | null;
  previous_teams?: string | null;
  highest_level?: string | null;
  years_played?: string | null;
  style_of_play?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  highlight_url?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PlayerForm = {
  full_name: string;
  nickname: string;
  jersey_number: string;
  player_type: string;
  role: string;
  position: string;
  height: string;
  weight: string;
  wingspan: string;
  vertical_leap: string;
  speed: string;
  standing_reach: string;
  age: string;
  date_of_birth: string;
  location: string;
  dominant_hand: string;
  current_team: string;
  previous_teams: string;
  highest_level: string;
  years_played: string;
  style_of_play: string;
  strengths: string;
  improvements: string;
  bio: string;
  email: string;
  phone: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  highlight_url: string;
  photo_url: string;
  photo_position: string;
  is_featured: boolean;
  is_active: boolean;
};

const emptyForm: PlayerForm = {
  full_name: "",
  nickname: "",
  jersey_number: "",
  player_type: FACKTS_PLAYER_TYPE,
  role: "Player",
  position: "",
  height: "",
  weight: "",
  wingspan: "",
  vertical_leap: "",
  speed: "",
  standing_reach: "",
  age: "",
  date_of_birth: "",
  location: "",
  dominant_hand: "",
  current_team: "",
  previous_teams: "",
  highest_level: "",
  years_played: "",
  style_of_play: "",
  strengths: "",
  improvements: "",
  bio: "",
  email: "",
  phone: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  highlight_url: "",
  photo_url: "",
  photo_position: "center center",
  is_featured: false,
  is_active: true,
};

const roles = [
  "Player",
  "Starter",
  "Bench",
  "Captain",
  "Co-Captain",
];

const playerTypes = [
  { label: "Official FACKTS Player", value: FACKTS_PLAYER_TYPE },
  { label: "External Player", value: EXTERNAL_PLAYER_TYPE },
  { label: "Guest Hooper", value: GUEST_HOOPER_TYPE },
  { label: "Prospect", value: PROSPECT_PLAYER_TYPE },
];

const positions = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Guard",
  "Forward",
  "Big",
  "Combo Guard",
  "Wing",
];

const hands = ["Right", "Left", "Both"];

const levels = [
  "School",
  "High School",
  "College",
  "University",
  "Community",
  "League",
  "Semi-Pro",
  "Professional",
  "National Team",
];

const photoPositions = [
  "center center",
  "center top",
  "center bottom",
  "left center",
  "right center",
  "left top",
  "right top",
  "left bottom",
  "right bottom",
];

function clean(value?: string | number | boolean | null) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function getPlayerName(player: PlayerRow) {
  return player.full_name || player.name || player.nickname || "Unnamed Player";
}

function formatDate(value?: string | null) {
  if (!value) return "Not added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not added";

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aNumber = Number(a.jersey_number ?? 9999);
      const bNumber = Number(b.jersey_number ?? 9999);

      if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber) && aNumber !== bNumber) {
        return aNumber - bNumber;
      }

      return getPlayerName(a).localeCompare(getPlayerName(b));
    });
  }, [players]);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("jersey_number", { ascending: true });

    if (error) {
      setPlayers([]);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setPlayers((data || []) as PlayerRow[]);
    setLoading(false);
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target;

    if (type === "checkbox") {
      const checked = (event.target as HTMLInputElement).checked;

      setForm((current) => ({
        ...current,
        [name]: checked,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setPhotoFile(file);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setPhotoFile(null);
    setMessage("");
    setErrorMessage("");
  }

  function startEdit(player: PlayerRow) {
    setEditingId(player.id);
    setPhotoFile(null);
    setMessage("");
    setErrorMessage("");

    setForm({
      full_name: clean(player.full_name || player.name),
      nickname: clean(player.nickname),
      jersey_number: clean(player.jersey_number),
      player_type: clean(player.player_type) || FACKTS_PLAYER_TYPE,
      role: clean(player.role) || "Player",
      position: clean(player.position),
      height: clean(player.height),
      weight: clean(player.weight),
      wingspan: clean(player.wingspan),
      vertical_leap: clean(player.vertical_leap),
      speed: clean(player.speed),
      standing_reach: clean(player.standing_reach),
      age: clean(player.age),
      date_of_birth: player.date_of_birth ? String(player.date_of_birth).slice(0, 10) : "",
      location: clean(player.location),
      dominant_hand: clean(player.dominant_hand),
      current_team: clean(player.current_team),
      previous_teams: clean(player.previous_teams),
      highest_level: clean(player.highest_level),
      years_played: clean(player.years_played),
      style_of_play: clean(player.style_of_play),
      strengths: clean(player.strengths),
      improvements: clean(player.improvements),
      bio: clean(player.bio),
      email: clean(player.email),
      phone: clean(player.phone),
      instagram_url: clean(player.instagram_url),
      tiktok_url: clean(player.tiktok_url),
      youtube_url: clean(player.youtube_url),
      highlight_url: clean(player.highlight_url),
      photo_url: clean(player.photo_url),
      photo_position: clean(player.photo_position) || "center center",
      is_featured: Boolean(player.is_featured),
      is_active: player.is_active !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadPhoto() {
    if (!photoFile) return form.photo_url;

    const fileExt = photoFile.name.split(".").pop() || "png";
    const fileName = `player-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("player-photos")
      .upload(fileName, photoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from("player-photos").getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const photoUrl = await uploadPhoto();

      const payload = {
        full_name: form.full_name.trim() || null,
        name: form.full_name.trim() || null,
        nickname: form.nickname.trim() || null,
        jersey_number: numberOrNull(form.jersey_number),
        role: form.role.trim() || null,
        player_type: form.player_type || FACKTS_PLAYER_TYPE,
        position: form.position.trim() || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
        wingspan: form.wingspan.trim() || null,
        vertical_leap: form.vertical_leap.trim() || null,
        speed: form.speed.trim() || null,
        standing_reach: form.standing_reach.trim() || null,
        age: form.age.trim() || null,
        date_of_birth: form.date_of_birth || null,
        location: form.location.trim() || null,
        dominant_hand: form.dominant_hand.trim() || null,
        current_team: form.current_team.trim() || null,
        previous_teams: form.previous_teams.trim() || null,
        highest_level: form.highest_level.trim() || null,
        years_played: form.years_played.trim() || null,
        style_of_play: form.style_of_play.trim() || null,
        strengths: form.strengths.trim() || null,
        improvements: form.improvements.trim() || null,
        bio: form.bio.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        tiktok_url: form.tiktok_url.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        highlight_url: form.highlight_url.trim() || null,
        photo_url: photoUrl || null,
        photo_position: form.photo_position.trim() || "center center",
        is_featured: form.is_featured,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (!payload.full_name) {
        throw new Error("Player full name is required.");
      }

      if (editingId) {
        const { error } = await supabase
          .from("players")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw new Error(error.message);
        }

        setMessage(
          form.player_type === FACKTS_PLAYER_TYPE
            ? "Player updated as an official FACKTS player."
            : `Player moved to ${playerClassificationLabel(form.player_type)}. Their full stats history now follows this category.`
        );
      } else {
        const { error } = await supabase.from("players").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) {
          throw new Error(error.message);
        }

        setMessage("Player added successfully.");
      }

      resetForm();
      await loadPlayers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePlayer(playerId: string) {
    const confirmed = window.confirm(
      "Delete this player? This removes the player record from the app."
    );

    if (!confirmed) return;

    setDeletingId(playerId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("players").delete().eq("id", playerId);

    if (error) {
      setErrorMessage(error.message);
      setDeletingId(null);
      return;
    }

    setMessage("Player deleted successfully.");
    setDeletingId(null);
    await loadPlayers();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Admin Panel
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Manage Players
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Edit identity, current category, role, measurements, skills,
                links, photo, and development details. Career stats follow the
                current category automatically.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Admin Home
              </Link>

              <Link
                href="/players"
                className="rounded-full border border-orange-400/40 bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
              >
                View Players
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[460px_1fr] lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                {editingId ? "Editing Player" : "New Player"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {editingId ? "Update Player" : "Add Player"}
              </h2>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <FormSection title="Identity">
            <Field label="Full Name">
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="e.g. Liam Mwaniki"
                className={inputClass}
              />
            </Field>

            <Field label="Nickname">
              <input
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="e.g. ISO7"
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jersey Number">
                <input
                  type="number"
                  name="jersey_number"
                  value={form.jersey_number}
                  onChange={handleChange}
                  placeholder="e.g. 7"
                  className={inputClass}
                />
              </Field>

              <Field label="Current Category">
                <select
                  name="player_type"
                  value={form.player_type}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {playerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Team Role">
                <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
            </Field>

            {editingId && form.player_type !== FACKTS_PLAYER_TYPE ? (
              <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs font-bold leading-5 text-orange-100">
                Saving this category removes the player from official FACKTS
                lists and accounts. Their previous game and 1v1 stats are kept
                and shown under Guest Leaderboards.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Position">
                <select
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select position</option>
                  {positions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Dominant Hand">
                <select
                  name="dominant_hand"
                  value={form.dominant_hand}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select hand</option>
                  {hands.map((hand) => (
                    <option key={hand} value={hand}>
                      {hand}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection title="Body & Measurements">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Height">
                <input
                  name="height"
                  value={form.height}
                  onChange={handleChange}
                  placeholder="e.g. 6'2 or 188cm"
                  className={inputClass}
                />
              </Field>

              <Field label="Weight">
                <input
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                  placeholder="e.g. 78kg"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Wingspan">
                <input
                  name="wingspan"
                  value={form.wingspan}
                  onChange={handleChange}
                  placeholder="e.g. 6'6 or 198cm"
                  className={inputClass}
                />
              </Field>

              <Field label="Standing Reach">
                <input
                  name="standing_reach"
                  value={form.standing_reach}
                  onChange={handleChange}
                  placeholder="e.g. 8'1"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vertical Leap">
                <input
                  name="vertical_leap"
                  value={form.vertical_leap}
                  onChange={handleChange}
                  placeholder="e.g. 32 inches"
                  className={inputClass}
                />
              </Field>

              <Field label="Speed">
                <input
                  name="speed"
                  value={form.speed}
                  onChange={handleChange}
                  placeholder="e.g. 3/4 court sprint time"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Background">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Age">
                <input
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="e.g. 22"
                  className={inputClass}
                />
              </Field>

              <Field label="Date of Birth">
                <input
                  type="date"
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Location">
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Nairobi"
                className={inputClass}
              />
            </Field>

            <Field label="Current Team / School">
              <input
                name="current_team"
                value={form.current_team}
                onChange={handleChange}
                placeholder="e.g. FACKTS, JKUAT, State House Girls"
                className={inputClass}
              />
            </Field>

            <Field label="Previous Teams">
              <textarea
                name="previous_teams"
                value={form.previous_teams}
                onChange={handleChange}
                rows={3}
                placeholder="Previous teams, schools, clubs"
                className={textareaClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Highest Level Played">
                <select
                  name="highest_level"
                  value={form.highest_level}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select level</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Years Played">
                <input
                  name="years_played"
                  value={form.years_played}
                  onChange={handleChange}
                  placeholder="e.g. 5 years"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Player Profile">
            <Field label="Style of Play">
              <textarea
                name="style_of_play"
                value={form.style_of_play}
                onChange={handleChange}
                rows={3}
                placeholder="Slasher, shooter, lockdown defender, floor general..."
                className={textareaClass}
              />
            </Field>

            <Field label="Strengths">
              <textarea
                name="strengths"
                value={form.strengths}
                onChange={handleChange}
                rows={3}
                placeholder="Finishing, ball handling, defense, leadership..."
                className={textareaClass}
              />
            </Field>

            <Field label="Improvement Areas">
              <textarea
                name="improvements"
                value={form.improvements}
                onChange={handleChange}
                rows={3}
                placeholder="Shooting consistency, conditioning, decision-making..."
                className={textareaClass}
              />
            </Field>

            <Field label="Bio / Story">
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={4}
                placeholder="Player background, story, goals, personality..."
                className={textareaClass}
              />
            </Field>
          </FormSection>

          <FormSection title="Contacts & Links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="player@email.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Phone">
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0713..."
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Instagram URL">
              <input
                name="instagram_url"
                value={form.instagram_url}
                onChange={handleChange}
                placeholder="https://instagram.com/..."
                className={inputClass}
              />
            </Field>

            <Field label="TikTok URL">
              <input
                name="tiktok_url"
                value={form.tiktok_url}
                onChange={handleChange}
                placeholder="https://tiktok.com/..."
                className={inputClass}
              />
            </Field>

            <Field label="YouTube URL">
              <input
                name="youtube_url"
                value={form.youtube_url}
                onChange={handleChange}
                placeholder="https://youtube.com/..."
                className={inputClass}
              />
            </Field>

            <Field label="Highlight Link">
              <input
                name="highlight_url"
                value={form.highlight_url}
                onChange={handleChange}
                placeholder="Highlight video link"
                className={inputClass}
              />
            </Field>
          </FormSection>

          <FormSection title="Photo & Visibility">
            <Field label="Photo Upload">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-black file:text-black"
              />
            </Field>

            <Field label="Current Photo URL">
              <input
                name="photo_url"
                value={form.photo_url}
                onChange={handleChange}
                placeholder="Photo URL appears here after upload"
                className={inputClass}
              />

              {form.photo_url ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <img
                    src={form.photo_url}
                    alt="Player preview"
                    className="h-72 w-full object-cover"
                    style={{
                      objectPosition: form.photo_position || "center center",
                    }}
                  />
                </div>
              ) : null}
            </Field>

            <Field label="Photo Position">
              <select
                name="photo_position"
                value={form.photo_position}
                onChange={handleChange}
                className={inputClass}
              >
                {photoPositions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-zinc-300">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={form.is_featured}
                  onChange={handleChange}
                  className="h-4 w-4 accent-orange-500"
                />
                Featured player
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-zinc-300">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 accent-orange-500"
                />
                Active on public page
              </label>
            </div>
          </FormSection>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save Player Changes" : "Add Player"}
          </button>
        </form>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Players Database
              </p>

              <h2 className="mt-1 text-2xl font-black">Existing Players</h2>
            </div>

            <button
              type="button"
              onClick={loadPlayers}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-orange-400/60"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <EmptyBox text="Loading players..." />
          ) : sortedPlayers.length === 0 ? (
            <EmptyBox text="No players found yet." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {sortedPlayers.map((player) => (
                <article
                  key={player.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-black"
                >
                  {player.photo_url ? (
                    <div className="h-60 w-full overflow-hidden bg-zinc-900">
                      <img
                        src={player.photo_url}
                        alt={getPlayerName(player)}
                        className="h-full w-full object-cover"
                        style={{
                          objectPosition: player.photo_position || "center center",
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-300">
                        #{player.jersey_number ?? "-"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase text-zinc-300">
                        {player.role || "Player"}
                      </span>

                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-200">
                        {playerClassificationLabel(player.player_type)}
                      </span>

                      {player.is_featured ? (
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
                          Featured
                        </span>
                      ) : null}

                      {player.is_active === false ? (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase text-red-200">
                          Inactive
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-xl font-black">{getPlayerName(player)}</h3>

                    {player.nickname ? (
                      <p className="mt-1 text-sm font-bold text-orange-300">
                        "{player.nickname}"
                      </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <Info label="Position" value={player.position} />
                      <Info label="Height" value={player.height} />
                      <Info label="Wingspan" value={player.wingspan} />
                      <Info label="Vertical" value={player.vertical_leap} />
                      <Info label="Speed" value={player.speed} />
                      <Info label="Team" value={player.current_team} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(player)}
                        className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                      >
                        Edit Everything
                      </button>

                      {player.player_type === FACKTS_PLAYER_TYPE ? (
                        <Link
                          href={`/players/${player.id}`}
                          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60"
                        >
                          View
                        </Link>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => deletePlayer(player.id)}
                        disabled={deletingId === player.id}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === player.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400";

const textareaClass =
  "w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-4">
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-orange-300">
        {title}
      </h3>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-white">
        {value || "-"}
      </p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5 text-sm font-bold text-zinc-400">
      {text}
    </div>
  );
}
