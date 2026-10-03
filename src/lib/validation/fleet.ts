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
        name: z.string().min(1),
        type: z.enum(["image", "pdf"]),
        url: z.string().optional(),
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
});
