export const TEAM_CAPABILITIES = [
  "portal_view",
  "training_manage",
  "branding_submit",
  "media_submit",
  "roster_manage",
  "stats_submit",
  "player_profile_request",
  "broadcast_manage",
] as const;

export type TeamCapability = (typeof TEAM_CAPABILITIES)[number];

export const TEAM_CAPABILITY_LABELS: Record<TeamCapability, string> = {
  portal_view: "Partner dashboard",
  training_manage: "Training workspace",
  branding_submit: "Hero and logo uploads",
  media_submit: "Media and poster submissions",
  roster_manage: "Roster management",
  stats_submit: "Game stat submissions",
  player_profile_request: "Player profile requests",
  broadcast_manage: "YouTube live production",
};

export const TEAM_PLAN_PRESETS = {
  training_partner: {
    label: "Training Partner",
    capabilities: ["portal_view", "training_manage", "branding_submit", "media_submit"],
  },
  team_operations: {
    label: "Team Operations",
    capabilities: [
      "portal_view",
      "training_manage",
      "branding_submit",
      "media_submit",
      "roster_manage",
    ],
  },
  performance: {
    label: "Performance",
    capabilities: [
      "portal_view",
      "training_manage",
      "branding_submit",
      "media_submit",
      "roster_manage",
      "stats_submit",
      "player_profile_request",
    ],
  },
  broadcast: {
    label: "Broadcast",
    capabilities: [...TEAM_CAPABILITIES],
  },
} satisfies Record<string, { label: string; capabilities: readonly TeamCapability[] }>;

export type TeamPlanCode = keyof typeof TEAM_PLAN_PRESETS;

export const TEAM_ROLE_CAPABILITIES: Record<string, readonly TeamCapability[]> = {
  owner: TEAM_CAPABILITIES,
  manager: TEAM_CAPABILITIES,
  coach: ["portal_view", "training_manage", "roster_manage", "stats_submit", "player_profile_request"],
  statistician: ["portal_view", "stats_submit"],
  media: ["portal_view", "branding_submit", "media_submit", "broadcast_manage"],
  viewer: ["portal_view"],
};

export function normalizeTeamCapabilities(value: unknown): TeamCapability[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(TEAM_CAPABILITIES);
  return Array.from(new Set(value.map(String).filter((item): item is TeamCapability => allowed.has(item))));
}
