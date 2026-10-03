import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getPreTrips,
  getRoadside,
  getScoring,
  getTickets,
  getTruck,
  getUsers,
  pointsFor,
} from "@/lib/data";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pill } from "@/components/shared/pill";
import { TruckStatusPill } from "@/components/fleet/status-badges";
import { TruckDialogButton } from "@/components/fleet/truck-dialog";
import { TicketCard } from "@/components/fleet/ticket-card";
import { PreTripCard } from "@/components/fleet/pre-trip-card";
import { RoadsideList } from "@/components/fleet/roadside-list";
import { Gauge, Siren } from "lucide-react";

export default async function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const truck = await getTruck(id);
  if (!truck) notFound();

  const [tickets, preTrips, roadside, users, scoring] = await Promise.all([
    getTickets({ truckId: id }),
    getPreTrips({ truckId: id }),
    getRoadside({ truckId: id }),
    getUsers(),
    getScoring(),
  ]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const open = tickets.filter((t) => t.status !== "fixed").length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/trucks"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All trucks
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Unit {truck.unitNumber}
            </h1>
            <TruckStatusPill status={truck.status} />
            {!truck.active && <Pill>Inactive</Pill>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[truck.description, truck.plate].filter(Boolean).join(" · ") ||
              "No description"}
          </p>
        </div>
        <TruckDialogButton truck={truck} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Open tickets"
          value={open}
          icon={Wrench}
          tone="primary"
        />
        <StatCard label="Total tickets" value={tickets.length} icon={Wrench} />
        <StatCard
          label="Pre-trip checks"
          value={preTrips.length}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Odometer"
          value={truck.odometer ? truck.odometer.toLocaleString() : "—"}
          icon={Gauge}
        />
      </div>

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
