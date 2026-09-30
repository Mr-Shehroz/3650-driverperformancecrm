"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { setOnTimeAction } from "@/app/(driver)/driver/actions";
import { cn } from "@/lib/utils";

type Field = "pickup" | "delivery";

function Row({
  jobId,
  field,
  value,
}: {
  jobId: string;
  field: Field;
  value: boolean | null;
}) {
  const [pending, startTransition] = useTransition();
  const [clicked, setClicked] = useState<boolean | null>(null);
  const label = field === "pickup" ? "pickup" : "delivery";

  const set = (v: boolean) => {
    setClicked(v);
    startTransition(async () => {
      const res = await setOnTimeAction({ jobId, field, value: v });
      if (res?.error) toast.error(res.error);
      else
        toast.success(
          `${field === "pickup" ? "Pickup" : "Delivery"} marked ${v ? "on time" : "late"}`,
        );
      setClicked(null);
    });
  };

  if (value !== null) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
        <p className="font-semibold capitalize">{label}</p>
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            value ? "text-green-700" : "text-red-700",
          )}
        >
          {value ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {value ? "On time" : "Late"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Clock className="h-4 w-4 text-primary" /> Was the {label} on time?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            disabled={pending}
            onClick={() => set(v)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-lg border text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60",
              v
                ? "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
                : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
            )}
          >
            {pending && clicked === v ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : v ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {v ? "Yes, on time" : "No, late"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OnTimeCard({
  jobId,
  pickup,
  delivery,
}: {
  jobId: string;
  pickup: boolean | null;
  delivery: boolean | null;
}) {
  // Nothing left to record
  if (pickup !== null && delivery !== null) return null;

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold">On-time status</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Record once. Only an admin can change it after.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Row jobId={jobId} field="pickup" value={pickup} />
        <Row jobId={jobId} field="delivery" value={delivery} />
      </div>
    </section>
  );
}
