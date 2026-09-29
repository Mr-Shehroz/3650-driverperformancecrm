import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Pill } from "@/components/shared/pill";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JobSummary } from "@/types";

export function JobsTable({
  jobs,
  driverNames,
  showDriver = true,
}: {
  jobs: JobSummary[];
  driverNames: Record<string, string>;
  showDriver?: boolean;
}) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-2xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        No jobs in this period.
      </p>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/admin/jobs/${j.id}`}
            className="block rounded-xl border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold leading-tight">
                  {j.jobNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(j.date)}
                  {showDriver && ` · ${driverNames[j.driverId] ?? "—"}`}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <span className="truncate">
                {j.originCity}, {j.originState}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">
                {j.destCity}, {j.destState}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {j.deliveredBy === "partner" && <Pill>Partner</Pill>}
              <Pill>{j.preDamageCount} pre-damage</Pill>
              {j.damageCount > 0 && (
                <Pill tone="danger">{j.damageCount} damage</Pill>
              )}
              {j.upsellTotal > 0 && (
                <Pill tone="success">{formatCurrency(j.upsellTotal)}</Pill>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Job</th>
                <th className="px-4 py-3">Date</th>
                {showDriver && <th className="px-4 py-3">Driver</th>}
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3 text-center">Pre-dmg</th>
                <th className="px-4 py-3 text-center">Damage</th>
                <th className="px-4 py-3 text-right">Upsells</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((j) => (
                <tr key={j.id} className="group transition hover:bg-muted/40">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/jobs/${j.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {j.jobNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                    {formatDate(j.date)}
                  </td>
                  {showDriver && (
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {driverNames[j.driverId] ?? "—"}
                    </td>
                  )}
                  <td className="max-w-[260px] px-4 py-3.5">
                    <span className="block truncate">
                      {j.originCity}, {j.originState} → {j.destCity},{" "}
                      {j.destState}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {j.deliveredBy === "partner" ? (
                      <Pill>Partner</Pill>
                    ) : (
                      <Pill tone="primary">DRS</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {j.preDamageCount}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {j.damageCount > 0 ? (
                      <span className="font-semibold text-red-600">
                        {j.damageCount}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold">
                    {j.upsellTotal > 0 ? formatCurrency(j.upsellTotal) : "—"}
                  </td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={`/admin/jobs/${j.id}`}
                      aria-label={`Open ${j.jobNumber}`}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
