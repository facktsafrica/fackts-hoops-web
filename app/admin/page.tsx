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

function activityHref(activity: DashboardActivity) {
  const capability = activity.capability;
  if (capability === "events") return "/admin/events";
  if (capability === "games") return "/admin/games";
  if (capability === "rosters") return "/admin/rosters";
  if (capability === "stats") return "/admin/stats";
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

  let dashboard: Awaited<ReturnType<typeof loadAdminDashboard>> = { metrics: [], activity: [], today: "", queryWarnings: [] };
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
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Operational dashboard</p>
                <h1 className="mt-3 text-4xl font-black sm:text-6xl">Admin Home</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">Live priorities from events, games, rosters, shared statistics, media, deliveries and governed data workflows. Counts respect your role and assigned scope.</p>
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
