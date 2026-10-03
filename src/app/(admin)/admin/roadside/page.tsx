import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getRoadside,
  getScoring,
  getTrucks,
  getUsers,
  pointsFor,
} from "@/lib/data";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { RoadsideList } from "@/components/fleet/roadside-list";

export const metadata = { title: "Roadside inspections" };

export default async function AdminRoadsidePage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  await requireRole("admin");
  const { range, label } = resolveFilters(await searchParams);
  const [rows, trucks, users, scoring] = await Promise.all([
    getRoadside({ range }),
    getTrucks(),
    getUsers(),
    getScoring(),
  ]);

  return (
    <div>
      <PageHeader
        title="Roadside inspections"
        description={`${rows.length} inspection${rows.length === 1 ? "" : "s"} · ${label}`}
        actions={
          <Link
            href="/admin/roadside/new"
            className="flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Log inspection
          </Link>
        }
      />
      <FilterBar showVerified={false} />
      <RoadsideList
        rows={rows}
        units={Object.fromEntries(trucks.map((t) => [t.id, t.unitNumber]))}
        driverNames={Object.fromEntries(users.map((u) => [u.id, u.name]))}
        pointsFor={(r) => pointsFor(r.result, scoring)}
      />
    </div>
  );
}
