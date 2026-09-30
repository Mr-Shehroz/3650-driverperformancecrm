import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "list" | "form";
}) {
  return (
    <div
      className="animate-in fade-in duration-300"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Header */}
      <div className="mb-6 space-y-2 lg:mb-8">
        <Skeleton className="h-8 w-48 sm:h-9 sm:w-64" />
        <Skeleton className="h-4 w-64 max-w-full sm:w-96" />
      </div>

      {variant === "dashboard" && (
        <>
          <Skeleton className="mb-6 h-16 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="mt-3 h-7 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-8 h-72 w-full rounded-2xl" />
        </>
      )}

      {variant === "list" && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "form" && (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6"
            >
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
