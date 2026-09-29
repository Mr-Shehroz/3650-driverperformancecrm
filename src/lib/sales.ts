import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "@/types";

export const SOURCE_OPTIONS = (
  Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]
).map((s) => ({
  value: s,
  label: LEAD_SOURCE_LABELS[s],
}));

export const STATUS_OPTIONS = (
  Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]
).map((s) => ({
  value: s,
  label: LEAD_STATUS_LABELS[s],
}));

export function resolveSource(v?: string): LeadSource | undefined {
  return v && v in LEAD_SOURCE_LABELS ? (v as LeadSource) : undefined;
}

export function resolveStatus(v?: string): LeadStatus | undefined {
  return v && v in LEAD_STATUS_LABELS ? (v as LeadStatus) : undefined;
}
