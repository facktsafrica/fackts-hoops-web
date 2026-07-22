"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type AccountRole = "player" | "admin";

export default function ForgotPasswordPage() {
  const [role, setRole] = useState<AccountRole>("player");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get("role");
    if (requestedRole === "admin") {
      queueMicrotask(() => setRole("admin"));
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/request-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });

    const result = await response.json().catch(() => ({ ok: false }));
    setMessage(
      result.message ||
        "If that approved account exists, a password link has been sent."
    );
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
          Account Recovery
        </div>
        <h1 className="mt-2 text-3xl font-black">Reset Password</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          We will send a secure password link to the approved account email.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-black p-1">
          {(["player", "admin"] as AccountRole[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRole(item)}
              className={`rounded-xl px-3 py-2 text-sm font-black capitalize ${
                role === item ? "bg-orange-500 text-black" : "text-zinc-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-zinc-200">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <div className="mb-2 text-sm font-bold text-zinc-300">Email</div>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-orange-400"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Password Link"}
          </button>
        </form>

        <Link
          href={role === "admin" ? "/admin/login" : "/player/login"}
          className="mt-5 block text-sm font-bold text-zinc-400 hover:text-orange-300"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
