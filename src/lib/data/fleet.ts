// File: src/lib/data/fleet.ts
// (REPLACE the whole file)

import { createClient } from "@/lib/supabase/server";
import { FLEET_BUCKET } from "@/lib/evidence/paths";
import {
  ROADSIDE_RESULT_LABELS,
  type CheckItemKey,
  type CheckStatus,
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
} from "@/types";
import type { Database } from "@/types/supabase";

type Tables = Database["public"]["Tables"];
type TruckRow = Tables["trucks"]["Row"];
type PreTripRow = Tables["pre_trips"]["Row"];
type TicketRow = Tables["maintenance_tickets"]["Row"];
type RoadsideRow = Tables["roadside_inspections"]["Row"];

const SIGNED_URL_SECONDS = 60 * 60; // 1 hour
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

const DEFAULT_SCORING: ScoringSettings = {
  baseScore: 100,
  clean: 5,
  violations: -10,
  outOfService: -25,
};

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
}): Promise<Truck> {
  const sb = await createClient();
  const row = {
    unit_number: input.unitNumber.trim(),
    description: input.description || null,
    plate: input.plate || null,
    active: input.active,
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

async function toPreTrips(rows: PreTripRow[]): Promise<PreTripInspection[]> {
  const itemsOf = (r: PreTripRow) => (r.items as unknown as StoredItem[]) ?? [];
  const signed = await signPaths(
    rows.flatMap((r) => [
      r.signature_path,
      ...itemsOf(r).flatMap((i) => i.photos ?? []),
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

/** Score = base + roadside inspection points. Pre-trip reports never change it. */
export async function getDriverScore(
  driverId: string,
  range?: DateRange,
): Promise<DriverScore> {
  const [s, list] = await Promise.all([
    getScoring(),
    getRoadside({ driverId, range }),
  ]);
  const keys: RoadsideResult[] = ["clean", "violations", "out_of_service"];
  const lines = keys.map((key) => {
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
  return {
    base: s.baseScore,
    score: s.baseScore + lines.reduce((a, l) => a + l.total, 0),
    lines,
  };
}
