import { supabase } from "@/lib/supabase";

export type TeamProfile = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  team_type?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  city?: string | null;
  country?: string | null;
  founded_year?: number | null;
  coach_name?: string | null;
  contact_email?: string | null;
  website_url?: string | null;
  is_featured?: boolean | null;
  is_public?: boolean | null;
  display_order?: number | null;
};

export type TeamMember = {
  id: string;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  display_name: string;
  nickname?: string | null;
  jersey_number?: number | string | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  profile_href?: string | null;
};

export type TeamGame = {
  id: string;
  title?: string | null;
  competition_name?: string | null;
  opponent_name?: string | null;
  game_date?: string | null;
  venue?: string | null;
  status?: string | null;
  team_score?: number | null;
  opponent_score?: number | null;
  game_id?: string | null;
};

export type TrainingSession = {
  id: string;
  title: string;
  session_date?: string | null;
  venue?: string | null;
  focus_area?: string | null;
  summary?: string | null;
  image_url?: string | null;
};

export type TeamMedia = {
  id: string;
  title: string;
  media_type?: string | null;
  url: string;
  thumbnail_url?: string | null;
  published_at?: string | null;
};

export type TeamProfileBundle = {
  profile: TeamProfile;
  roster: TeamMember[];
  games: TeamGame[];
  training: TrainingSession[];
  media: TeamMedia[];
};

const FALLBACK_TEAM_ID = "fackts-africa-fallback";

export const FACKTS_AFRICA_TEAM: TeamProfile = {
  id: FALLBACK_TEAM_ID,
  slug: "fackts-africa",
  name: "FACKTS Africa",
  short_name: "FACKTS",
  team_type: "FACKTS organization team",
  description:
    "The home team and player-development identity behind FACKTS Hoops, FACKTS Kings and FACKTS basketball documentation.",
  logo_url: "/fackts-hoops-logo.png",
  cover_image_url: "/images/one-on-one-bg.png",
  city: "Nairobi",
  country: "Kenya",
  is_featured: true,
  is_public: true,
  display_order: 0,
};

function teamName(row: Record<string, unknown>) {
  return String(
    row.full_name || row.name || row.nickname || row.display_name || "Player"
  );
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortProfiles(left: TeamProfile, right: TeamProfile) {
  return (
    Number(left.display_order || 0) - Number(right.display_order || 0) ||
    left.name.localeCompare(right.name)
  );
}

export async function loadPublicTeamProfiles(): Promise<TeamProfile[]> {
  const result = await supabase
    .from("team_profiles")
    .select("*")
    .eq("is_public", true)
    .order("display_order", { ascending: true });

  const profiles = result.error
    ? []
    : ((result.data || []) as TeamProfile[]);
  const hasFacktsProfile = profiles.some(
    (profile) => profile.slug === FACKTS_AFRICA_TEAM.slug
  );

  return (hasFacktsProfile
    ? profiles
    : [FACKTS_AFRICA_TEAM, ...profiles]
  ).sort(sortProfiles);
}

async function loadDefaultFacktsRoster(): Promise<TeamMember[]> {
  const result = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (result.error) return [];

  return ((result.data || []) as Record<string, unknown>[])
    .filter((player) => {
      const type = String(player.player_type || "");
      const role = String(player.role || "").toLowerCase();
      return type ? type === "fackts_player" : !role.includes("guest");
    })
    .map((player) => ({
      id: `player-${String(player.id)}`,
      player_id: String(player.id),
      display_name: teamName(player),
      nickname: player.nickname ? String(player.nickname) : null,
      jersey_number:
        typeof player.jersey_number === "number" ||
        typeof player.jersey_number === "string"
          ? player.jersey_number
          : null,
      position: player.position ? String(player.position) : null,
      role: player.role ? String(player.role) : "Player",
      photo_url: player.photo_url ? String(player.photo_url) : null,
      profile_href: `/players/${String(player.id)}`,
    }));
}

async function loadDefaultFacktsGames(): Promise<TeamGame[]> {
  const result = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false })
    .limit(12);

  if (result.error) return [];

  return ((result.data || []) as Record<string, unknown>[]).map((game) => ({
    id: String(game.id),
    game_id: String(game.id),
    title: String(game.game_title || game.title || "FACKTS game"),
    competition_name: game.competition_name
      ? String(game.competition_name)
      : null,
    opponent_name: String(
      game.opponent || game.opponent_name || game.team_name || "Opponent"
    ),
    game_date: game.game_date ? String(game.game_date) : null,
    venue: String(game.venue || game.location || ""),
    status: game.status ? String(game.status) : null,
    team_score: optionalNumber(
      game.team_score ?? game.fackts_score ?? game.home_score
    ),
    opponent_score: optionalNumber(game.opponent_score ?? game.away_score),
  }));
}

export async function loadTeamProfileBundle(
  slug: string
): Promise<TeamProfileBundle | null> {
  const profileResult = await supabase
    .from("team_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  const databaseProfile = profileResult.error
    ? null
    : ((profileResult.data || null) as TeamProfile | null);
  const profile =
    databaseProfile || (slug === FACKTS_AFRICA_TEAM.slug ? FACKTS_AFRICA_TEAM : null);

  if (!profile) return null;

  const hasDatabaseProfile = profile.id !== FALLBACK_TEAM_ID;

  const [membersResult, gamesResult, trainingResult, mediaResult] =
    hasDatabaseProfile
      ? await Promise.all([
          supabase
            .from("team_roster_members")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .eq("status", "active")
            .order("display_order", { ascending: true }),
          supabase
            .from("team_games")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .order("game_date", { ascending: false }),
          supabase
            .from("team_training_sessions")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .order("session_date", { ascending: false }),
          supabase
            .from("team_media")
            .select("*")
            .eq("team_id", profile.id)
            .eq("is_public", true)
            .order("published_at", { ascending: false }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  let roster: TeamMember[] = membersResult.error
    ? []
    : ((membersResult.data || []) as TeamMember[]).map((member) => ({
        ...member,
        profile_href: member.player_id
          ? `/players/${member.player_id}`
          : member.guest_hooper_id
            ? `/players/guest-${member.guest_hooper_id}`
            : null,
      }));
  let games: TeamGame[] = gamesResult.error
    ? []
    : ((gamesResult.data || []) as TeamGame[]);

  if (slug === FACKTS_AFRICA_TEAM.slug && roster.length === 0) {
    roster = await loadDefaultFacktsRoster();
  }

  if (slug === FACKTS_AFRICA_TEAM.slug && games.length === 0) {
    games = await loadDefaultFacktsGames();
  }

  return {
    profile:
      slug === FACKTS_AFRICA_TEAM.slug
        ? { ...FACKTS_AFRICA_TEAM, ...profile }
        : profile,
    roster,
    games,
    training: trainingResult.error
      ? []
      : ((trainingResult.data || []) as TrainingSession[]),
    media: mediaResult.error
      ? []
      : ((mediaResult.data || []) as TeamMedia[]),
  };
}
