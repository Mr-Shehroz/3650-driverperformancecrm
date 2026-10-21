// File: src/components/fleet/scoring-form.tsx
// (REPLACE the whole file)

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/driver/form-bits";
import { SectionRow } from "@/components/shared/section-row";
import { updateScoringAction } from "@/app/(admin)/admin/fleet-actions";
import type { ScoringSettings } from "@/types";

const FIELDS: { key: keyof ScoringSettings; label: string; hint: string }[] = [
  {
    key: "baseScore",
    label: "Starting score",
    hint: "Every driver starts here",
  },
  { key: "clean", label: "Clean inspection", hint: "Points added (0 or more)" },
  {
    key: "violations",
    label: "Violations",
    hint: "Points removed (0 or less)",
  },
  {
    key: "outOfService",
    label: "Out of service",
    hint: "Points removed (0 or less)",
  },
  {
    key: "washIntervalDays",
    label: "Wash every (days)",
    hint: "A truck is overdue after this many days without a wash",
  },
  {
    key: "overdueWash",
    label: "Overdue wash",
    hint: "Points removed for each overdue wash (0 or less)",
  },
];

export function ScoringForm({ scoring }: { scoring: ScoringSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState(
    Object.fromEntries(
      FIELDS.map((f) => [f.key, String(scoring[f.key])]),
    ) as Record<keyof ScoringSettings, string>,
  );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateScoringAction(
        Object.fromEntries(
          FIELDS.map((f) => [f.key, Number(v[f.key])]),
        ) as unknown as ScoringSettings,
      );
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      else if (res?.error) toast.error(res.error);
      else {
        setErrors({});
        toast.success("Scoring saved");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={save} noValidate className="mt-8">
      <SectionRow
        title="Driver scoring"
        description="Points for DOT roadside inspections and overdue truck washes. Changes apply to every driver's score right away."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              htmlFor={`sc-${f.key}`}
              hint={f.hint}
              error={errors[f.key]}
            >
              <Input
                id={`sc-${f.key}`}
                inputMode="numeric"
                value={v[f.key]}
                onChange={(e) =>
                  setV((s) => ({
                    ...s,
                    [f.key]: e.target.value.replace(/[^0-9-]/g, ""),
                  }))
                }
                aria-invalid={!!errors[f.key]}
                className="h-12 bg-white text-base tabular-nums"
              />
            </Field>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="h-11 px-8 font-semibold"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Save scoring"
            )}
          </Button>
        </div>
      </SectionRow>
    </form>
  );
}
