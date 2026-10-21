// File: src/types/index.ts
// (REPLACE the whole file)

export type Role = "admin" | "driver" | "sales_rep";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
  avatarUrl?: string;
}

export type DeliveredBy = "drs" | "partner";

export interface Job {
  id: string;
  jobNumber: string;
  date: string; // YYYY-MM-DD
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  driverId: string;
  crewIds: string[];
  deliveredBy: DeliveredBy;
  onTimePickup: boolean | null;
  onTimeDelivery: boolean | null;
  createdAt: string;
}

export interface PreDamage {
  id: string;
  jobId: string;
  item: string;
  description: string;
  location: string;
  photos: string[];
  customerShown: boolean;
  customerName: string;
  signatureUrl: string | null;
  notes?: string;
  capturedAtDevice: string;
  receivedAtServer: string;
  syncedOffline: boolean;
  lat: number | null;
  lng: number | null;
  locked: boolean;
  deletedAt?: string | null;
}

export interface DamageIncident {
  id: string;
  jobId: string;
  item: string;
  description: string;
  photos: string[];
  claimFiled: boolean;
  estimatedCost: number;
  createdAt: string;
  deletedAt?: string | null;
}

export type ReviewPlatform =
  "google" | "bbb" | "trustpilot" | "facebook" | "other";

export interface Review {
  id: string;
  jobId: string;
  platform: ReviewPlatform;
  stars: number;
  driverMentioned: boolean;
  link?: string;
  screenshotUrl?: string;
  verified: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export type UpsellType = "packing" | "storage" | "materials" | "other";

export interface Upsell {
  id: string;
  jobId: string;
  type: UpsellType;
  amount: number;
  verified: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface JobDetail extends Job {
  preDamages: PreDamage[];
  damages: DamageIncident[];
  reviews: Review[];
  upsells: Upsell[];
}

export interface DriverMetrics {
  driverId: string;
  driverName: string;
  jobs: number;
  damageCount: number;
  damagedJobs: number; // jobs with at least one damage
  damageCost: number;
  damageRate: number; // damagedJobs / jobs
  reviewCount: number;
  avgStars: number;
  fiveStarRate: number;
  upsellTotal: number;
  upsellAvg: number;
  onTimePickupRate: number | null;
  onTimeDeliveryRate: number | null;
}

export interface RepMetrics {
  repId: string;
  repName: string;
  leads: number;
  booked: number;
  closingRatio: number;
  totalLeadCost: number;
  cpa: number;
  revenue: number;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface SalesMonthlyPoint {
  month: string;
  leads: number;
  booked: number;
  closingRatio: number; // percent 0-100
  cpa: number;
  revenue: number;
}

export const REVIEW_PLATFORM_LABELS: Record<ReviewPlatform, string> = {
  google: "Google",
  bbb: "BBB",
  trustpilot: "Trustpilot",
  facebook: "Facebook",
  other: "Other",
};

export const UPSELL_TYPE_LABELS: Record<UpsellType, string> = {
  packing: "Packing",
  storage: "Storage",
  materials: "Materials",
  other: "Other",
};

export interface JobSummary extends Job {
  preDamageCount: number;
  damageCount: number;
  reviewCount: number;
  upsellTotal: number;
}

export interface MonthlyPoint {
  month: string;
  jobs: number;
  upsells: number;
  damageRate: number; // percent 0-100
  avgStars: number;
}

export type RecordKind = "pre_damage" | "damage" | "review" | "upsell";
export type EntityType = RecordKind | "job";
export type AuditAction =
  "create" | "update" | "delete" | "restore" | "verify" | "unverify";

export interface AuditEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  jobId: string;
  action: AuditAction;
  changedBy: string; // user id
  changedAt: string; // server time
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  driver: "Driver",
  sales_rep: "Sales Rep",
};

export interface CompanyInfo {
  name: string;
  usdot: string;
  mc: string;
  address: string;
  phone: string;
  email: string;
}

export interface AppSettings {
  company: CompanyInfo;
  damageAlertEmails: string[];
  scoring: ScoringSettings;
}

export type LeadStatus = "open" | "booked";

export interface LeadSourceRow {
  id: string;
  /** Shown everywhere in the app; should match the source name in Granot */
  name: string;
  active: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  granotId: string;
  date: string; // YYYY-MM-DD
  repId: string;
  sourceId: string;
  leadCost: number;
  costOverridden: boolean;
  status: LeadStatus;
  bookedDate: string | null;
  jobValue: number | null;
  /** Sample lead for review (removed before Granot goes live) */
  isSample?: boolean;
}

export interface LeadCost {
  id: string;
  sourceId: string;
  /** Monday of the week, YYYY-MM-DD */
  week: string;
  cost: number;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  open: "Open",
  booked: "Booked",
};

export interface SourceBreakdownRow {
  sourceId: string;
  sourceName: string;
  leads: number;
  booked: number;
  closingRatio: number;
  totalLeadCost: number;
  cpa: number;
  revenue: number;
}

/* ---------- Fleet ---------- */
export type TruckStatus = "safe" | "repair_soon" | "do_not_drive";

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  safe: "Safe to drive",
  repair_soon: "Needs repair soon",
  do_not_drive: "Do not drive",
};

export interface Truck {
  id: string;
  unitNumber: string;
  description?: string;
  plate?: string;
  active: boolean;
  status: TruckStatus;
  odometer: number | null;
  lastInspectionAt: string | null;
  assignedDriverId: string | null;
  lastWashedAt: string | null;
  createdAt: string;
}

/** The 5 required truck condition photos taken on every pre-trip */
export type ConditionPhotoKey =
  "front" | "rear" | "driver_side" | "passenger_side" | "cab";

export const CONDITION_PHOTOS: { key: ConditionPhotoKey; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "driver_side", label: "Driver side" },
  { key: "passenger_side", label: "Passenger side" },
  { key: "cab", label: "Cab interior" },
];

