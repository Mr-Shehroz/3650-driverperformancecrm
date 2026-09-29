"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Eraser, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onChange: (dataUrl: string | null) => void;
  invalid?: boolean;
};

export function SignatureField({ onChange, invalid }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);
  const [empty, setEmpty] = useState(true);

  // Keep the latest onChange without re-creating the pad
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      penColor: "#0a0a0a",
      minWidth: 1,
      maxWidth: 2.8,
      backgroundColor: "rgba(255,255,255,0)",
    });
    padRef.current = pad;

    const handleEnd = () => {
      const isEmpty = pad.isEmpty();
      setEmpty(isEmpty);
      onChangeRef.current(isEmpty ? null : pad.toDataURL("image/png"));
    };
    pad.addEventListener("endStroke", handleEnd);

    // Resize only when width changes (mobile address bar changes height constantly)
    let lastWidth = 0;
    const resize = (initial: boolean) => {
      const width = canvas.offsetWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = width * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();

      // Resizing wipes the canvas, so reset the signature (not needed on first setup)
      if (!initial) {
        setEmpty(true);
        onChangeRef.current(null);
      }
    };

    resize(true);
    const ro = new ResizeObserver(() => resize(false));
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      pad.removeEventListener("endStroke", handleEnd);
      pad.off();
      padRef.current = null;
    };
  }, []);

  const clear = () => {
    padRef.current?.clear();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed bg-white",
          invalid ? "border-destructive" : "border-input",
        )}
      >
        <canvas
          ref={canvasRef}
          className="block h-48 w-full touch-none sm:h-56"
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <PenLine className="h-6 w-6" />
            <p className="mt-1 text-sm font-medium">
              Customer signs here with finger
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-foreground/15" />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={empty}
          className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" /> Clear
        </button>
      </div>
    </div>
  );
}
