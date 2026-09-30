"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/driver/form-bits";
import { generateTempPassword } from "@/lib/password";
import { PASSWORD_RULES } from "@/lib/validation/password";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
  hint?: string;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  optional,
  hint,
}: Props) {
  const [show, setShow] = useState(false);

  const generate = () => {
    onChange(generateTempPassword(12));
    setShow(true);
  };

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Password copied");
    } catch {
      toast.error("Couldn't copy. Please copy it manually.");
    }
  };

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      optional={optional}
      hint={!value ? hint : undefined}
    >
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          spellCheck={false}
          aria-invalid={!!error}
          className="h-12 bg-white pr-12 font-mono text-base tracking-wide"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {value ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(value);
              return (
                <li
                  key={r.label}
                  className={cn(
                    "flex items-center gap-1",
                    ok ? "text-green-700" : "text-muted-foreground",
                  )}
                >
                  {ok ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}{" "}
                  {r.label}
                </li>
              );
            })}
          </ul>
        ) : (
          <span />
        )}

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={generate}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition hover:border-foreground/30"
          >
            <Wand2 className="h-4 w-4" /> Generate
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={!value}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition hover:border-foreground/30 disabled:opacity-40"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>
      </div>
    </Field>
  );
}
