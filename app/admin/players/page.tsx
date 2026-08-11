"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  EXTERNAL_PLAYER_TYPE,
  FACKTS_PLAYER_TYPE,
  GUEST_HOOPER_TYPE,
  LEGACY_GUEST_TYPE,
  PROSPECT_PLAYER_TYPE,
  playerClassificationLabel,
} from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

type LegacyAlias = {
  id: string;
  legacy_source: string;
  legacy_id: string;
  legacy_route_id?: string | null;
  alias_type?: string | null;
};

type LegacyGuest = {
  id: string;
  full_name?: string | null;
  nickname?: string | null;
  guest_type?: string | null;
  is_active?: boolean | null;
};

type Person = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: string | number | null;
  role?: string | null;
  player_type?: string | null;
  position?: string | null;
  current_team?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  consent_status?: string | null;
  aliases?: LegacyAlias[];
  legacy_guest_profiles?: LegacyGuest[];
};

type PersonForm = {
  full_name: string;
  nickname: string;
  jersey_number: string;
  role: string;
  player_type: string;
  position: string;
  current_team: string;
  email: string;
  phone: string;
  bio: string;
  photo_url: string;
  is_featured: boolean;
  is_active: boolean;
};

const emptyForm: PersonForm = {
  full_name: "",
  nickname: "",
  jersey_number: "",
  role: "Player",
  player_type: FACKTS_PLAYER_TYPE,
  position: "",
  current_team: "",
  email: "",
  phone: "",
  bio: "",
  photo_url: "",
  is_featured: false,
  is_active: true,
};

const playerTypes = [
  FACKTS_PLAYER_TYPE,
  GUEST_HOOPER_TYPE,
  EXTERNAL_PLAYER_TYPE,
  PROSPECT_PLAYER_TYPE,
  LEGACY_GUEST_TYPE,
];

const positions = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Combo Guard",
  "Wing",
  "Forward",
  "Big",
];

function displayName(person: Person) {
  return person.full_name || person.name || person.nickname || "Unnamed person";
}

