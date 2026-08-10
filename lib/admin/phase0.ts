import type { AdminCapability, AdminRolePreset } from "@/lib/admin/permissions";

export type AdminAssignment = {
  id: string;
  admin_profile_id: string;
  resource_type: "event" | "game" | "team" | "player" | "media" | "report" | "partner";
  resource_id: string;
  permissions: AdminCapability[];
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type AdminRoleDefinition = {
  role_key: AdminRolePreset;
  label: string;
  permissions: AdminCapability[];
  read_only: boolean;
  requires_scope: boolean;
};

export type LegacyIdentityAlias = {
  id: string;
  canonical_player_id: string;
  legacy_system: "players" | "guest_hoopers" | "public_route" | string;
  legacy_id: string;
  legacy_route_id?: string | null;
  is_primary: boolean;
};

export type MediaAsset = {
  id: string;
  url: string;
  normalized_url: string;
  media_type: "image" | "video" | "audio" | "document" | "embed" | "link" | "other";
  rights_status: "unknown" | "pending" | "approved" | "restricted" | "expired" | "withdrawn";
  publish_status: "draft" | "review" | "published" | "archived";
  is_public: boolean;
  conflict_status: "clear" | "needs_review" | "conflicting_rights" | "duplicate_candidate";
};

export type EventEntry = {
  id: string;
  event_id: string;
  entry_type: "team" | "person";
  team_id?: string | null;
  player_id?: string | null;
  display_name_snapshot: string;
  entry_status: "pending" | "confirmed" | "waitlisted" | "withdrawn" | "disqualified" | "completed";
};

export type ConsentRecord = {
  id: string;
  player_id?: string | null;
  event_id?: string | null;
  consent_status: "pending" | "approved" | "restricted" | "withdrawn" | "expired" | "rejected";
  consent_scopes: string[];
  legacy_self_attested: boolean;
};

export type CorrectionRequest = {
  id: string;
  entity_type: "game" | "player" | "stat" | "team" | "event" | "media" | "other";
  entity_id: string;
  correction_status: "open" | "triaged" | "in_progress" | "resolved" | "rejected" | "cancelled";
  summary: string;
};

export type Phase0ReconciliationReport = {
  generated_at: string;
  public_reads_switched: false;
  legacy_structures_removed: false;
  identity: Record<string, number>;
  participation: Record<string, number>;
  statistics: Record<string, number>;
  one_on_one: Record<string, number>;
  media: Record<string, number>;
  event_operations: Record<string, number>;
  governance: Record<string, number>;
  review_issues: { open: number; blocking: number };
};
