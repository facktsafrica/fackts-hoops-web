import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.game_id || !body.player_id) {
      return NextResponse.json(
        { error: "game_id and player_id are required." },
        { status: 400 }
      );
    }

    const payload = {
      game_id: body.game_id,
      player_id: body.player_id,
      points: Number(body.points || 0),
      rebounds: Number(body.rebounds || 0),
      offensive_rebounds: Number(body.offensive_rebounds || 0),
      defensive_rebounds: Number(body.defensive_rebounds || 0),
      assists: Number(body.assists || 0),
      steals: Number(body.steals || 0),
      blocks: Number(body.blocks || 0),
      turnovers: Number(body.turnovers || 0),
      fouls: Number(body.fouls || 0),
      minutes: Number(body.minutes || 0),
      plus_minus: Number(body.plus_minus || 0),
      q1: Number(body.q1 || 0),
      q2: Number(body.q2 || 0),
      q3: Number(body.q3 || 0),
      q4: Number(body.q4 || 0),
      player_of_game: Boolean(body.player_of_game),
      two_made: Number(body.two_made || 0),
      two_attempted: Number(body.two_attempted || 0),
      three_made: Number(body.three_made || 0),
      three_attempted: Number(body.three_attempted || 0),
      ft_made: Number(body.ft_made || 0),
      ft_attempted: Number(body.ft_attempted || 0),
    };

    const { data, error } = await supabase
      .from("player_game_stats")
      .upsert([payload], {
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
    console.error("stats route crash:", error);
    return NextResponse.json(
      { error: "Something went wrong while saving stats." },
      { status: 500 }
    );
  }
}