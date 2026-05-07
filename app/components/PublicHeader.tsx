import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 hidden border-b border-slate-800 bg-slate-950/95 text-white shadow-lg shadow-black/20 backdrop-blur md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black text-slate-950">
            F
          </div>

          <div>
            <div className="text-sm font-black tracking-wide">
              FACKTS Hoops
            </div>
            <div className="text-xs text-slate-400">
              Basketball. Culture. Data.
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/"
            className="rounded-2xl px-4 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-orange-300"
          >
            Home
          </Link>

          <Link
            href="/players"
            className="rounded-2xl px-4 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-orange-300"
          >
            Players
          </Link>

          <Link
            href="/games"
            className="rounded-2xl px-4 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-orange-300"
          >
            Games
          </Link>

          <Link
            href="/leaderboards"
            className="rounded-2xl px-4 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-orange-300"
          >
            Leaderboards
          </Link>

          <Link
            href="/one-on-one"
            className="rounded-2xl px-4 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-orange-300"
          >
            1-on-1
          </Link>

          <Link
            href="/contact"
            className="rounded-2xl px-4 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-orange-300"
          >
            Contact
          </Link>

          <Link
            href="/admin"
            prefetch={false}
            className="ml-2 rounded-2xl bg-orange-500 px-4 py-2 font-bold text-slate-950 transition hover:bg-orange-400"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}