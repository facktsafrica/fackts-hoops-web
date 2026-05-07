"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicMobileNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    {
      label: "Home",
      href: "/",
      isAdmin: false,
    },
    {
      label: "Players",
      href: "/players",
      isAdmin: false,
    },
    {
      label: "Games",
      href: "/games",
      isAdmin: false,
    },
    {
      label: "Leaders",
      href: "/leaderboards",
      isAdmin: false,
    },
    {
      label: "1v1",
      href: "/one-on-one",
      isAdmin: false,
    },
    {
      label: "Admin",
      href: "/admin",
      isAdmin: true,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 px-2 py-2 text-white shadow-2xl shadow-black/40 backdrop-blur md:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
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
              className={`min-w-[74px] rounded-2xl border px-3 py-3 text-center text-[11px] font-semibold ${
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
    </nav>
  );
}