import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FACKTS Hoops",
  description: "FACKTS Hoops player profiles, game stats, and basketball visibility platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">
        <div className="min-h-screen bg-slate-950 text-white">
          <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-slate-900 shadow-lg shadow-orange-950/20">
                  <span className="text-lg font-black text-orange-400">F</span>
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                    FACKTS Hoops
                  </div>
                  <div className="text-xs text-slate-400">
                    Basketball data • culture • visibility
                  </div>
                </div>
              </Link>

              <nav className="hidden items-center gap-3 md:flex">
                <Link
                  href="/#players"
                  className="rounded-2xl px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Players
                </Link>
                <Link
                  href="/#games"
                  className="rounded-2xl px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Games
                </Link>
                <Link
                  href="/admin"
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Admin
                </Link>
              </nav>
            </div>
          </header>

          <div>{children}</div>

          <footer className="border-t border-slate-800 bg-slate-950">
            <div className="mx-auto max-w-7xl px-6 py-10">
              <div className="grid gap-8 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-500/30 bg-slate-900">
                      <span className="text-base font-black text-orange-400">F</span>
                    </div>
                    <div>
                      <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                        FACKTS Hoops
                      </div>
                      <div className="text-xs text-slate-400">
                        Where basketball stories get structure.
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                    Built to track players, games, and performance while giving FACKTS a stronger
                    public basketball identity.
                  </p>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Explore
                  </div>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    <Link href="/#players" className="text-slate-400 hover:text-white">
                      Players
                    </Link>
                    <Link href="/#games" className="text-slate-400 hover:text-white">
                      Games
                    </Link>
                    <Link href="/admin" className="text-slate-400 hover:text-white">
                      Admin
                    </Link>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Brand Direction
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    FACKTS is built around basketball, culture, media, and youth visibility — a
                    broader platform direction also reflected in your planning documents. :contentReference[oaicite:0]{index=0}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-800 pt-5 text-xs text-slate-500">
                © FACKTS Hoops. Built for FACKTS basketball operations and public visibility.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}