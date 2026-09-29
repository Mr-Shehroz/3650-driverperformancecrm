"use client";

import { AlertCircle, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between gap-2 text-[15px] font-semibold"
      >
        <span>{label}</span>
        {optional && (
          <span className="text-xs font-medium text-muted-foreground">
            Optional
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 sm:p-6", className)}>
      <div className="mb-5">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-12 w-full appearance-none rounded-lg border border-input bg-white px-3 pr-10 text-base outline-none transition",
          "focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-12 rounded-lg border px-2 text-[15px] font-semibold transition active:scale-[0.98]",
              active
                ? "border-secondary bg-secondary text-white"
                : "bg-white text-foreground/80 hover:border-foreground/30",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChoiceGrid<T extends string>({
  value,
  onChange,
  options,
  className,
  invalid,
  ariaLabel,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-2", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-12 rounded-lg border px-2 text-[15px] font-semibold transition active:scale-[0.98]",
              active
                ? "border-secondary bg-secondary text-white"
                : "bg-white text-foreground/80 hover:border-foreground/30",
              invalid && !active && "border-destructive/60",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export function StarInput({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (v: number) => void;
  invalid?: boolean;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Star rating"
        className={cn(
          "flex gap-1 rounded-xl border bg-white p-2 sm:gap-2",
          invalid && "border-destructive",
        )}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="flex h-12 flex-1 items-center justify-center rounded-lg transition active:scale-90"
          >
            <Star
              className={cn(
                "h-8 w-8 transition",
                n <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30",
              )}
            />
          </button>
        ))}
      </div>
      <p className="mt-2 h-5 text-sm font-semibold text-muted-foreground">
        {STAR_LABELS[value]}
      </p>
    </div>
  );
}

export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  placeholder = "0.00",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={(e) => {
          const v = e.target.value
            .replace(/[^0-9.]/g, "")
            .replace(/(\..*)\./g, "$1");
          onChange(v);
        }}
        className="h-14 w-full rounded-lg border border-input bg-white pl-9 pr-4 text-xl font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive"
      />
    </div>
  );
}

export const TEXTAREA_CLASS =
  "min-h-[96px] w-full rounded-lg border border-input bg-white px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive";
