import Link from "next/link";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Players", href: "/players" },
  { label: "Guests", href: "/guest-hoopers" },
  { label: "Guest Leaders", href: "/guest-leaderboards" },
  { label: "Games", href: "/games" },
  { label: "Media", href: "/media" },
  { label: "Leaders", href: "/leaderboards" },
  { label: "1-on-1", href: "/one-on-one" },
  { label: "Contact", href: "/contact" },
];

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <img
              src="/favicon.ico"
              alt="FACKTS Hoops"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <div className="text-xl font-black leading-tight text-white">
              FACKTS Hoops
            </div>
            <div className="text-xs text-slate-400">
              Basketball. Culture. Data.
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-orange-500 hover:text-black"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/book-coverage"
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
          >
            Book Coverage
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/book-coverage"
            className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-400"
          >
            Book
          </Link>
        </div>
      </div>
    </header>
  );
}