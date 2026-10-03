import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { getAllRepMetrics, getLeadSources } from "@/lib/data";
import { resolveFilters } from "@/lib/periods";
import { resolveSourceId, sourceNameMap } from "@/lib/sales";
import { toCsv } from "@/lib/csv";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return new NextResponse("Unauthorized", { status: 401 });

  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { range } = resolveFilters(sp);
  const sources = await getLeadSources(true);
  const sourceId = resolveSourceId(sp.source, sources);
  const rows = await getAllRepMetrics({ range, sourceId });

  const csv = toCsv(
    [
      "Rep",
      "Leads",
      "Booked",
      "Closing ratio %",
      "Total lead cost",
      "CPA",
      "Revenue booked",
    ],
    rows.map((r) => [
      r.repName,
      r.leads,
      r.booked,
      r2(r.closingRatio * 100),
      r2(r.totalLeadCost),
      r.booked ? r2(r.cpa) : "",
      r2(r.revenue),
    ]),
  );

  const period = range
    ? `${range.from ?? "start"}_to_${range.to ?? "today"}`
    : "all-time";
  const sourceSlug = sourceId
    ? `-${sourceNameMap(sources)
        [sourceId].toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`
    : "";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drs-sales-${period}${sourceSlug}-${format(new Date(), "yyyyMMdd")}.csv"`,
    },
  });
}
