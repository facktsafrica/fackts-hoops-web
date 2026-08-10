import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { escapeHtml, getEmailConfiguration, sendResendEmail } from "@/lib/email/resend";
import { FACKTS_PLAYER_TYPE, isOfficialFacktsPlayer } from "@/lib/hoops/playerClassification";
import { notifyPlayers } from "@/lib/notifications/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function playerAccessError(error: unknown) {
  if (
    error instanceof Error &&
    error.message === "PLAYER_ACCOUNTS_CONFIGURATION_MISSING"
  ) {
    return "Player Accounts is not connected to the secure Supabase Admin key yet. Existing accounts have not been deleted. Add the server-only key in Vercel, then redeploy.";
  }

  return error instanceof Error ? error.message : "Player Accounts could not be loaded.";
}

function temporaryPassword() {
  return `Fackts!${randomBytes(8).toString("base64url")}`;
}

export async function GET() {
  try {
    const { user, profile, allowed } =
      await getAdminCapabilityAccess("player_access");

    if (!user || !profile || !allowed) {
      return NextResponse.json(
        { ok: false, error: "Player Accounts permission required." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("players")
      .select("id, user_id, full_name, name, nickname, role, player_type, email, is_active")
      .eq("player_type", FACKTS_PLAYER_TYPE)
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, players: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: playerAccessError(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile, allowed, supabase } =
      await getAdminCapabilityAccess("player_access");

    if (!user || !profile || !allowed) {
      return NextResponse.json(
        { ok: false, error: "Player Accounts permission required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action === "unlink" ? "unlink" : "issue";
    const playerId = String(body.player_id ?? "").trim();
    const requestedEmail = String(body.email ?? "").trim().toLowerCase();

    if (!playerId) {
      return NextResponse.json({ ok: false, error: "Choose a player first." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: player, error: playerError } = await admin
      .from("players")
      .select("id, user_id, full_name, name, nickname, role, player_type, email, is_active")
      .eq("id", playerId)
      .maybeSingle();

    if (playerError) {
      return NextResponse.json({ ok: false, error: playerError.message }, { status: 400 });
    }

    if (!player || !player.is_active || !isOfficialFacktsPlayer(player)) {
      return NextResponse.json(
        { ok: false, error: "Only active official FACKTS players can receive access." },
        { status: 400 }
      );
    }

    if (action === "unlink") {
      const { error } = await admin.from("players").update({ user_id: null }).eq("id", playerId);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      await recordAdminAuditEvent(supabase, {
        action: "revoke_player_access",
        entityType: "player",
        entityId: playerId,
        capability: "player_access",
        before: { user_id: player.user_id },
        after: { user_id: null },
        metadata: { source: "player_access_api" },
      }).catch((auditError) => console.error("Player access revoke audit failed:", auditError));

      return NextResponse.json({ ok: true, message: "Player access revoked." });
    }

    if (!requestedEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "Add a valid player email." }, { status: 400 });
    }

    const playerName = player.full_name || player.name || player.nickname || "FACKTS Player";
    const password = temporaryPassword();
    let authUserId = player.user_id as string | null;
    let accountEmail = requestedEmail;
    let accountCreated = false;

    if (authUserId) {
      const { data: linkedUser, error: linkedError } = await admin.auth.admin.getUserById(authUserId);

      if (linkedError || !linkedUser.user?.email) {
        return NextResponse.json(
          { ok: false, error: "The linked Auth user could not be loaded." },
          { status: 400 }
        );
      }

      accountEmail = linkedUser.user.email.toLowerCase();
      const { error: passwordError } = await admin.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
        user_metadata: { role: "player", player_id: player.id, name: playerName },
      });

      if (passwordError) {
        return NextResponse.json({ ok: false, error: passwordError.message }, { status: 400 });
      }
    } else {
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (usersError) {
        return NextResponse.json({ ok: false, error: usersError.message }, { status: 400 });
      }

      const existingUser = usersData.users.find(
        (candidate) => candidate.email?.toLowerCase() === requestedEmail
      );

      if (existingUser) {
        const [{ data: adminProfile }, { data: otherPlayer }] = await Promise.all([
          admin.from("admin_profiles").select("id").eq("user_id", existingUser.id).maybeSingle(),
          admin.from("players").select("id").eq("user_id", existingUser.id).neq("id", playerId).maybeSingle(),
        ]);

        if (adminProfile || otherPlayer) {
          return NextResponse.json(
            {
              ok: false,
              error: "That email already belongs to another FACKTS account. Use a separate player email.",
            },
            { status: 400 }
          );
        }

        authUserId = existingUser.id;
        const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: { role: "player", player_id: player.id, name: playerName },
        });

        if (updateError) {
          return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
        }
      } else {
        const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
          email: requestedEmail,
          password,
          email_confirm: true,
          user_metadata: { role: "player", player_id: player.id, name: playerName },
        });

        if (createError || !createdUser.user) {
          return NextResponse.json(
            { ok: false, error: createError?.message || "Could not create the player login." },
            { status: 400 }
          );
        }

        authUserId = createdUser.user.id;
        accountCreated = true;
      }
    }

    const { error: linkPlayerError } = await admin
      .from("players")
      .update({ user_id: authUserId, email: accountEmail })
      .eq("id", playerId);

    if (linkPlayerError) {
      return NextResponse.json({ ok: false, error: linkPlayerError.message }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const loginUrl = `${siteUrl}/player/login`;
    let emailSent = false;

    const emailConfiguration = getEmailConfiguration();
    if (emailConfiguration.apiKey && emailConfiguration.from) {
      try {
        await sendResendEmail({
          to: accountEmail,
          subject: "Your FACKTS Hoops player login",
          text: `Hi ${playerName}. Your FACKTS player login is ready. Login: ${loginUrl} Email: ${accountEmail} Temporary password: ${password}. Change the password after signing in.`,
          html: `<div style="font-family:Arial,sans-serif;background:#09090b;color:#fff;padding:28px;border-radius:18px"><p style="color:#fb923c;font-weight:800;letter-spacing:.12em">FACKTS HOOPS</p><h1>Welcome, ${escapeHtml(playerName)}</h1><p>Your player account is ready.</p><p><strong>Email:</strong> ${escapeHtml(accountEmail)}</p><p><strong>Temporary password:</strong> ${escapeHtml(password)}</p><p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#f97316;color:#000;padding:13px 20px;border-radius:12px;font-weight:800;text-decoration:none">Open Player Login</a></p><p style="color:#a1a1aa">Change the temporary password after signing in.</p></div>`,
        });
        emailSent = true;
      } catch {
        emailSent = false;
      }
    }

    await notifyPlayers([player.id], {
      title: accountCreated ? "Player account activated" : "Player login reset",
      body: "Your FACKTS player portal is ready. Change your temporary password after signing in.",
      notificationType: accountCreated ? "player_account_activated" : "player_login_reset",
      linkUrl: "/player/settings",
      tag: `player-account-${player.id}`,
    }).catch(() => undefined);

    await recordAdminAuditEvent(supabase, {
      action: accountCreated ? "create_player_access" : "reset_player_access",
      entityType: "player",
      entityId: playerId,
      capability: "player_access",
      before: { user_id: player.user_id },
      after: { user_id: authUserId },
      metadata: { source: "player_access_api", email_sent: emailSent },
    }).catch((auditError) => console.error("Player access audit failed:", auditError));

    return NextResponse.json({
      ok: true,
      message: accountCreated
        ? "Player login created. Copy and send the temporary details to the player."
        : "Player password reset. Copy and send the new temporary details to the player.",
      credentials: {
        email: accountEmail,
        temporary_password: password,
        login_url: loginUrl,
      },
      email_sent: emailSent,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: playerAccessError(error) },
      { status: 500 }
    );
  }
}
