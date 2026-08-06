import Link from "next/link";
import { redirect } from "next/navigation";
import PlayerLogoutButton from "@/app/components/PlayerLogoutButton";
import NotificationBell from "@/app/components/NotificationBell";
import PlayerActivityTracker from "@/app/components/PlayerActivityTracker";
import PushNotificationManager from "@/app/components/PushNotificationManager";
import { getPlayerAccess } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatRow = {
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
};

function average(stats: StatRow[], key: keyof StatRow) {
  if (stats.length === 0) return "0.0";
  const total = stats.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  return (total / stats.length).toFixed(1);
}

export default async function PlayerPortalPage() {
  const { user, player, supabase } = await getPlayerAccess();

  if (!user || !player) {
    redirect("/player/login");
  }

  const [statsResult, availabilityResult, matchupResult, notificationResult] =
    await Promise.all([
      supabase
        .from("player_game_stats")
        .select("points, rebounds, assists, steals, blocks")
        .eq("player_id", player.id),
      supabase
        .from("fackts_availability")
        .select("id, status, availability_type, availability_date")
        .eq("participant_source", "players")
        .eq("participant_id", player.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("fackts_matchups")
        .select("id, matchup_status, player_one_id, player_two_id")
        .or(`player_one_id.eq.${player.id},player_two_id.eq.${player.id}`)
        .neq("matchup_status", "deleted"),
      supabase
        .from("fackts_notifications")
        .select("id, title, body, is_read, created_at")
        .eq("recipient_role", "player")
        .eq("recipient_source", "players")
        .eq("recipient_id", player.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const stats = (statsResult.data ?? []) as StatRow[];
  const availability = availabilityResult.data ?? [];
  const matchups = matchupResult.data ?? [];
  const notifications = notificationResult.data ?? [];
  const unreadAlerts = notifications.filter((item) => !item.is_read).length;
  const playerName = player.full_name || player.name || player.nickname || "Player";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PlayerActivityTracker />
      <section className="relative z-40 overflow-visible border-b border-slate-800 bg-gradient-to-br from-black via-slate-950 to-blue-950/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <div className="h-18 w-18 shrink-0 overflow-hidden rounded-2xl border border-orange-500/30 bg-slate-900 sm:h-24 sm:w-24 sm:rounded-3xl">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={playerName}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl sm:text-4xl">🏀</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300 sm:text-xs sm:tracking-[0.25em]">
                  Player Portal
                </div>
                <h1 className="mt-1 truncate text-2xl font-black uppercase sm:mt-2 sm:text-5xl">
                  {playerName}
                </h1>
                <p className="mt-1 text-xs text-slate-400 sm:mt-2 sm:text-sm">
                  #{player.jersey_number ?? "—"} • {player.position || "Position TBA"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NotificationBell />
              <PlayerLogoutButton />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-800 bg-black/35 sm:mt-8 sm:grid-cols-4">
            <PortalStat label="Games" value={String(stats.length)} />
            <PortalStat label="PPG" value={average(stats, "points")} />
            <PortalStat label="Open Responses" value={String(availability.length)} />
            <PortalStat label="Unread Alerts" value={String(unreadAlerts)} />
          </div>
        </div>
      </section>

      <section className="relative z-0 mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
              Quick Access
            </p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">Your Game Centre</h2>
          </div>
          <span className="rounded-full border border-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
            5 tools
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
          <PortalLink
            href="/calendar"
            number="01"
            eyebrow="Compete"
            title="Schedule Games & Challenges"
            text="Set availability, respond to games and events, and request 1v1 matchups."
            featured
          />
          <PortalLink
            href={`/players/${player.id}`}
            number="02"
            eyebrow="Identity"
            title="My Public Profile"
            text="View your player card, stats, bio, and game log."
          />
          <PortalLink
            href="/games"
            number="03"
            eyebrow="Game Centre"
            title="Games"
            text="See fixtures, results, posters, coverage, and reports."
          />
          <PortalLink
            href="/leaderboards"
            number="04"
            eyebrow="Rankings"
            title="Leaderboards"
            text="Track FACKTS rankings and current performance."
          />
          <PortalLink
            href="/player/settings"
            number="05"
            eyebrow="Your Access"
            title="Account Settings"
            text="Change your password and control phone or laptop notifications."
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 sm:gap-6 sm:px-6 sm:pb-12 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:rounded-3xl sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            Performance
          </p>
          <h2 className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl">Current Averages</h2>
          <div className="mt-4 grid grid-cols-5 divide-x divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-black/35 sm:mt-5">
            <MiniStat label="PTS" value={average(stats, "points")} />
            <MiniStat label="REB" value={average(stats, "rebounds")} />
            <MiniStat label="AST" value={average(stats, "assists")} />
            <MiniStat label="STL" value={average(stats, "steals")} />
            <MiniStat label="BLK" value={average(stats, "blocks")} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:rounded-3xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Player Alerts
              </p>
              <h2 className="mt-2 text-2xl font-black">Latest Updates</h2>
            </div>
            <Link href="/calendar" className="text-sm font-black text-orange-300">
              Open
            </Link>
          </div>

          {notifications.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">No player alerts yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {notifications.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-2xl border p-4 ${
                    note.is_read
                      ? "border-slate-800 bg-black/30"
                      : "border-orange-500/30 bg-orange-500/10"
                  }`}
                >
                  <p className="font-black">{note.title}</p>
                  {note.body ? (
                    <p className="mt-1 text-sm leading-6 text-slate-400">{note.body}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 text-xs text-slate-600">
            Active matchup records: {matchups.length}
          </p>
        </div>

        <PushNotificationManager />
      </section>
    </main>
  );
}

function PortalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-slate-800 p-3 last:border-r-0 sm:border-b-0 sm:p-4">
      <p className="line-clamp-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-xl font-black text-orange-300 sm:mt-2 sm:text-3xl">{value}</p>
    </div>
  );
}

function PortalLink({
  href,
  number,
  eyebrow,
  title,
  text,
  featured = false,
}: {
  href: string;
  number: string;
  eyebrow: string;
  title: string;
  text: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate grid min-h-[86px] grid-cols-[2.75rem_minmax(0,1fr)_2rem] items-center gap-3 overflow-hidden rounded-2xl border p-3 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:min-h-40 md:grid-cols-1 md:items-stretch md:p-5 ${
        featured
          ? "border-orange-500/50 bg-orange-950/30 hover:border-orange-400"
          : "border-slate-700/80 bg-slate-900 hover:border-orange-400/70"
      }`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_90%_15%,rgba(249,115,22,0.18),transparent_42%)] opacity-80" />

      <span className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-black ${
        featured
          ? "border-orange-400/50 bg-orange-500 text-black"
          : "border-slate-700 bg-black/35 text-orange-300"
      } md:h-9 md:w-9`}>
        {number}
      </span>

      <div className="min-w-0 md:flex md:h-full md:flex-col md:justify-end">
        <p className={`text-[8px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em] ${featured ? "text-orange-300" : "text-slate-400"}`}>
            {eyebrow}
        </p>
        <p className="mt-0.5 truncate text-sm font-black leading-tight text-white md:mt-2 md:text-xl md:whitespace-normal">{title}</p>
        <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-400 md:mt-2 md:line-clamp-2 md:text-sm md:leading-6">{text}</p>
      </div>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-orange-300 transition duration-300 group-hover:translate-x-1 group-hover:border-orange-400/60 group-hover:bg-orange-500 group-hover:text-black md:absolute md:right-4 md:top-4">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1 py-2.5 text-center sm:p-3">
      <p className="text-[8px] font-black text-slate-500 sm:text-[10px]">{label}</p>
      <p className="mt-1 text-base font-black text-white sm:text-xl">{value}</p>
    </div>
  );
}
