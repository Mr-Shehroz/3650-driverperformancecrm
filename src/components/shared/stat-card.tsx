import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary";
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: Props) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground sm:text-sm">
          {label}
        </p>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
            tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-foreground/70",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-[28px]">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
