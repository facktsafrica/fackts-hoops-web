import webpush, { type PushSubscription } from "web-push";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { resolveVapidConfiguration } from "@/lib/notifications/vapid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AppNotification = {
  title: string;
  body: string;
  notificationType: string;
  linkUrl: string;
  tag?: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushDeliveryLog = {
  user_id: string;
  subscription_id: string;
  notification_type: string;
  title: string;
  delivery_status: "delivered" | "failed" | "expired";
  status_code: number | null;
  error_message: string | null;
};

type PlayerRecipient = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
};

type PushTarget = {
  endpoint?: string;
};

export function getPushConfigurationStatus() {
  const result = resolveVapidConfiguration();
  return {
    configured: Boolean(result.configuration),
    publicKey: result.configuration?.publicKey || "",
    issue: result.issue,
  };
}

export function pushDeliveryConfigured() {
  return getPushConfigurationStatus().configured;
}

export async function sendPushToUsers(
  userIds: Array<string | null | undefined>,
  notification: AppNotification,
  target: PushTarget = {}
) {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  const vapid = resolveVapidConfiguration();

  if (ids.length === 0) {
    return {
      attempted: 0,
      subscribed: 0,
      delivered: 0,
      failed: 0,
      removed: 0,
      configured: Boolean(vapid.configuration),
      reason: "No linked user accounts were found.",
    };
  }

  if (!vapid.configuration) {
    return {
      attempted: 0,
      subscribed: 0,
      delivered: 0,
      failed: 0,
      removed: 0,
      configured: false,
      reason: vapid.issue || "Push notifications are not configured.",
    };
  }

  const admin = createSupabaseAdminClient();
  let subscriptionQuery = admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", ids)
    .eq("enabled", true);

  if (target.endpoint) {
    subscriptionQuery = subscriptionQuery.eq("endpoint", target.endpoint);
  }

  const { data, error } = await subscriptionQuery;

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PushSubscriptionRow[];
  const expiredIds: string[] = [];
  const deliveryLogs: PushDeliveryLog[] = [];
  let delivered = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      try {
        const response = await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: notification.title,
            body: notification.body,
            url: notification.linkUrl,
            tag: notification.tag || notification.notificationType,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
          })
        );
        delivered += 1;
        deliveryLogs.push({
          user_id: row.user_id,
          subscription_id: row.id,
          notification_type: notification.notificationType,
          title: notification.title,
          delivery_status: "delivered",
          status_code: response.statusCode || 201,
          error_message: null,
        });
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        const expired = statusCode === 404 || statusCode === 410;

        if (expired) {
          expiredIds.push(row.id);
        }
        failed += 1;

        deliveryLogs.push({
          user_id: row.user_id,
          subscription_id: row.id,
          notification_type: notification.notificationType,
          title: notification.title,
          delivery_status: expired ? "expired" : "failed",
          status_code: statusCode || null,
          error_message:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Push provider rejected the notification.",
        });
      }
    })
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  if (deliveryLogs.length > 0) {
    await admin.from("push_delivery_logs").insert(deliveryLogs).then(
      () => undefined,
      () => undefined
    );
  }

  return {
    attempted: rows.length,
    subscribed: rows.length,
    delivered,
    failed,
    removed: expiredIds.length,
    configured: true,
    reason:
      rows.length === 0
        ? "No active push subscription exists for the selected account."
        : null,
  };
}

function playerName(player: PlayerRecipient) {
  return player.full_name || player.name || player.nickname || "FACKTS Player";
}

export async function notifyPlayers(
  playerIds: string[],
  notification: AppNotification
) {
  const ids = Array.from(new Set(playerIds.filter(Boolean)));
  if (ids.length === 0) {
    return {
      created: 0,
      attempted: 0,
      subscribed: 0,
      delivered: 0,
      failed: 0,
      removed: 0,
      configured: pushDeliveryConfigured(),
      reason: "No eligible players were selected.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("players")
    .select("id, user_id, full_name, name, nickname, email, phone")
    .in("id", ids)
    .eq("player_type", FACKTS_PLAYER_TYPE)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const players = (data ?? []) as PlayerRecipient[];

  if (players.length > 0) {
    const { error: insertError } = await admin.from("fackts_notifications").insert(
      players.map((player) => ({
        recipient_role: "player",
        recipient_source: "players",
        recipient_id: player.id,
        recipient_name: playerName(player),
        recipient_email: player.email || null,
        recipient_phone: player.phone || null,
        title: notification.title,
        body: notification.body,
        notification_type: notification.notificationType,
        link_url: notification.linkUrl,
        is_read: false,
      }))
    );

    if (insertError) {
      throw new Error(
        insertError.message.includes("fackts_notifications")
          ? "Notification database is not installed. Run the included admin-upgrade SQL."
          : insertError.message
      );
    }
  }

  const push = await sendPushToUsers(
    players.map((player) => player.user_id),
    notification
  );

  return { created: players.length, ...push };
}

export async function notifyAllPlayers(notification: AppNotification) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("players")
    .select("id")
    .not("user_id", "is", null)
    .eq("player_type", FACKTS_PLAYER_TYPE)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  return notifyPlayers(
    (data ?? []).map((player) => String(player.id)),
    notification
  );
}

export async function notifyAdmins(notification: AppNotification) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("admin_profiles")
    .select("id, user_id, role")
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const admins = data ?? [];

  if (admins.length > 0) {
    const { error: insertError } = await admin.from("fackts_notifications").insert(
      admins.map((profile) => ({
        recipient_role: "admin",
        recipient_source: "admin_profiles",
        recipient_id: profile.id,
        recipient_name: profile.role || "FACKTS Admin",
        recipient_email: null,
        recipient_phone: null,
        title: notification.title,
        body: notification.body,
        notification_type: notification.notificationType,
        link_url: notification.linkUrl,
        is_read: false,
      }))
    );

    if (insertError) {
      throw new Error(
        insertError.message.includes("fackts_notifications")
          ? "Notification database is not installed. Run the included admin-upgrade SQL."
          : insertError.message
      );
    }
  }

  const push = await sendPushToUsers(
    admins.map((profile) => profile.user_id),
    notification
  );

  return { created: admins.length, ...push };
}
