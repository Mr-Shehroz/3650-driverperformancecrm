// File: src/app/(driver)/driver/actions.ts
// (REPLACE the whole file)

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

// Inputs are checked on the server, so they arrive as `unknown`.
// Images arrive as storage paths (uploaded from the phone first).
export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

export async function createJobAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createJobFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.id}`);
}

export async function createPreDamageAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createPreDamageFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function createDamageAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createDamageFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function createReviewAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createReviewFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function createUpsellAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await createUpsellFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/jobs/${res.jobId}`);
}

export async function setOnTimeAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("driver");
  const res = await setOnTimeFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
}
