"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  PERIOD_OPTIONS,
  defaultCustomRange,
  resolveFilters,
} from "@/lib/periods";
import { cn } from "@/lib/utils";

export function FilterBar({ showVerified = true }: { showVerified?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = resolveFilters({
    period: sp.get("period") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  const verified = sp.get("verified") === "1";

  const [from, setFrom] = useState(current.range?.from ?? "");
  const [to, setTo] = useState(current.range?.to ?? "");

  const push = (updates: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([k, v]) =>
      v === null || v === "" ? q.delete(k) : q.set(k, v),
    );
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  };

  const choose = (key: string) => {
    if (key === "custom") {
      const d =
        current.range?.from && current.range?.to
          ? current.range
          : defaultCustomRange();
      setFrom(d.from ?? "");
      setTo(d.to ?? "");
      push({ period: "custom", from: d.from ?? null, to: d.to ?? null });
    } else {
      push({ period: key, from: null, to: null });
    }
  };

  const dateInput =
    "h-10 min-w-0 flex-1 rounded-lg border border-input bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-40 sm:flex-none";

  return (
    <div className="mb-6 rounded-2xl border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => choose(p.key)}
              className={cn(
                "h-10 shrink-0 rounded-lg px-3.5 text-sm font-semibold transition",
                current.period === p.key
                  ? "bg-secondary text-white"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {current.period === "custom" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                push({ period: "custom", from, to });
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={dateInput}
                aria-label="From date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={dateInput}
                aria-label="To date"
              />
              <button
                type="submit"
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Apply
              </button>
            </form>
          ) : (
            <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-muted/60 px-3 text-sm font-medium text-foreground/80">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {current.rangeText}
            </span>
          )}

          {showVerified && (
            <button
              type="button"
              role="switch"
              aria-checked={verified}
              onClick={() => push({ verified: verified ? null : "1" })}
              className="flex h-10 items-center gap-2.5 rounded-lg px-2 text-sm font-semibold"
            >
              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  verified ? "bg-primary" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    verified ? "left-[22px]" : "left-0.5",
                  )}
                />
              </span>
              Verified only
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
