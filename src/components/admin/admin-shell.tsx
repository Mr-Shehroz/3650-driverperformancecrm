"use client";

import { PortalShell } from "@/components/shared/portal-shell";
import { ADMIN_NAV } from "@/lib/nav";
import type { User } from "@/types";

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      user={user}
      roleLabel="Administrator"
      homeHref="/admin"
      navGroups={ADMIN_NAV}
    >
      {children}
    </PortalShell>
  );
}
