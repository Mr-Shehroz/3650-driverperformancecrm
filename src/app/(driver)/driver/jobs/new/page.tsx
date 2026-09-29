import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDrivers } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { NewJobForm } from "@/components/driver/new-job-form";

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
      <NewJobForm
        currentUserId={user.id}
        drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
