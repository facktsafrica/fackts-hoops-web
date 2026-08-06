import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  getPushConfigurationStatus,
} from "@/lib/notifications/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  const configuration = getPushConfigurationStatus();

  if (!user) {
    return NextResponse.json(
      { ok: false, ...configuration, subscribed: false },
      { status: 401 }
    );
  }

  const endpoint = request.nextUrl.searchParams.get("endpoint")?.trim() || "";
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id)
    .eq("enabled", true);

  if (error) {
    return NextResponse.json(
      { ok: false, ...configuration, subscribed: false, error: error.message },
      { status: 400 }
    );
  }

  const subscriptions = data ?? [];

  return NextResponse.json({
    ok: true,
    ...configuration,
    subscribed: Boolean(
      endpoint && subscriptions.some((row) => row.endpoint === endpoint)
    ),
    subscriptionCount: subscriptions.length,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
  }

  const configuration = getPushConfigurationStatus();
  if (!configuration.configured) {
    return NextResponse.json(
      {
        ok: false,
        error: configuration.issue || "Push notifications are not configured yet.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as SubscriptionBody;
  const endpoint = String(body.endpoint ?? "").trim();
  const p256dh = String(body.keys?.p256dh ?? "").trim();
  const auth = String(body.keys?.auth ?? "").trim();

  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json(
      { ok: false, error: "The device returned an invalid push subscription." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent") || null,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const { count } = await admin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("enabled", true);

  return NextResponse.json({
    ok: true,
    message: "Notifications enabled on this device.",
    subscriptionCount: Number(count ?? 0),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as SubscriptionBody;
  const endpoint = String(body.endpoint ?? "").trim();
  const admin = createSupabaseAdminClient();

  if (!endpoint) {
    return NextResponse.json({
      ok: true,
      message: "This device has no saved notification subscription.",
      subscriptionCount: 0,
    });
  }

  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const { count } = await admin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("enabled", true);

  return NextResponse.json({
    ok: true,
    message: "Notifications disabled on this device.",
    subscriptionCount: Number(count ?? 0),
  });
}
