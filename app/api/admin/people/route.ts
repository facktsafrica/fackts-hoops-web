import { NextResponse, type NextRequest } from "next/server";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { getAdminCapabilityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  EXTERNAL_PLAYER_TYPE,
  FACKTS_PLAYER_TYPE,
  GUEST_HOOPER_TYPE,
  LEGACY_GUEST_TYPE,
  PROSPECT_PLAYER_TYPE,
} from "@/lib/hoops/playerClassification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAYER_TYPES = new Set<string>([
  FACKTS_PLAYER_TYPE,
  EXTERNAL_PLAYER_TYPE,
  GUEST_HOOPER_TYPE,
  LEGACY_GUEST_TYPE,
  PROSPECT_PLAYER_TYPE,
]);

const editableTextFields = [
  "nickname",
  "jersey_number",
  "role",
  "position",
  "current_team",
  "email",
  "phone",
  "bio",
  "photo_url",
] as const;

function cleanText(value: unknown, max = 1000) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeIdentityName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function personPayload(body: Record<string, unknown>) {
  const fullName = cleanText(body.full_name, 160);
  const playerType = String(body.player_type ?? FACKTS_PLAYER_TYPE).trim();
  const errors: string[] = [];

  if (!fullName) errors.push("Full name is required.");
  if (!PLAYER_TYPES.has(playerType)) errors.push("Choose a valid person classification.");

  const payload: Record<string, unknown> = {
    full_name: fullName,
    name: fullName,
    player_type: playerType,
    is_active: body.is_active !== false,
    is_featured: body.is_featured === true,
    updated_at: new Date().toISOString(),
  };

  for (const field of editableTextFields) {
    payload[field] = cleanText(
      body[field],
      field === "bio" ? 5000 : field === "photo_url" ? 2000 : 500
    );
  }

  if (!payload.role) {
    payload.role = playerType === FACKTS_PLAYER_TYPE ? "Player" : "Guest Hooper";
  }

  return { errors, payload, normalizedName: normalizeIdentityName(fullName) };
}

async function findDuplicateCandidates(
  normalizedName: string,
  excludeId?: string
) {
  if (!normalizedName) return [];
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("players")
    .select("id,full_name,name,nickname,player_type,is_active")
    .limit(1000);

  if (result.error) throw result.error;
  return (result.data ?? []).filter((candidate) => {
    if (candidate.id === excludeId) return false;
    return [candidate.full_name, candidate.name].some(
      (name) => normalizeIdentityName(name) === normalizedName
    );
  });
}

