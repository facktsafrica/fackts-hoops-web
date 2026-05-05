import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch games error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ games: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("API GET games error:", error);
    return NextResponse.json(
      { error: "Something went wrong while loading games." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          team_name: body.team_name || "FACKTS",
          opponent: body.opponent,
          game_date: body.game_date,
          venue: body.venue || null,
          match_type: body.match_type || null,
          notes: body.notes || null,
          team_score: Number(body.team_score || 0),
          opponent_score: Number(body.opponent_score || 0),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase game insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ game: data }, { status: 200 });
  } catch (error) {
    console.error("Game API POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong while creating game." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Game id is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("games")
      .update({
        team_name: body.team_name || "FACKTS",
        opponent: body.opponent,
        game_date: body.game_date,
        venue: body.venue || null,
        match_type: body.match_type || null,
        notes: body.notes || null,
        team_score: Number(body.team_score || 0),
        opponent_score: Number(body.opponent_score || 0),
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase game update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ game: data }, { status: 200 });
  } catch (error) {
    console.error("Game API PUT error:", error);
    return NextResponse.json(
      { error: "Something went wrong while updating game." },
      { status: 500 }
    );
  }
}