import type { Role } from "@/types";

export const SESSION_COOKIE = "drs_uid";

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
