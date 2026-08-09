"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isOfficialFacktsPlayer } from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

type SourceRow = Record<string, unknown> & {
  id: string;
  source_player_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  player_type?: string | null;
  guest_type?: string | null;
  role?: string | null;
  photo_url?: string | null;
  is_active?: boolean | null;
  profile_headline?: string | null;
  cover_image_url?: string | null;
  profile_status?: string | null;
  verification_status?: string | null;
  consent_status?: string | null;
  profile_verified_by?: string | null;
  achievements?: string | null;
};

type ProfileEntry = {
  key: string;
  source: "player" | "guest";
  row: SourceRow;
  name: string;
  relationship: string;
};

type MediaRow = {
  id: string;
  title: string;
  media_type?: string | null;
  url: string;
  thumbnail_url?: string | null;
  rights_status?: string | null;
  publish_status?: string | null;
};

type AchievementRow = {
  id: string;
  title: string;
  competition_name?: string | null;
  achievement_date?: string | null;
  description?: string | null;
  verification_status?: string | null;
};

type ProfileForm = {
  profile_headline: string;
  cover_image_url: string;
  profile_status: string;
  verification_status: string;
  consent_status: string;
  profile_verified_by: string;
  achievements: string;
};

const emptyProfileForm: ProfileForm = {
  profile_headline: "",
  cover_image_url: "",
  profile_status: "published",
  verification_status: "unverified",
  consent_status: "not_recorded",
  profile_verified_by: "",
  achievements: "",
};

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nameOf(row: SourceRow) {
  return clean(row.full_name) || clean(row.name) || clean(row.nickname) || "Unnamed player";
}

