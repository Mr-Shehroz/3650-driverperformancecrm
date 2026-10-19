// File: src/lib/offline/queue.ts
// (REPLACE the whole file)

"use client";

import { offlineDb, type OutboxItem, type OutboxType } from "./db";
import { prepareEvidence, UploadRejectedError } from "@/lib/evidence/upload";

export const LOCAL_PREFIX = "local-";
export const isLocalId = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith(LOCAL_PREFIX);
export const newLocalId = () => `${LOCAL_PREFIX}${crypto.randomUUID()}`;

/* ---------- Current driver (so entries are tied to who saved them) ---------- */
const USER_KEY = "drs_current_user";
const userListeners = new Set<() => void>();

export function subscribeCurrentUser(cb: () => void) {
  userListeners.add(cb);
  return () => {
    userListeners.delete(cb);
  };
}

export function getCurrentUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function setCurrentUserId(id: string) {
  try {
    if (localStorage.getItem(USER_KEY) === id) return;
    localStorage.setItem(USER_KEY, id);
  } catch {}
  userListeners.forEach((l) => l());
}

/* ---------- "Syncing…" state for the UI ---------- */
let syncing = false;
const syncListeners = new Set<() => void>();

export function subscribeSyncing(cb: () => void) {
  syncListeners.add(cb);
  return () => {
    syncListeners.delete(cb);
  };
}
export const getSyncing = () => syncing;

function setSyncing(v: boolean) {
  syncing = v;
  syncListeners.forEach((l) => l());
}

/* ---------- Queue ---------- */
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {}
}

export async function enqueue(
  type: OutboxType,
  payload: Record<string, unknown>,
  meta: { label: string; jobRef: string; id?: string },
): Promise<OutboxItem> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("No signed-in driver on this phone");

  const item: OutboxItem = {
    id: meta.id ?? crypto.randomUUID(),
    userId,
    type,
    payload,
    label: meta.label,
    jobRef: meta.jobRef,
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };
  await offlineDb.outbox.add(item);
  void requestPersistentStorage();
  if (navigator.onLine) void syncOutbox();
  return item;
}

export type SyncSummary = {
  synced: number;
  failed: number;
  remaining: number;
  authError?: boolean;
};

let running: Promise<SyncSummary> | null = null;

export function syncOutbox(userId = getCurrentUserId()): Promise<SyncSummary> {
  if (!userId) return Promise.resolve({ synced: 0, failed: 0, remaining: 0 });
  if (running) return running;
  setSyncing(true);
  running = runSync(userId).finally(() => {
    running = null;
    setSyncing(false);
  });
  return running;
}

async function pendingCount(userId: string) {
  return offlineDb.outbox
    .where("userId")
    .equals(userId)
    .filter((i) => i.status === "pending")
    .count();
}

async function runSync(userId: string): Promise<SyncSummary> {
  let synced = 0;
  let failed = 0;

  const items = (await offlineDb.outbox.orderBy("createdAt").toArray()).filter(
    (i) => i.userId === userId && i.status === "pending",
  );

  for (const item of items) {
    if (!navigator.onLine) break;

    const payload = { ...item.payload };

    // Swap a local job id for the real one once the job has uploaded
    if (isLocalId(payload.jobId)) {
      const mapped = await offlineDb.idMap.get(payload.jobId);
      if (!mapped) {
        const parent = await offlineDb.outbox.get(payload.jobId);
        if (!parent || parent.status === "failed") {
          await offlineDb.outbox.update(item.id, {
            status: "failed",
            error: "The job for this entry couldn't be uploaded.",
          });
          failed++;
        }
        continue;
      }
      payload.jobId = mapped.serverId;
    }

    // Upload photos / signature first (files are named by item id, so retries reuse them)
    let body: Record<string, unknown>;
    try {
      body = await prepareEvidence(item.type, payload, item.id);
    } catch (err) {
      if (err instanceof UploadRejectedError) {
        await offlineDb.outbox.update(item.id, {
          status: "failed",
          attempts: item.attempts + 1,
          error: err.message,
        });
        failed++;
        continue;
      }
      break; // signal dropped, try again later
    }

    let res: Response;
    try {
      res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          clientId: item.id,
          userId,
          type: item.type,
          payload: body,
        }),
      });
    } catch {
      break; // signal dropped, try again later
    }

    if (res.status === 401) {
      return {
        synced,
        failed,
        remaining: await pendingCount(userId),
        authError: true,
      };
    }

    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      if (item.type === "job")
        await offlineDb.idMap.put({ localId: item.id, serverId: id });
      await offlineDb.outbox.delete(item.id);
      synced++;
    } else if (res.status >= 500 || res.status === 409) {
      await offlineDb.outbox.update(item.id, { attempts: item.attempts + 1 });
      break; // temporary problem, keep it waiting
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      await offlineDb.outbox.update(item.id, {
        status: "failed",
        attempts: item.attempts + 1,
        error: data.error ?? "Couldn't upload this entry.",
      });
      failed++;
    }
  }

  return { synced, failed, remaining: await pendingCount(userId) };
}

export async function retryItem(id: string) {
  const item = await offlineDb.outbox.get(id);
  if (!item) return;
  await offlineDb.outbox.update(id, { status: "pending", error: undefined });
  // Also retry anything that failed only because this job hadn't uploaded
  if (item.type === "job") {
    await offlineDb.outbox
      .where("jobRef")
      .equals(id)
      .modify({ status: "pending", error: undefined });
  }
  return syncOutbox();
}

export async function discardItem(id: string) {
  const item = await offlineDb.outbox.get(id);
  if (!item) return;
  if (item.type === "job")
    await offlineDb.outbox.where("jobRef").equals(id).delete();
  await offlineDb.outbox.delete(id);
}
