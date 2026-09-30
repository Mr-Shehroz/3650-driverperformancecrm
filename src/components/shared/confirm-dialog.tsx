"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "./modal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  /** When set, a reason is required before confirming */
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Return false to keep the dialog open (e.g. on error) */
  onConfirm: (reason?: string) => Promise<boolean | void> | boolean | void;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "default",
  reasonLabel,
  reasonPlaceholder,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setReason("");
    setError(undefined);
    onClose();
  };

  const confirm = () => {
    if (reasonLabel && reason.trim().length < 3) {
      setError("Please enter a reason (at least 3 characters).");
      return;
    }
    startTransition(async () => {
      const ok = await onConfirm(reasonLabel ? reason.trim() : undefined);
      if (ok !== false) {
        setReason("");
        setError(undefined);
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={close} title={title}>
      <div className="space-y-5">
        {description && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
              tone === "danger"
                ? "bg-red-50 text-red-800"
                : "bg-muted text-foreground/80",
            )}
          >
            {tone === "danger" && (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{description}</p>
          </div>
        )}

        {reasonLabel && (
          <div className="space-y-2">
            <label
              htmlFor="confirm-reason"
              className="text-[15px] font-semibold"
            >
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason"
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder={reasonPlaceholder}
              aria-invalid={!!error}
              className="min-h-[90px] w-full rounded-lg border border-input bg-white px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive"
            />
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="h-12 rounded-lg px-6 font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={confirm}
            disabled={pending}
            className={cn(
              "h-12 px-8 font-semibold",
              tone === "danger" && "bg-red-600 hover:bg-red-700",
            )}
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
