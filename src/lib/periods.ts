import {
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import type { DateRange } from "@/types";

export const PERIOD_OPTIONS = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
] as const;

export type PeriodKey = (typeof PERIOD_OPTIONS)[number]["key"];
export type FilterParams = {
  period?: string;
  from?: string;
  to?: string;
  verified?: string;
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const validDate = (s?: string) =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseISO(s));

export function resolveFilters(sp: FilterParams) {
  const now = new Date();
  const period = (
    PERIOD_OPTIONS.some((p) => p.key === sp.period) ? sp.period : "month"
  ) as PeriodKey;

  let range: DateRange | undefined;
  if (period === "month")
    range = { from: iso(startOfMonth(now)), to: iso(now) };
  else if (period === "quarter")
    range = { from: iso(startOfQuarter(now)), to: iso(now) };
  else if (period === "year")
    range = { from: iso(startOfYear(now)), to: iso(now) };
  else if (period === "custom") {
    range = {
      from: validDate(sp.from) ? sp.from : undefined,
      to: validDate(sp.to) ? sp.to : undefined,
    };
  }

  const label =
    period === "custom"
      ? `${range?.from ? format(parseISO(range.from), "MMM d, yyyy") : "Start"} – ${
          range?.to ? format(parseISO(range.to), "MMM d, yyyy") : "Today"
        }`
      : PERIOD_OPTIONS.find((p) => p.key === period)!.label;

  return { period, range, verifiedOnly: sp.verified === "1", label };
}

export function filtersToQuery(sp: FilterParams) {
  const q = new URLSearchParams();
  (["period", "from", "to", "verified"] as const).forEach(
    (k) => sp[k] && q.set(k, sp[k]!),
  );
  return q.toString();
}
