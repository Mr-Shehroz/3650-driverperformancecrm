import { Pill } from "@/components/shared/pill";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type Lead,
  type LeadStatus,
} from "@/types";
import { LeadCostCell } from "./lead-cost-cell";

const STATUS_TONE: Record<LeadStatus, "neutral" | "success" | "danger"> = {
  open: "neutral",
  booked: "success",
  lost: "danger",
};

export function LeadsTable({
  leads,
  repNames,
  showRep = false,
  editableCost = false,
}: {
  leads: Lead[];
  repNames?: Record<string, string>;
  showRep?: boolean;
  editableCost?: boolean;
}) {
  if (leads.length === 0) {
    return (
      <p className="rounded-2xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        No leads match these filters.
      </p>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {leads.map((l) => (
          <div key={l.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold leading-tight">
                  {l.granotId}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(l.date)}
                  {showRep && repNames && ` · ${repNames[l.repId] ?? "—"}`}
                </p>
              </div>
              <Pill tone={STATUS_TONE[l.status]}>
                {LEAD_STATUS_LABELS[l.status]}
              </Pill>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="font-semibold">{LEAD_SOURCE_LABELS[l.source]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Job value</p>
                <p className="font-semibold">
                  {l.jobValue ? formatCurrency(l.jobValue) : "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Lead cost</span>
              {editableCost ? (
                <LeadCostCell
                  id={l.id}
                  cost={l.leadCost}
                  overridden={l.costOverridden}
                />
              ) : (
                <span className="font-semibold">
                  {formatCurrency(l.leadCost)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Lead</th>
                <th className="px-3 py-3">Date</th>
                {showRep && <th className="px-3 py-3">Rep</th>}
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Booked</th>
                <th className="px-3 py-3 text-right">Job value</th>
                <th className="px-5 py-3 text-right">Lead cost</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {leads.map((l) => (
                <tr key={l.id} className="transition hover:bg-muted/30">
                  <td className="px-5 py-3 font-semibold">{l.granotId}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(l.date)}
                  </td>
                  {showRep && (
                    <td className="whitespace-nowrap px-3 py-3">
                      {repNames?.[l.repId] ?? "—"}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-3">
                    {LEAD_SOURCE_LABELS[l.source]}
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={STATUS_TONE[l.status]}>
                      {LEAD_STATUS_LABELS[l.status]}
                    </Pill>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {l.bookedDate ? formatDate(l.bookedDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                    {l.jobValue ? formatCurrency(l.jobValue) : "—"}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {editableCost ? (
                      <LeadCostCell
                        id={l.id}
                        cost={l.leadCost}
                        overridden={l.costOverridden}
                      />
                    ) : (
                      <span className="font-semibold">
                        {formatCurrency(l.leadCost)}
                      </span>
                    )}
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
