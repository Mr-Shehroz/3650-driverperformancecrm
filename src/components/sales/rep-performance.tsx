import {
  BadgePercent,
  CalendarCheck,
  DollarSign,
  Receipt,
  Target,
  Users,
} from "lucide-react";
import {
  getRepMetrics,
  getRepMonthlyTrend,
  getSourceBreakdown,
} from "@/lib/data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { MetricChart } from "@/components/shared/metric-chart";
import { SourceBreakdown } from "./source-breakdown";
import type { DateRange, LeadSource } from "@/types";

export async function RepPerformance({
  repId,
  range,
  source,
}: {
  repId: string;
  range?: DateRange;
  source?: LeadSource;
}) {
  const [m, breakdown, trend] = await Promise.all([
    getRepMetrics(repId, { range, source }),
    getSourceBreakdown({ repId, range }),
    getRepMonthlyTrend(repId, 6),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Leads received"
          value={m.leads}
          icon={Users}
          tone="primary"
        />
        <StatCard label="Booked" value={m.booked} icon={CalendarCheck} />
        <StatCard
          label="Closing ratio"
          value={formatPercent(m.closingRatio)}
          icon={Target}
          tone="primary"
        />
        <StatCard
          label="Total lead cost"
          value={formatCurrency(m.totalLeadCost)}
          icon={DollarSign}
        />
        <StatCard
          label="Cost per acquisition"
          value={m.booked ? formatCurrency(Math.round(m.cpa)) : "—"}
          icon={BadgePercent}
        />
        <StatCard
          label="Revenue booked"
          value={formatCurrency(m.revenue)}
          icon={Receipt}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <SourceBreakdown rows={breakdown} />
        <MetricChart
          title="Monthly trend"
          subtitle="Last 6 months"
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
  );
}
