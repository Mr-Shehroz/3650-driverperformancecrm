export type Role = "admin" | "driver" | "sales_rep";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
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

export type LeadSource =
  "google_ppc" | "tv_ad" | "google_lead" | "direct" | "referral" | "other";
export type LeadStatus = "open" | "booked" | "lost";

export interface Lead {
  id: string;
  granotId: string;
  date: string;
  repId: string;
  source: LeadSource;
  leadCost: number;
  costOverridden: boolean;
  status: LeadStatus;
  bookedDate: string | null;
  jobValue: number | null;
}

export interface LeadCost {
  id: string;
  source: LeadSource;
  month: string; // YYYY-MM
  cost: number;
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
  damageCost: number;
  damageRate: number;
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

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  google_ppc: "Google PPC",
  tv_ad: "TV Ad",
  google_lead: "Google Lead",
  direct: "Direct",
  referral: "Referral",
  other: "Other",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  open: "Open",
  booked: "Booked",
  lost: "Lost",
};

export interface SourceBreakdownRow {
  source: LeadSource;
  leads: number;
  booked: number;
  closingRatio: number;
  totalLeadCost: number;
  cpa: number;
  revenue: number;
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
}
