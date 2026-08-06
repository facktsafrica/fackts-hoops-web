"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GuestHooperForm = {
  full_name: string;
  nickname: string;
  position: string;
  photo_url: string;
  photo_position: string;
  notes: string;
  is_active: boolean;
};

type AdminGuestHooper = {
  id: string;
  source_id: string;
  source: "guest_hoopers" | "players";
  full_name: string;
  nickname: string | null;
  position: string | null;
  photo_url: string | null;
  photo_position: string | null;
  notes: string | null;
  role: string | null;
  is_active: boolean;
};

const emptyForm: GuestHooperForm = {
  full_name: "",
  nickname: "",
  position: "",
  photo_url: "",
  photo_position: "center center",
  notes: "",
  is_active: true,
};

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

function normalize(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function identityValues(person: any) {
  return [
    person.full_name,
    person.name,
    person.nickname,
  ]
    .map((value) => normalize(value))
    .filter(Boolean);
}

function displayName(person: any) {
  return (
    person.full_name ||
    person.name ||
    person.nickname ||
    "Guest Hooper"
  );
}

export default function AdminGuestHoopersPage() {
  const [guestHoopers, setGuestHoopers] = useState<AdminGuestHooper[]>([]);
  const [form, setForm] = useState<GuestHooperForm>(emptyForm);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [promotingGuestId, setPromotingGuestId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");

  const directGuestCount = guestHoopers.filter(
    (guest) => guest.source === "guest_hoopers"
  ).length;

  const convertedPlayerCount = guestHoopers.filter(
    (guest) => guest.source === "players"
  ).length;

  async function loadGuestHoopers() {
    setLoadingPage(true);
    setMessage("");

    const [guestResult, playerResult] = await Promise.all([
      supabase
        .from("guest_hoopers")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("players")
        .select("*")
        .ilike("role", "%guest%")
        .order("full_name", { ascending: true }),
    ]);

    const messages: string[] = [];

    if (guestResult.error) {
      messages.push(`Guest table error: ${guestResult.error.message}`);
    }

    if (playerResult.error) {
      messages.push(`Converted players error: ${playerResult.error.message}`);
    }

    const directGuests: AdminGuestHooper[] = (guestResult.data ?? []).map(
      (guest: any) => ({
        id: `guest-${guest.id}`,
        source_id: guest.id,
        source: "guest_hoopers",
        full_name: guest.full_name ?? "Guest Hooper",
        nickname: guest.nickname ?? null,
        position: guest.position ?? null,
        photo_url: guest.photo_url ?? null,
        photo_position: guest.photo_position ?? "center center",
        notes: guest.notes ?? null,
        role: "Guest Hooper",
        is_active: guest.is_active ?? true,
      })
    );

    const directGuestKeys = new Set<string>();

    for (const guest of directGuests) {
      for (const key of identityValues(guest)) {
        directGuestKeys.add(key);
      }
    }

    const convertedPlayers: AdminGuestHooper[] = (playerResult.data ?? [])
      .filter((player: any) => {
        const keys = identityValues(player);

        // If a real guest profile already exists with the same full name,
        // name, or nickname, do not show the converted player duplicate.
        return !keys.some((key) => directGuestKeys.has(key));
      })
      .map((player: any) => ({
        id: `player-${player.id}`,
        source_id: player.id,
        source: "players",
        full_name: displayName(player),
        nickname: player.nickname ?? null,
        position: player.position ?? null,
        photo_url: player.photo_url ?? null,
        photo_position: player.photo_position ?? "center center",
        notes:
          player.bio ??
          "Converted from official players. Existing player stats should follow this record.",
        role: player.role ?? "Guest Hooper",
        is_active: player.is_active ?? true,
      }));

    setGuestHoopers([...directGuests, ...convertedPlayers]);

    if (messages.length > 0) {
      setMessage(messages.join(" | "));
    }

    setLoadingPage(false);
  }

  useEffect(() => {
    loadGuestHoopers();
  }, []);

  function updateField<K extends keyof GuestHooperForm>(
    field: K,
    value: GuestHooperForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingGuestId(null);
    setMessage("");
  }

  function startEdit(guest: AdminGuestHooper) {
    if (guest.source !== "guest_hoopers") {
      setMessage(
        `${guest.full_name} is a converted player. Edit this person inside Admin Players.`
      );
      return;
    }

    setEditingGuestId(guest.source_id);

    setForm({
      full_name: guest.full_name ?? "",
      nickname: guest.nickname ?? "",
      position: guest.position ?? "",
      photo_url: guest.photo_url ?? "",
      photo_position: guest.photo_position ?? "center center",
      notes: guest.notes ?? "",
      is_active: guest.is_active ?? true,
    });

    setMessage(
      `Editing ${guest.full_name}. Make changes above, then click Update Guest Hooper.`
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    const safeName = form.full_name
      ? form.full_name.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()
      : "guest-hooper";

    const filePath = `guest-hoopers/${Date.now()}-${safeName}-${cleanName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setMessage(`Photo upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage
      .from("player-photos")
      .getPublicUrl(filePath);

    updateField("photo_url", data.publicUrl);
    setMessage("Photo uploaded successfully. Remember to click Create or Update.");
    setUploadingPhoto(false);
  }

  async function handleSaveGuestHooper(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (!form.full_name.trim()) {
      setMessage("Guest hooper name is required.");
      setLoading(false);
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      nickname: form.nickname.trim() || null,
      position: form.position.trim() || null,
      photo_url: form.photo_url.trim() || null,
      photo_position: form.photo_position || "center center",
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    if (editingGuestId) {
      const result = await supabase
        .from("guest_hoopers")
        .update(payload)
        .eq("id", editingGuestId);

      if (result.error) {
        setMessage(`Failed to update guest hooper: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Guest hooper updated successfully.");
    } else {
      const result = await supabase.from("guest_hoopers").insert([payload]);

      if (result.error) {
        setMessage(`Failed to create guest hooper: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Guest hooper created successfully.");
    }

    setForm(emptyForm);
    setEditingGuestId(null);
    await loadGuestHoopers();
    setLoading(false);
  }

  async function handleDeleteGuestHooper(guest: AdminGuestHooper) {
    if (guest.source !== "guest_hoopers") {
      setMessage(
        `${guest.full_name} is from the players table. Change their role inside Admin Players instead.`
      );
      return;
    }

    const yes = window.confirm("Delete this guest hooper?");
    if (!yes) return;

    const result = await supabase
      .from("guest_hoopers")
      .delete()
      .eq("id", guest.source_id);

    if (result.error) {
      setMessage(`Failed to delete guest hooper: ${result.error.message}`);
      return;
    }

    setMessage("Guest hooper deleted.");
    await loadGuestHoopers();
  }

  async function handlePromoteGuestHooper(guest: AdminGuestHooper) {
    if (guest.source !== "guest_hoopers") return;

    const confirmed = window.confirm(
      `Promote ${guest.full_name} to an official FACKTS player? They will move to Admin Players and become available in Player Accounts.`
    );
    if (!confirmed) return;

    setPromotingGuestId(guest.source_id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/guest-hoopers/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.source_id }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Promotion could not be completed.");
      }

      await loadGuestHoopers();
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Promotion could not be completed."
      );
    } finally {
      setPromotingGuestId(null);
    }
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
            Guest Hoopers
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            This admin page now shows direct guest profiles plus official players
            converted to Guest Hooper. Converted players are managed from Admin Players.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Total Showing" value={String(guestHoopers.length)} />
            <MiniStat label="Guest Profiles" value={String(directGuestCount)} />
            <MiniStat label="Converted Players" value={String(convertedPlayerCount)} />
          </div>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading guest hoopers...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    {editingGuestId ? "Edit Guest Hooper" : "New Guest Hooper"}
                  </div>

                  <h2 className="mt-1 text-2xl font-bold">
                    {editingGuestId ? "Update guest profile" : "Create guest profile"}
                  </h2>
                </div>

                {editingGuestId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSaveGuestHooper} className="space-y-4">
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
                    label="Position"
                    value={form.position}
                    onChange={(v) => updateField("position", v)}
                  />
                </div>

                <div className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Guest Hooper Photo Upload
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
                        Photo Preview
                      </div>

                      <img
                        src={form.photo_url}
                        alt="Guest hooper preview"
                        className="h-72 w-full rounded-2xl border border-slate-700 object-cover"
                        style={{ objectPosition: form.photo_position }}
                      />

                      <div className="mt-3 text-sm text-slate-500">
                        Adjust photo focus below if needed, then save.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
                      No photo uploaded yet.
                    </div>
                  )}
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

                <FormTextarea
                  label="Notes"
                  value={form.notes}
                  onChange={(v) => updateField("notes", v)}
                />

                <label className="flex items-center gap-3 rounded-2xl border border-slate-700 p-4 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => updateField("is_active", e.target.checked)}
                    className="h-4 w-4"
                  />
                  Active guest hooper
                </label>

                <button
                  type="submit"
                  disabled={loading || uploadingPhoto}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {loading
                    ? "Saving..."
                    : editingGuestId
                    ? "Update Guest Hooper"
                    : "Create Guest Hooper"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Guest List
                </div>

                <h2 className="mt-1 text-2xl font-bold">All Guest Hoopers</h2>

                <p className="mt-2 text-sm text-slate-500">
                  This list combines direct guest profiles and players whose role is Guest Hooper.
                </p>
              </div>

              {guestHoopers.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No guest hoopers found yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {guestHoopers.map((guest) => (
                    <div
                      key={guest.id}
                      className="rounded-3xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          {guest.photo_url ? (
                            <img
                              src={guest.photo_url}
                              alt={guest.full_name}
                              className="h-20 w-20 rounded-2xl border border-slate-700 object-cover"
                              style={{
                                objectPosition:
                                  guest.photo_position ?? "center center",
                              }}
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 text-xl font-black text-orange-300">
                              GH
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-xl font-bold">
                                {guest.full_name}
                              </div>

                              {guest.source === "players" ? (
                                <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-300">
                                  CONVERTED PLAYER
                                </span>
                              ) : (
                                <span className="rounded-full bg-orange-500/15 px-2 py-1 text-xs font-medium text-orange-300">
                                  GUEST PROFILE
                                </span>
                              )}

                              {guest.is_active ? (
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
                              {guest.nickname ? `"${guest.nickname}"` : "Guest Hooper"} •{" "}
                              {guest.position ?? "Position TBA"}
                            </div>

                            {guest.notes ? (
                              <div className="mt-2 text-sm leading-6 text-slate-500">
                                {guest.notes}
                              </div>
                            ) : null}

                            {guest.source === "players" ? (
                              <div className="mt-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-200">
                                Managed from Admin Players. Their old player stats stay attached to this player record.
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {guest.source === "guest_hoopers" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePromoteGuestHooper(guest)}
                                disabled={promotingGuestId === guest.source_id}
                                className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                              >
                                {promotingGuestId === guest.source_id
                                  ? "Promoting..."
                                  : "Promote to Official Player"}
                              </button>

                              <button
                                type="button"
                                onClick={() => startEdit(guest)}
                                className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/10"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteGuestHooper(guest)}
                                className="rounded-2xl border border-rose-500/30 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <Link
                              href="/admin/players"
                              className="rounded-2xl border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10"
                            >
                              Edit in Players
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
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
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}
