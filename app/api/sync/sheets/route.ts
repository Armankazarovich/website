import { NextRequest, NextResponse } from "next/server";
import { syncFromGoogleSheets } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  // Verify sync secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.SYNC_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFromGoogleSheets();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
