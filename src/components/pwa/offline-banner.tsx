"use client";

import { useEffect, useRef } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      toast.success("You're back online");
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        You&apos;re offline. New entries are saved on this phone and upload when
        signal returns.
      </span>
    </div>
  );
}
