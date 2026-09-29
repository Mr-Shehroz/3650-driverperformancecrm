"use client";

import { useState, useTransition } from "react";
import {
  ChoiceGrid,
  Field,
  FormError,
  FormSection,
  MoneyInput,
} from "./form-bits";
import { FormActions } from "./form-actions";
import { createUpsellAction } from "@/app/(driver)/driver/actions";
import { UPSELL_TYPE_LABELS, type UpsellType } from "@/types";

const TYPES = (Object.keys(UPSELL_TYPE_LABELS) as UpsellType[]).map((t) => ({
  value: t,
  label: UPSELL_TYPE_LABELS[t],
}));

export function UpsellForm({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [type, setType] = useState<UpsellType | "">("");
  const [amount, setAmount] = useState("");

  const clear = (k: string) =>
    errors[k] && setErrors((e) => ({ ...e, [k]: "" }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    startTransition(async () => {
      const res = await createUpsellAction({
        jobId,
        type: type as UpsellType,
        amount:
          amount === "" ? (undefined as unknown as number) : Number(amount),
      });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError("Please fix the highlighted fields.");
      }
      if (res?.error) setFormError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <FormSection title="Upsell">
        <Field label="Type" error={errors.type}>
          <ChoiceGrid
            ariaLabel="Upsell type"
            value={type}
            onChange={(v) => {
              setType(v);
              clear("type");
            }}
            options={TYPES}
            invalid={!!errors.type}
            className="grid-cols-2 sm:grid-cols-4"
          />
        </Field>
        <Field label="Amount" htmlFor="amount" error={errors.amount}>
          <MoneyInput
            id="amount"
            value={amount}
            onChange={(v) => {
              setAmount(v);
              clear("amount");
            }}
            invalid={!!errors.amount}
          />
        </Field>
      </FormSection>

      <FormActions cancelHref={`/driver/jobs/${jobId}`} pending={pending}>
        Save upsell
      </FormActions>
    </form>
  );
}
