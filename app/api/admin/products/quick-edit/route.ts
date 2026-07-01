export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { revalidatePath, revalidateTag } from "next/cache";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

function revalidateProductPublicPaths(slug?: string | null) {
  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/price-list");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/product/${slug}`);
}

function parseNullableMoney(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label}: укажите число от 0`);
  }
  return parsed;
}

function parseNullableInt(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}: укажите целое число от 0`);
  }
  return parsed;
}

function normalizeSize(value: unknown) {
  if (value === undefined) return undefined;
  const size = String(value)
    .trim()
    .replace(/[xXхХ*]/g, "×")
    .replace(/\s+/g, " ");
  if (!size) throw new Error("Размер не может быть пустым");
  if (size.length > 120) throw new Error("Размер слишком длинный");
  return size;
}

function serializeVariant<T extends Record<string, unknown>>(variant: T) {
  return {
    ...variant,
    pricePerCube: variant.pricePerCube == null ? null : Number(variant.pricePerCube),
    pricePerPiece: variant.pricePerPiece == null ? null : Number(variant.pricePerPiece),
    pricePerSquareMeter: variant.pricePerSquareMeter == null ? null : Number(variant.pricePerSquareMeter),
  };
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const {
    variantId,
    size,
    pricePerCube,
    pricePerPiece,
    pricePerSquareMeter,
    piecesPerCube,
    stockQty,
    lowStockThreshold,
    inStock,
  } = await req.json();
  if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { tenantId } },
    select: { id: true, productId: true, product: { select: { slug: true } } },
  });
  if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    size?: string;
    pricePerCube?: number | null;
    pricePerPiece?: number | null;
    pricePerSquareMeter?: number | null;
    piecesPerCube?: number | null;
    stockQty?: number | null;
    lowStockThreshold?: number;
    inStock?: boolean;
  } = {};

  try {
    const nextSize = normalizeSize(size);
    if (nextSize !== undefined) {
      const duplicate = await prisma.productVariant.findFirst({
        where: {
          productId: variant.productId,
          id: { not: variant.id },
          size: nextSize,
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: `Размер "${nextSize}" уже есть у этого товара` }, { status: 409 });
      }
      data.size = nextSize;
    }

    const nextCube = parseNullableMoney(pricePerCube, "Цена за м³");
    const nextPiece = parseNullableMoney(pricePerPiece, "Цена за шт");
    const nextSquare = parseNullableMoney(pricePerSquareMeter, "Цена за м²");
    const nextPiecesPerCube = parseNullableInt(piecesPerCube, "Штук в м³");
    const nextStockQty = parseNullableInt(stockQty, "Остаток");
    const nextLowStock = parseNullableInt(lowStockThreshold, "Порог остатка");

    if (nextCube !== undefined) data.pricePerCube = nextCube;
    if (nextPiece !== undefined) data.pricePerPiece = nextPiece;
    if (nextSquare !== undefined) data.pricePerSquareMeter = nextSquare;
    if (nextPiecesPerCube !== undefined) data.piecesPerCube = nextPiecesPerCube;
    if (nextStockQty !== undefined) data.stockQty = nextStockQty;
    if (nextLowStock !== undefined) data.lowStockThreshold = nextLowStock ?? 0;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Некорректные данные" },
      { status: 400 }
    );
  }

  if (inStock !== undefined) data.inStock = inStock;

  const updated = await prisma.productVariant.update({ where: { id: variantId }, data });
  revalidateProductPublicPaths(variant.product.slug);
  return NextResponse.json({ ok: true, variant: serializeVariant(updated) });
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const { action, productId, active } = await req.json();

  if (action === "toggle_active") {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, slug: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.product.update({ where: { id: product.id }, data: { active: Boolean(active) } });
    revalidateProductPublicPaths(product.slug);
    return NextResponse.json({ ok: true, product: { id: product.id, active: Boolean(active) } });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
