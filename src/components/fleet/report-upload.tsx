"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";

export type ReportFile = { name: string; type: "image" | "pdf"; url?: string };

export function ReportUpload({
  value,
  onChange,
}: {
  value: ReportFile | null;
  onChange: (v: ReportFile | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024)
      return toast.error("File is too large (max 15 MB).");
    setBusy(true);
    try {
      if (file.type === "application/pdf")
        onChange({ name: file.name, type: "pdf" });
      else if (file.type.startsWith("image/"))
        onChange({
          name: file.name,
          type: "image",
          url: await compressImage(file),
        });
      else toast.error("Upload a PDF or a photo.");
    } catch {
      toast.error("Couldn't read that file.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
          {value.type === "image" && value.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-primary">
              <FileText className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{value.name}</p>
            <p className="text-sm text-muted-foreground">
              {value.type === "pdf" ? "PDF report" : "Photo of report"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove file"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-white text-[15px] font-semibold text-foreground/80 transition hover:border-primary/50 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
          Upload inspection report (PDF or photo)
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
