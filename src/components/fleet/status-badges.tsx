import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  OctagonX,
  ShieldCheck,
} from "lucide-react";
import { Pill } from "@/components/shared/pill";
import {
  ROADSIDE_RESULT_LABELS,
  TICKET_STATUS_LABELS,
  TRUCK_STATUS_LABELS,
  type RoadsideResult,
  type TicketStatus,
  type TruckStatus,
} from "@/types";

export function TruckStatusPill({ status }: { status: TruckStatus }) {
  if (status === "safe")
    return (
      <Pill tone="success">
        <ShieldCheck className="h-3.5 w-3.5" /> {TRUCK_STATUS_LABELS.safe}
      </Pill>
    );
  if (status === "repair_soon")
    return (
      <Pill tone="warning">
        <AlertTriangle className="h-3.5 w-3.5" />{" "}
        {TRUCK_STATUS_LABELS.repair_soon}
      </Pill>
    );
  return (
    <Pill tone="danger">
      <OctagonX className="h-3.5 w-3.5" /> {TRUCK_STATUS_LABELS.do_not_drive}
    </Pill>
  );
}

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  if (status === "open")
    return (
      <Pill tone="danger">
        <AlertTriangle className="h-3.5 w-3.5" /> {TICKET_STATUS_LABELS.open}
      </Pill>
    );
  if (status === "in_progress")
    return (
      <Pill tone="warning">
        <Clock className="h-3.5 w-3.5" /> {TICKET_STATUS_LABELS.in_progress}
      </Pill>
    );
  return (
    <Pill tone="success">
      <CheckCircle2 className="h-3.5 w-3.5" /> {TICKET_STATUS_LABELS.fixed}
    </Pill>
  );
}

export function RoadsideResultPill({ result }: { result: RoadsideResult }) {
  if (result === "clean")
    return (
      <Pill tone="success">
        <CheckCircle2 className="h-3.5 w-3.5" /> {ROADSIDE_RESULT_LABELS.clean}
      </Pill>
    );
  if (result === "violations")
    return (
      <Pill tone="warning">
        <AlertTriangle className="h-3.5 w-3.5" />{" "}
        {ROADSIDE_RESULT_LABELS.violations}
      </Pill>
    );
  return (
    <Pill tone="danger">
      <OctagonX className="h-3.5 w-3.5" />{" "}
      {ROADSIDE_RESULT_LABELS.out_of_service}
    </Pill>
  );
}
