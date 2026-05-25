import { NextRequest } from "next/server";
import { createSitePwaIconResponse } from "@/lib/site-pwa-icon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return createSitePwaIconResponse(req.nextUrl.searchParams.get("s"), req);
}
