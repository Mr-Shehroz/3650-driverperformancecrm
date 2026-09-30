"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  TEXTAREA_CLASS,
} from "@/components/driver/form-bits";
import { correctPreDamageAction } from "@/app/(admin)/admin/actions";
import type { PreDamage } from "@/types";
import { toast } from "sonner";

export function PreDamageCorrection({ record }: { record: PreDamage }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const initial = {
    item: record.item,
    location: record.location,
    description: record.description,
    notes: record.notes ?? "",
    customerName: record.customerName,
    reason: "",
  };
  const [v, setV] = useState(initial);

  const set =
    (k: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setV((s) => ({ ...s, [k]: e.target.value }));
      if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
    };

  const cancel = () => {
    setV(initial);
    setErrors({});
    setFormError(undefined);
    setOpen(false);
  };

  const save = () => {
    setFormError(undefined);
    startTransition(async () => {
      const res = await correctPreDamageAction({ id: record.id, ...v });
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      else if (res?.error) setFormError(res.error);
      else {
        setV((s) => ({ ...s, reason: "" }));
        setOpen(false);
        toast.success("Record corrected. The original is kept in the history.");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold text-foreground transition hover:border-foreground/30"
      >
        <Pencil className="h-4 w-4" />{" "}
        <span className="hidden sm:inline">Correct</span>
      </button>
    );
  }

  return (
    <div className="mt-4 w-full basis-full space-y-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] p-4">
      <div>
        <p className="font-semibold">Correct this record</p>
        <p className="text-sm text-muted-foreground">
          Photos, signature, timestamps and GPS can&apos;t be changed. The
          original values are kept in the audit log.
        </p>
      </div>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Item" error={errors.item}>
          <Input
            value={v.item}
            onChange={set("item")}
            aria-invalid={!!errors.item}
            className="h-11 bg-white text-base"
          />
        </Field>
        <Field label="Location on item" error={errors.location}>
          <Input
            value={v.location}
            onChange={set("location")}
            aria-invalid={!!errors.location}
            className="h-11 bg-white text-base"
          />
        </Field>
      </div>
      <Field label="Description" error={errors.description}>
        <textarea
          value={v.description}
          onChange={set("description")}
          aria-invalid={!!errors.description}
          className={TEXTAREA_CLASS}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Notes" optional>
          <Input
            value={v.notes}
            onChange={set("notes")}
            className="h-11 bg-white text-base"
          />
        </Field>
        <Field label="Customer printed name" error={errors.customerName}>
          <Input
            value={v.customerName}
            onChange={set("customerName")}
            aria-invalid={!!errors.customerName}
            className="h-11 bg-white text-base"
          />
        </Field>
      </div>
      <Field label="Reason for correction" error={errors.reason}>
        <Input
          value={v.reason}
          onChange={set("reason")}
          placeholder="e.g. Driver misspelled customer name"
          aria-invalid={!!errors.reason}
          className="h-11 bg-white text-base"
        />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={cancel}
          className="h-11 rounded-lg px-5 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <Button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-11 px-6 font-semibold"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save correction"
          )}
        </Button>
      </div>
    </div>
  );
}
