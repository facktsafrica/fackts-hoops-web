import Link from "next/link";

const adminSections = [
  {
    title: "Ticker / Site Notice",
    description:
      "Edit the scrolling ticker, announcements, homepage notices, and live updates.",
    href: "/admin/ticker",
    tag: "Ticker",
  },
  {
    title: "Players",
    description: "Add, edit, activate, feature, and manage FACKTS players.",
    href: "/admin/players",
    tag: "Team",
  },
  {
    title: "Player Applications",
    description:
      "Review public applications, upload player photos, approve or reject players.",
    href: "/admin/player-applications",
    tag: "Applications",
  },
  {
    title: "Games",
    description: "Create games, manage fixtures, scores, posters, and videos.",
    href: "/admin/games",
    tag: "Matches",
  },
  {
    title: "Player Stats",
    description:
      "Feed and update official FACKTS player statistics after games.",
    href: "/admin/stats",
    tag: "Stats",
  },
  {
    title: "Guest Hoopers",
    description: "Manage guest players for games and events.",
    href: "/admin/guest-hoopers",
    tag: "Guests",
  },
  {
    title: "Game Guests",
    description:
      "Attach guest hoopers to specific games before feeding guest stats.",
    href: "/admin/game-guests",
    tag: "Guests",
  },
  {
    title: "Guest Game Stats",
    description: "Add stats for guest players after games.",
    href: "/admin/guest-game-stats",
    tag: "Stats",
  },
  {
    title: "One-on-One",
    description: "Manage 1v1 matchups, results, videos, and leaderboards.",
    href: "/admin/one-on-one",
    tag: "1v1",
  },
  {
    title: "Guest One-on-One Stats",
    description: "Manage 1v1 stats for guest hoopers.",
    href: "/admin/guest-one-on-one-stats",
    tag: "1v1",
  },
  {
    title: "Rosters",
    description: "Manage team rosters and player groupings.",
    href: "/admin/rosters",
    tag: "Roster",
  },
  {
    title: "Roster Announcements",
    description: "Create and manage roster announcement content.",
    href: "/admin/roster-announcements",
    tag: "Media",
  },
  {
    title: "Match Previews",
    description: "Create and manage match previews before games.",
    href: "/admin/match-previews",
    tag: "Media",
  },
  {
    title: "Media Stories",
    description: "Create and manage media stories and editorial posts.",
    href: "/admin/media-stories",
    tag: "Media",
  },
  {
    title: "Highlights",
    description: "Manage highlights, clips, and featured game moments.",
    href: "/admin/highlights",
    tag: "Media",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">
              FACKTS Hoops Admin
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Admin Dashboard
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Manage players, applications, games, stats, guests, rosters,
              ticker, media, and one-on-one battles from one place.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
          >
            View Public Site
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-3xl border border-white/10 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-orange-400/70 hover:bg-slate-900/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                    {section.tag}
                  </span>

                  <h2 className="mt-4 text-2xl font-black text-white">
                    {section.title}
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm font-black text-slate-300 transition group-hover:border-orange-400/60 group-hover:text-orange-300">
                  Open
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}