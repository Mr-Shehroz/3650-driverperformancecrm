import { ShieldCheck, Trophy } from "lucide-react";
import type { DriverScore } from "@/types";
import { cn } from "@/lib/utils";

export function ScoreCard({
  score,
  period,
}: {
  score: DriverScore;
  period?: string;
}) {
  const diff = score.score - score.base;
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-white">
            <Trophy className="h-7 w-7 text-primary" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Driver score{period ? ` · ${period}` : ""}
            </p>
            <p className="font-heading text-4xl font-bold leading-none">
              {score.score}
            </p>
          </div>
        </div>
        <p
          className={cn(
            "text-sm font-semibold",
            diff >= 0 ? "text-green-700" : "text-red-700",
          )}
        >
          {diff >= 0 ? `+${diff}` : diff} from base score of {score.base}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left">Roadside inspections</th>
              <th className="px-3 py-3 text-right">Count</th>
              <th className="px-3 py-3 text-right">Points each</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {score.lines.map((l) => (
              <tr key={l.key}>
                <td className="px-5 py-3 font-medium">{l.label}</td>
                <td className="px-3 py-3 text-right">{l.count}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {l.points > 0 ? `+${l.points}` : l.points}
                </td>
                <td
                  className={cn(
                    "px-5 py-3 text-right font-semibold",
                    l.total > 0 && "text-green-700",
                    l.total < 0 && "text-red-700",
                  )}
                >
                  {l.total > 0 ? `+${l.total}` : l.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-green-600" /> Reporting truck
        problems in pre-trip checks never lowers the score.
      </p>
    </section>
  );
}
