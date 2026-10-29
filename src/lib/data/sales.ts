// File: src/lib/data/sales.ts
// (REPLACE the whole file)

import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { shiftWeek, weekStartOf } from "@/lib/weeks";
import { getReps, getUserById } from "./users";
import type {
  DateRange,
  Lead,
  LeadCost,
  LeadSourceRow,
  RepMetrics,
  SalesMonthlyPoint,
  SourceBreakdownRow,
} from "@/types";
import type { Database } from "@/types/supabase";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

const pct = (a: number, b: number) => (b === 0 ? 0 : a / b);

/* =========================================================
   Lead sources
   ========================================================= */
export async function getLeadSources(
  includeInactive = true,
): Promise<LeadSourceRow[]> {
  const sb = await createClient();
  let q = sb.from("lead_sources").select("id, name, active, created_at");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? [])
    .map((s) => ({
      id: s.id,
      name: s.name,
      active: s.active,
      createdAt: s.created_at,
    }))
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
    );
}

export async function leadSourceNameExists(name: string, excludeId?: string) {
  const sb = await createClient();
  const exact = name.trim().replace(/[\\%_]/g, (m) => `\\${m}`); // exact text, ignoring case
  let q = sb.from("lead_sources").select("id").ilike("name", exact);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.limit(1);
  return !!data?.length;
}

export async function createLeadSource(name: string): Promise<LeadSourceRow> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("lead_sources")
    .insert({ name: name.trim() })
    .select("id, name, active, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    active: data.active,
    createdAt: data.created_at,
  };
}

export async function renameLeadSource(
  id: string,
  name: string,
): Promise<LeadSourceRow | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("lead_sources")
    .update({ name: name.trim() })
    .eq("id", id)
    .select("id, name, active, created_at")
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        name: data.name,
        active: data.active,
        createdAt: data.created_at,
      }
    : null;
}

export async function setLeadSourceActive(
  id: string,
  active: boolean,
): Promise<LeadSourceRow | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("lead_sources")
    .update({ active })
    .eq("id", id)
    .select("id, name, active, created_at")
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        name: data.name,
        active: data.active,
        createdAt: data.created_at,
      }
    : null;
}

/* =========================================================
   Leads + metrics (reps only see their own leads; the database enforces it)
   ========================================================= */
const LEAD_COLS =
  "id, granot_id, date, rep_id, source_id, lead_cost, cost_overridden, status, booked_date, job_value, is_sample";

const toLead = (
  l: Pick<
    LeadRow,
    | "id"
    | "granot_id"
    | "date"
    | "rep_id"
    | "source_id"
    | "lead_cost"
    | "cost_overridden"
    | "status"
    | "booked_date"
    | "job_value"
    | "is_sample"
  >,
): Lead => ({
  id: l.id,
  granotId: l.granot_id,
  date: l.date,
  repId: l.rep_id ?? "",
  sourceId: l.source_id,
  leadCost: Number(l.lead_cost),
  costOverridden: l.cost_overridden,
  status: l.status,
  bookedDate: l.booked_date,
  jobValue: l.job_value === null ? null : Number(l.job_value),
  isSample: l.is_sample,
});

export async function getLeads(
  opts: {
    repId?: string;
    range?: DateRange;
    sourceId?: string;
    status?: string;
  } = {},
): Promise<Lead[]> {
  const sb = await createClient();
  let q = sb.from("leads").select(LEAD_COLS);
  if (opts.repId) q = q.eq("rep_id", opts.repId);
  if (opts.sourceId) q = q.eq("source_id", opts.sourceId);
  if (opts.status === "open" || opts.status === "booked")
    q = q.eq("status", opts.status);
  if (opts.range?.from) q = q.gte("date", opts.range.from);
  if (opts.range?.to) q = q.lte("date", opts.range.to);
  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map(toLead);
}

