// File: src/app/(admin)/admin/fleet-actions.ts
// (REPLACE the whole file)

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  excuseOverdueEvent,
  getUserById,
  saveTruck,
  truckUnitExists,
  updateScoring,
  updateTicketStatus,
} from "@/lib/data";
import { scoringSchema, toPathErrors } from "@/lib/validation/fleet";
import { createRoadsideFor } from "@/lib/services/fleet";
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
  assignedDriverId: z.string().nullable().optional(),
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
  const assignedDriverId = parsed.data.assignedDriverId || null;
  if (assignedDriverId) {
    const driver = await getUserById(assignedDriverId);
    if (!driver || driver.role !== "driver")
      return { fieldErrors: { assignedDriverId: "Choose a driver" } };
  }
  try {
    await saveTruck({
      ...parsed.data,
      description: parsed.data.description || undefined,
      plate: parsed.data.plate || undefined,
      assignedDriverId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/already exists/i.test(msg))
      return { fieldErrors: { unitNumber: msg } };
    return { error: "Couldn't save the truck. Please try again." };
  }
  refresh();
}

export async function updateTicketStatusAction(
  id: string,
  status: TicketStatus,
  fixNote?: string,
  fixedOn?: string,
): Promise<FleetAdminResult> {
  await requireRole("admin");
  if (!["open", "in_progress", "fixed"].includes(status))
    return { error: "Invalid status." };
  if (status === "fixed" && (!fixNote || fixNote.trim().length < 3)) {
    return { error: "Add a short note about the fix." };
  }
  if (status === "fixed") {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
    }).format(new Date());
    if (!fixedOn || !/^\d{4}-\d{2}-\d{2}$/.test(fixedOn))
      return { error: "Choose the date it was fixed." };
    if (fixedOn > today)
      return { error: "The fix date can't be in the future." };
  }
  try {
    const t = await updateTicketStatus(
      id,
      status,
      fixNote?.trim(),
      status === "fixed" ? fixedOn : undefined,
    );
    if (!t) return { error: "Ticket not found." };
  } catch {
    return { error: "Couldn't update the ticket. Please try again." };
  }
  refresh();
}

export async function createRoadsideAdminAction(
  input: unknown,
): Promise<FleetAdminResult> {
  const admin = await requireRole("admin");
  const res = await createRoadsideFor(admin, input);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect("/admin/roadside");
}

export async function updateScoringAction(
  input: ScoringSettings,
): Promise<FleetAdminResult> {
  await requireRole("admin");
  const parsed = scoringSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toPathErrors(parsed.error) };
  try {
    await updateScoring(parsed.data);
  } catch {
    return { error: "Couldn't save scoring. Please try again." };
  }
  refresh();
}

/** Excuse one overdue wash so it no longer counts against the driver */
export async function excuseOverdueWashAction(
  id: string,
): Promise<FleetAdminResult> {
  await requireRole("admin");
  try {
    const row = await excuseOverdueEvent(id);
    if (!row) return { error: "Not found." };
  } catch {
    return { error: "Couldn't excuse it. Please try again." };
  }
  refresh();
}
