import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Contact & Links
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Reach FACKTS for partnerships, player visibility, basketball media, and content opportunities.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-sm uppercase tracking-wide text-orange-300">Contact</div>
            <h2 className="mt-2 text-2xl font-bold">Talk to us</h2>

            <div className="mt-6 space-y-4 text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                <div className="mt-1">facktsafrica@gmail.com</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Phone</div>
                <div className="mt-1">+254 711 468 303</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Location</div>
                <div className="mt-1">Westlands, Nairobi, Kenya</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Instagram</div>
                <div className="mt-1">@facktsafricagroup</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-sm uppercase tracking-wide text-orange-300">Platform Links</div>
            <h2 className="mt-2 text-2xl font-bold">Where to find us</h2>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
              >
                YouTube
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
              >
                Instagram
              </a>

              <Link
                href="/players"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
              >
                Explore Players
              </Link>

              <Link
                href="/games"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
              >
                Explore Games
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}