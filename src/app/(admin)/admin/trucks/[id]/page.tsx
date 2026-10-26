// File: src/app/(admin)/admin/trucks/[id]/page.tsx
// (REPLACE the whole file)

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ClipboardCheck,
  Droplets,
  Gauge,
  Siren,
  UserRound,
  Wrench,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  flagOverdueWashes,
  getDrivers,
  getLatestCondition,
  getOverdueEvents,
  getPreTrips,
  getRoadside,
  getScoring,
  getTickets,
  getTruck,
  getUsers,
  getWashes,
  pointsFor,
  washStatusOf,
} from "@/lib/data";
import { formatDateTimeET } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pill } from "@/components/shared/pill";
import { TruckStatusPill } from "@/components/fleet/status-badges";
import { TruckDialogButton } from "@/components/fleet/truck-dialog";
import { TicketCard } from "@/components/fleet/ticket-card";
import { PreTripCard } from "@/components/fleet/pre-trip-card";
import { RoadsideList } from "@/components/fleet/roadside-list";
import {
  ConditionPhotoGrid,
  formatDayET,
  WashList,
  WashStatusPill,
} from "@/components/fleet/wash-bits";
import { OverdueList } from "@/components/fleet/overdue-list";

export default async function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  await flagOverdueWashes();
  const truck = await getTruck(id);
  if (!truck) notFound();

  const [
    tickets,
    preTrips,
    roadside,
    users,
    drivers,
    scoring,
    condition,
    washes,
    overdue,
  ] = await Promise.all([
    getTickets({ truckId: id }),
    getPreTrips({ truckId: id }),
    getRoadside({ truckId: id }),
    getUsers(),
    getDrivers(),
    getScoring(),
    getLatestCondition(id),
    getWashes({ truckId: id }),
    getOverdueEvents({ truckId: id }),
  ]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const open = tickets.filter((t) => t.status !== "fixed").length;
  const wash = washStatusOf(truck, scoring);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/trucks"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All trucks
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Unit {truck.unitNumber}
            </h1>
            <TruckStatusPill status={truck.status} />
            {truck.active ? (
              <WashStatusPill status={wash} />
            ) : (
              <Pill>Inactive</Pill>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[truck.description, truck.plate].filter(Boolean).join(" · ") ||
              "No description"}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Assigned driver:</span>
            <span className="font-semibold">
              {truck.assignedDriverId
                ? (names[truck.assignedDriverId] ?? "—")
                : "Not assigned"}
            </span>
          </p>
        </div>
        <TruckDialogButton
          truck={truck}
          drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Last wash"
          value={truck.lastWashedAt ? formatDayET(truck.lastWashedAt) : "Never"}
          hint={
            wash.overdue
              ? `Overdue ${Math.max(1, -wash.daysLeft)} day${-wash.daysLeft === 1 ? "" : "s"}`
              : `Next due in ${Math.max(0, wash.daysLeft)} day${wash.daysLeft === 1 ? "" : "s"}`
          }
          icon={Droplets}
          tone="primary"
        />
        <StatCard
          label="Overdue washes"
          value={overdue.length}
          icon={AlertTriangle}
        />
        <StatCard label="Open tickets" value={open} icon={Wrench} />
        <StatCard
          label="Odometer"
          value={truck.odometer ? truck.odometer.toLocaleString() : "—"}
          icon={Gauge}
        />
      </div>

      {/* Latest condition photos */}
      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
              <Camera className="h-5 w-5 text-primary" /> Latest condition
              photos
            </h2>
            {condition && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {names[condition.driverId] ?? "Driver"} ·{" "}
                {formatDateTimeET(condition.capturedAtDevice)}
              </p>
            )}
          </div>
          {condition && (
            <Link
              href={`/admin/pre-trip/${condition.id}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View pre-trip
            </Link>
          )}
        </div>
        {condition ? (
          <ConditionPhotoGrid inspection={condition} />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No condition photos yet. They are taken with every pre-trip check.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold sm:text-xl">
          <AlertTriangle className="h-5 w-5 text-primary" /> Overdue washes
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          A truck is overdue after {scoring.washIntervalDays} days without a
          wash. Each one counts {scoring.overdueWash} points against the
          assigned driver (or the driver of the last pre-trip).
        </p>
        <OverdueList
          events={overdue}
          names={names}
          points={scoring.overdueWash}
        />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold sm:text-xl">
          <Droplets className="h-5 w-5 text-primary" /> Wash history
        </h2>
        <WashList
          washes={washes}
          names={names}
          emptyText="Washes drivers report in their pre-trip checks show here."
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">
          Maintenance history
        </h2>
        {tickets.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {tickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                unitNumber={truck.unitNumber}
                driverName={names[t.driverId] ?? "—"}
                showTruck={false}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Wrench} title="No maintenance tickets" />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">Pre-trip checks</h2>
        {preTrips.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {preTrips.map((p) => (
              <PreTripCard
                key={p.id}
                inspection={p}
                unitNumber={truck.unitNumber}
                driverName={names[p.driverId]}
                href={`/admin/pre-trip/${p.id}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardCheck} title="No pre-trip checks yet" />
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold sm:text-xl">
          <Siren className="h-5 w-5 text-primary" /> Roadside inspections
        </h2>
        <RoadsideList
          rows={roadside}
          units={{ [truck.id]: truck.unitNumber }}
          driverNames={names}
          pointsFor={(r) => pointsFor(r.result, scoring)}
        />
      </section>
    </div>
  );
}
