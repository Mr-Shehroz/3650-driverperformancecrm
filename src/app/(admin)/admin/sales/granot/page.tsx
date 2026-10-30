// File: src/app/(admin)/admin/sales/granot/page.tsx
// (REPLACE the whole file)

import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  KeyRound,
  UserRound,
  Webhook,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getGranotEvents,
  getRepGranotNames,
  getUnmatchedGranotReps,
} from "@/lib/data";
import { formatDateTimeET } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pill } from "@/components/shared/pill";
import {
  CopyField,
  GranotTestButtons,
} from "@/components/sales/granot-test-buttons";
import { GranotRepMap } from "@/components/sales/granot-rep-map";

export const metadata = { title: "Granot Sync" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  new_lead: "New lead",
  booked: "Booked",
  unbooked: "Unbooked",
  priority: "Priority update",
  unknown: "Unknown",
};

const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  processed: "success",
  ignored: "warning",
  error: "danger",
  received: "neutral",
};

export default async function GranotSyncPage() {
  await requireRole("admin");
  const [events, reps, unmatched] = await Promise.all([
    getGranotEvents(100),
    getRepGranotNames(),
    getUnmatchedGranotReps(),
  ]);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const url = `${base || "https://your-domain"}/api/granot/webhook`;
  const tokenSet = (process.env.GRANOT_WEBHOOK_TOKEN ?? "").length >= 20;
  const last = events[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Granot Sync"
        description="Leads arrive from Granot through a webhook. Every event Granot sends is listed here."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Webhook className="h-5 w-5 text-primary" /> Webhook setup
          </h2>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">URL for Granot</p>
            <CopyField value={url} />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Header</p>
            <p className="flex items-center gap-2 text-sm">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <code>token = GRANOT_WEBHOOK_TOKEN</code>
              {tokenSet ? (
                <Pill tone="success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Token set
                </Pill>
              ) : (
                <Pill tone="danger">
                  <AlertTriangle className="h-3.5 w-3.5" /> Token missing
                </Pill>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              The token is kept in the server settings (environment variable),
              never shown here.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Test it</h2>
          <p className="text-sm text-muted-foreground">
            Sends a pretend Granot event through the same steps. Test leads
            count as sample leads, so &ldquo;Remove all&rdquo; on Sales Reps
            clears them.
          </p>
          <GranotTestButtons />
          <p className="text-xs text-muted-foreground">
            Last event: {last ? formatDateTimeET(last.receivedAt) : "none yet"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <UserRound className="h-5 w-5 text-primary" /> Sales reps in Granot
          </h2>
          <p className="mb-2 mt-1 text-sm text-muted-foreground">
            Granot sends the rep&apos;s <b>Granot username</b>. Enter each
            rep&apos;s username so their leads are linked to them. Saving also
            links their earlier unassigned leads.
          </p>
          <GranotRepMap reps={reps} />
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Usernames not linked yet</h2>
          {unmatched.length ? (
            <>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">
                These came from Granot but don&apos;t match any rep. Copy one
                into the rep&apos;s box.
              </p>
              <ul className="space-y-1.5">
                {unmatched.map((u) => (
                  <li
                    key={u.username}
                    className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm"
                  >
                    <code className="truncate font-semibold text-amber-900">
                      {u.username}
                    </code>
                    <span className="shrink-0 text-amber-800">
                      {u.leads} lead{u.leads === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> All Granot
              usernames are linked.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold sm:text-xl">Recent events</h2>
        {events.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No events yet"
            description="When Granot sends a lead, it shows up here within seconds."
          />
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border bg-card">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-4">
                    <Pill tone={STATUS_TONE[e.status] ?? "neutral"}>
                      {e.status}
                    </Pill>
                    <span className="font-semibold">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Job {e.jobNumber ?? "—"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      · {formatDateTimeET(e.receivedAt)}
                    </span>
                    <span className="ml-auto text-xs font-semibold text-primary group-open:hidden">
                      Show data
                    </span>
                    <span className="ml-auto hidden text-xs font-semibold text-primary group-open:inline">
                      Hide data
                    </span>
                    {e.message && (
                      <p className="w-full text-sm text-muted-foreground">
                        {e.message}
                      </p>
                    )}
                  </summary>
                  <div className="overflow-x-auto border-t bg-muted/30 p-4">
                    <table className="text-sm">
                      <tbody>
                        {Object.entries(e.payload).map(([k, v]) => (
                          <tr key={k}>
                            <td className="whitespace-nowrap py-0.5 pr-4 font-mono text-xs text-muted-foreground">
                              {k}
                            </td>
                            <td className="py-0.5 font-mono text-xs">
                              {String(v)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
