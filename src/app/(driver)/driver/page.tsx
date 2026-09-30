import Link from "next/link";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  ArrowRight,
  ClipboardList,
  DollarSign,
  PlusCircle,
  ShieldAlert,
  Star,
  Truck,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { JobCard } from "@/components/driver/job-card";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import {
  getDriverJobSummaries,
  getDriverMetrics,
  getDrivers,
} from "@/lib/data";
import { SnapshotSaver } from "@/components/driver/snapshot-saver";

export default async function DriverHome() {
  const user = await requireRole("driver");
  const now = new Date();
  const range = {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };

  const [metrics, jobs, drivers] = await Promise.all([
    getDriverMetrics(user.id, { range }),
    getDriverJobSummaries(user.id),
    getDrivers(),
  ]);
  const recent = jobs.slice(0, 6);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-7 sm:space-y-9">
      <SnapshotSaver
        snapshot={{
          user: { id: user.id, name: user.name },
          drivers: drivers.map((d) => ({ id: d.id, name: d.name })),
          jobs: jobs.slice(0, 25).map((j) => ({
            id: j.id,
            jobNumber: j.jobNumber,
            date: j.date,
            originCity: j.originCity,
            originState: j.originState,
            destCity: j.destCity,
            destState: j.destState,
            deliveredBy: j.deliveredBy,
          })),
        }}
      />
      {/* Greeting */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {format(now, "EEEE, MMMM d")}
        </p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight sm:text-3xl">
          Hi, {firstName}
        </h1>
      </div>

      {/* Install app (only shows on phones that haven't installed it) */}
      <InstallPrompt />

      {/* Primary action */}
      <Link
        href="/driver/jobs/new"
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-secondary p-5 text-white shadow-lg transition active:scale-[0.99] sm:p-6"
      >
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5 bg-primary"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl"
        />
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
          <PlusCircle className="h-7 w-7" />
        </span>
        <div className="relative min-w-0">
          <p className="font-heading text-xl font-bold sm:text-2xl">
            Start a new job
          </p>
          <p className="mt-0.5 text-sm text-white/60">
            Log pickup damage, photos and signature
          </p>
        </div>
        <ArrowRight className="relative ml-auto h-6 w-6 shrink-0 text-white/70 transition group-hover:translate-x-1 group-hover:text-white" />
      </Link>

      {/* Stats */}
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">This month</h2>
            <p className="text-sm text-muted-foreground">
              {format(now, "MMMM yyyy")}
            </p>
          </div>
          <Link
            href="/driver/stats"
            className="text-sm font-semibold text-primary hover:underline"
          >
            All stats
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Jobs"
            value={metrics.jobs}
            icon={Truck}
            tone="primary"
          />
          <StatCard
            label="Damage rate"
            value={formatPercent(metrics.damageRate)}
            hint={`${metrics.damageCount} incident${metrics.damageCount === 1 ? "" : "s"}`}
            icon={ShieldAlert}
          />
          <StatCard
            label="Avg rating"
            value={metrics.reviewCount ? metrics.avgStars.toFixed(1) : "—"}
            hint={`${metrics.reviewCount} review${metrics.reviewCount === 1 ? "" : "s"}`}
            icon={Star}
          />
          <StatCard
            label="Upsells"
            value={formatCurrency(metrics.upsellTotal)}
            icon={DollarSign}
          />
        </div>
      </section>

      {/* Recent jobs */}
      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold sm:text-xl">Recent jobs</h2>
          {jobs.length > 0 && (
            <Link
              href="/driver/jobs"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {recent.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recent.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={ClipboardList}
                title="No jobs yet"
                description="Your jobs will show here after you start your first one."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
