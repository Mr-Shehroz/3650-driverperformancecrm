"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Field,
  FormError,
  FormSection,
  TEXTAREA_CLASS,
} from "@/components/driver/form-bits";
import { PhotoPicker } from "@/components/driver/photo-picker";
import { SignatureField } from "@/components/driver/signature-field";
import { FormActions } from "@/components/driver/form-actions";
import { useGeolocation } from "@/hooks/use-geolocation";
import { createPreTripAction } from "@/app/(driver)/driver/fleet-actions";
import {
  CHECK_ITEMS,
  type CheckItemKey,
  type CheckStatus,
  type TruckStatus,
} from "@/types";
import type { PreTripInput } from "@/lib/validation/fleet";
import { TruckStatusPill } from "./status-badges";
import { cn } from "@/lib/utils";

type ItemState = {
  status: CheckStatus | "";
  notes: string;
  photos: string[];
  open: boolean;
};

const STATUS_CHOICES: {
  value: TruckStatus;
  label: string;
  hint: string;
  active: string;
}[] = [
  {
    value: "safe",
    label: "Safe to drive",
    hint: "No problems found",
    active: "border-green-600 bg-green-50 text-green-800",
  },
  {
    value: "repair_soon",
    label: "Needs repair soon",
    hint: "Can drive, needs a fix",
    active: "border-amber-500 bg-amber-50 text-amber-900",
  },
  {
    value: "do_not_drive",
    label: "Do not drive",
    hint: "Unsafe. Admin is alerted.",
    active: "border-red-600 bg-red-50 text-red-800",
  },
];

type TruckOption = {
  id: string;
  unitNumber: string;
  description?: string;
  status: TruckStatus;
};

