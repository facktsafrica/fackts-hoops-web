import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { sendPushToUsers } from "@/lib/notifications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Login required." },
      { status: 401 }
    );
  }

  try {
    const result = await sendPushToUsers([user.id], {
      title: "FACKTS notification test",
      body: "Your phone or laptop is connected to FACKTS Hoops alerts.",
      notificationType: "device_test",
      linkUrl: user.user_metadata?.role === "player" ? "/player" : "/admin/notifications",
      tag: `device-test-${user.id}-${Date.now()}`,
    });

    if (!result.configured) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Push keys are missing. Add the VAPID variables before testing phone alerts.",
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
            "This account has no active device subscription. Turn notifications off, enable them again, then retest.",
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
            "The push provider did not accept the test. Check browser permission and phone notification settings.",
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
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Push notification test failed.",
      },
      { status: 500 }
    );
  }
}
