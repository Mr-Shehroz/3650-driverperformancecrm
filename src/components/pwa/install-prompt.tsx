"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Env = "standalone" | "ios" | "other";

const DISMISS_KEY = "drs_install_dismissed_until";
const SNOOZE_DAYS = 14;
const listeners = new Set<() => void>();

const subscribeNoop = () => () => {};

function getEnv(): Env {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "standalone";
  const ua = navigator.userAgent;
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return isIos ? "ios" : "other";
}

function subscribeDismissed(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getDismissed() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + SNOOZE_DAYS * 86_400_000),
    );
  } catch {}
  listeners.forEach((l) => l());
}

export function InstallPrompt() {
  const env = useSyncExternalStore(
    subscribeNoop,
    getEnv,
    () => "standalone" as Env,
  );
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissed,
    () => true,
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      snooze();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (env === "standalone" || dismissed) return null;
  if (env === "other" && !deferred) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "dismissed") snooze();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <button
        type="button"
        onClick={snooze}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-[11px] font-extrabold text-white">
          DRS
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Install the DRS app</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Open it from your home screen, full screen, and stay logged in.
          </p>
        </div>
      </div>

      {env === "ios" ? (
        <ol className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
              1
            </span>
            Tap <Share className="h-4 w-4 text-primary" />{" "}
            <strong>Share</strong> in Safari
          </li>
          <li className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
              2
            </span>
            Tap <PlusSquare className="h-4 w-4 text-primary" />{" "}
            <strong>Add to Home Screen</strong>
          </li>
        </ol>
      ) : (
        <Button
          type="button"
          onClick={install}
          className="mt-4 h-12 w-full font-semibold sm:w-auto sm:px-6"
        >
          <Download className="mr-1 h-4 w-4" /> Install app
        </Button>
      )}
    </div>
  );
}
