"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PasswordField } from "./password-field";
import { UserDialog } from "./user-dialog";
import {
  setPasswordAction,
  setUserActiveAction,
} from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { useRouter } from "next/navigation";

const btn =
  "flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition disabled:opacity-50";

function SetPasswordDialog({
  user,
  open,
  onClose,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const close = () => {
    setPassword("");
    setError(undefined);
    onClose();
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await setPasswordAction(user.id, password);
      if (res?.fieldErrors?.password) setError(res.fieldErrors.password);
      else if (res?.error) toast.error(res.error);
      else {
        toast.success(`New password saved for ${user.name}`);
        close();
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Set password"
      description={`${user.name} · ${user.email}`}
    >
      <form onSubmit={save} className="space-y-5" noValidate>
        <PasswordField
          id={`pw-${user.id}`}
          label="New password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (error) setError(undefined);
          }}
          error={error}
          hint="Type a password or tap Generate. Their old password stops working right away."
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="h-12 rounded-lg px-6 font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={pending || !password}
            className="h-12 px-8 font-semibold"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Save password"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function UserRowActions({
  user,
  currentUserId,
}: {
  user: User;
  currentUserId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isSelf = user.id === currentUserId;

  const doDeactivate = async () => {
    const res = await setUserActiveAction(user.id, false);
    if (res?.error) {
      toast.error(res.error);
      return false;
    }
    toast.success(`${user.name} was deactivated.`);
    router.refresh();
  };

  const activate = () =>
    startTransition(async () => {
      const res = await setUserActiveAction(user.id, true);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(`${user.name} is active again.`);
        router.refresh();
      }
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className={cn(btn, "hover:border-foreground/30")}
      >
        <Pencil className="h-4 w-4" />{" "}
        <span className="hidden xl:inline">Edit</span>
      </button>

      <button
        type="button"
        onClick={() => setPasswordOpen(true)}
        className={cn(btn, "hover:border-foreground/30")}
        title="Set password"
      >
        <KeyRound className="h-4 w-4" />{" "}
        <span className="hidden xl:inline">Set password</span>
      </button>

      {!isSelf &&
        (user.active ? (
          <button
            type="button"
            onClick={() => setConfirmDeactivate(true)}
            className={cn(
              btn,
              "text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700",
            )}
          >
            <PowerOff className="h-4 w-4" />{" "}
            <span className="hidden xl:inline">Deactivate</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={activate}
            disabled={pending}
            className={cn(
              btn,
              "border-green-200 text-green-700 hover:bg-green-50",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            <span className="hidden xl:inline">Activate</span>
          </button>
        ))}

      <UserDialog
        key={`${user.id}-${editOpen}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        user={user}
        currentUserId={currentUserId}
      />

      <SetPasswordDialog
        user={user}
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title={`Deactivate ${user.name}?`}
        description="They won't be able to log in. All their jobs, records and stats are kept, and you can reactivate them any time."
        tone="danger"
        confirmLabel="Deactivate"
        onConfirm={doDeactivate}
      />
    </div>
  );
}
