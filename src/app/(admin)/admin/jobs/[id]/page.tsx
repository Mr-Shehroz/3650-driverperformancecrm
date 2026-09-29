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
  Eye,
  EyeOff,
  FileDown,
  History,
  Lock,
  MapPin,
  Star,
  User as UserIcon,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAuditLog, getJobDetail, getUsers } from "@/lib/data";
import { ACTION_LABELS, diffLines } from "@/lib/audit";
import {
  formatCurrency,
  formatDate,
  formatDateTimeET,
  formatDestination,
  formatOrigin,
} from "@/lib/format";
import { Pill } from "@/components/shared/pill";
import { PhotoThumb } from "@/components/shared/photo-thumb";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { RecordActions } from "@/components/admin/record-actions";
import { PreDamageCorrection } from "@/components/admin/pre-damage-correction";
import { JobStatusForm } from "@/components/admin/job-status-form";
import {
  REVIEW_PLATFORM_LABELS,
  UPSELL_TYPE_LABELS,
  type AuditEntry,
} from "@/types";
import { cn } from "@/lib/utils";

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5 sm:px-5">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
          {count}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        {count === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Nothing recorded.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function DeletedPill({ at }: { at?: string | null }) {
  if (!at) return null;
  return <Pill tone="danger">Deleted {formatDate(at.slice(0, 10))}</Pill>;
}

function HistoryList({
  entries,
  names,
}: {
  entries: AuditEntry[];
  names: Record<string, string>;
}) {
  if (entries.length === 0) return null;
  return (
    <details className="group mt-3 rounded-lg border bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold">
        <History className="h-4 w-4 text-muted-foreground" />
        Record history ({entries.length})
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">
          Show
        </span>
        <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">
          Hide
        </span>
      </summary>
      <ol className="space-y-3 border-t px-3 py-3">
        {entries.map((a) => (
          <li key={a.id} className="text-sm">
            <p className="font-semibold">
              {ACTION_LABELS[a.action]} by {names[a.changedBy] ?? "Unknown"}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {formatDateTimeET(a.changedAt)}
              </span>
            </p>
            {a.reason && (
              <p className="text-muted-foreground">Reason: {a.reason}</p>
            )}
            {a.action !== "create" && (
              <ul className="mt-1 space-y-0.5">
                {diffLines(a.before, a.after).map((d) => (
                  <li key={d.field} className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {d.field}:
                    </span>{" "}
                    <span className="line-through">{d.from}</span> →{" "}
                    <span className="text-foreground">{d.to}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </details>
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

export default async function AdminJobDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const showDeleted = (await searchParams).deleted === "1";

  const job = await getJobDetail(id, { includeDeleted: showDeleted });
  if (!job) notFound();

  const [users, audit] = await Promise.all([
    getUsers(),
    getAuditLog({ jobId: id }),
  ]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const crew = job.crewIds
    .map((c) => names[c])
    .filter(Boolean)
    .join(", ");
  const historyFor = (entityId: string) =>
    audit.filter((a) => a.entityId === entityId);
  const activePreDamage = job.preDamages.filter((p) => !p.deletedAt).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/drivers/${job.driverId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {names[job.driverId] ?? "Driver"}
        </Link>
        <Link
          href={
            showDeleted
              ? `/admin/jobs/${job.id}`
              : `/admin/jobs/${job.id}?deleted=1`
          }
          scroll={false}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {showDeleted ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showDeleted ? "Hide deleted" : "Show deleted"}
        </Link>
      </div>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl bg-secondary text-white">
        <div className="h-1 bg-primary" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Job number
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-none sm:text-4xl">
              {job.jobNumber}
            </h1>

            <div className="mt-4 flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate">{formatOrigin(job)}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/50" />
              <span className="truncate">{formatDestination(job)}</span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-3 sm:gap-6">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {formatDate(job.date)}
              </p>
              <p className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" /> {names[job.driverId]}
              </p>
              <p className="flex min-w-0 items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />{" "}
                <span className="truncate">{crew}</span>
              </p>
            </div>
          </div>

          {activePreDamage > 0 ? (
            <a
              href={`/admin/jobs/${job.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
            >
              <FileDown className="h-5 w-5" /> Claims PDF
            </a>
          ) : (
            <span className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white/10 px-5 text-sm font-semibold text-white/50">
              <FileDown className="h-5 w-5" /> No pre-damage to export
            </span>
          )}
        </div>
      </div>

      <JobStatusForm job={job} />

      {/* Pre-existing damage */}
      <Section
        title="Pre-existing damage"
        icon={Camera}
        count={job.preDamages.length}
      >
        <div className="space-y-4">
          {job.preDamages.map((p) => {
            const history = historyFor(p.id);
            const corrected = history.some((h) => h.action === "update");
            return (
              <article
                key={p.id}
                className={cn(
                  "rounded-xl border p-4",
                  p.deletedAt && "border-dashed opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.location}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="dark">
                      <Lock className="h-3 w-3" /> Locked
                    </Pill>
                    {corrected && <Pill tone="primary">Corrected</Pill>}
                    {p.syncedOffline && (
                      <Pill tone="warning">
                        <CloudOff className="h-3 w-3" /> Offline
                      </Pill>
                    )}
                    <DeletedPill at={p.deletedAt} />
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

                <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Customer
                    </p>
                    <p className="mt-1 font-semibold">{p.customerName}</p>
                    <p className="text-muted-foreground">
                      Shown damage: {p.customerShown ? "Yes" : "No"}
                    </p>
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
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                      Device: {formatDateTimeET(p.capturedAtDevice)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />{" "}
                      Server: {formatDateTimeET(p.receivedAtServer)}
                    </p>
                    {p.lat !== null && p.lng !== null ? (
                      <a
                        href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" /> {p.lat.toFixed(5)},{" "}
                        {p.lng.toFixed(5)}
                      </a>
                    ) : (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> No GPS
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-start justify-end gap-2">
                  {!p.deletedAt && <PreDamageCorrection record={p} />}
                  <RecordActions
                    kind="pre_damage"
                    id={p.id}
                    deleted={!!p.deletedAt}
                  />
                </div>

                <HistoryList entries={history} names={names} />
              </article>
            );
          })}
        </div>
      </Section>

      {/* Damage incidents */}
      <Section
        title="Damage incidents"
        icon={AlertTriangle}
        count={job.damages.length}
      >
        <div className="space-y-4">
          {job.damages.map((d) => (
            <article
              key={d.id}
              className={cn(
                "rounded-xl border p-4",
                d.deletedAt && "border-dashed opacity-60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{d.item}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={d.claimFiled ? "danger" : "neutral"}>
                    {d.claimFiled ? "Claim filed" : "No claim"}
                  </Pill>
                  <Pill>{formatCurrency(d.estimatedCost)}</Pill>
                  <DeletedPill at={d.deletedAt} />
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
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {job.deliveredBy === "partner"
                    ? "Partner delivery · not counted in damage rate"
                    : `Reported ${formatDateTimeET(d.createdAt)}`}
                </p>
                <RecordActions
                  kind="damage"
                  id={d.id}
                  deleted={!!d.deletedAt}
                />
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Reviews */}
      <Section title="Reviews" icon={Star} count={job.reviews.length}>
        <div className="divide-y">
          {job.reviews.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0",
                r.deletedAt && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {REVIEW_PLATFORM_LABELS[r.platform]}
                  </p>
                  <DeletedPill at={r.deletedAt} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Stars value={r.stars} />
                  <span>
                    {r.driverMentioned ? "Driver named" : "Driver not named"}
                  </span>
                  {r.link && (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Link
                    </a>
                  )}
                  {r.screenshotUrl && (
                    <a
                      href={r.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Screenshot
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!r.deletedAt && (
                  <VerifyToggle kind="review" id={r.id} verified={r.verified} />
                )}
                <RecordActions
                  kind="review"
                  id={r.id}
                  deleted={!!r.deletedAt}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Upsells */}
      <Section title="Upsells" icon={DollarSign} count={job.upsells.length}>
        <div className="divide-y">
          {job.upsells.map((u) => (
            <div
              key={u.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0",
                u.deletedAt && "opacity-60",
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="font-semibold">{UPSELL_TYPE_LABELS[u.type]}</p>
                <p className="font-heading text-lg font-bold">
                  {formatCurrency(u.amount)}
                </p>
                <DeletedPill at={u.deletedAt} />
              </div>
              <div className="flex items-center gap-2">
                {!u.deletedAt && (
                  <VerifyToggle kind="upsell" id={u.id} verified={u.verified} />
                )}
                <RecordActions
                  kind="upsell"
                  id={u.id}
                  deleted={!!u.deletedAt}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
