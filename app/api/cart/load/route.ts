export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPurchasableQuantityLimit } from "@/lib/product-availability";
import { getPublicVariantsFilter } from "@/lib/product-seo";

// Принимает компактный список вариантов и возвращает полные данные из БД
// Формат items: [{ v: variantId, q: quantity, u: "CUBE"|"PIECE" }]
export async function POST(req: Request) {
  try {
    const { items } = await req.json() as {
      items: Array<{ v: string; q: number; u: "CUBE" | "PIECE" }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Нет товаров" }, { status: 400 });
    }

    // Ограничение — не более 50 позиций
    const limited = items.slice(0, 50);
    const variantIds = limited.map((i) => i.v);

    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        ...getPublicVariantsFilter(),
        product: {
          active: true,
          images: { isEmpty: false },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            saleUnit: true,
          },
        },
      },
    });

    // Собираем полные CartItem из данных БД
    const cartItems = limited
      .map(({ v, q, u }) => {
        const variant = variants.find((vr) => vr.id === v);
        if (!variant) return null;
        if (variant.product.saleUnit !== "BOTH" && variant.product.saleUnit !== u) return null;

        const price =
          u === "CUBE"
            ? Number(variant.pricePerCube ?? 0)
            : Number(variant.pricePerPiece ?? 0);

        if (price === 0) return null;
        const maxQuantity = getPurchasableQuantityLimit(variant, u);
        const quantity = Number.isFinite(Number(q)) ? Math.max(0, Number(q)) : 0;
        const safeQuantity = maxQuantity === null ? quantity : Math.min(quantity, maxQuantity);
        if (safeQuantity <= 0) return null;

        return {
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          productSlug: variant.product.slug,
          productImage: variant.product.images[0] ?? null,
          variantSize: variant.size,
          unitType: u,
          quantity: safeQuantity,
          price,
          maxQuantity,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ items: cartItems });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
