export const FACKTS_PLAYER_TYPE = "fackts_player" as const;
export const EXTERNAL_PLAYER_TYPE = "external_player" as const;
export const GUEST_HOOPER_TYPE = "guest_hooper" as const;
export const LEGACY_GUEST_TYPE = "guest_legacy" as const;
export const PROSPECT_PLAYER_TYPE = "prospect" as const;

export type PlayerClassification =
  | typeof FACKTS_PLAYER_TYPE
  | typeof EXTERNAL_PLAYER_TYPE
  | typeof GUEST_HOOPER_TYPE
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

export function isGuestLeaderboardPlayer(player: ClassifiablePlayer) {
  return (
    player.player_type === EXTERNAL_PLAYER_TYPE ||
    player.player_type === GUEST_HOOPER_TYPE ||
    player.player_type === LEGACY_GUEST_TYPE
  );
}

export function playerClassificationLabel(playerType?: string | null) {
  if (playerType === EXTERNAL_PLAYER_TYPE) return "External Player";
  if (playerType === GUEST_HOOPER_TYPE || playerType === LEGACY_GUEST_TYPE) {
    return "Guest Hooper";
  }
  if (playerType === PROSPECT_PLAYER_TYPE) return "Prospect";
  return "Official FACKTS Player";
}
