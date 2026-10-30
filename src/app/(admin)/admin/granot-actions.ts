// File: src/app/(admin)/admin/granot-actions.ts
// (REPLACE the whole file)

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

/**
 * Saves a rep's Granot username, then links their existing unassigned
 * Granot leads to them. Returns how many leads were linked.
 */
export async function saveGranotNameAction(
  userId: string,
  granotName: string,
): Promise<{ error?: string; linked?: number }> {
  await requireRole("admin");
  const name = granotName.trim();
  if (name.length > 80) return { error: "Username is too long." };

  const sb = createAdminClient();
  const { data: rep } = await sb
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!rep || rep.role !== "sales_rep") return { error: "Choose a sales rep." };

  if (name) {
    const { data: taken } = await sb
      .from("profiles")
      .select("id, name")
      .ilike(
        "granot_name",
        name.replace(/[\\%_]/g, (m) => `\\${m}`),
      )
      .neq("id", userId)
      .limit(1);
    if (taken?.length)
      return { error: `"${name}" is already used by ${taken[0].name}.` };
  }

  const { error } = await sb
    .from("profiles")
    .update({ granot_name: name || null })
    .eq("id", userId);
  if (error) return { error: "Couldn't save. Please try again." };

  let linked = 0;
  if (name) {
    const { data } = await sb
      .from("leads")
      .update({ rep_id: userId })
      .is("rep_id", null)
      .ilike(
        "granot_rep",
        name.replace(/[\\%_]/g, (m) => `\\${m}`),
      )
      .select("id");
    linked = data?.length ?? 0;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/sales", "layout");
  return { linked };
}
