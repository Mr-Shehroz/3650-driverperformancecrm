import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getDriverScore,
  getRoadside,
  getScoring,
  getTrucks,
  pointsFor,
} from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreCard } from "@/components/fleet/score-card";
import { RoadsideList } from "@/components/fleet/roadside-list";

export const metadata = { title: "Roadside inspections" };

export default async function DriverRoadsidePage() {
  const user = await requireRole("driver");
  const [rows, score, trucks, scoring] = await Promise.all([
    getRoadside({ driverId: user.id }),
    getDriverScore(user.id),
    getTrucks(),
    getScoring(),
  ]);
  const units = Object.fromEntries(trucks.map((t) => [t.id, t.unitNumber]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roadside inspections"
        description="DOT inspections and how they affect your score."
        actions={
          <Link
            href="/driver/roadside/new"
            className="flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Log inspection
          </Link>
        }
      />
      <ScoreCard score={score} period="All time" />
      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">History</h2>
        <RoadsideList
          rows={rows}
          units={units}
          pointsFor={(r) => pointsFor(r.result, scoring)}
        />
      </section>
    </div>
  );
}
