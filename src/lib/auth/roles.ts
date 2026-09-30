import type { Role } from "@/types";

export function homeFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  return "/sales";
}

export const ROUTE_ROLES: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/driver", role: "driver" },
  { prefix: "/sales", role: "sales_rep" },
];

/** "/driver" matches "/driver" and "/driver/..." but not "/driver-offline" */
export function matchRoute(pathname: string) {
  return ROUTE_ROLES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
}
