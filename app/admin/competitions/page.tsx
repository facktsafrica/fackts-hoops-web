"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  summary: string | null;
  description: string | null;
  competition_format: string | null;
  organizer_name: string | null;
  current_season_label: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  rules_summary: string | null;
  target_games: number | null;
  standings_method: string | null;
  verification_status: string | null;
  is_public: boolean | null;
  is_featured: boolean | null;
};

type CompetitionForm = {
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  description: string;
  format: string;
  organizer: string;
  season: string;
  status: string;
  startDate: string;
  endDate: string;
  venue: string;
  location: string;
  logoUrl: string;
  coverUrl: string;
  rules: string;
  targetGames: string;
  standingsMethod: string;
  verificationStatus: string;
  isPublic: boolean;
  isFeatured: boolean;
};

const emptyForm: CompetitionForm = {
  slug: "",
  name: "",
  shortName: "",
  summary: "",
  description: "",
  format: "Basketball",
  organizer: "FACKTS Africa",
  season: "2026",
  status: "upcoming",
  startDate: "",
  endDate: "",
  venue: "",
  location: "Kenya",
  logoUrl: "",
  coverUrl: "",
  rules: "",
  targetGames: "",
  standingsMethod: "Wins, win rate, point difference, points scored, games played",
  verificationStatus: "unverified",
  isPublic: true,
  isFeatured: false,
};

const control = "min-h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-400/60";

function clean(value?: string | null) {
  return value?.trim() || "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toForm(row: CompetitionRow): CompetitionForm {
  return {
    slug: clean(row.slug),
    name: clean(row.name),
    shortName: clean(row.short_name),
    summary: clean(row.summary),
    description: clean(row.description),
    format: clean(row.competition_format) || "Basketball",
    organizer: clean(row.organizer_name),
    season: clean(row.current_season_label),
    status: clean(row.status) || "upcoming",
    startDate: clean(row.start_date),
    endDate: clean(row.end_date),
    venue: clean(row.venue),
    location: clean(row.location),
    logoUrl: clean(row.logo_url),
    coverUrl: clean(row.cover_image_url),
    rules: clean(row.rules_summary),
    targetGames: row.target_games == null ? "" : String(row.target_games),
    standingsMethod: clean(row.standings_method),
    verificationStatus: clean(row.verification_status) || "unverified",
    isPublic: row.is_public !== false,
    isFeatured: row.is_featured === true,
  };
}

