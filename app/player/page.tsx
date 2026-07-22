import Link from "next/link";
import { redirect } from "next/navigation";
import PlayerLogoutButton from "@/app/components/PlayerLogoutButton";
import NotificationBell from "@/app/components/NotificationBell";
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
      <section className="border-b border-slate-800 bg-gradient-to-br from-black via-slate-950 to-blue-950/40">
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

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PortalLink href="/calendar" title="Schedule Games & Challenges" text="Set availability, respond to games and events, and request 1v1 matchups." featured />
          <PortalLink href={`/players/${player.id}`} title="My Public Profile" text="View your player card, stats, bio, and game log." />
          <PortalLink href="/games" title="Games" text="See fixtures, results, posters, coverage, and reports." />
          <PortalLink href="/leaderboards" title="Leaderboards" text="Track FACKTS rankings and current performance." />
          <PortalLink href="/player/settings" title="Account Settings" text="Change your password and control phone or laptop notifications." />
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
      <p className="mt-2 text-3xl font-black text-orange-300">{value}</p>
    </div>
  );
}

function PortalLink({ href, title, text, featured = false }: { href: string; title: string; text: string; featured?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-3xl border p-5 transition hover:-translate-y-1 ${
        featured
          ? "border-orange-500/30 bg-orange-500/10"
          : "border-slate-800 bg-slate-900 hover:border-orange-400/50"
      }`}
    >
      <p className="text-xl font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
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
