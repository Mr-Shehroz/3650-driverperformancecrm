import Link from "next/link";
import { parseISO } from "date-fns";
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
import {
  countLeadsBySource,
  getLeadCosts,
  getLeadSources,
  getLeads,
} from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { resolveWeek, shiftWeek, weekLabel } from "@/lib/weeks";
import { PageHeader } from "@/components/shared/page-header";
import { LeadCostsForm } from "@/components/sales/lead-costs-form";

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
  searchParams: Promise<{ week?: string }>;
}) {
  await requireRole("admin");
  const week = resolveWeek((await searchParams).week);
  const label = weekLabel(week);
  const prevWeek = shiftWeek(week, -1);
  const nextWeek = shiftWeek(week, 1);
  const weekEnd = shiftWeek(week, 1);

  const [sources, costs, previous, counts, leads] = await Promise.all([
    getLeadSources(false),
    getLeadCosts(week),
    getLeadCosts(prevWeek),
    countLeadsBySource(week),
    getLeads(),
  ]);

  const weekLeads = leads.filter(
    (l) => l.date >= week && parseISO(l.date) < parseISO(weekEnd),
  );
  const toMap = (list: typeof costs) =>
    Object.fromEntries(list.map((c) => [c.sourceId, c.cost])) as Record<
      string,
      number
    >;

  const actualSpend = weekLeads.reduce((s, l) => s + l.leadCost, 0);
  const overrides = weekLeads.filter((l) => l.costOverridden).length;
  const booked = weekLeads.filter((l) => l.status === "booked").length;

  const navBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white text-foreground transition hover:border-foreground/30";

  return (
    <div>
      <PageHeader
        title="Lead Costs"
        description="Set how much each lead source costs per week (Monday to Sunday)."
        actions={
          <div className="flex w-full items-center gap-2 rounded-xl border bg-white p-1.5 sm:w-auto">
            <Link
              href={`/admin/sales/lead-costs?week=${prevWeek}`}
              aria-label="Previous week"
              className={navBtn}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <p className="min-w-[190px] flex-1 text-center font-heading text-base font-bold sm:text-lg">
              {label}
            </p>
            <Link
              href={`/admin/sales/lead-costs?week=${nextWeek}`}
              aria-label="Next week"
              className={navBtn}
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LeadCostsForm
          key={week}
          week={week}
          weekLabel={label}
          sources={sources.map((s) => ({ id: s.id, name: s.name }))}
          costs={toMap(costs)}
          previousCosts={toMap(previous)}
          leadCounts={counts}
        />

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-bold">This week</h2>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 divide-y">
              <SummaryRow
                icon={Users}
                label="Leads"
                value={String(weekLeads.length)}
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

          <div className="rounded-2xl bg-secondary p-4 text-white sm:p-5">
            <p className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4 text-primary" /> How it works
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>
                Each lead gets its source&apos;s cost for the week it came in.
              </li>
              <li>
                Changing a cost updates all of that week&apos;s leads right
                away.
              </li>
              <li>Leads with a manual override keep their own cost.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
