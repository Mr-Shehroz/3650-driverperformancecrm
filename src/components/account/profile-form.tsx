"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/driver/form-bits";
import { updateProfileAction } from "@/app/actions/account";
import type { User } from "@/types";

export function ProfileForm({ user }: { user: User }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");

  const dirty = name !== user.name || phone !== (user.phone ?? "");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfileAction({ name, phone });
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      else if (res?.error) toast.error(res.error);
      else {
        setErrors({});
        toast.success("Profile updated");
      }
    });
  };

  return (
    <form onSubmit={save} noValidate>
      <FormSection title="Personal details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="p-name" error={errors.name}>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((er) => ({ ...er, name: "" }));
              }}
              autoComplete="name"
              aria-invalid={!!errors.name}
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field label="Phone" htmlFor="p-phone" optional error={errors.phone}>
            <Input
              id="p-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="h-12 bg-white text-base"
            />
          </Field>
          <Field
            label="Email"
            hint="Contact an admin to change your email."
            className="sm:col-span-2"
          >
            <Input
              value={user.email}
              disabled
              readOnly
              className="h-12 bg-muted/50 text-base"
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!dirty || pending}
            className="h-12 w-full px-8 font-semibold sm:w-auto"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </FormSection>
    </form>
  );
}
