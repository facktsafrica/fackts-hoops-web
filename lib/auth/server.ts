import type { User } from "@supabase/supabase-js";
import { isOfficialFacktsPlayer } from "@/lib/hoops/playerClassification";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  user_id: string;
  role?: string | null;
  player_type?: string | null;
  is_active?: boolean | null;
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

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id, user_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return {
    user,
    profile: (profile as AdminProfile | null) ?? null,
    supabase,
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
