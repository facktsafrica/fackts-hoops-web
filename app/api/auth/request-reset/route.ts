import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendResendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function allowedAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

function officialPlayerRole(role?: string | null) {
  const cleanRole = String(role ?? "").toLowerCase();
  return !cleanRole.includes("guest") && !cleanRole.includes("prospect");
}

export async function POST(request: NextRequest) {
  const genericMessage =
    "If that approved account exists, a secure password link has been sent.";

  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ ok: false, message: "Request rejected." }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "player";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (!email.includes("@")) {
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    if (!allowedAttempt(`${ip}:${email}`)) {
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    const admin = createSupabaseAdminClient();
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = usersData.users.find(
      (candidate) => candidate.email?.toLowerCase() === email
    );

    if (!user) {
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    let approved = false;

    if (role === "admin") {
      const { data: profile } = await admin
        .from("admin_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      approved = Boolean(profile);
    } else {
      const { data: player } = await admin
        .from("players")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      approved = Boolean(player && officialPlayerRole(player.role));
    }

    if (!approved) {
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const nextPath = role === "admin" ? "/admin" : "/player";
    const redirectTo = `${siteUrl}/account/update-password?next=${encodeURIComponent(nextPath)}`;
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData.properties?.action_link) {
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    await sendResendEmail({
      to: email,
      subject: "Reset your FACKTS Hoops password",
      text: `Use this secure link to set a new FACKTS Hoops password: ${linkData.properties.action_link}`,
      html: `<div style="font-family:Arial,sans-serif;background:#09090b;color:#fff;padding:28px;border-radius:18px"><p style="color:#fb923c;font-weight:800;letter-spacing:.12em">FACKTS HOOPS</p><h1>Reset your password</h1><p style="color:#d4d4d8;line-height:1.6">Use the secure button below to create a new ${escapeHtml(role)} password.</p><p><a href="${escapeHtml(linkData.properties.action_link)}" style="display:inline-block;background:#f97316;color:#000;padding:13px 20px;border-radius:12px;font-weight:800;text-decoration:none">Set New Password</a></p><p style="color:#71717a;font-size:12px">If you did not request this, ignore this email.</p></div>`,
    });

    return NextResponse.json({ ok: true, message: genericMessage });
  } catch {
    return NextResponse.json({ ok: true, message: genericMessage });
  }
}
