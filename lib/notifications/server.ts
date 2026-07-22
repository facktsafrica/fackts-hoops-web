import webpush, { type PushSubscription } from "web-push";
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

type PlayerRecipient = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
};

function configuredVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:facktsafrica@gmail.com";

  if (!publicKey || !privateKey) return null;

  return { publicKey, privateKey, subject };
}

export function pushDeliveryConfigured() {
  return Boolean(configuredVapid());
}

export async function sendPushToUsers(
  userIds: Array<string | null | undefined>,
  notification: AppNotification
) {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  const vapid = configuredVapid();

  if (ids.length === 0 || !vapid) {
    return { delivered: 0, removed: 0, configured: Boolean(vapid) };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", ids)
    .eq("enabled", true);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PushSubscriptionRow[];
  const expiredIds: string[] = [];
  let delivered = 0;

  await Promise.all(
    rows.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      try {
        await webpush.sendNotification(
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
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(row.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return {
    delivered,
    removed: expiredIds.length,
    configured: true,
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
  if (ids.length === 0) return { created: 0, delivered: 0 };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("players")
    .select("id, user_id, full_name, name, nickname, email, phone")
    .in("id", ids)
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

    if (insertError) throw new Error(insertError.message);
  }

  const push = await sendPushToUsers(
    players.map((player) => player.user_id),
    notification
  );

  return { created: players.length, delivered: push.delivered };
}

export async function notifyAllPlayers(notification: AppNotification) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("players")
    .select("id")
    .not("user_id", "is", null)
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

    if (insertError) throw new Error(insertError.message);
  }

  const push = await sendPushToUsers(
    admins.map((profile) => profile.user_id),
    notification
  );

  return { created: admins.length, delivered: push.delivered };
}
