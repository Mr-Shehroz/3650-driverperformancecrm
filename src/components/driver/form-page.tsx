import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getJobDetail } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { DriverFormLayout } from "./form-layout";
import type { JobDetail } from "@/types";

export async function getDriverOwnedJob(id: string): Promise<JobDetail> {
  const user = await requireRole("driver");
  const job = await getJobDetail(id);
  if (!job || job.driverId !== user.id) notFound();
  return job;
}

export function DriverFormPage({
  job,
  title,
  description,
  tips,
  children,
}: {
  job: JobDetail;
  title: string;
  description?: string;
  tips: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <Link
        href={`/driver/jobs/${job.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {job.jobNumber}
      </Link>
      <PageHeader title={title} description={description} />
      <DriverFormLayout tips={tips}>{children}</DriverFormLayout>
    </div>
  );
}
