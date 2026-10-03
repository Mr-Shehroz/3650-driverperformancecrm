import {
  FileText,
  MapPin,
  Truck as TruckIcon,
  User as UserIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import type { RoadsideInspection } from "@/types";
import { RoadsideResultPill } from "./status-badges";
import { cn } from "@/lib/utils";

export function RoadsideList({
  rows,
  units,
  driverNames,
  pointsFor,
}: {
  rows: RoadsideInspection[];
  units: Record<string, string>;
  driverNames?: Record<string, string>;
  pointsFor: (r: RoadsideInspection) => number;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="No roadside inspections"
        description="Logged DOT inspections will show here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pts = pointsFor(r);
        return (
          <li key={r.id} className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold leading-tight">
                  {formatDate(r.date)}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {r.location}, {r.state}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TruckIcon className="h-3.5 w-3.5" /> Unit{" "}
                    {units[r.truckId] ?? "—"}
                  </span>
                  {driverNames && (
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" />{" "}
                      {driverNames[r.driverId] ?? "—"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoadsideResultPill result={r.result} />
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                    pts >= 0
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700",
                  )}
                >
                  {pts > 0 ? `+${pts}` : pts} pts
                </span>
              </div>
            </div>
            {r.violationNotes && (
              <p className="mt-3 text-[15px]">{r.violationNotes}</p>
            )}
            {r.report && (
              <div className="mt-3">
                {r.report.url ? (
                  <a
                    href={r.report.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> {r.report.name}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" /> {r.report.name}
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
