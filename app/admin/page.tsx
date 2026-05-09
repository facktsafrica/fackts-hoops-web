import Link from "next/link";
import AdminLogoutButton from "../components/AdminLogoutButton";

const adminSections = [
  {
    title: "Players",
    description:
      "Add and manage player profiles, photos, positions, roles, and jersey numbers.",
    href: "/admin/players",
    tag: "Roster",
  },
  {
    title: "Games",
    description:
      "Add fixtures, results, venues, scores, posters, and upcoming games.",
    href: "/admin/games",
    tag: "Fixtures",
  },
  {
    title: "Stats",
    description:
      "Enter player game stats, box score data, and performance records.",
    href: "/admin/stats",
    tag: "Data",
  },
  {
    title: "Leaderboards",
    description:
      "View public rankings driven by points, rebounds, assists, steals, blocks, and averages.",
    href: "/leaderboards",
    tag: "Public",
  },
  {
    title: "1-on-1 Battles",
    description:
      "Manage 1-on-1 player battles, challengers, results, and community matchups.",
    href: "/admin/one-on-one",
    tag: "Battles",
  },
  {
    title: "Guest Hoopers",
    description:
      "Manage visiting players, guest hoopers, and community talent.",
    href: "/admin/guest-hoopers",
    tag: "Community",
  },
  {
    title: "Game Guests",
    description:
      "Manage guest lists, game attendance, and event participation records.",
    href: "/admin/game-guests",
    tag: "Attendance",
  },
  {
    title: "Rosters",
    description:
      "Manage game rosters, lineups, and player availability.",
    href: "/admin/rosters",
    tag: "Lineups",
  },
  {
    title: "Highlights",
    description:
      "Manage highlight links, game clips, and media references.",
    href: "/admin/highlights",
    tag: "Media",
  },
  {
    title: "Media Stories",
    description:
      "Manage homepage videos, interviews, documentaries, playlists, and thumbnails.",
    href: "/admin/media-stories",
    tag: "Stories",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                Dashboard
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
                Manage players, games, stats, media stories, rosters, guests,
                and public platform content from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Back Home
              </Link>

              <AdminLogoutButton />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:bg-slate-900/90 hover:shadow-orange-950/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="w-fit rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-300">
                    {section.tag}
                  </div>

                  <h2 className="mt-3 text-xl font-black text-white group-hover:text-orange-300">
                    {section.title}
                  </h2>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-orange-300 ring-1 ring-slate-800 transition group-hover:bg-orange-500 group-hover:text-slate-950">
                  →
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}