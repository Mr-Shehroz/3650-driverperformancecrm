"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormActions({
  cancelHref,
  pending,
  children,
}: {
  cancelHref: string;
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Link
        href={cancelHref}
        className="flex h-14 items-center justify-center rounded-lg px-6 text-base font-semibold text-muted-foreground hover:bg-muted sm:h-12"
      >
        Cancel
      </Link>
      <Button
        type="submit"
        disabled={pending}
        className="h-14 w-full text-base font-semibold sm:h-12 sm:w-auto sm:px-8"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
      </Button>
    </div>
  );
}
