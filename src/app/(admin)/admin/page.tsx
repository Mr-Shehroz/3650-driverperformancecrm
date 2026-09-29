import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  DollarSign,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Truck,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAllDriverMetrics,
  getAllJobSummaries,
  getAllRepMetrics,
  getUsers,
} from "@/lib/data";
import {
  driverTotals,
  lowestDamage,
  repTotals,
  topReviews,
  topUpsells,
} from "@/lib/metrics";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FilterBar } from "@/components/admin/filter-bar";
import { RankList } from "@/components/admin/rank-list";
import { JobsTable } from "@/components/admin/jobs-table";

function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        {linkLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  await requireRole("admin");
  const { range, verifiedOnly, label } = resolveFilters(await searchParams);

  const [driverRows, repRows, jobs, users] = await Promise.all([
    getAllDriverMetrics({ range, verifiedOnly }),
    getAllRepMetrics({ range }),
    getAllJobSummaries({ range }),
    getUsers(),
  ]);

  const d = driverTotals(driverRows);
  const s = repTotals(repRows);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Company performance · ${label}${verifiedOnly ? " · Verified only" : ""}`}
      />
      <FilterBar />

      <div className="space-y-8">
        <section>
          <SectionHead
            title="Drivers"
            href="/admin/drivers"
            linkLabel="All drivers"
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Jobs completed"
              value={d.jobs}
              icon={Truck}
              tone="primary"
            />
            <StatCard
              label="Damage rate"
              value={formatPercent(d.damageRate)}
              hint={`${d.damageCount} incidents · ${formatCurrency(d.damageCost)}`}
              icon={ShieldAlert}
            />
            <StatCard
              label="Avg rating"
              value={d.reviewCount ? d.avgStars.toFixed(1) : "—"}
              hint={`${d.reviewCount} reviews · ${formatPercent(d.fiveStarRate)} 5-star`}
              icon={Star}
            />
            <StatCard
              label="Upsell revenue"
              value={formatCurrency(d.upsellTotal)}
              hint={`${formatCurrency(Math.round(d.upsellAvg))} per job`}
              icon={DollarSign}
            />
          </div>
        </section>

        <section>
          <SectionHead title="Sales" href="/admin/sales" linkLabel="All reps" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Leads"
              value={s.leads}
              hint={`${s.booked} booked`}
              icon={Users}
              tone="primary"
            />
            <StatCard
              label="Closing ratio"
              value={formatPercent(s.closingRatio)}
              icon={Target}
            />
            <StatCard
              label="Cost per acquisition"
              value={formatCurrency(Math.round(s.cpa))}
              hint={`${formatCurrency(s.totalLeadCost)} lead cost`}
              icon={BadgePercent}
            />
            <StatCard
              label="Revenue booked"
              value={formatCurrency(s.revenue)}
              icon={Receipt}
            />
          </div>
        </section>

        <section>
          <SectionHead
            title="Top performers"
            href="/admin/leaderboard"
            linkLabel="Leaderboard"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RankList
              title="Most reviews"
              icon={Star}
              rows={topReviews(driverRows, 3)}
            />
            <RankList
              title="Top upsells"
              icon={Trophy}
              rows={topUpsells(driverRows, 3, formatCurrency)}
            />
            <RankList
              title="Lowest damage rate"
              icon={ShieldCheck}
              rows={lowestDamage(driverRows, 3)}
              className="md:col-span-2 xl:col-span-1"
            />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold sm:text-xl">Recent jobs</h2>
            <p className="text-sm text-muted-foreground">
              {jobs.length} in period
            </p>
          </div>
          <JobsTable jobs={jobs.slice(0, 8)} driverNames={names} />
        </section>
      </div>
    </div>
  );
}
