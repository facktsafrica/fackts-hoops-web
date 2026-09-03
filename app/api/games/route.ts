import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateGameMutation } from "@/lib/admin/validation";
import { getAdminCapabilityAccess } from "@/lib/auth/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .is("archived_at", null)
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
    const access = await getAdminCapabilityAccess("games");
    if (!access.user) return NextResponse.json({ error: "Sign in to create games." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to create games." }, { status: 403 });

    const validation = validateGameMutation(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
    }

    const { data, error } = await access.supabase
      .from("games")
      .insert([validation.value])
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
    const access = await getAdminCapabilityAccess("games");
    if (!access.user) return NextResponse.json({ error: "Sign in to update games." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to update games." }, { status: 403 });

    const validation = validateGameMutation(await request.json(), true);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
    }

    const { id, ...payload } = validation.value;

    const { data, error } = await access.supabase
      .from("games")
      .update(payload)
      .eq("id", id)
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
