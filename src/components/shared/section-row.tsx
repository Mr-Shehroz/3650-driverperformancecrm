import { cn } from "@/lib/utils";

export function SectionRow({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-4 border-b pb-8 last:border-0 last:pb-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[340px_minmax(0,1fr)]",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {aside && <div className="mt-5">{aside}</div>}
      </div>
      <div className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
        {children}
      </div>
    </section>
  );
}
