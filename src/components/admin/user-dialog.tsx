"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ChoiceGrid, Field, FormError } from "@/components/driver/form-bits";
import { PasswordField } from "./password-field";
import { PasswordReveal } from "./password-reveal";
import {
  createUserAction,
  updateUserAction,
} from "@/app/(admin)/admin/actions";
import { ROLE_LABELS, type Role, type User } from "@/types";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/shared/avatar-uploader";

const ROLES = (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  user?: User;
  currentUserId: string;
};

export function UserDialog({
  open,
  onClose,
  mode,
  user,
  currentUserId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [created, setCreated] = useState<{
    name: string;
    email: string;
    password: string;
  }>();

  const empty = {
    name: "",
    email: "",
    phone: "",
    role: "" as Role | "",
    password: "",
  };
  const [values, setValues] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: (user?.role ?? "") as Role | "",
    password: "",
  });

  const isSelf = user?.id === currentUserId;

  const set = (k: keyof typeof values) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
  };

  const close = () => {
    setErrors({});
    setFormError(undefined);
    setCreated(undefined);
    if (mode === "create") setValues(empty);
    else setValues((s) => ({ ...s, password: "" }));
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    startTransition(async () => {
      const input = { ...values, role: values.role as Role };

      if (mode === "create") {
        const res = await createUserAction(input);
        if (res.fieldErrors) setErrors(res.fieldErrors);
        else if (res.error) setFormError(res.error);
        else {
          setCreated({
            name: values.name,
            email: values.email,
            password: values.password,
          });
          router.refresh();
        }
        return;
      }

      if (!user) return;
      const res = await updateUserAction(user.id, input);
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      else if (res?.error) setFormError(res.error);
      else {
        toast.success(
          values.password
            ? "User updated and new password saved"
            : "User updated",
        );
        router.refresh();
        close();
      }
    });
  };

  if (created) {
    return (
      <Modal open={open} onClose={close} title="User created">
        <PasswordReveal
          name={created.name}
          email={created.email}
          password={created.password}
          onDone={close}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === "create" ? "Add user" : "Edit user"}
      description={
        mode === "create" ? "Set their login details and role." : undefined
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={formError} />
        {mode === "edit" && user && (
          <AvatarUploader
            userId={user.id}
            name={user.name}
            avatarUrl={user.avatarUrl}
          />
        )}

        <Field label="Full name" htmlFor="u-name" error={errors.name}>
          <Input
            id="u-name"
            value={values.name}
            onChange={(e) => set("name")(e.target.value)}
            autoComplete="off"
            aria-invalid={!!errors.name}
            className="h-12 bg-white text-base"
          />
        </Field>

        <Field label="Email" htmlFor="u-email" error={errors.email}>
          <Input
            id="u-email"
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => set("email")(e.target.value)}
            autoComplete="off"
            aria-invalid={!!errors.email}
            className="h-12 bg-white text-base"
          />
        </Field>

        <Field label="Phone" htmlFor="u-phone" error={errors.phone} optional>
          <Input
            id="u-phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => set("phone")(e.target.value)}
            autoComplete="off"
            className="h-12 bg-white text-base"
          />
        </Field>

        <Field
          label="Role"
          error={errors.role}
          hint={isSelf ? "You can't change your own role." : undefined}
        >
          <fieldset disabled={isSelf} className="disabled:opacity-60">
            <ChoiceGrid
              ariaLabel="Role"
              value={values.role}
              onChange={(r) => set("role")(r)}
              options={ROLES}
              invalid={!!errors.role}
              className="grid-cols-3"
            />
          </fieldset>
        </Field>

        <PasswordField
          id="u-password"
          label={mode === "create" ? "Password" : "New password"}
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          optional={mode === "edit"}
          hint={
            mode === "edit"
              ? "Leave empty to keep their current password."
              : "Type a password or tap Generate."
          }
        />

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="h-12 rounded-lg px-6 font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={pending}
            className="h-12 px-8 font-semibold"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : mode === "create" ? (
              "Create user"
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
