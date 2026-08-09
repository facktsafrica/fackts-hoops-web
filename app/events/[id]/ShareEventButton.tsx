"use client";

import { useState } from "react";

export default function ShareEventButton({ title }: { title: string }) {
  const [label, setLabel] = useState("Share event");

  async function share() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, text: `View ${title} on FACKTS Hoops.`, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setLabel("Link copied");
      window.setTimeout(() => setLabel("Share event"), 1800);
    } catch {
      setLabel("Share event");
    }
  }

  return (
    <button type="button" onClick={share} className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white backdrop-blur transition hover:border-orange-400/60 sm:w-auto">
      {label}
    </button>
  );
}
