"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AdminCapability, AdminRolePreset } from "@/lib/admin/permissions";

type RoleDefinition = {
  role_key: AdminRolePreset;
  label: string;
  description?: string | null;
  permissions: AdminCapability[];
  read_only: boolean;
  requires_scope: boolean;
};

type Assignment = {
  id?: string;
  resource_type: string;
  resource_id: string;
};

type AdminUser = {
  id: string;
  user_id: string;
  display_name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  is_super_admin?: boolean | null;
  permissions?: AdminCapability[] | null;
  assignments?: Assignment[];
};

const RESOURCE_TYPES = [
  ["event", "Event"],
  ["game", "Game"],
  ["team", "Team"],
  ["player", "Player"],
  ["media", "Media"],
  ["report", "Report"],
  ["partner", "Partner"],
] as const;

const emptyAssignment: Assignment = {
  resource_type: "event",
  resource_id: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRolePreset | "">("");
  const [isActive, setIsActive] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingId) ?? null,
    [editingId, users]
  );
  const selectedRole = useMemo(
    () => roles.find((candidate) => candidate.role_key === role) ?? null,
    [role, roles]
  );
  const visibleUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.is_super_admin || user.is_active !== false || showBlocked
      ),
    [showBlocked, users]
  );
  const blockedCount = useMemo(
    () => users.filter((user) => !user.is_super_admin && user.is_active === false).length,
    [users]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      setMessage(result.error || "Admin users could not be loaded.");
      setUsers([]);
      setRoles([]);
    } else {
      setUsers(result.users ?? []);
      setRoles(result.roles ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  function resetForm() {
    setEditingId("");
    setDisplayName("");
    setEmail("");
    setPassword("");
    setRole("");
    setIsActive(true);
    setAssignments([]);
  }

  function editUser(user: AdminUser) {
    setEditingId(user.id);
    setDisplayName(user.display_name || "");
    setEmail(user.email || "");
    setPassword("");
    setRole((user.role as AdminRolePreset) || "");
    setIsActive(user.is_active !== false);
    setAssignments(
      (user.assignments ?? []).map((assignment) => ({
        resource_type: assignment.resource_type,
        resource_id: assignment.resource_id,
      }))
    );
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAssignment(index: number, patch: Partial<Assignment>) {
    setAssignments((current) =>
      current.map((assignment, assignmentIndex) =>
        assignmentIndex === index ? { ...assignment, ...patch } : assignment
      )
    );
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: editingUser ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingUser ? { id: editingUser.id } : { email, password }),
        display_name: displayName,
        role,
        is_active: isActive,
        assignments: assignments.filter((assignment) => assignment.resource_id.trim()),
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      setMessage(result.error || "Admin user could not be saved.");
    } else {
      setMessage(result.message || "Admin user saved.");
      resetForm();
      await loadUsers();
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Phase 1 · Access control
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Users & Permissions
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Assign one approved operational role, then limit scoped roles to
              the exact event, game, team, player, report or partner they may access.
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
          <div
            role="status"
            className="mt-6 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-4 text-sm text-orange-100"
          >
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={saveUser}
            autoComplete="off"
            className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              {editingUser ? "Edit access" : "New Admin user"}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {editingUser ? editingUser.display_name || "Admin user" : "Create operational access"}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-300">Name</span>
                <input
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
                />
              </label>

              {!editingUser ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">Email</span>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Temporary password
                    </span>
                    <input
                      required
                      minLength={10}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
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
                      Turn this off to block access immediately.
                    </span>
                  </span>
                </label>
              )}

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-300">
                  Operational role
                </span>
                <select
                  required
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value as AdminRolePreset);
                    const nextRole = roles.find(
                      (candidate) => candidate.role_key === event.target.value
                    );
                    if (!nextRole?.requires_scope) setAssignments([]);
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-black px-4 outline-none focus:border-orange-400"
                >
                  <option value="">Choose a role</option>
                  {roles.map((candidate) => (
                    <option key={candidate.role_key} value={candidate.role_key}>
                      {candidate.label}{candidate.read_only ? " · read only" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedRole ? (
              <div className="mt-4 rounded-2xl border border-slate-700 bg-black/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-black uppercase text-orange-300">
                    {selectedRole.label}
                  </span>
                  {selectedRole.read_only ? (
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-black uppercase text-blue-300">
                      Read only
                    </span>
                  ) : null}
                  {selectedRole.requires_scope ? (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase text-amber-300">
                      Scope required
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {selectedRole.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedRole.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-400"
                    >
                      {permission.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedRole?.requires_scope ? (
              <section className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">Resource assignments</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Use the exact record ID. Unassigned records remain inaccessible.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAssignments((current) => [...current, { ...emptyAssignment }])
                    }
                    className="rounded-full border border-amber-400/40 px-3 py-2 text-xs font-black text-amber-200"
                  >
                    Add scope
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  {assignments.map((assignment, index) => (
                    <div
                      key={`${assignment.resource_type}-${index}`}
                      className="grid gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-3 sm:grid-cols-[0.7fr_1fr_auto]"
                    >
                      <select
                        aria-label={`Resource type ${index + 1}`}
                        value={assignment.resource_type}
                        onChange={(event) =>
                          updateAssignment(index, { resource_type: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-700 bg-black px-3 text-sm"
                      >
                        {RESOURCE_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        aria-label={`Resource ID ${index + 1}`}
                        required
                        value={assignment.resource_id}
                        onChange={(event) =>
                          updateAssignment(index, { resource_id: event.target.value })
                        }
                        placeholder="Exact event, team or partner ID"
                        className="h-11 rounded-xl border border-slate-700 bg-black px-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAssignments((current) =>
                            current.filter((_, assignmentIndex) => assignmentIndex !== index)
                          )
                        }
                        className="h-11 rounded-xl border border-red-500/30 px-3 text-xs font-black text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {!assignments.length ? (
                    <p className="rounded-xl border border-dashed border-amber-500/30 p-4 text-center text-xs text-amber-100/70">
                      Add at least one assignment before saving this scoped role.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-60"
              >
                {saving ? "Saving..." : editingUser ? "Save access" : "Create Admin user"}
              </button>
              {editingUser ? (
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
              <h2 className="text-2xl font-black">Admin accounts</h2>
              <div className="flex items-center gap-2">
                {blockedCount ? (
                  <button
                    type="button"
                    onClick={() => setShowBlocked((current) => !current)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs font-black text-slate-300"
                  >
                    {showBlocked ? "Hide blocked" : `Show blocked (${blockedCount})`}
                  </button>
                ) : null}
                <span className="rounded-full border border-slate-800 px-3 py-1 text-xs font-black text-slate-500">
                  {visibleUsers.length}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
                Loading Admin accounts...
              </div>
            ) : visibleUsers.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
                No Admin accounts found.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleUsers.map((user) => {
                  const roleDefinition = roles.find(
                    (candidate) => candidate.role_key === user.role
                  );
                  return (
                    <article
                      key={user.id}
                      className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black">
                              {user.display_name || user.email || "FACKTS Admin"}
                            </h3>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                              user.is_super_admin
                                ? "bg-orange-500 text-black"
                                : user.is_active !== false
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-red-500/15 text-red-300"
                            }`}>
                              {user.is_super_admin
                                ? "Super Admin"
                                : user.is_active !== false
                                  ? "Active"
                                  : "Blocked"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {user.email || "Email not recorded"}
                          </p>
                        </div>
                        {!user.is_super_admin ? (
                          <button
                            type="button"
                            onClick={() => editUser(user)}
                            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black hover:border-orange-400"
                          >
                            Edit access
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-black uppercase text-blue-300">
                          {user.is_super_admin
                            ? "Full access"
                            : roleDefinition?.label || user.role || "Legacy custom role"}
                        </span>
                        {roleDefinition?.read_only ? (
                          <span className="rounded-full bg-slate-700 px-3 py-1 text-[10px] font-black uppercase text-slate-300">
                            Read only
                          </span>
                        ) : null}
                      </div>

                      {(user.assignments ?? []).length ? (
                        <div className="mt-4 border-t border-slate-800 pt-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Assigned resources
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(user.assignments ?? []).map((assignment) => (
                              <span
                                key={`${assignment.resource_type}:${assignment.resource_id}`}
                                className="rounded-full border border-amber-500/30 px-3 py-1 text-[10px] font-bold text-amber-200"
                              >
                                {assignment.resource_type}: {assignment.resource_id}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </article>
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
