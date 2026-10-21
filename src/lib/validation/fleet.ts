// File: src/lib/validation/fleet.ts
// (REPLACE the whole file)

import { z } from "zod";

/** Field errors keyed by full path, e.g. "items.2.notes" */
export function toPathErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const CONDITION_LABELS = {
  front: "front",
  rear: "rear",
  driver_side: "driver side",
  passenger_side: "passenger side",
  cab: "cab interior",
} as const;

/** The 5 required condition photos, built from one rule per photo */
function conditionPhotosSchema(photo: (label: string) => z.ZodString) {
  return z.object({
    front: photo(CONDITION_LABELS.front),
    rear: photo(CONDITION_LABELS.rear),
    driver_side: photo(CONDITION_LABELS.driver_side),
    passenger_side: photo(CONDITION_LABELS.passenger_side),
    cab: photo(CONDITION_LABELS.cab),
  });
}

const dataPhoto = (label: string) =>
  z
    .string({ message: `Add the ${label} photo` })
    .startsWith("data:image/", `Add the ${label} photo`);

export const preTripSchema = z
  .object({
    truckId: z.string().min(1, "Choose a truck"),
    odometer: z
      .number({ message: "Enter the odometer reading" })
      .int()
      .min(0)
      .max(5_000_000),
    items: z
      .array(
        z.object({
          key: z.enum([
            "tires",
            "fluids",
            "lights",
            "brakes",
            "mirrors",
            "equipment",
          ]),
          status: z.enum(["ok", "attention"], {
            message: "Mark OK or Needs attention",
          }),
          notes: z.string().trim().max(500).optional(),
          photos: z
            .array(z.string().startsWith("data:image/"))
            .max(3, "Up to 3 photos"),
        }),
      )
      .length(6),
    conditionPhotos: conditionPhotosSchema(dataPhoto),
    truckStatus: z.enum(["safe", "repair_soon", "do_not_drive"], {
      message: "Choose the truck status",
    }),
    notes: z.string().trim().max(1000).optional(),
    signature: z
      .string()
      .startsWith("data:image/", "Your signature is required"),
    capturedAtDevice: z.string().min(1),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  })
  .superRefine((d, ctx) => {
    d.items.forEach((it, i) => {
      if (it.status === "attention" && !it.notes) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "notes"],
          message: "Describe the problem",
        });
      }
    });
  });

export type PreTripInput = z.infer<typeof preTripSchema>;

export const roadsideSchema = z
  .object({
    driverId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    state: z.string().length(2, "Choose a state"),
    location: z.string().trim().min(2, "Enter the city or location").max(120),
    truckId: z.string().min(1, "Choose a truck"),
    result: z.enum(["clean", "violations", "out_of_service"], {
      message: "Choose the result",
    }),
    violationNotes: z.string().trim().max(1000).optional(),
    report: z
      .object({
        name: z.string().min(1).max(200),
        type: z.enum(["image", "pdf"]),
        /** Already uploaded to private storage */
        path: z.string().min(1).max(300),
      })
      .nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.result !== "clean" && !d.violationNotes) {
      ctx.addIssue({
        code: "custom",
        path: ["violationNotes"],
        message: "Describe the violations",
      });
    }
  });

export type RoadsideInput = z.infer<typeof roadsideSchema>;

export const scoringSchema = z.object({
  baseScore: z.number().int().min(0, "0 or more").max(1000),
  clean: z.number().int().min(0, "Use 0 or a positive number").max(100),
  violations: z.number().int().min(-100).max(0, "Use 0 or a negative number"),
  outOfService: z.number().int().min(-200).max(0, "Use 0 or a negative number"),
  washIntervalDays: z
    .number()
    .int()
    .min(1, "At least 1 day")
    .max(365, "Up to 365 days"),
  overdueWash: z.number().int().min(-100).max(0, "Use 0 or a negative number"),
});

/* ---------- Server-side pre-trip (photos and signature already uploaded) ---------- */
const storagePath = z.string().min(1).max(300);
const storedPhoto = (label: string) =>
  z
    .string({ message: `Add the ${label} photo` })
    .min(1, `Add the ${label} photo`)
    .max(300);

export const preTripServerSchema = z
  .object({
    truckId: z.string().min(1, "Choose a truck"),
    odometer: z
      .number({ message: "Enter the odometer reading" })
      .int()
      .min(0)
      .max(5_000_000),
    items: z
      .array(
        z.object({
          key: z.enum([
            "tires",
            "fluids",
            "lights",
            "brakes",
            "mirrors",
            "equipment",
          ]),
          status: z.enum(["ok", "attention"], {
            message: "Mark OK or Needs attention",
          }),
          notes: z.string().trim().max(500).optional(),
          photos: z.array(storagePath).max(3, "Up to 3 photos"),
        }),
      )
      .length(6),
    conditionPhotos: conditionPhotosSchema(storedPhoto),
    truckStatus: z.enum(["safe", "repair_soon", "do_not_drive"], {
      message: "Choose the truck status",
    }),
    notes: z.string().trim().max(1000).optional(),
    signature: storagePath,
    capturedAtDevice: z.string().min(1),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  })
  .superRefine((d, ctx) => {
    d.items.forEach((it, i) => {
      if (it.status === "attention" && !it.notes) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "notes"],
          message: "Describe the problem",
        });
      }
    });
  });
export type PreTripServerInput = z.infer<typeof preTripServerSchema>;

/* ---------- Truck wash ---------- */
export const washSchema = z.object({
  truckId: z.string().min(1, "Choose a truck"),
  photo: z
    .string({ message: "Add a photo of the clean truck" })
    .startsWith("data:image/", "Add a photo of the clean truck"),
  receipt: z.string().startsWith("data:image/").optional(),
  notes: z.string().trim().max(500).optional(),
  capturedAtDevice: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type WashInput = z.infer<typeof washSchema>;

export const washServerSchema = z.object({
  truckId: z.string().min(1, "Choose a truck"),
  photo: z
    .string({ message: "Add a photo of the clean truck" })
    .min(1)
    .max(300),
  receipt: storagePath.optional(),
  notes: z.string().trim().max(500).optional(),
  capturedAtDevice: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type WashServerInput = z.infer<typeof washServerSchema>;

export const assignDriverSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}$/i)
  .nullable();
