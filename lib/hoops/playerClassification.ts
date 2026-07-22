export const FACKTS_PLAYER_TYPE = "fackts_player" as const;
export const LEGACY_GUEST_TYPE = "guest_legacy" as const;
export const PROSPECT_PLAYER_TYPE = "prospect" as const;

export type PlayerClassification =
  | typeof FACKTS_PLAYER_TYPE
  | typeof LEGACY_GUEST_TYPE
  | typeof PROSPECT_PLAYER_TYPE;

type ClassifiablePlayer = {
  player_type?: string | null;
  role?: string | null;
};

export function isOfficialFacktsPlayer(player: ClassifiablePlayer) {
  if (player.player_type) {
    return player.player_type === FACKTS_PLAYER_TYPE;
  }

  // Transitional fallback for a client that loads before the classification
  // migration has been applied. New and migrated records always use player_type.
  const role = String(player.role ?? "").toLowerCase();
  return !role.includes("guest") && !role.includes("external") && !role.includes("prospect");
}
