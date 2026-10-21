// File: src/app/(driver)/driver/wash/new/page.tsx
// (NEW file)

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTrucks } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { DriverFormLayout } from "@/components/driver/form-layout";
import { WashForm } from "@/components/fleet/wash-form";

export const metadata = { title: "Mark truck washed" };

export default async function NewWashPage() {
  const user = await requireRole("driver");
  const trucks = await getTrucks(false);
  // The driver's own trucks first
  const sorted = [...trucks].sort(
    (a, b) =>
      Number(b.assignedDriverId === user.id) -
      Number(a.assignedDriverId === user.id),
  );

  return (
    <div>
      <Link
        href="/driver/wash"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Truck wash
      </Link>
      <PageHeader
        title="Mark truck washed"
        description="Log the wash right after it's done."
      />
      <DriverFormLayout
        tips={[
          "Take the photo after the wash, with the whole truck in view.",
          "Add the receipt if you paid for the wash.",
          "No signal? The wash saves on this phone and uploads later.",
          "Logging the wash resets the truck's wash timer.",
        ]}
      >
        <WashForm
          trucks={sorted.map((t) => ({
            id: t.id,
            unitNumber: t.unitNumber,
            description: t.description,
          }))}
        />
      </DriverFormLayout>
    </div>
  );
}
