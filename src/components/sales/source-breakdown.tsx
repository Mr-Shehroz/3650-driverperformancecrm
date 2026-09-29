import { formatCurrency, formatPercent } from "@/lib/format";
import { LEAD_SOURCE_LABELS, type SourceBreakdownRow } from "@/types";

export function SourceBreakdown({
  rows,
  title = "By lead source",
}: {
  rows: SourceBreakdownRow[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card">
      <div className="border-b px-4 py-3.5 sm:px-5">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No leads in this period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Source</th>
                <th className="px-3 py-3 text-right">Leads</th>
                <th className="px-3 py-3 text-right">Booked</th>
                <th className="px-3 py-3 text-right">Close %</th>
                <th className="px-3 py-3 text-right">Lead cost</th>
                <th className="px-3 py-3 text-right">CPA</th>
                <th className="px-5 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {rows.map((r) => (
                <tr key={r.source}>
                  <td className="whitespace-nowrap px-5 py-3 font-semibold">
                    {LEAD_SOURCE_LABELS[r.source]}
                  </td>
                  <td className="px-3 py-3 text-right">{r.leads}</td>
                  <td className="px-3 py-3 text-right">{r.booked}</td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatPercent(r.closingRatio)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {formatCurrency(r.totalLeadCost)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {r.booked ? formatCurrency(Math.round(r.cpa)) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                    {formatCurrency(r.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
