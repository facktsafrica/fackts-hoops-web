"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PlayerLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/player/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-500/20"
    >
      Logout
    </button>
  );
}
