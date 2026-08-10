import { NextResponse } from "next/server";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { getAdminCapabilityAccess } from "@/lib/auth/server";

export async function GET() {
  try {
    const access = await getAdminCapabilityAccess("players", { resourceType: "player", resourceId: "list", write: false });
    if (!access.user) return NextResponse.json({ error: "Sign in to view the admin player list." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to view the admin player list." }, { status: 403 });

    const { data, error } = await access.supabase
      .from("players")
      .select("id, full_name, jersey_number")
      .eq("is_active", true)
      .eq("player_type", FACKTS_PLAYER_TYPE)
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
