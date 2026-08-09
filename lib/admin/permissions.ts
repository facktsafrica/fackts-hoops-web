export const ADMIN_CAPABILITIES = [
  { key: "ticker", label: "Ticker / Site Notice" },
  { key: "players", label: "Players" },
  { key: "applications", label: "Player Applications" },
  { key: "player_access", label: "Player Accounts" },
  { key: "games", label: "Games" },
  { key: "stats", label: "Player Stats" },
  { key: "calendar", label: "Scheduling & Events" },
  { key: "one_on_one", label: "1-on-1 Battles" },
  { key: "match_previews", label: "Match Previews" },
  { key: "highlights", label: "Highlights" },
  { key: "media_stories", label: "Media Stories" },
  { key: "guest_hoopers", label: "Guest Hoopers" },
  { key: "game_guests", label: "Game Guests" },
  { key: "guest_game_stats", label: "Guest Game Stats" },
  { key: "guest_one_on_one_stats", label: "Guest 1-on-1 Stats" },
  { key: "rosters", label: "Rosters" },
  { key: "roster_announcements", label: "Roster Announcements" },
  { key: "notifications", label: "App Notifications" },
  { key: "partners", label: "Partners" },
  { key: "email", label: "Email Notifications" },
  { key: "activity", label: "Player Activity" },
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number]["key"];

export type AdminPermissionProfile = {
  role?: string | null;
  is_super_admin?: boolean | null;
  permissions?: string[] | null;
};

const CAPABILITY_KEYS = new Set<string>(
  ADMIN_CAPABILITIES.map((capability) => capability.key)
);

export function normalizeAdminPermissions(value: unknown): AdminCapability[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((permission) => String(permission))
        .filter((permission): permission is AdminCapability =>
          CAPABILITY_KEYS.has(permission)
        )
    )
  );
}

export function isSuperAdminRole(role: string | null | undefined) {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return ["super_admin", "owner", "founder"].includes(normalized);
}

export function isSuperAdmin(profile: AdminPermissionProfile | null | undefined) {
  return Boolean(
    profile &&
      (profile.is_super_admin === true || isSuperAdminRole(profile.role))
  );
}

export function canAdmin(
  profile: AdminPermissionProfile | null | undefined,
  capability: AdminCapability
) {
  if (!profile) return false;
  if (isSuperAdmin(profile)) return true;

  // Upgrade-order protection: before the SQL migration exists, permissions are
  // undefined. Existing active admins keep their legacy access instead of being
  // locked out.
  if (profile.permissions === undefined || profile.permissions === null) {
    return true;
  }

  return normalizeAdminPermissions(profile.permissions).includes(capability);
}

const ADMIN_ROUTE_CAPABILITIES: Array<{
  prefix: string;
  capability: AdminCapability;
}> = [
  { prefix: "/admin/player-applications", capability: "applications" },
  { prefix: "/admin/player-access", capability: "player_access" },
  { prefix: "/admin/player-profiles", capability: "players" },
  { prefix: "/admin/guest-one-on-one-stats", capability: "guest_one_on_one_stats" },
  { prefix: "/admin/guest-game-stats", capability: "guest_game_stats" },
  { prefix: "/admin/roster-announcements", capability: "roster_announcements" },
  { prefix: "/admin/match-previews", capability: "match_previews" },
  { prefix: "/admin/media-stories", capability: "media_stories" },
  { prefix: "/admin/guest-hoopers", capability: "guest_hoopers" },
  { prefix: "/admin/game-guests", capability: "game_guests" },
  { prefix: "/admin/notifications", capability: "notifications" },
  { prefix: "/admin/one-on-one", capability: "one_on_one" },
  { prefix: "/admin/highlights", capability: "highlights" },
  { prefix: "/admin/partners", capability: "partners" },
  { prefix: "/admin/calendar", capability: "calendar" },
  { prefix: "/admin/events", capability: "calendar" },
  { prefix: "/admin/players", capability: "players" },
  { prefix: "/admin/rosters", capability: "rosters" },
  { prefix: "/admin/ticker", capability: "ticker" },
  { prefix: "/admin/games", capability: "games" },
  { prefix: "/admin/stats", capability: "stats" },
  { prefix: "/admin/email", capability: "email" },
];

export function capabilityForAdminPath(pathname: string) {
  const match = ADMIN_ROUTE_CAPABILITIES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return match?.capability ?? null;
}