export interface TruckWash {
  id: string;
  truckId: string;
  driverId: string;
  photoUrl: string;
  receiptUrl: string | null;
  notes?: string;
  capturedAtDevice: string;
  receivedAtServer: string;
  syncedOffline: boolean;
}

export interface WashOverdueEvent {
  id: string;
  truckId: string;
  driverId: string | null;
  since: string;
  dueDate: string;
}

/** Wash status of a truck, worked out from its last wash and the interval setting */
export interface WashStatus {
  lastWashedAt: string | null;
  dueDate: string; // YYYY-MM-DD
  overdue: boolean;
  daysLeft: number; // negative when overdue
}

export type CheckItemKey =
  "tires" | "fluids" | "lights" | "brakes" | "mirrors" | "equipment";
export type CheckStatus = "ok" | "attention";

export const CHECK_ITEMS: { key: CheckItemKey; label: string; hint: string }[] =
  [
    {
      key: "tires",
      label: "Tires",
      hint: "Tread, pressure and sidewall damage",
    },
    {
      key: "fluids",
      label: "Oil / fluid leaks",
      hint: "Under the truck and around the engine",
    },
    {
      key: "lights",
      label: "Lights",
      hint: "Head, tail, brake and turn signals",
    },
    { key: "brakes", label: "Brakes", hint: "Pedal feel and air pressure" },
    {
      key: "mirrors",
      label: "Mirrors / glass",
      hint: "Cracks, chips and mirror position",
    },
    {
      key: "equipment",
      label: "Equipment",
      hint: "Blankets, dollies, straps and tools",
    },
  ];

export interface PreTripItem {
  key: CheckItemKey;
  status: CheckStatus;
  notes?: string;
  photos: string[];
}

export interface PreTripInspection {
  id: string;
  truckId: string;
  driverId: string;
  items: PreTripItem[];
  odometer: number;
  truckStatus: TruckStatus;
  notes?: string;
  signatureUrl: string;
  capturedAtDevice: string;
  receivedAtServer: string;
  lat: number | null;
  lng: number | null;
  syncedOffline: boolean;
  /** Signed links; empty for pre-trips saved before condition photos existed */
  conditionPhotos: Partial<Record<ConditionPhotoKey, string>>;
}

export type TicketStatus = "open" | "in_progress" | "fixed";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed",
};

export interface MaintenanceTicket {
  id: string;
  truckId: string;
  inspectionId: string;
  driverId: string;
  itemKey: CheckItemKey;
  notes?: string;
  photos: string[];
  severity: TruckStatus;
  status: TicketStatus;
  fixNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoadsideResult = "clean" | "violations" | "out_of_service";

export const ROADSIDE_RESULT_LABELS: Record<RoadsideResult, string> = {
  clean: "Clean",
  violations: "Violations",
  out_of_service: "Out of service",
};

export interface RoadsideInspection {
  id: string;
  driverId: string;
  truckId: string;
  date: string;
  state: string;
  location: string;
  result: RoadsideResult;
  violationNotes?: string;
  report: { name: string; type: "image" | "pdf"; url?: string } | null;
  loggedBy: string;
  createdAt: string;
}

export interface ScoringSettings {
  baseScore: number;
  clean: number;
  violations: number;
  outOfService: number;
  /** A truck is overdue when it hasn't been washed for this many days */
  washIntervalDays: number;
  /** Points for each overdue wash (0 or less) */
  overdueWash: number;
}

export interface ScoreLine {
  key: RoadsideResult | "overdue_wash";
  label: string;
  count: number;
  points: number;
  total: number;
}

export interface DriverScore {
  base: number;
  score: number;
  lines: ScoreLine[];
}