function toForm(person: Person): PersonForm {
  return {
    full_name: displayName(person),
    nickname: person.nickname || "",
    jersey_number: String(person.jersey_number ?? ""),
    role: person.role || "Player",
    player_type: person.player_type || FACKTS_PLAYER_TYPE,
    position: person.position || "",
    current_team: person.current_team || "",
    email: person.email || "",
    phone: person.phone || "",
    bio: person.bio || "",
    photo_url: person.photo_url || "",
    is_featured: person.is_featured === true,
    is_active: person.is_active !== false,
  };
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminPlayersPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PersonForm>(emptyForm);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/people", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || "People could not be loaded.");
      setPeople([]);
    } else {
      setPeople(result.people ?? []);
      setMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPeople(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPeople]);

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    return people.filter((person) => {
      const matchesSearch =
        !query ||
        [
          person.full_name,
          person.name,
          person.nickname,
          person.current_team,
          person.position,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));
      const matchesType = typeFilter === "all" || person.player_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? person.is_active !== false : person.is_active === false);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [people, search, statusFilter, typeFilter]);

  const counts = useMemo(
    () => ({
      total: people.length,
      active: people.filter((person) => person.is_active !== false).length,
      official: people.filter((person) => person.player_type === FACKTS_PLAYER_TYPE).length,
      guest: people.filter((person) =>
        [GUEST_HOOPER_TYPE, LEGACY_GUEST_TYPE, EXTERNAL_PLAYER_TYPE].includes(
          person.player_type as typeof GUEST_HOOPER_TYPE
        )
      ).length,
    }),
    [people]
  );

  function startCreate() {
    setEditingId("");
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setForm(toForm(person));
    setShowForm(true);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function update<K extends keyof PersonForm>(key: K, value: PersonForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Choose a valid image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Player images must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    const fileName = `canonical/${Date.now()}-${safeFileName(file.name) || "player-photo.jpg"}`;
    const result = await supabase.storage
      .from("player-photos")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (result.error) {
      setMessage(result.error.message);
    } else {
      const publicUrl = supabase.storage.from("player-photos").getPublicUrl(fileName).data.publicUrl;
      update("photo_url", publicUrl);
      setMessage("Photo uploaded. Save the person record to keep the change.");
    }
    setUploading(false);
    event.target.value = "";
  }

  async function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/people", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), ...form }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      const candidates = Array.isArray(result.duplicate_candidates)
        ? ` Candidate: ${result.duplicate_candidates.map((candidate: Person) => displayName(candidate)).join(", ")}.`
        : "";
      setMessage(`${result.error || "Person could not be saved."}${candidates}`);
    } else {
      setMessage(result.message || "Canonical person saved.");
      setShowForm(false);
      setEditingId("");
      setForm(emptyForm);
      await loadPeople();
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Phase 1 · Canonical identity
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">People & Players</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              One person record now supports official players, guests, external
              participants, prospects and inactive history. Legacy guest profiles
              remain linked as evidence; no one is merged by name.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/players"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black"
            >
              Public players
            </Link>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-black text-black"
            >
              Add person
            </button>
          </div>
        </header>

        {message ? (
          <div role="status" className="mt-6 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-4 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Canonical people", counts.total],
            ["Active", counts.active],
            ["Official", counts.official],
            ["Guest / external", counts.guest],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-2xl font-black text-orange-300">{value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </section>

        {showForm ? (
          <form onSubmit={savePerson} className="mt-6 rounded-3xl border border-orange-500/25 bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                  {editingId ? "Edit canonical record" : "New canonical record"}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {editingId ? form.full_name || "Person" : "Add a person once"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" required value={form.full_name} set={(value) => update("full_name", value)} />
              <Field label="Nickname" value={form.nickname} set={(value) => update("nickname", value)} />
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">Classification</span>
                <select
                  value={form.player_type}
                  onChange={(event) => update("player_type", event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
                >
                  {playerTypes.map((value) => (
                    <option key={value} value={value}>{playerClassificationLabel(value)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">Position</span>
                <select
                  value={form.position}
                  onChange={(event) => update("position", event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
                >
                  <option value="">Not recorded</option>
                  {positions.map((position) => <option key={position}>{position}</option>)}
                </select>
              </label>
              <Field label="Current team" value={form.current_team} set={(value) => update("current_team", value)} />
              <Field label="Jersey number" value={form.jersey_number} set={(value) => update("jersey_number", value)} />
              <Field label="Role" value={form.role} set={(value) => update("role", value)} />
              <Field label="Email" type="email" value={form.email} set={(value) => update("email", value)} />
              <Field label="Phone" value={form.phone} set={(value) => update("phone", value)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="mb-2 block text-sm font-bold text-slate-300">Photo</span>
                <div className="grid gap-3 rounded-2xl border border-slate-700 bg-black/30 p-4 sm:grid-cols-[1fr_auto]">
                  <input
                    type="url"
                    value={form.photo_url}
                    onChange={(event) => update("photo_url", event.target.value)}
                    placeholder="Paste a hosted photo URL"
                    className="h-12 rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
                  />
                  <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-orange-500/40 px-5 text-sm font-black text-orange-200">
                    <input type="file" accept="image/*" onChange={uploadPhoto} className="sr-only" />
                    {uploading ? "Uploading..." : "Upload image"}
                  </label>
                </div>
              </div>
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="mb-2 block text-sm font-bold text-slate-300">Profile note / bio</span>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(event) => update("bio", event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-black p-4 outline-none focus:border-orange-400"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-black/30 p-4">
                <input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-5 w-5 accent-orange-500" />
                <span><strong className="block">Active</strong><span className="text-xs text-slate-500">Turn off to preserve history without showing active status.</span></span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-black/30 p-4">
                <input type="checkbox" checked={form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} className="h-5 w-5 accent-orange-500" />
                <span><strong className="block">Featured</strong><span className="text-xs text-slate-500">Existing public feature flag.</span></span>
              </label>
            </div>

            <button type="submit" disabled={saving || uploading} className="mt-6 rounded-2xl bg-orange-500 px-6 py-3 font-black text-black disabled:opacity-60">
              {saving ? "Saving..." : editingId ? "Save canonical record" : "Create canonical person"}
            </button>
          </form>
        ) : null}

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_0.6fr_0.45fr]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, nickname, team or position"
              className="h-12 rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
            />
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-700 bg-black px-4">
              <option value="all">All classifications</option>
              {playerTypes.map((value) => <option key={value} value={value}>{playerClassificationLabel(value)}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-700 bg-black px-4">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All status</option>
            </select>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Canonical register</h2>
            <span className="rounded-full border border-slate-800 px-3 py-1 text-xs font-black text-slate-500">{filteredPeople.length}</span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">Loading canonical people...</div>
          ) : filteredPeople.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">No people match these filters.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPeople.map((person) => (
                <article key={person.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
                  <div
                    className="h-36 bg-slate-800 bg-cover bg-center"
                    style={person.photo_url ? { backgroundImage: `url(${person.photo_url})` } : undefined}
                    aria-label={person.photo_url ? `${displayName(person)} photo` : "No photo recorded"}
                    role="img"
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black">{displayName(person)}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {[person.nickname, person.position, person.current_team].filter(Boolean).join(" · ") || "Details pending"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${person.is_active !== false ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                        {person.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-black text-blue-300">{playerClassificationLabel(person.player_type)}</span>
                      {(person.legacy_guest_profiles ?? []).length ? (
                        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black text-amber-300">Legacy guest linked</span>
                      ) : null}
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold text-slate-500">{(person.aliases ?? []).length} aliases</span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => startEdit(person)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Edit record</button>
                      <Link href={`/players/${person.id}`} className="rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm font-black">View profile</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, set, type = "text", required = false }: { label: string; value: string; set: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => set(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400" />
    </label>
  );
}
