import { format, subDays } from "date-fns";
import * as db from "@/lib/mock/data";
import { getDrivers } from "./users";
import {
  CHECK_ITEMS,
  ROADSIDE_RESULT_LABELS,
  type DateRange,
  type DriverScore,
  type MaintenanceTicket,
  type PreTripInspection,
  type RoadsideInspection,
  type RoadsideResult,
  type ScoringSettings,
  type TicketStatus,
  type Truck,
} from "@/types";

const PHOTO = (t: string) =>
  `https://placehold.co/800x600/111111/ffffff.png?text=${encodeURIComponent(t)}`;
const newId = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
const inRange = (date: string, r?: DateRange) =>
  (!r?.from || date >= r.from) && (!r?.to || date <= r.to);

/* ---------- Sample data for the real drivers (once) ---------- */
async function ensureFleetSamples() {
  if (db.sampleState.fleetSeeded) return;
  const drivers = await getDrivers();
  if (!drivers.length) return; // waits until at least one driver exists
  db.sampleState.fleetSeeded = true;

  const d = (i: number) => drivers[i % drivers.length].id;
  const now = new Date();
  const at = (daysAgo: number, hour: number) => {
    const x = subDays(now, daysAgo);
    x.setHours(hour, 15, 0, 0);
    return x.toISOString();
  };
  const ok = () =>
    CHECK_ITEMS.map((c) => ({
      key: c.key,
      status: "ok" as const,
      photos: [] as string[],
    }));

  const p1: PreTripInspection = {
    id: "pt-1",
    truckId: "t-101",
    driverId: d(0),
    items: ok(),
    odometer: 182340,
    truckStatus: "safe",
    signatureUrl: PHOTO("Signature"),
    capturedAtDevice: at(1, 7),
    receivedAtServer: at(1, 7),
    lat: 26.1224,
    lng: -80.1373,
    syncedOffline: false,
  };
  const p2: PreTripInspection = {
    id: "pt-2",
    truckId: "t-102",
    driverId: d(1),
    odometer: 214980,
    truckStatus: "repair_soon",
    items: ok().map((it) =>
      it.key === "tires"
        ? {
            ...it,
            status: "attention" as const,
            notes: "Rear left inner tire low on tread",
            photos: [PHOTO("Tire")],
          }
        : it.key === "equipment"
          ? {
              ...it,
              status: "attention" as const,
              notes: "Missing 6 moving blankets and 1 strap",
              photos: [],
            }
          : it,
    ),
    signatureUrl: PHOTO("Signature"),
    capturedAtDevice: at(3, 6),
    receivedAtServer: at(3, 8),
    lat: 25.7617,
    lng: -80.1918,
    syncedOffline: true,
  };
  const p3: PreTripInspection = {
    id: "pt-3",
    truckId: "t-205",
    driverId: d(0),
    odometer: 401225,
    truckStatus: "do_not_drive",
    items: ok().map((it) =>
      it.key === "brakes"
        ? {
            ...it,
            status: "attention" as const,
            notes: "Air pressure drops fast, warning light on",
            photos: [PHOTO("Brake gauge")],
          }
        : it,
    ),
    notes: "Left the truck at the yard. Called dispatch.",
    signatureUrl: PHOTO("Signature"),
    capturedAtDevice: at(0, 6),
    receivedAtServer: at(0, 6),
    lat: 26.0112,
    lng: -80.1495,
    syncedOffline: false,
  };
  db.preTrips.push(p1, p2, p3);

  db.tickets.push(
    {
      id: "mt-1",
      truckId: "t-102",
      inspectionId: "pt-2",
      driverId: d(1),
      itemKey: "tires",
      notes: "Rear left inner tire low on tread",
      photos: [PHOTO("Tire")],
      severity: "repair_soon",
      status: "in_progress",
      createdAt: at(3, 8),
      updatedAt: at(2, 10),
    },
    {
      id: "mt-2",
      truckId: "t-102",
      inspectionId: "pt-2",
      driverId: d(1),
      itemKey: "equipment",
      notes: "Missing 6 moving blankets and 1 strap",
      photos: [],
      severity: "repair_soon",
      status: "fixed",
      fixNote: "Restocked blankets and straps",
      createdAt: at(3, 8),
      updatedAt: at(2, 15),
    },
    {
      id: "mt-3",
      truckId: "t-205",
      inspectionId: "pt-3",
      driverId: d(0),
      itemKey: "brakes",
      notes: "Air pressure drops fast, warning light on",
      photos: [PHOTO("Brake gauge")],
      severity: "do_not_drive",
      status: "open",
      createdAt: at(0, 6),
      updatedAt: at(0, 6),
    },
  );

  const t = (id: string) => db.trucks.find((x) => x.id === id)!;
  Object.assign(t("t-101"), {
    status: "safe",
    lastInspectionAt: p1.receivedAtServer,
  });
  Object.assign(t("t-102"), {
    status: "repair_soon",
    lastInspectionAt: p2.receivedAtServer,
  });
  Object.assign(t("t-205"), {
    status: "do_not_drive",
    lastInspectionAt: p3.receivedAtServer,
  });

  const day = (n: number) => format(subDays(now, n), "yyyy-MM-dd");
  db.roadside.push(
    {
      id: "rs-1",
      driverId: d(0),
      truckId: "t-101",
      date: day(4),
      state: "GA",
      location: "I-95 weigh station, Brunswick",
      result: "clean",
      report: { name: "inspection-GA.pdf", type: "pdf" },
      loggedBy: d(0),
      createdAt: at(4, 14),
    },
    {
      id: "rs-2",
      driverId: d(1),
      truckId: "t-102",
      date: day(12),
      state: "SC",
      location: "Hardeeville port of entry",
      result: "violations",
      violationNotes: "Logbook not current, one marker light out",
      report: {
        name: "inspection-SC.jpg",
        type: "image",
        url: PHOTO("Inspection report"),
      },
      loggedBy: d(1),
      createdAt: at(12, 11),
    },
    {
      id: "rs-3",
      driverId: d(0),
      truckId: "t-205",
      date: day(20),
      state: "NC",
      location: "I-95 Rest Area, Rowland",
      result: "clean",
      report: null,
      loggedBy: d(0),
      createdAt: at(20, 9),
    },
    {
      id: "rs-4",
      driverId: d(2),
      truckId: "t-205",
      date: day(33),
      state: "VA",
      location: "Emporia weigh station",
      result: "out_of_service",
      violationNotes: "Brake adjustment out of limits on 2 axles",
      report: { name: "OOS-report.pdf", type: "pdf" },
      loggedBy: d(2),
      createdAt: at(33, 16),
    },
  );
}

