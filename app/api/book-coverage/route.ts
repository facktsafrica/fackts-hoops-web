import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const scriptUrl = process.env.GOOGLE_SCRIPT_BOOKING_URL;

    if (!scriptUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Script URL is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        ...body,
        source: "FACKTS Hoops Website",
      }),
      cache: "no-store",
    });

    const text = await response.text();

    let result: any = null;

    try {
      result = JSON.parse(text);
    } catch {
      result = { success: response.ok };
    }

    if (!response.ok || result?.success === false) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Submission failed.",
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