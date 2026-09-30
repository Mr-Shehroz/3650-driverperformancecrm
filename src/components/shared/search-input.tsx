"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  param?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Wait this long after the last keystroke before searching */
  delay?: number;
};

export function SearchInput({
  param = "q",
  placeholder = "Search",
  className,
  inputClassName,
  delay = 250,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = v.trim();
    if (trimmed) params.set(param, trimmed);
    else params.delete(param);
    const qs = params.toString();
    // Updates the list only; no full page reload
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const onChange = (v: string) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(v), delay);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setValue("");
    apply("");
  };

  return (
    <div className={cn("relative", className)}>
      {pending ? (
        <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") clear();
          if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(timer.current);
            apply(value);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder}
        className={cn(
          "h-11 w-full rounded-lg border bg-white pl-10 pr-10 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
