export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { generateProductDescription, getPublicVariantsFilter } from "@/lib/product-seo";
import { makeShortProductDescription, normalizeProductText } from "@/lib/product-descriptions";
import { normalizeProductCardTags } from "@/lib/product-insights";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { revalidatePath, revalidateTag } from "next/cache";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

function revalidateProductsPublicPaths(slug?: string | null) {
  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/product/${slug}`);
}

function serializeMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function serializeProduct<T extends { variants?: Array<Record<string, unknown>> }>(product: T) {
  return {
    ...product,
    variants: product.variants?.map((variant) => ({
      ...variant,
      pricePerCube: serializeMoney(variant.pricePerCube),
      pricePerPiece: serializeMoney(variant.pricePerPiece),
    })) ?? [],
  };
}

async function makeUniqueProductSlug(base: string, tenantId: string) {
  const cleanBase = slugify(base) || "product";
  let candidate = cleanBase;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { tenantId_slug: { tenantId, slug: candidate } }, select: { id: true } })) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function checkProductsAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && PRODUCTS_ROLES.includes(role);
}

export async function GET(req: Request) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const { searchParams } = new URL(req.url);

  if (searchParams.get("ids") === "1") {
    const productIds = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(productIds);
  }

  const scope = searchParams.get("scope");
  const where =
    scope === "active"
      ? { tenantId, active: true }
      : scope === "hidden"
      ? {
          tenantId,
          OR: [
            { active: false },
            { images: { isEmpty: true } },
            { variants: { none: getPublicVariantsFilter() } },
          ],
        }
      : { tenantId };

  const products = await prisma.product.findMany({
    where,
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products.map(serializeProduct));
}

export async function POST(req: Request) {
  if (!(await checkProductsAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { name, slug, shortDescription, description, categoryId, images, cardTags, saleUnit, active, featured, variants } = body as {
    name?: string;
    slug?: string;
    shortDescription?: string;
    description?: string;
    categoryId?: string;
    images?: unknown;
    cardTags?: unknown;
    saleUnit?: string;
    active?: boolean;
    featured?: boolean;
    variants?: unknown;
  };

  // ── Валидация ────────────────────────────────────────────────────────────
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Название товара обязательно" }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return NextResponse.json({ error: "Название не должно превышать 200 символов" }, { status: 400 });
  }
  const finalSlug = await makeUniqueProductSlug(
    typeof slug === "string" && slug.trim() ? slug : name.trim(),
    tenantId
  );
  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "Выберите категорию" }, { status: 400 });
  }
  if (saleUnit !== undefined && !["CUBE", "PIECE", "BOTH"].includes(saleUnit)) {
    return NextResponse.json(
      { error: "Единица продажи выбрана некорректно" },
      { status: 400 }
    );
  }
  if (images !== undefined && !Array.isArray(images)) {
    return NextResponse.json({ error: "Фото переданы в неверном формате" }, { status: 400 });
  }
  if (variants !== undefined && !Array.isArray(variants)) {
    return NextResponse.json({ error: "Размеры и цены переданы в неверном формате" }, { status: 400 });
  }

  type InVariant = {
    size?: unknown;
    pricePerCube?: unknown;
    pricePerPiece?: unknown;
    piecesPerCube?: unknown;
    inStock?: unknown;
  };

  let normalizedVariants: Array<{
    size: string;
    pricePerCube: number | null;
    pricePerPiece: number | null;
    piecesPerCube: number | null;
    inStock: boolean;
  }> = [];

  try {
    normalizedVariants = Array.isArray(variants)
      ? (variants as InVariant[]).map((v, i) => {
          const size = String(v.size ?? "")
            .trim()
            .replace(/[хx*]/gi, "×");
          const pricePerCube =
            v.pricePerCube !== undefined && v.pricePerCube !== null && v.pricePerCube !== ""
              ? Number(v.pricePerCube)
              : null;
          const pricePerPiece =
            v.pricePerPiece !== undefined && v.pricePerPiece !== null && v.pricePerPiece !== ""
              ? Number(v.pricePerPiece)
              : null;
          const piecesPerCube =
            v.piecesPerCube !== undefined && v.piecesPerCube !== null && v.piecesPerCube !== ""
              ? Number(v.piecesPerCube)
              : null;

          if (!size) throw new Error(`Вариант #${i + 1}: укажите размер`);
          if (pricePerCube === null && pricePerPiece === null) {
            throw new Error(`Вариант ${size}: укажите хотя бы одну цену (за м³ или за шт)`);
          }
          if (pricePerCube !== null && (Number.isNaN(pricePerCube) || pricePerCube < 0)) {
            throw new Error(`Вариант ${size}: цена за м³ должна быть числом ≥ 0`);
          }
          if (pricePerPiece !== null && (Number.isNaN(pricePerPiece) || pricePerPiece < 0)) {
            throw new Error(`Вариант ${size}: цена за шт должна быть числом ≥ 0`);
          }
          if (piecesPerCube !== null && (Number.isNaN(piecesPerCube) || piecesPerCube < 0)) {
            throw new Error(`Вариант ${size}: количество в м³ должно быть числом ≥ 0`);
          }

          return {
            size,
            pricePerCube,
            pricePerPiece,
            piecesPerCube,
            inStock: v.inStock === false ? false : true,
          };
        })
      : [];

    const seenSizes = new Set<string>();
    for (const variant of normalizedVariants) {
      const key = variant.size.toLowerCase();
      if (seenSizes.has(key)) {
        throw new Error(`Дубликат размера "${variant.size}" — размеры должны быть уникальны в товаре`);
      }
      seenSizes.add(key);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Некорректные варианты товара" },
      { status: 400 }
    );
  }

  // Проверка существования категории
  const categoryExists = await prisma.category.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true, name: true },
  });
  if (!categoryExists) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
  }

  // Авто-шаблонное описание, если менеджер не заполнил поле
  let finalDescription = description;
  const isEmptyDesc = !description || !String(description).trim() || String(description).trim().length < 180;
  if (isEmptyDesc) {
    try {
      const settings = await getSiteSettings();
      finalDescription = generateProductDescription(
        {
          name: name.trim(),
          description: description ?? null,
          category: { name: categoryExists.name },
          variants: normalizedVariants,
        },
        settings
      );
    } catch (err) {
      console.warn("[products:create] auto-description failed", err);
      finalDescription = description;
    }
  }
  const finalShortDescription =
    normalizeProductText(shortDescription) ||
    makeShortProductDescription(finalDescription, name.trim());

  try {
    const product = await prisma.product.create({
      data: {
        tenantId,
        name: name.trim(),
        slug: finalSlug,
        shortDescription: finalShortDescription,
        description: finalDescription,
        categoryId,
        images: Array.isArray(images) ? (images as string[]) : [],
        cardTags: normalizeProductCardTags(Array.isArray(cardTags) ? (cardTags as string[]) : []),
        saleUnit: (saleUnit ?? "BOTH") as never,
        active: active ?? true,
        featured: featured ?? false,
        variants: normalizedVariants.length > 0
          ? {
              create: normalizedVariants.map((v, index) => ({
                size: v.size,
                pricePerCube: v.pricePerCube,
                pricePerPiece: v.pricePerPiece,
                piecesPerCube: v.piecesPerCube,
                inStock: v.inStock,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { category: true, variants: true },
    });
    revalidateProductsPublicPaths(product.slug);
    return NextResponse.json(serializeProduct(product), { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Товар с таким адресом страницы уже существует. Выберите другой адрес." },
        { status: 409 }
      );
    }
    if (code === "P2003") {
      return NextResponse.json(
        { error: "Категория не существует или удалена" },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Ошибка создания товара";
    console.error("[products:create] error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
