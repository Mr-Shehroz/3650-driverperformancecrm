// File: src/components/fleet/wash-bits.tsx
// (NEW file)

import { AlertTriangle, Droplets, Receipt } from "lucide-react";
import { Pill } from "@/components/shared/pill";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTimeET } from "@/lib/format";
import {
  CONDITION_PHOTOS,
  type PreTripInspection,
  type TruckWash,
  type WashStatus,
} from "@/types";
import { cn } from "@/lib/utils";

/** "Overdue 3 days" / "Due in 5 days" / "Due today" */
export function WashStatusPill({
  status,
  className,
}: {
  status: WashStatus;
  className?: string;
}) {
  if (status.overdue) {
    const late = Math.max(1, -status.daysLeft);
    return (
      <Pill tone="danger" className={className}>
        <AlertTriangle className="h-3.5 w-3.5" /> Wash overdue · {late} day
        {late === 1 ? "" : "s"}
      </Pill>
    );
  }
  const left = status.daysLeft;
  return (
    <Pill tone={left <= 2 ? "warning" : "success"} className={className}>
      <Droplets className="h-3.5 w-3.5" />
      {left <= 0
        ? "Wash due today"
        : `Wash due in ${left} day${left === 1 ? "" : "s"}`}
    </Pill>
  );
}

/** "Oct 21, 2026" in company (Eastern) time */
export function formatDayET(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** Last wash line for cards and tables */
export function lastWashText(status: WashStatus) {
  return status.lastWashedAt
    ? `Last wash ${formatDayET(status.lastWashedAt)}`
    : "Never washed";
}

/** Wash history with the truck photo and receipt */
export function WashList({
  washes,
  units,
  names,
  emptyText = "No washes logged yet.",
}: {
  washes: TruckWash[];
  units?: Record<string, string>;
  names?: Record<string, string>;
  emptyText?: string;
}) {
  if (!washes.length) {
    return (
      <EmptyState
        icon={Droplets}
        title="No washes yet"
        description={emptyText}
      />
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {washes.map((w) => (
        <li key={w.id} className="overflow-hidden rounded-xl border bg-card">
          {w.photoUrl ? (
            <a
              href={w.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="block bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={w.photoUrl}
                alt="Clean truck"
                className="aspect-[16/9] w-full object-cover"
              />
            </a>
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center bg-muted text-sm text-muted-foreground">
              Photo unavailable
            </div>
          )}
          <div className="space-y-1.5 p-4">
            <p className="font-semibold">
              {units ? `Unit ${units[w.truckId] ?? "—"}` : "Truck washed"}
              {names && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {names[w.driverId] ?? "Driver"}
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDateTimeET(w.capturedAtDevice)}
            </p>
            {w.notes && <p className="text-sm">{w.notes}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {w.receiptUrl ? (
                <a
                  href={w.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Receipt className="h-4 w-4" /> View receipt
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No receipt
                </span>
              )}
              {w.syncedOffline && <Pill>Saved offline</Pill>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The 5 condition photos of one pre-trip */
export function ConditionPhotoGrid({
  inspection,
  className,
}: {
  inspection: Pick<PreTripInspection, "conditionPhotos">;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      {CONDITION_PHOTOS.map((c) => {
        const url = inspection.conditionPhotos[c.key];
        return (
          <figure key={c.key} className="min-w-0">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={c.label}
                  className="aspect-[4/3] w-full object-cover transition hover:scale-[1.02]"
                />
              </a>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed bg-muted/40 text-xs text-muted-foreground">
                No photo
              </div>
            )}
            <figcaption className="mt-1.5 truncate text-sm font-medium">
              {c.label}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
