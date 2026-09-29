import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLeads } from "@/lib/data";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import { SOURCE_OPTIONS, resolveSource } from "@/lib/sales";
import { LEAD_SOURCE_LABELS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { ParamPills } from "@/components/shared/param-pills";
import { RepPerformance } from "@/components/sales/rep-performance";
import { LeadsTable } from "@/components/sales/leads-table";

export default async function SalesDashboard({
  searchParams,
}: {
  searchParams: Promise<FilterParams & { source?: string }>;
}) {
  const user = await requireRole("sales_rep");
  const sp = await searchParams;
  const { range, label } = resolveFilters(sp);
  const source = resolveSource(sp.source);
  const recent = (await getLeads({ repId: user.id, range, source })).slice(
    0,
    5,
  );

  return (
    <div>
      <PageHeader
        title="My Performance"
        description={`${label}${source ? ` · ${LEAD_SOURCE_LABELS[source]}` : ""}`}
      />
      <FilterBar showVerified={false} />
      <ParamPills
        param="source"
        options={SOURCE_OPTIONS}
        allLabel="All sources"
        label="Source"
        className="-mt-2 mb-6"
      />

      <RepPerformance repId={user.id} range={range} source={source} />

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold sm:text-xl">Recent leads</h2>
          <Link
            href="/sales/leads"
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            All leads <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <LeadsTable leads={recent} />
      </section>
    </div>
  );
}
