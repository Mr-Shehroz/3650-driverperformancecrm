import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDrivers } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { NewJobForm } from "@/components/driver/new-job-form";
import { DriverFormLayout } from "@/components/driver/form-layout";

export default async function NewJobPage() {
  const user = await requireRole("driver");
  const drivers = await getDrivers();

  return (
    <div>
      <Link
        href="/driver"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <PageHeader
        title="New job"
        description="Enter the job details before loading."
      />
      <DriverFormLayout
        tips={[
          "Enter the job number exactly as it appears on the paperwork.",
          "Tap every crew member who worked this job with you.",
          "Pick Partner if a partner crew is doing the delivery.",
          "No signal? The job saves on this phone and uploads when you're back online.",
        ]}
      >
        <NewJobForm
          currentUserId={user.id}
          drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
        />
      </DriverFormLayout>
    </div>
  );
}
