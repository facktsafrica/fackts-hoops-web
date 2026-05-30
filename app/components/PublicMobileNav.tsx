"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Players", href: "/players" },
  { label: "Guests", href: "/guest-hoopers" },
  { label: "Guest Leaders", href: "/guest-leaderboards" },
  { label: "Games", href: "/games" },
  { label: "Media", href: "/media" },
  { label: "Leaders", href: "/leaderboards" },
  { label: "1-on-1", href: "/one-on-one" },
  { label: "Partner", href: "/partner" },
  { label: "Player Application", href: "/player-application" },
  { label: "Book Coverage", href: "/book-coverage" },
  { label: "Contact", href: "/contact" },
];

export default function PublicMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-orange-500/40 bg-orange-500 px-5 py-3 text-sm font-black text-black shadow-2xl shadow-black/40"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur">
          <div className="absolute bottom-20 left-4 right-4 rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-4">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>
              <div className="mt-1 text-xl font-black text-white">
                Public Menu
              </div>
            </div>

            <div className="grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={
                    item.href === "/book-coverage"
                      ? "rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black"
                      : "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}