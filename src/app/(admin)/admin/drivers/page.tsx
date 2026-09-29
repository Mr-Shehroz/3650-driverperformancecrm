import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAllDriverMetrics, getDrivers } from "@/lib/data";
import {
  filtersToQuery,
  resolveFilters,
  type FilterParams,
} from "@/lib/periods";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { DriversTable, type DriverRow } from "@/components/admin/drivers-table";

export default async function AdminDriversPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const { range, verifiedOnly, label } = resolveFilters(sp);

  const [metrics, drivers] = await Promise.all([
    getAllDriverMetrics({ range, verifiedOnly }),
    getDrivers(true),
  ]);
  const activeById = Object.fromEntries(drivers.map((d) => [d.id, d.active]));
  const rows: DriverRow[] = metrics.map((m) => ({
    ...m,
    active: activeById[m.driverId] ?? false,
  }));

  return (
    <div>
      <PageHeader
        title="Drivers"
        description={`${rows.length} drivers · ${label}${verifiedOnly ? " · Verified only" : ""}`}
        actions={
          <a
            href={`/admin/drivers/export?${filtersToQuery(sp)}`}
            className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold transition hover:border-foreground/30"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <FilterBar />
      <DriversTable rows={rows} />
    </div>
  );
}
