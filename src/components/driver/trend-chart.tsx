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
import type { MonthlyPoint } from "@/types";

const METRICS = [
  { key: "jobs", label: "Jobs", fmt: (v: number) => String(v) },
  {
    key: "upsells",
    label: "Upsells",
    fmt: (v: number) => `$${v.toLocaleString()}`,
  },
  { key: "damageRate", label: "Damage %", fmt: (v: number) => `${v}%` },
  { key: "avgStars", label: "Rating", fmt: (v: number) => v.toFixed(1) },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export function TrendChart({ data }: { data: MonthlyPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("jobs");
  const current = METRICS.find((m) => m.key === metric)!;

  return (
    <div className="w-full min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Monthly trend</h2>
          <p className="text-sm text-muted-foreground">
            Last {data.length} months
          </p>
        </div>
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition",
                metric === m.key
                  ? "bg-secondary text-white"
                  : "bg-muted text-foreground/70 hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#e4e4e7" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={metric === "avgStars"}
              domain={metric === "avgStars" ? [0, 5] : [0, "auto"]}
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickFormatter={(v: number) =>
                metric === "upsells" ? `$${v}` : String(v)
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(v) => [current.fmt(Number(v ?? 0)), current.label]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e4e4e7",
                fontSize: 13,
              }}
            />
            <Bar
              dataKey={metric}
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
