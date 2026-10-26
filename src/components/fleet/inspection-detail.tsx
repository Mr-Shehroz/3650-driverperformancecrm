// File: src/components/fleet/inspection-detail.tsx
// (REPLACE the whole file)

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CloudOff,
  ExternalLink,
  Gauge,
  MapPin,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import { Pill } from "@/components/shared/pill";
import { PhotoThumb } from "@/components/shared/photo-thumb";
import { formatDateTimeET } from "@/lib/format";
import {
  CHECK_ITEMS,
  type MaintenanceTicket,
  type PreTripInspection,
  type Truck,
} from "@/types";
import { TicketStatusPill, TruckStatusPill } from "./status-badges";
import { ConditionPhotoGrid } from "./wash-bits";
import { cn } from "@/lib/utils";

const itemLabel = (key: string) =>
  CHECK_ITEMS.find((c) => c.key === key)?.label ?? key;

export function InspectionDetail({
  inspection,
  truck,
  driverName,
  tickets,
  ticketHref,
}: {
  inspection: PreTripInspection;
  truck: Truck | null;
  driverName: string;
  tickets: MaintenanceTicket[];
  /** Link for "View" on each ticket (admin only) */
  ticketHref?: string;
}) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
      <div className="min-w-0 space-y-5">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl bg-secondary text-white">
          <div className="h-1 bg-primary" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Pre-trip inspection
                </p>
                <h1 className="mt-1 text-[28px] font-bold leading-none sm:text-4xl">
                  Unit {truck?.unitNumber ?? "—"}
                </h1>
                {truck?.description && (
                  <p className="mt-2 text-sm text-white/60">
                    {truck.description}
                  </p>
                )}
              </div>
              <TruckStatusPill status={inspection.truckStatus} />
            </div>
            <div className="mt-5 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" /> {driverName}
              </p>
              <p className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />{" "}
                {inspection.odometer.toLocaleString()} mi
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />{" "}
                {formatDateTimeET(inspection.receivedAtServer)}
              </p>
              {inspection.lat !== null && inspection.lng !== null && (
                <a
                  href={`https://www.google.com/maps?q=${inspection.lat},${inspection.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white"
                >
                  <MapPin className="h-4 w-4" /> {inspection.lat.toFixed(4)},{" "}
                  {inspection.lng.toFixed(4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {inspection.syncedOffline && (
              <div className="mt-4">
                <Pill tone="warning">
                  <CloudOff className="h-3 w-3" /> Saved offline
                </Pill>
              </div>
            )}
          </div>
        </div>

        {/* Condition photos */}
        {Object.keys(inspection.conditionPhotos).length > 0 && (
          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-bold">Truck condition</h2>
            <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
              Taken by {driverName} ·{" "}
              {formatDateTimeET(inspection.capturedAtDevice)}
            </p>
            <ConditionPhotoGrid inspection={inspection} />
          </section>
        )}

        {/* Truck wash */}
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Truck wash</h2>
            {inspection.washed ? (
              <Pill tone="success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Washed since last trip
              </Pill>
            ) : (
              <Pill>Not washed since last trip</Pill>
            )}
          </div>
          {inspection.washed && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Clean truck", url: inspection.washPhotoUrl },
                { label: "Receipt", url: inspection.washReceiptUrl },
              ].map((p) => (
                <figure key={p.label} className="min-w-0">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.label}
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center rounded-lg border border-dashed bg-muted/40 text-sm text-muted-foreground">
                      {p.label === "Receipt"
                        ? "No receipt"
                        : "Photo unavailable"}
                    </div>
                  )}
                  <figcaption className="mt-1.5 text-sm font-medium">
                    {p.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        {/* Checklist */}
        <section className="rounded-2xl border bg-card">
          <div className="border-b px-4 py-3.5 sm:px-5">
            <h2 className="text-lg font-bold">Checklist</h2>
          </div>
          <ul className="divide-y">
            {inspection.items.map((it) => (
              <li key={it.key} className="px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{itemLabel(it.key)}</p>
                  {it.status === "ok" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                      <AlertTriangle className="h-4 w-4" /> Needs attention
                    </span>
                  )}
                </div>
                {it.notes && (
                  <p
                    className={cn(
                      "mt-1.5 text-[15px]",
                      it.status === "ok" && "text-muted-foreground",
                    )}
                  >
                    {it.notes}
                  </p>
                )}
                {it.photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {it.photos.map((src, i) => (
                      <PhotoThumb
                        key={src + i}
                        src={src}
                        alt={`${itemLabel(it.key)} photo ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {inspection.notes && (
          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-bold">Other notes</h2>
            <p className="mt-2 text-[15px]">{inspection.notes}</p>
          </section>
        )}
      </div>

      {/* Side */}
      <aside className="space-y-5 xl:sticky xl:top-24">
        <section className="rounded-2xl border bg-card">
          <div className="flex items-center gap-2.5 border-b px-4 py-3.5 sm:px-5">
            <Wrench className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Maintenance tickets</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
              {tickets.length}
            </span>
          </div>
          {tickets.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No problems reported.
            </p>
          ) : (
            <ul className="divide-y">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{itemLabel(t.itemKey)}</p>
                    {t.notes && (
                      <p className="truncate text-sm text-muted-foreground">
                        {t.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <TicketStatusPill status={t.status} />
                    {ticketHref && (
                      <Link
                        href={ticketHref}
                        aria-label="Open maintenance"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-bold">Driver signature</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={inspection.signatureUrl}
            alt="Driver signature"
            className="mt-3 h-20 w-full rounded-lg border bg-white object-contain p-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Captured on device {formatDateTimeET(inspection.capturedAtDevice)}
          </p>
        </section>
      </aside>
    </div>
  );
}
