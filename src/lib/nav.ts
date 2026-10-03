import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  DollarSign,
  History,
  Home,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  RefreshCw,
  ScrollText,
  Settings,
  TrendingUp,
  Trophy,
  Truck,
  Users,
  Tags,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

export const DRIVER_NAV: NavItem[] = [
  { href: "/driver", label: "Home", icon: Home },
  { href: "/driver/jobs/new", label: "New Job", icon: PlusCircle },
  { href: "/driver/jobs", label: "History", icon: History },
  { href: "/driver/stats", label: "My Stats", icon: BarChart3 },
];

export const SALES_NAV: NavItem[] = [
  { href: "/sales", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/leads", label: "My Leads", icon: ListChecks },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Drivers",
    items: [
      { href: "/admin/drivers", label: "Drivers", icon: Truck },
      { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/sales", label: "Sales Reps", icon: TrendingUp },
      { href: "/admin/sales/lead-sources", label: "Lead Sources", icon: Tags },
      {
        href: "/admin/sales/lead-costs",
        label: "Lead Costs",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Returns the href of the longest nav item matching the current path. */
export function getActiveHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
}

export const DRIVER_NAV_GROUPS: NavGroup[] = [
  {
    title: "Jobs",
    items: [
      { href: "/driver", label: "Home", icon: Home },
      { href: "/driver/jobs/new", label: "New Job", icon: PlusCircle },
      { href: "/driver/jobs", label: "Job History", icon: History },
      { href: "/driver/outbox", label: "Sync queue", icon: RefreshCw },
    ],
  },
  {
    title: "Performance",
    items: [{ href: "/driver/stats", label: "My Stats", icon: BarChart3 }],
  },
];

export const SALES_NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/sales", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Leads",
    items: [{ href: "/sales/leads", label: "My Leads", icon: ListChecks }],
  },
];
