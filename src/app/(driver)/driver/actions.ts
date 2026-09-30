"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  createDamage,
  createJob,
  createPreDamage,
  createReview,
  createUpsell,
  getDrivers,
  getJobDetail,
  jobNumberExists,
  updateJob,
} from "@/lib/data";
import { MAX_PHOTOS } from "@/lib/constants";

export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

function toFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ---------- New job ---------- */
const jobSchema = z.object({
  jobNumber: z.string().trim().min(1, "Job number is required").max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  originCity: z.string().trim().min(1, "Origin city is required"),
  originState: z.string().length(2, "Select a state"),
  destCity: z.string().trim().min(1, "Destination city is required"),
  destState: z.string().length(2, "Select a state"),
  crewIds: z.array(z.string()),
  deliveredBy: z.enum(["drs", "partner"]),
  onTimePickup: z.boolean().nullable(),
  onTimeDelivery: z.boolean().nullable(),
});

export type NewJobInput = z.infer<typeof jobSchema>;

export async function createJobAction(
  input: NewJobInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  if (await jobNumberExists(parsed.data.jobNumber)) {
    return { fieldErrors: { jobNumber: "This job number already exists" } };
  }

  const validIds = new Set((await getDrivers()).map((d) => d.id));
  const crewIds = Array.from(
    new Set([user.id, ...parsed.data.crewIds.filter((id) => validIds.has(id))]),
  );

  const job = await createJob({ ...parsed.data, driverId: user.id, crewIds });

  revalidatePath("/driver");
  redirect(`/driver/jobs/${job.id}`);
}

/* ---------- Pre-existing damage ---------- */
const preDamageSchema = z.object({
  jobId: z.string().min(1),
  item: z.string().trim().min(1, "Item is required").max(120),
  location: z.string().trim().min(1, "Location on item is required").max(120),
  description: z.string().trim().min(1, "Describe the damage").max(1000),
  photos: z
    .array(z.string().startsWith("data:image/"))
    .min(1, "Add at least 1 photo")
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos`),
  notes: z.string().trim().max(1000).optional(),
  customerShown: z
    .boolean()
    .refine((v) => v, "Confirm the customer was shown the damage"),
  customerName: z
    .string()
    .trim()
    .min(2, "Customer printed name is required")
    .max(120),
  signature: z
    .string()
    .startsWith("data:image/", "Customer signature is required"),
  capturedAtDevice: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export type PreDamageInput = z.infer<typeof preDamageSchema>;

export async function createPreDamageAction(
  input: PreDamageInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const parsed = preDamageSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const job = await getJobDetail(parsed.data.jobId);
  if (!job || job.driverId !== user.id) return { error: "Job not found." };

  const { signature, notes, ...rest } = parsed.data;
  await createPreDamage(
    {
      ...rest,
      notes: notes || undefined,
      signatureUrl: signature,
      syncedOffline: false,
    },
    user.id,
  );

  revalidatePath(`/driver/jobs/${job.id}`);
  redirect(`/driver/jobs/${job.id}`);
}

/* ---------- Helpers ---------- */
async function getOwnJob(jobId: string, userId: string) {
  const job = await getJobDetail(jobId);
  return job && job.driverId === userId ? job : null;
}

/* ---------- Damage incident ---------- */
const damageSchema = z.object({
  jobId: z.string().min(1),
  item: z.string().trim().min(1, "Item is required").max(120),
  description: z.string().trim().min(1, "Describe what happened").max(1000),
  photos: z
    .array(z.string().startsWith("data:image/"))
    .min(1, "Add at least 1 photo")
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos`),
  claimFiled: z.boolean({ message: "Select yes or no" }),
  estimatedCost: z
    .number({ message: "Enter an estimated cost" })
    .min(0, "Cost can't be negative")
    .max(1_000_000),
});

export type DamageInput = z.infer<typeof damageSchema>;

export async function createDamageAction(
  input: DamageInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const parsed = damageSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const job = await getOwnJob(parsed.data.jobId, user.id);
  if (!job) return { error: "Job not found." };

  await createDamage(parsed.data);
  // TODO (with Resend): email admins that damage was reported on this job

  revalidatePath(`/driver/jobs/${job.id}`);
  redirect(`/driver/jobs/${job.id}`);
}

/* ---------- Review ---------- */
const reviewSchema = z
  .object({
    jobId: z.string().min(1),
    platform: z.enum(["google", "bbb", "trustpilot", "facebook", "other"], {
      message: "Select a platform",
    }),
    stars: z.number().int().min(1, "Select a star rating").max(5),
    driverMentioned: z.boolean({ message: "Select yes or no" }),
    link: z
      .string()
      .trim()
      .url("Enter a valid link")
      .optional()
      .or(z.literal("")),
    screenshot: z
      .string()
      .startsWith("data:image/")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => !!d.link || !!d.screenshot, {
    message: "Add a link or a screenshot",
    path: ["link"],
  });

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function createReviewAction(
  input: ReviewInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const job = await getOwnJob(parsed.data.jobId, user.id);
  if (!job) return { error: "Job not found." };

  const { link, screenshot, ...rest } = parsed.data;
  await createReview({
    ...rest,
    link: link || undefined,
    screenshotUrl: screenshot || undefined,
  });

  revalidatePath(`/driver/jobs/${job.id}`);
  redirect(`/driver/jobs/${job.id}`);
}

/* ---------- Upsell ---------- */
const upsellSchema = z.object({
  jobId: z.string().min(1),
  type: z.enum(["packing", "storage", "materials", "other"], {
    message: "Select an upsell type",
  }),
  amount: z
    .number({ message: "Enter an amount" })
    .positive("Amount must be more than $0")
    .max(1_000_000),
});

export type UpsellInput = z.infer<typeof upsellSchema>;

export async function createUpsellAction(
  input: UpsellInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const parsed = upsellSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const job = await getOwnJob(parsed.data.jobId, user.id);
  if (!job) return { error: "Job not found." };

  await createUpsell(parsed.data);

  revalidatePath(`/driver/jobs/${job.id}`);
  redirect(`/driver/jobs/${job.id}`);
}

/* ---------- On-time status ---------- */
const onTimeSchema = z.object({
  jobId: z.string().min(1),
  field: z.enum(["pickup", "delivery"]),
  value: z.boolean(),
});

export async function setOnTimeAction(
  input: z.infer<typeof onTimeSchema>,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const parsed = onTimeSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request." };

  const job = await getOwnJob(parsed.data.jobId, user.id);
  if (!job) return { error: "Job not found." };

  const key =
    parsed.data.field === "pickup" ? "onTimePickup" : "onTimeDelivery";
  // Drivers can record it once. After that only an admin can change it.
  if (job[key] !== null)
    return { error: "Already recorded. Ask an admin if it needs changing." };

  await updateJob(job.id, { [key]: parsed.data.value }, user.id);
  revalidatePath(`/driver/jobs/${job.id}`);
  revalidatePath("/driver", "layout");
}
