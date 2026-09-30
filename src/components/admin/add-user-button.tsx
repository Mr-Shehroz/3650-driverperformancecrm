"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserDialog } from "./user-dialog";

export function AddUserButton({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 px-5 font-semibold"
      >
        <UserPlus className="mr-1 h-4 w-4" /> Add user
      </Button>
      <UserDialog
        open={open}
        onClose={() => setOpen(false)}
        mode="create"
        currentUserId={currentUserId}
      />
    </>
  );
}
