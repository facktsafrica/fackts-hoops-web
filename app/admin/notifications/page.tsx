"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import NotificationBell from "@/app/components/NotificationBell";
import PushNotificationManager from "@/app/components/PushNotificationManager";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("/player");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendAnnouncement(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    const response = await fetch("/api/notification-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "admin.broadcast",
        title,
        body,
        link_url: linkUrl,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok && result.ok) {
      setMessage(
        `Announcement saved for ${result.created ?? 0} players and pushed to ${
          result.delivered ?? 0
        } subscribed devices.`
      );
      setTitle("");
      setBody("");
      setLinkUrl("/player");
    } else {
      setMessage(result.error || "Could not send the announcement.");
    }

    setSending(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              FACKTS Admin
            </p>
            <h1 className="mt-2 text-4xl font-black">App Notifications</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Automatic alerts handle player responses, match decisions, games and rosters. Use this page for a direct announcement to every active player account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link href="/admin" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black">
              Back to Admin
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <PushNotificationManager />

          <form onSubmit={sendAnnouncement} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Admin Broadcast</p>
            <h2 className="mt-2 text-2xl font-black">Notify All Players</h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">Title</span>
                <input
                  required
                  maxLength={80}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Training time changed"
                  className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">Message</span>
                <textarea
                  required
                  maxLength={300}
                  rows={4}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write the update players should receive."
                  className="w-full resize-none rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">Open this app page</span>
                <input
                  required
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="/player"
                  className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send App Notification"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
