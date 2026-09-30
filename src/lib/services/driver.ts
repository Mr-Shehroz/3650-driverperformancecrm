import { revalidatePath } from "next/cache";
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
import {
  damageSchema,
  jobSchema,
  onTimeSchema,
  preDamageSchema,
  reviewSchema,
  toFieldErrors,
  upsellSchema,
} from "@/lib/validation/driver";
import type { User } from "@/types";

export type ServiceResult =
  | { ok: true; id: string; jobId: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

async function ownJob(jobId: string, userId: string) {
  const job = await getJobDetail(jobId);
  return job && job.driverId === userId ? job : null;
}

function refresh() {
  revalidatePath("/driver", "layout");
  revalidatePath("/admin", "layout");
}

export async function createJobFor(
  user: User,
  raw: unknown,
): Promise<ServiceResult> {
  const parsed = jobSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };

  if (await jobNumberExists(parsed.data.jobNumber)) {
    return {
      ok: false,
      fieldErrors: { jobNumber: "This job number already exists" },
    };
  }

  const validIds = new Set((await getDrivers()).map((d) => d.id));
  const crewIds = Array.from(
    new Set([user.id, ...parsed.data.crewIds.filter((id) => validIds.has(id))]),
  );

  const job = await createJob({ ...parsed.data, driverId: user.id, crewIds });
  refresh();
  return { ok: true, id: job.id, jobId: job.id };
}

export async function createPreDamageFor(
  user: User,
  raw: unknown,
  opts: { offline?: boolean } = {},
): Promise<ServiceResult> {
  const parsed = preDamageSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };

  const job = await ownJob(parsed.data.jobId, user.id);
  if (!job) return { ok: false, error: "Job not found." };

  const { signature, notes, ...rest } = parsed.data;
  const rec = await createPreDamage(
    {
      ...rest,
      notes: notes || undefined,
      signatureUrl: signature,
      syncedOffline: !!opts.offline,
    },
    user.id,
  );
  refresh();
  return { ok: true, id: rec.id, jobId: job.id };
}

export async function createDamageFor(
  user: User,
  raw: unknown,
): Promise<ServiceResult> {
  const parsed = damageSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };

  const job = await ownJob(parsed.data.jobId, user.id);
  if (!job) return { ok: false, error: "Job not found." };

  const rec = await createDamage(parsed.data);
  // TODO (with Resend): email admins that damage was reported on this job
  refresh();
  return { ok: true, id: rec.id, jobId: job.id };
}

export async function createReviewFor(
  user: User,
  raw: unknown,
): Promise<ServiceResult> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };

  const job = await ownJob(parsed.data.jobId, user.id);
  if (!job) return { ok: false, error: "Job not found." };

  const { link, screenshot, ...rest } = parsed.data;
  const rec = await createReview({
    ...rest,
    link: link || undefined,
    screenshotUrl: screenshot || undefined,
  });
  refresh();
  return { ok: true, id: rec.id, jobId: job.id };
}

export async function createUpsellFor(
  user: User,
  raw: unknown,
): Promise<ServiceResult> {
  const parsed = upsellSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };

  const job = await ownJob(parsed.data.jobId, user.id);
  if (!job) return { ok: false, error: "Job not found." };

  const rec = await createUpsell(parsed.data);
  refresh();
  return { ok: true, id: rec.id, jobId: job.id };
}

export async function setOnTimeFor(
  user: User,
  raw: unknown,
): Promise<ServiceResult> {
  const parsed = onTimeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const job = await ownJob(parsed.data.jobId, user.id);
  if (!job) return { ok: false, error: "Job not found." };

  const key =
    parsed.data.field === "pickup" ? "onTimePickup" : "onTimeDelivery";
  // Drivers can record it once. After that only an admin can change it.
  if (job[key] !== null)
    return {
      ok: false,
      error: "Already recorded. Ask an admin if it needs changing.",
    };

  await updateJob(job.id, { [key]: parsed.data.value }, user.id);
  refresh();
  return { ok: true, id: job.id, jobId: job.id };
}
