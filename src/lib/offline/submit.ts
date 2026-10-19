// File: src/lib/offline/submit.ts
// (REPLACE the whole file)

"use client";

import type { z } from "zod";
import { toFieldErrors } from "@/lib/validation/driver";
import { toPathErrors } from "@/lib/validation/fleet";
import { enqueue, isLocalId } from "./queue";
import {
  OfflineUploadError,
  prepareEvidence,
  UploadRejectedError,
} from "@/lib/evidence/upload";
import type { OutboxType } from "./db";

type ActionLike = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | void;
export type SubmitResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  queued?: boolean;
} | void;

/** Opens the offline app at a driver path (works with or without signal) */
export function openOfflinePath(path: string) {
  window.location.assign(`/driver-offline#${path}`);
}

export async function submitOrQueue<S extends z.ZodType>(opts: {
  type: OutboxType;
  schema: S;
  payload: unknown;
  online: (data: z.infer<S>) => Promise<ActionLike>;
  label: string;
  jobRef: string;
  localId?: string;
  afterQueue: () => void;
  /** "path" gives keys like "items.2.notes" (for forms with lists) */
  errorKeys?: "first" | "path";
}): Promise<SubmitResult> {
  // Check on the phone first so bad data never sits in the queue
  const parsed = opts.schema.safeParse(opts.payload);
  if (!parsed.success) {
    return {
      fieldErrors:
        opts.errorKeys === "path"
          ? toPathErrors(parsed.error)
          : toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data as Record<string, unknown>;
  const mustQueue = !navigator.onLine || isLocalId(data.jobId);
  // Same key online and in the queue, so photos already uploaded are reused on retry
  const key = opts.localId ?? crypto.randomUUID();

  if (!mustQueue) {
    try {
      // Photos and signatures go straight to private storage; the server gets file paths
      const prepared = await prepareEvidence(opts.type, data, key);
      return await opts.online(prepared as z.infer<S>);
    } catch (err) {
      if (err instanceof UploadRejectedError) return { error: err.message };
      // No signal (upload or save failed to connect) → save on the phone instead
      if (!(err instanceof OfflineUploadError) && !(err instanceof TypeError))
        throw err;
    }
  }

  try {
    await enqueue(opts.type, data, {
      label: opts.label,
      jobRef: opts.jobRef,
      id: key,
    });
  } catch {
    return { error: "Couldn't save on this phone. Please try again." };
  }
  opts.afterQueue();
  return { queued: true };
}
