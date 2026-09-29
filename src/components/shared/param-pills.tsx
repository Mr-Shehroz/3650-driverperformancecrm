"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function ParamPills({
  param,
  options,
  allLabel = "All",
  label,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(param) ?? "";

  const set = (v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(param, v);
    else q.delete(param);
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  };

  const all = [{ value: "", label: allLabel }, ...options];

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {label && (
        <span className="hidden shrink-0 text-sm font-semibold text-muted-foreground sm:inline">
          {label}
        </span>
      )}
      <div className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1">
        {all.map((o) => (
          <button
            key={o.value || "all"}
            type="button"
            onClick={() => set(o.value)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition",
              current === o.value
                ? "border-primary bg-primary text-white"
                : "bg-white text-foreground/70 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
