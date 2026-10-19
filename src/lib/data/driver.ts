// File: src/lib/data/driver.ts
// (REPLACE the whole file)

import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { EVIDENCE_BUCKET } from "@/lib/evidence/paths";
import { getDrivers } from "./users";
import type {
  AppSettings,
  AuditEntry,
  CompanyInfo,
  DamageIncident,
  DateRange,
  DriverMetrics,
  Job,
  JobDetail,
  JobSummary,
  MonthlyPoint,
  PreDamage,
  RecordKind,
  Review,
  ReviewPlatform,
  Upsell,
  UpsellType,
} from "@/types";
import type { Database } from "@/types/supabase";

type Tables = Database["public"]["Tables"];
type JobRow = Tables["jobs"]["Row"];
type PreDamageRow = Tables["pre_damages"]["Row"];
type DamageRow = Tables["damage_incidents"]["Row"];
type ReviewRow = Tables["reviews"]["Row"];
type UpsellRow = Tables["upsells"]["Row"];

const pct = (a: number, b: number) => (b === 0 ? 0 : a / b);
const alive = (x: { deleted_at: string | null }) => !x.deleted_at;
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

/* =========================================================
   Mappers
   ========================================================= */
const toJob = (r: JobRow): Job => ({
  id: r.id,
  jobNumber: r.job_number,
  date: r.date,
  originCity: r.origin_city,
  originState: r.origin_state,
  destCity: r.dest_city,
  destState: r.dest_state,
  driverId: r.driver_id,
  crewIds: r.crew_ids ?? [],
  deliveredBy: r.delivered_by,
  onTimePickup: r.on_time_pickup,
  onTimeDelivery: r.on_time_delivery,
  createdAt: r.created_at,
});

/** Private files → short-lived links the browser can open */
async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const sb = await createClient();
  const { data } = await sb.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

const url = (m: Map<string, string>, p: string | null | undefined) =>
  p ? (m.get(p) ?? "") : "";

/* =========================================================
   Jobs
   ========================================================= */
const JOB_COLS =
  "id, job_number, date, origin_city, origin_state, dest_city, dest_state, driver_id, crew_ids, delivered_by, on_time_pickup, on_time_delivery, created_at";

export async function getJobsByDriver(
  driverId: string,
  range?: DateRange,
): Promise<Job[]> {
  const sb = await createClient();
  let q = sb.from("jobs").select(JOB_COLS).eq("driver_id", driverId);
  if (range?.from) q = q.gte("date", range.from);
  if (range?.to) q = q.lte("date", range.to);
  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toJob);
}

export async function getAllJobs(range?: DateRange): Promise<Job[]> {
  const sb = await createClient();
  let q = sb.from("jobs").select(JOB_COLS);
  if (range?.from) q = q.gte("date", range.from);
  if (range?.to) q = q.lte("date", range.to);
  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toJob);
}

export async function getJob(jobId: string): Promise<Job | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("jobs")
    .select(JOB_COLS)
    .eq("id", jobId)
    .maybeSingle();
  return data ? toJob(data) : null;
}

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

