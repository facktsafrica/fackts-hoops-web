import { NextResponse } from "next/server";
import { getAdminCapabilityAccess } from "@/lib/auth/server";

export async function GET() {
  try {
    const access = await getAdminCapabilityAccess("games", { resourceType: "game", resourceId: "list", write: false });
    if (!access.user) return NextResponse.json({ error: "Sign in to view the admin game list." }, { status: 401 });
    if (!access.allowed) return NextResponse.json({ error: "You do not have permission to view the admin game list." }, { status: 403 });

    const { data, error } = await access.supabase
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
