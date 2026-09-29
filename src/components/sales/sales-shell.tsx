"use client";

import { PortalShell } from "@/components/shared/portal-shell";
import { SALES_NAV_GROUPS } from "@/lib/nav";
import type { User } from "@/types";

export function SalesShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      user={user}
      roleLabel="Sales Rep"
      homeHref="/sales"
      navGroups={SALES_NAV_GROUPS}
    >
      {children}
    </PortalShell>
  );
}
