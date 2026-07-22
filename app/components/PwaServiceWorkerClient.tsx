"use client";

import { useEffect } from "react";

export default function PwaServiceWorkerClient() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let reloading = false;
    let updateTimer: ReturnType<typeof setInterval> | undefined;

    const reloadForNewVersion = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        await registration?.update();
      } catch {
        // The current app remains usable if an update check is temporarily offline.
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadForNewVersion);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => {
        await registration.update();
        updateTimer = setInterval(() => {
          void registration.update();
        }, 15 * 60 * 1000);
      })
      .catch(() => undefined);

    window.addEventListener("online", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadForNewVersion);
      window.removeEventListener("online", checkForUpdate);
      if (updateTimer) clearInterval(updateTimer);
    };
  }, []);

  return null;
}
