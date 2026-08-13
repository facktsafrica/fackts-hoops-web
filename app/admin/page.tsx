import Link from "next/link";
import AdminLogoutButton from "@/app/components/AdminLogoutButton";
import {
  adminRolePresetDefinition,
  canAdmin,
  type AdminCapability,
} from "@/lib/admin/permissions";
import {
  loadAdminDashboard,
  type DashboardActivity,
  type DashboardSignal,
  type DashboardMetric,
} from "@/lib/admin/dashboard";
import { getAdminAccess } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QuickAction = {
  label: string;
  description: string;
  href: string;
  capability: AdminCapability;
};

const quickActions: QuickAction[] = [
  { label: "Create event", description: "Start the seven-stage setup wizard.", href: "/admin/events/new", capability: "events" },
  { label: "Schedule games", description: "Create fixtures or use the bulk scheduler.", href: "/admin/games", capability: "games" },
  { label: "Import roster", description: "Stage and validate CSV or Excel rows.", href: "/admin/rosters", capability: "rosters" },
  { label: "Enter statistics", description: "Open the shared mobile stat engine.", href: "/admin/stats", capability: "stats" },
  { label: "Manage media", description: "Link, review and publish governed event and game media.", href: "/admin/media", capability: "media" },
  { label: "Review consent", description: "Manage evidence, scope and withdrawals.", href: "/admin/consents", capability: "consents" },
  { label: "Review corrections", description: "Triage, approve or apply data changes.", href: "/admin/corrections", capability: "corrections" },
  { label: "Run reports", description: "Filter, present and export live operations.", href: "/admin/reports", capability: "reports" },
  { label: "Manage access", description: "Roles, permissions and resource scopes.", href: "/admin/users", capability: "admin_users" },
];

const toneClasses: Record<DashboardMetric["tone"], string> = {
  orange: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  blue: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
};

const signalClasses: Record<DashboardSignal["severity"], string> = {
  critical: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  attention: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  opportunity: "border-blue-400/30 bg-blue-400/10 text-blue-100",
  clear: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
};

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Unknown time";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatGameDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function activityHref(activity: DashboardActivity) {
  const capability = activity.capability;
  if (capability === "events") return "/admin/events";
  if (capability === "games") return "/admin/games";
  if (capability === "rosters") return "/admin/rosters";
  if (capability === "stats") return "/admin/stats";
  if (capability === "media") return "/admin/media";
  if (capability === "consents") return "/admin/consents";
  if (capability === "corrections") return "/admin/corrections";
  if (capability === "reports") return "/admin/reports";
  if (capability === "admin_users") return "/admin/users";
  return "/admin";
}

