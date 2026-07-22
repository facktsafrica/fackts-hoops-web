"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EmailStatus = {
  configured?: boolean;
  has_api_key?: boolean;
  email_from?: string;
  admin_email?: string;
  error?: string;
};

export default function AdminEmailPage() {
  const [status, setStatus] = useState<EmailStatus>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadStatus() {
    setLoading(true);
    const response = await fetch("/api/admin/email", { cache: "no-store" });
    const result = await response.json().catch(() => ({ error: "Could not load status." }));
    setStatus(result);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadStatus();
    });
  }, []);

  async function sendTest() {
    setSending(true);
    setMessage("");
    const response = await fetch("/api/admin/email", { method: "POST" });
    const result = await response.json().catch(() => ({ ok: false, error: "Test failed." }));
    setMessage(result.message || result.error || "Test finished.");
    setSending(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">FACKTS Admin</p>
            <h1 className="mt-2 text-4xl font-black">Email Notifications</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Confirm the approved Resend sender and send a real test notification.
            </p>
          </div>
          <Link href="/admin" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black">Back to Admin</Link>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          {loading ? (
            <p className="text-slate-400">Checking Resend...</p>
          ) : (
            <>
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                status.configured
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-200"
              }`}>
                {status.configured ? "Configured" : "Needs Setup"}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatusCard label="API Key" value={status.has_api_key ? "Present" : "Missing"} />
                <StatusCard label="Sender" value={status.email_from || "Missing"} />
                <StatusCard label="Admin Inbox" value={status.admin_email || "Missing"} />
              </div>

              {status.error ? <p className="mt-4 text-sm text-red-200">{status.error}</p> : null}

              <button
                type="button"
                onClick={sendTest}
                disabled={!status.configured || sending}
                className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-40"
              >
                {sending ? "Sending..." : "Send Test Email"}
              </button>

              {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-white">{value}</p>
    </div>
  );
}
