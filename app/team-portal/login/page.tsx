"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TeamPortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("Checking team access…");
    const signedIn = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (signedIn.error || !signedIn.data.user) {
      setMessage(signedIn.error?.message === "Invalid login credentials" ? "The email or password is incorrect." : signedIn.error?.message || "Login failed.");
      setLoading(false);
      return;
    }
    const access = await fetch("/api/team-portal", { cache: "no-store" });
    const payload = await access.json().catch(() => ({}));
    if (!access.ok || !payload.ok) {
      await supabase.auth.signOut();
      setMessage(payload.error || "This account is not assigned to an active team portal.");
      setLoading(false);
      return;
    }
    router.replace("/team-portal");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#030b1a] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[82vh] max-w-md items-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-blue-400/15 bg-slate-950 shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.28),transparent_45%),linear-gradient(135deg,#07162b,#020617)] p-7">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-orange-300">FACKTS Hoops Partners</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none">Team Intelligence</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">Run training, roster operations, media readiness, verified stat submissions and live production from one controlled workspace.</p>
          </div>
          <div className="p-7">
            {message ? <div className="mb-5 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4 text-sm text-orange-100">{message}</div> : null}
            <form onSubmit={login} className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[.12em] text-slate-400">Team email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 outline-none transition focus:border-orange-400" /></label>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[.12em] text-slate-400">Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 outline-none transition focus:border-orange-400" /></label>
              <button disabled={loading} className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-[.08em] text-black disabled:opacity-60">{loading ? "Opening workspace…" : "Enter team portal"}</button>
            </form>
            <div className="mt-5 flex items-center justify-between gap-3 text-sm"><Link href="/account/forgot-password?role=team" className="font-bold text-orange-300">Forgot password?</Link><span className="text-right text-xs text-slate-500">Access is issued by Super Admin.</span></div>
            <Link href="/" className="mt-6 block border-t border-white/10 pt-5 text-sm font-bold text-slate-400">← Back to FACKTS Hoops</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
