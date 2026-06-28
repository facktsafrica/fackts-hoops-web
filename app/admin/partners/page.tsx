"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type PartnerRow = {
  id: string;
  name: string;
  category?: string | null;
  role?: string | null;
  description?: string | null;
  about?: string | null;
  how_we_work?: string | null;
  support_areas?: string | null;
  products_services?: string | null;
  impact_note?: string | null;
  call_to_action?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  gallery_image_1?: string | null;
  gallery_image_2?: string | null;
  gallery_image_3?: string | null;
  initials?: string | null;
  badge?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PartnerForm = {
  name: string;
  category: string;
  role: string;
  description: string;
  about: string;
  how_we_work: string;
  support_areas: string;
  products_services: string;
  impact_note: string;
  call_to_action: string;
  website_url: string;
  instagram_url: string;
  logo_url: string;
  cover_image_url: string;
  gallery_image_1: string;
  gallery_image_2: string;
  gallery_image_3: string;
  initials: string;
  badge: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: PartnerForm = {
  name: "",
  category: "Partner",
  role: "",
  description: "",
  about: "",
  how_we_work: "",
  support_areas: "",
  products_services: "",
  impact_note: "",
  call_to_action: "",
  website_url: "",
  instagram_url: "",
  logo_url: "",
  cover_image_url: "",
  gallery_image_1: "",
  gallery_image_2: "",
  gallery_image_3: "",
  initials: "",
  badge: "",
  is_featured: false,
  is_active: true,
  sort_order: "100",
};

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activePartners = useMemo(
    () => partners.filter((partner) => partner.is_active !== false).length,
    [partners]
  );

  const featuredPartners = useMemo(
    () => partners.filter((partner) => partner.is_featured === true).length,
    [partners]
  );

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    setLoading(true);

    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setPartners((data || []) as PartnerRow[]);
    setLoading(false);
  }

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCheckboxChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: checked,
    }));
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    field:
      | "logo_url"
      | "cover_image_url"
      | "gallery_image_1"
      | "gallery_image_2"
      | "gallery_image_3"
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const filePath = `partners/${field}/${Date.now()}-${safeFileName(file.name)}`;

    const { error } = await supabase.storage
      .from("partner-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      alert(error.message);
      return;
    }

    const { data } = supabase.storage
      .from("partner-images")
      .getPublicUrl(filePath);

    setForm((current) => ({
      ...current,
      [field]: data.publicUrl,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(partner: PartnerRow) {
    setEditingId(partner.id);

    setForm({
      name: partner.name || "",
      category: partner.category || "Partner",
      role: partner.role || "",
      description: partner.description || "",
      about: partner.about || "",
      how_we_work: partner.how_we_work || "",
      support_areas: partner.support_areas || "",
      products_services: partner.products_services || "",
      impact_note: partner.impact_note || "",
      call_to_action: partner.call_to_action || "",
      website_url: partner.website_url || "",
      instagram_url: partner.instagram_url || "",
      logo_url: partner.logo_url || "",
      cover_image_url: partner.cover_image_url || "",
      gallery_image_1: partner.gallery_image_1 || "",
      gallery_image_2: partner.gallery_image_2 || "",
      gallery_image_3: partner.gallery_image_3 || "",
      initials: partner.initials || "",
      badge: partner.badge || "",
      is_featured: partner.is_featured === true,
      is_active: partner.is_active !== false,
      sort_order:
        partner.sort_order === null || partner.sort_order === undefined
          ? "100"
          : String(partner.sort_order),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePartner(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Partner name is required.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      category: clean(form.category) || "Partner",
      role: clean(form.role),
      description: clean(form.description),
      about: clean(form.about),
      how_we_work: clean(form.how_we_work),
      support_areas: clean(form.support_areas),
      products_services: clean(form.products_services),
      impact_note: clean(form.impact_note),
      call_to_action: clean(form.call_to_action),
      website_url: clean(form.website_url),
      instagram_url: clean(form.instagram_url),
      logo_url: clean(form.logo_url),
      cover_image_url: clean(form.cover_image_url),
      gallery_image_1: clean(form.gallery_image_1),
      gallery_image_2: clean(form.gallery_image_2),
      gallery_image_3: clean(form.gallery_image_3),
      initials: clean(form.initials) || getInitials(form.name),
      badge: clean(form.badge),
      is_featured: form.is_featured,
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 100),
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("partners")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("partners").insert(payload);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    await fetchPartners();
    resetForm();
    setSaving(false);
  }

  async function deletePartner(id: string) {
    const confirmed = window.confirm(
      "Delete this partner? This removes it from the database."
    );

    if (!confirmed) return;

    const { error } = await supabase.from("partners").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchPartners();
  }

  async function toggleActive(partner: PartnerRow) {
    const { error } = await supabase
      .from("partners")
      .update({
        is_active: partner.is_active === false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partner.id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchPartners();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-black/30">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Admin Partners
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Partners Control
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                Add partner logos, cover images, gallery images, full profile
                details, and how each partner works with FACKTS.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Admin Home
              </Link>

              <Link
                href="/partners"
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                View Public Page
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Partners" value={partners.length} />
            <StatCard label="Active" value={activePartners} />
            <StatCard label="Featured" value={featuredPartners} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <form
          onSubmit={savePartner}
          className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                {editingId ? "Edit Partner" : "New Partner"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {editingId ? "Update Partner" : "Add Partner"}
              </h2>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="grid gap-4">
            <Field label="Partner Name">
              <input
                name="name"
                value={form.name}
                onChange={handleTextChange}
                className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                placeholder="e.g. Madebykelzz"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleTextChange}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                >
                  <option value="Creative Partner">Creative Partner</option>
                  <option value="Institutional Partner">Institutional Partner</option>
                  <option value="Insurance Partner">Insurance Partner</option>
                  <option value="Sponsor">Sponsor</option>
                  <option value="Media Partner">Media Partner</option>
                  <option value="Community Partner">Community Partner</option>
                  <option value="Partner">Partner</option>
                </select>
              </Field>

              <Field label="Badge">
                <input
                  name="badge"
                  value={form.badge}
                  onChange={handleTextChange}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                  placeholder="Creative / Institutional"
                />
              </Field>
            </div>

            <Field label="Short Role">
              <input
                name="role"
                value={form.role}
                onChange={handleTextChange}
                className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                placeholder="What does this partner do for FACKTS?"
              />
            </Field>

            <Field label="Short Card Description">
              <textarea
                name="description"
                value={form.description}
                onChange={handleTextChange}
                rows={4}
                className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                placeholder="This appears on the partners listing page."
              />
            </Field>

            <Field label="About Partner">
              <textarea
                name="about"
                value={form.about}
                onChange={handleTextChange}
                rows={5}
                className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                placeholder="Who are they? What do they represent?"
              />
            </Field>

            <Field label="How They Work With FACKTS">
              <textarea
                name="how_we_work"
                value={form.how_we_work}
                onChange={handleTextChange}
                rows={5}
                className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                placeholder="Explain the relationship with FACKTS."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Support Areas">
                <textarea
                  name="support_areas"
                  value={form.support_areas}
                  onChange={handleTextChange}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                  placeholder="Events, merch, media, insurance..."
                />
              </Field>

              <Field label="Products / Services">
                <textarea
                  name="products_services"
                  value={form.products_services}
                  onChange={handleTextChange}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                  placeholder="Bags, consulting, insurance, creative..."
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Impact Note">
                <textarea
                  name="impact_note"
                  value={form.impact_note}
                  onChange={handleTextChange}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                  placeholder="What value do they bring?"
                />
              </Field>

              <Field label="Call To Action">
                <textarea
                  name="call_to_action"
                  value={form.call_to_action}
                  onChange={handleTextChange}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-orange-400"
                  placeholder="Shop with them, request a quote..."
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website URL">
                <input
                  name="website_url"
                  value={form.website_url}
                  onChange={handleTextChange}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                  placeholder="https://..."
                />
              </Field>

              <Field label="Instagram URL">
                <input
                  name="instagram_url"
                  value={form.instagram_url}
                  onChange={handleTextChange}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                  placeholder="https://instagram.com/..."
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploadField
                label="Partner Logo"
                value={form.logo_url}
                onFileChange={(event) => uploadImage(event, "logo_url")}
                onClear={() => setForm((current) => ({ ...current, logo_url: "" }))}
              />

              <ImageUploadField
                label="Cover Picture"
                value={form.cover_image_url}
                onFileChange={(event) => uploadImage(event, "cover_image_url")}
                onClear={() =>
                  setForm((current) => ({ ...current, cover_image_url: "" }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <ImageUploadField
                label="Gallery 1"
                value={form.gallery_image_1}
                onFileChange={(event) => uploadImage(event, "gallery_image_1")}
                onClear={() =>
                  setForm((current) => ({ ...current, gallery_image_1: "" }))
                }
              />

              <ImageUploadField
                label="Gallery 2"
                value={form.gallery_image_2}
                onFileChange={(event) => uploadImage(event, "gallery_image_2")}
                onClear={() =>
                  setForm((current) => ({ ...current, gallery_image_2: "" }))
                }
              />

              <ImageUploadField
                label="Gallery 3"
                value={form.gallery_image_3}
                onFileChange={(event) => uploadImage(event, "gallery_image_3")}
                onClear={() =>
                  setForm((current) => ({ ...current, gallery_image_3: "" }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Initials">
                <input
                  name="initials"
                  value={form.initials}
                  onChange={handleTextChange}
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                  placeholder="MK"
                />
              </Field>

              <Field label="Sort Order">
                <input
                  name="sort_order"
                  value={form.sort_order}
                  onChange={handleTextChange}
                  type="number"
                  className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/30 p-4 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={form.is_featured}
                  onChange={handleCheckboxChange}
                />
                Featured partner
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/30 p-4 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleCheckboxChange}
                />
                Show on public page
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Save Partner Changes"
                : "Add Partner"}
            </button>
          </div>
        </form>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Partner List
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Manage Existing Partners
            </h2>
          </div>

          {loading ? (
            <EmptyBox text="Loading partners..." />
          ) : partners.length === 0 ? (
            <EmptyBox text="No partners added yet." />
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="rounded-3xl border border-slate-800 bg-black/30 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                        {partner.logo_url ? (
                          <img
                            src={partner.logo_url}
                            alt={partner.name}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <span className="text-xl font-black text-orange-300">
                            {partner.initials || getInitials(partner.name)}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">
                            {partner.badge || partner.category || "Partner"}
                          </span>

                          {partner.is_featured ? (
                            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-200">
                              Featured
                            </span>
                          ) : null}

                          {partner.is_active === false ? (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-200">
                              Hidden
                            </span>
                          ) : (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                              Active
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-xl font-black text-white">
                          {partner.name}
                        </h3>

                        {partner.role ? (
                          <p className="mt-1 text-sm font-bold text-slate-300">
                            {partner.role}
                          </p>
                        ) : null}

                        {partner.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {partner.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/partners/${partner.id}`}
                        target="_blank"
                        className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
                      >
                        View
                      </Link>

                      <button
                        type="button"
                        onClick={() => startEdit(partner)}
                        className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(partner)}
                        className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
                      >
                        {partner.is_active === false ? "Show" : "Hide"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePartner(partner.id)}
                        className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/10"
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
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function ImageUploadField({
  label,
  value,
  onFileChange,
  onClear,
}: {
  label: string;
  value: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-4">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      {value ? (
        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <img src={value} alt={label} className="h-32 w-full object-cover" />
        </div>
      ) : null}

      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="w-full rounded-2xl border border-slate-700 bg-black/40 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-black file:text-black hover:file:bg-orange-400 focus:border-orange-400"
      />

      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 rounded-full border border-red-500/40 px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/10"
        >
          Remove Image
        </button>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-5 text-sm text-slate-400">
      {text}
    </div>
  );
}