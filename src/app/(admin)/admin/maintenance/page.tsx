import { Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTickets, getTrucks, getUsers } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ParamPills } from "@/components/shared/param-pills";
import { TicketCard } from "@/components/fleet/ticket-card";
import { TICKET_STATUS_LABELS, type TicketStatus } from "@/types";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin");
  const { status } = await searchParams;
  const filter =
    status && status in TICKET_STATUS_LABELS
      ? (status as TicketStatus)
      : undefined;

  const [all, trucks, users] = await Promise.all([
    getTickets(),
    getTrucks(),
    getUsers(),
  ]);
  const tickets = filter ? all.filter((t) => t.status === filter) : all;
  const units = Object.fromEntries(trucks.map((t) => [t.id, t.unitNumber]));
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const count = (s: TicketStatus) => all.filter((t) => t.status === s).length;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Tickets opened from pre-trip checks."
      />
      <ParamPills
        param="status"
        allLabel={`All (${all.length})`}
        options={(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map(
          (s) => ({
            value: s,
            label: `${TICKET_STATUS_LABELS[s]} (${count(s)})`,
          }),
        )}
        className="mb-6"
      />
      {tickets.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              unitNumber={units[t.truckId] ?? "—"}
              driverName={names[t.driverId] ?? "—"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Wrench}
          title="No tickets"
          description="Nothing here for this filter."
        />
      )}
    </div>
  );
}
