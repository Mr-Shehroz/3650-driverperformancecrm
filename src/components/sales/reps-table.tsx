"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Pill } from "@/components/shared/pill";
import { NativeSelect } from "@/components/driver/form-bits";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RepMetrics } from "@/types";

export type RepRow = RepMetrics & { active: boolean };
type Key = keyof RepMetrics;
type SortDir = "asc" | "desc";

const COLS: {
  key: Key;
  label: string;
  fmt: (r: RepRow) => string;
  lowerIsBetter?: boolean;
}[] = [
  { key: "leads", label: "Leads", fmt: (r) => String(r.leads) },
  { key: "booked", label: "Booked", fmt: (r) => String(r.booked) },
  {
    key: "closingRatio",
    label: "Close %",
    fmt: (r) => formatPercent(r.closingRatio),
  },
  {
    key: "totalLeadCost",
    label: "Lead cost",
    fmt: (r) => formatCurrency(r.totalLeadCost),
    lowerIsBetter: true,
  },
  {
    key: "cpa",
    label: "CPA",
    fmt: (r) => (r.booked ? formatCurrency(Math.round(r.cpa)) : "—"),
    lowerIsBetter: true,
  },
  { key: "revenue", label: "Revenue", fmt: (r) => formatCurrency(r.revenue) },
];

function SortIcon({
  column,
  sortKey,
  dir,
}: {
  column: Key;
  sortKey: Key;
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

export function RepsTable({ rows }: { rows: RepRow[] }) {
  const [sortKey, setSortKey] = useState<Key>("closingRatio");
  const [dir, setDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const val = (r: RepRow) => {
      if (sortKey === "cpa" && r.booked === 0)
        return dir === "asc" ? Infinity : -Infinity;
      const v = r[sortKey];
      return typeof v === "string" ? v.toLowerCase() : Number(v);
    };
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x < y) return dir === "asc" ? -1 : 1;
      if (x > y) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, dir]);

  const onSort = (key: Key) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      const col = COLS.find((c) => c.key === key);
      setDir(key === "repName" || col?.lowerIsBetter ? "asc" : "desc");
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
              value={sortKey}
              onChange={(e) => onSort(e.target.value as Key)}
            >
              <option value="repName">Name</option>
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
          {sorted.map((r, i) => (
            <Link
              key={r.repId}
              href={`/admin/sales/reps/${r.repId}`}
              className="block rounded-xl border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-heading text-lg font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <UserAvatar name={r.repName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.repName}</p>
                  {!r.active && <Pill className="mt-0.5">Inactive</Pill>}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {COLS.map((c) => (
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
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3 text-center">#</th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => onSort("repName")}
                    className="flex items-center gap-1.5 uppercase hover:text-foreground"
                  >
                    Rep{" "}
                    <SortIcon column="repName" sortKey={sortKey} dir={dir} />
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
            <tbody className="divide-y tabular-nums">
              {sorted.map((r, i) => (
                <tr
                  key={r.repId}
                  className="group transition hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-center font-heading text-base font-bold text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/sales/reps/${r.repId}`}
                      className="flex items-center gap-3"
                    >
                      <UserAvatar
                        name={r.repName}
                        className="h-8 w-8 text-xs"
                      />
                      <span className="whitespace-nowrap font-semibold group-hover:text-primary">
                        {r.repName}
                      </span>
                      {!r.active && <Pill>Inactive</Pill>}
                    </Link>
                  </td>
                  {COLS.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-3 text-right",
                        sortKey === c.key && "bg-primary/[0.03] font-semibold",
                      )}
                    >
                      {c.fmt(r)}
                    </td>
                  ))}
                  <td className="px-3">
                    <Link
                      href={`/admin/sales/reps/${r.repId}`}
                      aria-label={`Open ${r.repName}`}
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
