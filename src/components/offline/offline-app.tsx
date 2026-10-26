// File: src/components/offline/offline-app.tsx
// (REPLACE the whole file)

"use client";

import { useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudOff,
  CloudUpload,
  DollarSign,
  Home,
  Lock,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Wifi,
  Wrench,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Pill } from "@/components/shared/pill";
import { SyncManager } from "@/components/pwa/sync-manager";
import { NewJobForm } from "@/components/driver/new-job-form";
import { PreDamageForm } from "@/components/driver/pre-damage-form";
import { DamageForm } from "@/components/driver/damage-form";
import { ReviewForm } from "@/components/driver/review-form";
import { UpsellForm } from "@/components/driver/upsell-form";
import { PreTripForm } from "@/components/fleet/pre-trip-form";
import { OutboxView } from "./outbox-view";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  offlineDb,
  type DriverSnapshot,
  type OutboxItem,
  type SnapshotJob,
} from "@/lib/offline/db";
import {
  getCurrentUserId,
  isLocalId,
  subscribeCurrentUser,
} from "@/lib/offline/queue";
import { cn } from "@/lib/utils";

/** Same container as the rest of the app */
const CONTAINER = "mx-auto w-full max-w-[1480px] px-4 md:px-6 xl:px-10";

/* ---------- Hash routing (works without the server) ---------- */
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const getHash = () => window.location.hash.slice(1) || "/driver";

const fmtDate = (d: string) => {
  try {
    return format(parseISO(d), "MMM d, yyyy");
  } catch {
    return d;
  }
};

function jobFromOutbox(item: OutboxItem): SnapshotJob {
  const p = item.payload as Record<string, string>;
  return {
    id: item.id,
    jobNumber: p.jobNumber,
    date: p.date,
    originCity: p.originCity,
    originState: p.originState,
    destCity: p.destCity,
    destState: p.destState,
    deliveredBy: (p.deliveredBy as "drs" | "partner") ?? "drs",
  };
}

type NavKey = "home" | "new" | "outbox" | null;

function navKeyFor(path: string): NavKey {
  if (path === "/driver/jobs/new") return "new";
  if (path === "/driver/outbox") return "outbox";
  if (path === "/driver" || path === "/driver/jobs") return "home";
  return null;
}

/* ---------- Small pieces ---------- */
function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={`#${href}`}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </a>
  );
}

