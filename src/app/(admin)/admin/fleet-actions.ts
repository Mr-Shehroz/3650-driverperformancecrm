"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  createRoadside,
  getUserById,
  saveTruck,
  truckUnitExists,
  updateScoring,
  updateTicketStatus,
} from "@/lib/data";
import {
  roadsideSchema,
  scoringSchema,
  toPathErrors,
  type RoadsideInput,
} from "@/lib/validation/fleet";
import type { ScoringSettings, TicketStatus } from "@/types";

export type FleetAdminResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/driver", "layout");
}

const truckSchema = z.object({
  id: z.string().optional(),
  unitNumber: z.string().trim().min(1, "Enter the unit number").max(20),
  description: z.string().trim().max(120).optional(),
  plate: z.string().trim().max(20).optional(),
  active: z.boolean(),
});

export async function saveTruckAction(
  input: z.infer<typeof truckSchema>,
): Promise<FleetAdminResult> {
  await requireRole("admin");
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toPathErrors(parsed.error) };
  if (await truckUnitExists(parsed.data.unitNumber, parsed.data.id)) {
    return { fieldErrors: { unitNumber: "This unit number already exists" } };
  }
  await saveTruck({
    ...parsed.data,
    description: parsed.data.description || undefined,
    plate: parsed.data.plate || undefined,
  });
  refresh();
}

export async function updateTicketStatusAction(
  id: string,
  status: TicketStatus,
  fixNote?: string,
): Promise<FleetAdminResult> {
  await requireRole("admin");
  if (!["open", "in_progress", "fixed"].includes(status))
    return { error: "Invalid status." };
  if (status === "fixed" && (!fixNote || fixNote.trim().length < 3)) {
    return { error: "Add a short note about the fix." };
  }
  const t = await updateTicketStatus(id, status, fixNote?.trim());
  if (!t) return { error: "Ticket not found." };
  refresh();
}

export async function createRoadsideAdminAction(
  input: RoadsideInput,
): Promise<FleetAdminResult> {
  const admin = await requireRole("admin");
  const parsed = roadsideSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toPathErrors(parsed.error) };

  const driver = parsed.data.driverId
    ? await getUserById(parsed.data.driverId)
    : null;
  if (!driver || driver.role !== "driver")
    return { fieldErrors: { driverId: "Choose a driver" } };

  const { violationNotes, ...rest } = parsed.data;
  await createRoadside({
    ...rest,
    driverId: driver.id,
    violationNotes: violationNotes || undefined,
    loggedBy: admin.id,
  });
  refresh();
  redirect("/admin/roadside");
}

export async function updateScoringAction(
  input: ScoringSettings,
): Promise<FleetAdminResult> {
  await requireRole("admin");
  const parsed = scoringSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toPathErrors(parsed.error) };
  await updateScoring(parsed.data);
  refresh();
}
