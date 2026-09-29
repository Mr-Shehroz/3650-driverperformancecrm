import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { getAllDriverMetrics } from "@/lib/data";
import { resolveFilters } from "@/lib/periods";
import { toCsv } from "@/lib/csv";

const r2 = (n: number) => Math.round(n * 100) / 100;
const p = (n: number | null) => (n === null ? "" : r2(n * 100));

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return new NextResponse("Unauthorized", { status: 401 });

  const { range, verifiedOnly } = resolveFilters(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  const rows = await getAllDriverMetrics({ range, verifiedOnly });

  const csv = toCsv(
    [
      "Driver",
      "Jobs",
      "Damage incidents",
      "Damage rate %",
      "Damage cost",
      "Reviews",
      "Avg stars",
      "5-star rate %",
      "Upsell revenue",
      "Upsell per job",
      "On-time pickup %",
      "On-time delivery %",
    ],
    rows.map((r) => [
      r.driverName,
      r.jobs,
      r.damageCount,
      p(r.damageRate),
      r2(r.damageCost),
      r.reviewCount,
      r2(r.avgStars),
      p(r.fiveStarRate),
      r2(r.upsellTotal),
      r2(r.upsellAvg),
      p(r.onTimePickupRate),
      p(r.onTimeDeliveryRate),
    ]),
  );

  const period = range
    ? `${range.from ?? "start"}_to_${range.to ?? "today"}`
    : "all-time";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drs-drivers-${period}-${format(new Date(), "yyyyMMdd")}.csv"`,
    },
  });
}
