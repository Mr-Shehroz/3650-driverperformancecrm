import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role, User } from "@/types";

const COLS = "id, name, email, phone, role, active, avatar_url";

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  avatar_url: string | null;
};

const toUser = (p: ProfileRow): User => ({
  id: p.id,
  name: p.name,
  email: p.email,
  phone: p.phone ?? undefined,
  role: p.role,
  active: p.active,
  avatarUrl: p.avatar_url ?? undefined,
});

/* ---------- Reads (as the logged-in user) ---------- */
export async function getUsers(): Promise<User[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("profiles").select(COLS).order("name");
  if (error) throw error;
  return (data ?? []).map(toUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("profiles")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  return data ? toUser(data) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("profiles")
    .select(COLS)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data ? toUser(data) : null;
}

async function getByRole(
  role: Role,
  includeInactive: boolean,
): Promise<User[]> {
  const sb = await createClient();
  let q = sb.from("profiles").select(COLS).eq("role", role).order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toUser);
}

export const getDrivers = (includeInactive = false) =>
  getByRole("driver", includeInactive);
export const getReps = (includeInactive = false) =>
  getByRole("sales_rep", includeInactive);

export async function emailExists(
  email: string,
  excludeId?: string,
): Promise<boolean> {
  const sb = await createClient();
  let q = sb
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase());
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.limit(1);
  return !!data?.length;
}

/* ---------- Own profile ---------- */
export async function updateOwnProfile(
  userId: string,
  patch: { name: string; phone: string },
) {
  const sb = await createClient();
  const { error } = await sb
    .from("profiles")
    .update({ name: patch.name, phone: patch.phone || null })
    .eq("id", userId);
  if (error) throw error;
}

/* ---------- Admin (service role) ---------- */
export async function createUser(
  input: { name: string; email: string; phone?: string; role: Role },
  password: string,
): Promise<User> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password,
    email_confirm: true,
    app_metadata: { role: input.role }, // role lives in the token so the proxy can read it
    user_metadata: { name: input.name, phone: input.phone || "" },
  });
  if (error || !data.user)
    throw new Error(error?.message ?? "Couldn't create user");

  // The database trigger has created the profile row
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select(COLS)
    .eq("id", data.user.id)
    .single();
  if (pErr) throw pErr;
  return toUser(profile);
}

export async function updateUser(
  id: string,
  patch: { name: string; email: string; phone?: string; role: Role },
): Promise<User | null> {
  const admin = createAdminClient();
  const email = patch.email.trim().toLowerCase();

  const { error: authErr } = await admin.auth.admin.updateUserById(id, {
    email,
    app_metadata: { role: patch.role },
    user_metadata: { name: patch.name, phone: patch.phone || "" },
  });
  if (authErr) throw new Error(authErr.message);

  const { data, error } = await admin
    .from("profiles")
    .update({
      name: patch.name,
      email,
      phone: patch.phone || null,
      role: patch.role,
    })
    .eq("id", id)
    .select(COLS)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data) : null;
}

export async function setUserActive(
  id: string,
  active: boolean,
): Promise<User | null> {
  const admin = createAdminClient();

  // Banned users can't log in and their existing sessions stop working
  const { error: authErr } = await admin.auth.admin.updateUserById(id, {
    ban_duration: active ? "none" : "876000h",
  });
  if (authErr) throw new Error(authErr.message);

  const { data, error } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", id)
    .select(COLS)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data) : null;
}

export async function setUserPassword(
  id: string,
  password: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  return !error;
}
