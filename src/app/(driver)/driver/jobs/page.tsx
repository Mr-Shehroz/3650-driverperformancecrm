import Link from "next/link";
import { Search, X } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDriverJobSummaries } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { JobCard } from "@/components/driver/job-card";
import { ClipboardList, PlusCircle } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";

export const metadata = { title: "Job History" };

export default async function DriverJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole("driver");
  const { q = "" } = await searchParams;
  const jobs = await getDriverJobSummaries(user.id, { q });

  return (
    <div>
      <PageHeader
        title="Job History"
        description={`${jobs.length} job${jobs.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
        actions={
          <Link
            href="/driver/jobs/new"
            className="hidden h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:flex"
          >
            <PlusCircle className="h-4 w-4" /> New Job
          </Link>
        }
      />

      <SearchInput
        placeholder="Search job number or city"
        className="mb-5 max-w-xl"
        inputClassName="h-12 rounded-xl bg-card"
      />

      {jobs.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={q ? "No matching jobs" : "No jobs yet"}
          description={
            q
              ? "Try a different job number or city."
              : "Start your first job to see it here."
          }
        />
      )}
    </div>
  );
}
