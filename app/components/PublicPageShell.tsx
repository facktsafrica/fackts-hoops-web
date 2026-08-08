"use client";

import { usePathname } from "next/navigation";

const PRIVATE_SHELLS = ["/admin", "/account", "/player"];

export default function PublicPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const usePrivateShell = PRIVATE_SHELLS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (usePrivateShell) return children;

  return <div className="fackts-public-shell">{children}</div>;
}
