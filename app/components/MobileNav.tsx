"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Home", href: "/", description: "Landing page" },
  { label: "Players", href: "/players", description: "Player profiles" },
  { label: "Games", href: "/games", description: "Fixtures and results" },
  {
    label: "Leaderboards",
    href: "/leaderboards",
    description: "Performance rankings",
  },
  { label: "1-on-1", href: "/one-on-one", description: "Player battles" },
  { label: "Contact", href: "/contact", description: "Bookings and partnerships" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (isAdminPage) return null;

  return (
    <>
      <div className="border-b border-slate-800 bg-slate-950/95 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-orange-500/30">
              <img
                src="/logos/fackts-hoops-logo.png"
                alt="FACKTS Hoops logo"
                className="h-full w-full object-contain p-1.5"
              />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">
                FACKTS
              </div>
              <div className="truncate text-base font-black text-white">
                Hoops
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-xl font-black text-orange-300 shadow-lg shadow-black/20"
          >
            ☰
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 z-10 h-full w-[84%] max-w-sm border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href="/" className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-orange-500/30">
                      <img
                        src="/logos/fackts-hoops-logo.png"
                        alt="FACKTS Hoops logo"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-orange-300">
                        FACKTS
                      </div>
                      <div className="truncate text-lg font-black text-white">
                        Hoops
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close navigation menu"
                    className="shrink-0 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-200 transition hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Player visibility, game records, media stories, and Kenyan
                  basketball culture.
                </p>
              </div>

              <nav className="flex-1 overflow-y-auto p-3">
                <div className="grid gap-2">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group rounded-2xl border px-3 py-3 transition ${
                          isActive
                            ? "border-orange-500/50 bg-orange-500 text-slate-950"
                            : "border-slate-800 bg-slate-900 text-white hover:border-orange-400/40 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={`text-base font-black ${
                                isActive ? "text-slate-950" : "text-white"
                              }`}
                            >
                              {item.label}
                            </div>

                            <div
                              className={`mt-0.5 text-[11px] ${
                                isActive ? "text-slate-800" : "text-slate-400"
                              }`}
                            >
                              {item.description}
                            </div>
                          </div>

                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                              isActive
                                ? "bg-slate-950 text-orange-300"
                                : "bg-slate-950 text-orange-300 ring-1 ring-slate-800 group-hover:bg-orange-500 group-hover:text-slate-950"
                            }`}
                          >
                            →
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              <div className="border-t border-slate-800 p-3">
                <Link
                  href="/contact"
                  className="block rounded-2xl bg-orange-500 px-4 py-2.5 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400"
                >
                  Partner With FACKTS
                </Link>

                <Link
                  href="/admin/login"
                  className="mt-2 block rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:border-orange-500/40 hover:text-orange-300"
                >
                  Admin Login
                </Link>

                <div className="mt-2 text-center text-[11px] text-slate-500">
                  FACKTS Hoops • Kenyan Basketball
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}