export async function getJobDetail(
  jobId: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<JobDetail | null> {
  if (!isUuid(jobId)) return null;
  const sb = await createClient();
  const { data: job } = await sb
    .from("jobs")
    .select(JOB_COLS)
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return null;

  const [pre, dmg, rev, ups] = await Promise.all([
    sb
      .from("pre_damages")
      .select("*")
      .eq("job_id", jobId)
      .order("received_at_server"),
    sb
      .from("damage_incidents")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at"),
    sb.from("reviews").select("*").eq("job_id", jobId).order("created_at"),
    sb.from("upsells").select("*").eq("job_id", jobId).order("created_at"),
  ]);

  const keep = <T extends { deleted_at: string | null }>(rows: T[] | null) =>
    (rows ?? []).filter((r) => opts.includeDeleted || alive(r));

  const preRows = keep<PreDamageRow>(pre.data);
  const dmgRows = keep<DamageRow>(dmg.data);
  const revRows = keep<ReviewRow>(rev.data);
  const upRows = keep<UpsellRow>(ups.data);

  const signed = await signPaths([
    ...preRows.flatMap((p) => [...p.photo_paths, p.signature_path]),
    ...dmgRows.flatMap((d) => d.photo_paths),
    ...revRows.map((r) => r.screenshot_path ?? ""),
  ]);

  const preDamages: PreDamage[] = preRows.map((p) => ({
    id: p.id,
    jobId: p.job_id,
    item: p.item,
    description: p.description,
    location: p.location,
    photos: p.photo_paths.map((x) => url(signed, x)).filter(Boolean),
    customerShown: p.customer_shown,
    customerName: p.customer_name,
    signatureUrl: url(signed, p.signature_path) || null,
    notes: p.notes ?? undefined,
    capturedAtDevice: p.captured_at_device,
    receivedAtServer: p.received_at_server,
    syncedOffline: p.synced_offline,
    lat: p.lat,
    lng: p.lng,
    locked: p.locked,
    deletedAt: p.deleted_at,
  }));

  const damages: DamageIncident[] = dmgRows.map((d) => ({
    id: d.id,
    jobId: d.job_id,
    item: d.item,
    description: d.description,
    photos: d.photo_paths.map((x) => url(signed, x)).filter(Boolean),
    claimFiled: d.claim_filed,
    estimatedCost: Number(d.estimated_cost),
    createdAt: d.created_at,
    deletedAt: d.deleted_at,
  }));

  const reviews: Review[] = revRows.map((r) => ({
    id: r.id,
    jobId: r.job_id,
    platform: r.platform as ReviewPlatform,
    stars: r.stars,
    driverMentioned: r.driver_mentioned,
    link: r.link ?? undefined,
    screenshotUrl: url(signed, r.screenshot_path) || undefined,
    verified: r.verified,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
  }));

  const upsells: Upsell[] = upRows.map((u) => ({
    id: u.id,
    jobId: u.job_id,
    type: u.type as UpsellType,
    amount: Number(u.amount),
    verified: u.verified,
    createdAt: u.created_at,
    deletedAt: u.deleted_at,
  }));

  return { ...toJob(job), preDamages, damages, reviews, upsells };
}

/* ---------- Jobs with their evidence counts (lists, metrics) ---------- */
const JOB_WITH_COUNTS = `${JOB_COLS},
  pre_damages(id, deleted_at),
  damage_incidents(id, estimated_cost, deleted_at),
  reviews(id, stars, verified, deleted_at),
  upsells(id, amount, verified, deleted_at)`;

type JobWithChildren = JobRow & {
  pre_damages: { id: string; deleted_at: string | null }[];
  damage_incidents: {
    id: string;
    estimated_cost: number;
    deleted_at: string | null;
  }[];
  reviews: {
    id: string;
    stars: number;
    verified: boolean;
    deleted_at: string | null;
  }[];
  upsells: {
    id: string;
    amount: number;
    verified: boolean;
    deleted_at: string | null;
  }[];
};

async function loadJobsWithChildren(
  opts: { driverId?: string; range?: DateRange; q?: string } = {},
) {
  const sb = await createClient();
  let q = sb.from("jobs").select(JOB_WITH_COUNTS);
  if (opts.driverId) q = q.eq("driver_id", opts.driverId);
  if (opts.range?.from) q = q.gte("date", opts.range.from);
  if (opts.range?.to) q = q.lte("date", opts.range.to);
  const term = opts.q?.trim().replace(/[%,()]/g, " ");
  if (term) {
    q = q.or(
      `job_number.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`,
    );
  }
  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as JobWithChildren[];
}

function summarize(j: JobWithChildren): JobSummary {
  return {
    ...toJob(j),
    preDamageCount: j.pre_damages.filter(alive).length,
    damageCount: j.damage_incidents.filter(alive).length,
    reviewCount: j.reviews.filter(alive).length,
    upsellTotal: j.upsells
      .filter(alive)
      .reduce((s, u) => s + Number(u.amount), 0),
  };
}

export async function getDriverJobSummaries(
  driverId: string,
  opts: { range?: DateRange; q?: string } = {},
): Promise<JobSummary[]> {
  return (await loadJobsWithChildren({ driverId, ...opts })).map(summarize);
}

export async function getAllJobSummaries(
  opts: { range?: DateRange; driverId?: string } = {},
): Promise<JobSummary[]> {
  return (await loadJobsWithChildren(opts)).map(summarize);
}

/* =========================================================
   Driver metrics
   ========================================================= */
function metricsFrom(
  driverId: string,
  driverName: string,
  jobs: JobWithChildren[],
  verifiedOnly = false,
): DriverMetrics {
  // Partner-delivered damage is tracked but does not count against the driver
  const drsJobs = jobs.filter((j) => j.delivered_by === "drs");
  const dmg = drsJobs.flatMap((j) => j.damage_incidents.filter(alive));
  const damagedJobs = drsJobs.filter((j) =>
    j.damage_incidents.some(alive),
  ).length;
  const revs = jobs.flatMap((j) =>
    j.reviews.filter((r) => alive(r) && (!verifiedOnly || r.verified)),
  );
  const ups = jobs.flatMap((j) =>
    j.upsells.filter((u) => alive(u) && (!verifiedOnly || u.verified)),
  );

  const pickupKnown = jobs.filter((j) => j.on_time_pickup !== null);
  const deliveryKnown = jobs.filter((j) => j.on_time_delivery !== null);
  const upsellTotal = ups.reduce((s, u) => s + Number(u.amount), 0);

  return {
    driverId,
    driverName,
    jobs: jobs.length,
    damageCount: dmg.length,
    damagedJobs,
    damageCost: dmg.reduce((s, d) => s + Number(d.estimated_cost), 0),
    // Share of jobs that had damage (2 incidents on 1 job = 100%, not 200%)
    damageRate: pct(damagedJobs, jobs.length),
    reviewCount: revs.length,
    avgStars: revs.length
      ? revs.reduce((s, r) => s + r.stars, 0) / revs.length
      : 0,
    fiveStarRate: pct(revs.filter((r) => r.stars === 5).length, revs.length),
    upsellTotal,
    upsellAvg: pct(upsellTotal, jobs.length),
    onTimePickupRate: pickupKnown.length
      ? pct(
          pickupKnown.filter((j) => j.on_time_pickup).length,
          pickupKnown.length,
        )
      : null,
    onTimeDeliveryRate: deliveryKnown.length
      ? pct(
          deliveryKnown.filter((j) => j.on_time_delivery).length,
          deliveryKnown.length,
        )
      : null,
  };
}

export async function getDriverMetrics(
  driverId: string,
  opts: { range?: DateRange; verifiedOnly?: boolean } = {},
  driverName?: string,
): Promise<DriverMetrics> {
  const sb = await createClient();
  const [jobs, name] = await Promise.all([
    loadJobsWithChildren({ driverId, range: opts.range }),
    driverName
      ? Promise.resolve(driverName)
      : sb
          .from("profiles")
          .select("name")
          .eq("id", driverId)
          .maybeSingle()
          .then((r) => r.data?.name ?? "Unknown"),
  ]);
  return metricsFrom(driverId, name, jobs, opts.verifiedOnly);
}

export async function getAllDriverMetrics(
  opts: { range?: DateRange; verifiedOnly?: boolean } = {},
) {
  const [drivers, jobs] = await Promise.all([
    getDrivers(true),
    loadJobsWithChildren({ range: opts.range }),
  ]);
  return drivers.map((d) =>
    metricsFrom(
      d.id,
      d.name,
      jobs.filter((j) => j.driver_id === d.id),
      opts.verifiedOnly,
    ),
  );
}

export async function getDriverMonthlyTrend(
  driverId: string,
  months = 6,
): Promise<MonthlyPoint[]> {
  const now = new Date();
  const first = startOfMonth(subMonths(now, months - 1));
  const jobs = await loadJobsWithChildren({
    driverId,
    range: {
      from: format(first, "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    },
  });

  return Array.from({ length: months }, (_, i) => {
    const d = subMonths(now, months - 1 - i);
    const key = format(d, "yyyy-MM");
    const m = metricsFrom(
      driverId,
      "",
      jobs.filter((j) => j.date.startsWith(key)),
    );
    return {
      month: format(d, "MMM"),
      jobs: m.jobs,
      upsells: m.upsellTotal,
      damageRate: Math.round(m.damageRate * 100),
      avgStars: Number(m.avgStars.toFixed(1)),
    };
  });
}

/* =========================================================
   Driver writes (run as the driver; database rules apply)
   ========================================================= */
export class DuplicateJobNumberError extends Error {}

export async function createJob(
  input: Omit<Job, "id" | "createdAt">,
): Promise<Job> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("jobs")
    .insert({
      job_number: input.jobNumber.trim(),
      date: input.date,
      origin_city: input.originCity.trim(),
      origin_state: input.originState,
      dest_city: input.destCity.trim(),
      dest_state: input.destState,
      driver_id: input.driverId,
      crew_ids: input.crewIds,
      delivered_by: input.deliveredBy,
      on_time_pickup: input.onTimePickup,
      on_time_delivery: input.onTimeDelivery,
    })
    .select(JOB_COLS)
    .single();
  if (error) {
    if (error.code === "23505")
      throw new DuplicateJobNumberError("This job number already exists");
    throw error;
  }
  return toJob(data);
}

export async function createPreDamage(input: {
  jobId: string;
  item: string;
  location: string;
  description: string;
  notes?: string;
  photoPaths: string[];
  customerShown: boolean;
  customerName: string;
  signaturePath: string;
  capturedAtDevice: string;
  syncedOffline: boolean;
  lat: number | null;
  lng: number | null;
}): Promise<{ id: string; jobId: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("pre_damages")
    .insert({
      job_id: input.jobId,
      item: input.item,
      location: input.location,
      description: input.description,
      notes: input.notes || null,
      photo_paths: input.photoPaths,
      customer_shown: input.customerShown,
      customer_name: input.customerName,
      signature_path: input.signaturePath,
      captured_at_device: input.capturedAtDevice,
      synced_offline: input.syncedOffline,
      lat: input.lat,
      lng: input.lng,
      // received_at_server, locked and created_by are set by the database
    })
    .select("id, job_id")
    .single();
  if (error) throw error;
  return { id: data.id, jobId: data.job_id };
}

export async function createDamage(input: {
  jobId: string;
  item: string;
  description: string;
  photoPaths: string[];
  claimFiled: boolean;
  estimatedCost: number;
}): Promise<{ id: string; jobId: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("damage_incidents")
    .insert({
      job_id: input.jobId,
      item: input.item,
      description: input.description,
      photo_paths: input.photoPaths,
      claim_filed: input.claimFiled,
      estimated_cost: input.estimatedCost,
    })
    .select("id, job_id")
    .single();
  if (error) throw error;
  return { id: data.id, jobId: data.job_id };
}

export async function createReview(input: {
  jobId: string;
  platform: ReviewPlatform;
  stars: number;
  driverMentioned: boolean;
  link?: string;
  screenshotPath?: string;
}): Promise<{ id: string; jobId: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("reviews")
    .insert({
      job_id: input.jobId,
      platform: input.platform,
      stars: input.stars,
      driver_mentioned: input.driverMentioned,
      link: input.link || null,
      screenshot_path: input.screenshotPath || null,
    })
    .select("id, job_id")
    .single();
  if (error) throw error;
  return { id: data.id, jobId: data.job_id };
}

export async function createUpsell(input: {
  jobId: string;
  type: UpsellType;
  amount: number;
}): Promise<{ id: string; jobId: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("upsells")
    .insert({ job_id: input.jobId, type: input.type, amount: input.amount })
    .select("id, job_id")
    .single();
  if (error) throw error;
  return { id: data.id, jobId: data.job_id };
}

/* =========================================================
   Job updates (driver: on-time once; admin: anything). Audited by the database.
   ========================================================= */
export async function updateJob(
  id: string,
  patch: Partial<Pick<Job, "deliveredBy" | "onTimePickup" | "onTimeDelivery">>,
  // kept for compatibility; the database records who made the change
  _changedBy?: string,
): Promise<Job | null> {
  const sb = await createClient();
  const row: Tables["jobs"]["Update"] = {};
  if (patch.deliveredBy !== undefined) row.delivered_by = patch.deliveredBy;
  if (patch.onTimePickup !== undefined) row.on_time_pickup = patch.onTimePickup;
  if (patch.onTimeDelivery !== undefined)
    row.on_time_delivery = patch.onTimeDelivery;

  const { data, error } = await sb
    .from("jobs")
    .update(row)
    .eq("id", id)
    .select(JOB_COLS)
    .maybeSingle();
  if (error) throw error;
  return data ? toJob(data) : null;
}

/* =========================================================
   Admin corrections (database functions; reason goes into the audit log)
   ========================================================= */
export async function updatePreDamage(
  id: string,
  patch: {
    item: string;
    location: string;
    description: string;
    notes?: string;
    customerName: string;
  },
  _adminId: string,
  reason: string,
): Promise<{ jobId: string } | null> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_correct_pre_damage", {
    p_id: id,
    p_item: patch.item,
    p_location: patch.location,
    p_description: patch.description,
    p_notes: patch.notes ?? "",
    p_customer_name: patch.customerName,
    p_reason: reason,
  });
  if (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
  return { jobId: data };
}

