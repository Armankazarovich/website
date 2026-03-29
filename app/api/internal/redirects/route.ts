import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Внутренний эндпоинт для middleware — список редиректов категорий
export async function GET() {
  const redirects = await prisma.categoryRedirect.findMany({
    select: { fromSlug: true, toSlug: true, permanent: true },
  });
  return NextResponse.json(redirects, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
