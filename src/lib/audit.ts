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

const humanize = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function formatAuditValue(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function diffLines(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  );
  return keys.map((k) => ({
    field: humanize(k),
    from: formatAuditValue(before?.[k]),
    to: formatAuditValue(after?.[k]),
  }));
}
