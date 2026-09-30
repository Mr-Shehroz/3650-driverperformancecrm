import Link from "next/link";
import { addMonths, endOfMonth, format, parse, subMonths } from "date-fns";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Info,
  Pencil,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { countLeadsBySource, getLeadCosts, getLeads } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { LeadCostsForm } from "@/components/sales/lead-costs-form";
import type { LeadSource } from "@/types";

export const metadata = { title: "Lead Costs" };

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-foreground/70" />
      </span>
      <p className="flex-1 text-sm text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

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
  const monthLabel = format(date, "MMMM yyyy");
  const prevMonth = format(subMonths(date, 1), "yyyy-MM");
  const nextMonth = format(addMonths(date, 1), "yyyy-MM");

  const [costs, previous, counts, leads] = await Promise.all([
    getLeadCosts(month),
    getLeadCosts(prevMonth),
    countLeadsBySource(month),
    getLeads({
      range: {
        from: `${month}-01`,
        to: format(endOfMonth(date), "yyyy-MM-dd"),
      },
    }),
  ]);

  const toMap = (list: typeof costs) =>
    Object.fromEntries(list.map((c) => [c.source, c.cost])) as Partial<
      Record<LeadSource, number>
    >;

  const actualSpend = leads.reduce((s, l) => s + l.leadCost, 0);
  const overrides = leads.filter((l) => l.costOverridden).length;
  const booked = leads.filter((l) => l.status === "booked").length;

  const navBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white text-foreground transition hover:border-foreground/30";

  return (
    <div>
      <PageHeader
        title="Lead Costs"
        description="Set how much each lead source costs per month."
        actions={
          <div className="flex w-full items-center gap-2 rounded-xl border bg-white p-1.5 sm:w-auto">
            <Link
              href={`/admin/sales/lead-costs?month=${prevMonth}`}
              aria-label="Previous month"
              className={navBtn}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <p className="min-w-[160px] flex-1 text-center font-heading text-lg font-bold">
              {monthLabel}
            </p>
            <Link
              href={`/admin/sales/lead-costs?month=${nextMonth}`}
              aria-label="Next month"
              className={navBtn}
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LeadCostsForm
          key={month}
          month={month}
          monthLabel={monthLabel}
          costs={toMap(costs)}
          previousCosts={toMap(previous)}
          leadCounts={counts}
        />

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-bold">{monthLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Based on saved costs and overrides
            </p>
            <div className="mt-2 divide-y">
              <SummaryRow
                icon={Users}
                label="Leads"
                value={String(leads.length)}
              />
              <SummaryRow
                icon={CalendarCheck}
                label="Booked"
                value={String(booked)}
              />
              <SummaryRow
                icon={DollarSign}
                label="Actual lead spend"
                value={formatCurrency(actualSpend)}
              />
              <SummaryRow
                icon={Pencil}
                label="Manual overrides"
                value={String(overrides)}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-secondary p-4 text-white sm:p-5">
            <p className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4 text-primary" /> How it works
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>
                Each lead gets its source&apos;s cost for the month it came in.
              </li>
              <li>
                Changing a cost updates all of that month&apos;s leads right
                away.
              </li>
              <li>
                Leads with a manual override keep their own cost. Reset them
                from the rep&apos;s lead list.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
