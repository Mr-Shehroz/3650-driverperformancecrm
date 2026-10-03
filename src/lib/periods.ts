import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
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

/** "Oct 1 – Oct 31, 2026" (year shown once when both dates share it) */
export function formatRange(from: string, to: string) {
  const a = parseISO(from);
  const b = parseISO(to);
  if (a.getFullYear() === b.getFullYear()) {
    return `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
  }
  return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
}

/** Default dates for the Custom period: this month */
export function defaultCustomRange() {
  const now = new Date();
  return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
}

export function resolveFilters(sp: FilterParams) {
  const now = new Date();
  const period = (
    PERIOD_OPTIONS.some((p) => p.key === sp.period) ? sp.period : "month"
  ) as PeriodKey;

  let range: DateRange | undefined;
  if (period === "month")
    range = { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
  else if (period === "quarter")
    range = { from: iso(startOfQuarter(now)), to: iso(endOfQuarter(now)) };
  else if (period === "year")
    range = { from: iso(startOfYear(now)), to: iso(endOfYear(now)) };
  else if (period === "custom") {
    const d = defaultCustomRange();
    range = {
      from: validDate(sp.from) ? sp.from : d.from,
      to: validDate(sp.to) ? sp.to : d.to,
    };
  }

  const rangeText =
    range?.from && range?.to ? formatRange(range.from, range.to) : "All dates";
  const name = PERIOD_OPTIONS.find((p) => p.key === period)!.label;
  const label =
    period === "all"
      ? "All time"
      : period === "custom"
        ? rangeText
        : `${name} · ${rangeText}`;

  return { period, range, rangeText, verifiedOnly: sp.verified === "1", label };
}

export function filtersToQuery(sp: FilterParams) {
  const q = new URLSearchParams();
  (["period", "from", "to", "verified"] as const).forEach(
    (k) => sp[k] && q.set(k, sp[k]!),
  );
  return q.toString();
}
