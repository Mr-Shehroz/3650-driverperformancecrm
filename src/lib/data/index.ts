import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import * as db from "@/lib/mock/data";
import type {
  AppSettings,
  AuditEntry,
  DamageIncident,
  DateRange,
  DriverMetrics,
  Job,
  JobDetail,
  JobSummary,
  Lead,
  LeadCost,
  LeadSourceRow,
  MonthlyPoint,
  PreDamage,
  RecordKind,
  RepMetrics,
  Review,
  Role,
  SalesMonthlyPoint,
  SourceBreakdownRow,
  Upsell,
  User,
} from "@/types";
import { getDrivers, getReps, getUserById } from "./users";
import { shiftWeek, weekStartOf } from "@/lib/weeks";
export * from "./users";

const inRange = (date: string, r?: DateRange) =>
  (!r?.from || date >= r.from) && (!r?.to || date <= r.to);

const pct = (a: number, b: number) => (b === 0 ? 0 : a / b);

const alive = (x: { deletedAt?: string | null }) => !x.deletedAt;

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

/* ---------- Sales (sample data until Granot is connected) ---------- */
const SAMPLE_COSTS: Record<string, number> = {
  "src-google-ppc": 95,
  "src-tv-ad": 120,
  "src-google-lead": 0,
  "src-direct": 0,
  "src-referral": 100,
  "src-yelp": 60,
};

/** Same random numbers every time for the same seed, so sample data stays stable */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  if (h === 0) h = 1;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function costFor(sourceId: string, date: string) {
  const week = weekStartOf(parseISO(date));
  return (
    db.leadCosts.find((c) => c.sourceId === sourceId && c.week === week)
      ?.cost ?? 0
  );
}

function ensureSampleCosts() {
  if (db.sampleState.costsSeeded) return;
  db.sampleState.costsSeeded = true;
  const thisWeek = weekStartOf(new Date());
  for (let w = 0; w < 12; w++) {
    const week = shiftWeek(thisWeek, -w);
    for (const [sourceId, cost] of Object.entries(SAMPLE_COSTS)) {
      if (
        !db.leadCosts.some((c) => c.sourceId === sourceId && c.week === week)
      ) {
        db.leadCosts.push({
          id: `lc-${week}-${sourceId}`,
          sourceId,
          source: (db.leadSources.find((s) => s.id === sourceId)?.name ??
            sourceId) as LeadCost["source"],
          week,
          month: format(parseISO(week), "yyyy-MM"),
          cost,
        });
      }
    }
  }
}

/** Creates sample open/booked leads for every real sales rep (once per rep) */
async function ensureSampleLeads() {
  ensureSampleCosts();
  const sources = db.leadSources.filter((s) => s.active);
  if (!sources.length) return;

  const reps = await getReps(true);
  const today = new Date();

  for (const rep of reps) {
    if (db.sampleState.seededReps.includes(rep.id)) continue;
    db.sampleState.seededReps.push(rep.id);

    const rand = seeded(rep.id);
    for (let i = 0; i < 28; i++) {
      const date = format(
        subDays(today, Math.floor(rand() * 75)),
        "yyyy-MM-dd",
      );
      const source = sources[Math.floor(rand() * sources.length)];
      const booked = rand() < 0.4;
      db.leads.push({
        id: `l-${rep.id.slice(0, 8)}-${i}`,
        granotId: `GR-${50000 + Math.floor(rand() * 49999)}`,
        date,
        repId: rep.id,
        sourceId: source.id,
        source: source.name as Lead["source"],
        leadCost: costFor(source.id, date),
        costOverridden: false,
        status: booked ? "booked" : "open",
        bookedDate: booked ? date : null,
        jobValue: booked ? 2400 + Math.floor(rand() * 45) * 100 : null,
      });
    }
  }
}

/* --- Lead sources --- */
export async function getLeadSources(
  includeInactive = true,
): Promise<LeadSourceRow[]> {
  return [...db.leadSources]
    .filter((s) => includeInactive || s.active)
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
    );
}

export async function leadSourceNameExists(name: string, excludeId?: string) {
  const n = name.trim().toLowerCase();
  return db.leadSources.some(
    (s) => s.name.toLowerCase() === n && s.id !== excludeId,
  );
}

