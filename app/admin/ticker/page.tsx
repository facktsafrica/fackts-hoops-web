"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TickerAnnouncement = {
  id: string;
  message: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type FormState = {
  message: string;
  display_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  message: "",
  display_order: "100",
  is_active: true,
};

export default function AdminTickerPage() {
  const [items, setItems] = useState<TickerAnnouncement[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [items, editingId]
  );

  async function loadItems() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("ticker_announcements")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
    } else {
      setItems((data ?? []) as TickerAnnouncement[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
  }

  function startEdit(item: TickerAnnouncement) {
    setEditingId(item.id);
    setForm({
      message: item.message ?? "",
      display_order: String(item.display_order ?? 100),
      is_active: item.is_active ?? true,
    });
    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const payload = {
      message: form.message.trim(),
      display_order: Number(form.display_order || 100),
      is_active: form.is_active,
    };

    if (!payload.message) {
      setErrorMessage("Please enter an announcement message.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("ticker_announcements")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMessage("Ticker announcement updated.");
        resetForm();
        await loadItems();
      }
    } else {
      const { error } = await supabase
        .from("ticker_announcements")
        .insert(payload);

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMessage("Ticker announcement added.");
        resetForm();
        await loadItems();
      }
    }

    setSaving(false);
  }

  async function toggleActive(item: TickerAnnouncement) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("ticker_announcements")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadItems();
  }

  async function deleteItem(item: TickerAnnouncement) {
    const confirmed = window.confirm(`Delete "${item.message}"?`);
    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("ticker_announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (editingId === item.id) {
      resetForm();
    }

    setMessage("Ticker announcement deleted.");
    await loadItems();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                Admin
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                Live Ticker
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Manage short public announcements that move across the top of
                the FACKTS Hoops platform.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Dashboard
              </Link>

              <Link
                href="/"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Homepage
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 lg:grid-cols-[420px,1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                {editingItem ? "Edit Announcement" : "Add Announcement"}
              </div>

              <h2 className="mt-1 text-xl font-black">
                {editingItem ? editingItem.message : "New ticker message"}
              </h2>
            </div>

            {editingItem ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Announcement
              </span>

              <input
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                placeholder="Example: Game 2 vs ACK Baptist"
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Order
                </span>

                <input
                  type="number"
                  value={form.display_order}
                  onChange={(event) =>
                    setForm({ ...form, display_order: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                  className="h-5 w-5 accent-orange-500"
                />
                <span className="text-sm font-bold text-slate-200">Show</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingItem
                ? "Update Announcement"
                : "Add Announcement"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                Current Ticker
              </div>

              <h2 className="mt-1 text-xl font-black">
                {items.length} announcements
              </h2>
            </div>

            <button
              type="button"
              onClick={loadItems}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              Loading ticker announcements...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              No ticker announcements yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950 p-3 transition hover:border-orange-400/30"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                        item.is_active
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {item.is_active ? "Live" : "Hidden"}
                    </span>

                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Order #{item.display_order}
                    </span>
                  </div>

                  <div className="min-h-12 text-sm font-black leading-6 text-white">
                    {item.message}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-xl bg-orange-500 px-2 py-1.5 text-[11px] font-black text-slate-950 transition hover:bg-orange-400"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className="rounded-xl border border-slate-700 px-2 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-800"
                    >
                      {item.is_active ? "Hide" : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteItem(item)}
                      className="rounded-xl border border-rose-500/40 px-2 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}