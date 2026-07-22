"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function officialPlayerRole(role?: string | null) {
  const cleanRole = String(role ?? "").toLowerCase();
  return !cleanRole.includes("guest") && !cleanRole.includes("prospect");
}

export default function PlayerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("Checking player access...");

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

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, role, is_active")
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (playerError || !player || !officialPlayerRole(player.role)) {
      await supabase.auth.signOut();
      setMessage(
        playerError
          ? `Player access check failed: ${playerError.message}`
          : "This account is not linked to an active FACKTS player."
      );
      setLoading(false);
      return;
    }

    setMessage("Welcome back. Opening your player portal...");
    router.replace("/player");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-orange-500/20 bg-zinc-950 shadow-2xl shadow-orange-950/20">
          <div className="border-b border-white/10 bg-gradient-to-br from-orange-500/20 via-zinc-950 to-blue-950/40 p-6">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
              FACKTS Hoops
            </div>
            <h1 className="mt-2 text-4xl font-black uppercase">Player Login</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Access your profile, stats, availability, challenges, and player alerts.
            </p>
          </div>

          <div className="p-6">
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
                  placeholder="player@email.com"
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
                {loading ? "Checking..." : "Enter Player Portal"}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                href="/account/forgot-password?role=player"
                className="font-bold text-orange-300 transition hover:text-orange-200"
              >
                Forgot password?
              </Link>
              <span className="text-zinc-500">Accounts are issued by FACKTS admin.</span>
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <Link
                href="/"
                className="text-sm font-bold text-zinc-400 transition hover:text-orange-300"
              >
                Back to FACKTS Hoops
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
