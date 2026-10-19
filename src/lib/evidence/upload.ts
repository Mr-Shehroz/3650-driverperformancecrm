// File: src/lib/evidence/upload.ts
// (REPLACE the whole file)

"use client";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import {
  EVIDENCE_BUCKET,
  FLEET_BUCKET,
  evidencePath,
  fleetPath,
  type EvidenceKind,
} from "./paths";

/** Upload failed because there is no signal. The entry should wait in the queue. */
export class OfflineUploadError extends Error {
  constructor() {
    super("No connection");
    this.name = "OfflineUploadError";
  }
}

/** Upload was refused (e.g. not allowed, bad file). Retrying won't help. */
export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadRejectedError";
  }
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: "jpg" | "png" } {
  const [head, body] = dataUrl.split(",", 2);
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const ext = mime === "image/png" ? "png" : "jpg";
  return {
    blob: new Blob([arr], { type: ext === "png" ? "image/png" : "image/jpeg" }),
    ext,
  };
}

/**
 * Puts one file in private storage. Uploading the same path twice
 * (e.g. after a dropped connection) reuses the file that is already there.
 */
async function putFile(bucket: string, path: string, blob: Blob) {
  if (!navigator.onLine) throw new OfflineUploadError();

  type UploadError = { message: string; statusCode?: string };
  let error: UploadError | null;
  try {
    const res = await createClient().storage.from(bucket).upload(path, blob, {
      contentType: blob.type,
      upsert: false, // files can never be replaced
      cacheControl: "31536000",
    });
    error = res.error as UploadError | null;
  } catch {
    throw new OfflineUploadError();
  }

  if (error) {
    // Already uploaded on an earlier try: that's fine
    if (/exists|duplicate/i.test(error.message) || error.statusCode === "409")
      return path;
    // Network-type failures
    if (/fetch|network|timeout|load failed/i.test(error.message))
      throw new OfflineUploadError();
    throw new UploadRejectedError(
      "A file couldn't be uploaded. Please try again.",
    );
  }
  return path;
}

async function uploadDataUrl(
  bucket: string,
  pathWithoutExt: string,
  dataUrl: string,
) {
  const { blob, ext } = dataUrlToBlob(dataUrl);
  return putFile(bucket, `${pathWithoutExt}.${ext}`, blob);
}

/** The signed-in user's id, read from the saved session (no network needed) */
async function currentUserId() {
  const { data } = await createClient().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new UploadRejectedError("Please log in again to upload.");
  return id;
}

const isDataUrl = (v: unknown): v is string =>
  typeof v === "string" && v.startsWith("data:image/");

/* ---------- Job evidence ---------- */
async function uploadJobImages(
  jobId: string,
  kind: EvidenceKind,
  key: string,
  list: string[],
) {
  const out: string[] = [];
  // One at a time: kinder to weak signal than 5 parallel uploads
  for (let i = 0; i < list.length; i++) {
    const base = evidencePath(jobId, kind, `${key}-photo${i + 1}`);
    out.push(await uploadDataUrl(EVIDENCE_BUCKET, base, list[i]));
  }
  return out;
}

/**
 * Turns a form payload (images as data URLs) into what the server expects
 * (images uploaded to private storage, sent as file paths).
 * `key` must be unique per entry and stable across retries.
 */
export async function prepareEvidence(
  type: string,
  payload: Record<string, unknown>,
  key: string,
): Promise<Record<string, unknown>> {
  const jobId = String(payload.jobId ?? "");
  const out = { ...payload };

  if (type === "pre_damage") {
    const photos = (payload.photos as unknown[]) ?? [];
    out.photos = await uploadJobImages(
      jobId,
      "pre_damage",
      key,
      photos.filter(isDataUrl),
    );
    if (isDataUrl(payload.signature)) {
      out.signature = await uploadDataUrl(
        EVIDENCE_BUCKET,
        evidencePath(jobId, "pre_damage", `${key}-signature`),
        payload.signature,
      );
    }
  } else if (type === "damage") {
    const photos = (payload.photos as unknown[]) ?? [];
    out.photos = await uploadJobImages(
      jobId,
      "damage",
      key,
      photos.filter(isDataUrl),
    );
  } else if (type === "review") {
    if (isDataUrl(payload.screenshot)) {
      out.screenshot = await uploadDataUrl(
        EVIDENCE_BUCKET,
        evidencePath(jobId, "review", `${key}-screenshot`),
        payload.screenshot,
      );
    }
  } else if (type === "pre_trip") {
    const uid = await currentUserId();
    const items =
      (payload.items as { key: string; photos?: unknown[] }[]) ?? [];
    const uploaded = [];
    for (const item of items) {
      const photos = (item.photos ?? []).filter(isDataUrl);
      const paths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        paths.push(
          await uploadDataUrl(
            FLEET_BUCKET,
            fleetPath("pre_trip", uid, `${key}-${item.key}${i + 1}`),
            photos[i],
          ),
        );
      }
      uploaded.push({ ...item, photos: paths });
    }
    out.items = uploaded;
    if (isDataUrl(payload.signature)) {
      out.signature = await uploadDataUrl(
        FLEET_BUCKET,
        fleetPath("pre_trip", uid, `${key}-signature`),
        payload.signature,
      );
    }
  }

  return out;
}

/* ---------- Roadside inspection report (online only) ---------- */
export type UploadedReport = {
  name: string;
  type: "image" | "pdf";
  path: string;
  preview?: string;
};

/** Uploads a roadside report (PDF or photo) and returns where it was saved */
export async function uploadRoadsideReport(
  file: File,
): Promise<UploadedReport> {
  const uid = await currentUserId();
  const id = crypto.randomUUID();

  if (file.type === "application/pdf") {
    const path = await putFile(
      FLEET_BUCKET,
      fleetPath("roadside", uid, `${id}.pdf`),
      file,
    );
    return { name: file.name, type: "pdf", path };
  }
  if (file.type.startsWith("image/")) {
    const dataUrl = await compressImage(file);
    const path = await uploadDataUrl(
      FLEET_BUCKET,
      fleetPath("roadside", uid, id),
      dataUrl,
    );
    return { name: file.name, type: "image", path, preview: dataUrl };
  }
  throw new UploadRejectedError("Upload a PDF or a photo.");
}
