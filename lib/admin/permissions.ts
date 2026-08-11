export const ADMIN_CAPABILITIES = [
  { key: "ticker", label: "Ticker / Site Notice" },
  { key: "players", label: "People & Players" },
  { key: "teams", label: "Teams" },
  { key: "team_members", label: "FACKTS Team" },
  { key: "applications", label: "Player Applications" },
  { key: "player_access", label: "Player Accounts" },
  { key: "games", label: "Games" },
  { key: "stats", label: "Game Statistics" },
  { key: "calendar", label: "Scheduling" },
  { key: "events", label: "Event Operations" },
  { key: "one_on_one", label: "Competitions & FACKTS Kings" },
  { key: "match_previews", label: "Match Previews" },
  { key: "highlights", label: "Highlights" },
  { key: "media_stories", label: "Media Stories" },
  { key: "media", label: "Media Library" },
  { key: "guest_hoopers", label: "Legacy Guest Profiles" },
  { key: "game_guests", label: "Legacy Guest Rosters" },
  { key: "guest_game_stats", label: "Legacy Guest Stats" },
  { key: "guest_one_on_one_stats", label: "Guest 1-on-1 Stats" },
  { key: "rosters", label: "Rosters" },
  { key: "roster_announcements", label: "Roster Announcements" },
  { key: "notifications", label: "App Notifications" },
  { key: "partners", label: "Partners" },
  { key: "email", label: "Email Notifications" },
  { key: "activity", label: "Admin Activity" },
  { key: "audit", label: "Audit Log" },
  { key: "consents", label: "Consent & Releases" },
  { key: "corrections", label: "Data Corrections" },
  { key: "reports", label: "Reports" },
  { key: "admin_users", label: "Users & Permissions" },
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number]["key"];

export const ADMIN_ROLE_PRESETS = [
  "director",
  "event_manager",
  "statistician",
  "media_editor",
  "team_manager",
  "organizer_viewer",
  "read_only_partner",
] as const;

export type AdminRolePreset = (typeof ADMIN_ROLE_PRESETS)[number];

export type AdminPermissionProfile = {
  role?: string | null;
  is_super_admin?: boolean | null;
  permissions?: string[] | null;
};

export type AdminRolePresetDefinition = {
  key: AdminRolePreset;
  label: string;
  description: string;
  permissions: AdminCapability[];
  readOnly: boolean;
  requiresScope: boolean;
};

const ALL_CAPABILITIES = ADMIN_CAPABILITIES.map(
  (capability) => capability.key
) as AdminCapability[];

export const ADMIN_ROLE_PRESET_DEFINITIONS: AdminRolePresetDefinition[] = [
  {
    key: "director",
    label: "Director",
    description: "Full operational authority across FACKTS Hoops Admin.",
    permissions: ALL_CAPABILITIES,
    readOnly: false,
    requiresScope: false,
  },
  {
    key: "event_manager",
    label: "Event Manager",
    description: "Operates events, games, rosters, consent and delivery reports.",
    permissions: [
      "calendar",
      "events",
      "games",
      "rosters",
      "game_guests",
      "teams",
      "notifications",
      "reports",
      "consents",
    ],
    readOnly: false,
    requiresScope: false,
  },
  {
    key: "statistician",
    label: "Statistician",
    description: "Manages canonical participation and shared game statistics.",
    permissions: [
      "games",
      "rosters",
      "game_guests",
      "stats",
      "guest_game_stats",
      "one_on_one",
      "guest_one_on_one_stats",
      "highlights",
      "corrections",
    ],
    readOnly: false,
    requiresScope: false,
  },
  {
    key: "media_editor",
    label: "Media Editor",
    description: "Manages governed media, highlights and public stories.",
    permissions: [
      "media",
      "media_stories",
      "highlights",
      "players",
      "teams",
      "games",
    ],
    readOnly: false,
    requiresScope: false,
  },
  {
    key: "team_manager",
    label: "Team Manager",
    description: "Manages explicitly assigned teams and their roster records.",
    permissions: ["teams", "rosters", "players", "games"],
    readOnly: false,
    requiresScope: true,
  },
  {
    key: "organizer_viewer",
    label: "Organizer Viewer",
    description: "Reads explicitly assigned event operations and reports.",
    permissions: [
      "calendar",
      "events",
      "games",
      "rosters",
      "stats",
      "media",
      "reports",
    ],
    readOnly: true,
    requiresScope: true,
  },
  {
    key: "read_only_partner",
    label: "Read-only Partner",
    description: "Reads explicitly assigned partner delivery and reporting records.",
    permissions: ["media", "reports"],
    readOnly: true,
    requiresScope: true,
  },
];

