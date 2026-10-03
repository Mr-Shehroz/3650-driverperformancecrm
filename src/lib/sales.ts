import {
  LEAD_STATUS_LABELS,
  type LeadSourceRow,
  type LeadStatus,
} from "@/types";

export const STATUS_OPTIONS = (
  Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]
).map((s) => ({
  value: s,
  label: LEAD_STATUS_LABELS[s],
}));

/** Filter pills: active sources only */
export function sourceOptions(sources: LeadSourceRow[]) {
  return sources
    .filter((s) => s.active)
    .map((s) => ({ value: s.id, label: s.name }));
}

export function sourceNameMap(sources: LeadSourceRow[]) {
  return Object.fromEntries(sources.map((s) => [s.id, s.name])) as Record<
    string,
    string
  >;
}

export function resolveSourceId(
  v: string | undefined,
  sources: LeadSourceRow[],
) {
  return v && sources.some((s) => s.id === v) ? v : undefined;
}

export function resolveStatus(v?: string): LeadStatus | undefined {
  return v && v in LEAD_STATUS_LABELS ? (v as LeadStatus) : undefined;
}
