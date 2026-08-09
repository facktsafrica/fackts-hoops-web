import { redirect } from "next/navigation";

export default function LegacyGuestHoopersPage() {
  redirect("/players?status=guest");
}
