import { format, parseISO } from "date-fns";
import type { Job } from "@/types";

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatDate(d: string) {
  return format(parseISO(d), "MMM d, yyyy");
}

export function formatDateTime(d: string) {
  return format(parseISO(d), "MMM d, yyyy · h:mm a");
}

export function formatOrigin(j: Job) {
  return `${j.originCity}, ${j.originState}`;
}

export function formatDestination(j: Job) {
  return `${j.destCity}, ${j.destState}`;
}

/** Eastern time — used for claims records and audit history */
export function formatDateTimeET(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}
