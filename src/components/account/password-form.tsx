"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/driver/form-bits";
import { changePasswordAction } from "@/app/actions/account";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/lib/validation/password";

const EMPTY = { current: "", next: "", confirm: "" };

function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className="h-12 bg-white pr-12 text-base"
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
  );
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState(EMPTY);

  const set = (k: keyof typeof EMPTY) => (val: string) => {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
  };

  const rules = PASSWORD_RULES.map((r) => ({
    ok: r.test(v.next),
    label: r.label,
  }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await changePasswordAction(v);
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      else if (res?.error) toast.error(res.error);
      else {
        setV(EMPTY);
        setErrors({});
        toast.success(
          "Password changed. Use your new password next time you log in.",
        );
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate id="password" className="scroll-mt-24">
      <FormSection
        title="Change password"
        description="Recommended if you're still using a temporary password."
      >
        <Field
          label="Current password"
          htmlFor="pw-current"
          error={errors.current}
        >
          <PasswordInput
            id="pw-current"
            value={v.current}
            onChange={set("current")}
            invalid={!!errors.current}
            autoComplete="current-password"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="New password" htmlFor="pw-next" error={errors.next}>
            <PasswordInput
              id="pw-next"
              value={v.next}
              onChange={set("next")}
              invalid={!!errors.next}
              autoComplete="new-password"
            />
          </Field>
          <Field
            label="Confirm new password"
            htmlFor="pw-confirm"
            error={errors.confirm}
          >
            <PasswordInput
              id="pw-confirm"
              value={v.confirm}
              onChange={set("confirm")}
              invalid={!!errors.confirm}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {rules.map((r) => (
            <li
              key={r.label}
              className={cn(
                "flex items-center gap-1.5",
                r.ok ? "text-green-700" : "text-muted-foreground",
              )}
            >
              {r.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{" "}
              {r.label}
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending || !v.current || !v.next || !v.confirm}
            className="h-12 w-full px-8 font-semibold sm:w-auto"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </FormSection>
    </form>
  );
}
