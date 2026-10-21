// File: src/components/fleet/overdue-list.tsx
// (NEW file)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { excuseOverdueWashAction } from "@/app/(admin)/admin/fleet-actions";
import type { WashOverdueEvent } from "@/types";

const fmt = (d: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));

/** Overdue washes on a truck, with a way for admin to excuse one */
export function OverdueList({
  events,
  names,
  points,
}: {
  events: WashOverdueEvent[];
  names: Record<string, string>;
  points: number;
}) {
  const router = useRouter();
  const [excuse, setExcuse] = useState<WashOverdueEvent | null>(null);

  if (!events.length) {
    return (
      <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> No overdue
        washes on this truck.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Wash was due {fmt(e.dueDate)}</p>
              <p className="text-sm text-muted-foreground">
                {e.driverId
                  ? `Counted against ${names[e.driverId] ?? "driver"} · ${points} pts`
                  : "No driver to charge"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExcuse(e)}
              className="flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold hover:border-foreground/30"
            >
              <X className="h-4 w-4" /> Excuse
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!excuse}
        onClose={() => setExcuse(null)}
        title="Excuse this overdue wash?"
        description="It will no longer count against the driver's score."
        confirmLabel="Excuse"
        onConfirm={async () => {
          if (!excuse) return;
          const res = await excuseOverdueWashAction(excuse.id);
          if (res?.error) {
            toast.error(res.error);
            return false;
          }
          toast.success("Overdue wash excused");
          router.refresh();
        }}
      />
    </>
  );
}
