"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/driver/form-bits";
import { SectionRow } from "@/components/shared/section-row";
import { updateSettingsAction } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";
import type { AppSettings, CompanyInfo } from "@/types";

type Props = {
  settings: AppSettings;
  admins: { id: string; name: string; email: string }[];
};

const COMPANY_FIELDS: {
  key: keyof CompanyInfo;
  label: string;
  type?: string;
  inputMode?: "tel" | "email";
  wide?: boolean;
}[] = [
  { key: "name", label: "Company name", wide: true },
  { key: "usdot", label: "USDOT #" },
  { key: "mc", label: "MC #" },
  { key: "phone", label: "Phone", type: "tel", inputMode: "tel" },
  { key: "email", label: "Email", type: "email", inputMode: "email" },
  { key: "address", label: "Address", wide: true },
];

function PdfHeaderPreview({ company }: { company: CompanyInfo }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <p className="border-b bg-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        PDF header preview
      </p>
      <div className="flex items-start justify-between gap-3 border-b-[3px] border-primary p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-primary text-[9px] font-extrabold text-white">
            DRS
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">
              {company.name || "Company name"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              USDOT #{company.usdot || "—"} · MC #{company.mc || "—"}
            </p>
          </div>
        </div>
        <div className="min-w-0 text-right text-[10px] leading-snug text-muted-foreground">
          <p className="truncate">{company.address || "Address"}</p>
          <p className="truncate">{company.phone || "Phone"}</p>
          <p className="truncate">{company.email || "Email"}</p>
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="h-2 w-2/3 rounded bg-muted" />
        <div className="h-2 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

export function SettingsForm({ settings, admins }: Props) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const adminEmails = new Set(admins.map((a) => a.email.toLowerCase()));
  const initialAdmins = settings.damageAlertEmails.filter((e) =>
    adminEmails.has(e.toLowerCase()),
  );
  const initialExtras = settings.damageAlertEmails
    .filter((e) => !adminEmails.has(e.toLowerCase()))
    .join(", ");

  const [company, setCompany] = useState<CompanyInfo>(settings.company);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>(initialAdmins);
  const [extraEmails, setExtraEmails] = useState(initialExtras);
  const [saved, setSaved] = useState({
    company: settings.company,
    admins: initialAdmins,
    extras: initialExtras,
  });

  const dirty =
    JSON.stringify(company) !== JSON.stringify(saved.company) ||
    [...selectedAdmins].sort().join() !== [...saved.admins].sort().join() ||
    extraEmails.trim() !== saved.extras.trim();

  const toggleAdmin = (email: string) =>
    setSelectedAdmins((s) =>
      s.includes(email) ? s.filter((x) => x !== email) : [...s, email],
    );

  const discard = () => {
    setCompany(saved.company);
    setSelectedAdmins(saved.admins);
    setExtraEmails(saved.extras);
    setErrors({});
    setFormError(undefined);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    const extras = extraEmails
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await updateSettingsAction({
        company,
        damageAlertEmails: [...selectedAdmins, ...extras],
      });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError("Please fix the highlighted fields.");
      } else if (res?.error) toast.error(res.error);
      else {
        setErrors({});
        setSaved({ company, admins: selectedAdmins, extras: extraEmails });
        toast.success("Settings saved");
      }
    });
  };

  return (
    <form onSubmit={save} noValidate>
      <FormError message={formError} />

      <div className={cn("space-y-8", formError && "mt-5")}>
        <SectionRow
          title="Company details"
          description="Used in the header of every claims PDF. Keep these exactly as they appear on your DOT registration."
          aside={
            <div className="hidden lg:block">
              <PdfHeaderPreview company={company} />
            </div>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {COMPANY_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                htmlFor={`c-${f.key}`}
                error={errors[`company.${f.key}`]}
                className={f.wide ? "sm:col-span-2" : undefined}
              >
                <Input
                  id={`c-${f.key}`}
                  type={f.type ?? "text"}
                  inputMode={f.inputMode}
                  value={company[f.key]}
                  onChange={(e) =>
                    setCompany((c) => ({ ...c, [f.key]: e.target.value }))
                  }
                  aria-invalid={!!errors[`company.${f.key}`]}
                  className="h-12 bg-white text-base"
                />
              </Field>
            ))}
          </div>
          <div className="mt-6 lg:hidden">
            <PdfHeaderPreview company={company} />
          </div>
        </SectionRow>

        <SectionRow
          title="Damage alerts"
          description="These people get an email as soon as a driver reports damage during a move."
        >
          <p className="mb-3 text-[15px] font-semibold">Admins</p>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {admins.map((a) => {
              const checked = selectedAdmins.includes(a.email);
              return (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition",
                    checked
                      ? "border-primary bg-primary/5"
                      : "bg-white hover:border-foreground/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAdmin(a.email)}
                    className="h-5 w-5 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {a.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {a.email}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <Field
            label="Other emails"
            htmlFor="extra-emails"
            optional
            className="mt-6"
            error={
              Object.entries(errors).find(([k]) =>
                k.startsWith("damageAlertEmails"),
              )?.[1]
            }
            hint="Separate multiple emails with commas."
          >
            <Input
              id="extra-emails"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              placeholder="claims@directrelocate.com"
              className="h-12 bg-white text-base"
            />
          </Field>
        </SectionRow>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              "text-sm font-medium",
              dirty ? "text-amber-700" : "text-muted-foreground",
            )}
          >
            {dirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {dirty && (
              <button
                type="button"
                onClick={discard}
                className="h-11 rounded-lg px-5 font-semibold text-muted-foreground hover:bg-muted"
              >
                Discard
              </button>
            )}
            <Button
              type="submit"
              disabled={!dirty || pending}
              className="h-11 px-8 font-semibold"
            >
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Save settings"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
