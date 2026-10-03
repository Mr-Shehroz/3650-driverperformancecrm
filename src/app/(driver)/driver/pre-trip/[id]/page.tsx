import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getPreTrip, getTickets, getTruck } from "@/lib/data";
import { InspectionDetail } from "@/components/fleet/inspection-detail";

export default async function DriverPreTripDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("driver");
  const { id } = await params;
  const inspection = await getPreTrip(id);
  if (!inspection || inspection.driverId !== user.id) notFound();

  const [truck, tickets] = await Promise.all([
    getTruck(inspection.truckId),
    getTickets({ inspectionId: id }),
  ]);

  return (
    <div>
      <Link
        href="/driver/pre-trip"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Pre-trip checks
      </Link>
      <InspectionDetail
        inspection={inspection}
        truck={truck}
        driverName={user.name}
        tickets={tickets}
      />
    </div>
  );
}
