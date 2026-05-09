"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TickerAnnouncement = {
  id: string;
  message: string;
  display_order: number;
  is_active: boolean;
};

const fallbackItems = [
  "FACKTS LIVE",
  "CEO Match Loading",
  "Game 2 vs ACK Baptist",
  "On Their Turf",
  "Liam Still Unbeaten",
  "Beyond Injury Out Now",
];

export default function FacktsTicker() {
  const pathname = usePathname();
  const [items, setItems] = useState<string[]>(fallbackItems);

  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    async function loadTicker() {
      const { data, error } = await supabase
        .from("ticker_announcements")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error.message);
        setItems(fallbackItems);
        return;
      }

      const messages = ((data ?? []) as TickerAnnouncement[])
        .map((item) => item.message)
        .filter(Boolean);

      setItems(messages.length > 0 ? messages : fallbackItems);
    }

    if (!isAdminPage) {
      loadTicker();
    }
  }, [isAdminPage]);

  if (isAdminPage) {
    return null;
  }

  const repeatedItems = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden border-b border-orange-500/20 bg-slate-950/95 text-white shadow-lg shadow-black/20 backdrop-blur">
      <div className="relative flex h-10 items-center">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-slate-950 to-transparent" />

        <div className="fackts-ticker-track flex min-w-max items-center gap-4 whitespace-nowrap">
          {repeatedItems.map((item, index) => {
            const isLive = item.toUpperCase() === "FACKTS LIVE";

            return (
              <div
                key={`${item}-${index}`}
                className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300"
              >
                <span
                  className={
                    isLive
                      ? "rounded-full bg-orange-500 px-3 py-1 text-slate-950"
                      : "text-slate-300"
                  }
                >
                  {item}
                </span>

                <span className="text-orange-400">•</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}