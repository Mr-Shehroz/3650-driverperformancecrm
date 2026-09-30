import { z } from "zod";

export const passwordRule = z.string().min(6, "Use at least 6 characters");

export const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] =
  [{ label: "At least 6 characters", test: (v) => v.length >= 6 }];
