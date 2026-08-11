import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_ROLE_PRESET_DEFINITIONS,
  adminRolePresetDefinition,
  defaultPermissionsForRole,
  isSuperAdmin,
  normalizeAdminRolePreset,
  type AdminCapability,
} from "@/lib/admin/permissions";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOURCE_TYPES = new Set([
  "event",
  "game",
  "team",
  "player",
  "media",
  "report",
  "partner",
]);

type AssignmentInput = {
  resource_type: string;
  resource_id: string;
  permissions?: AdminCapability[];
};

function cleanText(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeAssignments(value: unknown): AssignmentInput[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const assignments: AssignmentInput[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const resourceType = cleanText(record.resource_type, 40).toLowerCase();
    const resourceId = cleanText(record.resource_id, 160);
    const key = `${resourceType}:${resourceId}`;

    if (!RESOURCE_TYPES.has(resourceType) || !resourceId || seen.has(key)) {
      continue;
    }

    seen.add(key);
    assignments.push({
      resource_type: resourceType,
      resource_id: resourceId,
      permissions: [],
    });
  }

  return assignments;
}

async function approvedAdmin() {
  return getAdminCapabilityAccess("admin_users");
}

export async function GET() {
  const access = await approvedAdmin();
  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Users and permissions access is required." },
      { status: 403 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    const [profilesResult, authUsersResult, assignmentsResult, rolesResult] =
      await Promise.all([
        admin
          .from("admin_profiles")
          .select(
            "id,user_id,display_name,email,role,is_active,is_super_admin,permissions,created_at"
          )
          .order("is_super_admin", { ascending: false })
          .order("display_name", { ascending: true }),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin
          .from("admin_assignments")
          .select(
            "id,admin_profile_id,resource_type,resource_id,permissions,is_active,starts_at,ends_at"
          )
          .eq("is_active", true)
          .order("resource_type", { ascending: true })
          .order("resource_id", { ascending: true }),
        admin
          .from("admin_role_presets")
          .select(
            "role_key,label,description,permissions,read_only,requires_scope"
          )
          .order("label", { ascending: true }),
      ]);

    if (profilesResult.error) throw profilesResult.error;
    if (authUsersResult.error) throw authUsersResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    const emailsByUserId = new Map(
      authUsersResult.data.users.map((user) => [user.id, user.email ?? null])
    );
    const assignmentsByProfile = new Map<string, typeof assignmentsResult.data>();
    for (const assignment of assignmentsResult.data ?? []) {
      const existing = assignmentsByProfile.get(assignment.admin_profile_id) ?? [];
      existing.push(assignment);
      assignmentsByProfile.set(assignment.admin_profile_id, existing);
    }

    const users = (profilesResult.data ?? []).map((profile) => ({
      ...profile,
      email: profile.email || emailsByUserId.get(profile.user_id) || null,
      assignments: assignmentsByProfile.get(profile.id) ?? [],
    }));

    const fallbackRoles = ADMIN_ROLE_PRESET_DEFINITIONS.map((role) => ({
      role_key: role.key,
      label: role.label,
      description: role.description,
      permissions: role.permissions,
      read_only: role.readOnly,
      requires_scope: role.requiresScope,
    }));

    return NextResponse.json({
      ok: true,
      users,
      roles: rolesResult.error ? fallbackRoles : rolesResult.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Admin users could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await approvedAdmin();
  if (!access.allowed || !access.user || !access.profile) {
    return NextResponse.json(
      { ok: false, error: "Users and permissions access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = cleanText(body.display_name, 80);
    const email = cleanText(body.email, 180).toLowerCase();
    const password = String(body.password ?? "");
    const role = normalizeAdminRolePreset(body.role);
    const assignments = normalizeAssignments(body.assignments);
    const roleDefinition = adminRolePresetDefinition(role);

    if (!displayName || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Add the user's name and a valid email." },
        { status: 400 }
      );
    }
    if (password.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Temporary password must contain at least 10 characters." },
        { status: 400 }
      );
    }
    if (!role || !roleDefinition) {
      return NextResponse.json(
        { ok: false, error: "Choose one of the approved operational roles." },
        { status: 400 }
      );
    }
    if (roleDefinition.requiresScope && assignments.length === 0) {
      return NextResponse.json(
        { ok: false, error: `${roleDefinition.label} requires at least one resource assignment.` },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const existingUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existingUsers.error) throw existingUsers.error;
    if (
      existingUsers.data.users.some(
        (candidate) => candidate.email?.toLowerCase() === email
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "That email already belongs to a FACKTS account." },
        { status: 409 }
      );
    }

    const createdUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name: displayName },
    });
    if (createdUser.error || !createdUser.data.user) {
      throw createdUser.error ?? new Error("Could not create the Admin user.");
    }

    const createdProfile = await admin
      .from("admin_profiles")
      .insert({
        user_id: createdUser.data.user.id,
        display_name: displayName,
        email,
        role,
        is_active: true,
        is_super_admin: false,
        permissions: defaultPermissionsForRole(role),
        updated_at: new Date().toISOString(),
      })
      .select(
        "id,user_id,display_name,email,role,is_active,is_super_admin,permissions"
      )
      .single();

    if (createdProfile.error || !createdProfile.data) {
      await admin.auth.admin.deleteUser(createdUser.data.user.id);
      throw createdProfile.error ?? new Error("Could not create the Admin profile.");
    }

    if (assignments.length) {
      const assignmentResult = await admin.from("admin_assignments").insert(
        assignments.map((assignment) => ({
          admin_profile_id: createdProfile.data.id,
          resource_type: assignment.resource_type,
          resource_id: assignment.resource_id,
          permissions: assignment.permissions ?? [],
          is_active: true,
          created_by: access.user.id,
        }))
      );

      if (assignmentResult.error) {
        await admin.from("admin_profiles").delete().eq("id", createdProfile.data.id);
        await admin.auth.admin.deleteUser(createdUser.data.user.id);
        throw assignmentResult.error;
      }
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "create",
      entityType: "admin_profile",
      entityId: createdProfile.data.id,
      capability: "admin_users",
      after: { ...createdProfile.data, assignments },
      metadata: { source: "phase1_admin_users" },
    });

    return NextResponse.json(
      { ok: true, message: `${displayName} now has ${roleDefinition.label} access.` },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Admin user creation failed.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await approvedAdmin();
  if (!access.allowed || !access.user || !access.profile) {
    return NextResponse.json(
      { ok: false, error: "Users and permissions access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const profileId = cleanText(body.id, 80);
    const displayName = cleanText(body.display_name, 80);
    const role = normalizeAdminRolePreset(body.role);
    const roleDefinition = adminRolePresetDefinition(role);
    const assignments = normalizeAssignments(body.assignments);
    const isActive = body.is_active !== false;

    if (!profileId || !displayName || !role || !roleDefinition) {
      return NextResponse.json(
        { ok: false, error: "Profile, name and approved role are required." },
        { status: 400 }
      );
    }
    if (roleDefinition.requiresScope && assignments.length === 0) {
      return NextResponse.json(
        { ok: false, error: `${roleDefinition.label} requires at least one resource assignment.` },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const [targetResult, oldAssignmentsResult] = await Promise.all([
      admin
        .from("admin_profiles")
        .select(
          "id,user_id,display_name,email,role,is_active,is_super_admin,permissions"
        )
        .eq("id", profileId)
        .maybeSingle(),
      admin
        .from("admin_assignments")
        .select("resource_type,resource_id,permissions,is_active,starts_at,ends_at")
        .eq("admin_profile_id", profileId),
    ]);

    if (targetResult.error || !targetResult.data) {
      return NextResponse.json(
        { ok: false, error: targetResult.error?.message || "Admin user not found." },
        { status: 404 }
      );
    }
    if (oldAssignmentsResult.error) throw oldAssignmentsResult.error;
    if (targetResult.data.user_id === access.user.id || isSuperAdmin(targetResult.data)) {
      return NextResponse.json(
        { ok: false, error: "Your own or a super-admin account cannot be changed here." },
        { status: 400 }
      );
    }

    const before = {
      ...targetResult.data,
      assignments: oldAssignmentsResult.data ?? [],
    };
    const profileUpdate = {
      display_name: displayName,
      role,
      permissions: defaultPermissionsForRole(role),
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    const updateResult = await admin
      .from("admin_profiles")
      .update(profileUpdate)
      .eq("id", profileId);
    if (updateResult.error) throw updateResult.error;

    const deleteResult = await admin
      .from("admin_assignments")
      .delete()
      .eq("admin_profile_id", profileId);
    if (deleteResult.error) throw deleteResult.error;

    if (assignments.length) {
      const insertResult = await admin.from("admin_assignments").insert(
        assignments.map((assignment) => ({
          admin_profile_id: profileId,
          resource_type: assignment.resource_type,
          resource_id: assignment.resource_id,
          permissions: assignment.permissions ?? [],
          is_active: true,
          created_by: access.user?.id,
        }))
      );

      if (insertResult.error) {
        await admin.from("admin_profiles").update({
          display_name: targetResult.data.display_name,
          role: targetResult.data.role,
          permissions: targetResult.data.permissions,
          is_active: targetResult.data.is_active,
          updated_at: new Date().toISOString(),
        }).eq("id", profileId);
        if ((oldAssignmentsResult.data ?? []).length) {
          await admin.from("admin_assignments").insert(
            (oldAssignmentsResult.data ?? []).map((assignment) => ({
              ...assignment,
              admin_profile_id: profileId,
              created_by: access.user?.id,
            }))
          );
        }
        throw insertResult.error;
      }
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "update_permissions",
      entityType: "admin_profile",
      entityId: profileId,
      capability: "admin_users",
      before,
      after: { ...targetResult.data, ...profileUpdate, assignments },
      metadata: { source: "phase1_admin_users" },
    });

    return NextResponse.json({
      ok: true,
      message: `${displayName}'s role and resource access were updated.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Admin user update failed.",
      },
      { status: 500 }
    );
  }
}