/* ---------- Trucks ---------- */
export async function getTrucks(includeInactive = true): Promise<Truck[]> {
  await ensureFleetSamples();
  return db.trucks
    .filter((t) => includeInactive || t.active)
    .sort((a, b) =>
      a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
    );
}

export async function getTruck(id: string): Promise<Truck | null> {
  await ensureFleetSamples();
  return db.trucks.find((t) => t.id === id) ?? null;
}

export async function truckUnitExists(unit: string, excludeId?: string) {
  const u = unit.trim().toLowerCase();
  return db.trucks.some(
    (t) => t.unitNumber.toLowerCase() === u && t.id !== excludeId,
  );
}

export async function saveTruck(input: {
  id?: string;
  unitNumber: string;
  description?: string;
  plate?: string;
  active: boolean;
}): Promise<Truck> {
  if (input.id) {
    const t = db.trucks.find((x) => x.id === input.id);
    if (t) {
      Object.assign(t, {
        unitNumber: input.unitNumber,
        description: input.description,
        plate: input.plate,
        active: input.active,
      });
      return t;
    }
  }
  const truck: Truck = {
    id: newId("t"),
    unitNumber: input.unitNumber,
    description: input.description,
    plate: input.plate,
    active: input.active,
    status: "safe",
    odometer: null,
    lastInspectionAt: null,
  };
  db.trucks.push(truck);
  return truck;
}

