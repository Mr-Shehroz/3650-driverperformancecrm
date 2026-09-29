import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[15px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}
