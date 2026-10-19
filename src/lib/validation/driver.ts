// File: src/lib/validation/driver.ts
// (REPLACE the whole file)

import { z } from "zod";
import { MAX_PHOTOS } from "@/lib/constants";

export function toFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const jobSchema = z.object({
  jobNumber: z.string().trim().min(1, "Job number is required").max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  originCity: z.string().trim().min(1, "Origin city is required"),
  originState: z.string().length(2, "Select a state"),
  destCity: z.string().trim().min(1, "Destination city is required"),
  destState: z.string().length(2, "Select a state"),
  crewIds: z.array(z.string()),
  deliveredBy: z.enum(["drs", "partner"]),
  onTimePickup: z.boolean().nullable(),
  onTimeDelivery: z.boolean().nullable(),
});
export type NewJobInput = z.infer<typeof jobSchema>;

export const preDamageSchema = z.object({
  jobId: z.string().min(1),
  item: z.string().trim().min(1, "Item is required").max(120),
  location: z.string().trim().min(1, "Location on item is required").max(120),
  description: z.string().trim().min(1, "Describe the damage").max(1000),
  photos: z
    .array(z.string().startsWith("data:image/"))
    .min(1, "Add at least 1 photo")
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos`),
  notes: z.string().trim().max(1000).optional(),
  customerShown: z
    .boolean()
    .refine((v) => v, "Confirm the customer was shown the damage"),
  customerName: z
    .string()
    .trim()
    .min(2, "Customer printed name is required")
    .max(120),
  signature: z
    .string()
    .startsWith("data:image/", "Customer signature is required"),
  capturedAtDevice: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type PreDamageInput = z.infer<typeof preDamageSchema>;

export const damageSchema = z.object({
  jobId: z.string().min(1),
  item: z.string().trim().min(1, "Item is required").max(120),
  description: z.string().trim().min(1, "Describe what happened").max(1000),
  photos: z
    .array(z.string().startsWith("data:image/"))
    .min(1, "Add at least 1 photo")
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos`),
  claimFiled: z.boolean({ message: "Select yes or no" }),
  estimatedCost: z
    .number({ message: "Enter an estimated cost" })
    .min(0, "Cost can't be negative")
    .max(1_000_000),
});
export type DamageInput = z.infer<typeof damageSchema>;

export const reviewSchema = z
  .object({
    jobId: z.string().min(1),
    platform: z.enum(["google", "bbb", "trustpilot", "facebook", "other"], {
      message: "Select a platform",
    }),
    stars: z.number().int().min(1, "Select a star rating").max(5),
    driverMentioned: z.boolean({ message: "Select yes or no" }),
    link: z
      .string()
      .trim()
      .url("Enter a valid link")
      .optional()
      .or(z.literal("")),
    screenshot: z
      .string()
      .startsWith("data:image/")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => !!d.link || !!d.screenshot, {
    message: "Add a link or a screenshot",
    path: ["link"],
  });
export type ReviewInput = z.infer<typeof reviewSchema>;

export const upsellSchema = z.object({
  jobId: z.string().min(1),
  type: z.enum(["packing", "storage", "materials", "other"], {
    message: "Select an upsell type",
  }),
  amount: z
    .number({ message: "Enter an amount" })
    .positive("Amount must be more than $0")
    .max(1_000_000),
});
export type UpsellInput = z.infer<typeof upsellSchema>;

export const onTimeSchema = z.object({
  jobId: z.string().min(1),
  field: z.enum(["pickup", "delivery"]),
  value: z.boolean(),
});
export type OnTimeInput = z.infer<typeof onTimeSchema>;

/* ---------- Server-side versions (images already uploaded to storage) ---------- */
const storagePath = z.string().min(1).max(300);

export const preDamageServerSchema = preDamageSchema.extend({
  photos: z
    .array(storagePath)
    .min(1, "Add at least 1 photo")
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos`),
  signature: storagePath,
});
export type PreDamageServerInput = z.infer<typeof preDamageServerSchema>;

export const damageServerSchema = damageSchema.extend({
  photos: z
    .array(storagePath)
    .min(1, "Add at least 1 photo")
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos`),
});
export type DamageServerInput = z.infer<typeof damageServerSchema>;

export const reviewServerSchema = z
  .object({
    jobId: z.string().min(1),
    platform: z.enum(["google", "bbb", "trustpilot", "facebook", "other"], {
      message: "Select a platform",
    }),
    stars: z.number().int().min(1, "Select a star rating").max(5),
    driverMentioned: z.boolean({ message: "Select yes or no" }),
    link: z
      .string()
      .trim()
      .url("Enter a valid link")
      .optional()
      .or(z.literal("")),
    screenshot: storagePath.optional().or(z.literal("")),
  })
  .refine((d) => !!d.link || !!d.screenshot, {
    message: "Add a link or a screenshot",
    path: ["link"],
  });
export type ReviewServerInput = z.infer<typeof reviewServerSchema>;
