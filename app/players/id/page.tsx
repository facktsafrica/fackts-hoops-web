import { redirect } from "next/navigation";

export default function PlayersIdFallbackPage() {
  redirect("/players");
}