export default function CompetitionsAdminPage() {
  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<CompetitionForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selected = rows.find((row) => row.id === selectedId) || null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => `${row.name} ${row.slug} ${row.current_season_label} ${row.status}`.toLowerCase().includes(needle));
  }, [query, rows]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setRows([]);
      setMessage(`Competition profiles could not load: ${error.message}. Run the Competitions migration first.`);
    } else {
      setRows((data || []) as CompetitionRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update<K extends keyof CompetitionForm>(key: K, value: CompetitionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function choose(row: CompetitionRow) {
    setSelectedId(row.id);
    setForm(toForm(row));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNew() {
    setSelectedId("");
    setForm(emptyForm);
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug || form.name);
    if (!name || !slug) {
      setMessage("Competition name and URL slug are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    const payload = {
      slug,
      name,
      short_name: form.shortName.trim() || null,
      summary: form.summary.trim() || null,
      description: form.description.trim() || null,
      competition_format: form.format.trim() || "Basketball",
      organizer_name: form.organizer.trim() || null,
      current_season_label: form.season.trim() || null,
      status: form.status,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      venue: form.venue.trim() || null,
      location: form.location.trim() || null,
      logo_url: form.logoUrl.trim() || null,
      cover_image_url: form.coverUrl.trim() || null,
      rules_summary: form.rules.trim() || null,
      target_games: form.targetGames ? Number(form.targetGames) : null,
      standings_method: form.standingsMethod.trim() || null,
      verification_status: form.verificationStatus,
      is_public: form.isPublic,
      is_featured: form.isFeatured,
      updated_at: new Date().toISOString(),
    };

    const result = selectedId
      ? await supabase.from("competitions").update(payload).eq("id", selectedId).select("id").single()
      : await supabase.from("competitions").insert(payload).select("id").single();

    if (result.error) {
      setMessage(`Competition could not save: ${result.error.message}`);
    } else {
      setSelectedId(String(result.data.id));
      setMessage(selectedId ? "Competition profile updated." : "Competition profile created.");
      await load();
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#030914] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">FACKTS Admin · Competition system</p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl">Competition Profiles</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Create permanent competition series, control their current season and publication status, then manage individual matchups in FACKTS Kings Battles.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="rounded-xl border border-white/15 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em]">Back to Admin</Link>
            <Link href="/admin/one-on-one" className="rounded-xl border border-orange-400/35 bg-orange-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-orange-300">Manage FACKTS Kings Battles</Link>
            <Link href="/competitions" className="rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-black">View Competitions</Link>
          </div>
        </header>

        {message ? <div className="mt-5 rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-xs font-bold text-orange-200">{message}</div> : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 xl:sticky xl:top-5 xl:h-fit">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black uppercase">Records</h2>
              <button type="button" onClick={startNew} className="rounded-lg bg-orange-500 px-3 py-2 text-[8px] font-black uppercase text-black">New</button>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search competition or season" className={`${control} mt-4`} />
            <div className="mt-4 grid max-h-[620px] gap-2 overflow-y-auto pr-1">
              {loading ? <Empty text="Loading competition records…" /> : filtered.length ? filtered.map((row) => (
                <button key={row.id} type="button" onClick={() => choose(row)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selectedId === row.id ? "border-orange-400/60 bg-orange-500/10" : "border-white/10 bg-black/35 hover:border-white/25"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#0b1f3a] text-xs font-black text-orange-300">{row.logo_url ? <img src={row.logo_url} alt="" className="h-full w-full object-cover" /> : row.name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-black">{row.name}</span><span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[.1em] text-zinc-500">{row.current_season_label || "No season"} · {row.status || "draft"}</span></span>
                </button>
              )) : <Empty text="No competition profile found." />}
            </div>
          </aside>

          <form onSubmit={save} className="rounded-[1.7rem] border border-white/10 bg-slate-950/80 p-5 sm:p-7">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">{selected ? "Editing published identity" : "New permanent series"}</p><h2 className="mt-2 text-2xl font-black uppercase">{selected?.name || "Competition setup"}</h2></div>
              {form.slug ? <Link href={`/competitions/${slugify(form.slug)}`} className="text-[9px] font-black uppercase text-orange-300 hover:underline">Open public profile →</Link> : null}
            </div>

            <FormSection title="Identity" text="The public name, URL and organizing institution.">
              <Field label="Competition name"><input value={form.name} onChange={(event) => { update("name", event.target.value); if (!selectedId && !form.slug) update("slug", slugify(event.target.value)); }} className={control} required /></Field>
              <Field label="Short name"><input value={form.shortName} onChange={(event) => update("shortName", event.target.value)} className={control} /></Field>
              <Field label="URL slug"><input value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} className={control} required /></Field>
              <Field label="Organizer"><input value={form.organizer} onChange={(event) => update("organizer", event.target.value)} className={control} /></Field>
              <Field label="Format"><input value={form.format} onChange={(event) => update("format", event.target.value)} placeholder="1v1, 3x3, League, Tournament" className={control} /></Field>
              <Field label="Current season"><input value={form.season} onChange={(event) => update("season", event.target.value)} placeholder="2026" className={control} /></Field>
              <Field label="Summary" wide><textarea value={form.summary} onChange={(event) => update("summary", event.target.value)} rows={3} className={control} /></Field>
              <Field label="Full description" wide><textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={5} className={control} /></Field>
            </FormSection>

            <FormSection title="Season and rules" text="Keep results and standings inside the correct time period.">
              <Field label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value)} className={control}><option value="upcoming">Upcoming</option><option value="live">Live / ongoing</option><option value="completed">Completed</option><option value="archived">Archived</option></select></Field>
              <Field label="Verification"><select value={form.verificationStatus} onChange={(event) => update("verificationStatus", event.target.value)} className={control}><option value="unverified">Unverified</option><option value="pending">Pending review</option><option value="verified">Verified</option><option value="disputed">Disputed</option></select></Field>
              <Field label="Start date"><input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} className={control} /></Field>
              <Field label="End date"><input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} className={control} /></Field>
              <Field label="Target games per player"><input type="number" min="0" value={form.targetGames} onChange={(event) => update("targetGames", event.target.value)} className={control} /></Field>
              <Field label="Standings method"><input value={form.standingsMethod} onChange={(event) => update("standingsMethod", event.target.value)} className={control} /></Field>
              <Field label="Rules summary" wide><textarea value={form.rules} onChange={(event) => update("rules", event.target.value)} rows={4} className={control} /></Field>
            </FormSection>

            <FormSection title="Presentation and publication" text="Use real approved artwork and publish only when the record is ready.">
              <Field label="Venue"><input value={form.venue} onChange={(event) => update("venue", event.target.value)} className={control} /></Field>
              <Field label="Location"><input value={form.location} onChange={(event) => update("location", event.target.value)} className={control} /></Field>
              <Field label="Logo URL"><input value={form.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} className={control} /></Field>
              <Field label="Cover image URL"><input value={form.coverUrl} onChange={(event) => update("coverUrl", event.target.value)} className={control} /></Field>
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 text-xs font-bold"><input type="checkbox" checked={form.isPublic} onChange={(event) => update("isPublic", event.target.checked)} /> Public competition</label>
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 text-xs font-bold"><input type="checkbox" checked={form.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} /> Feature in directory</label>
            </FormSection>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-[9px] font-bold uppercase leading-4 tracking-[.08em] text-zinc-600">Competition profiles are archived by changing status or publication. FACKTS Kings match records remain in the Battles manager.</p>
              <button disabled={saving} className="min-h-12 rounded-xl bg-orange-500 px-6 text-[10px] font-black uppercase tracking-[.12em] text-black disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : selectedId ? "Update competition" : "Create competition"}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function FormSection({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return <section className="mt-7"><div><h3 className="text-lg font-black uppercase">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div><div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div></section>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "block md:col-span-2" : "block"}><span className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">{label}</span>{children}</label>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-zinc-600">{text}</div>;
}
