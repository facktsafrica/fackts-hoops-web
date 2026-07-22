"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  notification_type: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.ok) setItems(result.notifications ?? []);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadNotifications();
    });
  }, []);

  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400"
        aria-label={`${unread} unread notifications`}
      >
        Alerts
        {unread > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-black">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="font-black">Notifications</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-slate-400">
              Close
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-3">
            {items.length === 0 ? (
              <p className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-500">No alerts yet.</p>
            ) : (
              <div className="space-y-2">
                {items.slice(0, 12).map((item) => (
                  <Link
                    key={item.id}
                    href={item.link_url || "#"}
                    onClick={() => {
                      void markRead(item.id);
                      setOpen(false);
                    }}
                    className={`block rounded-2xl border p-4 ${
                      item.is_read
                        ? "border-slate-800 bg-slate-900/60"
                        : "border-orange-500/30 bg-orange-500/10"
                    }`}
                  >
                    <p className="font-black text-white">{item.title}</p>
                    {item.body ? <p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p> : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
