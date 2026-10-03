"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { Field, Segmented } from "@/components/driver/form-bits";
import { saveTruckAction } from "@/app/(admin)/admin/fleet-actions";
import type { Truck } from "@/types";

export function TruckDialogButton({ truck }: { truck?: Truck }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({
    unitNumber: truck?.unitNumber ?? "",
    description: truck?.description ?? "",
    plate: truck?.plate ?? "",
    active: truck?.active ?? true,
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTruckAction({ id: truck?.id, ...v });
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      else if (res?.error) toast.error(res.error);
      else {
        toast.success(truck ? "Truck updated" : `Unit ${v.unitNumber} added`);
        setOpen(false);
        if (!truck)
          setV({ unitNumber: "", description: "", plate: "", active: true });
        router.refresh();
      }
    });
  };

  return (
    <>
      {truck ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold hover:border-foreground/30"
        >
          <Pencil className="h-4 w-4" /> Edit truck
        </button>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 px-5 font-semibold"
        >
          <Plus className="mr-1 h-4 w-4" /> Add truck
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={truck ? `Edit unit ${truck.unitNumber}` : "Add truck"}
      >
        <form onSubmit={save} className="space-y-5" noValidate>
          <Field label="Unit number" htmlFor="unit" error={errors.unitNumber}>
            <Input
              id="unit"
              value={v.unitNumber}
              onChange={(e) =>
                setV((s) => ({ ...s, unitNumber: e.target.value }))
              }
              placeholder="e.g. 101"
              aria-invalid={!!errors.unitNumber}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="Description" htmlFor="desc" optional>
            <Input
              id="desc"
              value={v.description}
              onChange={(e) =>
                setV((s) => ({ ...s, description: e.target.value }))
              }
              placeholder="e.g. 26 ft box truck · Freightliner M2"
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="License plate" htmlFor="plate" optional>
            <Input
              id="plate"
              value={v.plate}
              onChange={(e) => setV((s) => ({ ...s, plate: e.target.value }))}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field
            label="Status"
            hint="Inactive trucks don't appear in the driver's pre-trip list."
          >
            <Segmented
              value={v.active ? "active" : "inactive"}
              onChange={(x) => setV((s) => ({ ...s, active: x === "active" }))}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 rounded-lg px-6 font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={pending}
              className="h-12 px-8 font-semibold"
            >
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : truck ? (
                "Save changes"
              ) : (
                "Add truck"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
