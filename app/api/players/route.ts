import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { validatePlayerMutation } from "@/lib/admin/validation";
import { getAdminCapabilityAccess } from "@/lib/auth/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("player_type", FACKTS_PLAYER_TYPE)
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
    const access = await getAdminCapabilityAccess("players");
    if (!access.user) return NextResponse.json({ error: "Sign in to create players." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to create players." }, { status: 403 });

    const validation = validatePlayerMutation(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
    }

    const { data, error } = await access.supabase
      .from("players")
      .insert([
        {
          ...validation.value,
          player_type: FACKTS_PLAYER_TYPE,
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
    const access = await getAdminCapabilityAccess("players");
    if (!access.user) return NextResponse.json({ error: "Sign in to update players." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to update players." }, { status: 403 });

    const validation = validatePlayerMutation(await request.json(), true);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
    }

    const { id, ...payload } = validation.value;

    const { data, error } = await access.supabase
      .from("players")
      .update(payload)
      .eq("id", id)
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
