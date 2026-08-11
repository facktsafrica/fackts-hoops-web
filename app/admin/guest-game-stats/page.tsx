import { redirect } from "next/navigation";

export default function GuestGameStatsRedirect() {
  redirect("/admin/stats?classification=guest");
}
