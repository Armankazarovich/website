export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { cleanExternalUrl, cleanPositiveInt, cleanPublicAssetUrl, hasRawValue } from "@/lib/supplier-profile";

const SUPPLIER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];
const SUPPLIER_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];
const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "BLOCKED"] as const;
const TRUST_LEVELS = ["NEW", "CHECKED", "PRIORITY", "RISK"] as const;

function serializeMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function invalidUrlResponse(label: string) {
  return NextResponse.json({ error: `${label}: укажите корректную http(s)-ссылку или оставьте поле пустым` }, { status: 400 });
}

async function checkSupplierAccess(write = false) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const allowed = write ? SUPPLIER_WRITE_ROLES : SUPPLIER_ROLES;
  return Boolean(session && role && allowed.includes(role));
}

async function makeUniqueSupplierSlug(baseValue: string, tenantId: string) {
  const base = slugify(baseValue) || "supplier";
  let candidate = base;
  let suffix = 1;

  while (await prisma.supplier.findUnique({ where: { tenantId_slug: { tenantId, slug: candidate } }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function serializeSupplier(supplier: any) {
  return {
    ...supplier,
    offers: supplier.offers?.map((offer: any) => ({
      ...offer,
      pricePerCube: serializeMoney(offer.pricePerCube),
      pricePerPiece: serializeMoney(offer.pricePerPiece),
      pricePerSquareMeter: serializeMoney(offer.pricePerSquareMeter),
      minOrderQty: serializeMoney(offer.minOrderQty),
    })) ?? [],
  };
}

export async function GET() {
  if (!(await checkSupplierAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    include: {
      _count: { select: { offers: true } },
      offers: {
        orderBy: { updatedAt: "desc" },
        take: 5,
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
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(suppliers.map(serializeSupplier));
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

  const name = cleanString(body.name, 160);
  if (!name) return NextResponse.json({ error: "Название поставщика обязательно" }, { status: 400 });

  const rawStatus = cleanString(body.status, 20);
  const rawTrust = cleanString(body.trustLevel, 20);
  const status = rawStatus && STATUSES.includes(rawStatus as any) ? rawStatus : "DRAFT";
  const trustLevel = rawTrust && TRUST_LEVELS.includes(rawTrust as any) ? rawTrust : "NEW";
  const slug = await makeUniqueSupplierSlug(cleanString(body.slug, 120) || name, tenantId);
  const website = cleanExternalUrl(body.website);
  const sourceUrl = cleanExternalUrl(body.sourceUrl) || website;
  const logoUrl = cleanPublicAssetUrl(body.logoUrl);
  if (hasRawValue(body.website) && !website) return invalidUrlResponse("Сайт продавца");
  if (hasRawValue(body.sourceUrl) && !sourceUrl) return invalidUrlResponse("Сайт для скана");
  if (hasRawValue(body.logoUrl) && !logoUrl) {
    return NextResponse.json({ error: "Логотип: укажите /путь-к-файлу или корректную http(s)-ссылку" }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      tenantId,
      name,
      slug,
      legalName: cleanString(body.legalName, 220),
      inn: cleanString(body.inn, 20),
      phone: cleanString(body.phone, 60),
      email: cleanString(body.email, 120),
      website,
      sourceUrl,
      logoUrl,
      city: cleanString(body.city, 120),
      address: cleanString(body.address, 240),
      contactName: cleanString(body.contactName, 120),
      publicDescription: cleanString(body.publicDescription, 800),
      specialization: cleanString(body.specialization, 240),
      deliverySummary: cleanString(body.deliverySummary, 320),
      notes: cleanString(body.notes, 1200),
      status: status as any,
      trustLevel: trustLevel as any,
      active: body.active === false ? false : true,
      storefrontEnabled: body.storefrontEnabled === true,
      featuredSeller: body.featuredSeller === true,
      marketplaceRank: cleanPositiveInt(body.marketplaceRank, 100),
    },
    include: { _count: { select: { offers: true } }, offers: true },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${supplier.slug}`);
  return NextResponse.json(serializeSupplier(supplier), { status: 201 });
}
