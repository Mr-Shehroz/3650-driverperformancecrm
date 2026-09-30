"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PasswordReveal({
  name,
  email,
  password,
  onDone,
}: {
  name: string;
  email: string;
  password: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Email: ${email}\nTemporary password: ${password}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        "Couldn't copy. Please select and copy the password manually.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Share these login details with <strong>{name}</strong>. The password
          won&apos;t be shown again.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email
          </p>
          <p className="mt-0.5 break-all font-semibold">{email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Temporary password
          </p>
          <p className="mt-1 select-all rounded-lg bg-white px-3 py-2.5 font-mono text-xl font-bold tracking-wider">
            {password}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={copy}
          className="h-12 font-semibold"
        >
          {copied ? (
            <Check className="mr-1 h-4 w-4" />
          ) : (
            <Copy className="mr-1 h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy details"}
        </Button>
        <Button
          type="button"
          onClick={onDone}
          className="h-12 px-8 font-semibold"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
