import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLeadSources, getLeads } from "@/lib/data";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import { resolveSourceId, sourceNameMap, sourceOptions } from "@/lib/sales";
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
  const sources = await getLeadSources(true);
  const sourceId = resolveSourceId(sp.source, sources);
  const names = sourceNameMap(sources);
  const recent = (await getLeads({ repId: user.id, range, sourceId })).slice(
    0,
    5,
  );

  return (
    <div>
      <PageHeader
        title="My Performance"
        description={`${label}${sourceId ? ` · ${names[sourceId]}` : ""}`}
      />
      <FilterBar showVerified={false} />
      <ParamPills
        param="source"
        options={sourceOptions(sources)}
        allLabel="All sources"
        label="Source"
        className="-mt-2 mb-6"
      />

      <RepPerformance repId={user.id} range={range} sourceId={sourceId} />

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
        <LeadsTable leads={recent} sourceNames={names} />
      </section>
    </div>
  );
}
