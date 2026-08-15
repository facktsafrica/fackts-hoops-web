import { redirect } from "next/navigation";
import { getTeamPortalAccess, getTeamPortalTeams } from "@/lib/team-portal/access";
import TeamPortalClient from "./TeamPortalClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPortalPage({ searchParams }: { searchParams: Promise<{ team_id?: string }> }) {
  const requestedTeamId = String((await searchParams).team_id || "").trim() || null;
  const teamList = await getTeamPortalTeams();
  const selectedTeamId = requestedTeamId && teamList.teams.some((team) => team.id === requestedTeamId)
    ? requestedTeamId
    : teamList.teams[0]?.id || null;
  const access = await getTeamPortalAccess(selectedTeamId);
  if (!access.user || !access.allowed || !access.membership) redirect("/team-portal/login");
  return <TeamPortalClient teamId={access.membership.team_id} portalTeams={teamList.teams} />;
}
