import Link from "next/link";
import { ArrowLeft, CornerDownRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getCostHistory } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { weekLabel } from "@/lib/weeks";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lead Cost History" };

export default async function LeadCostHistoryPage() {
  await requireRole("admin");
  const { weeks, sources, cells } = await getCostHistory(16);

  return (
    <div>
      <Link
        href="/admin/sales/lead-costs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Lead costs
      </Link>
      <PageHeader
        title="Lead Cost History"
        description="Weekly cost per lead for each source. Click a week to edit it."
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-foreground" /> Cost entered for
          that week
        </span>
        <span className="flex items-center gap-2">
          <CornerDownRight className="h-3.5 w-3.5 text-amber-600" /> Carried
          over from an earlier week
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-muted px-5 py-3 text-left">
                  Week
                </th>
                {sources.map((s) => (
                  <th
                    key={s.id}
                    className="whitespace-nowrap px-4 py-3 text-right"
                  >
                    {s.name}
                    {!s.active && (
                      <span className="ml-1 font-normal normal-case">
                        (inactive)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {weeks.map((week, i) => (
                <tr key={week} className="transition hover:bg-muted/30">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-5 py-3">
                    <Link
                      href={`/admin/sales/lead-costs?week=${week}`}
                      className="font-semibold hover:text-primary"
                    >
                      {weekLabel(week)}
                    </Link>
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        This week
                      </span>
                    )}
                  </td>
                  {sources.map((s) => {
                    const c = cells[week][s.id];
                    return (
                      <td
                        key={s.id}
                        className="whitespace-nowrap px-4 py-3 text-right"
                      >
                        {!c.set ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              c.carried ? "text-amber-700" : "font-semibold",
                            )}
                          >
                            {c.carried && (
                              <CornerDownRight className="h-3.5 w-3.5" />
                            )}
                            {formatCurrency(c.cost)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
