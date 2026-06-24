import { NextResponse } from "next/server";
import { getPriceListData, type PriceListUnit } from "@/lib/price-list-data";
import { generatePriceListPdf } from "@/lib/price-list-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDF_CACHE_TTL_MS = 5 * 60 * 1000;

type PdfCacheEntry = {
  buffer: Buffer;
  createdAt: number;
  stamp: string;
};

const globalPdfCache = globalThis as typeof globalThis & {
  __pilorusPriceListPdfCache?: Map<string, PdfCacheEntry>;
};

const pdfCache = globalPdfCache.__pilorusPriceListPdfCache ?? new Map<string, PdfCacheEntry>();
globalPdfCache.__pilorusPriceListPdfCache = pdfCache;

function normalizeUnit(value: string | null): PriceListUnit | "ALL" {
  return value === "CUBE" || value === "SQUARE" || value === "PIECE" ? value : "ALL";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cacheKey = url.searchParams.toString() || "all";
  const cached = pdfCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.createdAt < PDF_CACHE_TTL_MS) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pilorus-price-list-${cached.stamp}.pdf"`,
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=1800",
        "X-Price-List-Cache": "HIT",
      },
    });
  }

  const data = await getPriceListData({
    category: url.searchParams.get("category") || undefined,
    q: url.searchParams.get("q") || undefined,
    unit: normalizeUnit(url.searchParams.get("unit")),
  });
  const buffer = await generatePriceListPdf(data);
  const stamp = new Date().toISOString().slice(0, 10);
  pdfCache.set(cacheKey, { buffer, createdAt: now, stamp });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pilorus-price-list-${stamp}.pdf"`,
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=1800",
      "X-Price-List-Cache": "MISS",
    },
  });
}