function summarizeLeads(leads: Lead[]) {
  const booked = leads.filter((l) => l.status === "booked");
  const totalLeadCost = leads.reduce((s, l) => s + l.leadCost, 0);
  return {
    leads: leads.length,
    booked: booked.length,
    closingRatio: pct(booked.length, leads.length),
    totalLeadCost,
    cpa: pct(totalLeadCost, booked.length),
    revenue: booked.reduce((s, l) => s + (l.jobValue ?? 0), 0),
  };
}

export async function getRepMetrics(
  repId: string,
  opts: { range?: DateRange; sourceId?: string } = {},
  repName?: string,
): Promise<RepMetrics> {
  const [name, leads] = await Promise.all([
    repName
      ? Promise.resolve(repName)
      : getUserById(repId).then((u) => u?.name ?? "Unknown"),
    getLeads({ repId, ...opts }),
  ]);
  return { repId, repName: name, ...summarizeLeads(leads) };
}

export async function getAllRepMetrics(
  opts: { range?: DateRange; sourceId?: string } = {},
) {
  const [reps, leads] = await Promise.all([getReps(true), getLeads(opts)]);
  return reps.map((r) => ({
    repId: r.id,
    repName: r.name,
    ...summarizeLeads(leads.filter((l) => l.repId === r.id)),
  }));
}

export async function getSourceBreakdown(
  opts: { repId?: string; range?: DateRange } = {},
): Promise<SourceBreakdownRow[]> {
  const [leads, sources] = await Promise.all([
    getLeads(opts),
    getLeadSources(true),
  ]);
  const names = Object.fromEntries(sources.map((s) => [s.id, s.name]));
  const ids = Array.from(new Set(leads.map((l) => l.sourceId)));
  return ids
    .map((sourceId) => ({
      sourceId,
      sourceName: names[sourceId] ?? "Unknown",
      ...summarizeLeads(leads.filter((l) => l.sourceId === sourceId)),
    }))
    .sort((a, b) => b.leads - a.leads);
}

export async function getRepMonthlyTrend(
  repId?: string,
  months = 6,
): Promise<SalesMonthlyPoint[]> {
  const now = new Date();
  const leads = await getLeads({
    repId,
    range: {
      from: format(startOfMonth(subMonths(now, months - 1)), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    },
  });
  return Array.from({ length: months }, (_, i) => {
    const d = subMonths(now, months - 1 - i);
    const key = format(d, "yyyy-MM");
    const s = summarizeLeads(leads.filter((l) => l.date.startsWith(key)));
    return {
      month: format(d, "MMM"),
      leads: s.leads,
      booked: s.booked,
      closingRatio: Math.round(s.closingRatio * 100),
      cpa: Math.round(s.cpa),
      revenue: s.revenue,
    };
  });
}

/* =========================================================
   Weekly lead costs (week = Monday). A week without its own cost
   uses the most recent earlier week's cost.
   ========================================================= */
type CostRow = { source_id: string; week: string; cost: number; id: string };

async function getAllCosts(): Promise<CostRow[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("lead_costs")
    .select("id, source_id, week, cost")
    .order("week", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, cost: Number(c.cost) }));
}

function effectiveFrom(costs: CostRow[], sourceId: string, week: string) {
  // costs are newest first
  const row = costs.find((c) => c.source_id === sourceId && c.week <= week);
  return row
    ? { cost: row.cost, fromWeek: row.week }
    : { cost: 0, fromWeek: null as string | null };
}

/** Costs entered for this exact week */
export async function getLeadCosts(week: string): Promise<LeadCost[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("lead_costs")
    .select("id, source_id, week, cost")
    .eq("week", week);
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    sourceId: c.source_id,
    week: c.week,
    cost: Number(c.cost),
  }));
}

/** Cost in effect for each source in a week, and whether it was carried over */
export async function getEffectiveCosts(
  week: string,
): Promise<
  Record<string, { cost: number; fromWeek: string | null; carried: boolean }>
