/**
 * data-migrate.ts — Идемпотентные миграции данных для продакшна.
 * Запускается при каждом деплое (часть build скрипта).
 * Все операции проверяют текущее состояние перед изменением — безопасно запускать многократно.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = "pilorus";
const ALLOW_LEGACY_CATALOG_MUTATIONS = process.env.PILORUS_ALLOW_LEGACY_CATALOG_MUTATIONS === "1";
const ALLOW_PILMOS_CATALOG_SNAPSHOT = process.env.PILORUS_APPLY_CATALOG_SNAPSHOT === "1";

async function upsertSetting(key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key } },
    create: { tenantId: DEFAULT_TENANT_ID, key, value },
    update: { value },
  });
}

async function ensureSetting(key: string, value: string) {
  const existing = await prisma.siteSettings.findUnique({
    where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key } },
    select: { id: true },
  });
  if (existing) return false;
  await prisma.siteSettings.create({
    data: { tenantId: DEFAULT_TENANT_ID, key, value },
  });
  return true;
}

async function upsertTenantLaunchSettings(patch: Record<string, string>) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_ID } });
  if (!tenant) return;
  const currentSettings =
    tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings)
      ? (tenant.settings as Record<string, unknown>)
      : {};
  const nextSettings = { ...currentSettings };
  for (const [key, value] of Object.entries(patch)) {
    if (nextSettings[key] === undefined || nextSettings[key] === null || nextSettings[key] === "") {
      nextSettings[key] = value;
    }
  }

  await prisma.tenant.update({
    where: { slug: DEFAULT_TENANT_ID },
    data: {
      domain: "pilo-rus.ru",
      logoUrl: "/logo.png",
      settings: nextSettings as Prisma.InputJsonObject,
    },
  });
}

type PilmosCatalogSnapshot = {
  generatedAt: string;
  source: string;
  sourceCsv: string;
  priceFactor: number;
  categories: Array<{
    slug: string;
    name: string;
    sortOrder: number;
    image?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  }>;
  products: Array<{
    externalId?: string;
    sourceSku?: string;
    slug: string;
    name: string;
    categorySlug: string;
    images: string[];
    shortDescription?: string | null;
    description?: string | null;
    saleUnit: "CUBE" | "PIECE" | "SQUARE" | "BOTH";
    active: boolean;
    featured: boolean;
    variants: Array<{
      size: string;
      pricePerCube?: number | null;
      pricePerPiece?: number | null;
      pricePerSquareMeter?: number | null;
      piecesPerCube?: number | null;
      unit?: "CUBE" | "PIECE" | "SQUARE" | "BOTH";
      inStock: boolean;
      stockQty?: number | null;
      sortOrder: number;
    }>;
  }>;
};

function readPilmosCatalogSnapshot(): PilmosCatalogSnapshot | null {
  const snapshotPath = join(process.cwd(), "prisma", "catalog", "pilmos-catalog-2026-06-14.json");
  if (!existsSync(snapshotPath)) return null;
  return JSON.parse(readFileSync(snapshotPath, "utf8")) as PilmosCatalogSnapshot;
}

function decimalOrNull(value?: number | null) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return null;
  return new Prisma.Decimal(value);
}

type PilmosSnapshotProduct = PilmosCatalogSnapshot["products"][number];
type PilmosSnapshotVariant = PilmosSnapshotProduct["variants"][number];

const TIMBER_PRICE_CATEGORY_SLUGS = new Set(["sosna-el", "listvennitsa", "kedr", "lipa-osina"]);
const SQUARE_METER_PRICE_PRODUCT_SLUGS = new Set([
  "blok-haus-iz-sosny-i-eli",
  "blok-haus-iz-listvennitsy",
  "doska-pola-iz-listvennitsy",
  "imitatsiya-brusa-iz-sosny-i-eli",
  "imitatsiya-brusa-iz-listvennitsy",
  "imitatsiya-brusa-iz-kedra",
  "planken-iz-listvennitsy",
  "planken-iz-kedra",
  "terrasnaya-doska-iz-listvennitsy",
]);

function isKnownSquareMeterVariant(productSlug: string, variant: PilmosSnapshotVariant) {
  if (!SQUARE_METER_PRICE_PRODUCT_SLUGS.has(productSlug)) return false;
  const size = normalizeDimensionText(variant.size).toLowerCase();

  if (
    productSlug === "imitatsiya-brusa-iz-listvennitsy" &&
    (size.includes("2500") || size.includes("2800") || size.includes("3000"))
  ) {
    return false;
  }

  if (
    productSlug === "imitatsiya-brusa-iz-sosny-i-eli" &&
    size.includes("3000") &&
    /sort\s*c|\u0441\u043e\u0440\u0442\s*c/i.test(size)
  ) {
    return false;
  }

  return true;
}

function normalizeDimensionText(value: string) {
  return String(value || "")
    .replace(/[\u00d7\u0445\u0425*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCubeUnitHint(value: string) {
  return /(?:^|[\s/])(?:m3|m\^3|m\u00b3|\u043c3|\u043c\^3|\u043c\u00b3)(?:$|[\s/.,;])/i.test(
    String(value || ""),
  );
}

function piecesPerCubeFromSize(value: string) {
  const match = normalizeDimensionText(value).match(/(\d{1,4})\s*x\s*(\d{1,4})\s*x\s*(\d{3,5})/);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  const length = Number(match[3]);
  const volume = (width / 1000) * (height / 1000) * (length / 1000);

  if (!Number.isFinite(volume) || volume <= 0) return null;
  return Math.max(1, Math.floor(1 / volume));
}

function hasConflictingPiecePrice(pricePerCube: number, pricePerPiece: number, piecesPerCube: number) {
  if (!pricePerCube || !pricePerPiece || !piecesPerCube) return false;
  const expectedPiece = pricePerCube / piecesPerCube;
  const diff = Math.abs(pricePerPiece - expectedPiece) / Math.max(1, expectedPiece);
  return diff > 0.25;
}

function normalizePilmosSnapshotVariant(
  productSlug: string,
  categorySlug: string,
  variant: PilmosSnapshotVariant,
): PilmosSnapshotVariant {
  const pricePerPiece = Number(variant.pricePerPiece || 0);
  const pricePerCube = Number(variant.pricePerCube || 0);
  const pricePerSquareMeter = Number(variant.pricePerSquareMeter || 0);
  const piecesPerCube = variant.piecesPerCube ?? piecesPerCubeFromSize(variant.size);
  const sourceUnit = variant.unit;

  if (isKnownSquareMeterVariant(productSlug, variant)) {
    const squarePrice =
      pricePerSquareMeter ||
      pricePerPiece ||
      (pricePerCube >= 10000 ? pricePerCube / 10 : pricePerCube);

    return {
      ...variant,
      pricePerCube: null,
      pricePerPiece: null,
      pricePerSquareMeter: squarePrice > 0 ? Math.round(squarePrice) : null,
      piecesPerCube: null,
    };
  }

  if (sourceUnit === "PIECE") return variant;

  if (
    TIMBER_PRICE_CATEGORY_SLUGS.has(categorySlug) &&
    pricePerCube > 0 &&
    pricePerPiece > 0 &&
    piecesPerCube &&
    hasConflictingPiecePrice(pricePerCube, pricePerPiece, piecesPerCube)
  ) {
    return {
      ...variant,
      pricePerPiece: null,
      piecesPerCube,
    };
  }

  if (!pricePerPiece || pricePerCube) return variant;

  const shouldPromoteToCube =
    hasCubeUnitHint(variant.size) ||
    (TIMBER_PRICE_CATEGORY_SLUGS.has(categorySlug) && pricePerPiece >= 10000 && Boolean(piecesPerCube));

  if (!shouldPromoteToCube) return variant;

  return {
    ...variant,
    pricePerCube: pricePerPiece,
    pricePerPiece: null,
    piecesPerCube: piecesPerCube ?? variant.piecesPerCube ?? null,
  };
}

function saleUnitFromSnapshotVariants(variants: PilmosSnapshotVariant[]): "CUBE" | "PIECE" | "SQUARE" | "BOTH" {
  const hasCube = variants.some((variant) => Number(variant.pricePerCube || 0) > 0);
  const hasPiece = variants.some((variant) => Number(variant.pricePerPiece || 0) > 0);
  const hasSquare = variants.some((variant) => Number(variant.pricePerSquareMeter || 0) > 0);

  const count = [hasCube, hasPiece, hasSquare].filter(Boolean).length;
  if (count > 1) return "BOTH";
  if (hasCube) return "CUBE";
  if (hasSquare) return "SQUARE";
  return "PIECE";
}

function variantCatalogKey(variant: {
  size: string;
  pricePerCube?: unknown;
  pricePerPiece?: unknown;
  pricePerSquareMeter?: unknown;
  piecesPerCube?: unknown;
}) {
  const value = (price: unknown) => {
    const numeric = Number(price);
    return Number.isFinite(numeric) && numeric > 0 ? String(Math.round(numeric)) : "";
  };
  return [
    variant.size.trim(),
    value(variant.pricePerCube),
    value(variant.pricePerPiece),
    value(variant.pricePerSquareMeter),
    variant.piecesPerCube ?? "",
  ].join("|");
}

async function applyPilmosCatalogSnapshot() {
  const snapshot = readPilmosCatalogSnapshot();
  if (!snapshot) return;
  if (!ALLOW_PILMOS_CATALOG_SNAPSHOT) {
    console.log(
      "[data-migrate] Pilmos catalog snapshot skipped: live manager edits are protected. Set PILORUS_APPLY_CATALOG_SNAPSHOT=1 to re-import intentionally.",
    );
    return;
  }
  const snapshotSlugs = new Set(snapshot.products.map((product) => product.slug));

  const categoryBySlug = new Map<string, { id: string; slug: string }>();
  let categoriesSynced = 0;
  for (const category of snapshot.categories) {
    const saved = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: category.slug } },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        slug: category.slug,
        name: category.name,
        image: category.image || null,
        sortOrder: category.sortOrder,
        showInMenu: true,
        showInFooter: true,
        seoTitle: category.seoTitle || null,
        seoDescription: category.seoDescription || null,
      },
      update: {
        name: category.name,
        image: category.image || null,
        sortOrder: category.sortOrder,
        showInMenu: true,
        showInFooter: true,
        seoTitle: category.seoTitle || null,
        seoDescription: category.seoDescription || null,
      },
      select: { id: true, slug: true },
    });
    categoryBySlug.set(saved.slug, saved);
    categoriesSynced++;
  }

  let productsSynced = 0;
  let variantsSynced = 0;
  let variantsDeleted = 0;
  let variantsArchived = 0;
  for (const product of snapshot.products) {
    const category = categoryBySlug.get(product.categorySlug);
    const normalizedVariants = product.variants.map((variant) =>
      normalizePilmosSnapshotVariant(product.slug, product.categorySlug, variant),
    );
    if (!category || !product.images.length || !normalizedVariants.length) continue;

    const productData = {
      name: product.name,
      shortDescription: product.shortDescription || null,
      description: product.description || product.shortDescription || product.name,
      categoryId: category.id,
      images: product.images,
      saleUnit: saleUnitFromSnapshotVariants(normalizedVariants),
      active: product.active,
      featured: product.featured,
    };

    const savedProduct = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: product.slug } },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        slug: product.slug,
        ...productData,
      },
      update: productData,
      select: { id: true },
    });
    productsSynced++;

    const existingVariants = await prisma.productVariant.findMany({
      where: { productId: savedProduct.id },
      select: { id: true, size: true },
    });
    const variantBySize = new Map(existingVariants.map((variant) => [variant.size, variant]));
    const desiredSizes = new Set(normalizedVariants.map((variant) => variant.size));
    const desiredVariantKeys = new Set(normalizedVariants.map(variantCatalogKey));

    for (const variant of normalizedVariants) {
      const variantData = {
        size: variant.size,
        pricePerCube: decimalOrNull(variant.pricePerCube),
        pricePerPiece: decimalOrNull(variant.pricePerPiece),
        pricePerSquareMeter: decimalOrNull(variant.pricePerSquareMeter),
        piecesPerCube: variant.piecesPerCube ?? null,
        inStock: variant.inStock,
        stockQty: variant.stockQty ?? null,
        sortOrder: variant.sortOrder,
      };
      const existing = variantBySize.get(variant.size);
      if (existing) {
        await prisma.productVariant.update({
          where: { id: existing.id },
          data: variantData,
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: savedProduct.id,
            ...variantData,
          },
        });
      }
      variantsSynced++;
    }

    if (desiredSizes.size > 0) {
      const currentVariants = await prisma.productVariant.findMany({
        where: { productId: savedProduct.id },
        select: {
          id: true,
          size: true,
          pricePerCube: true,
          pricePerPiece: true,
          pricePerSquareMeter: true,
          piecesPerCube: true,
          sortOrder: true,
          _count: { select: { orderItems: true } },
        },
      });
      const staleVariants = currentVariants.filter((variant) => !desiredVariantKeys.has(variantCatalogKey(variant)));
      if (staleVariants.length) {
        const archived = await prisma.productVariant.updateMany({
          where: { id: { in: staleVariants.map((variant) => variant.id) } },
          data: { inStock: false, stockQty: 0 },
        });
        variantsArchived += archived.count;
        const removableIds = staleVariants
          .filter((variant) => variant._count.orderItems === 0)
          .map((variant) => variant.id);
        if (removableIds.length) {
          const deleted = await prisma.productVariant.deleteMany({
            where: { id: { in: removableIds } },
          });
          variantsDeleted += deleted.count;
        }
      }

      const duplicateGroups = new Map<string, typeof currentVariants>();
      for (const variant of currentVariants) {
        const key = variantCatalogKey(variant);
        if (!desiredVariantKeys.has(key)) continue;
        const group = duplicateGroups.get(key) || [];
        group.push(variant);
        duplicateGroups.set(key, group);
      }
      const duplicateIds = [...duplicateGroups.values()]
        .filter((group) => group.length > 1)
        .flatMap((group) =>
          group
            .sort((a, b) => b._count.orderItems - a._count.orderItems || a.sortOrder - b.sortOrder)
            .slice(1),
        );
      if (duplicateIds.length) {
        const archived = await prisma.productVariant.updateMany({
          where: { id: { in: duplicateIds.map((variant) => variant.id) } },
          data: { inStock: false, stockQty: 0 },
        });
        variantsArchived += archived.count;
        const removableIds = duplicateIds
          .filter((variant) => variant._count.orderItems === 0)
          .map((variant) => variant.id);
        if (removableIds.length) {
          const deleted = await prisma.productVariant.deleteMany({
            where: { id: { in: removableIds } },
          });
          variantsDeleted += deleted.count;
        }
      }

      const obsoleteWhere = {
        productId: savedProduct.id,
        size: { notIn: Array.from(desiredSizes) },
      };
      const archived = await prisma.productVariant.updateMany({
        where: obsoleteWhere,
        data: { inStock: false, stockQty: 0 },
      });
      variantsArchived += archived.count;

      const obsoleteVariants = await prisma.productVariant.findMany({
        where: obsoleteWhere,
        select: { id: true, _count: { select: { orderItems: true } } },
      });
      const removableIds = obsoleteVariants
        .filter((variant) => variant._count.orderItems === 0)
        .map((variant) => variant.id);

      if (removableIds.length) {
        const deleted = await prisma.productVariant.deleteMany({
          where: { id: { in: removableIds } },
        });
        variantsDeleted += deleted.count;
      }
    }
  }

  const legacyStorefrontProducts = await prisma.product.findMany({
    where: {
      tenantId: DEFAULT_TENANT_ID,
      slug: { notIn: Array.from(snapshotSlugs) },
      category: {
        tenantId: DEFAULT_TENANT_ID,
        slug: { in: snapshot.categories.map((category) => category.slug) },
      },
    },
    select: { id: true, slug: true },
  });
  const retiredLegacyProducts = legacyStorefrontProducts.length
    ? await prisma.product.updateMany({
        where: { id: { in: legacyStorefrontProducts.map((product) => product.id) } },
        data: { active: false, featured: false },
      })
    : { count: 0 };

  await upsertSetting(
    "catalog_pilmos_snapshot_20260614",
    JSON.stringify({
      generatedAt: snapshot.generatedAt,
      source: snapshot.source,
      sourceCsv: snapshot.sourceCsv,
      priceFactor: snapshot.priceFactor,
      categories: categoriesSynced,
      products: productsSynced,
      variants: variantsSynced,
      variantsArchived,
      variantsDeleted,
      retiredLegacyProducts: retiredLegacyProducts.count,
    }),
  );
  console.log(
    `[data-migrate] Pilmos catalog snapshot applied: ${productsSynced} products, ${variantsSynced} variants, ${categoriesSynced} categories, ${variantsArchived} obsolete variants archived, ${variantsDeleted} obsolete variants deleted, ${retiredLegacyProducts.count} legacy storefront products retired`,
  );
}

async function ensureLaunchPromotion({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const normalizeTitle = (value: string) =>
    value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const existingPromotions = await prisma.promotion.findMany({
    where: { tenantId: DEFAULT_TENANT_ID },
    orderBy: { createdAt: "asc" },
  });
  const matches = existingPromotions.filter(
    (promotion) => normalizeTitle(promotion.title) === normalizeTitle(title),
  );
  const existing = matches[0] || null;
  const data = {
    tenantId: DEFAULT_TENANT_ID,
    title,
    description,
    discount: null,
    imageUrl: null,
    validUntil: null,
    active: true,
  };

  if (existing) {
    await prisma.promotion.update({
      where: { id: existing.id },
      data,
    });
    const duplicateIds = matches.slice(1).map((promotion) => promotion.id);
    if (duplicateIds.length) {
      await prisma.promotion.deleteMany({
        where: { id: { in: duplicateIds } },
      });
    }
    return;
  }

  await prisma.promotion.create({ data });
}

const PRODUCT_IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "gif"] as const;
const SIX_METER_CATEGORY_SLUGS = new Set(["sosna-el", "listvennitsa", "lipa-osina"]);
const SIX_METER_PRODUCT_SLUGS = new Set([
  "doska-stroganaya-suhaya-listv",
  "imitaciya-brusa-listv",
  "vagonka-shtil-listv",
]);

function normalizeSixMeterVariantSize(size: string): string | null {
  const normalized = size
    .trim()
    .replace(/\s*[xхXХ×]\s*/g, "×")
    .replace(/\s+/g, " ");

  if (/^\d+(?:[.,]\d+)?×\d+(?:[.,]\d+)?×\d+(?:[.,]\d+)?(?:\s|$)/.test(normalized)) {
    return null;
  }

  const match = normalized.match(/^(\d+(?:[.,]\d+)?)×(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return null;

  const suffix = (match[3] || "").trim();
  if (suffix && /^[xхXХ×\d]/.test(suffix)) return null;

  return `${match[1]}×${match[2]}×6000${suffix ? ` ${suffix}` : ""}`;
}

function mentionsSixMeterLength(description: string | null | undefined) {
  if (!description) return false;
  return /(длина|длиной)[^.!?]{0,50}(2\s*[–-]\s*6|6)\s*м/i.test(description);
}

function normalizeSixMeterDescription(description: string | null) {
  if (!description) return description;
  return description.replace(/([Дд]лина)\s+2\s*[–-]\s*6\s*м\.?/g, "$1 6 м.");
}

function ensureSixMeterDescription(description: string | null) {
  const normalized = normalizeSixMeterDescription(description);
  if (!normalized) return normalized;
  if (mentionsSixMeterLength(normalized)) return normalized;
  return `${normalized.trim()} Длина 6 м.`;
}

function findStableProductImage(slug: string): string | null {
  const dir = join(process.cwd(), "public", "images", "products");
  if (!existsSync(dir)) return null;

  for (const ext of PRODUCT_IMAGE_EXTENSIONS) {
    const filename = `${slug}.${ext}`;
    if (existsSync(join(dir, filename))) {
      return `/images/products/${filename}`;
    }
  }

  return null;
}

function resolvePublicFilePath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/")) return null;
  if (url.includes("..") || url.includes("\\") || url.includes("//")) return null;

  const publicUrl = url.startsWith("/api/uploads/")
    ? url.replace(/^\/api\/uploads\//, "/uploads/")
    : url;

  if (!publicUrl.startsWith("/images/") && !publicUrl.startsWith("/uploads/")) return null;

  return join(process.cwd(), "public", publicUrl.replace(/^\/+/, ""));
}

const CATEGORY_SEO_20260424: Record<string, { seoTitle: string; seoDescription: string; name?: string }> = {
  "sosna-el": {
    seoTitle: "Сосна и ель — купить пиломатериалы от производителя в Химках",
    seoDescription:
      "Доска, брус, вагонка, блок-хаус и планкен из сосны и ели. Склад в Химках, доставка по Москве и Московской области.",
  },
  "listvennitsa": {
    seoTitle: "Лиственница — террасная доска, планкен и брус в Химках",
    seoDescription:
      "Пиломатериалы из лиственницы для фасадов, террас, бань и влажных зон. Фото, цены, размеры и заказ с доставкой по Москве и МО.",
  },
  "fanera": {
    name: "Фанера",
    seoTitle: "Фанера — купить в Химках",
    seoDescription:
      "Фанера ФК, ФСФ и ламинированная фанера со склада ПилоРус. Цены за лист, доставка по Москве и области.",
  },
  "lipa-osina": {
    seoTitle: "Липа и осина для бани — вагонка и пиломатериалы",
    seoDescription:
      "Вагонка из липы и осины, доска и брус для бань, саун и внутренней отделки. Склад в Химках, доставка 1-3 дня.",
  },
};

const PRODUCT_DESCRIPTIONS_20260424: Record<string, { name?: string; description: string }> = {
  "doska-stroganaya-suhaya-sosna": {
    name: "Доска сухая строганная (Сосна/Ель)",
    description:
      "Сухая строганная доска из сосны и ели проходит камерную сушку и механическую обработку, поэтому держит геометрию и имеет гладкую поверхность. Длина доски — 6 м. Подходит для внутренней отделки, полов, стен, потолков, каркасного строительства, лестниц, мебели и столярных работ.",
  },
  "brus-strogannyy-suhoy-sosna": {
    description:
      "Сухой строганный брус из сосны и ели с точной геометрией и гладкой поверхностью. Материал проходит камерную сушку, поэтому меньше подвержен усадке, растрескиванию и деформации. Длина бруса — 6 м; применяется в каркасах, перегородках, стропильных системах и видимых деревянных конструкциях.",
  },
  "brus-strogannyy-suhoy-listv": {
    description:
      "Сухой строганный брус из лиственницы — прочный материал с высокой природной влагостойкостью. Лиственница устойчива к истиранию, точечным нагрузкам, грибку и насекомым, поэтому подходит для наружных работ, бань, террас, садовой мебели и ответственных конструкций. Длина бруса — 6 м.",
  },
  "doska-stroganaya-suhaya-listv": {
    description:
      "Строганная сухая доска из лиственницы — плотный и долговечный материал для чистовой отделки, полов, террас и влажных зон. Лиственница почти не впитывает влагу, хорошо держит геометрию и ценится за выразительную текстуру. Длина 6 м. Доступные размеры и сорт уточняются в карточке товара.",
  },
  "terrasnaya-doska-listv": {
    description:
      "Террасная доска из лиственницы подходит для открытых площадок, настилов, веранд и зон у воды. Древесина плотная, устойчива к влаге, грибку и механическим нагрузкам; рифленая поверхность помогает снизить скольжение. Варианты поставляются длиной 3 или 4 м, точную длину выбирайте в размере или уточняйте при заказе.",
  },
  "imitaciya-brusa-listv": {
    description:
      "Имитация бруса из лиственницы, или фальшбрус, — сухой строганый погонаж для внешней и внутренней обшивки стен. Профиль с фасками и соединением шип-паз дает плотное примыкание без сквозных щелей, а вентиляционные борозды на обратной стороне помогают сохранять геометрию. Длина 6 м. Подходит для фасадов, комнат отдыха, бань и интерьеров в стиле шале.",
  },
  "blok-haus-sosna": {
    description:
      "Блок-хаус из сосны и ели имитирует оцилиндрованное бревно и используется для внутренней отделки, фасадов с защитным покрытием, беседок, веранд и балконов. Вся доска поставляется длиной 6 м. Материал помогает получить вид деревянного сруба без тяжелой бревенчатой конструкции.",
  },
  "doska-pola-sosna": {
    description:
      "Доска пола, или европол, из сосны и ели — шпунтованная доска для чистовых полов в домах, банях и хозяйственных помещениях. Длина доски — 6 м. Соединение шип-паз помогает собрать ровный настил и уменьшить щели между элементами.",
  },
  "vagonka-lipa": {
    description:
      "Вагонка из липы — классический материал для бань и саун. Липа имеет низкую теплопроводность, не обжигает кожу при нагреве, не выделяет смолу и дает легкий медовый аромат. Подходит для стен, потолков и полков в парной при правильном монтаже и уходе.",
  },
  "vagonka-osina": {
    description:
      "Вагонка из осины ценится за стойкость к сырости и стабильность во влажной среде. Осина не выделяет смолу, не обжигает при нагреве, меньше подвержена гниению и хорошо подходит для парных, моечных и банной отделки.",
  },
  "vagonka-shtil-listv": {
    description:
      "Вагонка «Штиль» из лиственницы создает ровную, почти бесшовную поверхность для стен и потолков. Материал прочнее сосны, устойчив к влаге и хорошо подходит для премиальных интерьеров, влажных зон, фасадов, веранд, комнат отдыха и предбанников. Длина 6 м.",
  },
  "planken-listv": {
    description:
      "Планкен из лиственницы — фасадная доска для современной архитектурной отделки. При монтаже оставляют дренажный зазор 3-8 мм: фасад проветривается, влага не запирается, а линии выглядят аккуратно и ритмично. Для лиственницы доступны варианты длиной 3 или 4 м.",
  },
  "planken-sosna": {
    description:
      "Планкен из хвои — строганая фасадная доска из сосны и ели без шип-паза. Ее крепят с зазором 3-6 мм, поэтому фасад получает вентиляцию, выразительную тень и современный лаконичный рисунок. Длина доски — 6 м.",
  },
};

const DRY_PLANED_PINE_BOARD_VARIANTS = [
  { size: "20×90×6000", pricePerPiece: 320 },
  { size: "20×120×6000", pricePerPiece: 450 },
  { size: "20×140×6000", pricePerPiece: 530 },
  { size: "20×190×6000", pricePerPiece: 730 },
  { size: "40×100×6000", pricePerCube: 21000, pricePerPiece: 512, piecesPerCube: 41 },
  { size: "40×150×6000", pricePerCube: 21000, pricePerPiece: 778, piecesPerCube: 27 },
  { size: "40×200×6000", pricePerCube: 21000, pricePerPiece: 1050, piecesPerCube: 20 },
  { size: "50×150×6000", pricePerCube: 21000, pricePerPiece: 955, piecesPerCube: 22 },
  { size: "50×200×6000", pricePerCube: 21000, pricePerPiece: 1313, piecesPerCube: 16 },
  { size: "50×250×6000", pricePerCube: 24000, pricePerPiece: 1846, piecesPerCube: 13 },
  { size: "50×300×6000", pricePerCube: 24000, pricePerPiece: 2182, piecesPerCube: 11 },
];

async function main() {
  console.log("[data-migrate] Запуск миграций данных...");

  // 2026-06-13: PiloRus launch analytics and Direct base settings.
  await ensureSetting("yandex_metrika_id", "109821205");
  await ensureSetting("site_url", "https://pilo-rus.ru");
  await ensureSetting("public_site_url", "https://pilo-rus.ru");
  await ensureSetting("direct_public_url", "https://pilo-rus.ru");
  await ensureSetting("yandex_direct_public_url", "https://pilo-rus.ru");
  await ensureSetting("direct_region_ids", "1");
  await ensureSetting("yandex_direct_region_ids", "1");
  await ensureSetting("logo_url", "/logo.png");
  await ensureSetting("site_logo_url", "/logo.png");
  await ensureSetting("pwa_logo_url", "/logo.png");
  await ensureSetting("yandex_verification", "f585429020ab990b");
  await upsertTenantLaunchSettings({
    site_url: "https://pilo-rus.ru",
    public_site_url: "https://pilo-rus.ru",
    direct_public_url: "https://pilo-rus.ru",
    yandex_direct_public_url: "https://pilo-rus.ru",
    direct_region_ids: "1",
    yandex_direct_region_ids: "1",
    yandex_metrika_id: "109821205",
    logo_url: "/logo.png",
    site_logo_url: "/logo.png",
    pwa_logo_url: "/logo.png",
  });

  await ensureLaunchPromotion({
    title: "Скидки при большом объеме",
    description:
      "Чем больше объем заказа, тем выгоднее итоговая цена. Для крупных партий менеджер рассчитает персональное предложение с учетом размеров, сорта, наличия и доставки.",
  });
  await ensureLaunchPromotion({
    title: "Выгодные условия при самовывозе",
    description:
      "Если удобно забрать заказ со склада, поможем заранее подготовить позиции и согласуем условия отгрузки. Подходит для срочных заказов и постоянных клиентов.",
  });
  await ensureLaunchPromotion({
    title: "Комплектация под проект",
    description:
      "Подберем доску, брус, погонаж и листовые материалы под вашу задачу одним расчетом. Это помогает не переплачивать за лишний объем и не забыть важные позиции.",
  });
  await ensureLaunchPromotion({
    title: "Условия для повторных заказов",
    description:
      "Для клиентов, которые возвращаются за материалами, сохраняем историю заявок и быстрее готовим расчет. По повторным закупкам можно обсудить индивидуальные условия.",
  });
  await ensureLaunchPromotion({
    title: "Расчет спецификации под объект",
    description:
      "Пришлите список материалов, чертеж или размеры объекта — менеджер поможет собрать спецификацию, проверить объем и подготовить понятное предложение по пиломатериалам и доставке.",
  });

  // ── 2026-03-29: Изменения по запросу клиента ─────────────────────────────

  // 1. Режим работы 09:00-20:00
  const existingHours = await prisma.siteSettings.findUnique({ where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: "working_hours" } } });
  if (!existingHours || !existingHours.value.includes("20:00")) {
    await upsertSetting("working_hours", "Пн–Сб: 09:00–20:00, Вс: 09:00–18:00");
    console.log("[data-migrate] ✓ Режим работы обновлён");
  }

  // 2. Дополнительные телефоны (если нет)
  // 20.04.2026: phone2 (8-999-662-26-02) удалён по просьбе клиента.
  // Слот сохранён в БД и админке — клиент может заполнить новым номером.
  const phone3 = await prisma.siteSettings.findUnique({ where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: "phone3" } } });
  if (!phone3) {
    await upsertSetting("phone3", "");
    await upsertSetting("phone3_link", "");
    console.log("[data-migrate] ✓ phone3 initialized empty");
  }

  // 20.04.2026: одноразовая очистка старого phone2 (идемпотентно — проверяем точное значение)
  const currentPhone2 = await prisma.siteSettings.findUnique({ where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: "phone2" } } });
  if (currentPhone2 && currentPhone2.value === "8-999-662-26-02") {
    await upsertSetting("phone2", "");
    await upsertSetting("phone2_link", "");
    console.log("[data-migrate] ✓ phone2 (8-999-662-26-02) очищен по запросу клиента");
  }

  // 3. Категории — найти по slug
  const kedrCat = await prisma.category.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: "kedr" } } });
  const faneraCat = await prisma.category.findFirst({
    where: { tenantId: DEFAULT_TENANT_ID, slug: { in: ["fanera", "fanera-dsp-mdf-osb"] } }
  });
  const dspCat = await prisma.category.findFirst({
    where: { tenantId: DEFAULT_TENANT_ID, slug: { in: ["dsp-mdf-osb", "dsp-mdf-osb-csp", "dsp"] } }
  });
  const hasPilmosCatalogSnapshot = !!readPilmosCatalogSnapshot();

  // 4. Деактивировать товары Кедр + скрыть категорию
  if (!hasPilmosCatalogSnapshot && kedrCat) {
    const activeKedr = await prisma.product.count({ where: { categoryId: kedrCat.id, active: true } });
    if (activeKedr > 0) {
      await prisma.product.updateMany({ where: { categoryId: kedrCat.id }, data: { active: false } });
      console.log(`[data-migrate] ✓ Кедр: ${activeKedr} товаров деактивировано`);
    }
    if (kedrCat.sortOrder !== 999) {
      await prisma.category.update({ where: { id: kedrCat.id }, data: { sortOrder: 999 } });
      console.log("[data-migrate] ✓ Кедр категория скрыта (sortOrder=999)");
    }
  }

  // 5. Переместить ДСП товары в Фанеру + скрыть ДСП категорию
  if (!hasPilmosCatalogSnapshot && dspCat && faneraCat && dspCat.id !== faneraCat.id) {
    const dspProducts = await prisma.product.count({ where: { categoryId: dspCat.id } });
    if (dspProducts > 0) {
      await prisma.product.updateMany({ where: { categoryId: dspCat.id }, data: { categoryId: faneraCat.id } });
      console.log(`[data-migrate] ✓ ДСП: ${dspProducts} товаров перемещено в Фанеру`);
    }
    if (dspCat.sortOrder !== 999) {
      await prisma.category.update({ where: { id: dspCat.id }, data: { sortOrder: 999 } });
      console.log("[data-migrate] ✓ ДСП категория скрыта");
    }
  }

  // 6. Переименовать Фанеру
  if (!hasPilmosCatalogSnapshot && faneraCat && faneraCat.name === "Фанера") {
    await prisma.category.update({
      where: { id: faneraCat.id },
      data: { name: "Фанера, ДСП, МДФ, ОСБ" }
    });
    console.log("[data-migrate] ✓ Категория переименована в «Фанера, ДСП, МДФ, ОСБ»");
  }

  // 7. Восстановить изображения категорий если файл отсутствует на диске
  // Логика: если у категории нет фото или загруженный файл не найден — восстановить стабильный.
  // Если файл upload-* существует (пользователь заменил фото) — не трогать.
  const stableImages: Record<string, string> = {
    "sosna-el":    "/images/categories/sosna-el.webp",
    "listvennitsa":"/images/categories/listvennitsa.webp",
    "lipa-osina":  "/images/categories/lipa-osina.webp",
    "fanera":      "/images/categories/fanera.webp",
    "kedr":        "/images/categories/kedr.png",
  };
  for (const [slug, stablePath] of Object.entries(stableImages)) {
    const cat = await prisma.category.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug } } });
    if (!cat) continue;

    let needsRestore = false;
    if (!cat.image) {
      // Нет фото → восстановить
      needsRestore = true;
    } else if (cat.image.includes("upload-")) {
      // Есть upload-* URL — проверяем существует ли файл физически
      const filePath = resolvePublicFilePath(cat.image);
      if (!filePath || !existsSync(filePath)) {
        // Файл потерян (новый сервер или удалён) → восстановить
        needsRestore = true;
      }
      // Файл жив → пользователь сменил фото, не трогаем
    }

    if (needsRestore) {
      await prisma.category.update({ where: { id: cat.id }, data: { image: stablePath } });
      console.log(`[data-migrate] ✓ Восстановлено фото ${slug}: ${stablePath}`);
    }
  }

  // 8. Установить showInMenu/showInFooter для существующих категорий
  // Скрытые (sortOrder=999) → false, остальные → true (только если поле ещё не задано вручную)
  const allCats = await prisma.category.findMany({ select: { id: true, slug: true, sortOrder: true } });
  for (const cat of allCats) {
    const isHiddenByOrder = cat.sortOrder >= 999;
    // Старый объединенный slug оставляем как технический редирект, новые категории идут из Pilmos snapshot.
    const forceHide = ["dsp-mdf-osb-csp"].includes(cat.slug);
    if (isHiddenByOrder || forceHide) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { showInMenu: false, showInFooter: false },
      });
    }
  }
  console.log("[data-migrate] ✓ Флаги навигации категорий обновлены");

  // 8.1. Product photos: restore exact slug-based stable images for products that have no photos.
  // Conservative by design: manager-selected photos are never overwritten.
  const productsForImages = await prisma.product.findMany({
    select: { id: true, slug: true, images: true },
  });
  let restoredProductImages = 0;
  for (const product of productsForImages) {
    if (product.images.length > 0) continue;
    const stableImage = findStableProductImage(product.slug);
    if (!stableImage) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { images: [stableImage] },
    });
    restoredProductImages++;
  }
  if (restoredProductImages > 0) {
    console.log(`[data-migrate] restored product images by exact slug: ${restoredProductImages}`);
  }

  // 9. Редиректы категорий (для middleware — 301 перенаправления старых ссылок)
  await prisma.categoryRedirect.deleteMany({
    where: { fromSlug: { in: ["kedr", "dsp-mdf-osb"] } },
  });
  const knownRedirects = [
    { fromSlug: "dsp-mdf-osb-csp", toSlug: "dsp-mdf-osb", permanent: true },
  ];
  for (const r of knownRedirects) {
    await prisma.categoryRedirect.upsert({
      where:  { fromSlug: r.fromSlug },
      create: { fromSlug: r.fromSlug, toSlug: r.toSlug, permanent: r.permanent },
      update: { toSlug: r.toSlug, permanent: r.permanent },
    });
  }
  console.log("[data-migrate] ✓ Редиректы категорий установлены (шаг 9)");

  // ── 2026-04-19: Multi-tenancy подготовка (Stage 1) ───────────────────────
  // 10. Создаём дефолтный тенант "pilorus" (если нет)
  //     Все существующие данные получили tenantId="pilorus" через @default.
  try {
    const existingTenant = await (prisma as any).tenant?.findUnique?.({ where: { slug: "pilorus" } });
    if (existingTenant === null || existingTenant === undefined) {
      await (prisma as any).tenant?.create?.({
        data: {
          slug: "pilorus",
          name: "ПилоРус",
          domain: "pilo-rus.ru",
          plan: "enterprise",
          active: true,
        },
      });
      console.log("[data-migrate] ✓ Дефолтный тенант pilorus создан (шаг 10)");
    } else {
      console.log("[data-migrate] ✓ Дефолтный тенант pilorus уже существует (шаг 10)");
    }
  } catch (e: any) {
    // Если модель Tenant ещё не сгенерирована в prisma client — не фейлим билд
    console.log("[data-migrate] ⚠ Tenant seed пропущен:", e.message);
  }

  // ── Шаг 12: Тестовый тенант "stroymaterialy" (multi-tenancy day 1, 27.04.2026)
  // Используется для тестирования tenant-isolation. БЕЗ домена и логотипа —
  // настоящие данные клиент Стройматериалы получит при запуске (план 12-18 мая).
  // Создаём только tenant-запись; данные (товары/заказы) пока не сидируем —
  // изоляция проверяется на пустом tenant: с ENABLE_TENANT_FILTER=1 stroymaterialy
  // должен видеть пустоту, pilorus — все существующие данные.
  try {
    const existingStroy = await (prisma as any).tenant?.findUnique?.({
      where: { slug: "stroymaterialy" },
    });
    if (existingStroy === null || existingStroy === undefined) {
      await (prisma as any).tenant?.create?.({
        data: {
          slug: "stroymaterialy",
          name: "Стройматериалы (тест multi-tenancy)",
          plan: "free",
          active: true,
          settings: {
            note: "Тестовый tenant для проверки изоляции. Создан 27.04.2026 в день 1 multi-tenancy.",
          },
        },
      });
      console.log("[data-migrate] ✓ Тестовый тенант stroymaterialy создан (шаг 12)");
    } else {
      console.log("[data-migrate] ✓ Тестовый тенант stroymaterialy уже существует (шаг 12)");
    }
  } catch (e: any) {
    console.log("[data-migrate] ⚠ stroymaterialy seed пропущен:", e.message);
  }

  // ── Шаг 11: Деактивация промо «Бесплатная доставка» (запрос клиента Пилорус, 23.04.2026)
  try {
    const result = await prisma.promotion.updateMany({
      where: {
        active: true,
        OR: [
          { title: { contains: "Бесплатная доставка", mode: "insensitive" } },
          { title: { contains: "бесплатн", mode: "insensitive" } },
          { description: { contains: "доставка бесплатна", mode: "insensitive" } },
        ],
      },
      data: { active: false },
    });
    if (result.count > 0) {
      console.log(`[data-migrate] ✓ Деактивировано промо «Бесплатная доставка» (${result.count} записей) — шаг 11`);
    } else {
      console.log("[data-migrate] ✓ Промо «Бесплатная доставка» не найдено (уже удалено/деактивировано) — шаг 11");
    }
  } catch (e: any) {
    console.log("[data-migrate] ⚠ Деактивация промо пропущена:", e.message);
  }

  // ── 26.04.2026: Сид постоянных подписок на AI / инфраструктуру ────────────
  // Идемпотентно: проверяем существование по name, не дубль.
  try {
    const seedSubs: Array<{
      provider: string; name: string; costUsd?: number; costRub?: number;
      billingDay?: number; billingType: string; notes?: string;
    }> = [
      {
        provider: "anthropic", name: "Claude Max plan (личный инструмент Армана)",
        costUsd: 240, billingDay: 8, billingType: "monthly",
        notes: "20x usage Pro. Claude.ai чат + Claude Code + Cowork. Это НЕ расход на Арая (pilo-rus.ru), а личный инструмент для работы со мной. Visa-1724.",
      },
      {
        provider: "anthropic", name: "Anthropic API Credits (для Арая на сайте)",
        costUsd: undefined, billingType: "prepaid",
        notes: "Prepaid credits, без авто-списания. Auto reload OFF. Реальный расход на Арая (pilo-rus.ru) логируется автоматически по каждому вызову.",
      },
      {
        provider: "elevenlabs", name: "ElevenLabs Creator (TTS Арая)",
        costUsd: 22, billingDay: 10, billingType: "monthly",
        notes: "100,000 кредитов/мес. Multilingual v2. Workspace 'Одиннадцатый творческий'. Реальный расход тоже логируется.",
      },
      {
        provider: "google", name: "Google AI Plus 200GB",
        costUsd: 3.99, billingDay: 10, billingType: "monthly",
        notes: "Промо $3.99/мес до 10 июня 2026, далее $7.99/мес. Visa-1724.",
      },
    ];

    let createdSubs = 0;
    for (const sub of seedSubs) {
      const existing = await (prisma as any).apiSubscription.findFirst({ where: { name: sub.name } });
      if (!existing) {
        await (prisma as any).apiSubscription.create({
          data: { ...sub, active: true },
        });
        createdSubs++;
      }
    }
    if (createdSubs > 0) console.log(`[data-migrate] ✓ Постоянные подписки засеяны (${createdSubs} новых)`);
  } catch (e: any) {
    console.log("[data-migrate] ⚠ Сид подписок пропущен:", e.message);
  }

  // ── 2026-04-24 / 2026-05-12: правки ПилоРус из презентации менеджеров ────
  try {
    if (!ALLOW_LEGACY_CATALOG_MUTATIONS) {
      console.log(
        "[data-migrate] Legacy catalog/product corrections skipped: live manager edits are protected. Set PILORUS_ALLOW_LEGACY_CATALOG_MUTATIONS=1 to run intentionally.",
      );
    } else {
    let updatedCategories = 0;
    for (const [slug, data] of Object.entries(CATEGORY_SEO_20260424)) {
      const cat = await prisma.category.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug } } });
      if (!cat) continue;
      await prisma.category.update({
        where: { id: cat.id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
        },
      });
      updatedCategories++;
    }
    console.log(`[data-migrate] ✓ SEO категорий ПилоРус обновлено (${updatedCategories}) — шаг 2026-04-24`);

    const sosnaCat = await prisma.category.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: "sosna-el" } } });
    if (sosnaCat) {
      await prisma.product.upsert({
        where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: "doska-stroganaya-suhaya-sosna" } },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          slug: "doska-stroganaya-suhaya-sosna",
          name: PRODUCT_DESCRIPTIONS_20260424["doska-stroganaya-suhaya-sosna"].name || "Доска сухая строганная (Сосна/Ель)",
          description: PRODUCT_DESCRIPTIONS_20260424["doska-stroganaya-suhaya-sosna"].description,
          categoryId: sosnaCat.id,
          images: ["/images/products/doska-stroganaya-antisept-sosna.webp"],
          saleUnit: "BOTH",
          active: true,
          featured: true,
        },
        update: {
          name: PRODUCT_DESCRIPTIONS_20260424["doska-stroganaya-suhaya-sosna"].name,
          description: PRODUCT_DESCRIPTIONS_20260424["doska-stroganaya-suhaya-sosna"].description,
          saleUnit: "BOTH",
          active: true,
        },
      });

      const dryBoard = await prisma.product.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: "doska-stroganaya-suhaya-sosna" } } });
      const dryBeam = await prisma.product.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: "brus-strogannyy-suhoy-sosna" } } });
      if (dryBoard && dryBoard.images.length === 0) {
        await prisma.product.update({
          where: { id: dryBoard.id },
          data: { images: ["/images/products/doska-stroganaya-antisept-sosna.webp"] },
        });
        console.log("[data-migrate] ✓ Фото сухой строганной доски заполнено, потому что было пусто");
      }
      if (dryBoard && dryBeam) {
        const moved = await prisma.productVariant.updateMany({
          where: {
            productId: dryBeam.id,
            OR: [
              { size: { startsWith: "25×" } },
              { size: { startsWith: "40×" } },
              { size: { startsWith: "50×" } },
            ],
          },
          data: { productId: dryBoard.id },
        });
        if (moved.count > 0) {
          console.log(`[data-migrate] ✓ Сухая строганная доска вынесена из бруса (${moved.count} вариантов)`);
        }

        await prisma.productVariant.updateMany({
          where: {
            productId: dryBoard.id,
            OR: [
              { size: "50×100" },
              { size: "50×100×6000" },
              { size: { startsWith: "50×100 " } },
            ],
          },
          data: { inStock: false },
        });

        const dryBoardVariantCount = await prisma.productVariant.count({ where: { productId: dryBoard.id } });
        if (dryBoardVariantCount === 0) {
          await prisma.productVariant.createMany({
            data: DRY_PLANED_PINE_BOARD_VARIANTS.map((v, index) => ({
              productId: dryBoard.id,
              size: v.size,
              pricePerCube: "pricePerCube" in v ? v.pricePerCube : undefined,
              pricePerPiece: v.pricePerPiece,
              piecesPerCube: "piecesPerCube" in v ? v.piecesPerCube : undefined,
              inStock: true,
              sortOrder: index,
            })),
          });
          console.log("[data-migrate] ✓ Добавлены варианты сухой строганной доски (Сосна/Ель)");
        }
      }
    }

    let updatedProducts = 0;
    for (const [slug, data] of Object.entries(PRODUCT_DESCRIPTIONS_20260424)) {
      const product = await prisma.product.findUnique({ where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug } } });
      if (!product) continue;
      await prisma.product.update({
        where: { id: product.id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          description: data.description,
        },
      });
      updatedProducts++;
    }
    console.log(`[data-migrate] ✓ Описания товаров ПилоРус обновлены (${updatedProducts}) — шаг 2026-04-24`);

    const productsForSixMeterSizes = await prisma.product.findMany({
      where: {
        category: { slug: { in: Array.from(SIX_METER_CATEGORY_SLUGS) } },
      },
      select: {
        id: true,
        slug: true,
        description: true,
        variants: {
          select: { id: true, size: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    let normalizedSizes = 0;
    let normalizedDescriptions = 0;
    for (const product of productsForSixMeterSizes) {
      const forceSixMeter = SIX_METER_PRODUCT_SLUGS.has(product.slug);
      if (!forceSixMeter && !mentionsSixMeterLength(product.description)) continue;

      const usedSizes = new Set(product.variants.map((variant) => variant.size.trim()));
      for (const variant of product.variants) {
        const nextSize = normalizeSixMeterVariantSize(variant.size);
        if (!nextSize || usedSizes.has(nextSize)) continue;

        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { size: nextSize },
        });
        usedSizes.delete(variant.size.trim());
        usedSizes.add(nextSize);
        normalizedSizes++;
      }

      const nextDescription = forceSixMeter
        ? ensureSixMeterDescription(product.description)
        : normalizeSixMeterDescription(product.description);
      if (nextDescription && nextDescription !== product.description) {
        await prisma.product.update({
          where: { id: product.id },
          data: { description: nextDescription },
        });
        normalizedDescriptions++;
      }
    }
    console.log(
      `[data-migrate] ✓ Размеры 6 м нормализованы (${normalizedSizes} вариантов, ${normalizedDescriptions} описаний) — шаг 2026-05-13`,
    );
    }
  } catch (e: any) {
    console.log("[data-migrate] ⚠ Правки ПилоРус из презентации пропущены:", e.message);
  }

  try {
    const markerKey = "migration_20260512_whatsapp_hidden";
    const marker = await prisma.siteSettings.findUnique({ where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: markerKey } } });
    if (!marker) {
      await upsertSetting("whatsapp_enabled", "false");
      await upsertSetting(markerKey, "done");
      console.log("[data-migrate] WhatsApp order button disabled by default (2026-05-12)");
    }
  } catch (e: any) {
    console.log("[data-migrate] WhatsApp setting update skipped:", e.message);
  }

  try {
    const retiredDraftProducts = await prisma.product.updateMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        slug: { in: ["bad-krasivyy", "bad-krasivy", "bad-krasivyj"] },
        active: true,
      },
      data: {
        active: false,
        featured: false,
      },
    });
    if (retiredDraftProducts.count > 0) {
      console.log(`[data-migrate] Retired draft storefront products: ${retiredDraftProducts.count}`);
    }
  } catch (e: any) {
    console.log("[data-migrate] Draft storefront product cleanup skipped:", e.message);
  }

  try {
    await applyPilmosCatalogSnapshot();
  } catch (e: any) {
    console.log("[data-migrate] Pilmos catalog snapshot skipped:", e.message);
  }

  console.log("[data-migrate] Готово.");

  try {
    const pilorusLegalSettings20260611: Record<string, string> = {
      phone: "+7 (495) 135-20-26",
      phone_link: "+74951352026",
      phone2: "",
      phone2_link: "",
      phone3: "",
      phone3_link: "",
      social_whatsapp: "+74951352026",
      whatsapp_number: "+74951352026",
      aray_enabled: "true",
      public_site_name: "ПилоРус",
      brand_name: "ПилоРус",
      catalog_title: "Каталог пиломатериалов с ценами",
      catalog_description:
        "Каталог ПилоРус: доска, брус, вагонка, блок-хаус, фанера и листовые материалы с актуальными ценами, размерами и доставкой по Москве и Московской области.",
      address: "Химки, ул. Заводская 2А, стр.28",
      company_name: "ООО «ДЕРЕВОЛИДЕР»",
      legal_full_name: "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «ДЕРЕВОЛИДЕР»",
      inn: "7733291699",
      ogrn: "1167746624902",
      kpp: "773301001",
      settlement_account: "40702810040000036989",
      bank_name: "ПАО Сбербанк",
      correspondent_account: "30101810400000000225",
      bik: "044525225",
      okpo: "03368545",
      okato: "45283555000",
      oktmo: "45366000000",
      social_max: "https://max.ru/u/f9LHodD0cOKoOlL7NxRWbK5mRoS_CdJ9K0qX5LbbbFJXOW-acq-et78kUxo",
    };

    let createdSettings = 0;
    for (const [key, value] of Object.entries(pilorusLegalSettings20260611)) {
      if (await ensureSetting(key, value)) createdSettings++;
    }
    console.log(`[data-migrate] PiloRus contacts/legal defaults ensured (${createdSettings} created, existing manager edits kept)`);
  } catch (e: any) {
    console.log("[data-migrate] PiloRus contacts/legal settings update skipped:", e.message);
  }

  try {
    const imageReplacements = new Map<string, string>([
      ["/images/products/terrasnaya-doska-listv.png", "/images/products/terrasnaya-doska-listv.webp"],
      ["/images/products/mdf-list.png", "/images/products/mdf-list.webp"],
    ]);
    const categoriesUpdated = await prisma.category.updateMany({
      where: { image: "/images/categories/listvennitsa.png" },
      data: { image: "/images/categories/listvennitsa.webp" },
    });
    const productsWithOldImages = await prisma.product.findMany({
      where: {
        OR: [...imageReplacements.keys()].map((image) => ({ images: { has: image } })),
      },
      select: { id: true, images: true },
    });
    let productsUpdated = 0;
    for (const product of productsWithOldImages) {
      const images = product.images.map((image) => imageReplacements.get(image) || image);
      if (JSON.stringify(images) !== JSON.stringify(product.images)) {
        await prisma.product.update({ where: { id: product.id }, data: { images } });
        productsUpdated += 1;
      }
    }
    if (categoriesUpdated.count > 0 || productsUpdated > 0) {
      console.log(
        `[data-migrate] PiloRus WebP image references updated: categories=${categoriesUpdated.count}, products=${productsUpdated}`,
      );
    }
  } catch (e: any) {
    console.log("[data-migrate] PiloRus WebP image reference update skipped:", e.message);
  }

  try {
    const marketplaceSuppliers20260612 = [
      {
        slug: "pilorus",
        name: "ПилоРус",
        website: "https://pilo-rus.ru/",
        sourceUrl: "https://pilo-rus.ru/",
        logoUrl: "/logo.svg",
        city: "Химки",
        phone: "+7 (495) 135-20-26",
        publicDescription:
          "ПилоРус - продавец N1 и эталонная витрина биржи пиломатериалов. Основной каталог, проверенные цены, заявки и доставка идут через эту витрину.",
        specialization: "Пиломатериалы, фанера, стройматериалы и доставка по Москве и МО",
        deliverySummary: "Самовывоз и доставка по Москве и Московской области",
        status: "ACTIVE",
        trustLevel: "PRIORITY",
        storefrontEnabled: true,
        featuredSeller: true,
        marketplaceRank: 1,
      },
      {
        slug: "derevotrade",
        name: "ДеревоТрейд",
        legalName: "ДеревоТрейд",
        website: "https://derevotrade.ru/",
        sourceUrl: "https://derevotrade.ru/",
        city: "Химки",
        address: "г. Химки, Заводская улица, 2Б",
        phone: "+7 (495) 181-30-11",
        email: "info@derevo-trade.ru",
        publicDescription:
          "ДеревоТрейд - кандидат на подключение к бирже ПилоРус. На сайте заявлены пиломатериалы, фанера, лиственница, сосна/ель, склад в Химках и доставка по Москве и МО.",
        specialization: "Лиственница, сосна, ель, кедр, фанера, OSB, ДСП, ДВП, МДФ",
        deliverySummary: "Склад в Химках, доставка по Москве и МО; условия проверяются через scan/preview",
        notes: "Источник скана: https://derevotrade.ru/. Найдены контакты, каталог, преимущества, категории и маркетинговые блоки. Отзывы нужно переносить только как source-preview, не публиковать без проверки.",
        status: "DRAFT",
        trustLevel: "NEW",
        storefrontEnabled: false,
        featuredSeller: false,
        marketplaceRank: 20,
      },
      {
        slug: "pilmos",
        name: "Pilmos",
        legalName: "ИП Аракелян Гарик Гегамович",
        website: "https://pilmos.ru/",
        sourceUrl: "https://pilmos.ru/",
        city: "Химки",
        address: "г. Химки, ул. Заводская 2А, стр.13",
        phone: "+7 (495) 152-72-75",
        email: "info@pilmos.ru",
        publicDescription:
          "Pilmos - кандидат на подключение к бирже ПилоРус. На сайте указаны производство и реализация пиломатериалов с доставкой по Москве и Московской области.",
        specialization: "Пиломатериалы, фанера, OSB, обработка, покраска и услуги",
        deliverySummary: "Ежедневно 09:00-20:00, доставка по Москве и МО; условия проверяются через scan/preview",
        notes: "Источник скана: https://pilmos.ru/kontakty/. Найдены контакты, реквизиты, каталог и блок отзывов. Отзывы импортировать только как непубличный source-preview.",
        status: "DRAFT",
        trustLevel: "NEW",
        storefrontEnabled: false,
        featuredSeller: false,
        marketplaceRank: 30,
      },
      {
        slug: "derevo-lider",
        name: "ДеревоЛидер",
        legalName: "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «ДЕРЕВОЛИДЕР»",
        website: "https://derevo-lider.ru/",
        sourceUrl: "https://derevo-lider.ru/",
        city: "Москва",
        address: "Москва, Рублевское шоссе, дом 151, корп.2, стр.4",
        phone: "+7 (495) 104-21-44",
        email: "info@derevo-lider.ru",
        publicDescription:
          "ДеревоЛидер - кандидат на подключение к бирже ПилоРус. На сайте указана продажа фанеры и пиломатериалов для строительных организаций и частных клиентов в Москве и МО.",
        specialization: "Фанера, пиломатериалы, сосна и лиственница",
        deliverySummary: "Пн-пт 9:00-18:30, сб-вс 9:00-17:00; доставка и оплата проверяются через scan/preview",
        notes: "Источники скана: https://derevo-lider.ru/o-kompanii/, https://derevo-lider.ru/otzyvy/. Найдены контакты, реквизиты, каталог и отзывы. Публикация отзывов только после проверки прав и источника.",
        status: "DRAFT",
        trustLevel: "NEW",
        storefrontEnabled: false,
        featuredSeller: false,
        marketplaceRank: 40,
      },
      {
        slug: "faneragroup",
        name: "ФанераГрупп",
        legalName: "ООО «ФанераГрупп»",
        website: "https://faneragroup.ru/",
        sourceUrl: "https://faneragroup.ru/",
        city: "Москва",
        address: "г. Москва, Рублевское шоссе, дом 151, корпус 2",
        phone: "+7 (495) 125-23-44",
        email: "faneragroup@gmail.com",
        publicDescription:
          "ФанераГрупп - кандидат на подключение к бирже ПилоРус. На сайте указаны фанера, пиломатериалы, склад в Москве, ежедневный график и оформление заявок по телефону или почте.",
        specialization: "Фанера, пиломатериалы, обрезная доска и листовые материалы",
        deliverySummary: "Ежедневный график, доставка и оплата по согласованию с менеджером; условия проверяются через scan/preview",
        notes: "Источники скана: https://faneragroup.ru/kontakti/, https://faneragroup.ru/otzyivyi/. Найдены контакты, склад, реквизиты и отзывы. Отзывы не публиковать без проверки.",
        status: "DRAFT",
        trustLevel: "NEW",
        storefrontEnabled: false,
        featuredSeller: false,
        marketplaceRank: 50,
      },
    ];

    for (const supplier of marketplaceSuppliers20260612) {
      await (prisma as any).supplier.upsert({
        where: { tenantId_slug: { tenantId: DEFAULT_TENANT_ID, slug: supplier.slug } },
        create: { tenantId: DEFAULT_TENANT_ID, active: true, ...supplier },
        update: supplier,
      });
    }
    console.log(`[data-migrate] PiloRus marketplace sellers seeded (${marketplaceSuppliers20260612.length})`);
  } catch (e: any) {
    console.log("[data-migrate] PiloRus marketplace sellers seed skipped:", e.message);
  }

  try {
    const sellerPricePolicy20260612: Record<string, { factor: number; leadTimeDays: number; deliveryText: string }> = {
      pilorus: { factor: 1, leadTimeDays: 1, deliveryText: "Самовывоз и доставка по Москве и Московской области" },
    };

    const sellers = await prisma.supplier.findMany({
      where: { tenantId: DEFAULT_TENANT_ID, slug: { in: Object.keys(sellerPricePolicy20260612) } },
      select: { id: true, slug: true, city: true },
    });
    const sellerBySlug = new Map(sellers.map((seller) => [seller.slug, seller]));
    const variants = await prisma.productVariant.findMany({
      where: {
        product: {
          tenantId: DEFAULT_TENANT_ID,
          active: true,
        },
        inStock: true,
        OR: [
          { pricePerCube: { not: null, gt: 0 } },
          { pricePerPiece: { not: null, gt: 0 } },
          { pricePerSquareMeter: { not: null, gt: 0 } },
        ],
      },
      select: {
        id: true,
        pricePerCube: true,
        pricePerPiece: true,
        pricePerSquareMeter: true,
        stockQty: true,
      },
    });

    const normalizePrice = (value: unknown, factor: number) => {
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) return null;
      return Math.max(1, Math.round(num * factor));
    };

    const pilorusSeller = sellerBySlug.get("pilorus");
    if (pilorusSeller) {
      for (const variant of variants) {
        await prisma.supplierOffer.upsert({
          where: {
            tenantId_supplierId_variantId: {
              tenantId: DEFAULT_TENANT_ID,
              supplierId: pilorusSeller.id,
              variantId: variant.id,
            },
          },
          create: {
            tenantId: DEFAULT_TENANT_ID,
            supplierId: pilorusSeller.id,
            variantId: variant.id,
            pricePerCube: normalizePrice(variant.pricePerCube, 1),
            pricePerPiece: normalizePrice(variant.pricePerPiece, 1),
            pricePerSquareMeter: normalizePrice(variant.pricePerSquareMeter, 1),
            stockQty: variant.stockQty,
            leadTimeDays: 1,
            city: pilorusSeller.city,
            deliveryText: sellerPricePolicy20260612.pilorus.deliveryText,
            notes: "ПилоРус seller N1: предложение создано из текущего каталога без дубля товара.",
            preferred: true,
            active: true,
            lastSeenAt: new Date(),
          },
          update: {
            pricePerCube: normalizePrice(variant.pricePerCube, 1),
            pricePerPiece: normalizePrice(variant.pricePerPiece, 1),
            pricePerSquareMeter: normalizePrice(variant.pricePerSquareMeter, 1),
            stockQty: variant.stockQty,
            leadTimeDays: 1,
            city: pilorusSeller.city,
            deliveryText: sellerPricePolicy20260612.pilorus.deliveryText,
            notes: "ПилоРус seller N1: предложение синхронизировано с текущим каталогом.",
            preferred: true,
            active: true,
            lastSeenAt: new Date(),
          },
        });
      }
    }

    const removedExtraOffers = pilorusSeller
      ? await prisma.supplierOffer.deleteMany({
          where: { tenantId: DEFAULT_TENANT_ID, supplierId: { not: pilorusSeller.id } },
        })
      : { count: 0 };
    const removedStaleOffers = await prisma.$executeRaw`
      DELETE FROM "SupplierOffer" offer
      WHERE offer."tenantId" = ${DEFAULT_TENANT_ID}
        AND NOT EXISTS (
          SELECT 1
          FROM "ProductVariant" variant
          JOIN "Product" product ON product.id = variant."productId"
          WHERE variant.id = offer."variantId"
            AND product."tenantId" = ${DEFAULT_TENANT_ID}
            AND product.active = true
            AND variant."inStock" = true
        )
    `;
    console.log(
      `[data-migrate] PiloRus offers synced: ${variants.length} variants, ${removedExtraOffers.count} external offers removed, ${removedStaleOffers} stale offers removed`,
    );
  } catch (e: any) {
    console.log("[data-migrate] PiloRus marketplace offers seed skipped:", e.message);
  }

  try {
    const reviewDrafts20260612 = [
      {
        externalId: "marketing-draft-repeat-client",
        name: "Черновик: повторный клиент",
        text:
          "[Черновик для реального отзыва] Повторный заказ оформили быстро, менеджер видел историю и помог не забыть важные позиции.",
      },
      {
        externalId: "marketing-draft-builder",
        name: "Черновик: прораб",
        text:
          "[Черновик для реального отзыва] Удобно, что можно быстро сравнить размеры, цену и наличие, а потом согласовать доставку без долгой переписки.",
      },
      {
        externalId: "marketing-draft-furniture",
        name: "Черновик: мастерская",
        text:
          "[Черновик для реального отзыва] Нужны были понятные позиции по фанере и доске, помогли подобрать вариант под задачу и срок отгрузки.",
      },
    ];

    let createdDraftReviews = 0;
    for (const draft of reviewDrafts20260612) {
      const existing = await prisma.review.findFirst({
        where: { tenantId: DEFAULT_TENANT_ID, source: "marketing-draft", externalId: draft.externalId },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.review.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          externalId: draft.externalId,
          source: "marketing-draft",
          name: draft.name,
          rating: 5,
          text: draft.text,
          approved: false,
        },
      });
      createdDraftReviews++;
    }
    console.log(`[data-migrate] Marketing review drafts created (${createdDraftReviews})`);
  } catch (e: any) {
    console.log("[data-migrate] Marketing review drafts seed skipped:", e.message);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[data-migrate] ОШИБКА:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
