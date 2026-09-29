"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toggleVerifiedAction } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";

export function VerifyToggle({
  kind,
  id,
  verified,
}: {
  kind: "review" | "upsell";
  id: string;
  verified: boolean;
}) {
  const [value, setValue] = useState(verified);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const res = await toggleVerifiedAction(kind, id, next);
      if (res?.error) {
        setValue(!next);
        alert(res.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={value}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition",
        value
          ? "border-green-200 bg-green-50 text-green-700"
          : "bg-white text-muted-foreground hover:text-foreground",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : value ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      {value ? "Verified" : "Verify"}
    </button>
  );
}
