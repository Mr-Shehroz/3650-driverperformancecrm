"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Field,
  FormError,
  FormSection,
  MoneyInput,
  Segmented,
  TEXTAREA_CLASS,
} from "./form-bits";
import { PhotoPicker } from "./photo-picker";
import { FormActions } from "./form-actions";
import { createDamageAction } from "@/app/(driver)/driver/actions";
import { damageSchema } from "@/lib/validation/driver";
import { toast } from "sonner";
import { openOfflinePath, submitOrQueue } from "@/lib/offline/submit";

type YesNo = "yes" | "no" | "";

export function DamageForm({
  jobId,
  partnerDelivery,
}: {
  jobId: string;
  partnerDelivery: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [item, setItem] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [claim, setClaim] = useState<YesNo>("");
  const [cost, setCost] = useState("");

  const clear = (k: string) =>
    errors[k] && setErrors((e) => ({ ...e, [k]: "" }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const payload = {
      jobId,
      item,
      description,
      photos,
      claimFiled: claim === "" ? undefined : claim === "yes",
      estimatedCost: cost === "" ? undefined : Number(cost),
    };

    startTransition(async () => {
      const res = await submitOrQueue({
        type: "damage",
        schema: damageSchema,
        payload,
        jobRef: jobId,
        label: `Damage: ${item || "item"}`,
        online: (data) => createDamageAction(data),
        afterQueue: () => {
          toast.success(
            "Saved on this phone. It will upload when you're back online.",
          );
          openOfflinePath(`/driver/jobs/${jobId}`);
        },
      });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError("Please fix the highlighted fields.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (res?.error) setFormError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {partnerDelivery && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This job was delivered by a partner. Damage is recorded but
            won&apos;t count against your damage rate.
          </p>
        </div>
      )}

      <FormError message={formError} />

      <FormSection title="What was damaged">
        <Field label="Item" htmlFor="item" error={errors.item}>
          <Input
            id="item"
            value={item}
            onChange={(e) => {
              setItem(e.target.value);
              clear("item");
            }}
            placeholder="e.g. Glass mirror"
            aria-invalid={!!errors.item}
            className="h-12 bg-white text-base"
          />
        </Field>
        <Field
          label="What happened"
          htmlFor="description"
          error={errors.description}
        >
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clear("description");
            }}
            placeholder="e.g. Cracked corner found at delivery"
            aria-invalid={!!errors.description}
            className={TEXTAREA_CLASS}
          />
        </Field>
      </FormSection>

      <FormSection title="Photos" description="At least 1 photo, up to 5.">
        <Field label="Damage photos" error={errors.photos}>
          <PhotoPicker
            value={photos}
            onChange={(p) => {
              setPhotos(p);
              clear("photos");
            }}
            invalid={!!errors.photos}
          />
        </Field>
      </FormSection>

      <FormSection title="Claim & cost">
        <Field label="Customer claim filed?" error={errors.claimFiled}>
          <Segmented
            ariaLabel="Customer claim filed"
            value={claim}
            onChange={(v) => {
              setClaim(v);
              clear("claimFiled");
            }}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>
        <Field
          label="Estimated cost"
          htmlFor="cost"
          error={errors.estimatedCost}
        >
          <MoneyInput
            id="cost"
            value={cost}
            onChange={(v) => {
              setCost(v);
              clear("estimatedCost");
            }}
            invalid={!!errors.estimatedCost}
          />
        </Field>
      </FormSection>

      <FormActions cancelHref={`/driver/jobs/${jobId}`} pending={pending}>
        Report damage
      </FormActions>
    </form>
  );
}
