import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEmailConfiguration, sendResendEmail } from "@/lib/email/resend";
import { isOfficialFacktsPlayer } from "@/lib/hoops/playerClassification";

export const runtime = "nodejs";

type EmailPayload = {
  to?: string | string[] | "admin";
  subject?: string;
  text?: string;
  html?: string;
};

function cleanRecipients(value: unknown) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  return raw
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => item.includes("@"))
    .slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ ok: false, error: "Request rejected." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
    }

    const [{ data: adminProfile }, { data: player }] = await Promise.all([
      supabase
        .from("admin_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("players")
        .select("id, role, player_type")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    const body = (await request.json()) as EmailPayload;
    const config = getEmailConfiguration();
    const isAdmin = Boolean(adminProfile);
    const isPlayer = Boolean(player && isOfficialFacktsPlayer(player));

    if (!isAdmin && !isPlayer) {
      return NextResponse.json({ ok: false, error: "Approved account required." }, { status: 403 });
    }

    const wantsAdmin = body.to === "admin" || !body.to;
    const recipients = wantsAdmin
      ? config.adminEmail
        ? [config.adminEmail]
        : []
      : cleanRecipients(body.to);

    if (!wantsAdmin && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Only admins can email player recipients." },
        { status: 403 }
      );
    }

    const subject = String(body.subject ?? "").trim().slice(0, 160);
    const text = String(body.text ?? "").trim().slice(0, 4000);

    if (!subject || !text || recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Email recipient, subject, or message is missing." },
        { status: 400 }
      );
    }

    const result = await sendResendEmail({
      to: recipients,
      subject,
      text,
      html: isAdmin ? String(body.html ?? "").slice(0, 12000) || undefined : undefined,
    });

    return NextResponse.json({ ok: true, message: "Email sent.", id: result.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Email failed." },
      { status: 400 }
    );
  }
}
