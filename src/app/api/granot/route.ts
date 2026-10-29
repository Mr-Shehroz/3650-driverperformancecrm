// File: src/app/api/granot/webhook/route.ts
// (NEW file)

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleGranotEvent } from "@/lib/services/granot";

/*
 * Granot posts lead events here (new lead, booking/unbooking, priority update).
 * URL:    https://<your-domain>/api/granot/webhook
 * Header: token=<GRANOT_WEBHOOK_TOKEN>   (a ?token=... in the URL also works)
 */

export const dynamic = "force-dynamic";

function tokenOk(req: NextRequest) {
  const expected = process.env.GRANOT_WEBHOOK_TOKEN ?? "";
  if (expected.length < 20) return false; // not set up yet
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const given =
    req.headers.get("token") ??
    req.headers.get("x-granot-token") ??
    bearer ??
    req.nextUrl.searchParams.get("token") ??
    "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Granot sends form fields (key=value); JSON also works */
async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = await req.json();
    return json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  }
  if (type.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries(
      Array.from(form.entries()).map(([k, v]) => [
        k,
        typeof v === "string" ? v : v.name,
      ]),
    );
  }
  const text = await req.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      /* fall through to key=value */
    }
  }
  // "a=1&b=2", or one "key=value" per line
  const params = new URLSearchParams(
    trimmed.includes("&") ? trimmed : trimmed.split(/\r?\n/).join("&"),
  );
  return Object.fromEntries(params.entries());
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't read the request" },
      { status: 400 },
    );
  }
  if (!Object.keys(body).length) {
    return NextResponse.json(
      { ok: false, error: "Empty request" },
      { status: 400 },
    );
  }

  const res = await handleGranotEvent(body);
  // Always 200 once saved: problems are shown to admin on the Granot Sync page
  return NextResponse.json({ ok: true, id: res.id, status: res.status });
}

/** Quick check that the URL is reachable (no data is shown) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Granot webhook is ready. Send events with POST.",
  });
}
