// File: src/app/(driver)/driver/pre-trip/new/page.tsx
// (REPLACE the whole file)

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTrucks } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { DriverFormLayout } from "@/components/driver/form-layout";
import { PreTripForm } from "@/components/fleet/pre-trip-form";

export const metadata = { title: "New pre-trip" };

export default async function NewPreTripPage() {
  await requireRole("driver");
  const trucks = await getTrucks(false);

  return (
    <div>
      <Link
        href="/driver/pre-trip"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Pre-trip checks
      </Link>
      <PageHeader
        title="Pre-trip inspection"
        description="Walk around the truck before you drive."
      />
      <DriverFormLayout
        tips={[
          "Take all 5 condition photos: front, rear, both sides and the cab.",
          "If the truck was washed since the last trip, add a photo of the clean truck.",
          "Check every item, even if you drove this truck yesterday.",
          "Add a clear photo for anything that needs attention.",
          "Flagged items go straight to the maintenance team.",
          'Choose "Do not drive" if the truck is unsafe. Admin is alerted right away.',
          "Reporting problems never lowers your score.",
        ]}
      >
        <PreTripForm
          trucks={trucks.map((t) => ({
            id: t.id,
            unitNumber: t.unitNumber,
            description: t.description,
            status: t.status,
          }))}
        />
      </DriverFormLayout>
    </div>
  );
}
