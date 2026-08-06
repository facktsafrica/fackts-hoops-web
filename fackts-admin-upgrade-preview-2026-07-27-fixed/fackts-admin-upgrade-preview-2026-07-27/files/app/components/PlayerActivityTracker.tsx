"use client";

import { useEffect } from "react";

export default function PlayerActivityTracker() {
  useEffect(() => {
    const key = "fackts-player-portal-open-recorded";
    const lastRecorded = Number(sessionStorage.getItem(key) || 0);

    if (Date.now() - lastRecorded < 5 * 60 * 1000) return;

    sessionStorage.setItem(key, String(Date.now()));
    void fetch("/api/player-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "portal_opened" }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
