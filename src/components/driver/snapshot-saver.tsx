"use client";

import { useEffect } from "react";
import { offlineDb, type DriverSnapshot } from "@/lib/offline/db";

export function SnapshotSaver({ snapshot }: { snapshot: DriverSnapshot }) {
  const key = JSON.stringify(snapshot);

  useEffect(() => {
    const value = JSON.parse(key) as DriverSnapshot;
    offlineDb.snapshots
      .put({
        key: `driver:${value.user.id}`,
        value,
        savedAt: new Date().toISOString(),
      })
      .catch(() => {});
  }, [key]);

  return null;
}
