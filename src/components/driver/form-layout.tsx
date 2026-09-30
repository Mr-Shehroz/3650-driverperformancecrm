import { Lightbulb } from "lucide-react";

/** Form on the left, tips on the right (desktop only) */
export function DriverFormLayout({
  tips,
  children,
}: {
  tips: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
      <div className="min-w-0">{children}</div>
      <aside className="hidden xl:block">
        <div className="sticky top-24 overflow-hidden rounded-2xl bg-secondary text-white">
          <div className="h-1 bg-primary" />
          <div className="p-5">
            <p className="flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" /> Tips
            </p>
            <ul className="mt-4 space-y-3">
              {tips.map((t) => (
                <li
                  key={t}
                  className="flex gap-3 text-sm leading-relaxed text-white/70"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
