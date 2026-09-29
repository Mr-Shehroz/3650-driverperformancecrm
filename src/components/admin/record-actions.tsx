"use client";

import { useTransition } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import {
  deleteRecordAction,
  restoreRecordAction,
} from "@/app/(admin)/admin/actions";
import type { RecordKind } from "@/types";

export function RecordActions({
  kind,
  id,
  deleted,
}: {
  kind: RecordKind;
  id: string;
  deleted: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    const reason = window.prompt(
      "Reason for deleting this record (required). The record is kept in the audit log.",
    );
    if (!reason?.trim()) return;
    startTransition(async () => {
      const res = await deleteRecordAction(kind, id, reason);
      if (res?.error) alert(res.error);
    });
  };

  const onRestore = () =>
    startTransition(async () => {
      const res = await restoreRecordAction(kind, id);
      if (res?.error) alert(res.error);
    });

  const base =
    "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition disabled:opacity-50";

  return deleted ? (
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
  ) : (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete record"
      className={`${base} text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Delete</span>
    </button>
  );
}
