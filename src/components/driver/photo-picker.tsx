"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { compressImage } from "@/lib/image";
import { MAX_PHOTOS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  invalid?: boolean;
};

export function PhotoPicker({
  value,
  onChange,
  max = MAX_PHOTOS,
  invalid,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const remaining = max - value.length;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const picked = Array.from(files).slice(0, remaining);
      const compressed = await Promise.all(picked.map((f) => compressImage(f)));
      onChange([...value, ...compressed]);
    } catch {
      alert("One of the photos couldn't be read. Please try again.");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((src, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-lg bg-secondary text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60",
            )}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            Take photo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-white text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60",
              invalid
                ? "border-destructive text-destructive"
                : "border-input text-foreground/80",
            )}
          >
            <ImagePlus className="h-5 w-5" />
            Gallery
          </button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {value.length} / {max} photos {remaining === 0 && "· maximum reached"}
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
