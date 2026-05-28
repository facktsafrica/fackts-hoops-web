"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setLoginOk(false);
    setMessage("Checking login...");

    const loginResult = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginResult.error) {
      setMessage(
        loginResult.error.message === "Invalid login credentials"
          ? "Invalid login credentials. Reset this user's password in Supabase Auth."
          : loginResult.error.message
      );
      setLoading(false);
      return;
    }

    const userId = loginResult.data.user?.id;

    if (!userId) {
      setMessage("Login failed. No user ID was returned.");
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("admin_profiles")
      .select("id, role, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (profileResult.error) {
      await supabase.auth.signOut();
      setMessage(`Admin profile check failed: ${profileResult.error.message}`);
      setLoading(false);
      return;
    }

    if (!profileResult.data) {
      await supabase.auth.signOut();
      setMessage(
        "Login worked, but this account is not approved as a FACKTS admin."
      );
      setLoading(false);
      return;
    }

    setLoginOk(true);
    setMessage("Access approved. Click the button below to enter admin.");
    setLoading(false);
  }

  async function clearSession() {
    setLoading(true);
    await supabase.auth.signOut();
    setEmail("");
    setPassword("");
    setLoginOk(false);
    setMessage("Session cleared. Try again.");
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
              Private access for approved FACKTS team members only.
            </p>
          </div>

          {message ? (
            <div
              className={
                loginOk
                  ? "mb-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm leading-6 text-orange-200"
                  : "mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-zinc-200"
              }
            >
              {message}
            </div>
          ) : null}

          {loginOk ? (
            <a
              href="/admin"
              className="block w-full rounded-2xl bg-orange-500 px-5 py-4 text-center text-base font-black text-black transition hover:bg-orange-400"
            >
              ENTER ADMIN DASHBOARD
            </a>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Email
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@email.com"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400 disabled:opacity-60"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Password
                </div>

                <input
                  type="password"
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
                className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {loading ? "Checking..." : "Login"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={clearSession}
            disabled={loading}
            className="mt-4 w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-zinc-300 transition hover:border-orange-400/60 hover:text-orange-300 disabled:opacity-60"
          >
            Clear session
          </button>

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