"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Only in production (or when explicitly enabled) so dev never serves stale cached pages
const ENABLED =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SW === "true";

export function SwRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (!ENABLED || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Service worker registration failed", err);
    });
  }, []);

  // On the login page the user is logged out, so remove saved pages from the phone
  useEffect(() => {
    if (!ENABLED || pathname !== "/login" || !("serviceWorker" in navigator))
      return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.active?.postMessage({ type: "CLEAR_PAGES" }),
    );
  }, [pathname]);

  return null;
}
