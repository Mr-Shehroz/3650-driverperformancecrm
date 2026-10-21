// File: src/components/fleet/wash-form.tsx
// (NEW file)

"use client";

import { useState, useTransition } from "react";
import { Check, Droplets, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FormError,
  FormSection,
  TEXTAREA_CLASS,
} from "@/components/driver/form-bits";
import { FormActions } from "@/components/driver/form-actions";
import { useGeolocation } from "@/hooks/use-geolocation";
import { createWashAction } from "@/app/(driver)/driver/fleet-actions";
import { washSchema } from "@/lib/validation/fleet";
import { openOfflinePath, submitOrQueue } from "@/lib/offline/submit";
import { cn } from "@/lib/utils";
import { PhotoSlot } from "./photo-slot";

type TruckOption = { id: string; unitNumber: string; description?: string };

export function WashForm({ trucks }: { trucks: TruckOption[] }) {
  const geo = useGeolocation();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [truckId, setTruckId] = useState(
    trucks.length === 1 ? trucks[0].id : "",
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const clear = (k: string) =>
    errors[k] && setErrors((e) => ({ ...e, [k]: "" }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    const payload = {
      truckId,
      photo: photo ?? undefined,
      receipt: receipt ?? undefined,
      notes: notes.trim() || undefined,
      capturedAtDevice: new Date().toISOString(),
      lat: geo.lat,
      lng: geo.lng,
    };
    const unit = trucks.find((t) => t.id === truckId)?.unitNumber;

    startTransition(async () => {
      const res = await submitOrQueue({
        type: "wash",
        schema: washSchema,
        payload,
        jobRef: "wash",
        label: `Truck wash${unit ? ` · Unit ${unit}` : ""}`,
        errorKeys: "path",
        online: (data) => createWashAction(data),
        afterQueue: () => {
          toast.success(
            "Wash saved on this phone. It will upload when you're back online.",
          );
          openOfflinePath("/driver");
        },
      });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError("Please fix the highlighted parts.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (res?.error) setFormError(res.error);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <FormSection title="Truck" description="Which truck did you wash?">
        <Field label="Unit number" error={errors.truckId}>
          {trucks.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-white px-4 py-6 text-center text-sm text-muted-foreground">
              No active trucks yet. Ask your admin to add your truck.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {trucks.map((t) => {
                const active = truckId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTruckId(t.id);
                      clear("truckId");
                    }}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border-2 bg-white p-4 text-left transition",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-transparent ring-1 ring-border hover:ring-foreground/30",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-xl font-bold">
                        Unit {t.unitNumber}
                      </p>
                      {t.description && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border",
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      </FormSection>

      <FormSection
        title="Photos"
        description="A clear photo of the clean truck. Add the receipt if you have one."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <PhotoSlot
              label="Clean truck"
              value={photo}
              large
              invalid={!!errors.photo}
              onChange={(p) => {
                setPhoto(p);
                clear("photo");
              }}
            />
            {errors.photo && (
              <p className="mt-1.5 text-sm font-medium text-destructive">
                {errors.photo}
              </p>
            )}
          </div>
          <PhotoSlot
            label="Receipt"
            value={receipt}
            optional
            large
            onChange={setReceipt}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Anything to add" htmlFor="wash-notes" optional>
          <textarea
            id="wash-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Washed at the yard"
            className={TEXTAREA_CLASS}
          />
        </Field>
      </FormSection>

      <div className="flex items-start gap-3 rounded-xl bg-secondary px-4 py-3 text-sm text-white">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          The wash is saved with today&apos;s date and your name, and can&apos;t
          be edited. It resets the truck&apos;s wash timer.
        </p>
      </div>

      <FormActions cancelHref="/driver/wash" pending={pending}>
        <Droplets className="h-5 w-5" /> Mark truck washed
      </FormActions>
    </form>
  );
}
