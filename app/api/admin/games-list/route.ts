import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("id, opponent, game_date")
      .order("game_date", { ascending: false });

    if (error) {
      console.error("games-list error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ games: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("games-list route crash:", error);
    return NextResponse.json(
      { error: "Failed to load games list." },
      { status: 500 }
    );
  }
}