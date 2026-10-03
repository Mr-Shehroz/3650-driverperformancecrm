"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PhotoThumb } from "@/components/shared/photo-thumb";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateTicketStatusAction } from "@/app/(admin)/admin/fleet-actions";
import { formatDateTimeET } from "@/lib/format";
import {
  CHECK_ITEMS,
  type MaintenanceTicket,
  type TicketStatus,
} from "@/types";
import { TicketStatusPill, TruckStatusPill } from "./status-badges";
import { cn } from "@/lib/utils";

export function TicketCard({
  ticket,
  unitNumber,
  driverName,
  showTruck = true,
}: {
  ticket: MaintenanceTicket;
  unitNumber: string;
  driverName: string;
  showTruck?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmFix, setConfirmFix] = useState(false);
  const label =
    CHECK_ITEMS.find((c) => c.key === ticket.itemKey)?.label ?? ticket.itemKey;

  const move = (status: TicketStatus) =>
    startTransition(async () => {
      const res = await updateTicketStatusAction(ticket.id, status);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(
          `Ticket marked ${status === "open" ? "open" : "in progress"}`,
        );
        router.refresh();
      }
    });

  const btn =
    "flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition disabled:opacity-50";

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5",
        ticket.status === "fixed" && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {showTruck && (
              <Link
                href={`/admin/trucks/${ticket.truckId}`}
                className="text-primary hover:underline"
              >
                Unit {unitNumber}
              </Link>
            )}
            {showTruck && " · "}
            {label}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Reported by {driverName} · {formatDateTimeET(ticket.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TruckStatusPill status={ticket.severity} />
          <TicketStatusPill status={ticket.status} />
        </div>
      </div>

      {ticket.notes && <p className="mt-3 text-[15px]">{ticket.notes}</p>}
      {ticket.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {ticket.photos.map((src, i) => (
            <PhotoThumb
              key={src + i}
              src={src}
              alt={`${label} photo ${i + 1}`}
            />
          ))}
        </div>
      )}
      {ticket.status === "fixed" && ticket.fixNote && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          <span className="font-semibold">Fixed:</span> {ticket.fixNote}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <Link
          href={`/admin/pre-trip/${ticket.inspectionId}`}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          View inspection
        </Link>
        <div className="flex flex-wrap gap-2">
          {pending && (
            <Loader2 className="h-5 w-5 animate-spin self-center text-muted-foreground" />
          )}
          {ticket.status !== "in_progress" && ticket.status !== "fixed" && (
            <button
              type="button"
              onClick={() => move("in_progress")}
              disabled={pending}
              className={cn(btn, "hover:border-amber-300 hover:bg-amber-50")}
            >
              <Clock className="h-4 w-4" /> In progress
            </button>
          )}
          {ticket.status !== "fixed" ? (
            <button
              type="button"
              onClick={() => setConfirmFix(true)}
              disabled={pending}
              className={cn(
                btn,
                "border-green-200 text-green-700 hover:bg-green-50",
              )}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark fixed
            </button>
          ) : (
            <button
              type="button"
              onClick={() => move("open")}
              disabled={pending}
              className={cn(btn, "hover:border-foreground/30")}
            >
              <RotateCcw className="h-4 w-4" /> Reopen
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmFix}
        onClose={() => setConfirmFix(false)}
        title="Mark as fixed?"
        description={`Unit ${unitNumber} · ${label}`}
        confirmLabel="Mark fixed"
        reasonLabel="What was fixed?"
        reasonPlaceholder="e.g. Replaced rear left inner tire"
        onConfirm={async (note) => {
          const res = await updateTicketStatusAction(ticket.id, "fixed", note);
          if (res?.error) {
            toast.error(res.error);
            return false;
          }
          toast.success("Ticket marked fixed");
          router.refresh();
        }}
      />
    </article>
  );
}
