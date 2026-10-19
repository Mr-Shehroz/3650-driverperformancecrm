// File: src/lib/email/alerts.ts
// (NEW file)

import { createAdminClient } from "@/lib/supabase/admin";
import { CHECK_ITEMS } from "@/types";

/*
 * Admin email alerts, sent with Resend (https://resend.com).
 * Needs these environment variables:
 *   RESEND_API_KEY      – from the Resend dashboard
 *   ALERT_FROM_EMAIL    – e.g. "DRS Portal <alerts@directrelocate.com>" (domain verified in Resend)
 *   NEXT_PUBLIC_APP_URL – e.g. "https://portal.directrelocate.com"
 * Recipients come from Admin → Settings → "Damage alert emails".
 * If anything is missing, the alert is skipped and the driver's save still works.
 */

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

async function getRecipients(): Promise<string[]> {
  // Drivers can't read settings, so use the server-only admin client
  const { data, error } = await createAdminClient()
    .from("settings")
    .select("damage_alert_emails")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return (data?.damage_alert_emails ?? []).filter((e) =>
    /\S+@\S+\.\S+/.test(e),
  );
}

async function send(
  subject: string,
  rows: [string, string][],
  link: string,
  button: string,
) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!key || !from) {
    console.warn(
      "[alerts] RESEND_API_KEY or ALERT_FROM_EMAIL not set, email skipped:",
      subject,
    );
    return;
  }
  const to = await getRecipients();
  if (!to.length) {
    console.warn(
      "[alerts] No alert emails in Settings, email skipped:",
      subject,
    );
    return;
  }

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(k)}</td>` +
        `<td style="padding:6px 0;color:#111827">${esc(v)}</td></tr>`,
    )
    .join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px;color:#111827;font-size:20px">${esc(subject)}</h2>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:24px">${table}</table>
  ${link ? `<a href="${esc(link)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:14px">${esc(button)}</a>` : ""}
  <p style="margin-top:24px;color:#9ca3af;font-size:12px">Sent automatically by the DRS Performance Portal.</p>
</div>`;

  const text = [
    subject,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    link,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Never throws: a failed email must not fail the driver's save */
async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error("[alerts] email failed", err);
  }
}

export function sendDamageAlert(input: {
  jobId: string;
  jobNumber: string;
  driverName: string;
  item: string;
  description: string;
  estimatedCost: number | null;
  claimFiled: boolean;
  photoCount: number;
}) {
  return safe(() =>
    send(
      `Damage reported on job ${input.jobNumber}`,
      [
        ["Job", input.jobNumber],
        ["Driver", input.driverName],
        ["Item", input.item],
        ["What happened", input.description],
        [
          "Estimated cost",
          input.estimatedCost == null
            ? "Not given"
            : `$${input.estimatedCost.toLocaleString("en-US")}`,
        ],
        ["Claim filed", input.claimFiled ? "Yes" : "No"],
        ["Photos", String(input.photoCount)],
      ],
      appUrl() ? `${appUrl()}/admin/jobs/${input.jobId}` : "",
      "Open the job",
    ),
  );
}

export function sendDoNotDriveAlert(input: {
  preTripId: string;
  unitNumber: string;
  driverName: string;
  odometer: number;
  failedItems: { key: string; notes?: string }[];
  notes?: string;
}) {
  const label = (k: string) => CHECK_ITEMS.find((c) => c.key === k)?.label ?? k;
  const failed = input.failedItems.length
    ? input.failedItems
        .map((i) => (i.notes ? `${label(i.key)} (${i.notes})` : label(i.key)))
        .join(", ")
    : "No items marked";

  return safe(() =>
    send(
      `DO NOT DRIVE: truck ${input.unitNumber}`,
      [
        ["Truck", input.unitNumber],
        ["Driver", input.driverName],
        ["Odometer", input.odometer.toLocaleString("en-US")],
        ["Needs attention", failed],
        ["Driver notes", input.notes || "None"],
      ],
      appUrl() ? `${appUrl()}/admin/pre-trip/${input.preTripId}` : "",
      "Open the inspection",
    ),
  );
}
