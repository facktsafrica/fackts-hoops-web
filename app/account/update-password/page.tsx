"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Opening your secure password session...");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReady(Boolean(data.session));
      setMessage(
        data.session
          ? "Create a new password for your FACKTS account."
          : "This link is invalid or has expired. Request a new password link."
      );
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setReady(Boolean(session));
      if (session) setMessage("Create a new password for your FACKTS account.");
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setMessage("The two passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const safeNext = requestedNext === "/admin" ? "/admin" : "/player";
    setMessage("Password saved. Opening your account...");
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
          FACKTS Account
        </div>
        <h1 className="mt-2 text-3xl font-black">Set Password</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            disabled={!ready || loading}
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400 disabled:opacity-50"
          />
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Confirm new password"
            disabled={!ready || loading}
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!ready || loading}
            className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
