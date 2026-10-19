// File: src/lib/mock/data.ts
// (REPLACE the whole file)

import type { Lead, LeadCost, LeadSourceRow } from "@/types";

/**
 * Sample sales data until Granot is connected (moves to the database with the sales step).
 * Jobs, evidence, fleet, audit log, settings and users now live in Supabase.
 */
/* ---------- Sales (sample data until Granot is connected) ---------- */
export const leadSources: LeadSourceRow[] = [
  {
    id: "src-google-ppc",
    name: "Google PPC",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "src-tv-ad",
    name: "TV Ad",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "src-google-lead",
    name: "Google Lead",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "src-direct",
    name: "Direct",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "src-referral",
    name: "Referral",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "src-yelp",
    name: "Yelp",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
];

/** Weekly cost per source. Sample weeks are filled in on first use. */
export const leadCosts: LeadCost[] = [];

/** Sample leads are generated for the real sales reps on first use. */
export const leads: Lead[] = [];

export const sampleState = {
  costsSeeded: false,
  seededReps: [] as string[],
};
