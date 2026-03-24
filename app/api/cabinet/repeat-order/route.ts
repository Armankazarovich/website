export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId, userId: session.user.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true, images: true, active: true } },
            },
          },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

  const cartItems = order.items
    .filter((item) => item.variant.product.active)
    .map((item) => {
      const unitType = item.unitType as "CUBE" | "PIECE";
      const price =
        unitType === "CUBE"
          ? Number(item.variant.pricePerCube ?? 0)
          : Number(item.variant.pricePerPiece ?? 0);

      return {
        variantId: item.variantId,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        productSlug: item.variant.product.slug,
        productImage: item.variant.product.images[0] ?? null,
        variantSize: item.variantSize,
        unitType,
        quantity: Number(item.quantity),
        price,
      };
    })
    .filter((item) => item.price > 0);

  return NextResponse.json({ items: cartItems });
}
