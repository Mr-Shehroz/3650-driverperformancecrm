import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDrivers, getScoring, getTrucks } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { RoadsideForm } from "@/components/fleet/roadside-form";

export default async function AdminNewRoadsidePage() {
  await requireRole("admin");
  const [trucks, drivers, s] = await Promise.all([
    getTrucks(true),
    getDrivers(),
    getScoring(),
  ]);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/roadside"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Roadside inspections
      </Link>
      <PageHeader
        title="Log roadside inspection"
        description="Record a DOT inspection for a driver."
      />
      <RoadsideForm
        mode="admin"
        trucks={trucks.map((t) => ({ id: t.id, unitNumber: t.unitNumber }))}
        drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
        points={{
          clean: s.clean,
          violations: s.violations,
          out_of_service: s.outOfService,
        }}
        cancelHref="/admin/roadside"
      />
    </div>
  );
}
