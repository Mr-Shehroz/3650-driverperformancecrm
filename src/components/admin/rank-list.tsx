import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { RankRow } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const RANK_STYLE = [
  "bg-primary text-white",
  "bg-secondary text-white",
  "bg-foreground/15 text-foreground",
];

export function RankList({
  title,
  icon: Icon,
  rows,
  emptyText = "No data for this period.",
  className,
}: {
  title: string;
  icon: LucideIcon;
  rows: RankRow[];
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card", className)}>
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5 sm:px-5">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ol className="divide-y">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/admin/drivers/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50 sm:px-5"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    RANK_STYLE[i] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {r.name}
                </span>
                <span className="text-right">
                  <span className="block font-heading text-lg font-bold leading-tight">
                    {r.value}
                  </span>
                  {r.sub && (
                    <span className="block text-xs text-muted-foreground">
                      {r.sub}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
