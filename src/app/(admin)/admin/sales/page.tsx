import {
  BadgePercent,
  DollarSign,
  Download,
  Receipt,
  Target,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAllRepMetrics,
  getRepMonthlyTrend,
  getReps,
  getSourceBreakdown,
} from "@/lib/data";
import { repTotals } from "@/lib/metrics";
import {
  filtersToQuery,
  resolveFilters,
  type FilterParams,
} from "@/lib/periods";
import { SOURCE_OPTIONS, resolveSource } from "@/lib/sales";
import { formatCurrency, formatPercent } from "@/lib/format";
import { LEAD_SOURCE_LABELS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FilterBar } from "@/components/admin/filter-bar";
import { ParamPills } from "@/components/shared/param-pills";
import { MetricChart } from "@/components/shared/metric-chart";
import { RepsTable, type RepRow } from "@/components/sales/reps-table";
import { SourceBreakdown } from "@/components/sales/source-breakdown";

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams & { source?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const { range, label } = resolveFilters(sp);
  const source = resolveSource(sp.source);

  const [metrics, reps, breakdown, trend] = await Promise.all([
    getAllRepMetrics({ range, source }),
    getReps(true),
    getSourceBreakdown({ range }),
    getRepMonthlyTrend(undefined, 6),
  ]);

  const active = Object.fromEntries(reps.map((r) => [r.id, r.active]));
  const rows: RepRow[] = metrics.map((m) => ({
    ...m,
    active: active[m.repId] ?? false,
  }));
  const t = repTotals(metrics);
  const exportQuery = `${filtersToQuery(sp)}${source ? `&source=${source}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Sales Reps"
        description={`${label}${source ? ` · ${LEAD_SOURCE_LABELS[source]}` : ""}`}
        actions={
          <a
            href={`/admin/sales/export?${exportQuery}`}
            className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold transition hover:border-foreground/30"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <FilterBar showVerified={false} />
      <ParamPills
        param="source"
        options={SOURCE_OPTIONS}
        allLabel="All sources"
        label="Source"
        className="-mt-2 mb-6"
      />

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-bold sm:text-xl">Company totals</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-5">
            <StatCard
              label="Leads"
              value={t.leads}
              hint={`${t.booked} booked`}
              icon={Users}
              tone="primary"
            />
            <StatCard
              label="Closing ratio"
              value={formatPercent(t.closingRatio)}
              icon={Target}
              tone="primary"
            />
            <StatCard
              label="Total lead cost"
              value={formatCurrency(t.totalLeadCost)}
              icon={DollarSign}
            />
            <StatCard
              label="Cost per acquisition"
              value={t.booked ? formatCurrency(Math.round(t.cpa)) : "—"}
              icon={BadgePercent}
            />
            <StatCard
              label="Revenue booked"
              value={formatCurrency(t.revenue)}
              icon={Receipt}
              className="col-span-2 md:col-span-1"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold sm:text-xl">Rep comparison</h2>
          <RepsTable rows={rows} />
        </section>

        <div className="grid gap-6 2xl:grid-cols-2">
          <SourceBreakdown rows={breakdown} title="Company by lead source" />
          <MetricChart
            title="Company trend"
            subtitle="Last 6 months, all reps"
            data={trend as unknown as Record<string, string | number>[]}
            xKey="month"
            metrics={[
              { key: "leads", label: "Leads", format: "number" },
              { key: "booked", label: "Booked", format: "number" },
              { key: "closingRatio", label: "Close %", format: "percent" },
              { key: "cpa", label: "CPA", format: "currency" },
              { key: "revenue", label: "Revenue", format: "currency" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
