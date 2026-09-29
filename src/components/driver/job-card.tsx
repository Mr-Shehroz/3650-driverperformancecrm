import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  ChevronRight,
  DollarSign,
  Star,
} from "lucide-react";
import { Pill } from "@/components/shared/pill";
import {
  formatCurrency,
  formatDate,
  formatDestination,
  formatOrigin,
} from "@/lib/format";
import type { JobSummary } from "@/types";

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <Link
      href={`/driver/jobs/${job.id}`}
      className="group block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm active:scale-[0.99] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold leading-tight">
            {job.jobNumber}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(job.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {job.deliveredBy === "partner" && <Pill>Partner</Pill>}
          <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 text-[15px] font-medium">
        <span className="truncate">{formatOrigin(job)}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{formatDestination(job)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill>
          <Camera className="h-3.5 w-3.5" />
          {job.preDamageCount} pre-damage
        </Pill>
        <Pill tone={job.damageCount > 0 ? "danger" : "neutral"}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {job.damageCount} damage
        </Pill>
        <Pill tone={job.reviewCount > 0 ? "warning" : "neutral"}>
          <Star className="h-3.5 w-3.5" />
          {job.reviewCount} review{job.reviewCount === 1 ? "" : "s"}
        </Pill>
        {job.upsellTotal > 0 && (
          <Pill tone="success">
            <DollarSign className="h-3.5 w-3.5" />
            {formatCurrency(job.upsellTotal)}
          </Pill>
        )}
      </div>
    </Link>
  );
}
