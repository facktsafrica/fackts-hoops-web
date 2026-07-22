"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import PushNotificationManager from "@/app/components/PushNotificationManager";
import { supabase } from "@/lib/supabase";

export default function PlayerSettingsPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Use at least 8 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password changed successfully.");
      setPassword("");
      setConfirmPassword("");
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Player Portal</p>
            <h1 className="mt-2 text-4xl font-black">Account & Notifications</h1>
          </div>
          <Link href="/player" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black">
            Back to My Player View
          </Link>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form onSubmit={changePassword} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Security</p>
            <h2 className="mt-2 text-2xl font-black">Change Password</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Replace the temporary password admin gave you with your own private password.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">New password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">Confirm password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save New Password"}
              </button>
            </div>
          </form>

          <PushNotificationManager />
        </div>
      </div>
    </main>
  );
}
