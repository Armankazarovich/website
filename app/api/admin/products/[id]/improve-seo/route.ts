export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { generateProductDescriptionAI, generateProductDescription } from "@/lib/product-seo";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

/**
 * POST /api/admin/products/[id]/improve-seo
 *
 * Через ARAY (Claude Sonnet 4.6) переписывает описание товара.
 * Если API-ключ не настроен или сервис недоступен — возвращает
 * шаблонное описание (всегда работает). Не сохраняет в БД —
 * это делает клиент кнопкой "Сохранить" в drawer.
 *
 * Response: { description: string, source: "aray" | "template" }
 */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session || !role || !PRODUCTS_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: { select: { name: true } },
      variants: {
        select: {
          size: true,
          pricePerCube: true,
          pricePerPiece: true,
          inStock: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  const settings = await getSiteSettings();

  // Плоская структура для product-seo (Decimal → number)
  const productForSeo = {
    name: product.name,
    description: product.description,
    category: product.category ? { name: product.category.name } : null,
    variants: product.variants.map((v) => ({
      size: v.size,
      pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
      pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
      inStock: v.inStock,
    })),
  };

  // Попытка через ARAY (Claude Sonnet 4.6). При любой ошибке — template fallback.
  try {
    const aiDescription = await generateProductDescriptionAI(productForSeo, settings);
    return NextResponse.json({
      description: aiDescription,
      source: "aray" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[improve-seo] ARAY недоступен для ${product.id}: ${message}. Fallback → template.`);

    // Fallback: шаблон (всегда работает)
    const templateDescription = generateProductDescription(productForSeo, settings);
    return NextResponse.json({
      description: templateDescription,
      source: "template" as const,
      fallbackReason: message,
    });
  }
}
