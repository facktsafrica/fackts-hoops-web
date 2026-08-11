"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    organizer_name: "",
    event_type: "5v5",
    age_category: "Open",
    start_date: "",
    end_date: "",
    venue: "",
    location: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Event draft could not be created.");
      setSaving(false);
      return;
    }
    router.push(`/admin/events/${result.event.event_id}/setup`);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/events" className="text-sm font-black text-orange-300 hover:text-orange-200">
          ← Events Admin
        </Link>
        <form onSubmit={createEvent} className="mt-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">New operational event</p>
          <h1 className="mt-2 text-3xl font-black">Create a private draft</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This creates one parent event and one setup-progress record. It remains private until all seven setup stages pass server validation.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-bold text-zinc-300">
              Event title
              <input required value={form.title} onChange={(event) => update("title", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label className="sm:col-span-2 text-sm font-bold text-zinc-300">
              Organizer
              <input value={form.organizer_name} onChange={(event) => update("organizer_name", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label className="text-sm font-bold text-zinc-300">
              Format
              <select value={form.event_type} onChange={(event) => update("event_type", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3">
                {["1v1", "2v2", "3v3", "5v5", "Skills Challenge", "Shooting Contest", "Camp / Clinic", "Other"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-zinc-300">
              Age category
              <input value={form.age_category} onChange={(event) => update("age_category", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label className="text-sm font-bold text-zinc-300">
              Start date
              <input type="date" value={form.start_date} onChange={(event) => update("start_date", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3" />
            </label>
            <label className="text-sm font-bold text-zinc-300">
              End date
              <input type="date" value={form.end_date} onChange={(event) => update("end_date", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3" />
            </label>
            <label className="text-sm font-bold text-zinc-300">
              Venue
              <input value={form.venue} onChange={(event) => update("venue", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400" />
            </label>
            <label className="text-sm font-bold text-zinc-300">
              Location
              <input value={form.location} onChange={(event) => update("location", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400" />
            </label>
          </div>

          {message ? <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{message}</p> : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <button disabled={saving} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-50">
              {saving ? "Creating draft…" : "Create draft and continue"}
            </button>
            <Link href="/admin/events" className="rounded-xl border border-white/10 px-5 py-3 font-black text-zinc-300 hover:border-orange-300/50">Cancel</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
