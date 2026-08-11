import { redirect } from "next/navigation";

export default function LegacyGuestHoopersAdminPage() {
  redirect("/admin/players?classification=guest");
}
