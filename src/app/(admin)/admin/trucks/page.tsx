import Link from "next/link";
import { ChevronRight, Container, Gauge, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTickets, getTrucks } from "@/lib/data";
import { formatDateTimeET } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pill } from "@/components/shared/pill";
import { TruckStatusPill } from "@/components/fleet/status-badges";
import { TruckDialogButton } from "@/components/fleet/truck-dialog";

export const metadata = { title: "Trucks" };

export default async function TrucksPage() {
  await requireRole("admin");
  const [trucks, tickets] = await Promise.all([getTrucks(true), getTickets()]);
  const openCount = (id: string) =>
    tickets.filter((t) => t.truckId === id && t.status !== "fixed").length;

  return (
    <div>
      <PageHeader
        title="Trucks"
        description={`${trucks.filter((t) => t.active).length} active trucks`}
        actions={<TruckDialogButton />}
      />
      {trucks.length === 0 ? (
        <EmptyState
          icon={Container}
          title="No trucks yet"
          description="Add your trucks so drivers can do pre-trip checks."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trucks.map((t) => {
            const open = openCount(t.id);
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
                  {open > 0 && (
                    <Pill tone="danger">
                      <Wrench className="h-3.5 w-3.5" /> {open} open
                    </Pill>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Odometer</p>
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Gauge className="h-3.5 w-3.5" />{" "}
                      {t.odometer ? t.odometer.toLocaleString() : "—"}
                    </p>
                  </div>
                  <div>
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
