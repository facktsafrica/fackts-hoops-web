"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/", isAdmin: false },
    { label: "Players", href: "/players", isAdmin: false },
    { label: "Guests", href: "/guest-hoopers", isAdmin: false },
    { label: "Guest Leaders", href: "/guest-leaderboards", isAdmin: false },
    { label: "Games", href: "/games", isAdmin: false },
    { label: "Media", href: "/media", isAdmin: false },
    { label: "Leaders", href: "/leaderboards", isAdmin: false },
    { label: "1v1", href: "/one-on-one", isAdmin: false },
    { label: "Contact", href: "/contact", isAdmin: false },
    { label: "Admin", href: "/admin", isAdmin: true },
  ];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 767px) {
              body {
                padding-top: 74px;
              }
            }
          `,
        }}
      />

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/95 text-white shadow-xl shadow-black/30 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center gap-2"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_42%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/70 to-transparent" />

              <img
                src="/logos/fackts-hoops-logo.png"
                alt="FACKTS Hoops logo"
                className="relative z-10 h-full w-full object-contain p-1"
              />
            </div>

            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-black text-white">
                FACKTS Hoops
              </div>
              <div className="truncate text-[10px] text-slate-400">
                Basketball. Culture. Data.
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/40 bg-orange-500 text-xl font-black text-slate-950 shadow-[0_8px_24px_rgba(249,115,22,0.18)]"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>

        {open ? (
          <div className="absolute right-3 top-[64px] max-h-[calc(100vh-84px)] w-[min(92vw,340px)] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
                Menu
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                Move through FACKTS Hoops
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={item.isAdmin ? false : undefined}
                    onClick={() => setOpen(false)}
                    className={`rounded-2xl border px-2 py-3 text-center text-[11px] font-bold transition active:scale-95 ${
                      item.isAdmin
                        ? "border-orange-500/40 bg-orange-500 text-slate-950"
                        : isActive
                        ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                        : "border-slate-800 bg-slate-900 text-slate-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}