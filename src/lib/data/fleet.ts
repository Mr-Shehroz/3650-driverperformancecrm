// File: src/lib/data/fleet.ts
// (REPLACE the whole file)

import { createClient } from "@/lib/supabase/server";
import { FLEET_BUCKET } from "@/lib/evidence/paths";
import {
  ROADSIDE_RESULT_LABELS,
  type CheckItemKey,
  type CheckStatus,
  type ConditionPhotoKey,
  type DateRange,
  type DriverScore,
  type MaintenanceTicket,
  type PreTripInspection,
  type PreTripItem,
  type RoadsideInspection,
  type RoadsideResult,
  type ScoringSettings,
  type TicketStatus,
  type Truck,
  type TruckWash,
  type WashOverdueEvent,
  type WashStatus,
} from "@/types";
import type { Database } from "@/types/supabase";

type Tables = Database["public"]["Tables"];
type TruckRow = Tables["trucks"]["Row"];
type PreTripRow = Tables["pre_trips"]["Row"];
type TicketRow = Tables["maintenance_tickets"]["Row"];
type RoadsideRow = Tables["roadside_inspections"]["Row"];
type WashRow = Tables["truck_washes"]["Row"];

const SIGNED_URL_SECONDS = 60 * 60; // 1 hour
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

const DEFAULT_SCORING: ScoringSettings = {
  baseScore: 100,
  clean: 5,
  violations: -10,
  outOfService: -25,
  washIntervalDays: 14,
  overdueWash: -5,
};
const DAY_MS = 24 * 60 * 60 * 1000;

