"use client";

import { useState } from "react";

export default function ProfileActions({ name }: { name: string }) {
  const [label, setLabel] = useState("Share profile");

  async function shareProfile() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name} | FACKTS Hoops`,
          text: `View ${name}'s basketball profile on FACKTS Hoops.`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setLabel("Link copied");
      window.setTimeout(() => setLabel("Share profile"), 1800);
    } catch {
      setLabel("Share profile");
    }
  }

  return (
    <button
      type="button"
      onClick={shareProfile}
      className="rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black transition hover:bg-orange-400"
    >
      {label}
    </button>
  );
}