/* ---------- Pre-trip inspections ---------- */
export async function getPreTrips(
  opts: { driverId?: string; truckId?: string } = {},
): Promise<PreTripInspection[]> {
  await ensureFleetSamples();
  return db.preTrips
    .filter(
      (p) =>
        (!opts.driverId || p.driverId === opts.driverId) &&
        (!opts.truckId || p.truckId === opts.truckId),
    )
    .sort((a, b) => b.receivedAtServer.localeCompare(a.receivedAtServer));
}

export async function getPreTrip(
  id: string,
): Promise<PreTripInspection | null> {
  await ensureFleetSamples();
  return db.preTrips.find((p) => p.id === id) ?? null;
}

/** Saves the inspection, opens a ticket for every flagged item and updates the truck */
export async function createPreTrip(
  input: Omit<PreTripInspection, "id" | "receivedAtServer">,
): Promise<PreTripInspection> {
  const now = new Date().toISOString();
  const inspection: PreTripInspection = {
    ...input,
    id: newId("pt"),
    receivedAtServer: now,
  };
  db.preTrips.push(inspection);

  const severity =
    input.truckStatus === "safe" ? "repair_soon" : input.truckStatus;
  for (const item of input.items.filter((i) => i.status === "attention")) {
    db.tickets.push({
      id: newId("mt"),
      truckId: input.truckId,
      inspectionId: inspection.id,
      driverId: input.driverId,
      itemKey: item.key,
      notes: item.notes,
      photos: item.photos,
      severity,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  }

  const truck = db.trucks.find((t) => t.id === input.truckId);
  if (truck)
    Object.assign(truck, {
      status: input.truckStatus,
      odometer: input.odometer,
      lastInspectionAt: now,
    });

  // TODO (functionality milestone): email admins when truckStatus is "do_not_drive"
  return inspection;
}

/* ---------- Maintenance tickets ---------- */
export async function getTickets(
  opts: { status?: TicketStatus; truckId?: string; inspectionId?: string } = {},
): Promise<MaintenanceTicket[]> {
  await ensureFleetSamples();
  return db.tickets
    .filter(
      (t) =>
        (!opts.status || t.status === opts.status) &&
        (!opts.truckId || t.truckId === opts.truckId) &&
        (!opts.inspectionId || t.inspectionId === opts.inspectionId),
    )
    .sort((a, b) => {
      const rank = { open: 0, in_progress: 1, fixed: 2 };
      return (
        rank[a.status] - rank[b.status] ||
        b.createdAt.localeCompare(a.createdAt)
      );
    });
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  fixNote?: string,
) {
  const t = db.tickets.find((x) => x.id === id);
  if (!t) return null;
  Object.assign(t, {
    status,
    fixNote: status === "fixed" ? fixNote : t.fixNote,
    updatedAt: new Date().toISOString(),
  });
  return t;
}

/* ---------- Roadside inspections ---------- */
export async function getRoadside(
  opts: { driverId?: string; truckId?: string; range?: DateRange } = {},
) {
  await ensureFleetSamples();
  return db.roadside
    .filter(
      (r) =>
        (!opts.driverId || r.driverId === opts.driverId) &&
        (!opts.truckId || r.truckId === opts.truckId) &&
        inRange(r.date, opts.range),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createRoadside(
  input: Omit<RoadsideInspection, "id" | "createdAt">,
) {
  const row: RoadsideInspection = {
    ...input,
    id: newId("rs"),
    createdAt: new Date().toISOString(),
  };
  db.roadside.push(row);
  return row;
}

/* ---------- Scoring ---------- */
export async function getScoring(): Promise<ScoringSettings> {
  return db.settings.scoring;
}

export async function updateScoring(next: ScoringSettings) {
  db.settings.scoring = { ...next };
  return db.settings.scoring;
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
  const s = db.settings.scoring;
  const list = await getRoadside({ driverId, range });
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
