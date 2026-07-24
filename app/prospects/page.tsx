import Link from "next/link";

const prospectTypes = [
  {
    title: "Applicant Prospects",
    label: "Applied",
    description:
      "Hoopers who submit the player application and are waiting for review.",
  },
  {
    title: "Scouted Prospects",
    label: "Scouted",
    description:
      "Players noticed through games, community runs, school games, or recommendations.",
  },
  {
    title: "Guest-to-Roster Watch",
    label: "Watchlist",
    description:
      "Guest hoopers who perform well and may be considered for deeper FACKTS involvement.",
  },
  {
    title: "Development Prospects",
    label: "Growth",
    description:
      "Young or emerging hoopers who need exposure, structure, training, and consistency.",
  },
];

const rules = [
  "Prospects are not official FACKTS players yet.",
  "Guest hoopers are external players who have appeared in games or battles.",
  "Official players stay on the main Players page.",
  "Court Takeover can include official players, guests, and prospects, but each must be labelled clearly.",
];

export default function ProspectsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
              FACKTS Talent Pipeline
            </div>

            <h1 className="mt-5 text-4xl font-black uppercase tracking-tight md:text-6xl">
              Prospects
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
              Prospects are hoopers in the FACKTS pipeline. They are not
              official roster players yet, and they are not automatically guest
              hoopers. This page separates upcoming talent from the official
              roster and external guest hoopers.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/player-application"
                className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
              >
                Apply as Player
              </Link>

              <Link
                href="/players"
                className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Official Players
              </Link>

              <Link
                href="/guest-hoopers"
                className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Guest Hoopers
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {prospectTypes.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20"
            >
              <div className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                {item.label}
              </div>

              <h2 className="mt-4 text-xl font-black text-white">
                {item.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Classification Rules
          </div>

          <h2 className="mt-3 text-3xl font-black">
            No more mixing people up.
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {rules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold leading-6 text-slate-300"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}