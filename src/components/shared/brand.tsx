import { cn } from "@/lib/utils";

type Props = {
  tone?: "dark" | "light"; // dark = on black background
  compact?: boolean;
  className?: string;
  textClassName?: string;
};

export function Brand({
  tone = "dark",
  compact = false,
  className,
  textClassName,
}: Props) {
  const onDark = tone === "dark";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary font-heading font-extrabold tracking-wide text-white [clip-path:polygon(0_0,100%_0,100%_72%,72%_100%,0_100%)]",
          compact ? "h-9 w-9 text-[13px]" : "h-11 w-11 text-base",
        )}
      >
        DRS
      </div>
      <div className={cn("leading-none", textClassName)}>
        <p
          className={cn(
            "font-heading font-bold tracking-wide",
            compact ? "text-[15px]" : "text-lg",
            onDark ? "text-white" : "text-foreground",
          )}
        >
          DIRECT RELOCATION
        </p>
        <p
          className={cn(
            "mt-1 font-semibold uppercase tracking-[0.3em]",
            compact ? "text-[9px]" : "text-[11px]",
            onDark ? "text-white/55" : "text-muted-foreground",
          )}
        >
          Services
        </p>
      </div>
    </div>
  );
}
