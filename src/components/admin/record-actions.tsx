"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  deleteRecordAction,
  restoreRecordAction,
} from "@/app/(admin)/admin/actions";
import type { RecordKind } from "@/types";

const LABELS: Record<RecordKind, string> = {
  pre_damage: "pre-existing damage record",
  damage: "damage incident",
  review: "review",
  upsell: "upsell",
};

const base =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition disabled:opacity-50";

export function RecordActions({
  kind,
  id,
  deleted,
}: {
  kind: RecordKind;
  id: string;
  deleted: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = async (reason?: string) => {
    const res = await deleteRecordAction(kind, id, reason ?? "");
    if (res?.error) {
      toast.error(res.error);
      return false;
    }
    toast.success(
      `The ${LABELS[kind]} was deleted. It's kept in the audit log.`,
    );
  };

  const onRestore = () =>
    startTransition(async () => {
      const res = await restoreRecordAction(kind, id);
      if (res?.error) toast.error(res.error);
      else toast.success(`The ${LABELS[kind]} was restored.`);
    });

  if (deleted) {
    return (
      <button
        type="button"
        onClick={onRestore}
        disabled={pending}
        className={`${base} text-foreground hover:border-foreground/30`}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}{" "}
        Restore
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete record"
        className={`${base} text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Delete</span>
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete ${LABELS[kind]}?`}
        description="It will be hidden from reports and metrics, but never permanently removed. You can restore it later."
        tone="danger"
        confirmLabel="Delete"
        reasonLabel="Reason for deleting"
        reasonPlaceholder="e.g. Entered on the wrong job"
        onConfirm={onDelete}
      />
    </>
  );
}
