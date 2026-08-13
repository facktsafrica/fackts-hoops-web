import { redirect } from "next/navigation";
import { getTeamPortalAccess } from "@/lib/team-portal/access";
import TeamPortalClient from "./TeamPortalClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPortalPage() {
  const access = await getTeamPortalAccess();
  if (!access.user || !access.allowed || !access.membership) redirect("/team-portal/login");
  return <TeamPortalClient teamId={access.membership.team_id} />;
}
