"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type Fmt = "number" | "currency" | "percent";

const fmt = (v: number, f: Fmt) =>
  f === "currency"
    ? `$${v.toLocaleString()}`
    : f === "percent"
      ? `${v}%`
      : v.toLocaleString();

export function MetricChart({
  title,
  subtitle,
  data,
  xKey,
  metrics,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  xKey: string;
  metrics: { key: string; label: string; format: Fmt }[];
}) {
  const [active, setActive] = useState(metrics[0].key);
  const m = metrics.find((x) => x.key === active)!;

  return (
    <div className="w-full min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
          {metrics.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setActive(x.key)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition",
                active === x.key
                  ? "bg-secondary text-white"
                  : "bg-muted text-foreground/70 hover:text-foreground",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#e4e4e7" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickFormatter={(v: number) => fmt(v, m.format)}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(v) => [fmt(Number(v ?? 0), m.format), m.label]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e4e4e7",
                fontSize: 13,
              }}
            />
            <Bar
              dataKey={active}
              fill="#d71920"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
