import Link from "next/link";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import {
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Receipt,
  ShieldAlert,
  Star,
  Truck,
  TrendingUp,
  Trophy,
  Wrench,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDriverMetrics, getDriverMonthlyTrend } from "@/lib/data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { TrendChart } from "@/components/driver/trend-chart";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types";

const PERIODS = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "3 months" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

function rangeFor(period: PeriodKey): DateRange | undefined {
  const now = new Date();
  const to = format(now, "yyyy-MM-dd");
  if (period === "month")
    return { from: format(startOfMonth(now), "yyyy-MM-dd"), to };
  if (period === "quarter")
    return { from: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"), to };
  if (period === "year")
    return { from: format(startOfYear(now), "yyyy-MM-dd"), to };
  return undefined;
}

const rate = (v: number | null) => (v === null ? "—" : formatPercent(v));

export default async function DriverStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireRole("driver");
  const { period: raw } = await searchParams;
  const period: PeriodKey = PERIODS.some((p) => p.key === raw)
    ? (raw as PeriodKey)
    : "month";

  const [m, trend] = await Promise.all([
    getDriverMetrics(user.id, { range: rangeFor(period) }),
    getDriverMonthlyTrend(user.id, 6),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Stats"
        description="Your performance across jobs, damage, reviews and upsells."
      />

      {/* Period filter */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/driver/stats?period=${p.key}`}
            scroll={false}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition",
              period === p.key
                ? "border-secondary bg-secondary text-white"
                : "bg-white text-foreground/70 hover:text-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Jobs & damage */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Jobs & damage
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Jobs" value={m.jobs} icon={Truck} tone="primary" />
          <StatCard
            label="Damage incidents"
            value={m.damageCount}
            icon={Wrench}
          />
          <StatCard
            label="Damage rate"
            value={formatPercent(m.damageRate)}
            icon={ShieldAlert}
          />
          <StatCard
            label="Damage cost"
            value={formatCurrency(m.damageCost)}
            icon={Receipt}
          />
        </div>
      </section>

      {/* Reviews & upsells */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reviews & upsells
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Avg rating"
            value={m.reviewCount ? m.avgStars.toFixed(1) : "—"}
            hint={`${m.reviewCount} review${m.reviewCount === 1 ? "" : "s"}`}
            icon={Star}
            tone="primary"
          />
          <StatCard
            label="5-star rate"
            value={m.reviewCount ? formatPercent(m.fiveStarRate) : "—"}
            icon={Trophy}
          />
          <StatCard
            label="Upsell revenue"
            value={formatCurrency(m.upsellTotal)}
            icon={DollarSign}
          />
          <StatCard
            label="Upsell per job"
            value={formatCurrency(Math.round(m.upsellAvg))}
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* On time */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          On time
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            label="On-time pickup"
            value={rate(m.onTimePickupRate)}
            icon={CalendarCheck}
          />
          <StatCard
            label="On-time delivery"
            value={rate(m.onTimeDeliveryRate)}
            icon={CheckCircle2}
          />
        </div>
      </section>

      <TrendChart data={trend} />

      <p className="text-center text-xs text-muted-foreground">
        Damage on partner-delivered jobs is not counted in your damage rate.
      </p>
    </div>
  );
}
