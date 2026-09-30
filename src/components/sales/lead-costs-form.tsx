"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveLeadCostsAction } from "@/app/(admin)/admin/actions";
import { formatCurrency } from "@/lib/format";
import { SOURCE_OPTIONS } from "@/lib/sales";
import { cn } from "@/lib/utils";
import type { LeadSource } from "@/types";

type Props = {
  month: string;
  monthLabel: string;
  costs: Partial<Record<LeadSource, number>>;
  previousCosts: Partial<Record<LeadSource, number>>;
  leadCounts: Record<string, number>;
};

function CostInput({
  value,
  onChange,
  changed,
}: {
  value: string;
  onChange: (v: string) => void;
  changed: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
        $
      </span>
      <input
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder="Not set"
        onChange={(e) =>
          onChange(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          )
        }
        className={cn(
          "h-12 w-full rounded-lg border bg-white pl-8 pr-3 text-right text-lg font-semibold tabular-nums outline-none transition placeholder:text-base placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/20",
          changed ? "border-amber-400 bg-amber-50/40" : "border-input",
        )}
      />
    </div>
  );
}

export function LeadCostsForm({
  month,
  monthLabel,
  costs,
  previousCosts,
  leadCounts,
}: Props) {
  const toStr = (v?: number) => (v !== undefined ? String(v) : "");
  const initial = Object.fromEntries(
    SOURCE_OPTIONS.map((s) => [s.value, toStr(costs[s.value])]),
  ) as Record<string, string>;

  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();

  const dirty = SOURCE_OPTIONS.some((s) => values[s.value] !== saved[s.value]);
  const hasPrevious = Object.keys(previousCosts).length > 0;
  const estimated = SOURCE_OPTIONS.reduce(
    (sum, s) =>
      sum + (Number(values[s.value]) || 0) * (leadCounts[s.value] ?? 0),
    0,
  );

  const copyPrevious = () =>
    setValues((v) =>
      Object.fromEntries(
        SOURCE_OPTIONS.map((s) => [
          s.value,
          previousCosts[s.value] !== undefined
            ? String(previousCosts[s.value])
            : v[s.value],
        ]),
      ),
    );

  const save = () =>
    startTransition(async () => {
      const res = await saveLeadCostsAction(
        month,
        SOURCE_OPTIONS.filter((s) => values[s.value] !== "").map((s) => ({
          source: s.value,
          cost: Number(values[s.value]),
        })),
      );
      if (res.error) toast.error(res.error);
      else {
        setSaved(values);
        toast.success(
          `Costs saved for ${monthLabel}. ${res.affected ?? 0} leads updated.`,
        );
      }
    });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {/* Card header */}
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold">Cost per lead</h2>
          <p className="text-sm text-muted-foreground">
            Applied to every lead from that source in {monthLabel}, except
            manual overrides.
          </p>
        </div>
        {hasPrevious && (
          <button
            type="button"
            onClick={copyPrevious}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold transition hover:border-foreground/30"
          >
            <Copy className="h-4 w-4" /> Copy last month
          </button>
        )}
      </div>

      {/* Column headings (desktop) */}
      <div className="hidden grid-cols-[minmax(0,1fr)_110px_130px_200px] gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <span>Source</span>
        <span className="text-right">Leads</span>
        <span className="text-right">Last month</span>
        <span className="text-right">Cost per lead</span>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {SOURCE_OPTIONS.map((s) => {
          const count = leadCounts[s.value] ?? 0;
          const prev = previousCosts[s.value];
          const changed = values[s.value] !== saved[s.value];
          return (
            <div
              key={s.value}
              className="grid gap-3 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_110px_130px_200px] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{s.label}</p>
                <p className="text-sm text-muted-foreground md:hidden">
                  {count} lead{count === 1 ? "" : "s"}
                  {prev !== undefined &&
                    ` · last month ${formatCurrency(prev)}`}
                </p>
              </div>
              <p className="hidden text-right tabular-nums md:block">{count}</p>
              <p className="hidden text-right tabular-nums text-muted-foreground md:block">
                {prev !== undefined ? formatCurrency(prev) : "—"}
              </p>
              <CostInput
                value={values[s.value]}
                changed={changed}
                onChange={(v) => setValues((x) => ({ ...x, [s.value]: v }))}
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estimated spend
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
