"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PasswordReveal } from "./password-reveal";
import { UserDialog } from "./user-dialog";
import {
  resetPasswordAction,
  setUserActiveAction,
} from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const btn =
  "flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition disabled:opacity-50";

export function UserRowActions({
  user,
  currentUserId,
}: {
  user: User;
  currentUserId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"reset" | "deactivate" | null>(null);
  const [tempPassword, setTempPassword] = useState<string>();
  const [pending, startTransition] = useTransition();
  const isSelf = user.id === currentUserId;

  const doReset = async () => {
    const res = await resetPasswordAction(user.id);
    if (res.error) {
      toast.error(res.error);
      return false;
    }
    setTempPassword(res.tempPassword);
  };

  const doDeactivate = async () => {
    const res = await setUserActiveAction(user.id, false);
    if (res?.error) {
      toast.error(res.error);
      return false;
    }
    toast.success(`${user.name} was deactivated.`);
  };

  const activate = () =>
    startTransition(async () => {
      const res = await setUserActiveAction(user.id, true);
      if (res?.error) toast.error(res.error);
      else toast.success(`${user.name} is active again.`);
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
        onClick={() => setConfirm("reset")}
        className={cn(btn, "hover:border-foreground/30")}
        title="Reset password"
      >
        <KeyRound className="h-4 w-4" />{" "}
        <span className="hidden xl:inline">Reset password</span>
      </button>

      {!isSelf &&
        (user.active ? (
          <button
            type="button"
            onClick={() => setConfirm("deactivate")}
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

      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        title="Reset password?"
        description={`A new temporary password will be created for ${user.name}. Their current password will stop working.`}
        confirmLabel="Reset password"
        onConfirm={doReset}
      />

      <ConfirmDialog
        open={confirm === "deactivate"}
        onClose={() => setConfirm(null)}
        title={`Deactivate ${user.name}?`}
        description="They won't be able to log in. All their jobs, records and stats are kept, and you can reactivate them any time."
        tone="danger"
        confirmLabel="Deactivate"
        onConfirm={doDeactivate}
      />

      <Modal
        open={!!tempPassword}
        onClose={() => setTempPassword(undefined)}
        title="Password reset"
      >
        {tempPassword && (
          <PasswordReveal
            name={user.name}
            email={user.email}
            password={tempPassword}
            onDone={() => setTempPassword(undefined)}
          />
        )}
      </Modal>
    </div>
  );
}
