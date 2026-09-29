import { cn } from "@/lib/utils";

export function PhotoThumb({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "block overflow-hidden rounded-lg border bg-muted",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="aspect-[4/3] h-full w-full object-cover"
      />
    </a>
  );
}
