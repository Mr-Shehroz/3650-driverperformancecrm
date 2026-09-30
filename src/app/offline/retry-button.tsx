"use client";

import { RotateCcw } from "lucide-react";

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
    >
      <RotateCcw className="h-4 w-4" /> Try again
    </button>
  );
}
