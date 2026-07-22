import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server";
import { getEmailConfiguration, sendResendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

async function authorized() {
  const { user, profile } = await getAdminAccess();
  return Boolean(user && profile);
}

export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json({ ok: false, error: "Admin login required." }, { status: 403 });
  }

  const config = getEmailConfiguration();
  return NextResponse.json({
    ok: true,
    configured: Boolean(config.apiKey && config.from && config.adminEmail),
    has_api_key: Boolean(config.apiKey),
    email_from: config.from || "Not configured",
    admin_email: config.adminEmail || "Not configured",
  });
}

export async function POST() {
  if (!(await authorized())) {
    return NextResponse.json({ ok: false, error: "Admin login required." }, { status: 403 });
  }

  try {
    const config = getEmailConfiguration();
    if (!config.adminEmail) throw new Error("FACKTS_ADMIN_EMAIL is not configured.");

    const result = await sendResendEmail({
      to: config.adminEmail,
      subject: "FACKTS Hoops email test",
      text: "Resend notifications are connected and working for FACKTS Hoops.",
      html: '<div style="font-family:Arial,sans-serif;background:#09090b;color:#fff;padding:28px;border-radius:18px"><p style="color:#fb923c;font-weight:800">FACKTS HOOPS</p><h1>Email is working.</h1><p style="color:#d4d4d8">Resend notifications are connected to the live app.</p></div>',
    });

    return NextResponse.json({ ok: true, message: "Test email sent.", id: result.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Test email failed." },
      { status: 400 }
    );
  }
}
