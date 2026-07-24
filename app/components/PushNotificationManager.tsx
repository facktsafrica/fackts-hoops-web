"use client";

import { useEffect, useState } from "react";

type PushStatus = "checking" | "ready" | "active" | "blocked" | "unsupported" | "unconfigured";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PushNotificationManager({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (active) setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (active) setStatus("blocked");
        return;
      }

      const response = await fetch("/api/push/subscribe", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));

      if (!active) return;
      if (!result.configured || !result.publicKey) {
        setStatus("unconfigured");
        return;
      }

      setPublicKey(result.publicKey);
      const registration = await navigator.serviceWorker.ready;
      const deviceSubscription = await registration.pushManager.getSubscription();
      setStatus(deviceSubscription && result.subscribed ? "active" : "ready");
    }

    void checkStatus();
    return () => {
      active = false;
    };
  }, []);

  async function enableNotifications() {
    if (!publicKey) return;

    setBusy(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "ready");
        setMessage("Notifications were not allowed on this device.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) throw new Error(result.error || "Could not enable notifications.");

      setStatus("active");
      setMessage("Notifications are active on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription?.endpoint || "" }),
      });

      if (subscription) await subscription.unsubscribe();
      setStatus("ready");
      setMessage("Notifications are off on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") {
    return <span className="text-xs font-bold text-slate-500">Checking notifications…</span>;
  }

  if (status === "unsupported") {
    return <span className="text-xs font-bold text-slate-500">Push is not supported in this browser.</span>;
  }

  if (status === "blocked") {
    return <span className="text-xs font-bold text-red-300">Notifications are blocked in device settings.</span>;
  }

  if (status === "unconfigured") {
    if (compact) {
      return null;
    }

    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
          Device Alerts
        </p>
        <h2 className="mt-2 text-xl font-black">Push notifications unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          This feature is not connected right now. In-app alerts will continue to work.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "rounded-3xl border border-slate-800 bg-slate-900 p-5"}>
      {!compact ? (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Device Alerts</p>
          <h2 className="mt-2 text-xl font-black">Phone & Laptop Notifications</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Receive match approvals, roster calls, game changes and player updates even when FACKTS is closed.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={status === "active" ? disableNotifications : enableNotifications}
        disabled={busy}
        className={`${compact ? "" : "mt-4 w-full"} rounded-2xl px-4 py-3 text-sm font-black transition disabled:opacity-60 ${
          status === "active"
            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "bg-orange-500 text-black hover:bg-orange-400"
        }`}
      >
        {busy ? "Working…" : status === "active" ? "Notifications Active — Turn Off" : "Enable Notifications"}
      </button>

      {message ? <p className={`${compact ? "w-full" : "mt-3"} text-xs text-slate-400`}>{message}</p> : null}
    </div>
  );
}
