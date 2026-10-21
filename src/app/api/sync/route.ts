// File: src/app/api/sync/route.ts
// (REPLACE the whole file)

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getSyncReceipt, saveSyncReceipt } from "@/lib/data";
import {
  createDamageFor,
  createJobFor,
  createPreDamageFor,
  createReviewFor,
  createUpsellFor,
  setOnTimeFor,
  type ServiceResult,
} from "@/lib/services/driver";
import { createPreTripFor, createWashFor } from "@/lib/services/fleet";

const bodySchema = z.object({
  clientId: z.string().min(8).max(80),
  userId: z.string().min(1),
  type: z.enum([
    "job",
    "pre_damage",
    "damage",
    "review",
    "upsell",
    "on_time",
    "pre_trip",
    "wash",
  ]),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "driver") {
    return NextResponse.json(
      { error: "Please log in again to upload saved entries." },
      { status: 401 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  // Entry was saved by a different driver on this phone. Keep it waiting for them.
  if (body.userId !== user.id) {
    return NextResponse.json(
      { error: "This entry belongs to another driver." },
      { status: 409 },
    );
  }

  // Already uploaded (e.g. signal dropped before the phone got our reply)
  const receipt = await getSyncReceipt(body.clientId);
  if (receipt) return NextResponse.json(receipt);

  let res: ServiceResult;
  switch (body.type) {
    case "job":
      res = await createJobFor(user, body.payload);
      break;
    case "pre_damage":
      res = await createPreDamageFor(user, body.payload, { offline: true });
      break;
    case "damage":
      res = await createDamageFor(user, body.payload);
      break;
    case "review":
      res = await createReviewFor(user, body.payload);
      break;
    case "upsell":
      res = await createUpsellFor(user, body.payload);
      break;
    case "on_time":
      res = await setOnTimeFor(user, body.payload);
      break;
    case "pre_trip": {
      const r = await createPreTripFor(user, body.payload, { offline: true });
      res = r.ok ? { ok: true, id: r.id, jobId: "" } : r;
      break;
    }
    case "wash": {
      const r = await createWashFor(user, body.payload, { offline: true });
      res = r.ok ? { ok: true, id: r.id, jobId: "" } : r;
      break;
    }
  }

  if (!res.ok) {
    const message =
      res.error ??
      Object.values(res.fieldErrors ?? {})[0] ??
      "Couldn't upload this entry.";
    return NextResponse.json(
      { error: message, fieldErrors: res.fieldErrors },
      { status: 422 },
    );
  }

  const result = { id: res.id };
  await saveSyncReceipt(body.clientId, user.id, result);
  return NextResponse.json(result);
}
