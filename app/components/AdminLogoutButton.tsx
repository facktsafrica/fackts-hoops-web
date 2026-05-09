"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-2xl border border-rose-500/40 px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/10"
    >
      Logout
    </button>
  );
}