function Title({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 lg:mb-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {description && (
        <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function JobRow({ job, badge }: { job: SnapshotJob; badge?: React.ReactNode }) {
  return (
    <a
      href={`#/driver/jobs/${job.id}`}
      className="group block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm active:scale-[0.99] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold leading-tight">
            {job.jobNumber}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fmtDate(job.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>
      <p className="mt-3 flex min-w-0 items-center gap-2 text-[15px] font-medium">
        <span className="truncate">
          {job.originCity}, {job.originState}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">
          {job.destCity}, {job.destState}
        </span>
      </p>
    </a>
  );
}

function PendingList({
  entries,
  empty = "Nothing waiting.",
}: {
  entries: OutboxItem[];
  empty?: string;
}) {
  if (!entries.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
        >
          <span className="min-w-0 truncate font-medium">{e.label}</span>
          {e.status === "failed" ? (
            <Pill tone="danger">Failed</Pill>
          ) : (
            <Pill tone="warning">Waiting</Pill>
          )}
        </li>
      ))}
    </ul>
  );
}

function Panel({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5 sm:px-5">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function OfflineTips() {
  const tips = [
    {
      icon: Smartphone,
      text: "Everything you save stays on this phone until it uploads.",
    },
    {
      icon: Lock,
      text: "Pre-existing damage records lock as soon as they upload.",
    },
    {
      icon: ShieldCheck,
      text: "The report shows the time you captured it and the time it reached the server.",
    },
  ];
  return (
    <section className="rounded-2xl bg-secondary p-5 text-white">
      <p className="font-semibold">How offline saving works</p>
      <ul className="mt-4 space-y-3">
        {tips.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3 text-sm text-white/70">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Form / detail pages: content on the left, helper panel on the right (desktop) */
function SplitLayout({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
      <div className="min-w-0">{children}</div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        {aside}
      </aside>
    </div>
  );
}

function ConnectionNotice({ online, path }: { online: boolean; path: string }) {
  if (online) {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
            <Wifi className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-green-900">
              You&apos;re back online
            </p>
            <p className="text-sm text-green-800">
              Saved entries are uploading. Switch to the full app to see
              everything.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            window.location.assign(
              path.startsWith("/driver/jobs/local-") ? "/driver" : path,
            )
          }
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Open full app <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 lg:mb-8">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-black">
        <CloudOff className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-amber-900">You&apos;re offline</p>
        <p className="text-sm text-amber-800">
          Keep working. Jobs, photos and signatures are saved on this phone and
          upload when you have signal.
        </p>
      </div>
    </div>
  );
}

/* ---------- Views ---------- */
function HomeView({
  snapshot,
  outbox,
}: {
  snapshot: DriverSnapshot;
  outbox: OutboxItem[];
}) {
  const localJobs = outbox.filter((i) => i.type === "job");
  const pending = outbox.filter((i) => i.status === "pending").length;
  const failed = outbox.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-7 sm:space-y-9">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Offline mode · {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight sm:text-3xl">
          Hi, {snapshot.user.name.split(" ")[0]}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Start a job */}
        <a
          href="#/driver/jobs/new"
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-secondary p-5 text-white shadow-lg transition active:scale-[0.99] sm:p-6 lg:p-8"
        >
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1.5 bg-primary"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl"
          />
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40 lg:h-16 lg:w-16">
            <PlusCircle className="h-7 w-7 lg:h-8 lg:w-8" />
          </span>
          <div className="relative min-w-0">
            <p className="font-heading text-xl font-bold sm:text-2xl lg:text-3xl">
              Start a new job
            </p>
            <p className="mt-0.5 text-sm text-white/60 lg:text-base">
              Log pickup damage, photos and signature
            </p>
          </div>
          <ArrowRight className="relative ml-auto h-6 w-6 shrink-0 text-white/70 transition group-hover:translate-x-1 group-hover:text-white" />
        </a>

        {/* Sync status */}
        <a
          href="#/driver/outbox"
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary/40 lg:flex-col lg:items-stretch lg:justify-between lg:p-6"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                failed
                  ? "bg-red-50 text-red-700"
                  : pending
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700",
              )}
            >
              {failed ? (
                <AlertTriangle className="h-5 w-5" />
              ) : pending ? (
                <CloudUpload className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </span>
            <div>
              <p className="font-semibold">Sync queue</p>
              <p className="text-sm text-muted-foreground">
                {failed
                  ? "Needs attention"
                  : pending
                    ? "Waiting for signal"
                    : "All uploaded"}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-end gap-5 lg:ml-0">
            <div className="text-right lg:text-left">
              <p className="font-heading text-3xl font-bold leading-none">
                {pending}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Waiting
              </p>
            </div>
            {failed > 0 && (
              <div className="text-right lg:text-left">
                <p className="font-heading text-3xl font-bold leading-none text-red-600">
                  {failed}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Failed
                </p>
              </div>
            )}
          </div>
        </a>
      </div>

      {/* Pre-trip check */}
      <a
        href="#/driver/pre-trip/new"
        className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary/40"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Pre-trip check</p>
          <p className="text-sm text-muted-foreground">
            {snapshot.trucks?.length
              ? "Inspect your truck before you drive"
              : "Open the app once online to load the truck list"}
          </p>
        </div>
        <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      </a>

      {localJobs.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold sm:text-xl">
            Saved on this phone
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {localJobs.map((i) => (
              <JobRow
                key={i.id}
                job={jobFromOutbox(i)}
                badge={
                  <Pill tone={i.status === "failed" ? "danger" : "warning"}>
                    {i.status === "failed" ? "Failed" : "Not uploaded"}
                  </Pill>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-bold sm:text-xl">Recent jobs</h2>
          <p className="text-sm text-muted-foreground">
            Saved from your last visit online
          </p>
        </div>
        {snapshot.jobs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {snapshot.jobs.map((j) => (
              <JobRow key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            No recent jobs saved on this phone.
          </p>
        )}
      </section>
    </div>
  );
}

function JobView({
  jobId,
  job,
  entries,
  serverId,
  online,
}: {
  jobId: string;
  job?: SnapshotJob;
  entries: OutboxItem[];
  serverId?: string;
  online: boolean;
}) {
  const base = `/driver/jobs/${jobId}`;
  const actions = [
    {
      href: `${base}/pre-damage/new`,
      label: "Log pre-existing damage",
      icon: Camera,
      primary: true,
    },
    { href: `${base}/damage/new`, label: "Report damage", icon: Wrench },
    { href: `${base}/review/new`, label: "Add review", icon: Star },
    { href: `${base}/upsell/new`, label: "Add upsell", icon: DollarSign },
  ];

  return (
    <>
      <BackLink href="/driver" label="Offline home" />
      <SplitLayout
        aside={
          <>
            <Panel
              title="Waiting to upload"
              icon={CloudUpload}
              count={entries.length}
            >
              <PendingList
                entries={entries}
                empty="Nothing waiting for this job."
              />
            </Panel>
            <div className="hidden xl:block">
              <OfflineTips />
            </div>
          </>
        }
      >
        <div className="space-y-5 sm:space-y-6">
          <div className="overflow-hidden rounded-2xl bg-secondary text-white">
            <div className="h-1 bg-primary" />
            <div className="p-5 sm:p-6 lg:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                    Job number
                  </p>
                  <h1 className="mt-1 text-[28px] font-bold leading-none sm:text-4xl">
                    {job?.jobNumber ?? "Saved job"}
                  </h1>
                </div>
                {isLocalId(jobId) &&
                  (serverId ? (
                    <Pill tone="success">Uploaded</Pill>
                  ) : (
                    <Pill className="bg-amber-400 text-black">
                      Saved on this phone
                    </Pill>
                  ))}
              </div>
              {job ? (
                <>
                  <p className="mt-5 flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg">
                    <span className="truncate">
                      {job.originCity}, {job.originState}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/50" />
                    <span className="truncate">
                      {job.destCity}, {job.destState}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    {fmtDate(job.date)} ·{" "}
                    {job.deliveredBy === "partner"
                      ? "Partner delivery"
                      : "DRS crew"}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-white/60">
                  Job details aren&apos;t saved offline, but you can still add
                  entries to it.
                </p>
              )}
            </div>
          </div>

          {serverId && online && (
            <button
              type="button"
              onClick={() => window.location.assign(`/driver/jobs/${serverId}`)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white"
            >
              Open uploaded job <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {actions.map(({ href, label, icon: Icon, primary }) => (
              <a
                key={href}
                href={`#${href}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 font-semibold transition active:scale-[0.99]",
                  primary
                    ? "h-16 bg-primary text-lg text-white shadow-lg shadow-primary/25 sm:col-span-3"
                    : "h-14 border bg-card hover:border-foreground/30",
                )}
              >
                <Icon className="h-5 w-5" /> {label}
              </a>
            ))}
          </div>
        </div>
      </SplitLayout>
    </>
  );
}

/* ---------- App ---------- */
export function OfflineApp() {
  const path = useSyncExternalStore(subscribeHash, getHash, () => "/driver");
  const userId = useSyncExternalStore(
    subscribeCurrentUser,
    getCurrentUserId,
    () => null,
  );
  const online = useOnlineStatus();

  const snap = useLiveQuery(
    async () => ({
      value: userId
        ? (((await offlineDb.snapshots.get(`driver:${userId}`))?.value as
            DriverSnapshot | undefined) ?? null)
        : null,
    }),
    [userId],
  );
  const outbox = useLiveQuery(
    async () =>
      userId
        ? (await offlineDb.outbox.orderBy("createdAt").toArray()).filter(
            (i) => i.userId === userId,
          )
        : [],
    [userId],
  );
  const idMap = useLiveQuery(() => offlineDb.idMap.toArray(), []);

  const snapshot = snap?.value ?? null;
  const items = outbox ?? [];
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const activeNav = navKeyFor(path);
  const seg = path.split("/").filter(Boolean); // ["driver", "jobs", id, "pre-damage", "new"]

  const findJob = (id: string): SnapshotJob | undefined => {
    const local = items.find((i) => i.type === "job" && i.id === id);
    if (local) return jobFromOutbox(local);
    return snapshot?.jobs.find((j) => j.id === id);
  };

  /** Helper panel shown beside forms on desktop */
  const formAside = (jobId?: string) => (
    <>
      {jobId && (
        <Panel
          title="Waiting for this job"
          icon={CloudUpload}
          count={
            items.filter((i) => i.jobRef === jobId && i.type !== "job").length
          }
        >
          <PendingList
            entries={items.filter(
              (i) => i.jobRef === jobId && i.type !== "job",
            )}
            empty="Nothing saved for this job yet."
          />
        </Panel>
      )}
      <OfflineTips />
    </>
  );

  let view: React.ReactNode = null;

  if (snap === undefined || outbox === undefined) {
    view = null; // loading from phone storage
  } else if (!userId || !snapshot) {
    view = (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CloudOff className="h-8 w-8 text-muted-foreground" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">
          Offline mode isn&apos;t ready yet
        </h1>
        <p className="mt-2 text-muted-foreground">
          Log in and open the Home screen once with signal. After that, you can
          use the app offline.
        </p>
      </div>
    );
  } else if (path === "/driver/jobs/new") {
    view = (
      <>
        <BackLink href="/driver" label="Offline home" />
        <Title
          title="New job"
          description="Saved on this phone until you're back online."
        />
        <SplitLayout aside={formAside()}>
          <NewJobForm
            currentUserId={snapshot.user.id}
            drivers={snapshot.drivers}
          />
        </SplitLayout>
      </>
    );
  } else if (path === "/driver/pre-trip/new") {
    view = (
      <>
        <BackLink href="/driver" label="Offline home" />
        <Title
          title="Pre-trip inspection"
          description="Saved on this phone until you're back online."
        />
        <SplitLayout aside={<OfflineTips />}>
          {snapshot.trucks?.length ? (
            <PreTripForm trucks={snapshot.trucks} />
          ) : (
            <p className="rounded-xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              No trucks saved on this phone yet. Open the app once with signal,
              then try again.
            </p>
          )}
        </SplitLayout>
      </>
    );
  } else if (path === "/driver/outbox") {
    view = (
      <>
        <BackLink href="/driver" label="Offline home" />
        <Title
          title="Sync queue"
          description="Entries saved on this phone that haven't uploaded yet."
        />
        <SplitLayout aside={<OfflineTips />}>
          <OutboxView />
        </SplitLayout>
      </>
    );
  } else if (seg[1] === "jobs" && seg[2]) {
    const jobId = seg[2];
    const job = findJob(jobId);
    const sub = seg.slice(3).join("/");
    const back = (
      <BackLink
        href={`/driver/jobs/${jobId}`}
        label={job?.jobNumber ?? "Job"}
      />
    );

    const forms: Record<
      string,
      { title: string; description: string; node: React.ReactNode }
    > = {
      "pre-damage/new": {
        title: "Pre-existing damage",
        description: "Record damage found at pickup, before loading.",
        node: <PreDamageForm jobId={jobId} />,
      },
      "damage/new": {
        title: "Report damage",
        description: "Damage that happened during this move.",
        node: (
          <DamageForm
            jobId={jobId}
            partnerDelivery={job?.deliveredBy === "partner"}
          />
        ),
      },
      "review/new": {
        title: "Add review",
        description: "A customer review for this job.",
        node: <ReviewForm jobId={jobId} />,
      },
      "upsell/new": {
        title: "Add upsell",
        description: "Extra services sold on this job.",
        node: <UpsellForm jobId={jobId} />,
      },
    };

    const form = forms[sub];
    if (form) {
      view = (
        <>
          {back}
          <Title title={form.title} description={form.description} />
          <SplitLayout aside={formAside(jobId)}>{form.node}</SplitLayout>
        </>
      );
    } else {
      view = (
        <JobView
          jobId={jobId}
          job={job}
          entries={items.filter((i) => i.jobRef === jobId && i.type !== "job")}
          serverId={idMap?.find((m) => m.localId === jobId)?.serverId}
          online={online}
        />
      );
    }
  } else {
    view = <HomeView snapshot={snapshot} outbox={items} />;
  }

  const navItems = [
    { key: "home" as const, href: "#/driver", label: "Home", icon: Home },
    {
      key: "new" as const,
      href: "#/driver/jobs/new",
      label: "New Job",
      icon: PlusCircle,
    },
    {
      key: "outbox" as const,
      href: "#/driver/outbox",
      label: "Sync queue",
      icon: RefreshCw,
    },
  ];
  const queueCount = pendingCount + failedCount;

  return (
    <div className="min-h-dvh bg-muted/40">
      {userId && <SyncManager userId={userId} />}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-primary bg-secondary pt-[env(safe-area-inset-top)] text-white">
        <div className={cn(CONTAINER, "flex h-14 items-center gap-3 sm:h-16")}>
          <a
            href="#/driver"
            aria-label="Offline home"
            className="min-w-0 shrink-0"
          >
            <Brand compact />
          </a>

          <nav className="ml-2 hidden items-center gap-1 md:flex lg:ml-6">
            {navItems.map(({ key, href, label, icon: Icon }) => (
              <a
                key={key}
                href={href}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                  activeNav === key
                    ? "bg-primary text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {key === "outbox" && queueCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] font-bold",
                      failedCount
                        ? "bg-red-600 text-white"
                        : "bg-amber-400 text-black",
                    )}
                  >
                    {queueCount}
                  </span>
                )}
              </a>
            ))}
          </nav>

          <span
            className={cn(
              "ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold",
              online
                ? "bg-green-500/20 text-green-300"
                : "bg-amber-400 text-black",
            )}
          >
            {online ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      {/* Content */}
      <main
        className={cn(
          CONTAINER,
          "pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:pt-6 md:pb-10 lg:pt-8",
        )}
      >
        {snapshot && <ConnectionNotice online={online} path={path} />}
        {view}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {navItems.map(({ key, href, label, icon: Icon }) => {
            const active = activeNav === key;
            return (
              <a
                key={key}
                href={href}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold min-[400px]:h-[68px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {key === "new" ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className="h-6 w-6" />
                    {key === "outbox" && queueCount > 0 && (
                      <span
                        className={cn(
                          "absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                          failedCount
                            ? "bg-red-600 text-white"
                            : "bg-amber-400 text-black",
                        )}
                      >
                        {queueCount}
                      </span>
                    )}
                  </span>
                )}
                {label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
