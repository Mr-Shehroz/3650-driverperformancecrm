"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/driver/form-bits";
import { saveLeadCostsAction } from "@/app/(admin)/admin/actions";
import { SOURCE_OPTIONS } from "@/lib/sales";
import type { LeadSource } from "@/types";

export function LeadCostsForm({
  month,
  costs,
  previousCosts,
  leadCounts,
}: {
  month: string;
  costs: Partial<Record<LeadSource, number>>;
  previousCosts: Partial<Record<LeadSource, number>>;
  leadCounts: Record<string, number>;
}) {
  const initial = Object.fromEntries(
    SOURCE_OPTIONS.map((s) => [
      s.value,
      costs[s.value] !== undefined ? String(costs[s.value]) : "",
    ]),
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  const dirty = SOURCE_OPTIONS.some(
    (s) => values[s.value] !== initial[s.value],
  );
  const hasPrevious = Object.keys(previousCosts).length > 0;

  const copyPrevious = () =>
    setValues(
      Object.fromEntries(
        SOURCE_OPTIONS.map((s) => [
          s.value,
          previousCosts[s.value] !== undefined
            ? String(previousCosts[s.value])
            : values[s.value],
        ]),
      ),
    );

  const save = () =>
    startTransition(async () => {
      setMessage(undefined);
      const res = await saveLeadCostsAction(
        month,
        SOURCE_OPTIONS.filter((s) => values[s.value] !== "").map((s) => ({
          source: s.value,
          cost: Number(values[s.value]),
        })),
      );
      if (res && "error" in res && res.error) setMessage(res.error);
      else
        setMessage(
          `Saved. ${res && "affected" in res ? res.affected : 0} leads updated.`,
        );
    });

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-bold">Cost per lead</h2>
          <p className="text-sm text-muted-foreground">
            Applied to every lead from that source this month, except manual
            overrides.
          </p>
        </div>
        {hasPrevious && (
          <button
            type="button"
            onClick={copyPrevious}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold hover:border-foreground/30"
          >
            <Copy className="h-4 w-4" /> Copy last month
          </button>
        )}
      </div>

      <div className="divide-y">
        {SOURCE_OPTIONS.map((s) => (
          <div
            key={s.value}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div>
              <p className="font-semibold">{s.label}</p>
              <p className="text-sm text-muted-foreground">
                {leadCounts[s.value] ?? 0} lead
                {(leadCounts[s.value] ?? 0) === 1 ? "" : "s"} this month
                {previousCosts[s.value] !== undefined &&
                  ` · last month $${previousCosts[s.value]}`}
              </p>
            </div>
            <div className="w-full sm:w-44">
              <MoneyInput
                value={values[s.value]}
                onChange={(v) => setValues((x) => ({ ...x, [s.value]: v }))}
                placeholder="Not set"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
        <Button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="h-12 px-8 font-semibold"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Save costs"
          )}
        </Button>
      </div>
    </div>
  );
}
