import { Info } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLeadSources, getLeads } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { LeadSourcesManager } from "@/components/sales/lead-sources-manager";

export const metadata = { title: "Lead Sources" };

export default async function LeadSourcesPage() {
  await requireRole("admin");
  const [sources, leads] = await Promise.all([
    getLeadSources(true),
    getLeads(),
  ]);

  const leadCounts: Record<string, number> = {};
  leads.forEach(
    (l) => (leadCounts[l.sourceId] = (leadCounts[l.sourceId] ?? 0) + 1),
  );

  return (
    <div>
      <PageHeader
        title="Lead Sources"
        description="Keep this list matched to the lead sources in Granot. Each source gets its own weekly cost."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LeadSourcesManager sources={sources} leadCounts={leadCounts} />

        <aside className="h-fit rounded-2xl bg-secondary p-5 text-white">
          <p className="flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4 text-primary" /> How sources work
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              Use the same name as in Granot so imported leads match
              automatically.
            </li>
            <li>
              Renaming a source updates it everywhere, including past leads.
            </li>
            <li>
              Deactivated sources keep their past leads but are hidden from
              filters and weekly costs.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
