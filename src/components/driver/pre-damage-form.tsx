"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Lock, MapPin, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSection } from "./form-bits";
import { PhotoPicker } from "./photo-picker";
import { SignatureField } from "./signature-field";
import { useGeolocation } from "@/hooks/use-geolocation";
import { createPreDamageAction } from "@/app/(driver)/driver/actions";
import { cn } from "@/lib/utils";
import { preDamageSchema } from "@/lib/validation/driver";
import { openOfflinePath, submitOrQueue } from "@/lib/offline/submit";
import { toast } from "sonner";

const TEXTAREA =
  "min-h-[96px] w-full rounded-lg border border-input bg-white px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive";

export function PreDamageForm({ jobId }: { jobId: string }) {
  const geo = useGeolocation();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [item, setItem] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [customerShown, setCustomerShown] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const clearError = (key: string) =>
    errors[key] && setErrors((e) => ({ ...e, [key]: "" }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const payload = {
      jobId,
      item,
      location,
      description,
      notes,
      photos,
      customerShown,
      customerName,
      signature: signature ?? "",
      capturedAtDevice: new Date().toISOString(),
      lat: geo.lat,
      lng: geo.lng,
    };

    startTransition(async () => {
      const res = await submitOrQueue({
        type: "pre_damage",
        schema: preDamageSchema,
        payload,
        jobRef: jobId,
        label: `Pre-existing damage: ${item || "item"}`,
        online: (data) => createPreDamageAction(data),
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
      {/* GPS status */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
          geo.status === "ok" && "border-green-200 bg-green-50 text-green-800",
          geo.status === "error" &&
            "border-amber-200 bg-amber-50 text-amber-800",
          (geo.status === "loading" || geo.status === "idle") &&
            "bg-card text-muted-foreground",
        )}
      >
        {geo.status === "loading" || geo.status === "idle" ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <MapPin className="h-5 w-5 shrink-0" />
        )}
        <p className="min-w-0 flex-1 font-medium">
          {geo.status === "ok" && `Location captured (±${geo.accuracy}m)`}
          {geo.status === "error" && `${geo.message}. You can still save.`}
          {(geo.status === "loading" || geo.status === "idle") &&
            "Getting your location…"}
        </p>
        {geo.status === "error" && (
          <button
            type="button"
            onClick={geo.request}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 font-semibold text-foreground shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        )}
      </div>

      <FormError message={formError} />

      <FormSection title="Damaged item">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Item" htmlFor="item" error={errors.item}>
            <Input
              id="item"
              value={item}
              onChange={(e) => {
                setItem(e.target.value);
                clearError("item");
              }}
              placeholder="e.g. Oak dresser"
              aria-invalid={!!errors.item}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field
            label="Location on item"
            htmlFor="location"
            error={errors.location}
          >
            <Input
              id="location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                clearError("location");
              }}
              placeholder="e.g. Top, front-left corner"
              aria-invalid={!!errors.location}
              className="h-12 bg-white text-base"
            />
          </Field>
        </div>
        <Field
          label="Damage description"
          htmlFor="description"
          error={errors.description}
        >
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearError("description");
            }}
            placeholder="e.g. Deep scratch across the top surface"
            aria-invalid={!!errors.description}
            className={TEXTAREA}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Photos"
        description="At least 1 photo, up to 5. Show the damage clearly."
      >
        <Field label="Damage photos" error={errors.photos}>
          <PhotoPicker
            value={photos}
            onChange={(p) => {
              setPhotos(p);
              clearError("photos");
            }}
            invalid={!!errors.photos}
          />
        </Field>
        <Field label="Notes" htmlFor="notes" optional>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth recording"
            className={TEXTAREA}
          />
        </Field>
      </FormSection>

      <FormSection title="Customer acknowledgment">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
            customerShown ? "border-primary bg-primary/5" : "bg-white",
            errors.customerShown && "border-destructive",
          )}
        >
          <input
            type="checkbox"
            checked={customerShown}
            onChange={(e) => {
              setCustomerShown(e.target.checked);
              clearError("customerShown");
            }}
            className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--primary)]"
          />
          <span className="text-[15px] font-semibold leading-snug">
            The customer was shown this damage before loading
          </span>
        </label>
        {errors.customerShown && (
          <p className="-mt-3 text-sm font-medium text-destructive">
            {errors.customerShown}
          </p>
        )}

        <Field
          label="Customer printed name"
          htmlFor="customerName"
          error={errors.customerName}
        >
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              clearError("customerName");
            }}
            placeholder="Full name"
            autoComplete="off"
            autoCapitalize="words"
            aria-invalid={!!errors.customerName}
            className="h-12 bg-white text-base"
          />
        </Field>

        <Field label="Customer signature" error={errors.signature}>
          <SignatureField
            onChange={(s) => {
              setSignature(s);
              clearError("signature");
            }}
            invalid={!!errors.signature}
          />
        </Field>
      </FormSection>

      <div className="flex items-start gap-3 rounded-xl bg-secondary px-4 py-3.5 text-sm text-white">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Once saved, this record is <strong>locked</strong> and time-stamped by
          the server. Only an admin can make corrections, and every change is
          logged.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={`/driver/jobs/${jobId}`}
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
            <>
              <Lock className="mr-1 h-4 w-4" /> Save & lock record
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
