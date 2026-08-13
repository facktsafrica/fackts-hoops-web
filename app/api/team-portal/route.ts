import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeamPortalAccess, requireTeamCapability } from "@/lib/team-portal/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function gameTitle(game: JsonRecord) {
  return text(game.title || game.game_title) ||
    `${text(game.home_team_name) || "Home"} vs ${text(game.away_team_name || game.opponent_name || game.opponent) || "Away"}`;
}

function builtInUrl(game: JsonRecord, fields: string[]) {
  for (const field of fields) {
    const value = text(game[field], 4000);
    if (value) return value;
  }
  return "";
}

function roleMatches(value: unknown, roles: string[]) {
  const role = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return roles.includes(role);
}

export async function GET(request: NextRequest) {
  try {
    const requestedTeamId = text(request.nextUrl.searchParams.get("team_id"), 100) || null;
    const access = await getTeamPortalAccess(requestedTeamId);
    if (!access.user) {
      return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    }
    if (!access.allowed || !access.membership || !access.team || !access.subscription) {
      return NextResponse.json(
        { ok: false, error: "This account does not have an active Team Partner Portal assignment." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;
    const [
      rosterResult,
      trainingResult,
      teamGamesResult,
      gamesResult,
      brandingResult,
      mediaSubmissionsResult,
      statsResult,
      profileRequestsResult,
      channelResult,
      broadcastsResult,
    ] = await Promise.all([
      admin.from("team_roster_members").select("*").eq("team_id", teamId).order("display_order").limit(500),
      admin.from("team_training_sessions").select("*").eq("team_id", teamId).order("session_date", { ascending: false }).limit(300),
      admin.from("team_games").select("*").eq("team_id", teamId).order("game_date", { ascending: false }).limit(500),
      admin.from("games").select("*").or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).order("game_date", { ascending: false }).limit(500),
      admin.from("team_branding_submissions").select("*").eq("team_id", teamId).order("created_at", { ascending: false }).limit(30),
      admin.from("team_media_submissions").select("*").eq("team_id", teamId).order("created_at", { ascending: false }).limit(300),
      admin.from("team_stat_submissions").select("*").eq("team_id", teamId).order("created_at", { ascending: false }).limit(100),
      admin.from("team_player_profile_requests").select("*").eq("team_id", teamId).order("created_at", { ascending: false }).limit(100),
      admin.from("team_broadcast_channels").select("id,team_id,provider,channel_id,channel_title,status,connected_at,last_verified_at,token_expires_at").eq("team_id", teamId).maybeSingle(),
      admin.from("team_broadcasts").select("id,team_id,game_id,training_session_id,broadcast_type,title,scheduled_start,privacy_status,status,watch_url,created_at").eq("team_id", teamId).order("scheduled_start", { ascending: false }).limit(100),
    ]);

    for (const result of [rosterResult, trainingResult, teamGamesResult, gamesResult, brandingResult, mediaSubmissionsResult, statsResult, profileRequestsResult, channelResult, broadcastsResult]) {
      if (result.error) throw result.error;
    }

    const canonicalGames = (gamesResult.data ?? []) as JsonRecord[];
    const attachedGames = (teamGamesResult.data ?? []) as JsonRecord[];
    const canonicalIds = new Set(canonicalGames.map((game) => text(game.id)).filter(Boolean));
    const gameIds = Array.from(new Set([
      ...canonicalIds,
      ...attachedGames.map((game) => text(game.game_id)).filter(Boolean),
    ]));

    let links: JsonRecord[] = [];
    let assets: JsonRecord[] = [];
    let legacyMedia: JsonRecord[] = [];
    if (gameIds.length) {
      const [linksResult, legacyMediaResult] = await Promise.all([
        admin.from("media_links").select("*").eq("owner_type", "game").in("owner_id", gameIds).limit(5000),
        admin.from("game_media").select("*").in("game_id", gameIds).limit(5000),
      ]);
      if (linksResult.error) throw linksResult.error;
      if (legacyMediaResult.error) throw legacyMediaResult.error;
      links = (linksResult.data ?? []) as JsonRecord[];
      legacyMedia = (legacyMediaResult.data ?? []) as JsonRecord[];
      const assetIds = Array.from(new Set(links.map((link) => text(link.asset_id)).filter(Boolean)));
      if (assetIds.length) {
        const assetsResult = await admin.from("media_assets").select("*").in("id", assetIds).limit(5000);
        if (assetsResult.error) throw assetsResult.error;
        assets = (assetsResult.data ?? []) as JsonRecord[];
      }
    }

    const assetById = new Map(assets.map((asset) => [text(asset.id), asset]));
    const pendingMedia = (mediaSubmissionsResult.data ?? []) as JsonRecord[];
    const allGameRows: JsonRecord[] = [
      ...canonicalGames,
      ...attachedGames
        .filter((game) => !text(game.game_id) || !canonicalIds.has(text(game.game_id)))
        .map((game): JsonRecord => ({ ...game, id: text(game.game_id) || text(game.id), attached_team_game_id: game.id })),
    ];

    const games = allGameRows.map((game) => {
      const id = text(game.id);
      const gameLinks = links.filter((link) => text(link.owner_id) === id);
      const publicRoles = new Set(
        gameLinks
          .filter((link) => assetById.get(text(link.asset_id))?.is_public === true)
          .map((link) => text(link.link_role).toLowerCase())
      );
      const pendingRoles = new Set(
        pendingMedia
          .filter((submission) => text(submission.owner_type) === "game" && text(submission.owner_id) === id && text(submission.status) === "pending")
          .map((submission) => text(submission.link_role).toLowerCase())
      );
      const gameLegacyMedia = legacyMedia.filter((item) => text(item.game_id) === id && item.is_public !== false);
      const hasLegacyFullGame = gameLegacyMedia.some((item) => roleMatches(item.media_type, ["full_game", "fullgame", "game_video", "video"]));
      const hasLegacyHighlight = gameLegacyMedia.some((item) => roleMatches(item.media_type, ["highlight", "highlights"]));
      return {
        id,
        title: gameTitle(game),
        game_date: game.game_date || game.date || null,
        competition_name: text(game.competition_name || game.match_type) || "FACKTS Hoops",
        status: text(game.status) || "scheduled",
        poster: {
          ready: Boolean(builtInUrl(game, ["poster_url", "game_poster_url", "image_url"])) || publicRoles.has("poster"),
          pending: pendingRoles.has("poster"),
        },
        full_game: {
          ready: Boolean(builtInUrl(game, ["video_url", "game_video_url"])) || publicRoles.has("full_game") || hasLegacyFullGame,
          pending: pendingRoles.has("full_game"),
        },
        highlights: {
          ready: Boolean(builtInUrl(game, ["highlight_url"])) || publicRoles.has("highlight") || publicRoles.has("highlights") || hasLegacyHighlight,
          pending: pendingRoles.has("highlight") || pendingRoles.has("highlights"),
        },
      };
    });

    const mediaSummary = {
      games: games.length,
      missing_posters: games.filter((game) => !game.poster.ready && !game.poster.pending).length,
      missing_full_games: games.filter((game) => !game.full_game.ready && !game.full_game.pending).length,
      missing_highlights: games.filter((game) => !game.highlights.ready && !game.highlights.pending).length,
      pending: pendingMedia.filter((submission) => submission.status === "pending").length,
    };

    return NextResponse.json({
      ok: true,
      portal: {
        team: access.team,
        membership: access.membership,
        subscription: access.subscription,
        capabilities: access.capabilities,
      },
      roster: rosterResult.data ?? [],
      training: trainingResult.data ?? [],
      games,
      media_summary: mediaSummary,
      branding_submissions: brandingResult.data ?? [],
      media_submissions: mediaSubmissionsResult.data ?? [],
      stat_submissions: statsResult.data ?? [],
      profile_requests: profileRequestsResult.data ?? [],
      broadcast_channel: channelResult.data ?? null,
      broadcasts: broadcastsResult.data ?? [],
      leaderboard_links: [
        { title: "FACKTS Kings standings", href: "/competitions/fackts-kings#standings", record_type: "competition" },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Team portal could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as JsonRecord;
    const action = text(body.action, 80);
    const requestedTeamId = text(body.team_id, 100) || null;
    const capability = action === "create_training"
      ? "training_manage"
      : action === "add_roster_member"
        ? "roster_manage"
        : action === "submit_stats"
          ? "stats_submit"
          : action === "request_player_profile"
            ? "player_profile_request"
            : "media_submit";
    const access = await requireTeamCapability(capability, requestedTeamId);
    if (!access.user) return NextResponse.json({ ok: false, error: "Team login required." }, { status: 401 });
    if (!access.permitted || !access.membership) {
      return NextResponse.json({ ok: false, error: "This feature is not active for your team plan and role." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const teamId = access.membership.team_id;

    if (action === "create_training") {
      const title = text(body.title, 180);
      const sessionDate = text(body.session_date, 80);
      if (!title || !sessionDate || Number.isNaN(new Date(sessionDate).getTime())) {
        return NextResponse.json({ ok: false, error: "Training title and date are required." }, { status: 400 });
      }
      const result = await admin.from("team_training_sessions").insert({
        team_id: teamId,
        title,
        session_date: new Date(sessionDate).toISOString(),
        venue: text(body.venue, 180) || null,
        focus_area: text(body.focus_area, 180) || null,
        summary: text(body.summary, 3000) || null,
        is_public: false,
        submitted_by_user_id: access.user.id,
        submission_status: "pending",
      }).select("*").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, item: result.data, message: "Training session saved and sent for publication review." }, { status: 201 });
    }

    if (action === "add_roster_member") {
      const displayName = text(body.display_name, 180);
      if (!displayName) return NextResponse.json({ ok: false, error: "Player name is required." }, { status: 400 });
      const result = await admin.from("team_roster_members").insert({
        team_id: teamId,
        display_name: displayName,
        nickname: text(body.nickname, 120) || null,
        jersey_number: text(body.jersey_number, 24) || null,
        position: text(body.position, 80) || null,
        role: text(body.role, 80) || "Player",
        status: "active",
        is_public: false,
      }).select("*").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, item: result.data, message: "Player added to the private team roster. Super Admin controls official profiling." }, { status: 201 });
    }

    if (action === "submit_stats") {
      const gameId = text(body.game_id, 160);
      if (!gameId) return NextResponse.json({ ok: false, error: "Choose a game." }, { status: 400 });
      const result = await admin.from("team_stat_submissions").insert({
        team_id: teamId,
        game_id: gameId,
        submitted_by_user_id: access.user.id,
        stat_payload: {
          player_name: text(body.player_name, 180),
          points: optionalNumber(body.points),
          rebounds: optionalNumber(body.rebounds),
          assists: optionalNumber(body.assists),
          steals: optionalNumber(body.steals),
          blocks: optionalNumber(body.blocks),
          notes: text(body.notes, 2000),
        },
      }).select("*").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, item: result.data, message: "Stats sent to FACKTS for verification." }, { status: 201 });
    }

    if (action === "request_player_profile") {
      const rosterMemberId = text(body.roster_member_id, 100);
      if (!rosterMemberId) return NextResponse.json({ ok: false, error: "Choose a roster member." }, { status: 400 });
      const rosterMember = await admin.from("team_roster_members").select("id,team_id,player_id,display_name").eq("id", rosterMemberId).eq("team_id", teamId).maybeSingle();
      if (rosterMember.error) throw rosterMember.error;
      if (!rosterMember.data) return NextResponse.json({ ok: false, error: "Roster member not found." }, { status: 404 });
      const result = await admin.from("team_player_profile_requests").insert({
        team_id: teamId,
        roster_member_id: rosterMember.data.id,
        player_id: rosterMember.data.player_id || null,
        submitted_by_user_id: access.user.id,
        requested_changes: {
          display_name: rosterMember.data.display_name,
          position: text(body.position, 80),
          bio: text(body.bio, 3000),
          social_url: text(body.social_url, 500),
          notes: text(body.notes, 2000),
        },
      }).select("*").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, item: result.data, message: "Profile request sent. Only Super Admin can create or change the official player profile." }, { status: 201 });
    }

    if (action === "submit_media_url") {
      const ownerType = text(body.owner_type, 40) === "game" ? "game" : "team";
      const ownerId = ownerType === "game" ? text(body.owner_id, 160) : teamId;
      const url = text(body.url, 4000);
      const title = text(body.title, 240);
      const linkRole = text(body.link_role, 80) || "attachment";
      const mediaType = linkRole === "poster" ? "image" : "video";
      if (!ownerId || !url || !title || !/^https?:\/\//i.test(url)) {
        return NextResponse.json({ ok: false, error: "Title, valid URL and owner are required." }, { status: 400 });
      }
      if (ownerType === "game") {
        const game = await admin.from("games").select("id,home_team_id,away_team_id").eq("id", ownerId).maybeSingle();
        if (game.error) throw game.error;
        if (!game.data || ![game.data.home_team_id, game.data.away_team_id].includes(teamId)) {
          const attached = await admin.from("team_games").select("id").eq("team_id", teamId).eq("game_id", ownerId).maybeSingle();
          if (attached.error) throw attached.error;
          if (!attached.data) return NextResponse.json({ ok: false, error: "That game is not assigned to this team." }, { status: 403 });
        }
      }
      const sourceId = crypto.randomUUID();
      const capture = await admin.rpc("phase0_capture_media", {
        p_source_table: "team_portal_submission",
        p_source_id: sourceId,
        p_url: url,
        p_media_type: mediaType,
        p_title: title,
        p_thumbnail_url: text(body.thumbnail_url, 4000) || null,
        p_owner_type: ownerType,
        p_owner_id: ownerId,
        p_link_role: linkRole,
        p_rights_status: "pending",
        p_metadata: { source: "team_partner_portal", team_id: teamId, submitted_by_user_id: access.user.id },
      });
      if (capture.error) throw capture.error;
      const assetId = text(capture.data, 100);
      const submission = await admin.from("team_media_submissions").insert({
        team_id: teamId,
        asset_id: assetId,
        owner_type: ownerType,
        owner_id: ownerId,
        link_role: linkRole,
        submitted_by_user_id: access.user.id,
      }).select("*").single();
      if (submission.error) throw submission.error;
      return NextResponse.json({ ok: true, item: submission.data, message: "Media saved privately for FACKTS rights and publication review." }, { status: 201 });
    }

    return NextResponse.json({ ok: false, error: "Unsupported team portal action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Team portal update failed." },
      { status: 500 }
    );
  }
}
