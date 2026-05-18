import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const adminSections = [
  {
    title: "Players",
    description:
      "Create and manage FACKTS players, profiles, photos, roles, and player information.",
    href: "/admin/players",
    badge: "Roster",
  },
  {
    title: "Games",
    description:
      "Create fixtures, update scores, manage opponents, venues, match type, and game posters.",
    href: "/admin/games",
    badge: "Fixtures",
  },
  {
    title: "Player Game Stats",
    description:
      "Feed normal FACKTS player stats for games: points, rebounds, assists, steals, blocks, and more.",
    href: "/admin/stats",
    badge: "Stats",
  },
  {
    title: "Game Guest Rosters",
    description:
      "Add guest hoopers into a selected game as starters, bench, confirmed, pending, or unavailable.",
    href: "/admin/game-guests",
    badge: "Guests",
  },
  {
    title: "Guest Game Stats",
    description:
      "Feed game stats for guest hoopers: points, rebounds, assists, steals, blocks, 3PM and plus/minus.",
    href: "/admin/guest-game-stats",
    badge: "Guest Stats",
    highlight: true,
  },
  {
    title: "Guest 1v1 Stats",
    description:
      "Feed 1v1 match results for guest hoopers so guest 1v1 wins and match leaderboards update.",
    href: "/admin/guest-one-on-one-stats",
    badge: "Guest 1v1",
    highlight: true,
  },
  {
    title: "Guest Hoopers",
    description:
      "Create and manage guest hoopers, visiting players, community ballers, and special guests.",
    href: "/admin/guest-hoopers",
    badge: "Guest Profiles",
  },
  {
    title: "Media Stories",
    description:
      "Manage videos, media stories, thumbnails, featured story, Court Takeover, and behind-the-scenes content.",
    href: "/admin/media-stories",
    badge: "Media",
  },
  {
    title: "Public Guest Leaders",
    description:
      "View the public guest leaderboard page and confirm guest stats are feeding correctly.",
    href: "/guest-leaderboards",
    badge: "Public",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Admin
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              Admin Dashboard
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
              Manage players, games, rosters, guest hoopers, guest stats, media
              stories, and public platform content.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Home
          </Link>
        </div>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-orange-500/40 bg-orange-500/10 p-5 shadow-xl shadow-orange-950/20">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Priority
            </div>

            <h2 className="mt-1 text-2xl font-black">Feed Guest Game Stats</h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Use this when a guest hooper has played in a full game and you
              need to enter their box-score stats.
            </p>

            <Link
              href="/admin/guest-game-stats"
              className="mt-4 inline-flex rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
            >
              Open Guest Game Stats
            </Link>
          </div>

          <div className="rounded-3xl border border-orange-500/40 bg-orange-500/10 p-5 shadow-xl shadow-orange-950/20">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Priority
            </div>

            <h2 className="mt-1 text-2xl font-black">Feed Guest 1v1 Stats</h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Use this when a guest hooper plays a 1v1 battle and you need to
              record their result.
            </p>

            <Link
              href="/admin/guest-one-on-one-stats"
              className="mt-4 inline-flex rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
            >
              Open Guest 1v1 Stats
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`group rounded-3xl border p-5 transition hover:-translate-y-1 ${
                section.highlight
                  ? "border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/15"
                  : "border-slate-800 bg-slate-900 hover:border-orange-400/40 hover:bg-slate-900/90"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-orange-300 ring-1 ring-slate-800">
                  {section.badge}
                </div>

                {section.highlight ? (
                  <div className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
                    Important
                  </div>
                ) : null}
              </div>

              <h2 className="mt-4 text-xl font-black group-hover:text-orange-300">
                {section.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {section.description}
              </p>

              <div className="mt-5 text-sm font-black text-orange-300">
                Open
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}