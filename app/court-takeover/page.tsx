import Link from "next/link";

const portalCards = [
  {
    title: "Games",
    href: "/games",
    label: "Fixtures & Results",
    description:
      "Track Court Takeover matchups, scores, venues, and completed games.",
  },
  {
    title: "1-on-1 Battles",
    href: "/one-on-one",
    label: "Battle System",
    description:
      "Follow player face-offs, battle records, winners, and matchup stories.",
  },
  {
    title: "Leaderboards",
    href: "/leaderboards",
    label: "Rankings",
    description:
      "See who is leading the FACKTS competition table and performance charts.",
  },
  {
    title: "Guest Hoopers",
    href: "/guest-hoopers",
    label: "External Ballers",
    description:
      "Separate guest hoopers from official FACKTS players while keeping their battle history visible.",
  },
  {
    title: "Guest Leaders",
    href: "/guest-leaderboards",
    label: "Guest Rankings",
    description:
      "Track guest hooper performance across games, battles, and covered events.",
  },
  {
    title: "Rosters",
    href: "/rosters",
    label: "Game Squads",
    description:
      "View team sheets, selected players, guests, and game-day rosters.",
  },
];

const principles = [
  "Official FACKTS players stay on the main Players page.",
  "Guest hoopers live inside the competition portal.",
  "Games, battles, rankings, and rosters stay together here.",
  "Events and merch remain front-facing commercial pillars.",
];

export default function CourtTakeoverPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-orange-300">
              FACKTS Competition Portal
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-white md:text-7xl">
              Court Takeover
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-xl">
              This is the competition side of FACKTS Hoops. Games, 1-on-1
              battles, leaderboards, guest hoopers, rosters, and stats live
              here so the main site stays clean.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/one-on-one"
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400"
              >
                View 1-on-1 Battles
              </Link>

              <Link
                href="/games"
                className="rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                View Games
              </Link>

              <Link
                href="/guest-hoopers"
                className="rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                Guest Hoopers
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {portalCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-5 transition hover:-translate-y-1 hover:border-orange-400/70 hover:bg-slate-900"
            >
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                {card.label}
              </div>

              <h2 className="mt-3 text-2xl font-black text-white group-hover:text-orange-300">
                {card.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {card.description}
              </p>

              <div className="mt-5 text-sm font-black text-orange-300">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Portal Rules
          </div>

          <h2 className="mt-3 text-3xl font-black text-white">
            Clean separation, no more confusion.
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {principles.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold leading-6 text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}