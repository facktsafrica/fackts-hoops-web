"use client";

import { useEffect, useState } from "react";

type PushStatus =
  | "checking"
  | "ready"
  | "active"
  | "repair"
  | "blocked"
  | "unsupported"
  | "unconfigured";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function subscriptionUsesKey(
  subscription: PushSubscription,
  publicKey: string
) {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;

  const current = new Uint8Array(currentKey);
  const expected = urlBase64ToUint8Array(publicKey);

  return (
    current.length === expected.length &&
    current.every((value, index) => value === expected[index])
  );
}

async function notificationRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  }

  return navigator.serviceWorker.ready;
}

async function removeServerSubscription(endpoint: string) {
  const response = await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Could not remove the old device subscription.");
  }

  return result;
}

export default function PushNotificationManager({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

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

      try {
        const registration = await notificationRegistration();
        const deviceSubscription =
          await registration.pushManager.getSubscription();
        const endpoint = deviceSubscription?.endpoint || "";
        const query = endpoint
          ? `?endpoint=${encodeURIComponent(endpoint)}`
          : "";
        const response = await fetch(`/api/push/subscribe${query}`, {
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));

        if (!active) return;
        if (!response.ok) {
          setMessage(result.error || "Could not check notification status.");
          setStatus("ready");
          return;
        }

        if (!result.configured || !result.publicKey) {
          setMessage(
            result.issue ||
              "Push notifications are not configured on the FACKTS server."
          );
          setStatus("unconfigured");
          return;
        }

        setPublicKey(result.publicKey);
        setSubscriptionCount(Number(result.subscriptionCount ?? 0));

        if (
          deviceSubscription &&
          result.subscribed &&
          subscriptionUsesKey(deviceSubscription, result.publicKey)
        ) {
          setStatus("active");
          return;
        }

        if (deviceSubscription) {
          setStatus("repair");
          setMessage(
            "This device has an old or incomplete connection. Select Repair Notifications."
          );
          return;
        }

        setStatus("ready");
      } catch {
        if (active) {
          setStatus("ready");
          setMessage(
            "FACKTS could not check this device. Refresh the page and try again."
          );
        }
      }
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

      const registration = await notificationRegistration();
      let subscription = await registration.pushManager.getSubscription();

      if (
        subscription &&
        (status === "repair" || !subscriptionUsesKey(subscription, publicKey))
      ) {
        await removeServerSubscription(subscription.endpoint);
        await subscription.unsubscribe();
        subscription = null;
      }

      subscription =
        subscription ||
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

      setSubscriptionCount(
        Number(result.subscriptionCount ?? Math.max(1, subscriptionCount))
      );

      const testResponse = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const testResult = await testResponse.json().catch(() => ({}));

      if (!testResponse.ok || !testResult.ok) {
        if (Number(testResult.delivery?.removed ?? 0) > 0) {
          await subscription.unsubscribe();
          setSubscriptionCount((count) => Math.max(0, count - 1));
        }
        setStatus("repair");
        setMessage(
          testResult.error ||
            "The device was saved, but delivery could not be confirmed."
        );
        return;
      }

      setStatus("active");
      setMessage(`${testResult.message} Watch for the FACKTS popup now.`);
    } catch (error) {
      setStatus("repair");
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage("");

    try {
      const registration = await notificationRegistration();
      const subscription = await registration.pushManager.getSubscription();

      const result = subscription
        ? await removeServerSubscription(subscription.endpoint)
        : { subscriptionCount: subscriptionCount };

      if (subscription) await subscription.unsubscribe();
      setStatus("ready");
      setSubscriptionCount(Number(result.subscriptionCount ?? 0));
      setMessage("Notifications are off on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestNotification() {
    setBusy(true);
    setMessage("Sending a real test to this account...");

    try {
      const registration = await notificationRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setStatus("repair");
        setMessage("This device is no longer connected. Select Repair Notifications.");
        return;
      }

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        if (Number(result.delivery?.removed ?? 0) > 0) {
          await subscription.unsubscribe();
          setSubscriptionCount((count) => Math.max(0, count - 1));
        }
        setStatus("repair");
        setMessage(result.error || "The test notification failed.");
        return;
      }

      setStatus("active");
      setMessage(`${result.message} Watch for the FACKTS popup now.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The test notification failed."
      );
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
    return (
      <span className="text-xs font-bold text-red-300">
        Notifications are blocked. Allow FACKTS in this browser&apos;s site
        settings and in your phone&apos;s notification settings.
      </span>
    );
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
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Connected subscriptions: {subscriptionCount}. Popup, vibration and
            sound depend on the phone&apos;s browser notification settings and
            silent mode.
          </p>
        </div>
      ) : null}

      <div className={`${compact ? "" : "mt-4"} flex flex-wrap gap-2`}>
        {status === "active" ? (
          <span
            className={`${compact ? "" : "flex-1"} rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-black text-emerald-200`}
          >
            Notifications Active
          </span>
        ) : (
          <button
            type="button"
            onClick={enableNotifications}
            disabled={busy}
            className={`${compact ? "" : "flex-1"} rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-60`}
          >
            {busy
              ? "Working..."
              : status === "repair"
                ? "Repair Notifications"
                : "Enable Notifications"}
          </button>
        )}

        {status === "active" ? (
          <button
            type="button"
            onClick={sendTestNotification}
            disabled={busy}
            className={`${compact ? "" : "flex-1"} rounded-2xl border border-orange-500/40 px-4 py-3 text-sm font-black text-orange-200 transition hover:bg-orange-500/10 disabled:opacity-60`}
          >
            Send Test Alert
          </button>
        ) : null}
      </div>

      {(status === "active" || status === "repair") && !compact ? (
        <button
          type="button"
          onClick={disableNotifications}
          disabled={busy}
          className="mt-3 text-xs font-bold text-slate-500 transition hover:text-red-300 disabled:opacity-60"
        >
          Turn notifications off on this device
        </button>
      ) : null}

      {message ? <p className={`${compact ? "w-full" : "mt-3"} text-xs text-slate-400`}>{message}</p> : null}
    </div>
  );
}
