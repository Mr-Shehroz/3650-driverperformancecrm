import { RefreshCw } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLeadSources, getLeads } from "@/lib/data";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import {
  STATUS_OPTIONS,
  resolveSourceId,
  resolveStatus,
  sourceNameMap,
  sourceOptions,
} from "@/lib/sales";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { ParamPills } from "@/components/shared/param-pills";
import { LeadsTable } from "@/components/sales/leads-table";

export default async function MyLeadsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams & { source?: string; status?: string }>;
}) {
  const user = await requireRole("sales_rep");
  const sp = await searchParams;
  const { range, label } = resolveFilters(sp);
  const sources = await getLeadSources(true);
  const leads = await getLeads({
    repId: user.id,
    range,
    sourceId: resolveSourceId(sp.source, sources),
    status: resolveStatus(sp.status),
  });

  return (
    <div>
      <PageHeader
        title="My Leads"
        description={`${leads.length} lead${leads.length === 1 ? "" : "s"} · ${label}`}
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Leads are created automatically from Granot when they&apos;re assigned
          to you. These are sample leads until Granot is connected.
        </p>
      </div>

      <FilterBar showVerified={false} />
      <div className="-mt-2 mb-6 space-y-2">
        <ParamPills
          param="status"
          options={STATUS_OPTIONS}
          allLabel="All statuses"
          label="Status"
        />
        <ParamPills
          param="source"
          options={sourceOptions(sources)}
          allLabel="All sources"
          label="Source"
        />
      </div>

      <LeadsTable leads={leads} sourceNames={sourceNameMap(sources)} />
    </div>
  );
}
