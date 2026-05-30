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

  return (
    <>
      {!isLoginPage ? <AdminDraftKeeper pathname={pathname} /> : null}
      {children}
    </>
  );
}

function AdminDraftKeeper({ pathname }: { pathname: string }) {
  const [draftExists, setDraftExists] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `fackts-admin-draft:${pathname}`;

    function getFields() {
      return Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input, textarea, select"
        )
      ).filter((field) => {
        if (field.closest("[data-no-draft='true']")) return false;
        if (field instanceof HTMLInputElement && field.type === "password") return false;
        if (field instanceof HTMLInputElement && field.type === "file") return false;
        if (field instanceof HTMLInputElement && field.type === "hidden") return false;
        if (field instanceof HTMLInputElement && field.type === "submit") return false;
        if (field instanceof HTMLInputElement && field.type === "button") return false;
        return true;
      });
    }

    function getFieldKey(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, index: number) {
      return (
        field.getAttribute("name") ||
        field.getAttribute("id") ||
        field.getAttribute("placeholder") ||
        field.getAttribute("aria-label") ||
        `field-${index}`
      );
    }

    function saveDraft() {
      const fields = getFields();

      const values = fields.map((field, index) => {
        const key = getFieldKey(field, index);

        if (field instanceof HTMLInputElement && field.type === "checkbox") {
          return {
            key,
            kind: "checkbox",
            value: field.checked,
          };
        }

        return {
          key,
          kind: "value",
          value: field.value,
        };
      });

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          values,
        })
      );

      setDraftExists(values.some((item) => String(item.value || "").length > 0));
    }

    function restoreDraft() {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setDraftExists(false);
        return;
      }

      let parsed: any = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        localStorage.removeItem(storageKey);
        setDraftExists(false);
        return;
      }

      const savedValues = Array.isArray(parsed?.values) ? parsed.values : [];
      if (savedValues.length === 0) {
        setDraftExists(false);
        return;
      }

      const fields = getFields();

      fields.forEach((field, index) => {
        const key = getFieldKey(field, index);
        const saved = savedValues.find((item: any) => item.key === key);

        if (!saved) return;

        if (field instanceof HTMLInputElement && field.type === "checkbox") {
          field.checked = Boolean(saved.value);
          field.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }

        field.value = String(saved.value ?? "");
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      });

      setDraftExists(true);
    }

    const restoreTimer = window.setTimeout(restoreDraft, 500);

    document.addEventListener("input", saveDraft, true);
    document.addEventListener("change", saveDraft, true);

    return () => {
      window.clearTimeout(restoreTimer);
      document.removeEventListener("input", saveDraft, true);
      document.removeEventListener("change", saveDraft, true);
    };
  }, [pathname]);

  function clearDraft() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(`fackts-admin-draft:${pathname}`);
    setDraftExists(false);
    window.location.reload();
  }

  if (!draftExists) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] rounded-2xl border border-orange-500/40 bg-slate-950/95 px-4 py-3 text-sm text-white shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-bold text-orange-300">Draft saved on this page</span>

        <button
          type="button"
          onClick={clearDraft}
          className="rounded-xl border border-white/10 px-3 py-1 text-xs font-black text-zinc-300 transition hover:border-orange-400 hover:text-orange-300"
        >
          Clear Draft
        </button>
      </div>
    </div>
  );
}