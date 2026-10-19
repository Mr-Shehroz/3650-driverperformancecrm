// File: src/components/driver/form-page.tsx
// (REPLACE the whole file)

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getJob } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { DriverFormLayout } from "./form-layout";
import type { Job } from "@/types";

export async function getDriverOwnedJob(id: string): Promise<Job> {
  const user = await requireRole("driver");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const job = await getJob(id);
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
  job: Job;
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
