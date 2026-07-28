import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { sendPushToUsers } from "@/lib/notifications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Login required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body.endpoint ?? "").trim();

    if (!endpoint.startsWith("https://")) {
      return NextResponse.json(
        { ok: false, error: "This device does not have a valid push subscription." },
        { status: 400 }
      );
    }

    const result = await sendPushToUsers([user.id], {
      title: "FACKTS notification test",
      body: "Your phone or laptop is connected to FACKTS Hoops alerts.",
      notificationType: "device_test",
      linkUrl: user.user_metadata?.role === "player" ? "/player" : "/admin/notifications",
      tag: `device-test-${user.id}-${Date.now()}`,
    }, { endpoint });

    if (!result.configured) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.reason || "Push notifications are not configured.",
          delivery: result,
        },
        { status: 503 }
      );
    }

    if (result.subscribed === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This device is not registered. Use Repair Notifications, then test again.",
          delivery: result,
        },
        { status: 409 }
      );
    }

    if (result.delivered === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.removed > 0
              ? "This device subscription expired. Use Repair Notifications to reconnect it."
              : "The push provider rejected this device. Use Repair Notifications, then check the browser notification settings.",
          delivery: result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Test accepted for ${result.delivered} device${
        result.delivered === 1 ? "" : "s"
      }.`,
      delivery: result,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "The notification test could not be completed.",
      },
      { status: 500 }
    );
  }
}
