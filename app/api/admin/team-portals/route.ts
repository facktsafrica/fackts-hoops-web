import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CORE_TEAM_CAPABILITIES,
  normalizeTeamCapabilities,
  normalizeTeamPlan,
  TEAM_PLAN_PRESETS,
  type TeamPlanCode,
} from "@/lib/team-portal/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function password() {
  return `FacktsTeam!${randomBytes(8).toString("base64url")}`;
}

async function superAdminAccess() {
  const access = await getAdminAccess();
  return { ...access, allowed: Boolean(access.user && access.profile && isSuperAdmin(access.profile)) };
}

export async function GET() {
  const access = await superAdminAccess();
  if (!access.allowed) return NextResponse.json({ ok: false, error: "Super Admin access required." }, { status: 403 });
  try {
    const admin = createSupabaseAdminClient();
    const [teams, subscriptions, memberships, branding, media, stats, profiles, training, channels, leagues, leagueMemberships, games, rosterMembers] = await Promise.all([
      admin.from("team_profiles").select("id,slug,name,short_name,logo_url,cover_image_url,primary_color,secondary_color,verification_status,is_public").order("name"),
      admin.from("team_subscriptions").select("*").order("updated_at", { ascending: false }),
      admin.from("team_portal_memberships").select("*").order("created_at", { ascending: false }),
      admin.from("team_branding_submissions").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_media_submissions").select("*,media_assets(id,title,url,media_type,rights_status,publish_status,is_public,metadata)").eq("status", "pending").order("created_at"),
      admin.from("team_stat_submissions").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_player_profile_requests").select("*").eq("status", "pending").order("created_at"),
      admin.from("team_training_sessions").select("*").eq("submission_status", "pending").order("created_at"),
      admin.from("team_broadcast_channels").select("id,team_id,provider,channel_id,channel_title,status,connected_at,last_verified_at").order("connected_at", { ascending: false }),
      admin.from("leagues").select("*").order("display_order").order("name"),
      admin.from("team_league_memberships").select("*,leagues(id,slug,name,short_name)").order("created_at", { ascending: false }),
      admin.from("games").select("id,title,game_title,game_date,status,home_team_id,away_team_id,home_team_name,away_team_name").order("game_date", { ascending: false }).limit(1000),
      admin.from("team_roster_members").select("id,team_id,player_id,display_name,nickname,jersey_number,status").eq("status", "active").order("display_name").limit(5000),
    ]);
    for (const result of [teams, subscriptions, memberships, branding, media, stats, profiles, training, channels, leagues, leagueMemberships, games, rosterMembers]) {
      if (result.error) throw result.error;
    }
    return NextResponse.json({
      ok: true,
      teams: teams.data ?? [],
      subscriptions: subscriptions.data ?? [],
      memberships: memberships.data ?? [],
      queues: {
        branding: branding.data ?? [],
        media: media.data ?? [],
        stats: stats.data ?? [],
        profiles: profiles.data ?? [],
        training: training.data ?? [],
      },
      channels: channels.data ?? [],
      leagues: leagues.data ?? [],
      league_memberships: leagueMemberships.data ?? [],
      games: games.data ?? [],
      roster_members: rosterMembers.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Club Portals could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await superAdminAccess();
  if (!access.allowed || !access.profile) return NextResponse.json({ ok: false, error: "Super Admin access required." }, { status: 403 });
  try {
    const body = await request.json() as JsonRecord;
    const action = text(body.action, 80);
    const teamId = text(body.team_id, 100);
    if (!teamId) return NextResponse.json({ ok: false, error: "Choose a team." }, { status: 400 });
    const admin = createSupabaseAdminClient();

    if (action === "assign_league") {
      const leagueId = text(body.league_id, 100);
      const seasonLabel = text(body.season_label, 80) || "Current season";
      const division = text(body.division, 100) || "Open";
      const membershipStatus = ["active", "inactive", "promoted", "relegated", "withdrawn"].includes(text(body.membership_status, 30))
        ? text(body.membership_status, 30)
        : "active";
      if (!leagueId) return NextResponse.json({ ok: false, error: "Choose a league." }, { status: 400 });
      const result = await admin.from("team_league_memberships").upsert({
        team_id: teamId,
        league_id: leagueId,
        season_label: seasonLabel,
        division,
        status: membershipStatus,
        is_public: body.is_public !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "league_id,team_id,season_label,division" }).select("*,leagues(id,slug,name,short_name)").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, league_membership: result.data, message: "League placement saved. The team now appears in that public league portal." });
    }

    if (action === "remove_league") {
      const membershipId = text(body.membership_id, 100);
      if (!membershipId) return NextResponse.json({ ok: false, error: "Choose a league placement." }, { status: 400 });
      const result = await admin.from("team_league_memberships").delete().eq("id", membershipId).eq("team_id", teamId);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "League placement removed." });
    }

    if (action === "update_subscription") {
      const plan = normalizeTeamPlan(body.plan_code) as TeamPlanCode;
      if (!(plan in TEAM_PLAN_PRESETS)) return NextResponse.json({ ok: false, error: "Choose a valid plan." }, { status: 400 });
      const status = ["trial", "active", "paused", "expired", "cancelled"].includes(text(body.status, 30)) ? text(body.status, 30) : "paused";
      const capabilities = normalizeTeamCapabilities(body.enabled_capabilities);
      CORE_TEAM_CAPABILITIES.forEach((capability) => {
        if (!capabilities.includes(capability)) capabilities.push(capability);
      });
      const result = await admin.from("team_subscriptions").upsert({
        team_id: teamId,
        plan_code: plan,
        status,
        enabled_capabilities: capabilities,
        starts_at: status === "active" || status === "trial" ? new Date().toISOString() : null,
        approved_by: access.profile.id,
        approved_at: new Date().toISOString(),
        notes: text(body.notes, 2000) || null,
      }, { onConflict: "team_id" }).select("*").single();
      if (result.error) throw result.error;
      await recordAdminAuditEvent(access.supabase, {
        action: "update_team_subscription",
        entityType: "team",
        entityId: teamId,
        capability: "teams",
        after: result.data,
        metadata: { source: "club_portal_admin" },
      });
      return NextResponse.json({ ok: true, subscription: result.data, message: "Club upgrades updated. Core team operations remain active." });
    }

    if (action === "issue_account") {
      const email = text(body.email, 320).toLowerCase();
      const role = ["owner", "manager", "coach", "statistician", "media", "viewer"].includes(text(body.role, 40)) ? text(body.role, 40) : "manager";
      if (!email.includes("@")) return NextResponse.json({ ok: false, error: "Enter a valid team account email." }, { status: 400 });
      const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (users.error) throw users.error;
      let authUser = users.data.users.find((user: { id: string; email?: string | null }) => user.email?.toLowerCase() === email) || null;
      const resetPassword = body.reset_password === true;
      let temporaryPassword: string | null = null;
      let accountCreated = false;
      if (authUser) {
        const [adminProfile, player] = await Promise.all([
          admin.from("admin_profiles").select("id").eq("user_id", authUser.id).maybeSingle(),
          admin.from("players").select("id").eq("user_id", authUser.id).maybeSingle(),
        ]);
        if (adminProfile.error) throw adminProfile.error;
        if (player.error) throw player.error;
        if (adminProfile.data || player.data) {
          return NextResponse.json({ ok: false, error: "That email already belongs to an Admin or Player account. Use a dedicated team email." }, { status: 409 });
        }
        if (resetPassword) temporaryPassword = password();
        const updated = await admin.auth.admin.updateUserById(authUser.id, {
          ...(temporaryPassword ? { password: temporaryPassword } : {}),
          email_confirm: true,
          user_metadata: { role: "team_club" },
        });
        if (updated.error) throw updated.error;
      } else {
        temporaryPassword = password();
        const created = await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "team_club" },
        });
        if (created.error || !created.data.user) throw created.error || new Error("Team account could not be created.");
        authUser = created.data.user;
        accountCreated = true;
      }
      const membership = await admin.from("team_portal_memberships").upsert({
        team_id: teamId,
        user_id: authUser.id,
        role,
        status: "active",
        display_name: text(body.display_name, 180) || null,
        invited_email: email,
        approved_by: access.profile.id,
        approved_at: new Date().toISOString(),
      }, { onConflict: "team_id,user_id" }).select("*").single();
      if (membership.error) throw membership.error;
      const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
      return NextResponse.json({
        ok: true,
        membership: membership.data,
        credentials: temporaryPassword ? { email, temporary_password: temporaryPassword, login_url: `${siteUrl}/team-portal/login` } : null,
        message: accountCreated || resetPassword
          ? "Team access assigned. Send the temporary login securely. If this person manages another club, use the same email there and keep its password unchanged."
          : "Existing portal account assigned to this team. Its current password was preserved, and a club selector will appear after login.",
      }, { status: 201 });
    }

    if (action === "revoke_account") {
      const membershipId = text(body.membership_id, 100);
      const result = await admin.from("team_portal_memberships").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", membershipId).eq("team_id", teamId).select("*").maybeSingle();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "Club Portal membership revoked." });
    }

    if (action === "review_submission") {
      const queue = text(body.queue, 40);
      const id = text(body.id, 100);
      const decision = text(body.decision, 30) === "approve" ? "approved" : "rejected";
      const review = { status: decision, review_note: text(body.review_note, 2000) || null, reviewed_by: access.profile.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (!id) return NextResponse.json({ ok: false, error: "Submission is required." }, { status: 400 });

      if (queue === "branding") {
        const current = await admin.from("team_branding_submissions").select("*").eq("id", id).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Branding submission not found." }, { status: 404 });
        if (decision === "approved") {
          const field = current.data.asset_type === "logo" ? "logo_url" : "cover_image_url";
          const profile = await admin.from("team_profiles").update({ [field]: current.data.file_url, updated_at: new Date().toISOString() }).eq("id", teamId);
          if (profile.error) throw profile.error;
        }
        const saved = await admin.from("team_branding_submissions").update(review).eq("id", id);
        if (saved.error) throw saved.error;
      } else if (queue === "training") {
        const saved = await admin.from("team_training_sessions").update({
          submission_status: decision === "approved" ? "published" : "rejected",
          is_public: decision === "approved",
          review_note: review.review_note,
          reviewed_by: review.reviewed_by,
          reviewed_at: review.reviewed_at,
          updated_at: review.updated_at,
        }).eq("id", id).eq("team_id", teamId);
        if (saved.error) throw saved.error;
      } else if (queue === "media") {
        const current = await admin.from("team_media_submissions").select("*,media_assets(*)").eq("id", id).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Media submission not found." }, { status: 404 });
        if (decision === "approved") {
          const metadata = current.data.media_assets?.metadata && typeof current.data.media_assets.metadata === "object" ? current.data.media_assets.metadata : {};
          const asset = await admin.from("media_assets").update({
            rights_status: "approved",
            publish_status: "published",
            health_status: "healthy",
            conflict_status: "clear",
            is_public: true,
            updated_by: access.profile.id,
            metadata: { ...metadata, no_identifiable_people_confirmed: body.no_identifiable_people_confirmed === true, reviewed_from: "club_portal" },
          }).eq("id", current.data.asset_id).select("url").single();
          if (asset.error) {
            const message = asset.error.message.includes("MEDIA_SUBJECT_CONSENT_REQUIRED")
              ? "This media cannot publish until every identified player has current evidence-backed consent."
              : asset.error.message.includes("MEDIA_SUBJECT_REVIEW_REQUIRED")
                ? "Identify the people in this media, or confirm that no identifiable people appear."
                : asset.error.message;
            return NextResponse.json({ ok: false, error: message }, { status: 409 });
          }
          if (current.data.owner_type === "game" && current.data.link_role === "poster") {
            const gameUpdate = await admin.from("games").update({ poster_url: asset.data.url }).eq("id", current.data.owner_id);
            if (gameUpdate.error) throw gameUpdate.error;
          }
        } else {
          const asset = await admin.from("media_assets").update({ publish_status: "archived", is_public: false, updated_by: access.profile.id }).eq("id", current.data.asset_id);
          if (asset.error) throw asset.error;
        }
        const saved = await admin.from("team_media_submissions").update(review).eq("id", id);
        if (saved.error) throw saved.error;
      } else if (queue === "stats") {
        const current = await admin.from("team_stat_submissions").select("*").eq("id", id).eq("team_id", teamId).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) return NextResponse.json({ ok: false, error: "Stats submission not found." }, { status: 404 });
        const payload = current.data.stat_payload && typeof current.data.stat_payload === "object" ? current.data.stat_payload as JsonRecord : {};
        if (decision === "approved" && text(payload.submission_type, 60) === "game_result") {
          const teamScore = Number(payload.team_score);
          const opponentScore = Number(payload.opponent_score);
          const leagueId = text(payload.league_id, 100);
          const opponentName = text(payload.opponent_name, 180);
          const gameDate = text(payload.game_date, 80);
          if (!Number.isInteger(teamScore) || !Number.isInteger(opponentScore) || teamScore < 0 || opponentScore < 0 || teamScore === opponentScore) {
            return NextResponse.json({ ok: false, error: "This basketball result needs valid scores and an overtime winner before approval." }, { status: 409 });
          }
          const [teamProfile, leagueMembership] = await Promise.all([
            admin.from("team_profiles").select("name").eq("id", teamId).maybeSingle(),
            admin.from("team_league_memberships").select("id").eq("team_id", teamId).eq("league_id", leagueId).neq("status", "withdrawn").limit(1).maybeSingle(),
          ]);
          if (teamProfile.error) throw teamProfile.error;
          if (leagueMembership.error) throw leagueMembership.error;
          if (!teamProfile.data || !leagueMembership.data) return NextResponse.json({ ok: false, error: "The team or league placement is no longer active." }, { status: 409 });
          const teamGame = await admin.from("team_games").upsert({
            team_id: teamId,
            league_id: leagueId,
            source_submission_id: current.data.id,
            title: `${teamProfile.data.name} vs ${opponentName}`,
            competition_name: text(payload.league_name, 180) || "League",
            opponent_name: opponentName,
            game_date: gameDate,
            venue: text(payload.venue, 180) || null,
            status: "completed",
            team_score: teamScore,
            opponent_score: opponentScore,
            result: teamScore > opponentScore ? "W" : "L",
            is_public: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "source_submission_id" });
          if (teamGame.error) throw teamGame.error;
        }
        if (text(payload.submission_type, 60) === "team_stat_session") {
          const sessionId = text(payload.session_id, 100);
          const [sessionResult, linesResult] = await Promise.all([
            admin.from("team_stat_sessions").select("*").eq("id", sessionId).eq("team_id", teamId).maybeSingle(),
            admin.from("team_player_stat_lines").select("*").eq("session_id", sessionId).eq("team_id", teamId),
          ]);
          if (sessionResult.error) throw sessionResult.error;
          if (linesResult.error) throw linesResult.error;
          if (!sessionResult.data) return NextResponse.json({ ok: false, error: "The linked club stat session no longer exists." }, { status: 404 });
          if (!(linesResult.data ?? []).length) return NextResponse.json({ ok: false, error: "The linked club stat session has no player rows." }, { status: 409 });
          const submittedLines = (linesResult.data ?? []) as JsonRecord[];
          const now = new Date().toISOString();

          if (decision === "approved") {
            const game = await admin.from("games").select("*").eq("id", sessionResult.data.game_id).maybeSingle();
            if (game.error) throw game.error;
            if (!game.data || ![game.data.home_team_id, game.data.away_team_id].includes(teamId)) {
              return NextResponse.json({ ok: false, error: "This session is not linked to a canonical game assigned to the club. Link the game before official approval." }, { status: 409 });
            }
            const teamSide = game.data.home_team_id === teamId ? "home" : "away";
            const expectedScore = Number(teamSide === "home"
              ? game.data.home_score ?? game.data.team_score
              : game.data.away_score ?? game.data.opponent_score);
            const recordedScore = submittedLines.reduce((total, line) => total + Number(line.points ?? 0), 0);
            if (Number.isFinite(expectedScore) && expectedScore >= 0 && recordedScore !== expectedScore) {
              return NextResponse.json({ ok: false, error: `Club player points (${recordedScore}) do not equal the recorded team score (${expectedScore}). Return the session for correction.` }, { status: 409 });
            }

const roster = await admin
  .from("team_roster_members")
  .select("id,player_id,display_name")
  .eq("team_id", teamId)
  .eq("status", "active");

if (roster.error) throw roster.error;

const activeRosterById = new Map(
  ((roster.data ?? []) as JsonRecord[]).map((row) => [
    String(row.id),
    row,
  ]),
);

/*
 * A player does NOT need a permanent FACKTS player profile
 * in order to have verified club statistics.
 *
 * The minimum identity requirement is an active,
 * verified club roster membership.
 */
const rosterLinkedLines = submittedLines.filter(
  (line) =>
    line.roster_member_id &&
    activeRosterById.has(String(line.roster_member_id)),
);

if (rosterLinkedLines.length !== submittedLines.length) {
  const missing = submittedLines.length - rosterLinkedLines.length;

  return NextResponse.json(
    {
      ok: false,
      error: `${missing} player row${
        missing === 1 ? " is" : "s are"
      } not linked to an active club roster member. Match every box-score row to the club roster before approval.`,
    },
    { status: 409 },
  );
}

/*
 * Some roster members may ALSO have a permanent FACKTS
 * player identity.
 *
 * Those players are copied into player_game_stats so their
 * verified statistics can follow them across clubs and into
 * their full player profiles.
 *
 * Roster-only players remain valid approved team-stat lines.
 */
const canonicalLines = rosterLinkedLines.flatMap((line) => {
  const member = activeRosterById.get(
    String(line.roster_member_id),
  );

  if (!member?.player_id) return [];

  return [
    {
      line,
      playerId: String(member.player_id),
    },
  ];
});

const officialPlayerIds = Array.from(
  new Set(canonicalLines.map((item) => item.playerId)),
);

/*
 * game_rosters belongs to permanent player identities.
 * Only add players that already have a canonical player_id.
 */
if (officialPlayerIds.length) {
  const gameRoster = await admin
    .from("game_rosters")
    .upsert(
      officialPlayerIds.map((playerId) => ({
        game_id: sessionResult.data.game_id,
        player_id: playerId,
        roster_status: "confirmed",
        roster_role: "bench",
        notes:
          "Synced from a Super Admin-approved club box score.",
      })),
      { onConflict: "game_id,player_id" },
    );

  if (gameRoster.error) throw gameRoster.error;
}

/*
 * Check existing canonical statistics only for players who
 * already have full permanent FACKTS identities.
 */
const existing = officialPlayerIds.length
  ? await admin
      .from("player_game_stats")
      .select(
        "id,player_id,entry_status,verification_status",
      )
      .eq("game_id", sessionResult.data.game_id)
      .in("player_id", officialPlayerIds)
  : { data: [], error: null };

if (existing.error) throw existing.error;

const existingLines = (existing.data ?? []) as JsonRecord[];

const existingByPlayer = new Map(
  existingLines.map((line) => [
    String(line.player_id),
    line,
  ]),
);

if (
  existingLines.some(
    (line) =>
      line.entry_status === "verified" ||
      line.verification_status === "verified",
  )
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "At least one permanent player stat line is already verified. Use Data Corrections instead of overwriting it.",
    },
    { status: 409 },
  );
}

/*
 * Canonicalize statistics ONLY for roster members that have
 * permanent FACKTS player profiles.
 *
 * Roster-only players remain in team_player_stat_lines and
 * are approved below with the rest of the team session.
 */
for (const item of canonicalLines) {
  const line = item.line;
  const playerId = item.playerId;

  const canonical = {
    game_id: sessionResult.data.game_id,
    player_id: playerId,

    points: line.points,
    rebounds: line.rebounds,
    offensive_rebounds: line.offensive_rebounds,
    defensive_rebounds: line.defensive_rebounds,

    assists: line.assists,
    steals: line.steals,
    blocks: line.blocks,
    turnovers: line.turnovers,
    fouls: line.fouls,

    minutes: line.minutes,

    two_made: line.two_made,
    two_attempted: line.two_attempted,
    three_made: line.three_made,
    three_attempted: line.three_attempted,
    ft_made: line.ft_made,
    ft_attempted: line.ft_attempted,

    three_pointers_made: line.three_made,
    plus_minus: line.plus_minus,

    period_values: line.period_values || {},

    team_side: teamSide,

    entry_status: "verified",
    verification_status: "verified",

    submitted_at:
      sessionResult.data.submitted_at || now,
    submitted_by:
      sessionResult.data.created_by_user_id,

    verified_at: now,
    verified_by: access.user?.id,

    last_saved_at: now,
    updated_at: now,

    extra_stats: {
      source: "club_basketball_iq",
      team_id: teamId,
      roster_member_id: line.roster_member_id,
      team_stat_session_id: sessionId,
      team_stat_submission_id: id,
    },
  };

  const currentLine = existingByPlayer.get(playerId);

  const savedCanonical = currentLine
    ? await admin
        .from("player_game_stats")
        .update(canonical)
        .eq("id", currentLine.id)
    : await admin
        .from("player_game_stats")
        .insert({
          ...canonical,
          created_at: now,
        });

  if (savedCanonical.error) {
    throw savedCanonical.error;
  }
}/*
 * ============================================================
 * CANONICAL GAME BOX SCORE
 *
 * Every approved club stat line enters the per-game box score,
 * even when the roster member does not yet own a permanent
 * FACKTS player profile.
 * ============================================================
 */

const teamProfileResult = await admin
  .from("team_profiles")
  .select("id,name,short_name")
  .eq("id", teamId)
  .maybeSingle();

if (teamProfileResult.error) {
  throw teamProfileResult.error;
}

const teamName =
  teamSide === "home"
    ? String(
        game.data.home_team_name ||
          teamProfileResult.data?.name ||
          "Home team",
      )
    : String(
        game.data.away_team_name ||
          teamProfileResult.data?.name ||
          "Away team",
      );

const activeRosterResult = await admin
  .from("team_roster_members")
  .select(
    "id,player_id,display_name,nickname,jersey_number,position",
  )
  .eq("team_id", teamId)
  .eq("status", "active");

if (activeRosterResult.error) {
  throw activeRosterResult.error;
}

const activeRosterMap = new Map(
  (activeRosterResult.data ?? []).map((member) => [
    String(member.id),
    member,
  ]),
);

const canonicalBoxScoreRows = submittedLines.map((line) => {
  const rosterMember = activeRosterMap.get(
    String(line.roster_member_id || ""),
  );

  if (!rosterMember) {
    throw new Error(
      `Roster member ${String(
        line.roster_member_id || "",
      )} could not be found while publishing the game box score.`,
    );
  }

  const playerId =
    line.player_id || rosterMember.player_id || null;

  const twoMade = Number(line.two_made || 0);
  const twoAttempted = Number(line.two_attempted || 0);

  const threeMade = Number(line.three_made || 0);
  const threeAttempted = Number(
    line.three_attempted || 0,
  );

  const ftMade = Number(line.ft_made || 0);
  const ftAttempted = Number(line.ft_attempted || 0);

  const offensiveRebounds = Number(
    line.offensive_rebounds || 0,
  );

  const defensiveRebounds = Number(
    line.defensive_rebounds || 0,
  );

  return {
    game_id: sessionResult.data.game_id,

    team_side: teamSide,

    team_name: teamName,

    team_id: teamId,

    roster_member_id: rosterMember.id,

    player_id: playerId,

    identity_type: playerId
      ? "canonical_player"
      : "team_roster",

    display_name:
      String(
        line.display_name ||
          rosterMember.display_name ||
          rosterMember.nickname ||
          "Player",
      ),

    jersey_number:
      rosterMember.jersey_number || null,

    position:
      rosterMember.position || null,

    minutes: Number(line.minutes || 0),

    points: Number(line.points || 0),

    field_goals_made:
      twoMade + threeMade,

    field_goals_attempted:
      twoAttempted + threeAttempted,

    two_made: twoMade,
    two_attempted: twoAttempted,

    three_made: threeMade,
    three_attempted: threeAttempted,

    ft_made: ftMade,
    ft_attempted: ftAttempted,

    offensive_rebounds: offensiveRebounds,
    defensive_rebounds: defensiveRebounds,

    rebounds:
      Number(line.rebounds || 0) ||
      offensiveRebounds + defensiveRebounds,

    assists: Number(line.assists || 0),
    turnovers: Number(line.turnovers || 0),
    steals: Number(line.steals || 0),
    blocks: Number(line.blocks || 0),
    fouls: Number(line.fouls || 0),

    plus_minus: Number(line.plus_minus || 0),

    player_of_game:
      Boolean(line.player_of_game),

    period_values:
      line.period_values || {},

    extra_stats: {
      source: "club_basketball_iq",
      team_stat_session_id: sessionId,
      team_stat_submission_id: id,
    },

    source_line_key:
      `team:${teamId}:roster:${rosterMember.id}`,

    source_type: "team_import",

    source_import_id:
      sessionResult.data.source_import_id || null,

    source_session_id:
      sessionId,

    source_submission_id:
      id,

    verification_status:
      "verified",

    is_public:
      true,

    verified_at:
      now,

    verified_by:
      access.user?.id || null,

    updated_at:
      now,
  };
});

/*
 * Upsert makes approval safe if Admin retries after a partial
 * network failure. The game/source key uniquely identifies the
 * player's line for this specific game.
 */
const canonicalBoxScoreResult = await admin
  .from("game_box_score_lines")
  .upsert(
    canonicalBoxScoreRows,
    {
      onConflict: "game_id,source_line_key",
    },
  );

if (canonicalBoxScoreResult.error) {
  throw canonicalBoxScoreResult.error;
}
            const publishedGame = await admin.from("games").update({
              status: "completed",
              is_public: true,
              verification_status: "verified",
              updated_at: now,
            }).eq("id", sessionResult.data.game_id).select("id").single();
            if (publishedGame.error) throw publishedGame.error;
            const publicTeam = await admin.from("team_profiles").select("slug").eq("id", teamId).maybeSingle();
            if (publicTeam.error) throw publicTeam.error;
            if (publicTeam.data?.slug) revalidatePath(`/teams/${publicTeam.data.slug}`);
            revalidatePath("/teams");
          }

          const sessionStatus = decision === "approved" ? "approved" : "rejected";
          const [sessionUpdate, lineUpdate] = await Promise.all([
            admin.from("team_stat_sessions").update({ status: sessionStatus, reviewed_at: now, updated_at: now }).eq("id", sessionId).eq("team_id", teamId),
            admin.from("team_player_stat_lines").update({ status: sessionStatus, updated_at: now }).eq("session_id", sessionId).eq("team_id", teamId),
          ]);
          if (sessionUpdate.error) throw sessionUpdate.error;
          if (lineUpdate.error) throw lineUpdate.error;
        }
        const saved = await admin.from("team_stat_submissions").update(review).eq("id", id).eq("team_id", teamId);
        if (saved.error) throw saved.error;
      } else if (queue === "profiles") {
        const saved = await admin.from("team_player_profile_requests").update(review).eq("id", id).eq("team_id", teamId);
        if (saved.error) throw saved.error;
      } else {
        return NextResponse.json({ ok: false, error: "Unknown review queue." }, { status: 400 });
      }

      await recordAdminAuditEvent(access.supabase, {
        action: `${decision}_${queue}_submission`,
        entityType: queue === "profiles" ? "player" : queue === "stats" ? "statistics" : queue === "training" ? "team" : "media",
        entityId: id,
        capability: queue === "profiles" ? "players" : queue === "stats" ? "stats" : queue === "training" ? "teams" : "media",
        resourceType: "team",
        resourceId: teamId,
        metadata: { source: "club_portal_admin" },
      });
      return NextResponse.json({ ok: true, message: decision === "approved" ? "Submission approved." : "Submission rejected with review note." });
    }

    return NextResponse.json({ ok: false, error: "Unsupported Super Admin action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Club Portal administration failed." }, { status: 500 });
  }
}
