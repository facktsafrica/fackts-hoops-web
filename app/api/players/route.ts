import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Supabase fetch players error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ players: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("API GET players error:", error);
    return NextResponse.json(
      { error: "Something went wrong while loading players." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          full_name: body.full_name,
          jersey_number: body.jersey_number || null,
          position: body.position || null,
          nickname: body.nickname || null,
          role: body.role || "Bench",
          age: body.age || null,
          height: body.height || null,
          dominant_hand: body.dominant_hand || null,
          current_team: body.current_team || null,
          previous_teams: body.previous_teams || null,
          highest_level: body.highest_level || null,
          years_played: body.years_played || null,
          style_of_play: body.style_of_play || null,
          strengths: body.strengths || null,
          improvements: body.improvements || null,
          instagram: body.instagram || null,
          tiktok: body.tiktok || null,
          x_handle: body.x_handle || null,
          followers_range: body.followers_range || null,
          photo_url: body.photo_url || null,
          is_active: true,
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ player: data }, { status: 200 });
  } catch (error) {
    console.error("API POST players error:", error);
    return NextResponse.json(
      { error: "Something went wrong while creating player." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Player id is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("players")
      .update({
        full_name: body.full_name,
        jersey_number: body.jersey_number || null,
        position: body.position || null,
        nickname: body.nickname || null,
        role: body.role || "Bench",
        age: body.age || null,
        height: body.height || null,
        dominant_hand: body.dominant_hand || null,
        current_team: body.current_team || null,
        previous_teams: body.previous_teams || null,
        highest_level: body.highest_level || null,
        years_played: body.years_played || null,
        style_of_play: body.style_of_play || null,
        strengths: body.strengths || null,
        improvements: body.improvements || null,
        instagram: body.instagram || null,
        tiktok: body.tiktok || null,
        x_handle: body.x_handle || null,
        followers_range: body.followers_range || null,
        photo_url: body.photo_url || null,
      })
      .eq("id", body.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "No player row was returned after update. Check RLS/policies." },
        { status: 400 }
      );
    }

    return NextResponse.json({ player: data }, { status: 200 });
  } catch (error) {
    console.error("API PUT players error:", error);
    return NextResponse.json(
      { error: "Something went wrong while updating player." },
      { status: 500 }
    );
  }
}