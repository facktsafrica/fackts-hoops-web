import type { User } from "@supabase/supabase-js";
import {
  type AdminCapability,
  canAdmin,
  isSuperAdminRole,
} from "@/lib/admin/permissions";
import { isOfficialFacktsPlayer } from "@/lib/hoops/playerClassification";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  user_id: string;
  role?: string | null;
  player_type?: string | null;
  is_active?: boolean | null;
  display_name?: string | null;
  email?: string | null;
  is_super_admin?: boolean | null;
  permissions?: string[] | null;
};

export type PlayerAccount = {
  id: string;
  user_id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  jersey_number?: string | number | null;
  position?: string | null;
  is_active?: boolean | null;
};

export type AdminResourceScope = {
  resourceType: "event" | "game" | "team" | "player" | "media" | "report" | "partner";
  resourceId: string;
  write?: boolean;
};

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user ?? null;
}

export async function getAdminAccess() {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user ?? null;

  if (userError || !user) {
    return { user: null, profile: null, supabase };
  }

  const extendedResult = await supabase
    .from("admin_profiles")
    .select(
      "id, user_id, role, is_active, display_name, email, is_super_admin, permissions"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  let profile = extendedResult.data as AdminProfile | null;

  if (extendedResult.error) {
    const legacyResult = await supabase
      .from("admin_profiles")
      .select("id, user_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    profile = legacyResult.data
      ? {
          ...(legacyResult.data as AdminProfile),
          is_super_admin: isSuperAdminRole(legacyResult.data.role),
          permissions: undefined,
        }
      : null;
  }

  return {
    user,
    profile,
    supabase,
  };
}

export async function getAdminCapabilityAccess(
  capability: AdminCapability,
  scope?: AdminResourceScope
) {
  const access = await getAdminAccess();

  if (!access.user || !access.profile) {
    return { ...access, allowed: false };
  }

  const databaseDecision = await access.supabase.rpc("has_admin_permission", {
    p_capability: capability,
    p_resource_type: scope?.resourceType ?? null,
    p_resource_id: scope?.resourceId ?? null,
    p_write: scope?.write ?? true,
  });

  if (!databaseDecision.error && typeof databaseDecision.data === "boolean") {
    return { ...access, allowed: databaseDecision.data };
  }

  return {
    ...access,
    // Deployment-order compatibility: before M01 exists, keep enforcing the
    // established TypeScript permission model at this server boundary.
    allowed: canAdmin(access.profile, capability),
  };
}

export async function getPlayerAccess() {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user ?? null;

  if (userError || !user) {
    return { user: null, player: null, supabase };
  }

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, user_id, full_name, name, nickname, role, player_type, email, phone, photo_url, jersey_number, position, is_active"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const officialPlayer = player as PlayerAccount | null;

  return {
    user,
    player:
      officialPlayer && isOfficialFacktsPlayer(officialPlayer)
        ? officialPlayer
        : null,
    supabase,
  };
}
