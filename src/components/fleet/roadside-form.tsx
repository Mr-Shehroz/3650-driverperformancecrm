// File: src/components/fleet/roadside-form.tsx
// (REPLACE the whole file)

"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  ChoiceGrid,
  Field,
  FormError,
  FormSection,
  NativeSelect,
  TEXTAREA_CLASS,
} from "@/components/driver/form-bits";
import { FormActions } from "@/components/driver/form-actions";
import { US_STATES } from "@/lib/constants";
import { createRoadsideAction } from "@/app/(driver)/driver/fleet-actions";
import { createRoadsideAdminAction } from "@/app/(admin)/admin/fleet-actions";
import { ROADSIDE_RESULT_LABELS, type RoadsideResult } from "@/types";
import { ReportUpload, type ReportFile } from "./report-upload";

type Props = {
  mode: "driver" | "admin";
  trucks: { id: string; unitNumber: string }[];
  drivers?: { id: string; name: string }[];
  points: Record<RoadsideResult, number>;
  cancelHref: string;
};

const RESULTS = (Object.keys(ROADSIDE_RESULT_LABELS) as RoadsideResult[]).map(
  (r) => ({ value: r, label: ROADSIDE_RESULT_LABELS[r] }),
);

export function RoadsideForm({
  mode,
  trucks,
  drivers = [],
  points,
  cancelHref,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [driverId, setDriverId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [state, setState] = useState("FL");
  const [location, setLocation] = useState("");
  const [truckId, setTruckId] = useState("");
  const [result, setResult] = useState<RoadsideResult | "">("");
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState<ReportFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const clear = (k: string) =>
    errors[k] && setErrors((e) => ({ ...e, [k]: "" }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    if (uploading) {
      setFormError("Wait for the report to finish uploading.");
      return;
    }
    const payload = {
      driverId: mode === "admin" ? driverId : undefined,
      date,
      state,
      location,
      truckId,
      result: result || undefined,
      violationNotes: notes.trim() || undefined,
      // The file is already in private storage; send where it was saved
      report: report
        ? { name: report.name, type: report.type, path: report.path }
        : null,
    };

    startTransition(async () => {
      const res =
        mode === "admin"
          ? await createRoadsideAdminAction(payload)
          : await createRoadsideAction(payload);
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError("Please fix the highlighted fields.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (res?.error) setFormError(res.error);
    });
  };

  const pts = result ? points[result] : null;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <FormSection title="Inspection">
        {mode === "admin" && (
          <Field label="Driver" htmlFor="rs-driver" error={errors.driverId}>
            <NativeSelect
              id="rs-driver"
              value={driverId}
              onChange={(e) => {
                setDriverId(e.target.value);
                clear("driverId");
              }}
              aria-invalid={!!errors.driverId}
            >
              <option value="">Choose a driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Date" htmlFor="rs-date" error={errors.date}>
            <Input
              id="rs-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                clear("date");
              }}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="Truck" htmlFor="rs-truck" error={errors.truckId}>
            <NativeSelect
              id="rs-truck"
              value={truckId}
              onChange={(e) => {
                setTruckId(e.target.value);
                clear("truckId");
              }}
              aria-invalid={!!errors.truckId}
            >
              <option value="">Choose unit</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  Unit {t.unitNumber}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
          <Field label="Location" htmlFor="rs-loc" error={errors.location}>
            <Input
              id="rs-loc"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                clear("location");
              }}
              placeholder="e.g. I-95 weigh station, Brunswick"
              aria-invalid={!!errors.location}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="State" htmlFor="rs-state" error={errors.state}>
            <NativeSelect
              id="rs-state"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                clear("state");
              }}
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Result">
        <Field label="Inspection result" error={errors.result}>
          <ChoiceGrid
            ariaLabel="Result"
            value={result}
            onChange={(r) => {
              setResult(r);
              clear("result");
            }}
            options={RESULTS}
            invalid={!!errors.result}
            className="grid-cols-1 sm:grid-cols-3"
          />
        </Field>
        {pts !== null && (
          <p
            className={
              pts >= 0
                ? "rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800"
                : "rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            }
          >
            Score change: {pts > 0 ? `+${pts}` : pts} points
          </p>
        )}
        {result && result !== "clean" && (
          <Field
            label="Violation notes"
            htmlFor="rs-notes"
            error={errors.violationNotes}
          >
            <textarea
              id="rs-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                clear("violationNotes");
              }}
              placeholder="What did the inspector note?"
              aria-invalid={!!errors.violationNotes}
              className={TEXTAREA_CLASS}
            />
          </Field>
        )}
        <Field label="Inspection report" optional>
          <ReportUpload
            value={report}
            onChange={setReport}
            onBusyChange={setUploading}
          />
        </Field>
      </FormSection>

      <FormActions cancelHref={cancelHref} pending={pending || uploading}>
        Save inspection
      </FormActions>
    </form>
  );
}
