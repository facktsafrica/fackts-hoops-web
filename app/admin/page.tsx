"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PlayerRow = {
  id: string;
  full_name: string;
  jersey_number: string | null;
  position: string | null;
};

type FormState = {
  id?: string;
  full_name: string;
  jersey_number: string;
  position: string;
  nickname: string;
  role: string;
  age: string;
  height: string;
  dominant_hand: string;
  current_team: string;
  previous_teams: string;
  highest_level: string;
  years_played: string;
  style_of_play: string;
  strengths: string;
  improvements: string;
  instagram: string;
  tiktok: string;
  x_handle: string;
  followers_range: string;
  photo_url: string;
};

const initialForm: FormState = {
  full_name: "",
  jersey_number: "",
  position: "",
  nickname: "",
  role: "Bench",
  age: "",
  height: "",
  dominant_hand: "",
  current_team: "",
  previous_teams: "",
  highest_level: "",
  years_played: "",
  style_of_play: "",
  strengths: "",
  improvements: "",
  instagram: "",
  tiktok: "",
  x_handle: "",
  followers_range: "",
  photo_url: "",
};

export default function AdminPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const response = await fetch("/api/players");
      const result = await response.json();
      setPlayers(result.players || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadPlayerIntoForm(id: string) {
    try {
      const response = await fetch("/api/players");
      const result = await response.json();
      const found = (result.players || []).find((p: any) => p.id === id);
      if (!found) return;

      setForm({
        id: found.id,
        full_name: found.full_name || "",
        jersey_number: found.jersey_number || "",
        position: found.position || "",
        nickname: found.nickname || "",
        role: found.role || "Bench",
        age: found.age || "",
        height: found.height || "",
        dominant_hand: found.dominant_hand || "",
        current_team: found.current_team || "",
        previous_teams: found.previous_teams || "",
        highest_level: found.highest_level || "",
        years_played: found.years_played || "",
        style_of_play: found.style_of_play || "",
        strengths: found.strengths || "",
        improvements: found.improvements || "",
        instagram: found.instagram || "",
        tiktok: found.tiktok || "",
        x_handle: found.x_handle || "",
        followers_range: found.followers_range || "",
        photo_url: found.photo_url || "",
      });

      setMessage(`Loaded ${found.full_name} for editing.`);
    } catch (error) {
      console.error(error);
    }
  }

  async function handlePhotoUpload(file: File) {
    try {
      setUploadingPhoto(true);
      setMessage("");

      const ext = file.name.split(".").pop() || "jpg";
      const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const filePath = safeName.replace(/[^\w.-]/g, "");

      const { error: uploadError } = await supabase.storage
        .from("player-photos")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        setUploadingPhoto(false);
        return;
      }

      const { data } = supabase.storage
        .from("player-photos")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        photo_url: data.publicUrl,
      }));

      setMessage("Photo uploaded successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Photo upload failed.");
    }

    setUploadingPhoto(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const method = form.id ? "PUT" : "POST";

    try {
      const response = await fetch("/api/players", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save player.");
        setLoading(false);
        return;
      }

      setMessage(
        form.id
          ? `Player updated: ${result.player.full_name}`
          : `Player created: ${result.player.full_name}`
      );

      setForm(initialForm);
      await loadPlayers();
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while saving player.");
    }

    setLoading(false);
  }

  function updateField(name: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function clearForm() {
    setForm(initialForm);
    setMessage("Form cleared.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">FACKTS Hoops Admin</h1>
              <p className="mt-2 text-slate-300">
                Create and edit players directly in Supabase.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Link
                href="/admin/games"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Game Admin
              </Link>
              <Link
                href="/admin/stats"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Stats Admin
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Existing Players</h2>
              <button
                onClick={clearForm}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                New
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {players.length === 0 ? (
                <p className="text-sm text-slate-400">No players found.</p>
              ) : (
                players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => loadPlayerIntoForm(player.id)}
                    className="block w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left hover:bg-slate-800"
                  >
                    <div className="font-medium">{player.full_name}</div>
                    <div className="text-sm text-slate-400">
                      #{player.jersey_number ?? "—"} • {player.position ?? "—"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Full Name" value={form.full_name} onChange={(v) => updateField("full_name", v)} required />
              <Input label="Jersey Number" value={form.jersey_number} onChange={(v) => updateField("jersey_number", v)} />
              <Input label="Position" value={form.position} onChange={(v) => updateField("position", v)} />
              <Input label="Nickname" value={form.nickname} onChange={(v) => updateField("nickname", v)} />
              <Input label="Role" value={form.role} onChange={(v) => updateField("role", v)} />
              <Input label="Age" value={form.age} onChange={(v) => updateField("age", v)} />
              <Input label="Height" value={form.height} onChange={(v) => updateField("height", v)} />
              <Input label="Dominant Hand" value={form.dominant_hand} onChange={(v) => updateField("dominant_hand", v)} />
              <Input label="Current Team" value={form.current_team} onChange={(v) => updateField("current_team", v)} />
              <Input label="Previous Teams" value={form.previous_teams} onChange={(v) => updateField("previous_teams", v)} />
              <Input label="Highest Level" value={form.highest_level} onChange={(v) => updateField("highest_level", v)} />
              <Input label="Years Played" value={form.years_played} onChange={(v) => updateField("years_played", v)} />
              <Input label="Style of Play" value={form.style_of_play} onChange={(v) => updateField("style_of_play", v)} />
              <Input label="Strengths" value={form.strengths} onChange={(v) => updateField("strengths", v)} />
              <Input label="Improvement Areas" value={form.improvements} onChange={(v) => updateField("improvements", v)} />
              <Input label="Instagram" value={form.instagram} onChange={(v) => updateField("instagram", v)} />
              <Input label="TikTok" value={form.tiktok} onChange={(v) => updateField("tiktok", v)} />
              <Input label="X / Twitter" value={form.x_handle} onChange={(v) => updateField("x_handle", v)} />
              <Input label="Followers Range" value={form.followers_range} onChange={(v) => updateField("followers_range", v)} />
              <Input label="Photo URL" value={form.photo_url} onChange={(v) => updateField("photo_url", v)} />
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </label>

              {form.photo_url && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-sm text-slate-300 mb-3">Photo Preview</div>
                  <img
                    src={form.photo_url}
                    alt="Player preview"
                    className="h-28 w-28 rounded-2xl object-cover border border-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="submit"
                disabled={loading || uploadingPhoto}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
              >
                {uploadingPhoto
                  ? "Uploading photo..."
                  : loading
                  ? "Saving..."
                  : form.id
                  ? "Update Player"
                  : "Create Player"}
              </button>

              <button
                type="button"
                onClick={clearForm}
                className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
              >
                Clear Form
              </button>

              {message && <p className="text-sm text-emerald-300">{message}</p>}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-400"
      />
    </label>
  );
}