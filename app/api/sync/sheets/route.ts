export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { syncFromGoogleSheets } from "@/lib/sheets";
import { writeSyncLog } from "@/lib/sync-log";

export async function POST(req: NextRequest) {
  // Verify sync secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.SYNC_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFromGoogleSheets();
    const isManual = !authHeader || !secret;
    writeSyncLog({
      syncedAt: new Date().toISOString(),
      synced: result.synced,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10),
      triggeredBy: isManual ? "manual" : "auto",
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
