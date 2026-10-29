// File: src/components/sales/granot-test-buttons.tsx
// (NEW file)

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendTestGranotEventAction } from "@/app/(admin)/admin/granot-actions";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-white p-1.5 pl-3">
      <code className="min-w-0 flex-1 truncate text-sm">{value}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Couldn't copy. Select the text and copy it.");
          }
        }}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-secondary px-3 text-sm font-semibold text-white"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function GranotTestButtons() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [which, setWhich] = useState<"new_lead" | "booked" | null>(null);

  const send = (kind: "new_lead" | "booked") => {
    setWhich(kind);
    startTransition(async () => {
      const res = await sendTestGranotEventAction(kind);
      if (res.error) toast.error(res.error);
      else toast.success(res.message ?? "Test event sent");
      router.refresh();
      setWhich(null);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(
        [
          { kind: "new_lead", label: "Send test lead" },
          { kind: "booked", label: "Book the test lead" },
        ] as const
      ).map((b) => (
        <button
          key={b.kind}
          type="button"
          disabled={pending}
          onClick={() => send(b.kind)}
          className="flex h-10 items-center gap-1.5 rounded-lg border bg-white px-3.5 text-sm font-semibold hover:border-foreground/30 disabled:opacity-60"
        >
          {pending && which === b.kind ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {b.label}
        </button>
      ))}
    </div>
  );
}
