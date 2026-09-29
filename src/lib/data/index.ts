import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import * as db from "@/lib/mock/data";
import type {
  AuditEntry,
  DamageIncident,
  DateRange,
  DriverMetrics,
  Job,
  JobDetail,
  JobSummary,
  Lead,
  LeadCost,
  MonthlyPoint,
  PreDamage,
  RecordKind,
  RepMetrics,
  Review,
  Upsell,
  User,
  LeadSource,
  SalesMonthlyPoint,
  SourceBreakdownRow,
} from "@/types";

const inRange = (date: string, r?: DateRange) =>
  (!r?.from || date >= r.from) && (!r?.to || date <= r.to);

const pct = (a: number, b: number) => (b === 0 ? 0 : a / b);

const alive = (x: { deletedAt?: string | null }) => !x.deletedAt;

/* ---------- Users ---------- */
export async function getUsers(): Promise<User[]> {
  return db.users;
}
export async function getUserById(id: string): Promise<User | null> {
  return db.users.find((u) => u.id === id) ?? null;
}
export async function getUserByEmail(email: string): Promise<User | null> {
  return (
    db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}
export async function getDrivers(includeInactive = false): Promise<User[]> {
  return db.users.filter(
    (u) => u.role === "driver" && (includeInactive || u.active),
  );
}
export async function getReps(includeInactive = false): Promise<User[]> {
  return db.users.filter(
    (u) => u.role === "sales_rep" && (includeInactive || u.active),
  );
}

/* ---------- Jobs ---------- */
export async function getJobsByDriver(
  driverId: string,
  range?: DateRange,
): Promise<Job[]> {
  return db.jobs
    .filter((j) => j.driverId === driverId && inRange(j.date, range))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllJobs(range?: DateRange): Promise<Job[]> {
  return db.jobs
    .filter((j) => inRange(j.date, range))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getJobDetail(
  jobId: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<JobDetail | null> {
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  const keep = (x: { jobId: string; deletedAt?: string | null }) =>
    x.jobId === jobId && (opts.includeDeleted || alive(x));
  return {
    ...job,
    preDamages: db.preDamages.filter(keep),
    damages: db.damages.filter(keep),
    reviews: db.reviews.filter(keep),
    upsells: db.upsells.filter(keep),
  };
}

function summarize(j: Job): JobSummary {
  return {
    ...j,
    preDamageCount: db.preDamages.filter((p) => p.jobId === j.id && alive(p))
      .length,
    damageCount: db.damages.filter((d) => d.jobId === j.id && alive(d)).length,
    reviewCount: db.reviews.filter((r) => r.jobId === j.id && alive(r)).length,
    upsellTotal: db.upsells
      .filter((u) => u.jobId === j.id && alive(u))
      .reduce((s, u) => s + u.amount, 0),
  };
}

export async function getDriverJobSummaries(
  driverId: string,
  opts: { range?: DateRange; q?: string } = {},
): Promise<JobSummary[]> {
  const q = opts.q?.trim().toLowerCase();
  const jobs = (await getJobsByDriver(driverId, opts.range)).filter(
    (j) =>
      !q ||
      j.jobNumber.toLowerCase().includes(q) ||
      `${j.originCity} ${j.destCity}`.toLowerCase().includes(q),
  );
  return jobs.map(summarize);
}

export async function getAllJobSummaries(
  opts: { range?: DateRange; driverId?: string } = {},
): Promise<JobSummary[]> {
  const jobs = (await getAllJobs(opts.range)).filter(
    (j) => !opts.driverId || j.driverId === opts.driverId,
  );
  return jobs.map(summarize);
}

/* ---------- Driver metrics ---------- */
export async function getDriverMetrics(
  driverId: string,
  opts: { range?: DateRange; verifiedOnly?: boolean } = {},
): Promise<DriverMetrics> {
  const driver = db.users.find((u) => u.id === driverId);
  const jobs = db.jobs.filter(
    (j) => j.driverId === driverId && inRange(j.date, opts.range),
  );
  const jobIds = new Set(jobs.map((j) => j.id));
  const drsJobIds = new Set(
    jobs.filter((j) => j.deliveredBy === "drs").map((j) => j.id),
  );

  // Partner-delivered damage is tracked but does not count against the driver
  const dmg = db.damages.filter((d) => drsJobIds.has(d.jobId) && alive(d));
  const revs = db.reviews.filter(
    (r) =>
      jobIds.has(r.jobId) && alive(r) && (!opts.verifiedOnly || r.verified),
  );
  const ups = db.upsells.filter(
    (u) =>
      jobIds.has(u.jobId) && alive(u) && (!opts.verifiedOnly || u.verified),
  );

  const pickupKnown = jobs.filter((j) => j.onTimePickup !== null);
  const deliveryKnown = jobs.filter((j) => j.onTimeDelivery !== null);
  const upsellTotal = ups.reduce((s, u) => s + u.amount, 0);

  return {
    driverId,
    driverName: driver?.name ?? "Unknown",
    jobs: jobs.length,
    damageCount: dmg.length,
    damageCost: dmg.reduce((s, d) => s + d.estimatedCost, 0),
    damageRate: pct(dmg.length, jobs.length),
    reviewCount: revs.length,
    avgStars: revs.length
      ? revs.reduce((s, r) => s + r.stars, 0) / revs.length
      : 0,
    fiveStarRate: pct(revs.filter((r) => r.stars === 5).length, revs.length),
    upsellTotal,
    upsellAvg: pct(upsellTotal, jobs.length),
    onTimePickupRate: pickupKnown.length
      ? pct(
          pickupKnown.filter((j) => j.onTimePickup).length,
          pickupKnown.length,
        )
      : null,
    onTimeDeliveryRate: deliveryKnown.length
      ? pct(
          deliveryKnown.filter((j) => j.onTimeDelivery).length,
          deliveryKnown.length,
        )
      : null,
  };
}

export async function getAllDriverMetrics(
  opts: { range?: DateRange; verifiedOnly?: boolean } = {},
) {
  const drivers = await getDrivers(true);
  return Promise.all(drivers.map((d) => getDriverMetrics(d.id, opts)));
}

export async function getDriverMonthlyTrend(
  driverId: string,
  months = 6,
): Promise<MonthlyPoint[]> {
  const now = new Date();
  return Promise.all(
    Array.from({ length: months }, async (_, i) => {
      const d = subMonths(now, months - 1 - i);
      const m = await getDriverMetrics(driverId, {
        range: {
          from: format(startOfMonth(d), "yyyy-MM-dd"),
          to: format(endOfMonth(d), "yyyy-MM-dd"),
        },
      });
      return {
        month: format(d, "MMM"),
        jobs: m.jobs,
        upsells: m.upsellTotal,
        damageRate: Math.round(m.damageRate * 100),
        avgStars: Number(m.avgStars.toFixed(1)),
      };
    }),
  );
}

/* ---------- Sales ---------- */
export async function getLeads(
  opts: {
    repId?: string;
    range?: DateRange;
    source?: string;
    status?: string;
  } = {},
): Promise<Lead[]> {
  return db.leads
    .filter(
      (l) =>
        (!opts.repId || l.repId === opts.repId) &&
        (!opts.source || l.source === opts.source) &&
        (!opts.status || l.status === opts.status) &&
        inRange(l.date, opts.range),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getRepMetrics(
  repId: string,
  opts: { range?: DateRange; source?: string } = {},
): Promise<RepMetrics> {
  const rep = db.users.find((u) => u.id === repId);
  const leads = await getLeads({ repId, ...opts });
  const booked = leads.filter((l) => l.status === "booked");
  const totalLeadCost = leads.reduce((s, l) => s + l.leadCost, 0);
  return {
    repId,
    repName: rep?.name ?? "Unknown",
    leads: leads.length,
    booked: booked.length,
    closingRatio: pct(booked.length, leads.length),
    totalLeadCost,
    cpa: pct(totalLeadCost, booked.length),
    revenue: booked.reduce((s, l) => s + (l.jobValue ?? 0), 0),
  };
}

export async function getAllRepMetrics(
  opts: { range?: DateRange; source?: string } = {},
) {
  const reps = await getReps(true);
  return Promise.all(reps.map((r) => getRepMetrics(r.id, opts)));
}

export async function getLeadCosts(month?: string): Promise<LeadCost[]> {
  return db.leadCosts.filter((c) => !month || c.month === month);
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

export async function getSourceBreakdown(
  opts: { repId?: string; range?: DateRange } = {},
): Promise<SourceBreakdownRow[]> {
  const leads = await getLeads(opts);
  const sources = Array.from(
    new Set(leads.map((l) => l.source)),
  ) as LeadSource[];
  return sources
    .map((source) => ({
      source,
      ...summarizeLeads(leads.filter((l) => l.source === source)),
    }))
    .sort((a, b) => b.leads - a.leads);
}

export async function getRepMonthlyTrend(
  repId?: string,
  months = 6,
): Promise<SalesMonthlyPoint[]> {
  const now = new Date();
  return Promise.all(
    Array.from({ length: months }, async (_, i) => {
      const d = subMonths(now, months - 1 - i);
      const leads = await getLeads({
        repId,
        range: {
          from: format(startOfMonth(d), "yyyy-MM-dd"),
          to: format(endOfMonth(d), "yyyy-MM-dd"),
        },
      });
      const s = summarizeLeads(leads);
      return {
        month: format(d, "MMM"),
        leads: s.leads,
        booked: s.booked,
        closingRatio: Math.round(s.closingRatio * 100),
        cpa: Math.round(s.cpa),
        revenue: s.revenue,
      };
    }),
  );
}

export async function countLeadsBySource(
  month: string,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  db.leads
    .filter((l) => l.date.startsWith(month))
    .forEach((l) => (out[l.source] = (out[l.source] ?? 0) + 1));
  return out;
}

function defaultLeadCost(source: LeadSource, month: string) {
  return (
    db.leadCosts.find((c) => c.source === source && c.month === month)?.cost ??
    0
  );
}

/** Sets the monthly cost for a source and applies it to that month's non-overridden leads */
export async function upsertLeadCost(
  source: LeadSource,
  month: string,
  cost: number,
): Promise<number> {
  const existing = db.leadCosts.find(
    (c) => c.source === source && c.month === month,
  );
  if (existing) existing.cost = cost;
  else db.leadCosts.push({ id: `lc-${month}-${source}`, source, month, cost });

  let affected = 0;
  db.leads.forEach((l) => {
    if (l.source === source && l.date.startsWith(month) && !l.costOverridden) {
      l.leadCost = cost;
      affected++;
    }
  });
  return affected;
}

/** cost = null resets the lead back to its source's monthly cost */
export async function overrideLeadCost(
  leadId: string,
  cost: number | null,
): Promise<Lead | null> {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  if (cost === null) {
    lead.costOverridden = false;
    lead.leadCost = defaultLeadCost(lead.source, lead.date.slice(0, 7));
  } else {
    lead.costOverridden = true;
    lead.leadCost = cost;
  }
  return lead;
}

/* ---------- Audit ---------- */
function addAudit(e: Omit<AuditEntry, "id" | "changedAt">): AuditEntry {
  const entry: AuditEntry = {
    ...e,
    id: `al-${crypto.randomUUID().slice(0, 8)}`,
    changedAt: new Date().toISOString(),
  };
  db.auditLog.push(entry);
  return entry;
}

export async function getAuditLog(
  opts: { jobId?: string; entityId?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  return db.auditLog
    .filter(
      (a) =>
        (!opts.jobId || a.jobId === opts.jobId) &&
        (!opts.entityId || a.entityId === opts.entityId),
    )
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .slice(0, opts.limit ?? 500);
}

/** Returns only the fields whose values actually changed */
function changedFields<T extends object>(current: T, patch: Partial<T>) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  (Object.keys(patch) as (keyof T)[]).forEach((k) => {
    if (patch[k] !== undefined && patch[k] !== current[k]) {
      before[k as string] = current[k];
      after[k as string] = patch[k];
    }
  });
  return { before, after, changed: Object.keys(after).length > 0 };
}

/* ---------- Driver mutations ---------- */
export async function jobNumberExists(jobNumber: string): Promise<boolean> {
  const n = jobNumber.trim().toLowerCase();
  return db.jobs.some((j) => j.jobNumber.toLowerCase() === n);
}

export async function createJob(
  input: Omit<Job, "id" | "createdAt">,
): Promise<Job> {
  const job: Job = {
    ...input,
    id: `j-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  db.jobs.push(job);
  return job;
}

export async function createPreDamage(
  input: Omit<PreDamage, "id" | "receivedAtServer" | "locked">,
  createdBy: string,
): Promise<PreDamage> {
  const record: PreDamage = {
    ...input,
    id: `pd-${crypto.randomUUID().slice(0, 8)}`,
    receivedAtServer: new Date().toISOString(), // server time, never from the phone
    locked: true, // locked immediately on submit
  };
  db.preDamages.push(record);
  addAudit({
    entityType: "pre_damage",
    entityId: record.id,
    jobId: record.jobId,
    action: "create",
    changedBy: createdBy,
    before: null,
    after: {
      item: record.item,
      location: record.location,
      description: record.description,
      customerName: record.customerName,
    },
  });
  return record;
}

export async function createDamage(
  input: Omit<DamageIncident, "id" | "createdAt">,
): Promise<DamageIncident> {
  const record: DamageIncident = {
    ...input,
    id: `dm-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  db.damages.push(record);
  return record;
}

export async function createReview(
  input: Omit<Review, "id" | "createdAt" | "verified">,
): Promise<Review> {
  const record: Review = {
    ...input,
    id: `rv-${crypto.randomUUID().slice(0, 8)}`,
    verified: false,
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(record);
  return record;
}

export async function createUpsell(
  input: Omit<Upsell, "id" | "createdAt" | "verified">,
): Promise<Upsell> {
  const record: Upsell = {
    ...input,
    id: `up-${crypto.randomUUID().slice(0, 8)}`,
    verified: false,
    createdAt: new Date().toISOString(),
  };
  db.upsells.push(record);
  return record;
}

/* ---------- Admin mutations (all audited) ---------- */
type AnyRecord = { id: string; jobId: string; deletedAt?: string | null };

function recordsOf(kind: RecordKind): AnyRecord[] {
  if (kind === "pre_damage") return db.preDamages;
  if (kind === "damage") return db.damages;
  if (kind === "review") return db.reviews;
  return db.upsells;
}

export async function updateJob(
  id: string,
  patch: Partial<Pick<Job, "deliveredBy" | "onTimePickup" | "onTimeDelivery">>,
  adminId: string,
): Promise<Job | null> {
  const job = db.jobs.find((j) => j.id === id);
  if (!job) return null;
  const { before, after, changed } = changedFields(job, patch);
  if (!changed) return job;
  Object.assign(job, after);
  addAudit({
    entityType: "job",
    entityId: job.id,
    jobId: job.id,
    action: "update",
    changedBy: adminId,
    before,
    after,
  });
  return job;
}

export async function updatePreDamage(
  id: string,
  patch: Partial<
    Pick<
      PreDamage,
      "item" | "location" | "description" | "notes" | "customerName"
    >
  >,
  adminId: string,
  reason: string,
): Promise<PreDamage | null> {
  const rec = db.preDamages.find((p) => p.id === id);
  if (!rec) return null;
  const { before, after, changed } = changedFields(rec, patch);
  if (!changed) return rec;
  Object.assign(rec, after);
  addAudit({
    entityType: "pre_damage",
    entityId: rec.id,
    jobId: rec.jobId,
    action: "update",
    changedBy: adminId,
    before,
    after,
    reason,
  });
  return rec;
}

export async function setVerified(
  kind: "review" | "upsell",
  id: string,
  verified: boolean,
  adminId: string,
): Promise<Review | Upsell | null> {
  const rec = (kind === "review" ? db.reviews : db.upsells).find(
    (r) => r.id === id,
  );
  if (!rec || rec.verified === verified) return rec ?? null;
  rec.verified = verified;
  addAudit({
    entityType: kind,
    entityId: rec.id,
    jobId: rec.jobId,
    action: verified ? "verify" : "unverify",
    changedBy: adminId,
    before: { verified: !verified },
    after: { verified },
  });
  return rec;
}

export async function softDeleteRecord(
  kind: RecordKind,
  id: string,
  adminId: string,
  reason: string,
): Promise<AnyRecord | null> {
  const rec = recordsOf(kind).find((r) => r.id === id);
  if (!rec || rec.deletedAt) return rec ?? null;
  rec.deletedAt = new Date().toISOString();
  addAudit({
    entityType: kind,
    entityId: rec.id,
    jobId: rec.jobId,
    action: "delete",
    changedBy: adminId,
    before: { deleted: false },
    after: { deleted: true },
    reason,
  });
  return rec;
}

export async function restoreRecord(
  kind: RecordKind,
  id: string,
  adminId: string,
): Promise<AnyRecord | null> {
  const rec = recordsOf(kind).find((r) => r.id === id);
  if (!rec || !rec.deletedAt) return rec ?? null;
  rec.deletedAt = null;
  addAudit({
    entityType: kind,
    entityId: rec.id,
    jobId: rec.jobId,
    action: "restore",
    changedBy: adminId,
    before: { deleted: true },
    after: { deleted: false },
  });
  return rec;
}
