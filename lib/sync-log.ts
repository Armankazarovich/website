import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), ".sync-log.json");

export type SyncLogEntry = {
  syncedAt: string;
  synced: number;
  errorCount: number;
  errors: string[];
  triggeredBy: "auto" | "manual";
};

export function readSyncLog(): SyncLogEntry | null {
  try {
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSyncLog(entry: SyncLogEntry) {
  try {
    fs.writeFileSync(LOG_PATH, JSON.stringify(entry), "utf-8");
  } catch {
    // ignore write errors in read-only FS
  }
}
