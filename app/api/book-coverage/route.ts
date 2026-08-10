import { NextResponse } from "next/server";

type BookingPayload = Record<string, unknown>;

function readString(payload: BookingPayload, key: string, maxLength = 500) {
  const value = payload[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readStringArray(
  payload: BookingPayload,
  key: string,
  maxItems = 12,
  maxLength = 100
) {
  const value = payload[key];
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function readPositiveInteger(payload: BookingPayload, key: string, max: number) {
  const value = Number(payload[key]);
  return Number.isInteger(value) && value > 0 && value <= max ? value : null;
}

export async function POST(request: Request) {
  try {
    const scriptUrl = process.env.GOOGLE_SCRIPT_BOOKING_URL;

    if (!scriptUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Online booking is temporarily unavailable. Please use WhatsApp or call FACKTS.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as BookingPayload;

    // A silent honeypot keeps ordinary form spam away without adding friction.
    if (readString(body, "companyWebsite", 200)) {
      return NextResponse.json({ success: true });
    }

    const organizer =
      readString(body, "organizer", 120) || readString(body, "name", 120);
    const contactName = readString(body, "contactName", 100);
    const phone = readString(body, "phone", 30);
    const email = readString(body, "email", 160);
    const eventName = readString(body, "eventName", 140);
    const eventDate =
      readString(body, "eventDate", 20) || readString(body, "date", 20);
    const eventFormat = readString(body, "eventFormat", 80);
    const teamCount = readPositiveInteger(body, "teamCount", 500);
    const gameCount = readPositiveInteger(body, "gameCount", 1000);
    const venue = readString(body, "venue", 160);
    const city = readString(body, "city", 100);
    const mediaNeeds = readStringArray(body, "mediaNeeds");
    const legacyCoverageType = readString(body, "coverageType", 300);
    const statisticsLevel = readString(body, "statisticsLevel", 100);
    const budgetRange = readString(body, "budgetRange", 100);
    const decisionTimeline = readString(body, "decisionTimeline", 100);
    const details = readString(body, "details", 1800);

    if (!organizer || !contactName || !eventName || !eventDate || !venue) {
      return NextResponse.json(
        { success: false, error: "Please complete all required organizer and event details." },
        { status: 400 }
      );
    }

    if (!phone && !email) {
      return NextResponse.json(
        { success: false, error: "Please enter either a phone number or email address." },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!teamCount || !gameCount) {
      return NextResponse.json(
        { success: false, error: "Please enter valid team and game numbers." },
        { status: 400 }
      );
    }

    const selectedServices =
      mediaNeeds.length > 0
        ? mediaNeeds
        : legacyCoverageType
          ? [legacyCoverageType]
          : [];

    if (selectedServices.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one coverage service." },
        { status: 400 }
      );
    }

    const legacyDetails = [
      `Event: ${eventName}`,
      `Contact person: ${contactName}`,
      `Format: ${eventFormat || "Not provided"}`,
      `Teams / participants: ${teamCount}`,
      `Expected games: ${gameCount}`,
      `Town / county: ${city || "Not provided"}`,
      `Services: ${selectedServices.join(", ")}`,
      `Statistics level: ${statisticsLevel || "Not provided"}`,
      `Budget range: ${budgetRange || "Not provided"}`,
      `Decision timeline: ${decisionTimeline || "Not provided"}`,
      `Additional notes: ${details || "Not provided"}`,
    ].join("\n");

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        source: "FACKTS Hoops Website",
        submittedAt: new Date().toISOString(),
        organizer,
        contactName,
        phone,
        email,
        eventName,
        eventDate,
        eventFormat,
        teamCount,
        gameCount,
        venue,
        city,
        mediaNeeds: selectedServices,
        statisticsLevel,
        budgetRange,
        decisionTimeline,
        additionalDetails: details,

        // Keep the original sheet fields populated for backwards compatibility.
        name: organizer,
        coverageType: selectedServices.join(", "),
        date: eventDate,
        details: legacyDetails,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const text = await response.text();
    let result: { success?: boolean; error?: string } = { success: response.ok };

    try {
      result = JSON.parse(text) as { success?: boolean; error?: string };
    } catch {
      // Some Apps Script deployments return a non-JSON acknowledgement.
    }

    if (!response.ok || result.success === false) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "The coverage request could not be saved.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        success: false,
        error: timedOut
          ? "The booking service took too long to respond. Please try WhatsApp or call FACKTS."
          : "The coverage request could not be sent. Please try WhatsApp or call FACKTS.",
      },
      { status: 500 }
    );
  }
}
