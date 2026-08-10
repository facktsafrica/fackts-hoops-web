import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminCapability } from "@/lib/admin/permissions";

type AuditEvent = {
  action: string;
  entityType: string;
  entityId?: string | null;
  capability?: AdminCapability | null;
  resourceType?: string | null;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
};

export async function recordAdminAuditEvent(
  supabase: SupabaseClient,
  event: AuditEvent
) {
  const result = await supabase.rpc("record_admin_audit_event", {
    p_action: event.action,
    p_entity_type: event.entityType,
    p_entity_id: event.entityId ?? null,
    p_capability: event.capability ?? null,
    p_resource_type: event.resourceType ?? null,
    p_resource_id: event.resourceId ?? null,
    p_before_data: event.before ?? null,
    p_after_data: event.after ?? null,
    p_metadata: event.metadata ?? {},
    p_request_id: event.requestId ?? null,
  });

  if (result.error && result.error.code !== "PGRST202") {
    throw new Error(`Admin audit event failed: ${result.error.message}`);
  }

  return result.data as string | null;
}
