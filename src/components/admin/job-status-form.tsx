"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Segmented } from "@/components/driver/form-bits";
import { updateJobAction } from "@/app/(admin)/admin/actions";
import type { Job } from "@/types";

type Tri = "yes" | "no" | "unknown";
const toTri = (v: boolean | null): Tri =>
  v === null ? "unknown" : v ? "yes" : "no";
const toBool = (t: Tri) => (t === "unknown" ? null : t === "yes");

const TRI = [
  { value: "yes" as Tri, label: "On time" },
  { value: "no" as Tri, label: "Late" },
  { value: "unknown" as Tri, label: "Pending" },
];

export function JobStatusForm({ job }: { job: Job }) {
  const [pending, startTransition] = useTransition();
  const [deliveredBy, setDeliveredBy] = useState(job.deliveredBy);
  const [pickup, setPickup] = useState<Tri>(toTri(job.onTimePickup));
  const [delivery, setDelivery] = useState<Tri>(toTri(job.onTimeDelivery));
  const [saved, setSaved] = useState(false);

  const dirty =
    deliveredBy !== job.deliveredBy ||
    pickup !== toTri(job.onTimePickup) ||
    delivery !== toTri(job.onTimeDelivery);

  const save = () =>
    startTransition(async () => {
      const res = await updateJobAction({
        id: job.id,
        deliveredBy,
        onTimePickup: toBool(pickup),
        onTimeDelivery: toBool(delivery),
      });
      if (res?.error) alert(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Job status</h2>
        {saved && (
          <span className="text-sm font-semibold text-green-700">Saved</span>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Delivered by">
          <Segmented
            value={deliveredBy}
            onChange={(v) => setDeliveredBy(v)}
            options={[
              { value: "drs", label: "DRS crew" },
              { value: "partner", label: "Partner" },
            ]}
          />
        </Field>
        <Field label="Pickup">
          <Segmented value={pickup} onChange={setPickup} options={TRI} />
        </Field>
        <Field label="Delivery">
          <Segmented value={delivery} onChange={setDelivery} options={TRI} />
        </Field>
      </div>
      {dirty && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-11 px-6 font-semibold"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
