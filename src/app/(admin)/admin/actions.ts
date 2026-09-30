"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  createUser,
  emailExists,
  overrideLeadCost,
  restoreRecord,
  setUserActive,
  setUserPassword,
  setVerified,
  softDeleteRecord,
  updateJob,
  updatePreDamage,
  updateSettings,
  updateUser,
  upsertLeadCost,
} from "@/lib/data";
import type { LeadSource, RecordKind } from "@/types";
import { passwordRule } from "@/lib/validation/password";

export type AdminResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

function revalidateJob(jobId: string) {
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath(`/driver/jobs/${jobId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin", "layout");
}

function toFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const KINDS = ["pre_damage", "damage", "review", "upsell"] as const;

export async function toggleVerifiedAction(
  kind: "review" | "upsell",
  id: string,
  verified: boolean,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const rec = await setVerified(kind, id, verified, admin.id);
  if (!rec) return { error: "Record not found." };
  revalidateJob(rec.jobId);
}

export async function deleteRecordAction(
  kind: RecordKind,
  id: string,
  reason: string,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  if (!KINDS.includes(kind)) return { error: "Invalid record type." };
  if (!reason || reason.trim().length < 3)
    return { error: "A reason is required to delete a record." };
  const rec = await softDeleteRecord(kind, id, admin.id, reason.trim());
  if (!rec) return { error: "Record not found." };
  revalidateJob(rec.jobId);
}

export async function restoreRecordAction(
  kind: RecordKind,
  id: string,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  if (!KINDS.includes(kind)) return { error: "Invalid record type." };
  const rec = await restoreRecord(kind, id, admin.id);
  if (!rec) return { error: "Record not found." };
  revalidateJob(rec.jobId);
}

const correctionSchema = z.object({
  id: z.string().min(1),
  item: z.string().trim().min(1, "Item is required").max(120),
  location: z.string().trim().min(1, "Location is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(1000),
  notes: z.string().trim().max(1000),
  customerName: z.string().trim().min(2, "Customer name is required").max(120),
  reason: z
    .string()
    .trim()
    .min(3, "Give a reason for this correction")
    .max(500),
});

export type CorrectionInput = z.infer<typeof correctionSchema>;

export async function correctPreDamageAction(
  input: CorrectionInput,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const parsed = correctionSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { id, reason, notes, ...fields } = parsed.data;
  const rec = await updatePreDamage(
    id,
    { ...fields, notes: notes || undefined },
    admin.id,
    reason,
  );
  if (!rec) return { error: "Record not found." };
  revalidateJob(rec.jobId);
}

const jobPatchSchema = z.object({
  id: z.string().min(1),
  deliveredBy: z.enum(["drs", "partner"]),
  onTimePickup: z.boolean().nullable(),
  onTimeDelivery: z.boolean().nullable(),
});

export async function updateJobAction(
  input: z.infer<typeof jobPatchSchema>,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const parsed = jobPatchSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid job data." };

  const { id, ...patch } = parsed.data;
  const job = await updateJob(id, patch, admin.id);
  if (!job) return { error: "Job not found." };
  revalidateJob(job.id);
}

/* ---------- Sales ---------- */
const leadCostsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  costs: z.array(
    z.object({
      source: z.enum([
        "google_ppc",
        "tv_ad",
        "google_lead",
        "direct",
        "referral",
        "other",
      ]),
      cost: z.number().min(0).max(100000),
    }),
  ),
});

export async function saveLeadCostsAction(
  month: string,
  costs: { source: LeadSource; cost: number }[],
): Promise<{ error?: string; affected?: number }> {
  await requireRole("admin");
  const parsed = leadCostsSchema.safeParse({ month, costs });
  if (!parsed.success) return { error: "Enter valid costs (0 or more)." };

  let affected = 0;
  for (const c of parsed.data.costs) {
    affected += await upsertLeadCost(c.source, parsed.data.month, c.cost);
  }
  revalidatePath("/admin/sales", "layout");
  revalidatePath("/sales", "layout");
  return { affected };
}

export async function overrideLeadCostAction(
  leadId: string,
  cost: number | null,
): Promise<AdminResult> {
  await requireRole("admin");
  if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 100000)) {
    return { error: "Enter a valid cost." };
  }
  const lead = await overrideLeadCost(leadId, cost);
  if (!lead) return { error: "Lead not found." };
  revalidatePath("/admin/sales", "layout");
  revalidatePath("/sales", "layout");
}

/* ---------- Users ---------- */
const userBase = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  role: z.enum(["admin", "driver", "sales_rep"], { message: "Select a role" }),
});

const createUserSchema = userBase.extend({ password: passwordRule });
const updateUserSchema = userBase.extend({
  password: passwordRule.optional().or(z.literal("")),
});

export type UserInput = z.infer<typeof updateUserSchema>;

export async function createUserAction(
  input: UserInput,
): Promise<{ fieldErrors?: Record<string, string>; error?: string }> {
  await requireRole("admin");
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  if (await emailExists(parsed.data.email)) {
    return { fieldErrors: { email: "A user with this email already exists" } };
  }

  const { password, ...profile } = parsed.data;
  try {
    await createUser(profile, password);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't create the user.",
    };
  }
  revalidatePath("/admin", "layout");
  return {};
}

export async function updateUserAction(
  id: string,
  input: UserInput,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  if (await emailExists(parsed.data.email, id)) {
    return { fieldErrors: { email: "A user with this email already exists" } };
  }
  if (id === admin.id && parsed.data.role !== "admin") {
    return { fieldErrors: { role: "You can't change your own role" } };
  }

  const { password, ...profile } = parsed.data;
  try {
    const user = await updateUser(id, profile);
    if (!user) return { error: "User not found." };
    if (password) {
      const ok = await setUserPassword(id, password);
      if (!ok)
        return {
          error: "Details saved, but the new password couldn't be set.",
        };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't update the user.",
    };
  }
  revalidatePath("/admin", "layout");
}

export async function setUserActiveAction(
  id: string,
  active: boolean,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  if (id === admin.id && !active)
    return { error: "You can't deactivate your own account." };

  try {
    const user = await setUserActive(id, active);
    if (!user) return { error: "User not found." };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't update the user.",
    };
  }
  revalidatePath("/admin", "layout");
}

export async function setPasswordAction(
  id: string,
  password: string,
): Promise<AdminResult> {
  await requireRole("admin");
  const parsed = passwordRule.safeParse(password);
  if (!parsed.success)
    return {
      fieldErrors: {
        password: parsed.error.issues[0]?.message ?? "Invalid password",
      },
    };

  const ok = await setUserPassword(id, parsed.data);
  if (!ok) return { error: "Couldn't set the password. Please try again." };
}

/* ---------- Settings ---------- */
const settingsSchema = z.object({
  company: z.object({
    name: z.string().trim().min(2, "Company name is required").max(120),
    usdot: z.string().trim().min(1, "USDOT # is required").max(20),
    mc: z.string().trim().min(1, "MC # is required").max(20),
    address: z.string().trim().min(3, "Address is required").max(200),
    phone: z.string().trim().min(7, "Phone is required").max(30),
    email: z.string().trim().email("Enter a valid email"),
  }),
  damageAlertEmails: z
    .array(z.string().trim().email("One of the alert emails is invalid"))
    .max(20),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function updateSettingsAction(
  input: SettingsInput,
): Promise<AdminResult> {
  await requireRole("admin");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const key = i.path.join(".");
      if (!out[key]) out[key] = i.message;
    }
    return { fieldErrors: out };
  }
  await updateSettings({
    ...parsed.data,
    damageAlertEmails: Array.from(
      new Set(parsed.data.damageAlertEmails.map((e) => e.toLowerCase())),
    ),
  });
  revalidatePath("/admin/settings");
}
