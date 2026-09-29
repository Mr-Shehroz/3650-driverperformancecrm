"use client";

import { PortalShell } from "@/components/shared/portal-shell";
import { DRIVER_NAV, DRIVER_NAV_GROUPS } from "@/lib/nav";
import type { User } from "@/types";

export function DriverShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      user={user}
      roleLabel="Driver"
      homeHref="/driver"
      navGroups={DRIVER_NAV_GROUPS}
      bottomNav={DRIVER_NAV}
      contentClassName=""
    >
      {children}
    </PortalShell>
  );
}
