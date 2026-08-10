import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateStatsMutation } from "@/lib/admin/validation";
import { getAdminCapabilityAccess } from "@/lib/auth/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game_id = searchParams.get("game_id");
    const player_id = searchParams.get("player_id");

    if (!game_id || !player_id) {
      return NextResponse.json(
        { error: "game_id and player_id are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("player_game_stats")
      .select("*")
      .eq("game_id", game_id)
      .eq("player_id", player_id)
      .maybeSingle();

    if (error) {
      console.error("player_game_stats GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ stat: data ?? null }, { status: 200 });
  } catch (error) {
    console.error("stats GET route crash:", error);
    return NextResponse.json(
      { error: "Something went wrong while loading stats." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getAdminCapabilityAccess("stats");
    if (!access.user) return NextResponse.json({ error: "Sign in to save statistics." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to save statistics." }, { status: 403 });

    const validation = validateStatsMutation(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
    }

    const { data, error } = await access.supabase
      .from("player_game_stats")
      .upsert([validation.value], {
        onConflict: "game_id,player_id",
        ignoreDuplicates: false,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("player_game_stats upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ stat: data }, { status: 200 });
  } catch (error) {
    console.error("stats POST route crash:", error);
    return NextResponse.json(
      { error: "Something went wrong while saving stats." },
      { status: 500 }
    );
  }
}
