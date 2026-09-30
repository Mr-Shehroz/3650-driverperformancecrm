import { WifiOff } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { RetryButton } from "./retry-button";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-secondary text-white">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <header className="px-5 pt-[max(env(safe-area-inset-top),1.5rem)] sm:px-8">
        <Brand />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <WifiOff className="h-8 w-8 text-primary" />
          </span>
          <h1 className="mt-5 text-3xl font-bold">You&apos;re offline</h1>
          <p className="mt-2 text-white/60">
            This page hasn&apos;t been saved on your phone yet. Check your
            signal and try again.
          </p>
          <RetryButton />
        </div>
      </div>
    </main>
  );
}
