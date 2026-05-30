"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AccessState = "checking" | "allowed" | "denied";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [access, setAccess] = useState<AccessState>("checking");
  const [message, setMessage] = useState("Checking admin access...");

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (isLoginPage) {
        if (active) {
          setAccess("allowed");
        }
        return;
      }

      setAccess("checking");
      setMessage("Checking login session...");

      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data.session?.user;

      if (!user) {
        if (active) {
          setAccess("denied");
          setMessage("You must log in before opening the admin dashboard.");
        }
        return;
      }

      setMessage("Checking admin approval...");

      const profileResult = await supabase
        .from("admin_profiles")
        .select("id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (profileResult.error) {
        if (active) {
          setAccess("denied");
          setMessage(`Admin check failed: ${profileResult.error.message}`);
        }
        return;
      }

      if (!profileResult.data) {
        await supabase.auth.signOut();

        if (active) {
          setAccess("denied");
          setMessage("This account is not approved for FACKTS admin access.");
        }
        return;
      }

      if (active) {
        setAccess("allowed");
      }
    }

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
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

          <h1 className="mt-3 text-2xl font-black">Admin Login Required</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>

          <Link
            href="/admin/login"
            className="mt-5 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
          >
            Go to Admin Login
          </Link>

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

  return <>{children}</>;
}