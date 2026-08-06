import Link from "next/link";
import AdminLogoutButton from "@/app/components/AdminLogoutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminCard = {
  title: string;
  description: string;
  href: string;
  badge: string;
  featured?: boolean;
};

const coreCards: AdminCard[] = [
  {
    title: "Ticker / Site Notice",
    description: "Control the notice bar and important site-wide announcements.",
    href: "/admin/ticker",
    badge: "Site",
  },
  {
    title: "Players",
    description: "Add, edit, update, and manage active FACKTS player profiles.",
    href: "/admin/players",
    badge: "Roster",
    featured: true,
  },
  {
    title: "Player Applications",
    description:
      "Review incoming applications and approve hoopers into the correct category.",
    href: "/admin/player-applications",
    badge: "Applications",
    featured: true,
  },
  {
    title: "Player Accounts",
    description:
      "Invite official players, resend secure access links, and revoke player portal access.",
    href: "/admin/player-access",
    badge: "Access",
    featured: true,
  },
  {
    title: "Games",
    description: "Add fixtures, results, posters, scores, videos, and game notes.",
    href: "/admin/games",
    badge: "Games",
    featured: true,
  },
  {
    title: "Player Stats",
    description: "Record player box scores, game stats, and performance numbers.",
    href: "/admin/stats",
    badge: "Stats",
  },
];

const eventCards: AdminCard[] = [
  {
    title: "Calendar / Events",
    description:
      "Add and edit event cards, dates, venues, formats, posters, and featured events.",
    href: "/admin/calendar",
    badge: "Events",
    featured: true,
  },
  {
    title: "1-on-1 Battles",
    description:
      "Manage face-offs, matchup cards, scores, videos, and battle results.",
    href: "/admin/one-on-one",
    badge: "1v1",
    featured: true,
  },
  {
    title: "Match Previews",
    description: "Build matchup stories, preview notes, and pre-game narratives.",
    href: "/admin/match-previews",
    badge: "Preview",
  },
  {
    title: "Highlights",
    description:
      "Manage highlight links, media items, video references, and featured clips.",
    href: "/admin/highlights",
    badge: "Media",
  },
  {
    title: "Media Stories",
    description:
      "Add FACKTS stories, content pieces, and media-driven coverage moments.",
    href: "/admin/media-stories",
    badge: "Stories",
  },
];

const guestCards: AdminCard[] = [
  {
    title: "Guest Hoopers",
    description:
      "Manage guest hoopers, external players, visiting players, and profiles.",
    href: "/admin/guest-hoopers",
    badge: "Guests",
    featured: true,
  },
  {
    title: "Game Guests",
    description: "Add guest players linked to specific games and events.",
    href: "/admin/game-guests",
    badge: "Guests",
  },
  {
    title: "Guest Game Stats",
    description: "Record stats for guest hoopers who participate in FACKTS games.",
    href: "/admin/guest-game-stats",
    badge: "Stats",
  },
  {
    title: "Guest 1-on-1 Stats",
    description:
      "Manage guest and external hooper 1v1 results, scores, and matchup data.",
    href: "/admin/guest-one-on-one-stats",
    badge: "1v1",
  },
];

const rosterCards: AdminCard[] = [
  {
    title: "Rosters",
    description: "Create and manage game rosters, player selections, and lineups.",
    href: "/admin/rosters",
    badge: "Roster",
  },
  {
    title: "Roster Announcements",
    description: "Prepare roster announcements and public lineup messaging.",
    href: "/admin/roster-announcements",
    badge: "Announcements",
  },
];

const businessCards: AdminCard[] = [
  {
    title: "App Notifications",
    description:
      "See alerts, enable device push, and send announcements to active player accounts.",
    href: "/admin/notifications",
    badge: "Push",
    featured: true,
  },
  {
    title: "Partners",
    description:
      "Add and edit FACKTS partners, sponsors, collaborators, institutions, and business partners.",
    href: "/admin/partners",
    badge: "Partners",
    featured: true,
  },
  {
    title: "Email Notifications",
    description:
      "Check the approved Resend sender and send a live notification test.",
    href: "/admin/email",
    badge: "Email",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-black/30">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Admin
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Control Room
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                Manage players, games, events, face-offs, guests, rosters,
                highlights, partners, and the public FACKTS platform from one
                dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              >
                View Site
              </Link>

              <AdminLogoutButton />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat label="Core Tools" value={coreCards.length} />
            <AdminStat label="Events & Media" value={eventCards.length} />
            <AdminStat label="Guests" value={guestCards.length} />
            <AdminStat label="Business Tools" value={businessCards.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Priority" title="Main Admin Tools" />
        <AdminGrid cards={coreCards} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Events" title="Events, Matchups & Media" />
        <AdminGrid cards={eventCards} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Guests" title="Guest Hoopers & External Players" />
        <AdminGrid cards={guestCards} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Rosters" title="Rosters & Announcements" />
        <AdminGrid cards={rosterCards} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Business" title="Partners & Business Tools" />
        <AdminGrid cards={businessCards} />
      </section>
    </main>
  );
}

function AdminGrid({ cards }: { cards: AdminCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <AdminCardItem key={card.href} card={card} />
      ))}
    </div>
  );
}

function AdminCardItem({ card }: { card: AdminCard }) {
  return (
    <Link
      href={card.href}
      className={
        card.featured
          ? "group block rounded-[1.75rem] border border-orange-500/30 bg-orange-500/10 p-5 shadow-xl shadow-orange-950/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/70"
          : "group block rounded-[1.75rem] border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/60"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className={
            card.featured
              ? "rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-black"
              : "rounded-full border border-slate-700 bg-black/30 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-300"
          }
        >
          {card.badge}
        </span>
      </div>

      <h2 className="text-2xl font-black text-white group-hover:text-orange-200">
        {card.title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-400">
        {card.description}
      </p>
    </Link>
  );
}

function AdminStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-3xl font-black text-white">{title}</h2>
    </div>
  );
}
