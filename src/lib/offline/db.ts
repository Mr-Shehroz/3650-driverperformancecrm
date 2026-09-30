import Dexie, { type EntityTable } from "dexie";

export type OutboxType =
  "job" | "pre_damage" | "damage" | "review" | "upsell" | "on_time";

export interface OutboxItem {
  id: string; // unique per item; for "job" items this is the local job id
  userId: string;
  type: OutboxType;
  payload: Record<string, unknown>;
  label: string;
  jobRef: string; // server job id or local job id
  createdAt: string;
  status: "pending" | "failed";
  attempts: number;
  error?: string;
}

export interface IdMapEntry {
  localId: string;
  serverId: string;
}

export interface SnapshotEntry {
  key: string;
  value: unknown;
  savedAt: string;
}

export type SnapshotJob = {
  id: string;
  jobNumber: string;
  date: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  deliveredBy: "drs" | "partner";
};

export type DriverSnapshot = {
  user: { id: string; name: string };
  drivers: { id: string; name: string }[];
  jobs: SnapshotJob[];
};

class OfflineDB extends Dexie {
  outbox!: EntityTable<OutboxItem, "id">;
  idMap!: EntityTable<IdMapEntry, "localId">;
  snapshots!: EntityTable<SnapshotEntry, "key">;

  constructor() {
    super("drs-offline");
    this.version(1).stores({
      outbox: "id, userId, createdAt, status, jobRef",
      idMap: "localId",
      snapshots: "key",
    });
  }
}

export const offlineDb = new OfflineDB();
