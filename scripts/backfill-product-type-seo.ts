import { PrismaClient } from "@prisma/client";
import { extractProductType, getDefaultProductTypes, type ProductTypeInfo } from "../lib/product-types";

const SETTINGS_KEY = "product_type_settings";

const prisma = new PrismaClient();

type TypeSetting = Partial<ProductTypeInfo>;
type TypeSettings = Record<string, TypeSetting>;

function readSettings(value?: string | null): TypeSettings {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hasText(value: unknown, minLength: number, maxLength = Number.POSITIVE_INFINITY) {
  return typeof value === "string" && value.trim().length >= minLength && value.trim().length <= maxLength;
}

function trimText(value?: string | null) {
  const text = value?.trim();
  return text || null;
}

async function main() {
  const [settingsRow, products] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: SETTINGS_KEY } }),
    prisma.product.findMany({ select: { name: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const product of products) {
    const type = extractProductType(product.name);
    if (!type) continue;
    counts.set(type.keyword, (counts.get(type.keyword) ?? 0) + 1);
  }

  const currentSettings = readSettings(settingsRow?.value);
  const nextSettings: TypeSettings = {};
  let changed = 0;
  let activated = 0;
  let seoFilled = 0;

  getDefaultProductTypes().forEach((type, sortOrder) => {
    const current = currentSettings[type.keyword] ?? {};
    const productCount = counts.get(type.keyword) ?? 0;
    const next: TypeSetting = {
      ...current,
      label: trimText(current.label) ?? type.label,
      sortOrder: typeof current.sortOrder === "number" ? current.sortOrder : sortOrder,
      active: productCount > 0 ? true : current.active ?? type.active ?? true,
    };

    if (current.active === false && productCount > 0) activated += 1;

    if (!hasText(current.description, 160) && type.description) {
      next.description = type.description;
      seoFilled += 1;
    } else {
      next.description = trimText(current.description) ?? type.description ?? null;
    }

    if (!hasText(current.seoTitle, 30, 120) && type.seoTitle) {
      next.seoTitle = type.seoTitle;
      seoFilled += 1;
    } else {
      next.seoTitle = trimText(current.seoTitle) ?? type.seoTitle ?? null;
    }

    if (!hasText(current.seoDescription, 70, 220) && type.seoDescription) {
      next.seoDescription = type.seoDescription;
      seoFilled += 1;
    } else {
      next.seoDescription = trimText(current.seoDescription) ?? type.seoDescription ?? null;
    }

    nextSettings[type.keyword] = next;

    if (JSON.stringify(current) !== JSON.stringify(next)) {
      changed += 1;
    }
  });

  await prisma.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: {
      id: SETTINGS_KEY,
      key: SETTINGS_KEY,
      value: JSON.stringify(nextSettings),
    },
    update: {
      value: JSON.stringify(nextSettings),
    },
  });

  console.log(
    JSON.stringify(
      {
        products: products.length,
        changedTypes: changed,
        activatedTypes: activated,
        seoFieldsFilled: seoFilled,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
