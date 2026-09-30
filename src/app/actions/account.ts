"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { setUserPassword, updateUser, verifyPassword } from "@/lib/data";

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

  await updateUser(user.id, {
    name: parsed.data.name,
    phone: parsed.data.phone ?? "",
  });
  revalidatePath("/", "layout");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
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

  if (!(await verifyPassword(user.id, parsed.data.current))) {
    return { fieldErrors: { current: "Current password is incorrect" } };
  }

  await setUserPassword(user.id, parsed.data.next);
}