export default function AdminPlayerProfilesPage() {
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ProfileForm>(emptyProfileForm);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = entries.find((entry) => entry.key === selectedKey) || null;
  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) =>
      `${entry.name} ${entry.relationship}`.toLowerCase().includes(needle)
    );
  }, [entries, query]);

  function selectProfile(entry: ProfileEntry) {
    setSelectedKey(entry.key);
    setForm({
      profile_headline: clean(entry.row.profile_headline),
      cover_image_url: clean(entry.row.cover_image_url),
      profile_status: clean(entry.row.profile_status) || "published",
      verification_status: clean(entry.row.verification_status) || "unverified",
      consent_status: clean(entry.row.consent_status) || "not_recorded",
      profile_verified_by: clean(entry.row.profile_verified_by),
      achievements: clean(entry.row.achievements),
    });
    void loadAttachedRecords(entry);
  }

  async function loadProfiles() {
    setLoading(true);
    setError("");
    const [playersResult, guestsResult] = await Promise.all([
      supabase.from("players").select("*").order("full_name"),
      supabase.from("guest_hoopers").select("*").order("full_name"),
    ]);

    if (playersResult.error || guestsResult.error) {
      setError(playersResult.error?.message || guestsResult.error?.message || "Profiles could not be loaded.");
      setLoading(false);
      return;
    }

    const players = (playersResult.data || []) as SourceRow[];
    const guests = (guestsResult.data || []) as SourceRow[];
    const officialIds = new Set(
      players.filter((row) => isOfficialFacktsPlayer(row) && row.is_active !== false).map((row) => row.id)
    );
    const rows: ProfileEntry[] = [
      ...players
        .filter((row) => isOfficialFacktsPlayer(row))
        .map((row) => ({
          key: `player:${row.id}`,
          source: "player" as const,
          row,
          name: nameOf(row),
          relationship: "Official FACKTS Player",
        })),
      ...guests
        .filter((row) => !row.source_player_id || !officialIds.has(row.source_player_id))
        .map((row) => ({
          key: `guest:${row.id}`,
          source: "guest" as const,
          row,
          name: nameOf(row),
          relationship:
            clean(row.guest_type) === "external_player" ? "Competition Player" : "Guest Hooper",
        })),
    ].sort((left, right) => left.name.localeCompare(right.name));

    setEntries(rows);
    const nextSelection =
      rows.find((entry) => entry.key === selectedKey) || rows[0] || null;
    if (nextSelection) selectProfile(nextSelection);
    setLoading(false);
  }

  async function loadAttachedRecords(entry: ProfileEntry) {
    setError("");
    const field = entry.source === "player" ? "player_id" : "guest_hooper_id";
    const [mediaResult, achievementsResult] = await Promise.all([
      supabase.from("player_media").select("*").eq(field, entry.row.id).order("display_order"),
      supabase.from("player_achievements").select("*").eq(field, entry.row.id).order("display_order"),
    ]);

    if (mediaResult.error || achievementsResult.error) {
      setMedia([]);
      setAchievements([]);
      setError(
        "Run the unified player profiles SQL migration before managing profile media and achievements."
      );
      return;
    }

    setMedia((mediaResult.data || []) as MediaRow[]);
    setAchievements((achievementsResult.data || []) as AchievementRow[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfiles();
    // The first load is intentionally mount-only. Later refreshes happen after
    // explicit profile writes so the active selection remains stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      profile_headline: form.profile_headline.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      profile_status: form.profile_status,
      verification_status: form.verification_status,
      consent_status: form.consent_status,
      profile_verified_by: form.profile_verified_by.trim() || null,
      profile_verified_at:
        form.verification_status === "verified" ? new Date().toISOString() : null,
      achievements: form.achievements.trim() || null,
    };
    const table = selected.source === "player" ? "players" : "guest_hoopers";
    const result = await supabase
      .from(table)
      .update(
        selected.source === "player"
          ? { ...payload, updated_at: new Date().toISOString() }
          : payload
      )
      .eq("id", selected.row.id);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setMessage("Public profile controls saved.");
    await loadProfiles();
    setSaving(false);
  }

  async function addMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const title = clean(data.get("title"));
    const url = clean(data.get("url"));
    if (!title || !url) return setError("Media title and URL are required.");
    setError("");

    const result = await supabase.from("player_media").insert({
      player_id: selected.source === "player" ? selected.row.id : null,
      guest_hooper_id: selected.source === "guest" ? selected.row.id : null,
      title,
      media_type: clean(data.get("media_type")) || "highlight",
      url,
      thumbnail_url: clean(data.get("thumbnail_url")) || null,
      rights_status: clean(data.get("rights_status")) || "approved",
      publish_status: "published",
      is_public: true,
      published_at: new Date().toISOString(),
    });
    if (result.error) return setError(result.error.message);
    event.currentTarget.reset();
    setMessage("Player media added.");
    await loadAttachedRecords(selected);
  }

  async function addAchievement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const title = clean(data.get("title"));
    if (!title) return setError("Achievement title is required.");
    setError("");

    const result = await supabase.from("player_achievements").insert({
      player_id: selected.source === "player" ? selected.row.id : null,
      guest_hooper_id: selected.source === "guest" ? selected.row.id : null,
      title,
      competition_name: clean(data.get("competition_name")) || null,
      achievement_date: clean(data.get("achievement_date")) || null,
      description: clean(data.get("description")) || null,
      verification_status: clean(data.get("verification_status")) || "unverified",
      is_public: true,
    });
    if (result.error) return setError(result.error.message);
    event.currentTarget.reset();
    setMessage("Achievement added.");
    await loadAttachedRecords(selected);
  }

  async function deleteAttached(table: "player_media" | "player_achievements", id: string) {
    if (!selected || !window.confirm("Remove this public profile item?")) return;
    const result = await supabase.from(table).delete().eq("id", id);
    if (result.error) return setError(result.error.message);
    setMessage("Profile item removed.");
    await loadAttachedRecords(selected);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_36%),#050b16]">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Players administration</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.035em] sm:text-5xl">Public profile manager</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Manage verification, publication clearance, profile headlines, achievements and media for official players and guest hoopers from one workflow.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/players" className="rounded-xl border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em]">Edit player identity</Link>
            <Link href="/admin/guest-hoopers" className="rounded-xl border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em]">Edit guest identity</Link>
            {selected ? <Link href={`/players/${selected.source === "guest" ? `guest-${selected.row.id}` : selected.row.id}`} className="rounded-xl bg-orange-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-black">Open public profile</Link> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[330px_1fr] lg:px-8">
        <aside className="h-fit rounded-[1.5rem] border border-white/10 bg-zinc-950 p-4 lg:sticky lg:top-24">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player profiles" className={inputClass} />
          <div className="mt-4 max-h-[68vh] space-y-2 overflow-y-auto pr-1">
            {loading ? <Empty text="Loading profiles..." /> : filteredEntries.map((entry) => (
              <button key={entry.key} type="button" onClick={() => selectProfile(entry)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedKey === entry.key ? "border-orange-400/60 bg-orange-500/10" : "border-white/10 bg-black/35 hover:border-white/25"}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 text-xs font-black text-orange-300">{entry.row.photo_url ? <img src={clean(entry.row.photo_url)} alt="" className="h-full w-full object-cover" /> : entry.name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-black">{entry.name}</span><span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[.1em] text-zinc-500">{entry.relationship}</span></span>
              </button>
            ))}
          </div>
        </aside>

        {!selected ? <Empty text="Choose a profile to begin." /> : (
          <div className="space-y-6">
            {message ? <Notice tone="success" text={message} /> : null}
            {error ? <Notice tone="error" text={error} /> : null}

            <form onSubmit={saveProfile} className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-5 sm:p-6">
              <FormHeading kicker="Governance" title={selected.name} />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Profile headline"><input value={form.profile_headline} onChange={(event) => setForm({ ...form, profile_headline: event.target.value })} className={inputClass} placeholder="Short public basketball identity statement" /></Field>
                <Field label="Cover image URL"><input value={form.cover_image_url} onChange={(event) => setForm({ ...form, cover_image_url: event.target.value })} className={inputClass} placeholder="https://..." /></Field>
                <Field label="Public status"><select value={form.profile_status} onChange={(event) => setForm({ ...form, profile_status: event.target.value })} className={inputClass}><option value="published">Published</option><option value="draft">Draft</option><option value="hidden">Hidden</option></select></Field>
                <Field label="Verification"><select value={form.verification_status} onChange={(event) => setForm({ ...form, verification_status: event.target.value })} className={inputClass}><option value="unverified">Unverified</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="disputed">Disputed</option></select></Field>
                <Field label="Publication clearance"><select value={form.consent_status} onChange={(event) => setForm({ ...form, consent_status: event.target.value })} className={inputClass}><option value="not_recorded">Not recorded</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="restricted">Restricted</option><option value="withdrawn">Withdrawn</option></select></Field>
                <Field label="Verified / reviewed by"><input value={form.profile_verified_by} onChange={(event) => setForm({ ...form, profile_verified_by: event.target.value })} className={inputClass} placeholder="FACKTS administrator name" /></Field>
              </div>
              <Field label="Legacy achievements / quick list"><textarea value={form.achievements} onChange={(event) => setForm({ ...form, achievements: event.target.value })} rows={4} className={`${inputClass} mt-4 h-auto py-3`} placeholder="One achievement per line" /></Field>
              <button disabled={saving} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-black disabled:opacity-50">{saving ? "Saving..." : "Save profile controls"}</button>
            </form>

            <section className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-5 sm:p-6">
              <FormHeading kicker="Rights-aware content" title="Player media" />
              <form onSubmit={addMedia} className="mt-6 grid gap-3 sm:grid-cols-2">
                <input name="title" placeholder="Media title" className={inputClass} />
                <select name="media_type" className={inputClass}><option value="highlight">Highlight</option><option value="interview">Interview</option><option value="full_game">Full game</option><option value="training">Training</option><option value="story">Story</option></select>
                <input name="url" placeholder="Video or social media URL" className={`${inputClass} sm:col-span-2`} />
                <input name="thumbnail_url" placeholder="Thumbnail URL (optional)" className={inputClass} />
                <select name="rights_status" className={inputClass}><option value="approved">Approved</option><option value="owned">FACKTS owned</option><option value="licensed">Licensed</option><option value="permission_pending">Permission pending</option></select>
                <button className="rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-black sm:col-span-2">Add player media</button>
              </form>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{media.map((item) => <AttachedCard key={item.id} title={item.title} detail={`${item.media_type || "Media"} · ${item.rights_status || "Rights not set"}`} onDelete={() => deleteAttached("player_media", item.id)} />)}</div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-5 sm:p-6">
              <FormHeading kicker="Milestones" title="Achievements" />
              <form onSubmit={addAchievement} className="mt-6 grid gap-3 sm:grid-cols-2">
                <input name="title" placeholder="Achievement title" className={inputClass} />
                <input name="competition_name" placeholder="Competition / season" className={inputClass} />
                <input type="date" name="achievement_date" className={inputClass} />
                <select name="verification_status" className={inputClass}><option value="unverified">Unverified</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="disputed">Disputed</option></select>
                <textarea name="description" rows={3} placeholder="Short evidence note" className={`${inputClass} h-auto py-3 sm:col-span-2`} />
                <button className="rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-black sm:col-span-2">Add achievement</button>
              </form>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{achievements.map((item) => <AttachedCard key={item.id} title={item.title} detail={`${item.competition_name || "Competition not set"} · ${item.verification_status || "unverified"}`} onDelete={() => deleteAttached("player_achievements", item.id)} />)}</div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

const inputClass = "h-12 w-full rounded-xl border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-zinc-500">{label}</span>{children}</label>; }
function FormHeading({ kicker, title }: { kicker: string; title: string }) { return <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">{kicker}</p><h2 className="mt-2 text-2xl font-black uppercase">{title}</h2></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-zinc-500">{text}</div>; }
function Notice({ tone, text }: { tone: "success" | "error"; text: string }) { return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>{text}</div>; }
function AttachedCard({ title, detail, onDelete }: { title: string; detail: string; onDelete: () => void }) { return <article className="rounded-xl border border-white/10 bg-black/35 p-4"><h3 className="font-black">{title}</h3><p className="mt-2 text-[9px] font-bold uppercase tracking-[.1em] text-zinc-500">{detail}</p><button type="button" onClick={onDelete} className="mt-4 text-[9px] font-black uppercase tracking-[.12em] text-red-300">Remove</button></article>; }
