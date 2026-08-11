import { redirect } from "next/navigation";

export default function LegacyMiniAdminsPage() {
  redirect("/admin/users");
}
