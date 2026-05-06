import Link from "next/link";

export default function AdminHomePage() {
  const cards = [
    {
      title: "Players",
      description: "Create, edit, activate, and feature players.",
      href: "/admin/players",
    },
    {
      title: "Games",
      description:
        "Create games, edit old games, upload posters, and mark upcoming games.",
      href: "/admin/games",
    },
    {
      title: "Rosters",
      description:
        "Choose confirmed players, starters, bench, pending, and unavailable players for each game.",
      href: "/admin/rosters",
    },
    {
      title: "Stats",
      description: "Manage player game stats and Player of the Game.",
      href: "/admin/stats",
    },
    {
      title: "Highlights",
      description: "Choose the Player of the Game shown on the homepage.",
      href: "/admin/highlights",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Dashboard
          </h1>

          <p className="mt-3 text-slate-400">
            Manage players, games, rosters, stats, and homepage highlights.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-xl hover:shadow-orange-950/10"
            >
              <div className="text-sm uppercase tracking-wide text-orange-300">
                Admin
              </div>

              <h2 className="mt-2 text-2xl font-bold">{card.title}</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {card.description}
              </p>

              <div className="mt-5 text-sm font-semibold text-orange-300">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}