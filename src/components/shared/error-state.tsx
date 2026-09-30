"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  error,
  reset,
  homeHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-8 w-8 text-primary" />
        </span>
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Please try again. If it keeps happening, contact your admin.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Error code: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={reset}
            className="h-12 px-6 font-semibold"
          >
            <RotateCcw className="mr-1 h-4 w-4" /> Try again
          </Button>
          <Link
            href={homeHref}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border bg-white px-6 font-semibold hover:border-foreground/30"
          >
            <Home className="h-4 w-4" /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
