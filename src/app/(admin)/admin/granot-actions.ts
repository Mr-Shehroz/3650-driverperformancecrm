// File: src/app/(admin)/admin/granot-actions.ts
// (NEW file)

"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleGranotEvent } from "@/lib/services/granot";
import { todayET } from "@/lib/granot/parse";

/**
 * Sends a pretend Granot event through the same code the webhook uses,
 * so admin can check the setup before Granot sends real ones.
 * Test leads are marked as sample leads (removed with "Remove all" on Sales Reps).
 */
export async function sendTestGranotEventAction(
  kind: "new_lead" | "booked",
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const [y, m, d] = todayET().split("-");

  const sb = createAdminClient();
  let jobNumber = `TEST-${Math.floor(100000 + Math.random() * 900000)}`;
  // Give the test lead to the first active sales rep, so it shows on the Sales pages
  const { data: reps } = await sb
    .from("profiles")
    .select("name")
    .eq("role", "sales_rep")
    .eq("active", true)
    .order("name")
    .limit(1);
  const rep = reps?.[0]?.name;
  if (kind === "booked") {
    // Book the most recent test lead that is still open
    const { data } = await sb
      .from("leads")
      .select("granot_id")
      .like("granot_id", "TEST-%")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data?.length) return { error: "Send a test lead first." };
    jobNumber = data[0].granot_id;
  }

  const res = await handleGranotEvent(
    kind === "new_lead"
      ? {
          job_number: jobNumber,
          lead_date: `${m}/${d}/${y}`,
          lead_status: "new lead",
          lead_source: "Google PPC",
          ...(rep ? { rep } : {}),
          first_name: "Test",
          last_name: "Customer",
        }
      : {
          job_number: jobNumber,
          lead_status: "booked",
          total_estimate: "4500",
          ...(rep ? { rep } : {}),
        },
    { sample: true },
  );
  revalidatePath("/admin", "layout");
  revalidatePath("/sales", "layout");
  if (res.status === "error") return { error: res.message };
  return { message: `${jobNumber}: ${res.message}` };
}
