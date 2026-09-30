import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/shared/brand";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-secondary text-white">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 32px)",
        }}
      />

      <header className="relative mx-auto w-full max-w-[1480px] px-5 pt-[max(env(safe-area-inset-top),1.75rem)] sm:px-8 lg:px-12">
        <Brand />
      </header>

      <div className="relative flex flex-1 items-center justify-center px-5 py-12">
        <div className="text-center">
          <p className="font-heading text-8xl font-extrabold text-primary sm:text-9xl">
            404
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Page not found
          </h1>
          <p className="mt-3 text-white/60">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" /> Go to portal
          </Link>
        </div>
      </div>
    </main>
  );
}
