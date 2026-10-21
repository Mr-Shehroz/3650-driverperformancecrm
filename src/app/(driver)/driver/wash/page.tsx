// File: src/app/(driver)/driver/wash/page.tsx
// (NEW file)

import Link from "next/link";
import { ArrowRight, CheckCircle2, Droplets } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  flagOverdueWashes,
  getScoring,
  getTrucks,
  getWashes,
  washStatusOf,
} from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import {
  lastWashText,
  WashList,
  WashStatusPill,
} from "@/components/fleet/wash-bits";

export const metadata = { title: "Truck wash" };

export default async function DriverWashPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireRole("driver");
  const { saved } = await searchParams;
  await flagOverdueWashes();
  const [trucks, washes, scoring] = await Promise.all([
    getTrucks(false),
    getWashes({ driverId: user.id }),
    getScoring(),
  ]);
  const units = Object.fromEntries(trucks.map((t) => [t.id, t.unitNumber]));
  // Trucks assigned to this driver first; if none, show every active truck
  const mine = trucks.filter((t) => t.assignedDriverId === user.id);
  const shown = mine.length ? mine : trucks;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Truck wash"
        description={`Wash your truck at least every ${scoring.washIntervalDays} days and log it here.`}
      />

      {saved && (
        <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> Wash saved. The
          truck&apos;s wash timer has been reset.
        </p>
      )}

      <Link
        href="/driver/wash/new"
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-secondary p-5 text-white shadow-lg transition active:scale-[0.99] sm:p-6"
      >
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5 bg-primary"
        />
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary">
          <Droplets className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold sm:text-2xl">
            Mark truck washed
          </p>
          <p className="mt-0.5 text-sm text-white/60">
            Photo of the clean truck, receipt optional
          </p>
        </div>
        <ArrowRight className="ml-auto h-6 w-6 shrink-0 text-white/70 transition group-hover:translate-x-1" />
      </Link>

      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">
          {mine.length ? "Your trucks" : "Trucks"}
        </h2>
        {shown.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((t) => {
              const st = washStatusOf(t, scoring);
              return (
                <div
                  key={t.id}
                  className="rounded-xl border bg-card p-4 sm:p-5"
                >
                  <p className="font-heading text-lg font-bold leading-tight">
                    Unit {t.unitNumber}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {lastWashText(st)}
                  </p>
                  <WashStatusPill status={st} className="mt-3" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No active trucks yet. Ask your admin to add your truck.
          </p>
        )}
        {mine.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            An overdue wash on a truck assigned to you lowers your driver score.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">Your washes</h2>
        <WashList
          washes={washes}
          units={units}
          emptyText="Your washes will show here."
        />
      </section>
    </div>
  );
}
