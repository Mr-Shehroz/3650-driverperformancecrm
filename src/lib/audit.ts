// File: src/lib/audit.ts
// (REPLACE the whole file)

import type { AuditAction, EntityType } from "@/types";

export const ENTITY_LABELS: Record<EntityType, string> = {
  job: "Job",
  pre_damage: "Pre-existing damage",
  damage: "Damage incident",
  review: "Review",
  upsell: "Upsell",
};

export const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  update: "Corrected",
  delete: "Deleted",
  restore: "Restored",
  verify: "Verified",
  unverify: "Unverified",
};

/** Database column names → readable labels */
const FIELD_LABELS: Record<string, string> = {
  item: "Item",
  location: "Location on item",
  description: "Description",
  notes: "Notes",
  customer_name: "Customer name",
  customer_shown: "Customer shown",
  delivered_by: "Delivered by",
  on_time_pickup: "On-time pickup",
  on_time_delivery: "On-time delivery",
  verified: "Verified",
  deleted_at: "Deleted",
  platform: "Platform",
  stars: "Stars",
  driver_mentioned: "Driver mentioned",
  link: "Link",
  type: "Type",
  amount: "Amount",
  claim_filed: "Claim filed",
  estimated_cost: "Estimated cost",
  photo: "Photos",
  signature: "Signature",
  screenshot: "Screenshot",
};

/** Internal columns that aren't useful in the history */
const HIDDEN = new Set([
  "id",
  "job_id",
  "created_by",
  "locked",
  "received_at_server",
  "captured_at_device",
  "synced_offline",
  "lat",
  "lng",
  "verified",
  "deleted_at",
  "updated_at",
  "created_at",
]);

/** File paths aren't readable; show "3 photos" / "Yes" instead */
const isFileKey = (k: string) =>
  /(_path|_paths|photos|signature|screenshot)$/.test(k);

const humanize = (k: string) =>
  FIELD_LABELS[k] ??
  k
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const VALUE_LABELS: Record<string, string> = {
  drs: "DRS crew",
  partner: "Partner",
};

export function formatAuditValue(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && VALUE_LABELS[v]) return VALUE_LABELS[v];
  return String(v);
}

export function diffLines(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ).filter(
    (k) =>
      (!HIDDEN.has(k) || k === "verified" || k === "deleted_at") &&
      !isFileKey(k),
  );
  // "Deleted" reads better as Yes / No than as a timestamp
  const val = (k: string, v: unknown) =>
    k === "deleted_at" ? (v ? "Yes" : "No") : formatAuditValue(v);
  return keys.map((k) => ({
    field: humanize(k),
    from: val(k, before?.[k]),
    to: val(k, after?.[k]),
  }));
}

function fileValue(v: unknown) {
  if (Array.isArray(v))
    return v.length ? `${v.length} photo${v.length === 1 ? "" : "s"}` : "—";
  return v ? "Yes" : "—";
}

/** Readable fields for a "Created" entry (no ids, timestamps or file paths) */
export function createdLines(after: Record<string, unknown> | null) {
  return Object.entries(after ?? {})
    .filter(([k, v]) => !HIDDEN.has(k) && v !== null && v !== "")
    .map(([k, v]) => ({
      field: isFileKey(k) ? humanize(k.replace(/_paths?$/, "")) : humanize(k),
      value: isFileKey(k) ? fileValue(v) : formatAuditValue(v),
    }));
}
