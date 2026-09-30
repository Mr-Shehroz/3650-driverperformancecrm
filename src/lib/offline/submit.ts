"use client";

import type { z } from "zod";
import { toFieldErrors } from "@/lib/validation/driver";
import { enqueue, isLocalId } from "./queue";
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
}): Promise<SubmitResult> {
  // Check on the phone first so bad data never sits in the queue
  const parsed = opts.schema.safeParse(opts.payload);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const data = parsed.data as Record<string, unknown>;
  const mustQueue = !navigator.onLine || isLocalId(data.jobId);

  if (!mustQueue) {
    try {
      return await opts.online(parsed.data);
    } catch (err) {
      // Network failure → fall through and save on the phone
      if (!(err instanceof TypeError)) throw err;
    }
  }

  try {
    await enqueue(opts.type, data, {
      label: opts.label,
      jobRef: opts.jobRef,
      id: opts.localId,
    });
  } catch {
    return { error: "Couldn't save on this phone. Please try again." };
  }
  opts.afterQueue();
  return { queued: true };
}
