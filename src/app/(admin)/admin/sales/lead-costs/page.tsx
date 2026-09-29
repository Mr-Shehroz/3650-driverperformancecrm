import Link from "next/link";
import { addMonths, format, parse, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { countLeadsBySource, getLeadCosts } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { LeadCostsForm } from "@/components/sales/lead-costs-form";
import type { LeadSource } from "@/types";

export default async function LeadCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole("admin");
  const raw = (await searchParams).month;
  const month =
    raw && /^\d{4}-\d{2}$/.test(raw) ? raw : format(new Date(), "yyyy-MM");
  const date = parse(month, "yyyy-MM", new Date());
  const prevMonth = format(subMonths(date, 1), "yyyy-MM");
  const nextMonth = format(addMonths(date, 1), "yyyy-MM");

  const [costs, previous, counts] = await Promise.all([
    getLeadCosts(month),
    getLeadCosts(prevMonth),
    countLeadsBySource(month),
  ]);

  const toMap = (list: typeof costs) =>
    Object.fromEntries(list.map((c) => [c.source, c.cost])) as Partial<
      Record<LeadSource, number>
    >;

  const navBtn =
    "flex h-11 w-11 items-center justify-center rounded-lg border bg-white text-foreground transition hover:border-foreground/30";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Lead Costs"
        description="Set how much each lead source costs per month."
      />

      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
        <Link
          href={`/admin/sales/lead-costs?month=${prevMonth}`}
          aria-label="Previous month"
          className={navBtn}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="font-heading text-xl font-bold">
          {format(date, "MMMM yyyy")}
        </p>
        <Link
          href={`/admin/sales/lead-costs?month=${nextMonth}`}
          aria-label="Next month"
          className={navBtn}
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {/* key resets the form when the month changes */}
      <LeadCostsForm
        key={month}
        month={month}
        costs={toMap(costs)}
        previousCosts={toMap(previous)}
        leadCounts={counts}
      />
    </div>
  );
}
