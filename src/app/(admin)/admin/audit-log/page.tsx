// File: src/app/(admin)/admin/audit-log/page.tsx
// (REPLACE the whole file)

import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAllJobs, getAuditLog, getUsers } from "@/lib/data";
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  createdLines,
  diffLines,
} from "@/lib/audit";
import { formatDateTimeET } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pill } from "@/components/shared/pill";
import type { AuditAction } from "@/types";

const ACTION_TONE: Record<
  AuditAction,
  "neutral" | "primary" | "success" | "warning" | "danger" | "dark"
> = {
  create: "neutral",
  update: "primary",
  delete: "danger",
  restore: "warning",
  verify: "success",
  unverify: "neutral",
};

export default async function AuditLogPage() {
  await requireRole("admin");
  const [entries, users, jobs] = await Promise.all([
    getAuditLog({ limit: 300 }),
    getUsers(),
    getAllJobs(),
  ]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const jobNumbers = Object.fromEntries(jobs.map((j) => [j.id, j.jobNumber]));

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every creation, correction, verification and deletion. Records are never permanently deleted."
      />

      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" />
      ) : (
        <ol className="space-y-3">
          {entries.map((a) => (
            <li key={a.id} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={ACTION_TONE[a.action]}>
                  {ACTION_LABELS[a.action]}
                </Pill>
                <span className="font-semibold">
                  {ENTITY_LABELS[a.entityType]}
                </span>
                <span className="text-muted-foreground">on</span>
                <Link
                  href={`/admin/jobs/${a.jobId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {jobNumbers[a.jobId] ?? a.jobId}
                </Link>
              </div>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {names[a.changedBy] ?? "Unknown user"} ·{" "}
                {formatDateTimeET(a.changedAt)}
              </p>

              {a.reason && (
                <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-semibold">Reason:</span> {a.reason}
                </p>
              )}

              {a.action === "create" && a.after ? (
                <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                  {createdLines(a.after).map((d) => (
                    <li
                      key={d.field}
                      className="truncate text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {d.field}:
                      </span>{" "}
                      {d.value}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-2 space-y-0.5 text-sm">
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
      )}
    </div>
  );
}
