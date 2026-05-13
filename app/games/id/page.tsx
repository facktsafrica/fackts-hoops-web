import { redirect } from "next/navigation";

export default function GamesIdFallbackPage() {
  redirect("/games");
}