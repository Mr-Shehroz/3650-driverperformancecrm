import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export function NotFoundState({
  homeHref,
  title = "Page not found",
  description = "This page doesn't exist, or you don't have access to it.",
}: {
  homeHref: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <p className="font-heading text-6xl font-extrabold text-primary sm:text-7xl">
          404
        </p>
        <span className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </span>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{description}</p>
        <Link
          href={homeHref}
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
