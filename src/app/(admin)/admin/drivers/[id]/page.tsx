import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Mail,
  Phone,
  Receipt,
  ShieldAlert,
  Star,
  TrendingUp,
  Trophy,
  Truck,
  Wrench,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAllJobSummaries,
  getDriverMetrics,
  getDriverMonthlyTrend,
  getDriverScore,
  getRoadside,
  getScoring,
  getTrucks,
  getUserById,
  pointsFor,
} from "@/lib/data";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Pill } from "@/components/shared/pill";
import { FilterBar } from "@/components/admin/filter-bar";
import { JobsTable } from "@/components/admin/jobs-table";
import { TrendChart } from "@/components/driver/trend-chart";
import { ScoreCard } from "@/components/fleet/score-card";
import { RoadsideList } from "@/components/fleet/roadside-list";

const rate = (v: number | null) => (v === null ? "—" : formatPercent(v));

export default async function AdminDriverProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FilterParams>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const driver = await getUserById(id);
  if (!driver || driver.role !== "driver") notFound();

  const { range, verifiedOnly, label } = resolveFilters(await searchParams);

  const [m, trend, jobs, score, roadside, trucks, scoring] = await Promise.all([
    getDriverMetrics(id, { range, verifiedOnly }),
    getDriverMonthlyTrend(id, 6),
    getAllJobSummaries({ range, driverId: id }),
    getDriverScore(id, range),
    getRoadside({ driverId: id, range }),
    getTrucks(),
    getScoring(),
  ]);

  const units = Object.fromEntries(trucks.map((t) => [t.id, t.unitNumber]));

  return (
    <div>
      <Link
        href="/admin/drivers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All drivers
      </Link>

      {/* Profile header */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <UserAvatar name={driver.name} src={driver.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{driver.name}</h1>
            {driver.active ? (
              <Pill tone="success">Active</Pill>
            ) : (
              <Pill>Inactive</Pill>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-5">
            <a
              href={`mailto:${driver.email}`}
              className="flex min-w-0 items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="h-4 w-4 shrink-0" />{" "}
              <span className="truncate">{driver.email}</span>
            </a>
            {driver.phone && (
              <a
                href={`tel:${driver.phone}`}
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <Phone className="h-4 w-4" /> {driver.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <FilterBar />
      <p className="-mt-3 mb-5 text-sm text-muted-foreground">
        Showing {label}
        {verifiedOnly && " · Verified reviews & upsells only"}
      </p>

      <div className="space-y-6">
        {/* Score + breakdown */}
        <ScoreCard score={score} period={label} />

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Jobs completed"
            value={m.jobs}
            icon={Truck}
            tone="primary"
          />
          <StatCard
            label="Damage incidents"
            value={m.damageCount}
            hint={formatCurrency(m.damageCost)}
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
          <StatCard
            label="Reviews"
            value={m.reviewCount}
            hint={
              m.reviewCount ? `${m.avgStars.toFixed(1)} avg stars` : undefined
            }
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

        <TrendChart data={trend} />

        {/* Job log */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold sm:text-xl">Job log</h2>
            <p className="text-sm text-muted-foreground">{jobs.length} jobs</p>
          </div>
          <JobsTable jobs={jobs} driverNames={{}} showDriver={false} />
        </section>

        {/* Roadside inspections */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold sm:text-xl">
              Roadside inspections
            </h2>
            <p className="text-sm text-muted-foreground">
              {roadside.length} inspections
            </p>
          </div>
          <RoadsideList
            rows={roadside}
            units={units}
            pointsFor={(r) => pointsFor(r.result, scoring)}
          />
        </section>
      </div>
    </div>
  );
}
