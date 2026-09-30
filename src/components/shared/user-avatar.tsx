"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  /** Width and height in pixels */
  size?: number;
  className?: string;
}) {
  // Falls back to initials if the photo fails to load
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const style = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.38)),
  };

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={style}
        onError={() => setFailedSrc(src)}
        className={cn("shrink-0 rounded-full bg-muted object-cover", className)}
      />
    );
  }

  return (
    <span
      style={style}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-bold leading-none text-white",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
