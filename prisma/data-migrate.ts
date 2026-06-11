/**
 * data-migrate.ts — Идемпотентные миграции данных для продакшна.
 * Запускается при каждом деплое (часть build скрипта).
 * Все операции проверяют текущее состояние перед изменением — безопасно запускать многократно.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = "pilorus";

async function upsertSetting(key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key } },
    create: { tenantId: DEFAULT_TENANT_ID, key, value },
    update: { value },
  });
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
    name: "Фанера и листовые материалы",
    seoTitle: "Фанера и листовые материалы — купить в Химках",
    seoDescription:
      "Фанера ФК, ФСФ, ламинированная фанера и листовые материалы со склада ПилоРус. Цены за лист, доставка по Москве и области.",
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

  // 4. Деактивировать товары Кедр + скрыть категорию
  if (kedrCat) {
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
  if (dspCat && faneraCat && dspCat.id !== faneraCat.id) {
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
  if (faneraCat && faneraCat.name === "Фанера") {
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
    "listvennitsa":"/images/categories/listvennitsa.png",
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
    // Принудительно скрываем kedr и dsp из навигации
    const forceHide = ["kedr", "dsp-mdf-osb", "dsp-mdf-osb-csp"].includes(cat.slug);
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
  const knownRedirects = [
    { fromSlug: "kedr",        toSlug: null,     permanent: true },  // /catalog?category=kedr → /catalog
    { fromSlug: "dsp-mdf-osb", toSlug: "fanera", permanent: true },  // → /catalog?category=fanera
    { fromSlug: "dsp-mdf-osb-csp", toSlug: "fanera", permanent: true },
  ];
  for (const r of knownRedirects) {
    await prisma.categoryRedirect.upsert({
      where:  { fromSlug: r.fromSlug },
      create: { fromSlug: r.fromSlug, toSlug: r.toSlug, permanent: r.permanent },
      update: {},
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

  console.log("[data-migrate] Готово.");
  try {
    const pilorusLegalSettings20260611: Record<string, string> = {
      phone: "+7 (499) 372-04-41",
      phone_link: "+74993720441",
      phone2: "+7 (495) 135-02-03",
      phone2_link: "+74951350203",
      phone3: "",
      phone3_link: "",
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

    for (const [key, value] of Object.entries(pilorusLegalSettings20260611)) {
      await upsertSetting(key, value);
    }
    console.log("[data-migrate] PiloRus contacts and legal requisites updated (2026-06-11)");
  } catch (e: any) {
    console.log("[data-migrate] PiloRus contacts/legal settings update skipped:", e.message);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[data-migrate] ОШИБКА:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
