import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { formatDateTimeET } from "@/lib/format";
import type { PreTripInspection } from "@/types";
import { TruckStatusPill } from "./status-badges";

export function PreTripCard({
  inspection,
  unitNumber,
  driverName,
  href,
}: {
  inspection: PreTripInspection;
  unitNumber: string;
  driverName?: string;
  href: string;
}) {
  const flagged = inspection.items.filter(
    (i) => i.status === "attention",
  ).length;
  return (
    <Link
      href={href}
      className="group block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold leading-tight">
            Unit {unitNumber}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDateTimeET(inspection.receivedAtServer)}
            {driverName && ` · ${driverName}`}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TruckStatusPill status={inspection.truckStatus} />
        {flagged > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" /> {flagged} flagged
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">All items OK</span>
        )}
      </div>
    </Link>
  );
}
