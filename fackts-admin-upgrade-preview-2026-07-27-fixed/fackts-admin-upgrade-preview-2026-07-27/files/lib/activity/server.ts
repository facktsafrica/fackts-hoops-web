import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PlayerActivityInput = {
  playerId: string;
  userId?: string | null;
  playerName: string;
  eventType: string;
  title: string;
  details?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordPlayerActivity(input: PlayerActivityInput) {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("player_activity_events").insert({
      player_id: input.playerId,
      user_id: input.userId || null,
      player_name: input.playerName,
      event_type: input.eventType,
      title: input.title,
      details: input.details || null,
      metadata: input.metadata || {},
    });

    return { recorded: !error, error: error?.message || null };
  } catch (error) {
    return {
      recorded: false,
      error: error instanceof Error ? error.message : "Activity could not be recorded.",
    };
  }
}
