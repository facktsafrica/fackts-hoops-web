import { canAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ActivityRow = {
  id: string;
  player_id: string;
  player_name: string;
  event_type: string;
  title: string;
  details?: string | null;
  created_at: string;
};

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function AdminActivityPanel() {
  const { profile } = await getAdminAccess();
  if (!profile || !canAdmin(profile, "activity")) return null;

  let activities: ActivityRow[] = [];
  let setupMessage = "";

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("player_activity_events")
      .select(
        "id, player_id, player_name, event_type, title, details, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      setupMessage =
        "Run the included admin-upgrade SQL to activate player activity tracking.";
    } else {
      activities = (data ?? []) as ActivityRow[];
    }
  } catch {
    setupMessage =
      "Player activity will appear after the server connection is available.";
  }

  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = activities.filter(
    (activity) => new Date(activity.created_at).getTime() >= since
  );
  const activePlayers = new Set(recent.map((activity) => activity.player_id)).size;

  return (
    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            Live Activity
          </p>
          <h2 className="mt-1 text-3xl font-black text-white">
            Player Activity
          </h2>
        </div>

        <div className="flex gap-2">
          <ActivityStat label="24h Events" value={recent.length} />
          <ActivityStat label="Active Players" value={activePlayers} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900">
        {setupMessage ? (
          <p className="p-5 text-sm leading-6 text-amber-200">{setupMessage}</p>
        ) : activities.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            No player activity has been recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-black text-white">
                    {activity.player_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {activity.title}
                    {activity.details ? ` - ${activity.details}` : ""}
                  </p>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {relativeTime(activity.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-orange-300">{value}</p>
    </div>
  );
}
