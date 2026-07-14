import { NextResponse } from "next/server";

export const runtime = "nodejs";

type EmailPayload = {
  to?: string | string[] | "admin";
  subject?: string;
  text?: string;
  html?: string;
};

function cleanEmailList(value: unknown, adminEmail: string) {
  if (value === "admin" || !value) return [adminEmail];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.includes("@"));
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.includes("@"));
}

function getErrorMessage(result: any) {
  if (!result) return "Unknown Resend error.";
  if (typeof result.message === "string") return result.message;
  if (typeof result.error === "string") return result.error;
  if (typeof result?.error?.message === "string") return result.error.message;

  try {
    return JSON.stringify(result);
  } catch {
    return "Resend rejected the request.";
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    has_resend_api_key: Boolean(process.env.RESEND_API_KEY),
    admin_email: process.env.FACKTS_ADMIN_EMAIL || "facktsafrica@gmail.com",
    email_from:
      process.env.EMAIL_FROM || "FACKTS Hoops <onboarding@resend.dev>",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmailPayload;

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail =
      process.env.FACKTS_ADMIN_EMAIL || "facktsafrica@gmail.com";
    const from =
      process.env.EMAIL_FROM || "FACKTS Hoops <onboarding@resend.dev>";

    const to = cleanEmailList(body.to, adminEmail);
    const subject = String(body.subject || "").trim();
    const text = String(body.text || "").trim();
    const html = String(body.html || "").trim();

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error:
          "RESEND_API_KEY missing. Add it in Vercel Environment Variables and redeploy.",
      });
    }

    if (to.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No valid recipient email.",
      });
    }

    if (!subject) {
      return NextResponse.json({
        ok: false,
        error: "Email subject missing.",
      });
    }

    if (!text && !html) {
      return NextResponse.json({
        ok: false,
        error: "Email body missing.",
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: text || undefined,
        html: html || undefined,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: getErrorMessage(result),
        details: result,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Email sent.",
      result,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown email error.",
    });
  }
}