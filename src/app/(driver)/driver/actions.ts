"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  createDamageFor,
  createJobFor,
  createPreDamageFor,
  createReviewFor,
  createUpsellFor,
  setOnTimeFor,
} from "@/lib/services/driver";
import type {
  DamageInput,
  NewJobInput,
  OnTimeInput,
  PreDamageInput,
  ReviewInput,
  UpsellInput,
} from "@/lib/validation/driver";

export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

export async function createJobAction(
  input: NewJobInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createJobFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.id}`);
}

export async function createPreDamageAction(
  input: PreDamageInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createPreDamageFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function createDamageAction(
  input: DamageInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createDamageFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function createReviewAction(
  input: ReviewInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createReviewFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function createUpsellAction(
  input: UpsellInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createUpsellFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function setOnTimeAction(
  input: OnTimeInput,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await setOnTimeFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
}
