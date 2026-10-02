import { cn } from "@/lib/utils";

/** Logo file in /public */
const LOGO = "/logo.webp";

type Props = {
  /** Smaller logo for headers and sidebars */
  compact?: boolean;
  /** Square logo for the collapsed sidebar */
  iconOnly?: boolean;
  /** Kept so existing <Brand tone="light" /> calls still work */
  tone?: "dark" | "light";
  className?: string;
};

export function Brand({ compact = false, iconOnly = false, className }: Props) {
  if (iconOnly) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO}
        alt="Direct Relocation Services"
        className={cn("block h-12 w-12 shrink-0 object-contain", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO}
      alt="Direct Relocation Services"
      className={cn(
        "block w-auto shrink-0 object-contain",
        compact ? "h-12" : "h-16 sm:h-20",
        className,
      )}
    />
  );
}
