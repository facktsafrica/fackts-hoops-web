import Link from "next/link";
import { redirect } from "next/navigation";
import PlayerLogoutButton from "@/app/components/PlayerLogoutButton";
import NotificationBell from "@/app/components/NotificationBell";
import PushNotificationManager from "@/app/components/PushNotificationManager";
import AnimatedNumber from "@/app/components/AnimatedNumber";
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
      <section className="relative z-40 overflow-visible border-b border-slate-800 bg-gradient-to-br from-black via-slate-950 to-blue-950/40">
        <div className="mx-auto max-w-7xl px-5 py-9 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 overflow-hidden rounded-3xl border border-orange-500/30 bg-slate-900">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={playerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">🏀</div>
                )}
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                  Player Portal
                </div>
                <h1 className="mt-2 text-4xl font-black uppercase sm:text-5xl">
                  {playerName}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  #{player.jersey_number ?? "—"} • {player.position || "Position TBA"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NotificationBell />
              <PlayerLogoutButton />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PortalStat label="Games" value={String(stats.length)} />
            <PortalStat label="PPG" value={average(stats, "points")} />
            <PortalStat label="Open Responses" value={String(availability.length)} />
            <PortalStat label="Unread Alerts" value={String(unreadAlerts)} />
          </div>
        </div>
      </section>

      <section className="relative z-0 mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PortalLink
            href="/calendar"
            eyebrow="Compete"
            title="Schedule Games & Challenges"
            text="Set availability, respond to games and events, and request 1v1 matchups."
            imageUrl={player.photo_url}
            featured
          />
          <PortalLink
            href={`/players/${player.id}`}
            eyebrow="Identity"
            title="My Public Profile"
            text="View your player card, stats, bio, and game log."
            imageUrl={player.photo_url}
          />
          <PortalLink
            href="/games"
            eyebrow="Game Centre"
            title="Games"
            text="See fixtures, results, posters, coverage, and reports."
            imageUrl={player.photo_url}
          />
          <PortalLink
            href="/leaderboards"
            eyebrow="Rankings"
            title="Leaderboards"
            text="Track FACKTS rankings and current performance."
            imageUrl={player.photo_url}
          />
          <PortalLink
            href="/player/settings"
            eyebrow="Your Access"
            title="Account Settings"
            text="Change your password and control phone or laptop notifications."
            imageUrl={player.photo_url}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 sm:px-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            Performance
          </p>
          <h2 className="mt-2 text-2xl font-black">Current Averages</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="PTS" value={average(stats, "points")} />
            <MiniStat label="REB" value={average(stats, "rebounds")} />
            <MiniStat label="AST" value={average(stats, "assists")} />
            <MiniStat label="STL" value={average(stats, "steals")} />
            <MiniStat label="BLK" value={average(stats, "blocks")} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
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
    <div className="rounded-2xl border border-slate-800 bg-black/40 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-orange-300">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function PortalLink({
  href,
  eyebrow,
  title,
  text,
  imageUrl,
  featured = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate min-h-44 overflow-hidden rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${
        featured
          ? "border-orange-500/50 bg-orange-950/30 hover:border-orange-400"
          : "border-slate-700/80 bg-slate-900 hover:border-orange-400/70"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-30 blur-[2px] grayscale-[20%] transition duration-700 group-hover:scale-125 group-hover:opacity-40"
        />
      ) : (
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_85%_20%,rgba(249,115,22,0.2),transparent_45%)]" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/45 transition duration-300 group-hover:via-slate-950/80" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="flex h-full min-h-34 flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${featured ? "text-orange-300" : "text-slate-400"}`}>
            {eyebrow}
          </p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-orange-300 transition duration-300 group-hover:translate-x-1 group-hover:border-orange-400/60 group-hover:bg-orange-500 group-hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
        <div>
          <p className="max-w-xs text-xl font-black leading-tight text-white drop-shadow-lg">{title}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300 drop-shadow">{text}</p>
        </div>
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/40 p-3 text-center">
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}
