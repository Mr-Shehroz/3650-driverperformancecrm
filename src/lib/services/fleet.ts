// File: src/lib/services/fleet.ts
// (REPLACE the whole file)

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  createPreTrip,
  createRoadside,
  createWash,
  getTruck,
  getUserById,
} from "@/lib/data";
import {
  preTripServerSchema,
  roadsideSchema,
  toPathErrors,
  washServerSchema,
} from "@/lib/validation/fleet";
import { isFleetPathFor } from "@/lib/evidence/paths";
import { sendDoNotDriveAlert } from "@/lib/email/alerts";
import type { User } from "@/types";

export type FleetServiceResult =
  | { ok: true; id: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function refresh() {
  revalidatePath("/driver", "layout");
  revalidatePath("/admin", "layout");
}

function fail(err: unknown): FleetServiceResult {
  console.error(err);
  return { ok: false, error: "Couldn't save. Please try again." };
}

/** Used by the online form and by offline sync */
export async function createPreTripFor(
  user: User,
  raw: unknown,
  opts: { offline?: boolean } = {},
): Promise<FleetServiceResult> {
  const parsed = preTripServerSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toPathErrors(parsed.error) };
  const d = parsed.data;

  const truck = await getTruck(d.truckId);
  if (!truck || !truck.active)
    return { ok: false, fieldErrors: { truckId: "Choose an active truck" } };

  // Every file must be in this driver's own folder
  const washPaths = d.washed
    ? [d.washPhoto, d.washReceipt].filter((p): p is string => !!p)
    : [];
  const paths = [
    d.signature,
    ...d.items.flatMap((i) => i.photos),
    ...Object.values(d.conditionPhotos),
    ...washPaths,
  ];
  if (!paths.every((p) => isFleetPathFor(p, "pre_trip", user.id))) {
    return {
      ok: false,
      error: "Photos didn't upload correctly. Please try again.",
    };
  }

  try {
    const rec = await createPreTrip({
      truckId: truck.id,
      driverId: user.id,
      items: d.items.map((i) => ({ ...i, notes: i.notes || undefined })),
      conditionPhotos: d.conditionPhotos,
      washed: d.washed,
      washPhotoPath: d.washed ? (d.washPhoto ?? null) : null,
      washReceiptPath: d.washed ? (d.washReceipt ?? null) : null,
      odometer: d.odometer,
      truckStatus: d.truckStatus,
      notes: d.notes || undefined,
      signaturePath: d.signature,
      capturedAtDevice: d.capturedAtDevice,
      lat: d.lat,
      lng: d.lng,
      syncedOffline: !!opts.offline,
    });
    if (d.truckStatus === "do_not_drive") {
      // Email the admins after the response is sent (never slows down or fails the save)
      after(() =>
        sendDoNotDriveAlert({
          preTripId: rec.id,
          unitNumber: truck.unitNumber,
          driverName: user.name,
          odometer: d.odometer,
          failedItems: d.items
            .filter((i) => i.status === "attention")
            .map((i) => ({ key: i.key, notes: i.notes || undefined })),
          notes: d.notes || undefined,
        }),
      );
    }
    refresh();
    return { ok: true, id: rec.id };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Drivers log their own inspections. Admins choose the driver.
 * The report file was uploaded by whoever is logging it.
 */
export async function createRoadsideFor(
  user: User,
  raw: unknown,
): Promise<FleetServiceResult> {
  const parsed = roadsideSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toPathErrors(parsed.error) };
  const d = parsed.data;

  let driverId = user.id;
  if (user.role === "admin") {
    const driver = d.driverId ? await getUserById(d.driverId) : null;
    if (!driver || driver.role !== "driver")
      return { ok: false, fieldErrors: { driverId: "Choose a driver" } };
    driverId = driver.id;
  }

  const truck = await getTruck(d.truckId);
  if (!truck) return { ok: false, fieldErrors: { truckId: "Choose a truck" } };

  if (d.report && !isFleetPathFor(d.report.path, "roadside", user.id)) {
    return {
      ok: false,
      error: "The report didn't upload correctly. Please try again.",
    };
  }

  try {
    const rec = await createRoadside({
      driverId,
      truckId: truck.id,
      date: d.date,
      state: d.state,
      location: d.location,
      result: d.result,
      violationNotes: d.violationNotes || undefined,
      report: d.report,
    });
    refresh();
    return { ok: true, id: rec.id };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Old separate "Mark truck washed" form. Washes are now logged inside the pre-trip;
 * this stays only so washes already saved offline on a phone still upload.
 */
export async function createWashFor(
  user: User,
  raw: unknown,
  opts: { offline?: boolean } = {},
): Promise<FleetServiceResult> {
  const parsed = washServerSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fieldErrors: toPathErrors(parsed.error) };
  const d = parsed.data;

  const truck = await getTruck(d.truckId);
  if (!truck || !truck.active)
    return { ok: false, fieldErrors: { truckId: "Choose an active truck" } };

  const paths = [d.photo, ...(d.receipt ? [d.receipt] : [])];
  if (!paths.every((p) => isFleetPathFor(p, "wash", user.id))) {
    return {
      ok: false,
      error: "Photos didn't upload correctly. Please try again.",
    };
  }

  try {
    const rec = await createWash({
      truckId: truck.id,
      driverId: user.id,
      photoPath: d.photo,
      receiptPath: d.receipt ?? null,
      notes: d.notes || undefined,
      capturedAtDevice: d.capturedAtDevice,
      lat: d.lat,
      lng: d.lng,
      syncedOffline: !!opts.offline,
    });
    refresh();
    return { ok: true, id: rec.id };
  } catch (err) {
    return fail(err);
  }
}
