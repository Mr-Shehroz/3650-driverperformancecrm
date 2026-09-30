"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateOwnProfile } from "@/lib/data";
import { passwordRule } from "@/lib/validation/password";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

function toFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateProfileAction(
  input: z.infer<typeof profileSchema>,
): Promise<AccountResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    await updateOwnProfile(user.id, {
      name: parsed.data.name,
      phone: parsed.data.phone ?? "",
    });
  } catch {
    return { error: "Couldn't save your profile. Please try again." };
  }
  revalidatePath("/", "layout");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: passwordRule,
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })
  .refine((d) => d.next !== d.current, {
    message: "New password must be different",
    path: ["next"],
  });

export async function changePasswordAction(
  input: z.infer<typeof passwordSchema>,
): Promise<AccountResult> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  // Check the current password without touching the user's session cookies
  const checker = createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: checkErr } = await checker.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (checkErr)
    return { fieldErrors: { current: "Current password is incorrect" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.next,
  });
  if (error) return { error: error.message };
}

/** Save (or remove) a profile photo. Users can change their own; admins can change anyone's. */
export async function updateAvatarAction(
  targetUserId: string,
  url: string | null,
): Promise<AccountResult> {
  const me = await requireUser();
  if (targetUserId !== me.id && me.role !== "admin")
    return { error: "Not allowed." };

  // Only accept files from our avatars bucket, inside this user's folder
  if (url) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
    const prefix = `${base}/storage/v1/object/public/avatars/${targetUserId}/`;
    if (!url.startsWith(prefix)) return { error: "Invalid image." };
  }

  const admin = createAdminClient();
  const { data: prev } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", targetUserId)
    .maybeSingle();

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", targetUserId);
  if (error) return { error: "Couldn't save the photo. Please try again." };

  // Remove the old file so storage doesn't fill up
  const oldPath = prev?.avatar_url?.split("/object/public/avatars/")[1];
  if (oldPath && prev?.avatar_url !== url) {
    await admin.storage.from("avatars").remove([oldPath]);
  }

  revalidatePath("/", "layout");
}
