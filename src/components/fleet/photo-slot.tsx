// File: src/components/fleet/photo-slot.tsx
// (NEW file)

"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | null;
  onChange: (photo: string | null) => void;
  invalid?: boolean;
  /** Shows "Optional" instead of "Required" */
  optional?: boolean;
  /** Taller tile for a single main photo */
  large?: boolean;
};

/** One photo with a fixed purpose (e.g. "Front" or "Receipt"). Tap to take it. */
export function PhotoSlot({
  label,
  value,
  onChange,
  invalid,
  optional,
  large,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      alert("The photo couldn't be read. Please try again.");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{label}</p>
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            value
              ? "text-green-700"
              : invalid
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {value ? "Added" : optional ? "Optional" : "Required"}
        </span>
      </div>

      {value ? (
        <div className="relative overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className={cn(
              "w-full object-cover",
              large ? "aspect-[16/10]" : "aspect-[4/3]",
            )}
          />
          <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/95 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Retake
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Remove ${label} photo`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/70 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border-2 border-dashed bg-white",
            invalid ? "border-destructive" : "border-input",
          )}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 text-foreground/80 transition active:scale-[0.99] disabled:opacity-60",
              large ? "aspect-[16/10]" : "aspect-[4/3]",
              invalid && "text-destructive",
            )}
          >
            {busy ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Camera className="h-7 w-7" />
            )}
            <span className="text-sm font-semibold">Take photo</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
            className="flex h-10 items-center justify-center gap-1.5 border-t text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="h-4 w-4" /> From gallery
          </button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
