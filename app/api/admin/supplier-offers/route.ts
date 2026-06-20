export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const SUPPLIER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];
const SUPPLIER_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

async function checkSupplierAccess(write = false) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const allowed = write ? SUPPLIER_WRITE_ROLES : SUPPLIER_ROLES;
  return Boolean(session && role && allowed.includes(role));
}

function serializeMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function serializeOffer(offer: any) {
  return {
    ...offer,
    pricePerCube: serializeMoney(offer.pricePerCube),
    pricePerPiece: serializeMoney(offer.pricePerPiece),
    pricePerSquareMeter: serializeMoney(offer.pricePerSquareMeter),
    minOrderQty: serializeMoney(offer.minOrderQty),
  };
}

export async function GET() {
  if (!(await checkSupplierAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const offers = await prisma.supplierOffer.findMany({
    where: { tenantId },
    include: {
      supplier: true,
      variant: {
        include: {
          product: { select: { id: true, name: true, slug: true, category: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ preferred: "desc" }, { updatedAt: "desc" }],
    take: 300,
  });
  return NextResponse.json(offers.map(serializeOffer));
}

export async function POST(req: Request) {
  if (!(await checkSupplierAccess(true))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const supplierId = cleanString(body.supplierId, 128);
  const variantId = cleanString(body.variantId, 128);
  if (!supplierId || !variantId) {
    return NextResponse.json({ error: "Выберите поставщика и размер товара" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true } });
  if (!supplier) return NextResponse.json({ error: "Поставщик не найден" }, { status: 404 });

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { tenantId } },
    select: { id: true, product: { select: { slug: true } } },
  });
  if (!variant) return NextResponse.json({ error: "Размер товара не найден" }, { status: 404 });

  const pricePerCube = cleanNumber(body.pricePerCube);
  const pricePerPiece = cleanNumber(body.pricePerPiece);
  const pricePerSquareMeter = cleanNumber(body.pricePerSquareMeter);
  const stockQty = cleanNumber(body.stockQty);
  const minOrderQty = cleanNumber(body.minOrderQty);
  const leadTimeDays = cleanNumber(body.leadTimeDays);

  if (pricePerCube === null && pricePerPiece === null && pricePerSquareMeter === null) {
    return NextResponse.json({ error: "Укажите цену поставщика за м3, м2 или штуку" }, { status: 400 });
  }

  const preferred = body.preferred === true;
  if (preferred) {
    await prisma.supplierOffer.updateMany({
      where: { tenantId, variantId, preferred: true },
      data: { preferred: false },
    });
  }

  const offer = await prisma.supplierOffer.upsert({
    where: { tenantId_supplierId_variantId: { tenantId, supplierId, variantId } },
    create: {
      tenantId,
      supplierId,
      variantId,
      pricePerCube,
      pricePerPiece,
      pricePerSquareMeter,
      stockQty: stockQty === null ? null : Math.round(stockQty),
      minOrderQty,
      leadTimeDays: leadTimeDays === null ? null : Math.round(leadTimeDays),
      city: cleanString(body.city, 120),
      deliveryText: cleanString(body.deliveryText, 240),
      notes: cleanString(body.notes, 1000),
      active: body.active === false ? false : true,
      preferred,
      lastSeenAt: new Date(),
    },
    update: {
      pricePerCube,
      pricePerPiece,
      pricePerSquareMeter,
      stockQty: stockQty === null ? null : Math.round(stockQty),
      minOrderQty,
      leadTimeDays: leadTimeDays === null ? null : Math.round(leadTimeDays),
      city: cleanString(body.city, 120),
      deliveryText: cleanString(body.deliveryText, 240),
      notes: cleanString(body.notes, 1000),
      active: body.active === false ? false : true,
      preferred,
      lastSeenAt: new Date(),
    },
    include: {
      supplier: true,
      variant: { include: { product: { select: { id: true, name: true, slug: true } } } },
    },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  revalidatePath(`/product/${variant.product.slug}`);
  revalidateTag("store-shell-data");
  return NextResponse.json(serializeOffer(offer), { status: 201 });
}
