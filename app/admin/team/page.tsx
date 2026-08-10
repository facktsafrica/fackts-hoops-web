"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  deriveTeamMemberInitials,
  getTeamMemberInitials,
  teamMemberSlug,
  type TeamMember,
} from "@/lib/hoops/teamMembers";

type TeamMemberForm = {
  full_name: string;
  role_title: string;
  public_description: string;
  profile_photo_url: string;
  initials_fallback: string;
  display_order: string;
  is_featured: boolean;
  is_active: boolean;
};

type StatusState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

const emptyForm: TeamMemberForm = {
  full_name: "",
  role_title: "",
  public_description: "",
  profile_photo_url: "",
  initials_fallback: "",
  display_order: "100",
  is_featured: false,
  is_active: true,
};

const fieldClassName =
  "min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15";

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusMessage({ status }: { status: StatusState }) {
  if (!status) return null;

  const toneClass =
    status.tone === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : status.tone === "error"
        ? "border-red-400/30 bg-red-400/10 text-red-100"
        : "border-blue-400/30 bg-blue-400/10 text-blue-100";

  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClass}`}>
      {status.message}
    </div>
  );
}

function MemberAvatar({ member }: { member: TeamMember }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(member.profile_photo_url && !photoFailed);

  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-700 bg-orange-500 text-lg font-black text-slate-950">
      {showPhoto ? (
        // Admin-managed Supabase URLs are intentionally rendered without a fixed host allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.profile_photo_url ?? ""}
          alt={member.full_name}
          className="h-full w-full object-cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{getTeamMemberInitials(member)}</span>
      )}
    </div>
  );
}

function fetchAllTeamMembers() {
  return supabase
    .from("team_members")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<TeamMemberForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<StatusState>(null);

  const activeCount = useMemo(
    () => members.filter((member) => member.is_active).length,
    [members]
  );

  const leadershipCount = useMemo(
    () => members.filter((member) => member.is_featured).length,
    [members]
  );

  async function loadMembers() {
    setLoading(true);
    setLoadError("");

    const { data, error } = await fetchAllTeamMembers();

    if (error) {
      setMembers([]);
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    setMembers((data ?? []) as TeamMember[]);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    void fetchAllTeamMembers().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setMembers([]);
        setLoadError(error.message);
      } else {
        setMembers((data ?? []) as TeamMember[]);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "initials_fallback" ? value.toUpperCase().slice(0, 4) : value,
    }));
  }

  function handleCheckboxChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setForm((current) => ({ ...current, [name]: checked }));
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      full_name: member.full_name,
      role_title: member.role_title,
      public_description: member.public_description,
      profile_photo_url: member.profile_photo_url ?? "",
      initials_fallback: member.initials_fallback ?? "",
      display_order: String(member.display_order),
      is_featured: member.is_featured,
      is_active: member.is_active,
    });
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus({
        tone: "error",
        message: "Use a JPG, PNG or WebP profile photo.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus({
        tone: "error",
        message: "The profile photo must be 5 MB or smaller.",
      });
      return;
    }

    setUploading(true);
    setStatus({ tone: "info", message: "Uploading profile photo..." });

    const owner = editingId ?? teamMemberSlug(form.full_name || "new-member");
    const filePath = `${owner}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from("team-member-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (error) {
      setUploading(false);
      setStatus({ tone: "error", message: error.message });
      return;
    }

    const { data } = supabase.storage
      .from("team-member-images")
      .getPublicUrl(filePath);

    setForm((current) => ({
      ...current,
      profile_photo_url: data.publicUrl,
    }));
    setUploading(false);
    setStatus({
      tone: "success",
      message: "Photo uploaded. Save the team member to publish the change.",
    });
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fullName = form.full_name.trim();
    const roleTitle = form.role_title.trim();
    const description = form.public_description.trim();

    if (!fullName || !roleTitle || !description) {
      setStatus({
        tone: "error",
        message: "Full name, role and public description are required.",
      });
      return;
    }

    if (description.length > 500) {
      setStatus({
        tone: "error",
        message: "Keep the public description within 500 characters.",
      });
      return;
    }

    setSaving(true);
    setStatus({ tone: "info", message: "Saving team member..." });

    const payload = {
      full_name: fullName,
      role_title: roleTitle,
      public_description: description,
      profile_photo_url: form.profile_photo_url.trim() || null,
      initials_fallback:
        form.initials_fallback.trim().toUpperCase() ||
        deriveTeamMemberInitials(fullName),
      display_order: Number(form.display_order) || 100,
      is_featured: form.is_featured,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("team_members").update(payload).eq("id", editingId)
      : await supabase.from("team_members").insert({
          ...payload,
          slug: `${teamMemberSlug(fullName)}-${Date.now().toString(36)}`,
        });

    if (result.error) {
      setSaving(false);
      setStatus({ tone: "error", message: result.error.message });
      return;
    }

    await loadMembers();
    resetForm();
    setSaving(false);
    setStatus({
      tone: "success",
      message: editingId
        ? "Team member updated successfully."
        : "Team member added successfully.",
    });
  }

  async function toggleActive(member: TeamMember) {
    setSaving(true);
    const { error } = await supabase
      .from("team_members")
      .update({
        is_active: !member.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.id);

    if (error) {
      setSaving(false);
      setStatus({ tone: "error", message: error.message });
      return;
    }

    await loadMembers();
    setSaving(false);
    setStatus({
      tone: "success",
      message: member.is_active
        ? `${member.full_name} is now hidden from the About page.`
        : `${member.full_name} is now visible on the About page.`,
    });
  }

  async function moveMember(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= members.length) return;

    const reordered = [...members];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    setSaving(true);
    setStatus({ tone: "info", message: "Updating display order..." });

    const results = await Promise.all(
      reordered.map((member, memberIndex) =>
        supabase
          .from("team_members")
          .update({
            display_order: (memberIndex + 1) * 10,
            updated_at: new Date().toISOString(),
          })
          .eq("id", member.id)
      )
    );
    const failed = results.find((result) => result.error);

    await loadMembers();
    setSaving(false);

    if (failed?.error) {
      setStatus({ tone: "error", message: failed.error.message });
      return;
    }

    setStatus({ tone: "success", message: "Display order updated." });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-black/30">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                About Page Team
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Team Management
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                Manage the people shown under The Team Behind FACKTS. Changes
                appear on the public About page without editing the site.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Admin Home
              </Link>
              <Link
                href="/about"
                target="_blank"
                className="inline-flex min-h-11 items-center rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-200 transition hover:bg-orange-500/20"
              >
                View About Page
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Profiles" value={members.length} />
            <StatCard label="Publicly Active" value={activeCount} />
            <StatCard label="Leadership" value={leadershipCount} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <form
          onSubmit={saveMember}
          className="h-fit rounded-[1.75rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:sticky lg:top-24 sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                {editingId ? "Edit Profile" : "New Profile"}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {editingId ? "Update Team Member" : "Add Team Member"}
              </h2>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="grid gap-4">
            <StatusMessage status={status} />

            <Field label="Full Name">
              <input
                required
                name="full_name"
                value={form.full_name}
                onChange={handleTextChange}
                maxLength={120}
                className={fieldClassName}
                placeholder="e.g. Joseph Millighan"
              />
            </Field>

            <Field label="Role / Title">
              <input
                required
                name="role_title"
                value={form.role_title}
                onChange={handleTextChange}
                maxLength={120}
                className={fieldClassName}
                placeholder="e.g. Founder & Director"
              />
            </Field>

            <Field label="Short Public Description">
              <textarea
                required
                name="public_description"
                value={form.public_description}
                onChange={handleTextChange}
                maxLength={500}
                rows={5}
                className={`${fieldClassName} resize-y leading-7`}
                placeholder="What does this person handle for FACKTS?"
              />
              <span className="text-right text-xs font-normal text-slate-500">
                {form.public_description.length}/500
              </span>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Initials Fallback">
                <input
                  name="initials_fallback"
                  value={form.initials_fallback}
                  onChange={handleTextChange}
                  maxLength={4}
                  className={fieldClassName}
                  placeholder="JM"
                />
              </Field>
              <Field label="Display Order">
                <input
                  name="display_order"
                  value={form.display_order}
                  onChange={handleTextChange}
                  type="number"
                  min="0"
                  className={fieldClassName}
                />
              </Field>
            </div>

            <Field label="Profile Photo URL (optional)">
              <input
                name="profile_photo_url"
                value={form.profile_photo_url}
                onChange={handleTextChange}
                type="url"
                className={fieldClassName}
                placeholder="https://..."
              />
            </Field>

            <div className="rounded-2xl border border-slate-800 bg-black/25 p-4">
              <p className="text-sm font-bold text-slate-200">Upload Profile Photo</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                JPG, PNG or WebP. Maximum 5 MB. The initials remain as a fallback.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-200 transition hover:bg-orange-500/20">
                  {uploading ? "Uploading..." : "Choose Photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={uploadPhoto}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
                {form.profile_photo_url ? (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        profile_photo_url: "",
                      }))
                    }
                    className="min-h-11 rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-red-400 hover:text-red-200"
                  >
                    Remove Photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-800 bg-black/25 p-4 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={form.is_featured}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 accent-orange-500"
                />
                Leadership / featured
              </label>
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-800 bg-black/25 p-4 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 accent-orange-500"
                />
                Show on About page
              </label>
            </div>

            <button
              type="submit"
              disabled={saving || uploading}
              className="min-h-12 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Team Member Changes"
                  : "Add Team Member"}
            </button>
          </div>
        </form>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
              Public Display Order
            </p>
            <h2 className="mt-1 text-2xl font-black">Manage Existing Profiles</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use the arrows to reorder profiles. Inactive profiles remain here
              but disappear from the public About page.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-black/25 p-6 text-center text-sm text-slate-400">
              Loading team profiles...
            </div>
          ) : null}

          {!loading && loadError ? (
            <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-5">
              <p className="text-sm leading-6 text-red-100">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadMembers()}
                className="mt-4 min-h-11 rounded-full border border-red-300/30 px-4 py-2 text-xs font-black text-red-100"
              >
                Try Again
              </button>
            </div>
          ) : null}

          {!loading && !loadError && members.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-black/25 p-6 text-center text-sm text-slate-400">
              No team profiles have been added yet.
            </div>
          ) : null}

          {!loading && !loadError && members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member, index) => (
                <article
                  key={member.id}
                  className="rounded-3xl border border-slate-800 bg-black/25 p-4"
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <MemberAvatar
                        key={member.profile_photo_url || "initials"}
                        member={member}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          {member.is_featured ? (
                            <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-orange-200">
                              Leadership
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${
                              member.is_active
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                : "border-slate-600 bg-slate-800 text-slate-300"
                            }`}
                          >
                            {member.is_active ? "Active" : "Hidden"}
                          </span>
                          <span className="rounded-full border border-slate-700 px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                            Order {member.display_order}
                          </span>
                        </div>
                        <h3 className="mt-3 break-words text-xl font-black text-white">
                          {member.full_name}
                        </h3>
                        <p className="mt-1 break-words text-xs font-black uppercase tracking-[0.08em] text-orange-300">
                          {member.role_title}
                        </p>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                          {member.public_description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[12rem] sm:justify-end">
                      <button
                        type="button"
                        onClick={() => void moveMember(index, -1)}
                        disabled={saving || index === 0}
                        aria-label={`Move ${member.full_name} up`}
                        className="min-h-11 min-w-11 rounded-full border border-slate-700 px-3 text-sm font-black text-slate-200 hover:border-orange-400 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveMember(index, 1)}
                        disabled={saving || index === members.length - 1}
                        aria-label={`Move ${member.full_name} down`}
                        className="min-h-11 min-w-11 rounded-full border border-slate-700 px-3 text-sm font-black text-slate-200 hover:border-orange-400 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(member)}
                        className="min-h-11 rounded-full border border-blue-400/35 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-100 hover:bg-blue-500/20"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(member)}
                        disabled={saving}
                        className="min-h-11 rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-orange-400 hover:text-orange-200 disabled:opacity-50"
                      >
                        {member.is_active ? "Hide" : "Activate"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
