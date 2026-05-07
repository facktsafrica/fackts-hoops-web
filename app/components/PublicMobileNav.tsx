import Link from "next/link";

export default function PublicMobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 px-3 py-2 text-white shadow-2xl shadow-black/40 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-semibold">
        <Link
          href="/"
          className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-3 text-slate-200 active:bg-orange-500 active:text-slate-950"
        >
          Home
        </Link>

        <Link
          href="/players"
          className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-3 text-slate-200 active:bg-orange-500 active:text-slate-950"
        >
          Players
        </Link>

        <Link
          href="/games"
          className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-3 text-slate-200 active:bg-orange-500 active:text-slate-950"
        >
          Games
        </Link>

        <Link
          href="/contact"
          className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-3 text-slate-200 active:bg-orange-500 active:text-slate-950"
        >
          Contact
        </Link>

        <Link
          href="/admin"
          prefetch={false}
          className="rounded-2xl border border-orange-500/40 bg-orange-500 px-2 py-3 font-bold text-slate-950 active:bg-orange-400"
        >
          Admin
        </Link>
      </div>
    </nav>
  );
}