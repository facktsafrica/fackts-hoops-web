"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectedFrom = searchParams.get("redirectedFrom") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setErrorMessage(result.error || "Login failed.");
        setLoading(false);
        return;
      }

      setMessage("Login successful. Opening dashboard...");

      router.replace(redirectedFrom);
      router.refresh();
    } catch {
      setErrorMessage("Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25 p-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-slate-950 ring-1 ring-orange-500/30">
              <img
                src="/logos/fackts-hoops-logo.png"
                alt="FACKTS Hoops logo"
                className="h-full w-full object-contain p-2"
              />
            </div>

            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="mt-2 text-3xl font-black">Admin Login</h1>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Login to manage players, games, stats, media stories, and
                dashboard content.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="p-6">
            {message ? (
              <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {message}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@email.com"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login to Dashboard"}
              </button>

              <a
                href="/"
                className="rounded-2xl border border-slate-700 px-5 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Back to Public Site
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
        Loading admin login...
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}