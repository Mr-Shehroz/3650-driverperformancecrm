// File: src/lib/granot/parse.ts
// (NEW file)

/*
 * Reads what Granot posts to our webhook. Granot sends simple key=value fields
 * (form data), for example:
 *   job_number=567671  lead_date=10/09/2026  lead_status=new lead  lead_source=Google PPC
 * Field names are matched loosely so small differences between events still work.
 */

export type GranotEventType =
  "new_lead" | "booked" | "unbooked" | "priority" | "unknown";

export type GranotEvent = {
  type: GranotEventType;
  jobNumber: string | null;
  leadDate: string | null; // YYYY-MM-DD
  source: string | null;
  rep: string | null;
  totalEstimate: number | null;
  bookedDate: string | null; // YYYY-MM-DD
  fields: Record<string, string>;
};

/** Lower-case keys, trimmed values, empty values dropped */
export function normalizeFields(
  input: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) continue;
    const value = (
      typeof v === "object" ? JSON.stringify(v) : String(v)
    ).trim();
    if (!value) continue;
    out[
      k
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
    ] = value;
  }
  return out;
}

const pick = (f: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (f[k]) return f[k];
  return null;
};

/** "10/09/2026", "10/9/2026", "2026-10-09" or "2026-10-09 14:30" → "2026-10-09" */
export function parseDate(v: string | null): string | null {
  if (!v) return null;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(v);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    const m = us[1].padStart(2, "0");
    const d = us[2].padStart(2, "0");
    return Number(m) >= 1 &&
      Number(m) <= 12 &&
      Number(d) >= 1 &&
      Number(d) <= 31
      ? `${year}-${m}-${d}`
      : null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

/** "$4,500.00" → 4500 */
export function parseMoney(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function detectType(f: Record<string, string>): GranotEventType {
  const status = (
    pick(f, "lead_status", "status", "event", "event_type") ?? ""
  ).toLowerCase();
  if (/un-?book/.test(status)) return "unbooked";
  if (/book/.test(status)) return "booked";
  if (/priorit/.test(status)) return "priority";
  if (/new/.test(status)) return "new_lead";
  // No clear status: guess from the fields Granot includes in each event
  if (f.volume || f.payment || f.balance) return "booked";
  if (f.lead_date || f.first_name || f.firstname) return "new_lead";
  return "unknown";
}

export function parseGranot(input: Record<string, unknown>): GranotEvent {
  const f = normalizeFields(input);
  return {
    type: detectType(f),
    jobNumber: pick(f, "job_number", "jobnumber", "job_no", "job", "lead_id"),
    leadDate: parseDate(pick(f, "lead_date", "date", "created_date")),
    source: pick(f, "lead_source", "source", "lead_label", "referral"),
    rep: pick(
      f,
      "rep",
      "assigned_rep",
      "sales_rep",
      "salesman",
      "user",
      "agent",
    ),
    totalEstimate: parseMoney(
      pick(f, "total_estimate", "estimate", "total", "job_value", "amount"),
    ),
    bookedDate: parseDate(pick(f, "booked_date", "booking_date", "book_date")),
    fields: f,
  };
}

/** Today's date in company (Eastern) time, as YYYY-MM-DD */
export function todayET() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(new Date());
}
