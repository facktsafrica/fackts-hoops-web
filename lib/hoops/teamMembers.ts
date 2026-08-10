export type TeamMember = {
  id: string;
  slug: string;
  full_name: string;
  role_title: string;
  public_description: string;
  profile_photo_url?: string | null;
  initials_fallback?: string | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export function deriveTeamMemberInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getTeamMemberInitials(member: Pick<TeamMember, "full_name" | "initials_fallback">) {
  const savedInitials = String(member.initials_fallback ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 4);

  return savedInitials || deriveTeamMemberInitials(member.full_name) || "FH";
}

export function teamMemberSlug(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return normalized || `team-member-${Date.now()}`;
}
