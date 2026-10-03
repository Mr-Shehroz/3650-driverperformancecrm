"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createPreTrip, createRoadside, getTruck } from "@/lib/data";
import {
  preTripSchema,
  roadsideSchema,
  toPathErrors,
  type PreTripInput,
  type RoadsideInput,
} from "@/lib/validation/fleet";

export type FleetResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

function refresh() {
  revalidatePath("/driver", "layout");
  revalidatePath("/admin", "layout");
}

export async function createPreTripAction(
  input: PreTripInput,
): Promise<FleetResult> {
  const user = await requireRole("driver");
  const parsed = preTripSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toPathErrors(parsed.error) };

  const truck = await getTruck(parsed.data.truckId);
  if (!truck || !truck.active)
    return { fieldErrors: { truckId: "Choose an active truck" } };

  const { signature, notes, ...rest } = parsed.data;
  const inspection = await createPreTrip({
    ...rest,
    notes: notes || undefined,
    signatureUrl: signature,
    driverId: user.id,
    syncedOffline: false,
  });

  refresh();
  redirect(`/driver/pre-trip/${inspection.id}`);
}

export async function createRoadsideAction(
  input: RoadsideInput,
): Promise<FleetResult> {
  const user = await requireRole("driver");
  const parsed = roadsideSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toPathErrors(parsed.error) };

  const { driverId: _ignored, violationNotes, ...rest } = parsed.data;
  await createRoadside({
    ...rest,
    violationNotes: violationNotes || undefined,
    driverId: user.id,
    loggedBy: user.id,
  });

  refresh();
  redirect("/driver/roadside");
}
