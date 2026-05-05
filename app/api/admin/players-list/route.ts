import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, jersey_number")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("players-list error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ players: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("players-list route crash:", error);
    return NextResponse.json(
      { error: "Failed to load players list." },
      { status: 500 }
    );
  }
}