import { NextResponse } from "next/server";
import { getPriceListData, type PriceListUnit } from "@/lib/price-list-data";
import { generatePriceListPdf } from "@/lib/price-list-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUnit(value: string | null): PriceListUnit | "ALL" {
  return value === "CUBE" || value === "SQUARE" || value === "PIECE" ? value : "ALL";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = await getPriceListData({
    category: url.searchParams.get("category") || undefined,
    q: url.searchParams.get("q") || undefined,
    unit: normalizeUnit(url.searchParams.get("unit")),
  });
  const buffer = await generatePriceListPdf(data);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pilorus-price-list-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
