export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const SUPPLIER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];
const SUPPLIER_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];
const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "BLOCKED"] as const;
const TRUST_LEVELS = ["NEW", "CHECKED", "PRIORITY", "RISK"] as const;

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
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

function serializeSupplier(supplier: any) {
  return {
    ...supplier,
    offers: supplier.offers?.map((offer: any) => ({
      ...offer,
      pricePerCube: serializeMoney(offer.pricePerCube),
      pricePerPiece: serializeMoney(offer.pricePerPiece),
      minOrderQty: serializeMoney(offer.minOrderQty),
    })) ?? [],
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkSupplierAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId },
    include: {
      _count: { select: { offers: true } },
      offers: {
        orderBy: { updatedAt: "desc" },
        include: {
          variant: {
            select: {
              id: true,
              size: true,
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  });
  if (!supplier) return NextResponse.json({ error: "Поставщик не найден" }, { status: 404 });
  return NextResponse.json(serializeSupplier(supplier));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkSupplierAccess(true))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const key of ["name", "legalName", "inn", "phone", "email", "website", "city", "address", "contactName", "notes"] as const) {
    if (key in body) data[key] = cleanString(body[key], key === "notes" ? 1200 : key === "address" ? 240 : 160);
  }
  if ("name" in data) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return NextResponse.json({ error: "Название поставщика обязательно" }, { status: 400 });
    }
  }
  if ("status" in body) {
    const status = cleanString(body.status, 20);
    if (!status || !STATUSES.includes(status as any)) return NextResponse.json({ error: "Некорректный статус поставщика" }, { status: 400 });
    data.status = status;
  }
  if ("trustLevel" in body) {
    const trustLevel = cleanString(body.trustLevel, 20);
    if (!trustLevel || !TRUST_LEVELS.includes(trustLevel as any)) return NextResponse.json({ error: "Некорректный уровень доверия" }, { status: 400 });
    data.trustLevel = trustLevel;
  }
  if ("active" in body) data.active = body.active === false ? false : true;

  const result = await prisma.supplier.updateMany({
    where: { id: params.id, tenantId },
    data,
  });
  if (result.count === 0) return NextResponse.json({ error: "Поставщик не найден" }, { status: 404 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId },
    include: { _count: { select: { offers: true } }, offers: true },
  });

  revalidatePath("/admin/suppliers");
  return NextResponse.json(serializeSupplier(supplier));
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkSupplierAccess(true))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const result = await prisma.supplier.updateMany({
    where: { id: params.id, tenantId },
    data: { active: false, status: "PAUSED" },
  });
  if (result.count === 0) return NextResponse.json({ error: "Поставщик не найден" }, { status: 404 });
  revalidatePath("/admin/suppliers");
  return NextResponse.json({ ok: true });
}
