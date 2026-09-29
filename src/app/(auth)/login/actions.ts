"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/data";
import { MOCK_PASSWORD } from "@/lib/mock/data";
import { SESSION_COOKIE, homeFor } from "@/lib/auth/roles";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await getUserByEmail(email);
  if (!user || password !== MOCK_PASSWORD)
    return { error: "Invalid email or password." };
  if (!user.active)
    return { error: "Your account is deactivated. Contact admin." };

  (await cookies()).set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(homeFor(user.role));
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
