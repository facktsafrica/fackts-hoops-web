"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("Checking admin access...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      setMessage(
        error?.message === "Invalid login credentials"
          ? "The email or password is incorrect."
          : error?.message || "Login failed."
      );
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id, role, is_active")
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setMessage(
        profileError
          ? `Admin approval check failed: ${profileError.message}`
          : "This account is not approved as a FACKTS administrator."
      );
      setLoading(false);
      return;
    }

    setMessage("Access approved. Opening the control room...");
    router.replace("/admin");
    router.refresh();
  }

  async function clearSession() {
    setLoading(true);
    await supabase.auth.signOut();
    setPassword("");
    setMessage("Session cleared. You can log in again.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="mb-6">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
              FACKTS Admin
            </div>
            <h1 className="mt-2 text-3xl font-black">Admin Login</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Private access for approved FACKTS administrators only.
            </p>
          </div>

          {message ? (
            <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-zinc-200">
              {message}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <div className="mb-2 text-sm font-bold text-zinc-300">Email</div>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@email.com"
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-bold text-zinc-300">Password</div>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400 disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Checking..." : "Login to Admin"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Link
              href="/account/forgot-password?role=admin"
              className="font-bold text-orange-300 transition hover:text-orange-200"
            >
              Forgot password?
            </Link>
            <button
              type="button"
              onClick={clearSession}
              disabled={loading}
              className="font-bold text-zinc-500 transition hover:text-zinc-300 disabled:opacity-60"
            >
              Clear session
            </button>
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <Link
              href="/"
              className="text-sm font-bold text-zinc-400 transition hover:text-orange-300"
            >
              Back to public platform
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