export async function createLeadSource(name: string): Promise<LeadSourceRow> {
  const row: LeadSourceRow = {
    id: `src-${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.leadSources.push(row);
  return row;
}

export async function renameLeadSource(
  id: string,
  name: string,
): Promise<LeadSourceRow | null> {
  const row = db.leadSources.find((s) => s.id === id);
  if (!row) return null;
  row.name = name.trim();
  return row;
}

export async function setLeadSourceActive(
  id: string,
  active: boolean,
): Promise<LeadSourceRow | null> {
  const row = db.leadSources.find((s) => s.id === id);
  if (!row) return null;
  row.active = active;
  return row;
}

/* --- Leads + metrics --- */
export async function getLeads(
  opts: {
    repId?: string;
    range?: DateRange;
    sourceId?: string;
    status?: string;
  } = {},
): Promise<Lead[]> {
  await ensureSampleLeads();
  return db.leads
    .filter(
      (l) =>
        (!opts.repId || l.repId === opts.repId) &&
        (!opts.sourceId || l.sourceId === opts.sourceId) &&
        (!opts.status || l.status === opts.status) &&
        inRange(l.date, opts.range),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
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
  const name = repName ?? (await getUserById(repId))?.name ?? "Unknown";
  const leads = await getLeads({ repId, ...opts });
  return { repId, repName: name, ...summarizeLeads(leads) };
}

export async function getAllRepMetrics(
  opts: { range?: DateRange; sourceId?: string } = {},
) {
  const reps = await getReps(true);
  return Promise.all(reps.map((r) => getRepMetrics(r.id, opts, r.name)));
}

export async function getSourceBreakdown(
  opts: { repId?: string; range?: DateRange } = {},
): Promise<SourceBreakdownRow[]> {
  const leads = await getLeads(opts);
  const names = Object.fromEntries(db.leadSources.map((s) => [s.id, s.name]));
  const ids = Array.from(new Set(leads.map((l) => l.sourceId)));
  return ids
    .map((sourceId) => {
      const sourceName = names[sourceId] ?? "Unknown";
      return {
        sourceId,
        sourceName,
        source: sourceName as SourceBreakdownRow["source"],
        ...summarizeLeads(leads.filter((l) => l.sourceId === sourceId)),
      };
    })
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
      const s = summarizeLeads(
        await getLeads({
          repId,
          range: {
            from: format(startOfMonth(d), "yyyy-MM-dd"),
            to: format(endOfMonth(d), "yyyy-MM-dd"),
          },
        }),
      );
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

/* --- Weekly lead costs --- */
export async function getLeadCosts(week: string): Promise<LeadCost[]> {
  ensureSampleCosts();
  return db.leadCosts.filter((c) => c.week === week);
}

export async function countLeadsBySource(
  week: string,
): Promise<Record<string, number>> {
  await ensureSampleLeads();
  const out: Record<string, number> = {};
  db.leads
    .filter((l) => weekStartOf(parseISO(l.date)) === week)
    .forEach((l) => (out[l.sourceId] = (out[l.sourceId] ?? 0) + 1));
  return out;
}

/** Sets a source's cost for one week and applies it to that week's non-overridden leads */
export async function upsertLeadCost(
  sourceId: string,
  week: string,
  cost: number,
): Promise<number> {
  const existing = db.leadCosts.find(
    (c) => c.sourceId === sourceId && c.week === week,
  );
  if (existing) existing.cost = cost;
  else
    db.leadCosts.push({
      id: `lc-${week}-${sourceId}`,
      sourceId,
      source: (db.leadSources.find((s) => s.id === sourceId)?.name ??
        sourceId) as LeadCost["source"],
      week,
      month: format(parseISO(week), "yyyy-MM"),
      cost,
    });

  let affected = 0;
  db.leads.forEach((l) => {
    if (
      l.sourceId === sourceId &&
      weekStartOf(parseISO(l.date)) === week &&
      !l.costOverridden
    ) {
      l.leadCost = cost;
      affected++;
    }
  });
  return affected;
}

/** cost = null resets the lead back to its source's weekly cost */
export async function overrideLeadCost(
  leadId: string,
  cost: number | null,
): Promise<Lead | null> {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  if (cost === null) {
    lead.costOverridden = false;
    lead.leadCost = costFor(lead.sourceId, lead.date);
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

/* ---------- Settings ---------- */
export async function getSettings(): Promise<AppSettings> {
  return db.settings;
}

export async function updateSettings(next: AppSettings): Promise<AppSettings> {
  db.settings.company = { ...next.company };
  db.settings.damageAlertEmails = [...next.damageAlertEmails];
  return db.settings;
}

/* ---------- Offline sync receipts ---------- */
export async function getSyncReceipt(
  clientId: string,
): Promise<{ id: string } | null> {
  return db.syncReceipts[clientId] ?? null;
}

export async function saveSyncReceipt(
  clientId: string,
  result: { id: string },
): Promise<void> {
  db.syncReceipts[clientId] = result;
}