const CAPABILITY_KEYS = new Set<string>(
  ADMIN_CAPABILITIES.map((capability) => capability.key)
);

const ROLE_PRESET_KEYS = new Set<string>(ADMIN_ROLE_PRESETS);

export function normalizeAdminRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeAdminRolePreset(value: unknown): AdminRolePreset | null {
  const role = normalizeAdminRole(value);
  return ROLE_PRESET_KEYS.has(role) ? (role as AdminRolePreset) : null;
}

export function adminRolePresetDefinition(value: unknown) {
  const role = normalizeAdminRolePreset(value);
  return role
    ? ADMIN_ROLE_PRESET_DEFINITIONS.find((preset) => preset.key === role) ?? null
    : null;
}

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

export function defaultPermissionsForRole(value: unknown): AdminCapability[] {
  return [...(adminRolePresetDefinition(value)?.permissions ?? [])];
}

export function isSuperAdminRole(role: string | null | undefined) {
  return ["super_admin", "owner", "founder"].includes(normalizeAdminRole(role));
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

  const directPermissions = normalizeAdminPermissions(profile.permissions);
  const presetPermissions = defaultPermissionsForRole(profile.role);

  if (directPermissions.includes(capability) || presetPermissions.includes(capability)) {
    return true;
  }

  // Deployment-order protection for active legacy administrators created
  // before the Phase 0 capability columns existed.
  return profile.permissions === undefined || profile.permissions === null;
}

const ADMIN_ROUTE_CAPABILITIES: Array<{
  prefix: string;
  capability: AdminCapability;
}> = [
  { prefix: "/admin/users", capability: "admin_users" },
  { prefix: "/admin/mini-admins", capability: "admin_users" },
  { prefix: "/admin/consents", capability: "consents" },
  { prefix: "/admin/corrections", capability: "corrections" },
  { prefix: "/admin/reports", capability: "reports" },
  { prefix: "/admin/player-applications", capability: "applications" },
  { prefix: "/admin/player-access", capability: "player_access" },
  { prefix: "/admin/player-profiles", capability: "players" },
  { prefix: "/admin/teams", capability: "teams" },
  { prefix: "/admin/team", capability: "team_members" },
  { prefix: "/admin/guest-one-on-one-stats", capability: "guest_one_on_one_stats" },
  { prefix: "/admin/competitions", capability: "one_on_one" },
  { prefix: "/admin/guest-game-stats", capability: "stats" },
  { prefix: "/admin/roster-announcements", capability: "roster_announcements" },
  { prefix: "/admin/match-previews", capability: "match_previews" },
  { prefix: "/admin/media-stories", capability: "media_stories" },
  { prefix: "/admin/guest-hoopers", capability: "players" },
  { prefix: "/admin/game-guests", capability: "rosters" },
  { prefix: "/admin/notifications", capability: "notifications" },
  { prefix: "/admin/one-on-one", capability: "one_on_one" },
  { prefix: "/admin/highlights", capability: "highlights" },
  { prefix: "/admin/partners", capability: "partners" },
  { prefix: "/admin/calendar", capability: "calendar" },
  { prefix: "/admin/events", capability: "events" },
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