/** Private fleet files → short-lived links the browser can open */
async function signPaths(
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const sb = await createClient();
  const { data } = await sb.storage
    .from(FLEET_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

/* =========================================================
   Trucks
   ========================================================= */
const toTruck = (t: TruckRow): Truck => ({
  id: t.id,
  unitNumber: t.unit_number,
  description: t.description ?? undefined,
  plate: t.plate ?? undefined,
  active: t.active,
  status: t.status,
  odometer: t.odometer,
  lastInspectionAt: t.last_inspection_at,
  assignedDriverId: t.assigned_driver_id,
  lastWashedAt: t.last_washed_at,
  createdAt: t.created_at,
});

export async function getTrucks(includeInactive = true): Promise<Truck[]> {
  const sb = await createClient();
  let q = sb.from("trucks").select("*");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? [])
    .map(toTruck)
    .sort((a, b) =>
      a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
    );
}

export async function getTruck(id: string): Promise<Truck | null> {
  if (!isUuid(id)) return null;
  const sb = await createClient();
  const { data } = await sb
    .from("trucks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toTruck(data) : null;
}

export async function truckUnitExists(unit: string, excludeId?: string) {
  const sb = await createClient();
  const exact = unit.trim().replace(/[\\%_]/g, (m) => `\\${m}`); // match the text exactly, ignoring case
  let q = sb.from("trucks").select("id").ilike("unit_number", exact);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.limit(1);
  return !!data?.length;
}

export async function saveTruck(input: {
  id?: string;
  unitNumber: string;
  description?: string;
  plate?: string;
  active: boolean;
  assignedDriverId: string | null;
}): Promise<Truck> {
  const sb = await createClient();
  const row = {
    unit_number: input.unitNumber.trim(),
    description: input.description || null,
    plate: input.plate || null,
    active: input.active,
    assigned_driver_id: input.assignedDriverId,
  };
  const { data, error } = input.id
    ? await sb
        .from("trucks")
        .update(row)
        .eq("id", input.id)
        .select("*")
        .single()
    : await sb.from("trucks").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505")
      throw new Error("This unit number already exists");
    throw error;
  }
  return toTruck(data);
}

/* =========================================================
   Pre-trip inspections
   ========================================================= */
type StoredItem = {
  key: CheckItemKey;
  status: CheckStatus;
  notes?: string | null;
  photos?: string[];
};
type StoredCondition = Partial<Record<ConditionPhotoKey, string>>;

const conditionOf = (r: PreTripRow) =>
  (r.condition_photos as unknown as StoredCondition | null) ?? {};

async function toPreTrips(rows: PreTripRow[]): Promise<PreTripInspection[]> {
  const itemsOf = (r: PreTripRow) => (r.items as unknown as StoredItem[]) ?? [];
  const signed = await signPaths(
    rows.flatMap((r) => [
      r.signature_path,
      ...itemsOf(r).flatMap((i) => i.photos ?? []),
      ...Object.values(conditionOf(r)),
    ]),
  );
  return rows.map((r) => ({
    id: r.id,
    truckId: r.truck_id,
    driverId: r.driver_id,
    items: itemsOf(r).map((i): PreTripItem => ({
      key: i.key,
      status: i.status,
      notes: i.notes ?? undefined,
      photos: (i.photos ?? []).map((p) => signed.get(p) ?? "").filter(Boolean),
    })),
    odometer: r.odometer,
    truckStatus: r.truck_status,
    notes: r.notes ?? undefined,
    signatureUrl: signed.get(r.signature_path) ?? "",
    capturedAtDevice: r.captured_at_device,
    receivedAtServer: r.received_at_server,
    lat: r.lat,
    lng: r.lng,
    syncedOffline: r.synced_offline,
    conditionPhotos: Object.fromEntries(
      Object.entries(conditionOf(r))
        .map(([k, path]) => [k, path ? (signed.get(path) ?? "") : ""])
        .filter(([, url]) => url),
    ) as PreTripInspection["conditionPhotos"],
  }));
}

export async function getPreTrips(
  opts: { driverId?: string; truckId?: string; limit?: number } = {},
): Promise<PreTripInspection[]> {
  const sb = await createClient();
  let q = sb.from("pre_trips").select("*");
  if (opts.driverId) q = q.eq("driver_id", opts.driverId);
  if (opts.truckId) q = q.eq("truck_id", opts.truckId);
  const { data, error } = await q
    .order("received_at_server", { ascending: false })
    .limit(opts.limit ?? 100);
  if (error) throw error;
  return toPreTrips(data ?? []);
}

export async function getPreTrip(
  id: string,
): Promise<PreTripInspection | null> {
  if (!isUuid(id)) return null;
  const sb = await createClient();
  const { data } = await sb
    .from("pre_trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return (await toPreTrips([data]))[0];
}

/**
 * Saves a locked pre-trip inspection. The database then opens a maintenance
 * ticket for every flagged item and updates the truck's status and odometer.
 */
export async function createPreTrip(input: {
  truckId: string;
  items: {
    key: CheckItemKey;
    status: CheckStatus;
    notes?: string;
    photos: string[];
  }[];
  conditionPhotos: Record<ConditionPhotoKey, string>;
  odometer: number;
  truckStatus: PreTripInspection["truckStatus"];
  notes?: string;
  signaturePath: string;
  capturedAtDevice: string;
  lat: number | null;
  lng: number | null;
  syncedOffline: boolean;
  driverId: string;
}): Promise<{ id: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("pre_trips")
    .insert({
      truck_id: input.truckId,
      driver_id: input.driverId,
      items: input.items.map((i) => ({
        key: i.key,
        status: i.status,
        notes: i.notes ?? null,
        photos: i.photos,
      })),
      condition_photos: { ...input.conditionPhotos },
      odometer: input.odometer,
      truck_status: input.truckStatus,
      notes: input.notes || null,
      signature_path: input.signaturePath,
      captured_at_device: input.capturedAtDevice,
      lat: input.lat,
      lng: input.lng,
      synced_offline: input.syncedOffline,
      // received_at_server is set by the database
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** The truck's most recent pre-trip that has condition photos */
export async function getLatestCondition(
  truckId: string,
): Promise<PreTripInspection | null> {
  if (!isUuid(truckId)) return null;
  const sb = await createClient();
  const { data } = await sb
    .from("pre_trips")
    .select("*")
    .eq("truck_id", truckId)
    .neq("condition_photos", "{}")
    .order("received_at_server", { ascending: false })
    .limit(1);
  if (!data?.length) return null;
  return (await toPreTrips(data))[0];
}

/* =========================================================
   Truck washes
   ========================================================= */
async function toWashes(rows: WashRow[]): Promise<TruckWash[]> {
  const signed = await signPaths(
    rows.flatMap((w) => [w.photo_path, w.receipt_path]),
  );
  return rows.map((w) => ({
    id: w.id,
    truckId: w.truck_id,
    driverId: w.driver_id,
    photoUrl: signed.get(w.photo_path) ?? "",
    receiptUrl: w.receipt_path ? (signed.get(w.receipt_path) ?? null) : null,
    notes: w.notes ?? undefined,
    capturedAtDevice: w.captured_at_device,
    receivedAtServer: w.received_at_server,
    syncedOffline: w.synced_offline,
  }));
}

export async function getWashes(
  opts: { truckId?: string; driverId?: string; limit?: number } = {},
): Promise<TruckWash[]> {
  const sb = await createClient();
  let q = sb.from("truck_washes").select("*");
  if (opts.truckId) q = q.eq("truck_id", opts.truckId);
  if (opts.driverId) q = q.eq("driver_id", opts.driverId);
  const { data, error } = await q
    .order("received_at_server", { ascending: false })
    .limit(opts.limit ?? 100);
  if (error) throw error;
  return toWashes(data ?? []);
}

/** Saves a locked wash record. The database updates the truck's last wash date. */
export async function createWash(input: {
  truckId: string;
  driverId: string;
  photoPath: string;
  receiptPath: string | null;
  notes?: string;
  capturedAtDevice: string;
  lat: number | null;
  lng: number | null;
  syncedOffline: boolean;
}): Promise<{ id: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("truck_washes")
    .insert({
      truck_id: input.truckId,
      driver_id: input.driverId,
      photo_path: input.photoPath,
      receipt_path: input.receiptPath,
      notes: input.notes || null,
      captured_at_device: input.capturedAtDevice,
      lat: input.lat,
      lng: input.lng,
      synced_offline: input.syncedOffline,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Due date and overdue flag for a truck */
export function washStatusOf(
  truck: Pick<Truck, "lastWashedAt" | "createdAt">,
  s: ScoringSettings,
): WashStatus {
  const since = new Date(truck.lastWashedAt ?? truck.createdAt).getTime();
  const due = since + s.washIntervalDays * DAY_MS;
  const now = Date.now();
  return {
    lastWashedAt: truck.lastWashedAt,
    dueDate: new Date(due).toISOString().slice(0, 10),
    overdue: now > due,
    daysLeft: Math.ceil((due - now) / DAY_MS),
  };
}

/** Records any new overdue washes. Safe to call often; never fails the page. */
export async function flagOverdueWashes() {
  try {
    const sb = await createClient();
    await sb.rpc("flag_overdue_washes");
  } catch (err) {
    console.error("flag_overdue_washes failed", err);
  }
}

/** Overdue washes that count (excused ones are left out) */
export async function getOverdueEvents(
  opts: { truckId?: string; driverId?: string; range?: DateRange } = {},
): Promise<WashOverdueEvent[]> {
  const sb = await createClient();
  let q = sb.from("wash_overdue_events").select("*").eq("excused", false);
  if (opts.truckId) q = q.eq("truck_id", opts.truckId);
  if (opts.driverId) q = q.eq("driver_id", opts.driverId);
  if (opts.range?.from) q = q.gte("due_date", opts.range.from);
  if (opts.range?.to) q = q.lte("due_date", opts.range.to);
  const { data, error } = await q
    .order("due_date", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    truckId: e.truck_id,
    driverId: e.driver_id,
    since: e.since,
    dueDate: e.due_date,
  }));
}

/** Admin: excuse one overdue wash so it no longer counts */
export async function excuseOverdueEvent(id: string) {
  if (!isUuid(id)) return null;
  const sb = await createClient();
  const { data, error } = await sb
    .from("wash_overdue_events")
    .update({ excused: true })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/* =========================================================
   Maintenance tickets
   ========================================================= */
const RANK: Record<TicketStatus, number> = {
  open: 0,
  in_progress: 1,
  fixed: 2,
};

export async function getTickets(
  opts: { status?: TicketStatus; truckId?: string; inspectionId?: string } = {},
): Promise<MaintenanceTicket[]> {
  const sb = await createClient();
  let q = sb.from("maintenance_tickets").select("*");
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.truckId) q = q.eq("truck_id", opts.truckId);
  if (opts.inspectionId) q = q.eq("inspection_id", opts.inspectionId);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const rows = (data ?? []) as TicketRow[];
  const signed = await signPaths(rows.flatMap((t) => t.photo_paths));
  return rows
    .map((t) => ({
      id: t.id,
      truckId: t.truck_id,
      inspectionId: t.inspection_id,
      driverId: t.driver_id,
      itemKey: t.item_key as CheckItemKey,
      notes: t.notes ?? undefined,
      photos: t.photo_paths.map((p) => signed.get(p) ?? "").filter(Boolean),
      severity: t.severity,
      status: t.status,
      fixNote: t.fix_note ?? undefined,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))
    .sort(
      (a, b) =>
        RANK[a.status] - RANK[b.status] ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  fixNote?: string,
) {
  const sb = await createClient();
  const patch: Tables["maintenance_tickets"]["Update"] = { status };
  if (status === "fixed") patch.fix_note = fixNote ?? null;
  const { data, error } = await sb
    .from("maintenance_tickets")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/* =========================================================
   Roadside (DOT) inspections
   ========================================================= */
export async function getRoadside(
  opts: { driverId?: string; truckId?: string; range?: DateRange } = {},
): Promise<RoadsideInspection[]> {
  const sb = await createClient();
  let q = sb.from("roadside_inspections").select("*");
  if (opts.driverId) q = q.eq("driver_id", opts.driverId);
  if (opts.truckId) q = q.eq("truck_id", opts.truckId);
  if (opts.range?.from) q = q.gte("date", opts.range.from);
  if (opts.range?.to) q = q.lte("date", opts.range.to);
  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as RoadsideRow[];
  const signed = await signPaths(rows.map((r) => r.report_path));
  return rows.map((r) => ({
    id: r.id,
    driverId: r.driver_id,
    truckId: r.truck_id,
    date: r.date,
    state: r.state,
    location: r.location,
    result: r.result,
    violationNotes: r.violation_notes ?? undefined,
    report: r.report_path
      ? {
          name: r.report_name ?? "Inspection report",
          type: r.report_type === "pdf" ? "pdf" : "image",
          url: signed.get(r.report_path),
        }
      : null,
    loggedBy: r.logged_by ?? "",
    createdAt: r.created_at,
  }));
}

export async function createRoadside(input: {
  driverId: string;
  truckId: string;
  date: string;
  state: string;
  location: string;
  result: RoadsideResult;
  violationNotes?: string;
  report: { name: string; type: "image" | "pdf"; path: string } | null;
}): Promise<{ id: string }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("roadside_inspections")
    .insert({
      driver_id: input.driverId,
      truck_id: input.truckId,
      date: input.date,
      state: input.state,
      location: input.location,
      result: input.result,
      violation_notes:
        input.result === "clean" ? null : input.violationNotes || null,
      report_path: input.report?.path ?? null,
      report_name: input.report?.name ?? null,
      report_type: input.report?.type ?? null,
      // logged_by and created_at are set by the database
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/* =========================================================
   Scoring
   ========================================================= */
export async function getScoring(): Promise<ScoringSettings> {
  const sb = await createClient();
  const { data } = await sb.rpc("get_scoring");
  return {
    ...DEFAULT_SCORING,
    ...((data as Partial<ScoringSettings> | null) ?? {}),
  };
}

export async function updateScoring(next: ScoringSettings) {
  const sb = await createClient();
  const { error } = await sb
    .from("settings")
    .update({ scoring: { ...next } })
    .eq("id", 1);
  if (error) throw error;
  return next;
}

export function pointsFor(result: RoadsideResult, s: ScoringSettings) {
  return result === "clean"
    ? s.clean
    : result === "violations"
      ? s.violations
      : s.outOfService;
}

/**
 * Score = base + roadside inspection points + overdue wash points.
 * Reporting truck problems in a pre-trip never changes it.
 */
export async function getDriverScore(
  driverId: string,
  range?: DateRange,
): Promise<DriverScore> {
  await flagOverdueWashes();
  const [s, list, overdue] = await Promise.all([
    getScoring(),
    getRoadside({ driverId, range }),
    getOverdueEvents({ driverId, range }),
  ]);
  const keys: RoadsideResult[] = ["clean", "violations", "out_of_service"];
  const lines: DriverScore["lines"] = keys.map((key) => {
    const count = list.filter((r) => r.result === key).length;
    const points = pointsFor(key, s);
    return {
      key,
      label: ROADSIDE_RESULT_LABELS[key],
      count,
      points,
      total: count * points,
    };
  });
  lines.push({
    key: "overdue_wash",
    label: "Overdue truck wash",
    count: overdue.length,
    points: s.overdueWash,
    total: overdue.length * s.overdueWash,
  });
  return {
    base: s.baseScore,
    score: s.baseScore + lines.reduce((a, l) => a + l.total, 0),
    lines,
  };
}
