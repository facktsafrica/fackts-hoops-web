import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-black tracking-tight md:text-2xl">
              Dashboard
            </h1>

            <Link
              href="/"
              className="shrink-0 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-500 hover:text-slate-950 md:text-sm"
            >
              Public Home
            </Link>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}