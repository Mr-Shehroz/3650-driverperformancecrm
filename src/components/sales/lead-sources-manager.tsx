"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Power, PowerOff, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/shared/pill";
import {
  createLeadSourceAction,
  renameLeadSourceAction,
  setLeadSourceActiveAction,
} from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";
import type { LeadSourceRow } from "@/types";

function SourceRow({
  source,
  leadCount,
}: {
  source: LeadSourceRow;
  leadCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(source.name);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await renameLeadSourceAction(source.id, name);
      if (res?.fieldErrors?.name) setError(res.fieldErrors.name);
      else if (res?.error) toast.error(res.error);
      else {
        setEditing(false);
        setError(undefined);
        toast.success("Source renamed");
        router.refresh();
      }
    });

  const toggle = () =>
    startTransition(async () => {
      const res = await setLeadSourceActiveAction(source.id, !source.active);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(
          source.active
            ? `${source.name} deactivated`
            : `${source.name} is active again`,
        );
        router.refresh();
      }
    });

  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6",
        !source.active && "bg-muted/30",
      )}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setName(source.name);
                  }
                }}
                aria-invalid={!!error}
                className="h-10 bg-white text-base"
              />
              <button
                type="button"
                onClick={save}
                disabled={pending}
                aria-label="Save name"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(source.name);
                  setError(undefined);
                }}
                aria-label="Cancel"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-semibold",
                !source.active && "text-muted-foreground",
              )}
            >
              {source.name}
            </p>
            {source.active ? (
              <Pill tone="success">Active</Pill>
            ) : (
              <Pill>Inactive</Pill>
            )}
          </div>
        )}
        {!editing && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {leadCount} lead{leadCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {!editing && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold hover:border-foreground/30"
          >
            <Pencil className="h-4 w-4" /> Rename
          </button>
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold disabled:opacity-60",
              source.active
                ? "text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                : "border-green-200 text-green-700 hover:bg-green-50",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : source.active ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {source.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      )}
    </li>
  );
}

export function LeadSourcesManager({
  sources,
  leadCounts,
}: {
  sources: LeadSourceRow[];
  leadCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createLeadSourceAction(name);
      if (res?.fieldErrors?.name) setError(res.fieldErrors.name);
      else if (res?.error) toast.error(res.error);
      else {
        toast.success(`${name.trim()} added`);
        setName("");
        setError(undefined);
        router.refresh();
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <form onSubmit={add} className="border-b px-4 py-4 sm:px-6">
        <label htmlFor="new-source" className="text-[15px] font-semibold">
          Add a source
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="new-source"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder="Name exactly as it appears in Granot"
            aria-invalid={!!error}
            className="h-11 bg-white text-base"
          />
          <Button
            type="submit"
            disabled={pending || !name.trim()}
            className="h-11 px-5 font-semibold"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Add source
          </Button>
        </div>
        {error && (
          <p className="mt-1.5 text-sm font-medium text-destructive">{error}</p>
        )}
      </form>

      {sources.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No lead sources yet.
        </p>
      ) : (
        <ul className="divide-y">
          {sources.map((s) => (
            <SourceRow
              key={`${s.id}-${s.name}-${s.active}`}
              source={s}
              leadCount={leadCounts[s.id] ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
