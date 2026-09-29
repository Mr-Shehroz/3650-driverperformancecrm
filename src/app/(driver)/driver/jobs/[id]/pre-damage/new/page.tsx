import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getJobDetail } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { PreDamageForm } from "@/components/driver/pre-damage-form";

export default async function NewPreDamagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("driver");
  const { id } = await params;
  const job = await getJobDetail(id);
  if (!job || job.driverId !== user.id) notFound();

  return (
    <div>
      <Link
        href={`/driver/jobs/${job.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {job.jobNumber}
      </Link>
      <PageHeader
        title="Pre-existing damage"
        description="Record damage found at pickup, before loading."
      />
      <PreDamageForm jobId={job.id} />
    </div>
  );
}