export async function setVerified(
  kind: "review" | "upsell",
  id: string,
  verified: boolean,
  _adminId?: string,
): Promise<{ jobId: string } | null> {
  const sb = await createClient();
  const table = kind === "review" ? "reviews" : "upsells";
  const { data, error } = await sb
    .from(table)
    .update({ verified })
    .eq("id", id)
    .select("job_id")
    .maybeSingle();
  if (error) throw error;
  return data ? { jobId: data.job_id } : null;
}

async function setDeleted(
  kind: RecordKind,
  id: string,
  deleted: boolean,
  reason?: string,
) {
  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_set_deleted", {
    p_kind: kind,
    p_id: id,
    p_deleted: deleted,
    p_reason: reason ?? "",
  });
  if (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
  return { jobId: data };
}

export const softDeleteRecord = (
  kind: RecordKind,
  id: string,
  _adminId: string,
  reason: string,
) => setDeleted(kind, id, true, reason);

export const restoreRecord = (
  kind: RecordKind,
  id: string,
  _adminId?: string,
) => setDeleted(kind, id, false);

/* =========================================================
   Audit log (written by database triggers only)
   ========================================================= */
export async function getAuditLog(
  opts: { jobId?: string; entityId?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  const sb = await createClient();
  let q = sb.from("audit_log").select("*");
  if (opts.jobId) q = q.eq("job_id", opts.jobId);
  if (opts.entityId) q = q.eq("entity_id", opts.entityId);
  const { data, error } = await q
    .order("changed_at", { ascending: false })
    .limit(opts.limit ?? 500);
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    entityType: a.entity_type as AuditEntry["entityType"],
    entityId: a.entity_id,
    jobId: a.job_id ?? "",
    action: a.action as AuditEntry["action"],
    changedBy: a.changed_by ?? "",
    changedAt: a.changed_at,
    before: (a.before as Record<string, unknown> | null) ?? null,
    after: (a.after as Record<string, unknown> | null) ?? null,
    reason: a.reason ?? undefined,
  }));
}

