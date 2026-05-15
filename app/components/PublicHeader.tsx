"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Players", href: "/players" },
    { label: "Games", href: "/games" },
    { label: "Media", href: "/media" },
    { label: "Leaders", href: "/leaderboards" },
    { label: "1-on-1", href: "/one-on-one" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 hidden border-b border-slate-800 bg-slate-950/95 text-white shadow-lg shadow-black/20 backdrop-blur md:block">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/5 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-[0_12px_34px_rgba(249,115,22,0.18)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_42%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/70 to-transparent" />

              <img
                src="/logos/fackts-hoops-logo.png"
                alt="FACKTS Hoops logo"
                className="relative z-10 h-full w-full object-contain p-1.5"
              />
            </div>

            <div className="leading-tight">
              <div className="text-lg font-black tracking-tight text-white">
                FACKTS Hoops
              </div>
              <div className="text-xs text-slate-400">
                Basketball. Culture. Data.
              </div>
            </div>
          </Link>

          <nav className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm font-semibold">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-2xl px-3 py-2 transition ${
                    isActive
                      ? "bg-orange-500 text-slate-950 shadow-[0_6px_18px_rgba(249,115,22,0.25)]"
                      : "text-slate-300 hover:bg-slate-900 hover:text-orange-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/admin"
              prefetch={false}
              className="whitespace-nowrap rounded-2xl border border-orange-500/40 bg-orange-500 px-3 py-2 font-bold text-slate-950 transition hover:bg-orange-400"
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}