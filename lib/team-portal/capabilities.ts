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

export const CORE_TEAM_CAPABILITIES = [
  "portal_view",
  "training_manage",
  "branding_submit",
  "media_submit",
  "roster_manage",
  "stats_submit",
] as const satisfies readonly TeamCapability[];

export const TEAM_UPGRADE_CAPABILITIES = [
  "player_profile_request",
  "broadcast_manage",
] as const satisfies readonly TeamCapability[];

export const TEAM_CAPABILITY_LABELS: Record<TeamCapability, string> = {
  portal_view: "Club dashboard",
  training_manage: "Training management",
  branding_submit: "Club colours, hero and logo",
  media_submit: "Media and poster submissions",
  roster_manage: "Roster management",
  stats_submit: "Stats and leaderboard submissions",
  player_profile_request: "Official profile requests",
  broadcast_manage: "YouTube Live Studio",
};

export const TEAM_PLAN_PRESETS = {
  club_core: {
    label: "Club Core",
    description: "The standard workspace included with every registered team.",
    capabilities: [...CORE_TEAM_CAPABILITIES],
  },
  club_profile: {
    label: "Club + Profile Requests",
    description: "Core club operations plus governed official player-profile requests.",
    capabilities: [...CORE_TEAM_CAPABILITIES, "player_profile_request"],
  },
  club_broadcast: {
    label: "Club + Broadcast",
    description: "Core club operations plus secure YouTube live production.",
    capabilities: [...CORE_TEAM_CAPABILITIES, "broadcast_manage"],
  },
  club_pro: {
    label: "Club Pro",
    description: "All club operations and both controlled premium upgrades.",
    capabilities: [...TEAM_CAPABILITIES],
  },
} satisfies Record<string, { label: string; description: string; capabilities: readonly TeamCapability[] }>;

export type TeamPlanCode = keyof typeof TEAM_PLAN_PRESETS;

export const TEAM_ROLE_CAPABILITIES: Record<string, readonly TeamCapability[]> = {
  owner: TEAM_CAPABILITIES,
  manager: TEAM_CAPABILITIES,
  coach: CORE_TEAM_CAPABILITIES,
  statistician: ["portal_view", "stats_submit"],
  media: ["portal_view", "branding_submit", "media_submit", "broadcast_manage"],
  viewer: ["portal_view"],
};

export const TEAM_ROLE_LABELS: Record<string, string> = {
  owner: "Club owner",
  manager: "Team manager",
  coach: "Coach",
  statistician: "Statistician",
  media: "Media team",
  viewer: "Viewer",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full club operations, subject to the club's approved premium upgrades.",
  manager: "Full club operations, subject to the club's approved premium upgrades.",
  coach: "Training, roster, team branding, media and verified statistics submissions.",
  statistician: "Statistics and result submissions only. FACKTS still verifies every entry.",
  media: "Club branding and media submissions, plus Live Studio when approved.",
  viewer: "Read-only access to the club workspace.",
};

export function normalizeTeamCapabilities(value: unknown): TeamCapability[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(TEAM_CAPABILITIES);
  return Array.from(new Set(value.map(String).filter((item): item is TeamCapability => allowed.has(item))));
}

export function normalizeTeamPlan(value: unknown): TeamPlanCode {
  const plan = String(value || "").trim();
  if (plan in TEAM_PLAN_PRESETS) return plan as TeamPlanCode;
  if (plan === "performance") return "club_profile";
  if (plan === "broadcast") return "club_pro";
  return "club_core";
}
