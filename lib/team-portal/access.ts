import type { User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CORE_TEAM_CAPABILITIES,
  normalizeTeamCapabilities,
  TEAM_ROLE_CAPABILITIES,
  type TeamCapability,
} from "@/lib/team-portal/capabilities";

export type PortalMembership = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  status: string;
  display_name?: string | null;
  invited_email?: string | null;
};

export type PortalTeamOption = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type PortalSubscription = {
  team_id: string;
  plan_code: string;
  status: string;
  enabled_capabilities?: string[] | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

function subscriptionIsActive(subscription: PortalSubscription | null) {
  if (!subscription || !["trial", "active"].includes(subscription.status)) return false;
  const now = Date.now();
  if (subscription.starts_at && new Date(subscription.starts_at).getTime() > now) return false;
  if (subscription.ends_at && new Date(subscription.ends_at).getTime() <= now) return false;
  return true;
}

export async function getTeamPortalTeams() {
  const user = await getAuthenticatedUser();
  if (!user) return { user: null as User | null, teams: [] as PortalTeamOption[] };
  const admin = createSupabaseAdminClient();
  const memberships = await admin
    .from("team_portal_memberships")
    .select("team_id,role,created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (memberships.error) throw memberships.error;
  const teamIds = Array.from(new Set((memberships.data ?? []).map((membership) => String(membership.team_id))));
  if (!teamIds.length) return { user, teams: [] as PortalTeamOption[] };
  const profiles = await admin.from("team_profiles").select("id,name,slug").in("id", teamIds);
  if (profiles.error) throw profiles.error;
  const profileById = new Map((profiles.data ?? []).map((team) => [String(team.id), team]));
  return {
    user,
    teams: (memberships.data ?? []).flatMap((membership) => {
      const team = profileById.get(String(membership.team_id));
      return team ? [{ id: String(team.id), name: String(team.name || "Team"), slug: String(team.slug || ""), role: String(membership.role || "viewer") }] : [];
    }),
  };
}

export async function getTeamPortalAccess(teamId?: string | null) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null as User | null,
      membership: null as PortalMembership | null,
      subscription: null as PortalSubscription | null,
      capabilities: [] as TeamCapability[],
      team: null as Record<string, unknown> | null,
      allowed: false,
    };
  }

  const admin = createSupabaseAdminClient();
  let membershipQuery = admin
    .from("team_portal_memberships")
    .select("id,team_id,user_id,role,status,display_name,invited_email")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (teamId) membershipQuery = membershipQuery.eq("team_id", teamId);
  const membershipResult = await membershipQuery.maybeSingle();
  if (membershipResult.error) throw membershipResult.error;
  const membership = membershipResult.data as PortalMembership | null;

  if (!membership) {
    return {
      user,
      membership: null as PortalMembership | null,
      subscription: null as PortalSubscription | null,
      capabilities: [] as TeamCapability[],
      team: null as Record<string, unknown> | null,
      allowed: false,
    };
  }

  const [subscriptionResult, teamResult] = await Promise.all([
    admin.from("team_subscriptions").select("*").eq("team_id", membership.team_id).maybeSingle(),
    admin.from("team_profiles").select("*").eq("id", membership.team_id).maybeSingle(),
  ]);
  if (subscriptionResult.error) throw subscriptionResult.error;
  if (teamResult.error) throw teamResult.error;

  const storedSubscription = subscriptionResult.data as PortalSubscription | null;
  const subscription: PortalSubscription = storedSubscription ?? {
    team_id: membership.team_id,
    plan_code: "club_core",
    status: "active",
    enabled_capabilities: [...CORE_TEAM_CAPABILITIES],
  };
  const enabled = new Set<TeamCapability>(CORE_TEAM_CAPABILITIES);
  if (subscriptionIsActive(storedSubscription)) {
    normalizeTeamCapabilities(storedSubscription?.enabled_capabilities).forEach((capability) => enabled.add(capability));
  }
  const roleCapabilities = TEAM_ROLE_CAPABILITIES[membership.role] ?? TEAM_ROLE_CAPABILITIES.viewer;
  const capabilities = roleCapabilities.filter((capability) => enabled.has(capability));

  return {
    user,
    membership,
    subscription,
    capabilities,
    team: (teamResult.data as Record<string, unknown> | null) ?? null,
    allowed: capabilities.includes("portal_view"),
  };
}

export async function requireTeamCapability(capability: TeamCapability, teamId?: string | null) {
  const access = await getTeamPortalAccess(teamId);
  return { ...access, permitted: access.allowed && access.capabilities.includes(capability) };
}