export async function GET() {
  const access = await getAdminCapabilityAccess("players", {
    resourceType: "player",
    resourceId: "list",
    write: false,
  });

  if (!access.user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to view canonical people." },
      { status: 401 }
    );
  }
  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "You do not have permission to view the full People register." },
      { status: 403 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    const peopleResult = await admin
      .from("players")
      .select(
        "id,full_name,name,nickname,jersey_number,role,player_type,position,current_team,email,phone,bio,photo_url,is_featured,is_active,consent_status,created_at,updated_at"
      )
      .order("is_active", { ascending: false })
      .order("full_name", { ascending: true })
      .limit(1000);

    if (peopleResult.error) throw peopleResult.error;
    const people = peopleResult.data ?? [];
    const ids = people.map((person) => person.id);

    const [aliasesResult, guestsResult] = ids.length
      ? await Promise.all([
          admin
            .from("legacy_identity_aliases")
            .select(
              "id,legacy_source,legacy_id,legacy_route_id,canonical_player_id,alias_type,is_active"
            )
            .in("canonical_player_id", ids),
          admin
            .from("guest_hoopers")
            .select("id,source_player_id,full_name,nickname,guest_type,is_active")
            .in("source_player_id", ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (aliasesResult.error) throw aliasesResult.error;
    if (guestsResult.error) throw guestsResult.error;

    const aliasesByPlayer = new Map<string, typeof aliasesResult.data>();
    for (const alias of aliasesResult.data ?? []) {
      const current = aliasesByPlayer.get(alias.canonical_player_id) ?? [];
      current.push(alias);
      aliasesByPlayer.set(alias.canonical_player_id, current);
    }
    const guestsByPlayer = new Map<string, typeof guestsResult.data>();
    for (const guest of guestsResult.data ?? []) {
      if (!guest.source_player_id) continue;
      const current = guestsByPlayer.get(guest.source_player_id) ?? [];
      current.push(guest);
      guestsByPlayer.set(guest.source_player_id, current);
    }

    return NextResponse.json({
      ok: true,
      people: people.map((person) => ({
        ...person,
        aliases: aliasesByPlayer.get(person.id) ?? [],
        legacy_guest_profiles: guestsByPlayer.get(person.id) ?? [],
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Canonical people could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await getAdminCapabilityAccess("players", {
    resourceType: "player",
    resourceId: "new",
    write: true,
  });
  if (!access.allowed || !access.user || !access.profile) {
    return NextResponse.json(
      { ok: false, error: "You do not have permission to create canonical people." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validation = personPayload(body);
    if (validation.errors.length) {
      return NextResponse.json(
        { ok: false, error: validation.errors.join(" ") },
        { status: 400 }
      );
    }

    const duplicates = await findDuplicateCandidates(validation.normalizedName);
    if (duplicates.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "A canonical person already uses this normalized name. Review that record instead of creating a duplicate.",
          duplicate_candidates: duplicates,
        },
        { status: 409 }
      );
    }

    const admin = createSupabaseAdminClient();
    const result = await admin
      .from("players")
      .insert({ ...validation.payload, created_at: new Date().toISOString() })
      .select(
        "id,full_name,name,nickname,jersey_number,role,player_type,position,current_team,email,phone,bio,photo_url,is_featured,is_active,consent_status,created_at,updated_at"
      )
      .single();

    if (result.error || !result.data) {
      throw result.error ?? new Error("Canonical person was not created.");
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "create",
      entityType: "player",
      entityId: result.data.id,
      capability: "players",
      after: result.data,
      metadata: { source: "phase1_people" },
    });

    return NextResponse.json(
      { ok: true, person: result.data, message: "Canonical person created." },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Canonical person creation failed.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = cleanText(body.id, 80);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Canonical person ID is required." },
        { status: 400 }
      );
    }

    const access = await getAdminCapabilityAccess("players", {
      resourceType: "player",
      resourceId: id,
      write: true,
    });
    if (!access.allowed || !access.user || !access.profile) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to update this person." },
        { status: 403 }
      );
    }

    const validation = personPayload(body);
    if (validation.errors.length) {
      return NextResponse.json(
        { ok: false, error: validation.errors.join(" ") },
        { status: 400 }
      );
    }

    const duplicates = await findDuplicateCandidates(validation.normalizedName, id);
    if (duplicates.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Another canonical person already uses this normalized name. No automatic merge was performed.",
          duplicate_candidates: duplicates,
        },
        { status: 409 }
      );
    }

    const admin = createSupabaseAdminClient();
    const beforeResult = await admin
      .from("players")
      .select(
        "id,full_name,name,nickname,jersey_number,role,player_type,position,current_team,email,phone,bio,photo_url,is_featured,is_active,consent_status,created_at,updated_at"
      )
      .eq("id", id)
      .maybeSingle();
    if (beforeResult.error || !beforeResult.data) {
      return NextResponse.json(
        { ok: false, error: beforeResult.error?.message || "Canonical person not found." },
        { status: 404 }
      );
    }

    const result = await admin
      .from("players")
      .update(validation.payload)
      .eq("id", id)
      .select(
        "id,full_name,name,nickname,jersey_number,role,player_type,position,current_team,email,phone,bio,photo_url,is_featured,is_active,consent_status,created_at,updated_at"
      )
      .single();
    if (result.error || !result.data) {
      throw result.error ?? new Error("Canonical person was not updated.");
    }

    await recordAdminAuditEvent(access.supabase, {
      action: "update",
      entityType: "player",
      entityId: id,
      capability: "players",
      resourceType: "player",
      resourceId: id,
      before: beforeResult.data,
      after: result.data,
      metadata: { source: "phase1_people" },
    });

    return NextResponse.json({
      ok: true,
      person: result.data,
      message: result.data.is_active
        ? "Canonical person updated."
        : "Person set to inactive; historical relationships were preserved.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Canonical person update failed.",
      },
      { status: 500 }
    );
  }
}
