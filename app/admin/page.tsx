import Link from "next/link";

export default function AdminHomePage() {
  const cards = [
    {
      title: "Players",
      description: "Create, edit, activate, and feature FACKTS players.",
      href: "/admin/players",
    },
    {
      title: "Guest Hoopers",
      description:
        "Create and manage guest hoopers, challengers, and visiting ballers.",
      href: "/admin/guest-hoopers",
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
        "Choose confirmed FACKTS players, starters, bench, pending, and unavailable players for each game.",
      href: "/admin/rosters",
    },
    {
      title: "Game Guests",
      description:
        "Add guest hoopers to normal games and manage their roster status.",
      href: "/admin/game-guests",
    },
    {
      title: "Stats",
      description:
        "Enter player game stats, 3PM, steals, blocks, and Player of the Game.",
      href: "/admin/stats",
    },
    {
      title: "Highlights",
      description:
        "Choose the Player of the Game shown on the homepage.",
      href: "/admin/highlights",
    },
    {
      title: "1-on-1",
      description:
        "Create and edit 1-on-1 matchups, posters, scores, guests, and results.",
      href: "/admin/one-on-one",
    },
    {
      title: "Leaderboards",
      description:
        "Review public leaderboard data generated from player stats and performances.",
      href: "/leaderboards",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Manage FACKTS players, guest hoopers, games, rosters, guest game
            appearances, stats, highlights, leaderboards, and 1-on-1 matchups.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              prefetch={card.href.startsWith("/admin") ? false : undefined}
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