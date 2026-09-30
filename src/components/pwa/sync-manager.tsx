"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCurrentUserId, syncOutbox } from "@/lib/offline/queue";

export function SyncManager({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  useEffect(() => {
    const run = async () => {
      if (!navigator.onLine) return;
      const r = await syncOutbox(userId);
      if (r.synced) {
        toast.success(
          `${r.synced} saved entr${r.synced === 1 ? "y" : "ies"} uploaded`,
        );
        router.refresh();
      }
      if (r.failed)
        toast.error(
          `${r.failed} entr${r.failed === 1 ? "y" : "ies"} couldn't upload. Check the sync queue.`,
        );
      if (r.authError)
        toast.error("Please log in again to upload saved entries.");
    };

    run();
    const onVisible = () => document.visibilityState === "visible" && run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(run, 30_000);

    // Keep the offline app up to date while we have signal
    if (navigator.onLine && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: "REFRESH_SHELL" }))
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [router, userId]);

  return null;
}
