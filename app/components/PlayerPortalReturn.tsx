"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PLAYER_DESTINATIONS = [
  "/calendar",
  "/games",
  "/leaderboards",
  "/one-on-one",
  "/players",
];

export default function PlayerPortalReturn() {
  const pathname = usePathname();
  const [hasPlayerSession, setHasPlayerSession] = useState(false);

  const isDestination = PLAYER_DESTINATIONS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    let active = true;

    async function checkPlayerSession() {
      if (!isDestination) {
        setHasPlayerSession(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) {
        if (active) setHasPlayerSession(false);
        return;
      }

      const { data: player } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .eq("player_type", "official_fackts")
        .maybeSingle();

      if (active) setHasPlayerSession(Boolean(player));
    }

    checkPlayerSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkPlayerSession();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isDestination]);

  if (!isDestination || !hasPlayerSession) return null;

  return (
    <Link
      href="/player"
      className="fixed bottom-5 left-4 z-[85] inline-flex items-center gap-2 rounded-full border border-orange-400/50 bg-slate-950/95 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-orange-200 shadow-2xl shadow-black/50 backdrop-blur transition hover:-translate-y-1 hover:bg-orange-500 hover:text-black sm:bottom-6 sm:left-6 sm:text-sm"
      aria-label="Back to Player Portal"
    >
      <span aria-hidden="true">←</span>
      Player Portal
    </Link>
  );
}
