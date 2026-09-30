"use client";

import { useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/shared/pill";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { offlineDb, type OutboxType } from "@/lib/offline/db";
import {
  discardItem,
  getCurrentUserId,
  getSyncing,
  retryItem,
  subscribeCurrentUser,
  subscribeSyncing,
  syncOutbox,
} from "@/lib/offline/queue";

const ICONS: Record<OutboxType, React.ElementType> = {
  job: Truck,
  pre_damage: Camera,
  damage: Wrench,
  review: Star,
  upsell: DollarSign,
  on_time: Clock,
};

export function OutboxView() {
  const userId = useSyncExternalStore(
    subscribeCurrentUser,
    getCurrentUserId,
    () => null,
  );
  const syncing = useSyncExternalStore(
    subscribeSyncing,
    getSyncing,
    () => false,
  );
  const online = useOnlineStatus();
  const [discardId, setDiscardId] = useState<string | null>(null);

  const items = useLiveQuery(
    async () =>
      userId
        ? (await offlineDb.outbox.orderBy("createdAt").toArray()).filter(
            (i) => i.userId === userId,
          )
        : [],
    [userId],
  );

  const syncNow = async () => {
    const r = await syncOutbox();
    if (r.authError)
      toast.error("Please log in again to upload saved entries.");
    else if (r.synced) toast.success(`${r.synced} uploaded`);
    else if (r.failed) toast.error(`${r.failed} couldn't upload`);
    else if (r.remaining) toast.info("Still waiting for a good connection.");
  };

  if (!items) return null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="All caught up"
        description="Everything you saved on this phone has been uploaded."
      />
    );
  }

  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-semibold">
            {pending} waiting to upload
            {items.length - pending > 0 &&
              ` · ${items.length - pending} failed`}
          </p>
          <p className="text-sm text-muted-foreground">
            {online
              ? "Uploads run automatically every 30 seconds."
              : "You're offline. Uploads start when signal returns."}
          </p>
        </div>
        <Button
          type="button"
          onClick={syncNow}
          disabled={!online || syncing || pending === 0}
          className="h-11 px-5 font-semibold"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          {syncing ? "" : "Upload now"}
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = ICONS[item.type];
          const failed = item.status === "failed";
          return (
            <li key={item.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-foreground/70" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.label}</p>
                    {failed ? (
                      <Pill tone="danger">Failed</Pill>
                    ) : (
                      <Pill tone="warning">Waiting</Pill>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Saved {format(parseISO(item.createdAt), "MMM d, h:mm a")}
                  </p>
                  {failed && item.error && (
                    <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                      {item.error}
                    </p>
                  )}
                </div>
              </div>

              {failed && (
                <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setDiscardId(item.id)}
                    className="flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" /> Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => retryItem(item.id)}
                    disabled={!online}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" /> Retry
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!discardId}
        onClose={() => setDiscardId(null)}
        title="Discard this entry?"
        description="It will be removed from this phone and never uploaded. If it's a job, everything saved under it is removed too."
        tone="danger"
        confirmLabel="Discard"
        onConfirm={async () => {
          if (discardId) await discardItem(discardId);
          toast.success("Entry discarded");
        }}
      />
    </div>
  );
}
