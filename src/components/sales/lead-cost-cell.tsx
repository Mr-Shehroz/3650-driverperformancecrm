"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { overrideLeadCostAction } from "@/app/(admin)/admin/actions";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export function LeadCostCell({
  id,
  cost,
  overridden,
}: {
  id: string;
  cost: number;
  overridden: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(cost));
  const [pending, startTransition] = useTransition();

  const run = (next: number | null) =>
    startTransition(async () => {
      const res = await overrideLeadCostAction(id, next);
      if (res?.error) toast.error(res.error);
      else {
        setEditing(false);
        toast.success(
          next === null
            ? "Lead cost reset to source cost"
            : "Lead cost updated",
        );
      }
    });

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") run(Number(value));
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-9 w-24 rounded-md border border-input bg-white pl-5 pr-2 text-right text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => run(Number(value))}
          disabled={pending || value === ""}
          aria-label="Save"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => setEditing(false)}
          aria-label="Cancel"
          className="flex h-9 w-9 items-center justify-center rounded-md border bg-white text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="font-semibold">{formatCurrency(cost)}</span>
      {overridden && (
        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
          Override
        </span>
      )}
      <button
        onClick={() => {
          setValue(String(cost));
          setEditing(true);
        }}
        aria-label="Override lead cost"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {overridden && (
        <button
          onClick={() => run(null)}
          disabled={pending}
          aria-label="Reset to source cost"
          title="Reset to source cost"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
