import { RefreshCw } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLeads } from "@/lib/data";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import {
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  resolveSource,
  resolveStatus,
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
  const leads = await getLeads({
    repId: user.id,
    range,
    source: resolveSource(sp.source),
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
          to you. Contact an admin if something looks wrong.
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
          options={SOURCE_OPTIONS}
          allLabel="All sources"
          label="Source"
        />
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}
