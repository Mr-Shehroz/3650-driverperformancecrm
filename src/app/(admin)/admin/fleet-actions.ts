// File: src/app/(admin)/admin/fleet-actions.ts
// (REPLACE the whole file)

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
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
  try {
    await saveTruck({
      ...parsed.data,
      description: parsed.data.description || undefined,
      plate: parsed.data.plate || undefined,
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
): Promise<FleetAdminResult> {
  await requireRole("admin");
  if (!["open", "in_progress", "fixed"].includes(status))
    return { error: "Invalid status." };
  if (status === "fixed" && (!fixNote || fixNote.trim().length < 3)) {
    return { error: "Add a short note about the fix." };
  }
  try {
    const t = await updateTicketStatus(id, status, fixNote?.trim());
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