> {
  const [costs, sources] = await Promise.all([
    getAllCosts(),
    getLeadSources(true),
  ]);
  return Object.fromEntries(
    sources.map((s) => {
      const e = effectiveFrom(costs, s.id, week);
      return [s.id, { ...e, carried: e.fromWeek !== week }];
    }),
  );
}

/** Weekly cost history for every source, newest week first */
export async function getCostHistory(weeks = 16) {
  const [costs, sources] = await Promise.all([
    getAllCosts(),
    getLeadSources(true),
  ]);
  const thisWeek = weekStartOf(new Date());
  const list = Array.from({ length: weeks }, (_, i) => shiftWeek(thisWeek, -i));
  const cells: Record<
    string,
    Record<string, { cost: number; carried: boolean; set: boolean }>
  > = {};
  for (const week of list) {
    cells[week] = Object.fromEntries(
      sources.map((s) => {
        const e = effectiveFrom(costs, s.id, week);
        return [
          s.id,
          {
            cost: e.cost,
            carried: e.fromWeek !== week,
            set: e.fromWeek !== null,
          },
        ];
      }),
    );
  }
  return { weeks: list, sources, cells };
}

export async function countLeadsBySource(
  week: string,
): Promise<Record<string, number>> {
  const leads = await getLeads({
    range: { from: week, to: shiftWeek(week, 1) },
  });
  const out: Record<string, number> = {};
  leads
    .filter((l) => weekStartOf(parseISO(l.date)) === week)
    .forEach((l) => (out[l.sourceId] = (out[l.sourceId] ?? 0) + 1));
  return out;
}

/** Sets a source's cost for one week. Returns how many leads changed. */
export async function upsertLeadCost(
  sourceId: string,
  week: string,
  cost: number,
): Promise<number> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_set_weekly_cost", {
    p_source: sourceId,
    p_week: week,
    p_cost: cost,
  });
  if (error) throw error;
  return data ?? 0;
}

/** Removes a week's own cost so it falls back to the previous week's cost */
export async function removeLeadCost(
  sourceId: string,
  week: string,
): Promise<number> {
  const sb = await createClient();
  // null = remove this week's cost (the database function accepts it; generated types say number)
  const { data, error } = await sb.rpc("admin_set_weekly_cost", {
    p_source: sourceId,
    p_week: week,
    p_cost: null as unknown as number,
  });
  if (error) throw error;
  return data ?? 0;
}

/** cost = null resets the lead back to its source's weekly cost */
export async function overrideLeadCost(
  leadId: string,
  cost: number | null,
): Promise<{ id: string } | null> {
  const sb = await createClient();
  // null = back to the weekly cost (the database function accepts it; generated types say number)
  const { data, error } = await sb.rpc("admin_override_lead_cost", {
    p_lead: leadId,
    p_cost: cost as unknown as number,
  });
  if (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
  return { id: data };
}

/* =========================================================
   Sample leads (for review until Granot is connected)
   ========================================================= */
export async function countSampleLeads(): Promise<number> {
  const sb = await createClient();
  const { count } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("is_sample", true);
  return count ?? 0;
}

export async function seedSampleLeads(): Promise<number> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_seed_sample_leads");
  if (error) throw error;
  return data ?? 0;
}

export async function clearSampleLeads(): Promise<number> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_clear_sample_leads");
  if (error) throw error;
  return data ?? 0;
}

/* =========================================================
   Granot webhook log (admin only)
   ========================================================= */
export type GranotEventRow = {
  id: string;
  receivedAt: string;
  type: string;
  jobNumber: string | null;
  status: string;
  message: string | null;
  payload: Record<string, string>;
  leadId: string | null;
};

export async function getGranotEvents(limit = 100): Promise<GranotEventRow[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("granot_events")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    receivedAt: e.received_at,
    type: e.event_type,
    jobNumber: e.job_number,
    status: e.status,
    message: e.message,
    payload: (e.payload as Record<string, string>) ?? {},
    leadId: e.lead_id,
  }));
}
