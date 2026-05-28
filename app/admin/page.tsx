import Link from "next/link";
import AdminLogoutButton from "@/app/components/AdminLogoutButton";

type AdminCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  important?: boolean;
};

const adminCards: AdminCard[] = [
  {
    eyebrow: "Roster",
    title: "Players",
    description: "Create and manage FACKTS players, profiles, photos, roles, and player information.",
    href: "/admin/players",
  },
  {
    eyebrow: "Fixtures",
    title: "Games",
    description: "Create fixtures, update scores, manage opponents, venues, posters, and game videos.",
    href: "/admin/games",
  },
  {
    eyebrow: "Stats",
    title: "Player Game Stats",
    description: "Feed normal FACKTS player stats for games: points, rebounds, assists, steals, blocks, and more.",
    href: "/admin/stats",
  },
  {
    eyebrow: "Guest Rosters",
    title: "Game Guest Rosters",
    description: "Add guest hoopers into selected games as starters, bench, confirmed, pending, or unavailable.",
    href: "/admin/game-guests",
  },
  {
    eyebrow: "Guest Stats",
    title: "Guest Game Stats",
    description: "Feed game stats for guest hoopers: points, rebounds, assists, steals, blocks, 3PM and plus/minus.",
    href: "/admin/guest-game-stats",
    important: true,
  },
  {
    eyebrow: "Guest 1v1",
    title: "Guest 1v1 Stats",
    description: "Feed 1v1 match results for guest hoopers so guest 1v1 wins and match leaderboards update.",
    href: "/admin/guest-one-on-one-stats",
    important: true,
  },
  {
    eyebrow: "Guest Profiles",
    title: "Guest Hoopers",
    description: "Create and manage guest hoopers, visiting players, community ballers, and special guests.",
    href: "/admin/guest-hoopers",
  },
  {
    eyebrow: "Media",
    title: "Media Stories",
    description: "Manage videos, media stories, thumbnails, featured story, Court Takeover, and behind-the-scenes content.",
    href: "/admin/media-stories",
  },
  {
    eyebrow: "Public",
    title: "Public Guest Leaders",
    description: "View the public guest leaderboard page and confirm guest stats are reading correctly.",
    href: "/guest-leaderboards",
  },
  {
    eyebrow: "1-on-1",
    title: "Public 1-on-1 Page",
    description: "View 1-on-1 battles, upcoming matchups, results, videos, and guest 1-on-1 leaderboards.",
    href: "/one-on-one",
  },
  {
    eyebrow: "Public",
    title: "Public Games Page",
    description: "View public fixtures, awaiting results, completed games, and game video pages.",
    href: "/games",
  },
  {
    eyebrow: "Home",
    title: "Return to Public Site",
    description: "Go back to the public FACKTS Hoops homepage.",
    href: "/",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Admin
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Manage players, games, rosters, guest hoopers, guest stats, media stories, and public platform content.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
            >
              Home
            </Link>

            <Link
              href="/admin/login"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
            >
              Login
            </Link>

            <AdminLogoutButton />
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <PriorityCard
            eyebrow="Priority"
            title="Feed Guest Game Stats"
            description="Use this when a guest hooper has played in a full game and you need to enter their box-score stats."
            href="/admin/guest-game-stats"
            buttonText="Open Guest Game Stats"
          />

          <PriorityCard
            eyebrow="Priority"
            title="Feed Guest 1v1 Stats"
            description="Use this when a guest hooper has played in a 1v1 battle and you need to record their result."
            href="/admin/guest-one-on-one-stats"
            buttonText="Open Guest 1v1 Stats"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={
                card.important
                  ? "group rounded-3xl border border-orange-500/50 bg-orange-500/10 p-5 transition hover:-translate-y-1 hover:bg-orange-500/15"
                  : "group rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-orange-500/40 hover:bg-slate-900/80"
              }
            >
              <div className="mb-4">
                <span
                  className={
                    card.important
                      ? "rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black"
                      : "rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-orange-300"
                  }
                >
                  {card.eyebrow}
                </span>
              </div>

              <h2 className="text-xl font-black text-white">{card.title}</h2>

              <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-400">
                {card.description}
              </p>

              <div className="mt-5 text-sm font-black text-orange-300 transition group-hover:text-orange-200">
                Open
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function PriorityCard({
  eyebrow,
  title,
  description,
  href,
  buttonText,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="rounded-3xl border border-orange-500/50 bg-gradient-to-br from-slate-900 to-orange-950/30 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
        {eyebrow}
      </div>

      <h2 className="mt-2 text-2xl font-black">{title}</h2>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        {description}
      </p>

      <Link
        href={href}
        className="mt-5 inline-flex rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
      >
        {buttonText}
      </Link>
    </div>
  );
}