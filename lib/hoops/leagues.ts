import { supabase } from "@/lib/supabase";
import { getAwayScore, getHomeScore, type GameRecord } from "@/lib/hoops/gamePresentation";

export type LeagueProfile = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  organizer_name?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  status?: string | null;
  display_order?: number | null;
};

export type LeagueTeam = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  city?: string | null;
  country?: string | null;
  verification_status?: string | null;
};

export type LeagueMembership = {
  id: string;
  league_id: string;
  team_id: string;
  season_label: string;
  division: string;
  conference?: string | null;
  status: string;
  display_order?: number | null;
  team: LeagueTeam;
};

export type LeagueStanding = {
  membershipId: string;
  team: LeagueTeam;
  seasonLabel: string;
  division: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  winPercentage: number;
};

export type LeagueDirectoryItem = {
  league: LeagueProfile;
  teamCount: number;
  divisions: string[];
  seasons: string[];
};

type JsonRecord = Record<string, unknown>;

const LEAGUE_DIVISION_DEFAULTS: Record<string, string[]> = {
  kbf: ["Premier League", "Division 1", "Division 2", "Division 3"],
};

export function getLeagueDivisions(slug: string, assignedDivisions: string[] = []) {
  const defaults = LEAGUE_DIVISION_DEFAULTS[String(slug || "").toLowerCase()] || [];
  const divisions = [...defaults, ...assignedDivisions.map((item) => String(item || "").trim()).filter(Boolean)];
  return Array.from(new Set(divisions.length ? divisions : ["League table"]));
}

function relatedTeam(value: unknown): LeagueTeam | null {
  const team = Array.isArray(value) ? value[0] : value;
  if (!team || typeof team !== "object") return null;
  const row = team as JsonRecord;
  if (!row.id || !row.slug || !row.name) return null;
  return row as LeagueTeam;
}

function number(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function finished(status: unknown) {
  return ["completed", "complete", "final", "finished", "played"].includes(String(status || "").toLowerCase());
}

export async function loadLeagueDirectory(): Promise<LeagueDirectoryItem[]> {
  const [leagueResult, membershipResult] = await Promise.all([
    supabase.from("leagues").select("*").eq("is_public", true).order("display_order").order("name"),
    supabase.from("team_league_memberships").select("league_id,team_id,division,season_label,status").eq("is_public", true),
  ]);
  if (leagueResult.error) return [];
  const memberships = membershipResult.error ? [] : (membershipResult.data || []) as JsonRecord[];
  return ((leagueResult.data || []) as LeagueProfile[]).map((league) => {
    const rows = memberships.filter((membership) => membership.league_id === league.id && membership.status !== "withdrawn");
    return {
      league,
      teamCount: new Set(rows.map((row) => String(row.team_id))).size,
      divisions: getLeagueDivisions(league.slug, rows.map((row) => String(row.division || "League table"))),
      seasons: Array.from(new Set(rows.map((row) => String(row.season_label || "Current season")))).sort().reverse(),
    };
  });
}

export async function loadLeaguePortal(slug: string) {
  const leagueResult = await supabase.from("leagues").select("*").eq("slug", slug).eq("is_public", true).maybeSingle();
  if (leagueResult.error || !leagueResult.data) return null;
  const league = leagueResult.data as LeagueProfile;

  const [membershipResult, teamGameResult, gameResult] = await Promise.all([
    supabase
      .from("team_league_memberships")
      .select("*,team_profiles(id,slug,name,short_name,logo_url,cover_image_url,primary_color,secondary_color,city,country,verification_status)")
      .eq("league_id", league.id)
      .eq("is_public", true)
      .neq("status", "withdrawn")
      .order("display_order")
      .order("created_at"),
    supabase.from("team_games").select("*").eq("league_id", league.id).eq("is_public", true),
    supabase.from("games").select("*").eq("league_id", league.id),
  ]);

  const memberships: LeagueMembership[] = membershipResult.error
    ? []
    : ((membershipResult.data || []) as JsonRecord[]).flatMap((row) => {
        const team = relatedTeam(row.team_profiles);
        if (!team) return [];
        return [{
          id: String(row.id),
          league_id: String(row.league_id),
          team_id: String(row.team_id),
          season_label: String(row.season_label || "Current season"),
          division: String(row.division || "Open"),
          conference: row.conference ? String(row.conference) : null,
          status: String(row.status || "active"),
          display_order: number(row.display_order),
          team,
        }];
      });

  const teamGames = teamGameResult.error ? [] : (teamGameResult.data || []) as JsonRecord[];
  const games = gameResult.error ? [] : (gameResult.data || []) as Array<GameRecord & { home_team_id?: string | null; away_team_id?: string | null; league_id?: string | null }>;

  const standings = memberships.map((membership): LeagueStanding => {
    const records = new Map<string, { scored: number; allowed: number }>();

    games.forEach((game) => {
      const side = game.home_team_id === membership.team_id ? "home" : game.away_team_id === membership.team_id ? "away" : null;
      if (!side || !finished(game.status)) return;
      const scored = side === "home" ? getHomeScore(game) : getAwayScore(game);
      const allowed = side === "home" ? getAwayScore(game) : getHomeScore(game);
      if (scored === null || allowed === null || scored === allowed) return;
      records.set(`game:${game.id}`, { scored, allowed });
    });

    teamGames.filter((game) => game.team_id === membership.team_id).forEach((game) => {
      const scored = number(game.team_score);
      const allowed = number(game.opponent_score);
      if (scored === null || allowed === null || scored === allowed) return;
      const linkedId = String(game.game_id || "");
      const key = linkedId ? `game:${linkedId}` : `team:${String(game.id)}`;
      if (!records.has(key)) records.set(key, { scored, allowed });
    });

    const completed = [...records.values()];
    const wins = completed.filter((game) => game.scored > game.allowed).length;
    const pointsFor = completed.reduce((sum, game) => sum + game.scored, 0);
    const pointsAgainst = completed.reduce((sum, game) => sum + game.allowed, 0);
    return {
      membershipId: membership.id,
      team: membership.team,
      seasonLabel: membership.season_label,
      division: membership.division,
      played: completed.length,
      wins,
      losses: completed.length - wins,
      pointsFor,
      pointsAgainst,
      pointDifference: pointsFor - pointsAgainst,
      winPercentage: completed.length ? (wins / completed.length) * 100 : 0,
    };
  }).sort((left, right) =>
    right.wins - left.wins ||
    right.winPercentage - left.winPercentage ||
    right.pointDifference - left.pointDifference ||
    right.pointsFor - left.pointsFor ||
    left.team.name.localeCompare(right.team.name)
  );

  return {
    league,
    memberships,
    standings,
    divisions: getLeagueDivisions(league.slug, memberships.map((membership) => membership.division)),
  };
}
