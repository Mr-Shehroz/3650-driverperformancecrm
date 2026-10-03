"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CornerDownRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveLeadCostsAction } from "@/app/(admin)/admin/actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Effective = Record<
  string,
  { cost: number; fromWeek: string | null; carried: boolean }
>;

type Props = {
  week: string;
  weekLabel: string;
  sources: { id: string; name: string }[];
  /** Costs entered for this exact week */
  costs: Record<string, number>;
  /** Cost in effect this week (own or carried over) */
  effective: Effective;
  previousCosts: Effective;
  leadCounts: Record<string, number>;
};

export function LeadCostsForm({
  week,
  weekLabel,
  sources,
  costs,
  effective,
  previousCosts,
  leadCounts,
}: Props) {
  const router = useRouter();
  const toStr = (v?: number) => (v !== undefined ? String(v) : "");
  const initial = Object.fromEntries(
    sources.map((s) => [s.id, toStr(costs[s.id])]),
  ) as Record<string, string>;

  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();

  const dirty = sources.some((s) => values[s.id] !== saved[s.id]);
  const costInUse = (id: string) =>
    values[id] !== "" ? Number(values[id]) || 0 : (effective[id]?.cost ?? 0);
  const estimated = sources.reduce(
    (sum, s) => sum + costInUse(s.id) * (leadCounts[s.id] ?? 0),
    0,
  );

  const copyPrevious = () =>
    setValues(
      Object.fromEntries(
        sources.map((s) => [s.id, String(previousCosts[s.id]?.cost ?? 0)]),
      ),
    );

  const save = () =>
    startTransition(async () => {
      const changed = sources.filter((s) => values[s.id] !== saved[s.id]);
      const res = await saveLeadCostsAction(
        week,
        changed.map((s) => ({
          sourceId: s.id,
          cost: values[s.id] === "" ? null : Number(values[s.id]),
        })),
      );
      if (res.error) toast.error(res.error);
      else {
        setSaved(values);
        toast.success(
          `Costs saved for ${weekLabel}. ${res.affected ?? 0} leads updated.`,
        );
        router.refresh();
      }
    });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold">Cost per lead</h2>
          <p className="text-sm text-muted-foreground">
            Leave a source empty to keep using last week&apos;s cost.
          </p>
        </div>
        <button
          type="button"
          onClick={copyPrevious}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold transition hover:border-foreground/30"
        >
          <Copy className="h-4 w-4" /> Copy last week
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No active lead sources. Add one on the Lead Sources page.
        </p>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1fr)_90px_120px_200px] gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Source</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Last week</span>
            <span className="text-right">This week</span>
          </div>

          <div className="divide-y">
            {sources.map((s) => {
              const count = leadCounts[s.id] ?? 0;
              const prev = previousCosts[s.id];
              const eff = effective[s.id];
              const empty = values[s.id] === "";
              const changed = values[s.id] !== saved[s.id];
              return (
                <div
                  key={s.id}
                  className="grid gap-3 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_90px_120px_200px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    {empty && eff?.fromWeek ? (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-amber-700">
                        <CornerDownRight className="h-3.5 w-3.5" />
                        Using {formatCurrency(eff.cost)} from week of{" "}
                        {format(parseISO(eff.fromWeek), "MMM d")}
                      </p>
                    ) : empty ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        No cost set yet
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground md:hidden">
                      {count} lead{count === 1 ? "" : "s"}
                      {prev && ` · last week ${formatCurrency(prev.cost)}`}
                    </p>
                  </div>
                  <p className="hidden text-right tabular-nums md:block">
                    {count}
                  </p>
                  <p className="hidden text-right tabular-nums text-muted-foreground md:block">
                    {prev?.fromWeek ? formatCurrency(prev.cost) : "—"}
                  </p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                      $
                    </span>
                    <input
                      inputMode="decimal"
                      autoComplete="off"
                      value={values[s.id]}
                      placeholder={
                        eff?.fromWeek ? `${eff.cost} (carried)` : "Not set"
                      }
                      onChange={(e) =>
                        setValues((x) => ({
                          ...x,
                          [s.id]: e.target.value
                            .replace(/[^0-9.]/g, "")
                            .replace(/(\..*)\./g, "$1"),
                        }))
                      }
                      className={cn(
                        "h-12 w-full rounded-lg border bg-white pl-8 pr-3 text-right text-lg font-semibold tabular-nums outline-none transition placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20",
                        changed
                          ? "border-amber-400 bg-amber-50/40"
                          : "border-input",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estimated spend this week
          </p>
          <p className="font-heading text-2xl font-bold">
            {formatCurrency(estimated)}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {dirty && (
            <button
              type="button"
              onClick={() => setValues(saved)}
              className="h-11 rounded-lg px-5 font-semibold text-muted-foreground hover:bg-muted"
            >
              Discard
            </button>
          )}
          <Button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="h-11 px-8 font-semibold"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Save costs"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
