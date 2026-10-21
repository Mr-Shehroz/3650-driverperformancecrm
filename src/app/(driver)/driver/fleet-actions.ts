// File: src/app/(driver)/driver/fleet-actions.ts
// (REPLACE the whole file)

"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  createPreTripFor,
  createRoadsideFor,
  createWashFor,
} from "@/lib/services/fleet";

export type FleetResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

// Inputs are checked on the server, so they arrive as `unknown`.
// Photos, signatures and reports arrive as storage paths (uploaded from the phone first).

export async function createPreTripAction(
  input: unknown,
): Promise<FleetResult> {
  const user = await requireRole("driver");
  const res = await createPreTripFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(`/driver/pre-trip/${res.id}`);
}

export async function createRoadsideAction(
  input: unknown,
): Promise<FleetResult> {
  const user = await requireRole("driver");
  const res = await createRoadsideFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect("/driver/roadside");
}

export async function createWashAction(input: unknown): Promise<FleetResult> {
  const user = await requireRole("driver");
  const res = await createWashFor(user, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect("/driver/wash?saved=1");
}
