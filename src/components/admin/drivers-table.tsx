"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Pill } from "@/components/shared/pill";
import { UserAvatar } from "@/components/shared/user-avatar";
import { NativeSelect } from "@/components/driver/form-bits";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DriverMetrics } from "@/types";

export type DriverRow = DriverMetrics & { active: boolean };

type SortKey = keyof DriverRow;
type SortDir = "asc" | "desc";

type Col = {
  key: SortKey;
  label: string;
  fmt: (r: DriverRow) => string;
};

const pctOrDash = (v: number | null) => (v === null ? "—" : formatPercent(v));

const COLS: Col[] = [
  { key: "jobs", label: "Jobs", fmt: (r) => String(r.jobs) },
  { key: "damageCount", label: "Damage", fmt: (r) => String(r.damageCount) },
  {
    key: "damageRate",
    label: "Dmg rate",
    fmt: (r) => formatPercent(r.damageRate),
  },
  {
    key: "damageCost",
    label: "Dmg cost",
    fmt: (r) => formatCurrency(r.damageCost),
  },
  { key: "reviewCount", label: "Reviews", fmt: (r) => String(r.reviewCount) },
  {
    key: "avgStars",
    label: "Avg ★",
    fmt: (r) => (r.reviewCount ? r.avgStars.toFixed(1) : "—"),
  },
  {
    key: "fiveStarRate",
    label: "5★ rate",
    fmt: (r) => (r.reviewCount ? formatPercent(r.fiveStarRate) : "—"),
  },
  {
    key: "upsellTotal",
    label: "Upsells",
    fmt: (r) => formatCurrency(r.upsellTotal),
  },
  {
    key: "upsellAvg",
    label: "Per job",
    fmt: (r) => formatCurrency(Math.round(r.upsellAvg)),
  },
  {
    key: "onTimePickupRate",
    label: "On-time PU",
    fmt: (r) => pctOrDash(r.onTimePickupRate),
  },
  {
    key: "onTimeDeliveryRate",
    label: "On-time DL",
    fmt: (r) => pctOrDash(r.onTimeDeliveryRate),
  },
];

const MOBILE_COLS = [COLS[0], COLS[2], COLS[5], COLS[7], COLS[4], COLS[9]];

/** Lower is better for these, so they default to ascending */
const ASC_FIRST: SortKey[] = [
  "driverName",
  "damageRate",
  "damageCount",
  "damageCost",
];

function SortIcon({
  column,
  sortKey,
  dir,
}: {
  column: SortKey;
  sortKey: SortKey;
  dir: SortDir;
}) {
  if (sortKey !== column)
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-primary" />
  );
}

export function DriversTable({ rows }: { rows: DriverRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("jobs");
  const [dir, setDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const val = (r: DriverRow) => {
      const v = r[sortKey];
      if (typeof v === "string") return v.toLowerCase();
      if (v === null || v === undefined)
        return dir === "asc" ? Infinity : -Infinity;
      return Number(v);
    };
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x < y) return dir === "asc" ? -1 : 1;
      if (x > y) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, dir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir(ASC_FIRST.includes(key) ? "asc" : "desc");
    }
  };

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <NativeSelect
              aria-label="Sort by"
              value={String(sortKey)}
              onChange={(e) => onSort(e.target.value as SortKey)}
            >
              <option value="driverName">Name</option>
              {COLS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <button
            type="button"
            onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label="Toggle sort direction"
            className="flex h-12 w-12 items-center justify-center rounded-lg border bg-white"
          >
            {dir === "asc" ? (
              <ArrowUp className="h-5 w-5" />
            ) : (
              <ArrowDown className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="space-y-3">
          {sorted.map((r) => (
            <Link
              key={r.driverId}
              href={`/admin/drivers/${r.driverId}`}
              className="block rounded-xl border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <UserAvatar name={r.driverName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.driverName}</p>
                  {!r.active && <Pill className="mt-0.5">Inactive</Pill>}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {MOBILE_COLS.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "rounded-lg bg-muted/50 px-2 py-2",
                      sortKey === c.key && "ring-1 ring-primary",
                    )}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {c.label}
                    </p>
                    <p className="font-heading text-base font-bold">
                      {c.fmt(r)}
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/40 px-5 py-3 text-left backdrop-blur">
                  <button
                    onClick={() => onSort("driverName")}
                    className="flex items-center gap-1.5 uppercase hover:text-foreground"
                  >
                    Driver{" "}
                    <SortIcon column="driverName" sortKey={sortKey} dir={dir} />
                  </button>
                </th>
                {COLS.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right">
                    <button
                      onClick={() => onSort(c.key)}
                      className={cn(
                        "ml-auto flex items-center gap-1 whitespace-nowrap uppercase hover:text-foreground",
                        sortKey === c.key && "text-foreground",
                      )}
                    >
                      {c.label}{" "}
                      <SortIcon column={c.key} sortKey={sortKey} dir={dir} />
                    </button>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((r) => (
                <tr
                  key={r.driverId}
                  className="group transition hover:bg-muted/40"
                >
                  <td className="sticky left-0 z-10 bg-card px-5 py-3 group-hover:bg-muted/40">
                    <Link
                      href={`/admin/drivers/${r.driverId}`}
                      className="flex items-center gap-3"
                    >
                      <UserAvatar
                        name={r.driverName}
                        className="h-8 w-8 text-xs"
                      />
                      <span className="whitespace-nowrap font-semibold group-hover:text-primary">
                        {r.driverName}
                      </span>
                      {!r.active && <Pill>Inactive</Pill>}
                    </Link>
                  </td>
                  {COLS.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-3 text-right tabular-nums",
                        sortKey === c.key && "bg-primary/[0.03] font-semibold",
                      )}
                    >
                      {c.fmt(r)}
                    </td>
                  ))}
                  <td className="px-3">
                    <Link
                      href={`/admin/drivers/${r.driverId}`}
                      aria-label={`Open ${r.driverName}`}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
