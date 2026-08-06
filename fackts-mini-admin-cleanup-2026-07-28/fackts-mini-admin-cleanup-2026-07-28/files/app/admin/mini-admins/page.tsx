"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CAPABILITIES,
  type AdminCapability,
} from "@/lib/admin/permissions";

type MiniAdmin = {
  id: string;
  user_id: string;
  display_name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  is_super_admin?: boolean | null;
  permissions?: string[] | null;
  created_at?: string | null;
};

export default function MiniAdminsPage() {
  const [admins, setAdmins] = useState<MiniAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<AdminCapability[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);

  const editingAdmin = useMemo(
    () => admins.find((admin) => admin.id === editingId) ?? null,
    [admins, editingId]
  );
  const visibleAdmins = useMemo(
    () =>
      admins.filter(
        (admin) =>
          admin.is_super_admin === true ||
          admin.is_active !== false ||
          showBlocked
      ),
    [admins, showBlocked]
  );
  const blockedCount = useMemo(
    () =>
      admins.filter(
        (admin) =>
          admin.is_super_admin !== true && admin.is_active === false
      ).length,
    [admins]
  );

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/mini-admins", {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      setMessage(result.error || "Mini admins could not be loaded.");
      setAdmins([]);
    } else {
      setAdmins(result.admins ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdmins();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAdmins]);

  function resetForm() {
    setEditingId("");
    setDisplayName("");
    setEmail("");
    setPassword("");
    setIsActive(true);
    setPermissions([]);
  }

  function editAdmin(admin: MiniAdmin) {
    setEditingId(admin.id);
    setDisplayName(admin.display_name || "");
    setEmail(admin.email || "");
    setPassword("");
    setIsActive(admin.is_active !== false);
    setPermissions(
      (admin.permissions ?? []).filter((permission): permission is AdminCapability =>
        ADMIN_CAPABILITIES.some((capability) => capability.key === permission)
      )
    );
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function togglePermission(permission: AdminCapability) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  async function saveAdmin(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/mini-admins", {
      method: editingAdmin ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingAdmin
          ? {
              id: editingAdmin.id,
              display_name: displayName,
              is_active: isActive,
              permissions,
            }
          : {
              display_name: displayName,
              email,
              password,
              permissions,
            }
      ),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      setMessage(result.error || "Mini admin could not be saved.");
    } else {
      setMessage(result.message || "Mini admin saved.");
      resetForm();
      await loadAdmins();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Super Admin
            </p>
            <h1 className="mt-2 text-4xl font-black">Mini Admin Rights</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Create a team admin, then choose exactly which FACKTS tools they
              can open.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black"
          >
            Back to Admin
          </Link>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={saveAdmin}
            autoComplete="off"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              {editingAdmin ? "Edit Rights" : "New Mini Admin"}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {editingAdmin
                ? editingAdmin.display_name || "Mini Admin"
                : "Create Team Access"}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-300">
                  Name
                </span>
                <input
                  required
                  autoComplete="off"
                  name="new-mini-admin-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                />
              </label>

              {!editingAdmin ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Email
                    </span>
                    <input
                      required
                      type="email"
                      autoComplete="off"
                      name="new-mini-admin-email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Temporary Password
                    </span>
                    <input
                      required
                      minLength={10}
                      type="password"
                      autoComplete="new-password"
                      name="new-mini-admin-temporary-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400"
                    />
                  </label>
                </>
              ) : (
                <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-black/40 p-4 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-5 w-5 accent-orange-500"
                  />
                  <span>
                    <span className="block font-black">Account active</span>
                    <span className="text-xs text-slate-500">
                      Turn this off to block the mini admin immediately.
                    </span>
                  </span>
                </label>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-200">
                  Select Admin Rights
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setPermissions(
                      permissions.length === ADMIN_CAPABILITIES.length
                        ? []
                        : ADMIN_CAPABILITIES.map(
                            (capability) => capability.key
                          )
                    )
                  }
                  className="text-xs font-black text-orange-300"
                >
                  {permissions.length === ADMIN_CAPABILITIES.length
                    ? "Clear all"
                    : "Select all"}
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ADMIN_CAPABILITIES.map((capability) => (
                  <label
                    key={capability.key}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${
                      permissions.includes(capability.key)
                        ? "border-orange-500/50 bg-orange-500/10"
                        : "border-slate-800 bg-black/25"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(capability.key)}
                      onChange={() => togglePermission(capability.key)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <span className="text-sm font-bold">{capability.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingAdmin
                    ? "Save Rights"
                    : "Create Mini Admin"}
              </button>
              {editingAdmin ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-700 px-5 py-3 font-black"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Admin Accounts</h2>
              <div className="flex items-center gap-2">
                {blockedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowBlocked((current) => !current)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs font-black text-slate-300 transition hover:border-orange-400"
                  >
                    {showBlocked
                      ? "Hide blocked"
                      : `Show blocked (${blockedCount})`}
                  </button>
                ) : null}
                <span className="rounded-full border border-slate-800 px-3 py-1 text-xs font-black text-slate-500">
                  {visibleAdmins.length}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
                Loading admin accounts...
              </div>
            ) : visibleAdmins.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
                No admin accounts found.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleAdmins.map((admin) => {
                  const superAdmin = admin.is_super_admin === true;
                  return (
                    <div
                      key={admin.id}
                      className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black">
                              {admin.display_name ||
                                admin.email ||
                                admin.role ||
                                "FACKTS Admin"}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                superAdmin
                                  ? "bg-orange-500 text-black"
                                  : admin.is_active !== false
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-red-500/15 text-red-300"
                              }`}
                            >
                              {superAdmin
                                ? "Super Admin"
                                : admin.is_active !== false
                                  ? "Active"
                                  : "Blocked"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {admin.email || "Email not recorded"}
                          </p>
                        </div>

                        {!superAdmin ? (
                          <button
                            type="button"
                            onClick={() => editAdmin(admin)}
                            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black transition hover:border-orange-400"
                          >
                            Edit Rights
                          </button>
                        ) : null}
                      </div>

                      {!superAdmin ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(admin.permissions ?? []).map((permission) => {
                            const label =
                              ADMIN_CAPABILITIES.find(
                                (capability) => capability.key === permission
                              )?.label || permission;
                            return (
                              <span
                                key={permission}
                                className="rounded-full border border-slate-700 bg-black/30 px-3 py-1 text-[10px] font-bold text-slate-400"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-slate-500">
                          Full access to every admin tool.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
