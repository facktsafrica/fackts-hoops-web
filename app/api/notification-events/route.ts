import { NextResponse, type NextRequest } from "next/server";
import { recordPlayerActivity } from "@/lib/activity/server";
import { canAdmin, type AdminCapability } from "@/lib/admin/permissions";
import { getAdminAccess, getPlayerAccess } from "@/lib/auth/server";
import { notifyAdmins, notifyAllPlayers, notifyPlayers } from "@/lib/notifications/server";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function text(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function dateLabel(value: unknown) {
  const clean = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return "date TBA";

  const date = new Date(`${clean}T12:00:00+03:00`);
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

function capabilityForNotificationEvent(event: string): AdminCapability | null {
  if (event === "admin.broadcast") return "notifications";
  if (event === "admin.game_changed") return "games";
  if (event === "admin.roster_published") return "rosters";
  if (
    event === "admin.matchup_approved" ||
    event === "admin.matchup_rejected"
  ) {
    return "one_on_one";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = text(body.event, 80);
    const admin = createSupabaseAdminClient();

    if (event.startsWith("player.")) {
      const { user, player } = await getPlayerAccess();

      if (!user || !player) {
        return NextResponse.json({ ok: false, error: "Player login required." }, { status: 403 });
      }

      const name = player.full_name || player.name || player.nickname || "A FACKTS player";

      if (event === "player.availability") {
        const date = dateLabel(body.date);
        const time = text(body.time, 80) || "time TBA";
        const court = text(body.court, 120) || "court TBA";

        const result = await notifyAdmins({
          title: `${name} is available`,
          body: `${name} submitted availability for ${date}, ${time}, at ${court}.`,
          notificationType: "player_availability",
          linkUrl: "/admin/calendar",
          tag: `availability-${player.id}`,
        });

        await recordPlayerActivity({
          playerId: player.id,
          userId: user.id,
          playerName: name,
          eventType: "availability_submitted",
          title: "Submitted availability",
          details: `${date}, ${time}, ${court}`,
        });

        return NextResponse.json({ ok: true, ...result });
      }

      if (event === "player.challenge") {
        const opponentId = text(body.opponent_id, 80);
        const { data: opponent } = await admin
          .from("players")
          .select("id, full_name, name, nickname")
          .eq("id", opponentId)
          .eq("player_type", FACKTS_PLAYER_TYPE)
          .eq("is_active", true)
          .maybeSingle();

        const opponentName =
          opponent?.full_name || opponent?.name || opponent?.nickname || "an opponent";
        const date = dateLabel(body.date);

        const result = await notifyAdmins({
          title: "New 1v1 request",
          body: `${name} requested ${opponentName} for ${date}. Admin approval is required.`,
          notificationType: "challenge_requested",
          linkUrl: "/admin/calendar",
          tag: `challenge-${player.id}-${opponentId}`,
        });

        if (opponent?.id) {
          await notifyPlayers([opponent.id], {
            title: `${name} challenged you`,
            body: `A 1v1 request was submitted for ${date}. It will become official after admin approval.`,
            notificationType: "challenge_received",
            linkUrl: "/calendar",
            tag: `challenge-${player.id}-${opponent.id}`,
          });
        }

        await recordPlayerActivity({
          playerId: player.id,
          userId: user.id,
          playerName: name,
          eventType: "challenge_requested",
          title: "Requested a 1v1 matchup",
          details: `${opponentName} - ${date}`,
          metadata: { opponent_id: opponentId },
        });

        return NextResponse.json({ ok: true, ...result });
      }

      if (event === "player.game_response") {
        const gameId = text(body.game_id, 80);
        const status = body.status === "not_available" ? "not available" : "available";
        const { data: game } = await admin
          .from("games")
          .select("id, opponent, opponent_name, game_date, date")
          .eq("id", gameId)
          .maybeSingle();

        const opponent = game?.opponent || game?.opponent_name || "the upcoming game";
        const result = await notifyAdmins({
          title: "Game availability response",
          body: `${name} is ${status} for FACKTS vs ${opponent}.`,
          notificationType: "game_availability",
          linkUrl: "/admin/calendar",
          tag: `game-response-${gameId}-${player.id}`,
        });

        await recordPlayerActivity({
          playerId: player.id,
          userId: user.id,
          playerName: name,
          eventType: "game_response",
          title: "Responded to a game",
          details: `${status} - FACKTS vs ${opponent}`,
          metadata: { game_id: gameId, status },
        });

        return NextResponse.json({ ok: true, ...result });
      }

      if (event === "player.event_response") {
        const eventId = text(body.event_id, 80);
        const status = body.status === "not_available" ? "not available" : "available";
        const { data: calendarEvent } = await admin
          .from("fackts_calendar_events")
          .select("id, title")
          .eq("id", eventId)
          .maybeSingle();

        const result = await notifyAdmins({
          title: "Event availability response",
          body: `${name} is ${status} for ${calendarEvent?.title || "the FACKTS event"}.`,
          notificationType: "event_availability",
          linkUrl: "/admin/calendar",
          tag: `event-response-${eventId}-${player.id}`,
        });

        await recordPlayerActivity({
          playerId: player.id,
          userId: user.id,
          playerName: name,
          eventType: "event_response",
          title: "Responded to an event",
          details: `${status} - ${
            calendarEvent?.title || "FACKTS event"
          }`,
          metadata: { event_id: eventId, status },
        });

        return NextResponse.json({ ok: true, ...result });
      }

      return NextResponse.json({ ok: false, error: "Unknown player event." }, { status: 400 });
    }

    const { user, profile } = await getAdminAccess();
    if (!user || !profile) {
      return NextResponse.json({ ok: false, error: "Admin login required." }, { status: 403 });
    }

    const requiredCapability = capabilityForNotificationEvent(event);
    if (requiredCapability && !canAdmin(profile, requiredCapability)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Your mini-admin account does not have permission for this action.",
        },
        { status: 403 }
      );
    }

    if (event === "admin.matchup_approved" || event === "admin.matchup_rejected") {
      const matchupId = text(body.matchup_id, 80);
      const { data: matchup, error } = await admin
        .from("fackts_matchups")
        .select(
          "id, matchup_status, player_one_source, player_one_id, player_one_name, player_two_source, player_two_id, player_two_name, scheduled_date, scheduled_time, venue"
        )
        .eq("id", matchupId)
        .maybeSingle();

      if (error || !matchup) {
        return NextResponse.json(
          { ok: false, error: error?.message || "Matchup not found." },
          { status: 404 }
        );
      }

      const approved = event === "admin.matchup_approved";
      const playerIds = [
        matchup.player_one_source === "players" ? matchup.player_one_id : "",
        matchup.player_two_source === "players" ? matchup.player_two_id : "",
      ].filter(Boolean);

      const result = await notifyPlayers(playerIds, {
        title: approved ? "Match approved" : "Match request not approved",
        body: approved
          ? `${matchup.player_one_name} vs ${matchup.player_two_name} is approved. ${dateLabel(
              matchup.scheduled_date?.slice(0, 10)
            )}, ${matchup.scheduled_time || "time TBA"}, ${matchup.venue || "court TBA"}.`
          : `${matchup.player_one_name} vs ${matchup.player_two_name} was not approved. Open the player calendar for updates.`,
        notificationType: approved ? "matchup_approved" : "matchup_rejected",
        linkUrl: "/calendar",
        tag: `matchup-${matchup.id}`,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    if (event === "admin.game_changed") {
      const gameId = text(body.game_id, 80);
      const { data: game, error } = await admin
        .from("games")
        .select("id, opponent, opponent_name, game_date, date, venue, location, status")
        .eq("id", gameId)
        .maybeSingle();

      if (error || !game) {
        return NextResponse.json({ ok: false, error: error?.message || "Game not found." }, { status: 404 });
      }

      const result = await notifyAllPlayers({
        title: "FACKTS game update",
        body: `FACKTS vs ${game.opponent || game.opponent_name || "Opponent TBA"}: ${dateLabel(
          (game.game_date || game.date || "").slice(0, 10)
        )}, ${game.venue || game.location || "venue TBA"}.`,
        notificationType: "game_updated",
        linkUrl: `/games/${game.id}`,
        tag: `game-${game.id}`,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    if (event === "admin.roster_published") {
      const gameId = text(body.game_id, 80);
      const [{ data: game }, { data: roster, error }] = await Promise.all([
        admin.from("games").select("id, opponent, opponent_name").eq("id", gameId).maybeSingle(),
        admin.from("game_rosters").select("player_id").eq("game_id", gameId),
      ]);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      const result = await notifyPlayers(
        (roster ?? []).map((row) => String(row.player_id)),
        {
          title: "Game roster published",
          body: `The roster for FACKTS vs ${game?.opponent || game?.opponent_name || "Opponent TBA"} is ready. Check your selection and role.`,
          notificationType: "roster_published",
          linkUrl: `/rosters/${gameId}`,
          tag: `roster-${gameId}`,
        }
      );

      return NextResponse.json({ ok: true, ...result });
    }

    if (event === "admin.broadcast") {
      const title = text(body.title, 80);
      const message = text(body.body, 300);
      const linkUrl = text(body.link_url, 200) || "/player";

      if (!title || !message || !linkUrl.startsWith("/")) {
        return NextResponse.json({ ok: false, error: "Add a title, message and valid app link." }, { status: 400 });
      }

      const result = await notifyAllPlayers({
        title,
        body: message,
        notificationType: "admin_announcement",
        linkUrl,
        tag: `announcement-${Date.now()}`,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, error: "Unknown notification event." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Notification event failed." },
      { status: 500 }
    );
  }
}
