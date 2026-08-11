"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  adminRolePresetDefinition,
  type AdminPermissionProfile,
} from "@/lib/admin/permissions";

type AdminPermissionContextValue = {
  profile: AdminPermissionProfile | null;
  readOnly: boolean;
};

const AdminPermissionContext = createContext<AdminPermissionContextValue>({
  profile: null,
  readOnly: false,
});

export function AdminPermissionProvider({
  profile,
  children,
}: {
  profile: AdminPermissionProfile | null;
  children: ReactNode;
}) {
  const readOnly = adminRolePresetDefinition(profile?.role)?.readOnly ?? false;

  return (
    <AdminPermissionContext.Provider value={{ profile, readOnly }}>
      {children}
    </AdminPermissionContext.Provider>
  );
}

export function useAdminPermission() {
  return useContext(AdminPermissionContext);
}
