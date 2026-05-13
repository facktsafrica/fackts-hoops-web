"use client";

import { useState } from "react";

export default function CopyRosterButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      setCopied(false);
      alert("Copy failed. Please open the roster and copy manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={copyText}
      className="rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-800"
    >
      {copied ? "Copied. Paste Anywhere" : "Copy Roster Text"}
    </button>
  );
}