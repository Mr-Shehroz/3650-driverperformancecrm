"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormSection,
  NativeSelect,
  Segmented,
} from "./form-bits";
import { US_STATES } from "@/lib/constants";
import { createJobAction } from "@/app/(driver)/driver/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { openOfflinePath, submitOrQueue } from "@/lib/offline/submit";
import { newLocalId } from "@/lib/offline/queue";
import { jobSchema } from "@/lib/validation/driver";

type Tri = "yes" | "no" | "unknown";
const toBool = (t: Tri) => (t === "unknown" ? null : t === "yes");

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not yet" },
];

type Props = {
  currentUserId: string;
  drivers: { id: string; name: string }[];
};

export function NewJobForm({ currentUserId, drivers }: Props) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [values, setValues] = useState({
    jobNumber: "",
    date: format(new Date(), "yyyy-MM-dd"),
    originCity: "",
    originState: "FL",
    destCity: "",
    destState: "",
  });
  const [crew, setCrew] = useState<string[]>([]);
  const [deliveredBy, setDeliveredBy] = useState<"drs" | "partner">("drs");
  const [pickup, setPickup] = useState<Tri>("unknown");
  const [delivery, setDelivery] = useState<Tri>("unknown");

  const others = drivers.filter((d) => d.id !== currentUserId);

  const update =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: "" }));
    };

  const toggleCrew = (id: string) =>
    setCrew((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const payload = {
      ...values,
      crewIds: crew,
      deliveredBy,
      onTimePickup: toBool(pickup),
      onTimeDelivery: toBool(delivery),
    };
    const localId = newLocalId();

    startTransition(async () => {
      const res = await submitOrQueue({
        type: "job",
        schema: jobSchema,
        payload,
        localId,
        jobRef: localId,
        label: `Job ${payload.jobNumber}`,
        online: (data) => createJobAction(data),
        afterQueue: () => {
          toast.success(
            "Job saved on this phone. It will upload when you're back online.",
          );
          openOfflinePath(`/driver/jobs/${localId}`);
        },
      });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (res?.error) setFormError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <FormSection title="Job details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Job number"
            htmlFor="jobNumber"
            error={errors.jobNumber}
          >
            <Input
              id="jobNumber"
              value={values.jobNumber}
              onChange={update("jobNumber")}
              placeholder="e.g. DRS-10560"
              autoCapitalize="characters"
              autoComplete="off"
              aria-invalid={!!errors.jobNumber}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="Date" htmlFor="date" error={errors.date}>
            <Input
              id="date"
              type="date"
              value={values.date}
              onChange={update("date")}
              aria-invalid={!!errors.date}
              className="h-12 bg-white text-base"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Route">
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
          <Field
            label="Origin city"
            htmlFor="originCity"
            error={errors.originCity}
          >
            <Input
              id="originCity"
              value={values.originCity}
              onChange={update("originCity")}
              placeholder="Fort Lauderdale"
              autoComplete="off"
              aria-invalid={!!errors.originCity}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="State" htmlFor="originState" error={errors.originState}>
            <NativeSelect
              id="originState"
              value={values.originState}
              onChange={update("originState")}
              aria-invalid={!!errors.originState}
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
          <Field
            label="Destination city"
            htmlFor="destCity"
            error={errors.destCity}
          >
            <Input
              id="destCity"
              value={values.destCity}
              onChange={update("destCity")}
              placeholder="Atlanta"
              autoComplete="off"
              aria-invalid={!!errors.destCity}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="State" htmlFor="destState" error={errors.destState}>
            <NativeSelect
              id="destState"
              value={values.destState}
              onChange={update("destState")}
              aria-invalid={!!errors.destState}
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Crew"
        description="Tap everyone who worked this job with you."
      >
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary px-4 text-[15px] font-semibold text-white">
            <Lock className="h-4 w-4" /> You
          </span>
          {others.map((d) => {
            const active = crew.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleCrew(d.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition active:scale-95",
                  active
                    ? "border-primary bg-primary text-white"
                    : "bg-white text-foreground/80 hover:border-foreground/30",
                )}
              >
                {active && <Check className="h-4 w-4" />}
                {d.name}
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Delivery & timing">
        <Field label="Delivered by">
          <Segmented
            ariaLabel="Delivered by"
            value={deliveredBy}
            onChange={setDeliveredBy}
            options={[
              { value: "drs", label: "DRS crew" },
              { value: "partner", label: "Partner" },
            ]}
          />
        </Field>
        <Field label="Pickup on time?">
          <Segmented
            ariaLabel="Pickup on time"
            value={pickup}
            onChange={setPickup}
            options={TRI_OPTIONS}
          />
        </Field>
        <Field
          label="Delivery on time?"
          hint="You can update this after delivery."
        >
          <Segmented
            ariaLabel="Delivery on time"
            value={delivery}
            onChange={setDelivery}
            options={TRI_OPTIONS}
          />
        </Field>
      </FormSection>

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
        <Link
          href="/driver"
          className="flex h-14 items-center justify-center rounded-lg px-6 text-base font-semibold text-muted-foreground hover:bg-muted sm:h-12"
        >
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={pending}
          className="h-14 w-full text-base font-semibold sm:h-12 sm:w-auto sm:px-8"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Create job"
          )}
        </Button>
      </div>
    </form>
  );
}
