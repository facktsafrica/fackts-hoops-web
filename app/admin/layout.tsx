"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  canAdmin,
  capabilityForAdminPath,
  isSuperAdminRole,
  type AdminPermissionProfile,
} from "@/lib/admin/permissions";
import { supabase } from "@/lib/supabase";
import AdminNavigation from "@/app/components/AdminNavigation";
import { AdminPermissionProvider } from "@/app/components/AdminPermissionContext";
import "./admin-executive.css";

type AccessState = "checking" | "allowed" | "denied";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [access, setAccess] = useState<AccessState>("checking");
  const [message, setMessage] = useState("Checking admin access...");
  const [profile, setProfile] = useState<AdminPermissionProfile | null>(null);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (isLoginPage) {
        if (active) {
          setProfile(null);
          setAccess("allowed");
        }
        return;
      }

      setAccess("checking");
      setMessage("Checking login session...");

      const userResult = await supabase.auth.getUser();
      const user = userResult.data.user;

      if (!user) {
        if (active) {
          setProfile(null);
          setAccess("denied");
          setMessage("You must log in before opening the admin dashboard.");
        }
        return;
      }

      setMessage("Checking admin approval...");

      const profileResult = await supabase
        .from("admin_profiles")
        .select("id, role, is_active, is_super_admin, permissions")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      let profile = profileResult.data as AdminPermissionProfile | null;

      if (profileResult.error) {
        const legacyResult = await supabase
          .from("admin_profiles")
          .select("id, role, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (legacyResult.error) {
          if (active) {
            setAccess("denied");
            setMessage(`Admin check failed: ${legacyResult.error.message}`);
          }
          return;
        }

        profile = legacyResult.data
          ? {
              ...legacyResult.data,
              is_super_admin: isSuperAdminRole(legacyResult.data.role),
              permissions: undefined,
            }
          : null;
      }

      if (!profile) {
        await supabase.auth.signOut();

        if (active) {
          setProfile(null);
          setAccess("denied");
          setMessage("This account is not approved for FACKTS admin access.");
        }
        return;
      }

      const requiredCapability = capabilityForAdminPath(pathname);
      const permitted =
        !requiredCapability || canAdmin(profile, requiredCapability);

      if (!permitted) {
        if (active) {
          setProfile(profile);
          setAccess("denied");
          setMessage(
            "Your mini-admin account does not have permission to open this tool."
          );
        }
        return;
      }

      if (active) {
        setProfile(profile);
        setAccess("allowed");
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname]);

  if (access === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 text-center">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-3 text-2xl font-black">Checking Access</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>
        </div>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 text-center">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-3 text-2xl font-black">Admin Access Required</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>

          {message.includes("permission") ? (
            <Link
              href="/admin"
              className="mt-5 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
            >
              Back to My Admin Tools
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="mt-5 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
            >
              Go to Admin Login
            </Link>
          )}

          <Link
            href="/"
            className="mt-4 block text-sm font-bold text-zinc-500 transition hover:text-orange-300"
          >
            Back to public site
          </Link>
        </div>
      </main>
    );
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <AdminPermissionProvider profile={profile}>
      <div className="admin-executive-shell">
        <AdminNavigation />
        <div className="admin-executive-workspace">{children}</div>
      </div>
    </AdminPermissionProvider>
  );
}