/* =========================================================
   Settings
   ========================================================= */
export async function getSettings(): Promise<AppSettings> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("settings")
    .select("company, damage_alert_emails, scoring")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return {
    company: data.company as unknown as CompanyInfo,
    damageAlertEmails: data.damage_alert_emails ?? [],
    scoring: {
      baseScore: 100,
      clean: 5,
      violations: -10,
      outOfService: -25,
      ...((data.scoring as Partial<AppSettings["scoring"]> | null) ?? {}),
    },
  };
}

export async function updateSettings(
  next: Pick<AppSettings, "company" | "damageAlertEmails">,
): Promise<void> {
  const sb = await createClient();
  const { error } = await sb
    .from("settings")
    .update({
      company: { ...next.company },
      damage_alert_emails: next.damageAlertEmails,
    })
    .eq("id", 1);
  if (error) throw error;
}

/* =========================================================
   Offline sync receipts (stop double uploads on retry)
   ========================================================= */
export async function getSyncReceipt(
  clientId: string,
): Promise<{ id: string } | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("sync_receipts")
    .select("result")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data?.result as { id: string } | undefined) ?? null;
}

export async function saveSyncReceipt(
  clientId: string,
  userId: string,
  result: { id: string },
) {
  const sb = await createClient();
  const { error } = await sb
    .from("sync_receipts")
    .insert({ client_id: clientId, user_id: userId, result });
  // A duplicate means another request already saved it: fine
  if (error && error.code !== "23505") throw error;
}