export function PreTripForm({ trucks }: { trucks: TruckOption[] }) {
  const geo = useGeolocation();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [truckId, setTruckId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [items, setItems] = useState<Record<CheckItemKey, ItemState>>(() =>
    CHECK_ITEMS.reduce(
      (result, c) => {
        result[c.key] = { status: "", notes: "", photos: [], open: false };
        return result;
      },
      {} as Record<CheckItemKey, ItemState>,
    ),
  );
  const [truckStatus, setTruckStatus] = useState<TruckStatus | "">("");
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const clear = (k: string) =>
    errors[k] && setErrors((e) => ({ ...e, [k]: "" }));
  const setItem = (key: CheckItemKey, patch: Partial<ItemState>) =>
    setItems((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const flagged = CHECK_ITEMS.filter(
    (c) => items[c.key].status === "attention",
  ).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    const payload = {
      truckId,
      odometer: odometer === "" ? undefined : Number(odometer),
      items: CHECK_ITEMS.map((c) => ({
        key: c.key,
        status: items[c.key].status || undefined,
        notes: items[c.key].notes.trim() || undefined,
        photos: items[c.key].photos,
      })),
      truckStatus: truckStatus || undefined,
      notes: notes.trim() || undefined,
      signature: signature ?? "",
      capturedAtDevice: new Date().toISOString(),
      lat: geo.lat,
      lng: geo.lng,
    } as unknown as PreTripInput;

    startTransition(async () => {
      const res = await createPreTripAction(payload);
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
      {/* GPS */}
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
            className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 font-semibold text-foreground shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        )}
      </div>

      <FormError message={formError} />

      {/* Truck */}
      <FormSection
        title="Truck"
        description="Choose the truck you're driving today."
      >
        <Field label="Unit number" error={errors.truckId}>
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
                    "flex items-start justify-between gap-3 rounded-xl border-2 bg-white p-4 text-left transition",
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
                    <div className="mt-2">
                      <TruckStatusPill status={t.status} />
                    </div>
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
        </Field>

        <Field
          label="Odometer (miles)"
          htmlFor="odometer"
          error={errors.odometer}
        >
          <Input
            id="odometer"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => {
              setOdometer(e.target.value.replace(/[^0-9]/g, ""));
              clear("odometer");
            }}
            placeholder="e.g. 182450"
            aria-invalid={!!errors.odometer}
            className="h-12 bg-white text-base tabular-nums sm:max-w-xs"
          />
        </Field>
      </FormSection>

      {/* Checklist */}
      <FormSection
        title="Checklist"
        description="Mark each item. Add a note and photo for anything that needs attention."
      >
        <div className="space-y-3">
          {CHECK_ITEMS.map((c, i) => {
            const it = items[c.key];
            const statusErr = errors[`items.${i}.status`];
            const notesErr = errors[`items.${i}.notes`];
            const showDetails = it.status === "attention" || it.open;
            return (
              <div
                key={c.key}
                className={cn(
                  "rounded-xl border bg-white p-4",
                  it.status === "attention" &&
                    "border-amber-300 bg-amber-50/40",
                  it.status === "ok" && "border-green-200",
                  statusErr && "border-destructive",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.hint}</p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setItem(c.key, { status: "ok" });
                        clear(`items.${i}.status`);
                      }}
                      className={cn(
                        "flex h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-5 text-[15px] font-semibold transition sm:flex-none",
                        it.status === "ok"
                          ? "border-green-600 bg-green-600 text-white"
                          : "bg-white text-foreground/80 hover:border-green-400",
                      )}
                    >
                      <Check className="h-4 w-4 shrink-0" /> OK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItem(c.key, { status: "attention" });
                        clear(`items.${i}.status`);
                      }}
                      className={cn(
                        "flex h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-4 text-[15px] font-semibold transition sm:flex-none",
                        it.status === "attention"
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "bg-white text-foreground/80 hover:border-amber-400",
                      )}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" /> Needs
                      attention
                    </button>
                  </div>
                </div>
                {statusErr && (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    {statusErr}
                  </p>
                )}

                {showDetails ? (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <Field
                      label="Notes"
                      htmlFor={`n-${c.key}`}
                      error={notesErr}
                      optional={it.status !== "attention"}
                    >
                      <textarea
                        id={`n-${c.key}`}
                        value={it.notes}
                        onChange={(e) => {
                          setItem(c.key, { notes: e.target.value });
                          clear(`items.${i}.notes`);
                        }}
                        placeholder={
                          it.status === "attention"
                            ? "What's wrong?"
                            : "Anything worth noting"
                        }
                        aria-invalid={!!notesErr}
                        className={TEXTAREA_CLASS}
                      />
                    </Field>
                    <Field label="Photos" optional>
                      <PhotoPicker
                        value={it.photos}
                        onChange={(p) => setItem(c.key, { photos: p })}
                        max={3}
                      />
                    </Field>
                  </div>
                ) : it.status === "ok" ? (
                  <button
                    type="button"
                    onClick={() => setItem(c.key, { open: true })}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-4 w-4" /> Add note or photo
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </FormSection>

      {/* Status */}
      <FormSection title="Truck status">
        <Field label="Overall status" error={errors.truckStatus}>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUS_CHOICES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setTruckStatus(s.value);
                  clear("truckStatus");
                }}
                className={cn(
                  "rounded-xl border-2 bg-white p-4 text-left transition",
                  truckStatus === s.value
                    ? s.active
                    : "border-border hover:border-foreground/30",
                )}
              >
                <p className="font-semibold">{s.label}</p>
                <p className="mt-0.5 text-sm opacity-80">{s.hint}</p>
              </button>
            ))}
          </div>
        </Field>

        {flagged > 0 && truckStatus === "safe" && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            You marked {flagged} item{flagged === 1 ? "" : "s"} as needing
            attention. Is the truck still safe to drive?
          </p>
        )}

        <Field label="Other notes" htmlFor="pt-notes" optional>
          <textarea
            id="pt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={TEXTAREA_CLASS}
          />
        </Field>
      </FormSection>

      {/* Signature */}
      <FormSection title="Your signature">
        <Field label="Driver signature" error={errors.signature}>
          <SignatureField
            onChange={(s) => {
              setSignature(s);
              clear("signature");
            }}
            invalid={!!errors.signature}
          />
        </Field>
      </FormSection>

      <div className="space-y-2">
        <div className="flex items-start gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Reporting a problem never lowers your score. It keeps you and the
            crew safe.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-secondary px-4 py-3 text-sm text-white">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Once submitted, the inspection is time-stamped and can&apos;t be
            edited. Any flagged item opens a maintenance ticket.
          </p>
        </div>
      </div>

      <FormActions cancelHref="/driver/pre-trip" pending={pending}>
        Submit inspection
      </FormActions>
    </form>
  );
}
