import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_CAPABILITIES,
  isSuperAdmin,
  normalizeAdminPermissions,
} from "@/lib/admin/permissions";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function superAdminAccess() {
  return getAdminCapabilityAccess("admin_users");
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET() {
  const access = await superAdminAccess();

  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Super-admin access required." },
      { status: 403 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    const [{ data, error }, { data: usersData, error: usersError }] =
      await Promise.all([
        admin
          .from("admin_profiles")
          .select(
            "id, user_id, display_name, email, role, is_active, is_super_admin, permissions, created_at"
          )
          .order("is_super_admin", { ascending: false })
          .order("display_name", { ascending: true }),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error.message.includes("column") ||
            error.message.includes("relation")
              ? "Run the included admin-upgrade SQL first."
              : error.message,
        },
        { status: 400 }
      );
    }

    if (usersError) {
      return NextResponse.json(
        { ok: false, error: usersError.message },
        { status: 400 }
      );
    }

    const emailsByUserId = new Map(
      usersData.users.map((user) => [user.id, user.email ?? null])
    );
    const admins = (data ?? []).map((profile) => ({
      ...profile,
      email: profile.email || emailsByUserId.get(profile.user_id) || null,
    }));

    return NextResponse.json({
      ok: true,
      admins,
      capabilities: ADMIN_CAPABILITIES,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Mini admins could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await superAdminAccess();

  if (!access.allowed || !access.user || !access.profile) {
    return NextResponse.json(
      { ok: false, error: "Super-admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const displayName = cleanText(body.display_name, 80);
    const email = cleanText(body.email, 180).toLowerCase();
    const password = String(body.password ?? "");
    const permissions = normalizeAdminPermissions(body.permissions);

    if (!displayName || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Add the mini admin's name and valid email." },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        {
          ok: false,
          error: "Temporary password must contain at least 10 characters.",
        },
        { status: 400 }
      );
    }

    if (permissions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Select at least one admin right." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: usersData, error: usersError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (usersError) throw usersError;

    if (
      usersData.users.some(
        (candidate) => candidate.email?.toLowerCase() === email
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "That email already belongs to a FACKTS account. Use a different email.",
        },
        { status: 409 }
      );
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "mini_admin", name: displayName },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        {
          ok: false,
          error: createError?.message || "Could not create the mini admin.",
        },
        { status: 400 }
      );
    }

    const { data: createdProfile, error: profileError } = await admin
      .from("admin_profiles")
      .insert({
        user_id: created.user.id,
        display_name: displayName,
        email,
        role: "mini_admin",
        is_active: true,
        is_super_admin: false,
        permissions,
        updated_at: new Date().toISOString(),
      })
      .select("id,user_id,display_name,role,is_active,is_super_admin,permissions")
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 400 }
      );
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "create",
      entityType: "admin_profile",
      entityId: createdProfile.id,
      capability: "admin_users",
      after: createdProfile,
      metadata: { source: "admin_mini_admins_api" },
    }).catch((auditError) => console.error("Mini-admin create audit failed:", auditError));

    return NextResponse.json({
      ok: true,
      message: `${displayName} is now a mini admin.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Mini admin creation failed.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await superAdminAccess();

  if (!access.allowed || !access.user || !access.profile) {
    return NextResponse.json(
      { ok: false, error: "Super-admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const profileId = cleanText(body.id, 80);
    const displayName = cleanText(body.display_name, 80);
    const permissions = normalizeAdminPermissions(body.permissions);
    const isActive = body.is_active !== false;

    if (!profileId || !displayName) {
      return NextResponse.json(
        { ok: false, error: "Mini-admin profile and name are required." },
        { status: 400 }
      );
    }

    if (permissions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Select at least one admin right." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: target, error: targetError } = await admin
      .from("admin_profiles")
      .select("id, user_id, display_name, is_active, is_super_admin, role, permissions")
      .eq("id", profileId)
      .maybeSingle();

    if (targetError || !target) {
      return NextResponse.json(
        { ok: false, error: targetError?.message || "Mini admin not found." },
        { status: 404 }
      );
    }

    if (target.user_id === access.user.id || isSuperAdmin(target)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Super-admin access cannot be changed from this screen.",
        },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("admin_profiles")
      .update({
        display_name: displayName,
        permissions,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "update_permissions",
      entityType: "admin_profile",
      entityId: target.id,
      capability: "admin_users",
      before: target,
      after: {
        ...target,
        display_name: displayName,
        permissions,
        is_active: isActive,
      },
      metadata: { source: "admin_mini_admins_api" },
    }).catch((auditError) => console.error("Mini-admin update audit failed:", auditError));

    return NextResponse.json({
      ok: true,
      message: `${displayName}'s rights were updated.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Mini-admin update failed.",
      },
      { status: 500 }
    );
  }
}
