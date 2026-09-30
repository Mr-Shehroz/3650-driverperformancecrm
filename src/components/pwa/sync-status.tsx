"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CloudUpload, Loader2 } from "lucide-react";
import { offlineDb } from "@/lib/offline/db";
import {
  getCurrentUserId,
  getSyncing,
  subscribeCurrentUser,
  subscribeSyncing,
} from "@/lib/offline/queue";
import { cn } from "@/lib/utils";

export function SyncStatus() {
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
  const counts = useLiveQuery(async () => {
    if (!userId) return { pending: 0, failed: 0 };
    const mine = await offlineDb.outbox
      .where("userId")
      .equals(userId)
      .toArray();
    return {
      pending: mine.filter((i) => i.status === "pending").length,
      failed: mine.filter((i) => i.status === "failed").length,
    };
  }, [userId]);

  if (!counts || (counts.pending === 0 && counts.failed === 0)) return null;

  const failed = counts.failed > 0;
  return (
    <Link
      href="/driver/outbox"
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition",
        failed
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-amber-50 text-amber-800 hover:bg-amber-100",
      )}
    >
      {syncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : failed ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <CloudUpload className="h-4 w-4" />
      )}
      <span className="hidden min-[400px]:inline">
        {failed ? `${counts.failed} failed` : `${counts.pending} waiting`}
      </span>
      <span className="min-[400px]:hidden">
        {failed ? counts.failed : counts.pending}
      </span>
    </Link>
  );
}
