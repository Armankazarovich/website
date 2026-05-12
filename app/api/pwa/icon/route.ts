import { NextRequest } from "next/server";
import { createArayPwaIconResponse } from "@/lib/aray-pwa-icon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return createArayPwaIconResponse(req.nextUrl.searchParams.get("s"));
}
