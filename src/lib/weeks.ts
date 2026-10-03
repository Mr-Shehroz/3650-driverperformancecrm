import {
  addWeeks,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from "date-fns";

/** Monday of the week (YYYY-MM-DD) */
export function weekStartOf(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function resolveWeek(v?: string) {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v)))
    return weekStartOf(parseISO(v));
  return weekStartOf(new Date());
}

export function shiftWeek(week: string, n: number) {
  return format(addWeeks(parseISO(week), n), "yyyy-MM-dd");
}

/** "Sep 29 – Oct 5, 2026" */
export function weekLabel(week: string) {
  const start = parseISO(week);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const sameMonth = start.getMonth() === end.getMonth();
  return `${format(start, "MMM d")} – ${format(end, sameMonth ? "d, yyyy" : "MMM d, yyyy")}`;
}
