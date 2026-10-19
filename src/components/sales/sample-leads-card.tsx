// File: src/components/sales/sample-leads-card.tsx
// (NEW file)

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  clearSampleLeadsAction,
  seedSampleLeadsAction,
} from "@/app/(admin)/admin/actions";

/** Lets admins add or remove sample leads while Granot isn't connected yet */
export function SampleLeadsCard({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const add = () =>
    startTransition(async () => {
      const res = await seedSampleLeadsAction();
      if (res.error) toast.error(res.error);
      else if (!res.count)
        toast.info("Every active sales rep already has sample leads.");
      else {
        toast.success(`${res.count} sample leads added`);
        router.refresh();
      }
    });

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <FlaskConical className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">
            {count ? `${count} sample leads in use` : "No sample leads"}
          </p>
          <p className="text-sm text-muted-foreground">
            Sample leads let you review closing ratio and CPA before Granot is
            connected. Remove them before going live.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="flex h-10 items-center gap-1.5 rounded-lg border bg-white px-3.5 text-sm font-semibold hover:border-foreground/30 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add for new reps
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            disabled={pending}
            className="flex h-10 items-center gap-1.5 rounded-lg border bg-white px-3.5 text-sm font-semibold text-red-700 hover:border-red-200 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Remove all
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Remove all sample leads?"
        description="Real leads from Granot are not affected."
        confirmLabel="Remove sample leads"
        onConfirm={async () => {
          const res = await clearSampleLeadsAction();
          if (res.error) {
            toast.error(res.error);
            return false;
          }
          toast.success(`${res.count ?? 0} sample leads removed`);
          router.refresh();
        }}
      />
    </div>
  );
}
