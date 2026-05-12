export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildMarketDemandReport } from "@/lib/market-demand-intelligence";
import { requireTerminalStaff } from "@/lib/terminal-auth";

async function checkAccess() {
  return requireTerminalStaff();
}

function normalizeList(params: URLSearchParams, key: string) {
  return params
    .getAll(key)
    .flatMap((value) => value.split("|"))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export async function GET(req: NextRequest) {
  const access = await checkAccess();
  if (!access.authorized) return access.response;

  const params = req.nextUrl.searchParams;
  const plan = await buildMarketDemandReport({
    category: params.get("category"),
    activity: params.get("activity"),
    region: params.get("region"),
    country: params.get("country"),
    language: params.get("language"),
    manualQuery: params.get("query"),
    products: normalizeList(params, "product"),
  });

  return NextResponse.json(plan, {
    headers: {
      "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
    },
  });
}
