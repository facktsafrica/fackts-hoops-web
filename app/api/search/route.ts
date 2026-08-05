import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

const text = (...values: unknown[]) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .join(" ");

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ results: [] });

  const db = createClient(url, key);
  const [players, guests, games, battles, events, records, partners] = await Promise.all([
    db.from("players").select("*").limit(300),
    db.from("guest_hoopers").select("*").limit(300),
    db.from("games").select("*").limit(300),
    db.from("guest_one_on_one_stats").select("*").limit(300),
    db.from("event_case_studies").select("*").eq("is_public", true).limit(100),
    db.from("event_records").select("*").eq("is_public", true).limit(600),
    db.from("partners").select("*").limit(200),
  ]);

  const needle = query.toLocaleLowerCase();
  const matches = (...values: unknown[]) => text(values).toLocaleLowerCase().includes(needle);
  const results: SearchResult[] = [];
  const eventById = new Map((events.data ?? []).map((event: any) => [String(event.event_id), event]));

  for (const player of players.data ?? []) {
    if (!matches(player.full_name, player.name, player.nickname, player.position, player.role, player.jersey_number)) continue;
    const name = player.full_name || player.name || player.nickname || "Player";
    results.push({ id: `player-${player.id}`, type: "Player", title: name, subtitle: text(player.nickname, player.position) || "Official player", href: `/players/${player.id}` });
  }

  for (const guest of guests.data ?? []) {
    if (!matches(guest.full_name, guest.name, guest.nickname, guest.position, guest.role, guest.bio)) continue;
    const name = guest.full_name || guest.name || guest.nickname || "Guest hooper";
    results.push({ id: `guest-${guest.id}`, type: "Guest hooper", title: name, subtitle: text(guest.nickname, guest.position) || "Guest player", href: `/guest-hoopers/${guest.id}` });
  }

  for (const battle of battles.data ?? []) {
    if (!matches(battle.match_title, battle.participant_name, battle.opponent_name, battle.venue, battle.location, battle.notes, battle.match_number)) continue;
    const matchup = battle.match_title || `${battle.participant_name || "Player"} vs ${battle.opponent_name || "Player"}`;
    results.push({ id: `battle-${battle.id}`, type: "1v1", title: matchup, subtitle: text(battle.match_number, battle.status, battle.venue), href: `/one-on-one/${battle.id}` });
  }

  for (const game of games.data ?? []) {
    if (!matches(game.title, game.game_title, game.opponent, game.opponent_name, game.team_name, game.venue, game.location, game.notes)) continue;
    results.push({ id: `game-${game.id}`, type: "Game", title: game.game_title || game.title || `FACKTS vs ${game.opponent || game.opponent_name || game.team_name || "Opponent"}`, subtitle: text(game.status, game.venue || game.location), href: `/games/${game.id}` });
  }

  for (const event of events.data ?? []) {
    if (!matches(event.title, event.summary, event.venue, event.location, event.status)) continue;
    results.push({ id: `event-${event.event_id}`, type: "Event", title: event.title || "FACKTS event", subtitle: text(event.venue, event.location), href: `/events/${event.slug || event.event_id}` });
  }

  for (const record of records.data ?? []) {
    if (!matches(record.title, record.subtitle, record.details, record.division, record.team_name, record.opponent_name, record.metadata)) continue;
    const event: any = eventById.get(String(record.event_id));
    if (!event) continue;
    results.push({ id: `record-${record.id}`, type: record.record_type === "result" ? "Event game" : "Event appearance", title: record.title || record.team_name || record.opponent_name || event.title, subtitle: `${event.title}${record.subtitle ? ` · ${record.subtitle}` : ""}`, href: `/events/${event.slug || event.event_id}?q=${encodeURIComponent(query)}` });
  }

  for (const partner of partners.data ?? []) {
    if (!matches(partner.name, partner.category, partner.role, partner.description, partner.about)) continue;
    results.push({ id: `partner-${partner.id}`, type: "Partner", title: partner.name || "Partner", subtitle: text(partner.category, partner.role), href: `/partners/${partner.id}` });
  }

  const unique = Array.from(new Map(results.map((item) => [`${item.type}-${item.href}-${item.title}`, item])).values());
  return NextResponse.json({ results: unique.slice(0, 24) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