export default async function AdminPage() {
  const { profile } = await getAdminAccess();
  if (!profile) {
    return <main className="min-h-screen bg-black px-5 py-24 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center"><h1 className="text-2xl font-black">Admin profile unavailable</h1><p className="mt-3 text-sm text-zinc-400">Sign in with an active Admin account to load operations.</p></div></main>;
  }

  let dashboard: Awaited<ReturnType<typeof loadAdminDashboard>> = {
    metrics: [],
    activity: [],
    today: "",
    queryWarnings: [],
    health: { score: 0, label: "Intelligence unavailable", detail: "Live operational data could not be assessed.", attention_count: 0 },
    signals: [],
    upcomingGames: [],
    competitionPulse: [],
  };
  try {
    dashboard = await loadAdminDashboard(profile);
  } catch {
    dashboard.queryWarnings = ["Dashboard data is temporarily unavailable."];
  }
  const readOnly = adminRolePresetDefinition(profile.role)?.readOnly ?? false;
  const actions = readOnly
    ? []
    : quickActions.filter((action) => canAdmin(profile, action.capability));

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_62%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Director command · Live operations</p>
                <h1 className="mt-3 text-4xl font-black sm:text-6xl">FACKTS Intelligence Centre</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">One view of what is happening across competitions, events, games, people, statistics, media and delivery—and the next actions required to keep FACKTS moving.</p>
                <p className="mt-3 text-xs font-bold text-zinc-600">{profile.display_name || profile.email || "Admin"} · {readable(profile.role || "administrator")}{dashboard.today ? ` · ${dashboard.today}` : ""}</p>
              </div>
              <div className="relative flex flex-wrap gap-2">
                <Link href="/" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-zinc-200">View public site</Link>
                <AdminLogoutButton />
              </div>
            </div>
          </div>
        </header>

        {dashboard.queryWarnings.length ? <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100"><p className="font-black">Some live dashboard queries are unavailable.</p><p className="mt-1 text-amber-100/70">Available cards remain real; unavailable metrics are omitted rather than replaced with placeholders.</p></div> : null}

        <section className="grid gap-5 xl:grid-cols-[0.78fr,1.22fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-400/20 bg-zinc-950 p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">Operational readiness</p>
              <div className="mt-5 flex items-end gap-4">
                <p className="text-7xl font-black tracking-tighter sm:text-8xl">{dashboard.health.score}</p>
                <div className="pb-2"><p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">out of 100</p><p className="mt-1 font-black text-orange-200">{dashboard.health.label}</p></div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-emerald-400" style={{ width: `${dashboard.health.score}%` }} /></div>
              <p className="mt-5 text-sm leading-6 text-zinc-400">{dashboard.health.detail}</p>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Records needing attention</span><span className="text-2xl font-black text-white">{dashboard.health.attention_count.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950 p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Decision queue</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">What happens next</h2></div><p className="hidden text-xs text-zinc-600 sm:block">Ranked from live exceptions</p></div>
            <div className="mt-5 grid gap-3">
              {dashboard.signals.map((signal, index) => <Link key={signal.key} href={signal.href} className={`group grid gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center ${signalClasses[signal.severity]}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-black/20 text-sm font-black">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="font-black text-white">{signal.title}</span>{signal.count > 0 ? <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-black">{signal.count}</span> : null}</span><span className="mt-1 block text-xs leading-5 opacity-70">{signal.detail}</span></span><span className="text-xs font-black whitespace-nowrap">{signal.action} →</span></Link>)}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950 p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">14-day horizon</p><h2 className="mt-1 text-2xl font-black">Next on court</h2></div><Link href="/admin/games" className="text-xs font-black text-orange-300">All games →</Link></div>
            {dashboard.upcomingGames.length ? <div className="mt-5 divide-y divide-white/5">{dashboard.upcomingGames.map((game) => <Link key={game.id} href={`/admin/games?q=${encodeURIComponent(game.title)}`} className="grid gap-3 py-4 first:pt-0 last:pb-0 transition hover:text-orange-100 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-black">{game.title}</p><p className="mt-1 truncate text-xs text-zinc-500">{game.competition} · {formatGameDate(game.game_date)}</p></div><div className="flex gap-2 text-[10px] font-black uppercase"><span className={`rounded-full border px-2 py-1 ${game.roster_count ? "border-emerald-400/25 text-emerald-200" : "border-amber-400/25 text-amber-200"}`}>{game.roster_count} roster</span><span className={`rounded-full border px-2 py-1 ${game.media_count ? "border-blue-400/25 text-blue-200" : "border-zinc-700 text-zinc-500"}`}>{game.media_count} media</span></div></Link>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No scheduled games appear in the next 14 days.</p>}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950 p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Property performance</p><h2 className="mt-1 text-2xl font-black">Competition pulse</h2></div><Link href="/admin/events" className="text-xs font-black text-orange-300">Portfolio →</Link></div>
            {dashboard.competitionPulse.length ? <div className="mt-5 grid gap-3">{dashboard.competitionPulse.map((competition) => <Link key={competition.slug} href={`/admin/reports?event_id=${encodeURIComponent(`competition:${competition.slug}`)}`} className="rounded-2xl border border-white/10 bg-black p-4 transition hover:border-orange-400/35"><div className="flex items-start justify-between gap-4"><div><p className="font-black">{competition.name}</p><p className="mt-1 text-xs text-zinc-500">Season {competition.season} · {readable(competition.status)}</p></div><span className="rounded-full border border-orange-400/25 bg-orange-400/10 px-2 py-1 text-[9px] font-black uppercase text-orange-200">{competition.completed}/{competition.matches} complete</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><PulseStat label="Players" value={competition.players} /><PulseStat label="Verified" value={competition.verified} /><PulseStat label="Media" value={competition.media} /></div></Link>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No active competition properties are visible to this role.</p>}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Now</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Operational priorities</h2></div><p className="hidden text-xs text-zinc-600 sm:block">Select a card to open its source workflow</p></div>
          {dashboard.metrics.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{dashboard.metrics.map((metric) => <Link key={metric.key} href={metric.href} className={`group rounded-3xl border p-5 transition hover:-translate-y-0.5 ${toneClasses[metric.tone]}`}><div className="flex items-start justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">{metric.label}</p><span className="text-lg transition group-hover:translate-x-0.5">→</span></div><p className="mt-4 text-5xl font-black text-white">{metric.value.toLocaleString()}</p><p className="mt-3 text-xs leading-5 text-zinc-400">{metric.detail}</p></Link>)}</div> : <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950 p-8 text-center"><h3 className="text-lg font-black">No operational metrics are assigned</h3><p className="mt-2 text-sm text-zinc-500">Your current role has no dashboard data source available, or all live queries are unavailable.</p></div>}
        </section>

        <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
          <section>
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Act</p><h2 className="mt-1 text-2xl font-black">Quick actions</h2></div>
            {actions.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{actions.map((action) => <Link key={action.href} href={action.href} className="rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-orange-400/45 hover:bg-orange-400/5"><div className="flex items-center justify-between gap-3"><h3 className="font-black">{action.label}</h3><span className="text-orange-300">→</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">{action.description}</p></Link>)}</div> : <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-500">No write actions are available for this role.</p>}
          </section>

          <section>
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Evidence</p><h2 className="mt-1 text-2xl font-black">Recent Admin activity</h2><p className="mt-2 text-xs text-zinc-500">Full activity for authorized audit roles; otherwise only your own recent actions.</p></div>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
              {dashboard.activity.length ? <div className="divide-y divide-white/5">{dashboard.activity.map((activity) => <Link key={activity.id} href={activityHref(activity)} className="grid gap-2 p-4 transition hover:bg-white/[0.03] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-black">{readable(activity.action)} · {readable(activity.entity_type)}</p><p className="mt-1 truncate text-xs text-zinc-500">{activity.actor_label}{activity.entity_id ? ` · ${activity.entity_id}` : ""}</p></div><p className="text-xs font-bold text-zinc-600">{relativeTime(activity.occurred_at)}</p></Link>)}</div> : <div className="p-8 text-center"><h3 className="font-black">No recent activity</h3><p className="mt-2 text-sm text-zinc-500">Authorized changes will appear here from the immutable Admin audit log.</p></div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PulseStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/5 bg-white/[0.025] px-2 py-3"><p className="text-lg font-black text-white">{value.toLocaleString()}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</p></div>;
}
