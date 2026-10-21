// File: src/app/(admin)/admin/trucks/page.tsx
// (REPLACE the whole file)

import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Container,
  Droplets,
  Gauge,
  UserRound,
  Wrench,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  flagOverdueWashes,
  getDrivers,
  getScoring,
  getTickets,
  getTrucks,
  getUsers,
  washStatusOf,
} from "@/lib/data";
import { formatDateTimeET } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pill } from "@/components/shared/pill";
import { TruckStatusPill } from "@/components/fleet/status-badges";
import { TruckDialogButton } from "@/components/fleet/truck-dialog";
import { lastWashText, WashStatusPill } from "@/components/fleet/wash-bits";

export const metadata = { title: "Trucks" };

export default async function TrucksPage() {
  await requireRole("admin");
  await flagOverdueWashes();
  const [trucks, tickets, drivers, users, scoring] = await Promise.all([
    getTrucks(true),
    getTickets(),
    getDrivers(),
    getUsers(),
    getScoring(),
  ]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const openCount = (id: string) =>
    tickets.filter((t) => t.truckId === id && t.status !== "fixed").length;
  const overdue = trucks.filter(
    (t) => t.active && washStatusOf(t, scoring).overdue,
  ).length;
  const driverOptions = drivers.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div>
      <PageHeader
        title="Trucks"
        description={`${trucks.filter((t) => t.active).length} active trucks · wash every ${scoring.washIntervalDays} days`}
        actions={<TruckDialogButton drivers={driverOptions} />}
      />

      {overdue > 0 && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {overdue} truck{overdue === 1 ? " is" : "s are"} overdue for a wash.
        </p>
      )}

      {trucks.length === 0 ? (
        <EmptyState
          icon={Container}
          title="No trucks yet"
          description="Add your trucks so drivers can do pre-trip checks and log washes."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trucks.map((t) => {
            const open = openCount(t.id);
            const wash = washStatusOf(t, scoring);
            return (
              <Link
                key={t.id}
                href={`/admin/trucks/${t.id}`}
                className={`group block rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm ${t.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-2xl font-bold leading-tight">
                      Unit {t.unitNumber}
                    </p>
                    {t.description && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TruckStatusPill status={t.status} />
                  {!t.active && <Pill>Inactive</Pill>}
                  {t.active && <WashStatusPill status={wash} />}
                  {open > 0 && (
                    <Pill tone="danger">
                      <Wrench className="h-3.5 w-3.5" /> {open} open
                    </Pill>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      <UserRound className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {t.assignedDriverId
                          ? (names[t.assignedDriverId] ?? "—")
                          : "Not assigned"}
                      </span>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Last wash</p>
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      <Droplets className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {lastWashText(wash).replace("Last wash ", "")}
                      </span>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Odometer</p>
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Gauge className="h-3.5 w-3.5" />{" "}
                      {t.odometer ? t.odometer.toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Last pre-trip
                    </p>
                    <p className="truncate font-semibold">
                      {t.lastInspectionAt
                        ? formatDateTimeET(t.lastInspectionAt)
                        : "Never"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
