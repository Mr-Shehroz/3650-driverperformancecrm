import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/data";
import { SESSION_COOKIE } from "./roles";
import type { Role } from "@/types";

export async function getSession() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = await getUserById(id);
  return user && user.active ? user : null;
}

export async function requireRole(role: Role) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== role) redirect("/");
  return user;
}

/** Any logged-in, active user (any role) */
export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}
