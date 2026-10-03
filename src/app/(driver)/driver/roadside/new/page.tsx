import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getScoring, getTrucks } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { DriverFormLayout } from "@/components/driver/form-layout";
import { RoadsideForm } from "@/components/fleet/roadside-form";

export default async function NewRoadsidePage() {
  await requireRole("driver");
  const [trucks, s] = await Promise.all([getTrucks(false), getScoring()]);

  return (
    <div>
      <Link
        href="/driver/roadside"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Roadside inspections
      </Link>
      <PageHeader
        title="Log roadside inspection"
        description="Record a DOT roadside inspection."
      />
      <DriverFormLayout
        tips={[
          "Log every inspection, even clean ones. Clean inspections add points.",
          "Upload the report the inspector gave you, or a clear photo of it.",
          "For violations, copy what the inspector wrote.",
        ]}
      >
        <RoadsideForm
          mode="driver"
          trucks={trucks.map((t) => ({ id: t.id, unitNumber: t.unitNumber }))}
          points={{
            clean: s.clean,
            violations: s.violations,
            out_of_service: s.outOfService,
          }}
          cancelHref="/driver/roadside"
        />
      </DriverFormLayout>
    </div>
  );
}
