import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getPreTrips, getTrucks } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PreTripCard } from "@/components/fleet/pre-trip-card";

export const metadata = { title: "Pre-trip" };

export default async function PreTripListPage() {
  const user = await requireRole("driver");
  const [list, trucks] = await Promise.all([
    getPreTrips({ driverId: user.id }),
    getTrucks(),
  ]);
  const units = Object.fromEntries(trucks.map((t) => [t.id, t.unitNumber]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-trip inspections"
        description="Check your truck before every trip."
      />

      <Link
        href="/driver/pre-trip/new"
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-secondary p-5 text-white shadow-lg transition active:scale-[0.99] sm:p-6"
      >
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5 bg-primary"
        />
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary">
          <ClipboardCheck className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold sm:text-2xl">
            Start pre-trip check
          </p>
          <p className="mt-0.5 text-sm text-white/60">
            Tires, fluids, lights, brakes, mirrors and equipment
          </p>
        </div>
        <ArrowRight className="ml-auto h-6 w-6 shrink-0 text-white/70 transition group-hover:translate-x-1" />
      </Link>

      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">
          Your recent checks
        </h2>
        {list.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => (
              <PreTripCard
                key={p.id}
                inspection={p}
                unitNumber={units[p.truckId] ?? "—"}
                href={`/driver/pre-trip/${p.id}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="No pre-trip checks yet"
            description="Your inspections will show here."
          />
        )}
      </section>
    </div>
  );
}
