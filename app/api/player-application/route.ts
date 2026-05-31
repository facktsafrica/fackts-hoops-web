import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const scriptUrl =
      process.env.GOOGLE_SCRIPT_PLAYER_APPLICATION_URL ||
      process.env.GOOGLE_SCRIPT_BOOKING_URL;

    if (!scriptUrl || scriptUrl.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Script URL is not configured. Add GOOGLE_SCRIPT_BOOKING_URL to .env.local and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await fetch(scriptUrl.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        ...body,
        formType: "player_application",
        source: "FACKTS Hoops Website",
      }),
      cache: "no-store",
    });

    const text = await response.text();

    let result: any = null;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        success: response.ok,
        raw: text,
      };
    }

    if (!response.ok || result?.success === false) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Player application submission failed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Something went wrong.",
      },
      { status: 500 }
    );
  }
}