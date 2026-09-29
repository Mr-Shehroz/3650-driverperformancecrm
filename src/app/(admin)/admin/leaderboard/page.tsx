import { ShieldCheck, Star, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAllDriverMetrics } from "@/lib/data";
import { lowestDamage, topReviews, topUpsells } from "@/lib/metrics";
import { resolveFilters, type FilterParams } from "@/lib/periods";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { RankList } from "@/components/admin/rank-list";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  await requireRole("admin");
  const { range, verifiedOnly, label } = resolveFilters(await searchParams);
  const rows = await getAllDriverMetrics({ range, verifiedOnly });

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description={`Top drivers · ${label}${verifiedOnly ? " · Verified only" : ""}`}
      />
      <FilterBar />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RankList
          title="Most reviews"
          icon={Star}
          rows={topReviews(rows, 10)}
        />
        <RankList
          title="Top upsells"
          icon={Trophy}
          rows={topUpsells(rows, 10, formatCurrency)}
        />
        <RankList
          title="Lowest damage rate"
          icon={ShieldCheck}
          rows={lowestDamage(rows, 10)}
          className="md:col-span-2 xl:col-span-1"
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Damage on partner-delivered jobs is excluded from damage rate.
      </p>
    </div>
  );
}
