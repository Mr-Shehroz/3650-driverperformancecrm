import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CloudOff,
  DollarSign,
  ExternalLink,
  Lock,
  MapPin,
  Plus,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getJobDetail, getUsers } from "@/lib/data";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDestination,
  formatOrigin,
} from "@/lib/format";
import { Pill } from "@/components/shared/pill";
import { PhotoThumb } from "@/components/shared/photo-thumb";
import { REVIEW_PLATFORM_LABELS, UPSELL_TYPE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

function Section({
  title,
  icon: Icon,
  count,
  addHref,
  addLabel,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  addHref: string;
  addLabel: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="truncate text-lg font-bold">{title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
            {count}
          </span>
        </div>
        <Link
          href={addHref}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden min-[400px]:inline">{addLabel}</span>
          <span className="min-[400px]:hidden">Add</span>
        </Link>
      </div>
      <div className="p-4 sm:p-5">
        {count === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function OnTime({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) return <Pill>{label}: pending</Pill>;
  return value ? (
    <Pill tone="success">
      <CheckCircle2 className="h-3.5 w-3.5" /> {label} on time
    </Pill>
  ) : (
    <Pill tone="danger">
      <XCircle className="h-3.5 w-3.5" /> {label} late
    </Pill>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export default async function DriverJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("driver");
  const { id } = await params;
  const job = await getJobDetail(id);

  // Drivers can only see their own jobs
  if (!job || job.driverId !== user.id) notFound();

  const users = await getUsers();
  const crew = job.crewIds
    .map((cid) => users.find((u) => u.id === cid)?.name)
    .filter(Boolean);
  const base = `/driver/jobs/${job.id}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link
        href="/driver/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All jobs
      </Link>

      {/* Job header */}
      <div className="overflow-hidden rounded-2xl bg-secondary text-white">
        <div className="h-1 bg-primary" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Job number
              </p>
              <h1 className="mt-1 text-[28px] font-bold leading-none sm:text-4xl">
                {job.jobNumber}
              </h1>
            </div>
            <Pill
              tone={job.deliveredBy === "partner" ? "neutral" : "primary"}
              className={
                job.deliveredBy === "drs" ? "bg-primary text-white" : ""
              }
            >
              {job.deliveredBy === "partner" ? "Partner delivery" : "DRS crew"}
            </Pill>
          </div>

          <div className="mt-5 flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">{formatOrigin(job)}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/50" />
            <span className="truncate">{formatDestination(job)}</span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {formatDate(job.date)}
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />{" "}
              <span className="truncate">{crew.join(", ")}</span>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <OnTime label="Pickup" value={job.onTimePickup} />
            <OnTime label="Delivery" value={job.onTimeDelivery} />
          </div>
        </div>
      </div>

      {/* Pre-existing damage */}
      <Section
        title="Pre-existing damage"
        icon={Camera}
        count={job.preDamages.length}
        addHref={`${base}/pre-damage/new`}
        addLabel="Log damage"
        emptyText="No pre-existing damage logged at pickup."
      >
        <div className="space-y-4">
          {job.preDamages.map((p) => (
            <article key={p.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{p.item}</p>
                  <p className="text-sm text-muted-foreground">{p.location}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.locked && (
                    <Pill tone="dark">
                      <Lock className="h-3 w-3" /> Locked
                    </Pill>
                  )}
                  {p.syncedOffline && (
                    <Pill tone="warning">
                      <CloudOff className="h-3 w-3" /> Saved offline
                    </Pill>
                  )}
                </div>
              </div>

              <p className="mt-2 text-[15px]">{p.description}</p>
              {p.notes && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Note: {p.notes}
                </p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {p.photos.map((src, i) => (
                  <PhotoThumb
                    key={src + i}
                    src={src}
                    alt={`${p.item} photo ${i + 1}`}
                  />
                ))}
              </div>

              <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer
                  </p>
                  <p className="mt-1 font-semibold">{p.customerName}</p>
                  {p.signatureUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.signatureUrl}
                      alt="Customer signature"
                      className="mt-2 h-14 rounded border bg-white object-contain p-1"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Record
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Captured {formatDateTime(p.capturedAtDevice)}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Received {formatDateTime(p.receivedAtServer)}
                  </p>
                  {p.lat !== null && p.lng !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Damage incidents */}
      <Section
        title="Damage incidents"
        icon={AlertTriangle}
        count={job.damages.length}
        addHref={`${base}/damage/new`}
        addLabel="Report damage"
        emptyText="No damage reported on this job."
      >
        <div className="space-y-4">
          {job.damages.map((d) => (
            <article key={d.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{d.item}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={d.claimFiled ? "danger" : "neutral"}>
                    {d.claimFiled ? "Claim filed" : "No claim"}
                  </Pill>
                  <Pill>{formatCurrency(d.estimatedCost)}</Pill>
                </div>
              </div>
              <p className="mt-2 text-[15px]">{d.description}</p>
              {d.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {d.photos.map((src, i) => (
                    <PhotoThumb
                      key={src + i}
                      src={src}
                      alt={`${d.item} photo ${i + 1}`}
                    />
                  ))}
                </div>
              )}
              {job.deliveredBy === "partner" && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Partner delivery — not counted in your damage rate.
                </p>
              )}
            </article>
          ))}
        </div>
      </Section>

      {/* Reviews */}
      <Section
        title="Reviews"
        icon={Star}
        count={job.reviews.length}
        addHref={`${base}/review/new`}
        addLabel="Add review"
        emptyText="No reviews added yet."
      >
        <div className="divide-y">
          {job.reviews.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {REVIEW_PLATFORM_LABELS[r.platform]}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={r.stars} />
                  {r.driverMentioned && (
                    <span className="text-xs text-muted-foreground">
                      · Named you
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.verified && <Pill tone="success">Verified</Pill>}
                {r.link && (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open review"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Upsells */}
      <Section
        title="Upsells"
        icon={DollarSign}
        count={job.upsells.length}
        addHref={`${base}/upsell/new`}
        addLabel="Add upsell"
        emptyText="No upsells added yet."
      >
        <div className="divide-y">
          {job.upsells.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <p className="font-semibold">{UPSELL_TYPE_LABELS[u.type]}</p>
              <div className="flex items-center gap-2">
                {u.verified && <Pill tone="success">Verified</Pill>}
                <p className="font-heading text-lg font-bold">
                  {formatCurrency(u.amount)}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <p className="text-sm font-semibold text-muted-foreground">Total</p>
            <p className="font-heading text-xl font-bold text-primary">
              {formatCurrency(job.upsells.reduce((s, u) => s + u.amount, 0))}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
