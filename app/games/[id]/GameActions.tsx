"use client";

import Link from "next/link";
import { useState } from "react";

export default function GameActions({ gameId, title }: { gameId: string; title: string }) {
  const [shareLabel, setShareLabel] = useState("Share game");

  async function share() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, text: `View the ${title} match centre on FACKTS Hoops.`, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied");
      window.setTimeout(() => setShareLabel("Share game"), 1800);
    } catch {
      setShareLabel("Share game");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className="rounded-xl border border-white/15 bg-black/35 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white backdrop-blur transition hover:border-orange-400/60">
        {shareLabel}
      </button>
      <Link href={`/games/${gameId}/report`} className="rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black transition hover:bg-orange-400">
        Open game report
      </Link>
    </div>
  );
}
