import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  isStoreConstructorBusinessType,
  type StoreConstructorBusinessType,
} from "@/lib/store-constructor-blueprints";

const DEFAULT_SOURCE_TENANT_ID = "pilorus";
const DRAFT_DOMAIN_SUFFIX = "aray-cms.local";

type CloneTenantSettings = Record<string, unknown>;

export type ArayMultisiteCloneInput = {
  siteName: string;
  domain?: string;
  targetSlug?: string;
  sourceTenantId?: string;
  businessType?: string;
  city?: string;
  brief?: string;
  seedCatalog?: {
    categories?: string[];
    products?: string[];
    images?: string[];
  };
  contactName?: string;
  phone?: string;
  email?: string;
  userId: string;
};

export type ArayMultisiteCloneReport = {
  sourceTenantId: string;
  targetTenantId: string;
  counts: Record<string, number>;
  warnings: string[];
  adminHref: string;
  previewHref: string;
};

export type ArayMultisiteCloneResult = {
  site: {
    id: string;
    tenantId: string;
    slug: string;
    name: string;
    status: "draft" | "published";
    domain: string;
    requestedDomain: string;
    adminHref: string;
    previewHref: string;
  };
  report: ArayMultisiteCloneReport;
};

type CloneTx = Prisma.TransactionClient;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function cleanString(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanDomain(value: unknown) {
  const domain = cleanString(value, 240)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  if (!domain) return "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain) ? domain : "";
}

function inferBusinessType(input: {
  businessType?: string;
  brief?: string;
  siteName?: string;
}): StoreConstructorBusinessType {
  const direct = cleanString(input.businessType, 80);
  if (isStoreConstructorBusinessType(direct)) return direct;

  const text = `${input.brief || ""} ${input.siteName || ""}`.toLowerCase();
  if (/(пиломат|лес|доск|брус|lumber|wood|timber)/i.test(text)) return "lumber";
  if (/(строй|строит|материал|ремонт|construction|building)/i.test(text)) return "construction";
  if (/(ресторан|кафе|еда|доставка еды|restaurant|food)/i.test(text)) return "restaurant";
  if (/(салон|красот|beauty|spa)/i.test(text)) return "beauty";
  if (/(услуг|сервис|маркетинг|сайт|crm|pwa|service|agency)/i.test(text)) return "services";
  if (/(магазин|товар|retail|продаж|shop)/i.test(text)) return "retail";
  return "universal";
}

function businessTypeLabel(businessType: StoreConstructorBusinessType) {
  switch (businessType) {
    case "lumber":
      return "пиломатериалов";
    case "construction":
      return "строительных материалов";
    case "restaurant":
      return "еды и доставки";
    case "beauty":
      return "услуг красоты";
    case "services":
      return "услуг";
    case "retail":
      return "товаров";
    default:
      return "товаров и услуг";
  }
}

function defaultPaletteForBusiness(businessType: StoreConstructorBusinessType) {
  switch (businessType) {
    case "lumber":
      return "forest";
    case "construction":
      return "slate";
    case "restaurant":
      return "crimson";
    case "beauty":
      return "ocean";
    case "services":
      return "midnight";
    case "retail":
      return "sber";
    default:
      return "sber";
  }
}

function firstBriefLine(brief: string) {
  return cleanString(brief.split(/\n+/).find((line) => line.trim()) || "", 220);
}

function buildTargetSiteSettingOverrides(input: {
  siteName: string;
  requestedDomain: string;
  draftDomain: string;
  businessType: StoreConstructorBusinessType;
  city?: string;
  brief: string;
}) {
  const city = cleanString(input.city, 80) || "регион уточняется";
  const typeLabel = businessTypeLabel(input.businessType);
  const briefLine = firstBriefLine(input.brief);
  const domain = input.requestedDomain || input.draftDomain;
  const catalogDescription = briefLine ||
    `Каталог ${typeLabel}: товары, заявки, CRM, PWA и админка ARAY CMS собираются под клиента.`;

  return {
    company_name: input.siteName,
    public_site_name: input.siteName,
    brand_name: input.siteName,
    business_type: input.businessType,
    terminal_profile: input.businessType,
    company_city: city,
    delivery_region: city === "регион уточняется" ? "регион клиента" : city,
    address: city,
    email: "",
    phone: "",
    phone_link: "",
    phone2: "",
    phone2_link: "",
    phone3: "",
    phone3_link: "",
    social_whatsapp: "",
    whatsapp_number: "",
    telegram_username: "",
    min_order: "уточняется",
    catalog_title: `Каталог ${typeLabel}`,
    catalog_description: catalogDescription,
    catalog_listing_title: input.businessType === "services" ? "Услуги для запуска" : "Товары для запуска",
    catalog_help_text: "Менеджер поможет уточнить товары, услуги, цену и доставку.",
    seo_title: `${input.siteName} — сайт на ARAY CMS`,
    seo_description: catalogDescription,
    contacts_description: "Контакты, график, адрес и каналы заявок уточняются перед запуском.",
    about_text: `${input.siteName} готовится к запуску в ARAY CMS. Сайт, заявки, CRM, PWA и админка будут настроены под бизнес клиента.`,
    delivery_text: "Доставка, оплата и условия работы уточняются в брифе перед публикацией.",
    footer_copyright: `© ${new Date().getFullYear()} ${input.siteName}. Сайт на ARAY CMS.`,
    default_palette: defaultPaletteForBusiness(input.businessType),
    aray_enabled: "true",
    aray_site_status: "checking",
    aray_site_domain: domain,
  };
}

async function upsertTargetSiteSettings(
  tx: CloneTx,
  targetTenantId: string,
  settings: Record<string, string>,
) {
  for (const [key, value] of Object.entries(settings)) {
    await tx.siteSettings.upsert({
      where: { tenantId_key: { tenantId: targetTenantId, key } },
      create: { tenantId: targetTenantId, key, value },
      update: { value },
    });
  }
}

function buildBaseSlug(input: ArayMultisiteCloneInput) {
  const fromExplicit = cleanString(input.targetSlug, 80);
  const fromDomain = cleanDomain(input.domain).replace(/\..*$/, "");
  const fromName = cleanString(input.siteName, 160);
  const base = slugify(fromExplicit || fromDomain || fromName || "aray-site").slice(0, 36);
  return /^[a-z0-9-]{2,40}$/.test(base) ? base : `aray-site-${Date.now().toString(36)}`;
}

function namespacedSlug(sourceSlug: string, targetSlug: string) {
  const clean = slugify(sourceSlug || "page").slice(0, 80) || "page";
  return `${clean}-${targetSlug}`.slice(0, 120).replace(/-+$/g, "");
}

function uniqueCleanList(items: unknown[] | undefined, limit: number, maxLength = 120) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items || []) {
    const clean = cleanString(item, maxLength);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= limit) break;
  }
  return result;
}

function defaultCategoriesForBusiness(businessType: StoreConstructorBusinessType) {
  switch (businessType) {
    case "construction":
      return ["Сухие смеси", "Кирпич и блоки", "Кровля", "Инструменты"];
    case "restaurant":
      return ["Меню", "Доставка", "Акции", "Популярное"];
    case "beauty":
      return ["Услуги", "Уход", "Комплексы", "Подарочные карты"];
    case "services":
      return ["Услуги", "Пакеты", "Проекты", "Консультации"];
    case "retail":
      return ["Популярные товары", "Новинки", "Акции", "Каталог"];
    case "lumber":
      return ["Доска", "Брус", "Фанера", "Отделка"];
    default:
      return ["Товары", "Услуги", "Акции", "Популярное"];
  }
}

function defaultProductNamesForBusiness(businessType: StoreConstructorBusinessType) {
  switch (businessType) {
    case "construction":
      return ["Материалы для объекта", "Комплект для ремонта", "Доставка на объект", "Расчет сметы"];
    case "restaurant":
      return ["Популярное блюдо", "Комбо для доставки", "Сет недели", "Предзаказ"];
    case "beauty":
      return ["Консультация", "Комплекс услуг", "Уходовая программа", "Запись на услугу"];
    case "services":
      return ["Стартовый пакет", "Проект под ключ", "Консультация", "Сопровождение"];
    case "retail":
      return ["Популярный товар", "Товар недели", "Комплект", "Позиция под заказ"];
    case "lumber":
      return ["Доска для запуска", "Брус для запуска", "Фанера для запуска", "Отделочный материал"];
    default:
      return ["Позиция для запуска", "Комплект для клиента", "Услуга под заказ", "Популярное предложение"];
  }
}

function normalizeSeedCatalog(input: ArayMultisiteCloneInput, businessType: StoreConstructorBusinessType) {
  const categories = uniqueCleanList(input.seedCatalog?.categories, 8);
  const products = uniqueCleanList(input.seedCatalog?.products, 18);
  const images = uniqueCleanList(input.seedCatalog?.images, 18, 500).filter((src) => (
    /^https?:\/\//i.test(src) || src.startsWith("/")
  ));

  if (categories.length === 0 && products.length === 0) return null;

  return {
    categories: categories.length ? categories : defaultCategoriesForBusiness(businessType),
    products: products.length ? products : defaultProductNamesForBusiness(businessType),
    images,
  };
}

function fallbackSeedImage(businessType: StoreConstructorBusinessType, index: number) {
  const production = `/images/production/prod-${(index % 12) + 1}.jpg`;
  if (businessType === "beauty") return "/images/admin-atmosphere/admin-nature-02-calm-beach.webp";
  if (businessType === "restaurant") return "/images/admin-atmosphere/admin-nature-06-sunset-water.webp";
  if (businessType === "services") return "/images/admin-atmosphere/admin-nature-03-alpine-lake.webp";
  return production;
}

function buildPreviewHref(input: {
  name: string;
  targetSlug: string;
  domain: string;
  businessType: StoreConstructorBusinessType;
  sourceTenantId: string;
}) {
  const params = new URLSearchParams({ tenantPreview: input.targetSlug });
  return `/catalog?${params.toString()}`;
}

async function resolveTargetSlug(input: ArayMultisiteCloneInput, sourceTenantId: string) {
  const base = buildBaseSlug(input);

  if (base === sourceTenantId || base === DEFAULT_SOURCE_TENANT_ID) {
    return `${base}-clone-${Date.now().toString(36)}`.slice(0, 40);
  }

  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0
      ? base
      : `${base}-${index + 1}`.slice(0, 40).replace(/-+$/g, "");
    const existing = await prisma.tenant.findUnique({
      where: { slug: candidate },
      select: { slug: true, active: true, settings: true },
    });

    if (!existing) return candidate;

    const clone = asRecord(asRecord(existing.settings).arayMultisiteClone);
    if (
      existing.active === false &&
      clone.sourceTenantId === sourceTenantId &&
      (clone.cloneMode === "aray-cms-full-contour-draft" || clone.cloneMode === "pilorus-full-contour-draft")
    ) {
      return candidate;
    }
  }

  return `${base.slice(0, 28)}-${Date.now().toString(36)}`.slice(0, 40).replace(/-+$/g, "");
}

async function clearTargetTenantData(tx: CloneTx, targetTenantId: string) {
  const targetProducts = await tx.product.findMany({
    where: { tenantId: targetTenantId },
    select: { id: true },
  });
  const targetProductIds = targetProducts.map((product) => product.id);

  if (targetProductIds.length) {
    const targetVariants = await tx.productVariant.findMany({
      where: { productId: { in: targetProductIds } },
      select: { id: true },
    });
    const targetVariantIds = targetVariants.map((variant) => variant.id);
    if (targetVariantIds.length) {
      await tx.costPrice.deleteMany({ where: { variantId: { in: targetVariantIds } } });
    }
    await tx.productVariant.deleteMany({ where: { productId: { in: targetProductIds } } });
  }

  const targetWorkflows = await tx.workflow.findMany({
    where: { tenantId: targetTenantId },
    select: { id: true },
  });
  const targetWorkflowIds = targetWorkflows.map((workflow) => workflow.id);
  if (targetWorkflowIds.length) {
    await tx.workflowLog.deleteMany({ where: { workflowId: { in: targetWorkflowIds } } });
  }

  const targetStories = await tx.storeStory.findMany({
    where: { tenantId: targetTenantId },
    select: { id: true },
  });
  const targetStoryIds = targetStories.map((story) => story.id);
  if (targetStoryIds.length) {
    await tx.storeStoryRelation.deleteMany({ where: { storyId: { in: targetStoryIds } } });
  }

  await tx.product.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.category.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.promotion.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.deliveryRate.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.siteSettings.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.service.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.post.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.storeStory.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.notificationAudiencePreference.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.businessRoleMember.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.businessRole.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.notificationRolePreference.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.notificationRoleSchedule.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.arayModuleState.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.terminalConnector.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.workflow.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.documentTemplate.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.reportSchedule.deleteMany({ where: { tenantId: targetTenantId } });
  await tx.crmHint.deleteMany({ where: { tenantId: targetTenantId } });
}

async function cloneCatalog(tx: CloneTx, sourceTenantId: string, targetTenantId: string) {
  const categoryMap = new Map<string, string>();
  const productMap = new Map<string, string>();
  const productSlugMap = new Map<string, string>();

  const categories = await tx.category.findMany({
    where: { tenantId: sourceTenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  for (const category of categories) {
    const created = await tx.category.create({
      data: {
        tenantId: targetTenantId,
        name: category.name,
        slug: category.slug,
        image: category.image,
        sortOrder: category.sortOrder,
        parentId: null,
        seoDescription: category.seoDescription,
        seoTitle: category.seoTitle,
        showInFooter: category.showInFooter,
        showInMenu: category.showInMenu,
      },
      select: { id: true },
    });
    categoryMap.set(category.id, created.id);
  }

  for (const category of categories) {
    if (!category.parentId) continue;
    const parentId = categoryMap.get(category.parentId);
    const id = categoryMap.get(category.id);
    if (!parentId || !id) continue;
    await tx.category.update({ where: { id }, data: { parentId } });
  }

  const fallbackCategoryId = categoryMap.values().next().value as string | undefined;
  const products = await tx.product.findMany({
    where: { tenantId: sourceTenantId },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    include: {
      variants: {
        orderBy: [{ sortOrder: "asc" }, { size: "asc" }],
        include: { costPrice: true },
      },
    },
  });

  for (const product of products) {
    const categoryId = categoryMap.get(product.categoryId) || fallbackCategoryId;
    if (!categoryId) continue;

    const created = await tx.product.create({
      data: {
        tenantId: targetTenantId,
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        categoryId,
        images: product.images,
        cardTags: product.cardTags,
        saleUnit: product.saleUnit,
        active: product.active,
        featured: product.featured,
        variants: {
          create: product.variants.map((variant) => ({
            size: variant.size,
            pricePerCube: variant.pricePerCube,
            pricePerPiece: variant.pricePerPiece,
            piecesPerCube: variant.piecesPerCube,
            inStock: variant.inStock,
            stockQty: variant.stockQty,
            lowStockThreshold: variant.lowStockThreshold,
            sortOrder: variant.sortOrder,
            costPrice: variant.costPrice
              ? {
                  create: {
                    costPerCube: variant.costPrice.costPerCube,
                    costPerPiece: variant.costPrice.costPerPiece,
                  },
                }
              : undefined,
          })),
        },
      },
      select: { id: true, slug: true },
    });
    productMap.set(product.id, created.id);
    productSlugMap.set(product.slug, created.slug);
  }

  return {
    categories: categories.length,
    products: products.length,
    productMap,
    productSlugMap,
  };
}

async function createSeedCatalog(
  tx: CloneTx,
  targetTenantId: string,
  seed: {
    categories: string[];
    products: string[];
    images: string[];
  },
  businessType: StoreConstructorBusinessType,
) {
  const categoryMap = new Map<string, string>();
  const productMap = new Map<string, string>();
  const productSlugMap = new Map<string, string>();

  const createdCategories: Array<{ id: string; name: string }> = [];
  for (const [index, name] of seed.categories.entries()) {
    const slug = `${slugify(name || "category").slice(0, 70) || "category"}-${index + 1}`.slice(0, 90);
    const created = await tx.category.create({
      data: {
        tenantId: targetTenantId,
        name,
        slug,
        image: seed.images[index % Math.max(seed.images.length, 1)] || fallbackSeedImage(businessType, index),
        sortOrder: index,
        seoTitle: name,
        seoDescription: `${name}: раздел создан ARAY CMS для проверки структуры сайта. Прайс и финальные тексты подключаются перед запуском.`,
        showInFooter: true,
        showInMenu: true,
      },
      select: { id: true, name: true, slug: true },
    });
    categoryMap.set(name, created.id);
    createdCategories.push(created);
  }

  for (const [index, name] of seed.products.entries()) {
    const category = createdCategories[index % createdCategories.length];
    const slug = `${slugify(name || "product").slice(0, 70) || "product"}-${index + 1}`.slice(0, 90);
    const image = seed.images[index % Math.max(seed.images.length, 1)] || fallbackSeedImage(businessType, index);
    const created = await tx.product.create({
      data: {
        tenantId: targetTenantId,
        name,
        slug,
        categoryId: category.id,
        images: [image],
        cardTags: ["проверка", "прайс нужен"],
        saleUnit: "PIECE",
        shortDescription: "Позиция найдена при скане. Цена, наличие, фото и описание подтверждаются перед запуском.",
        description: "ARAY добавил эту позицию в сайт для проверки структуры каталога. Перед публикацией нужно загрузить прайс, подтвердить фото и финальное описание.",
        active: true,
        featured: index < 4,
        variants: {
          create: [{
            size: "уточняется",
            pricePerCube: null,
            pricePerPiece: null,
            piecesPerCube: null,
            inStock: false,
            stockQty: null,
            lowStockThreshold: 0,
            sortOrder: 0,
          }],
        },
      },
      select: { id: true, slug: true },
    });
    productMap.set(name, created.id);
    productSlugMap.set(slug, created.slug);
  }

  return {
    categories: createdCategories.length,
    products: seed.products.length,
    productMap,
    productSlugMap,
  };
}

async function cloneSimpleLayers(
  tx: CloneTx,
  sourceTenantId: string,
  targetTenantId: string,
  targetSlug: string,
  targetSettings: Record<string, string>,
) {
  const counts: Record<string, number> = {};
  const serviceSlugMap = new Map<string, string>();

  const settings = await tx.siteSettings.findMany({ where: { tenantId: sourceTenantId } });
  if (settings.length) {
    await tx.siteSettings.createMany({
      data: settings.map((item) => ({
        tenantId: targetTenantId,
        key: item.key,
        value: item.value,
      })),
    });
  }
  counts.siteSettings = settings.length;
  await upsertTargetSiteSettings(tx, targetTenantId, targetSettings);

  const promotions = await tx.promotion.findMany({ where: { tenantId: sourceTenantId } });
  if (promotions.length) {
    await tx.promotion.createMany({
      data: promotions.map((item) => ({
        tenantId: targetTenantId,
        title: item.title,
        description: item.description,
        discount: item.discount,
        imageUrl: item.imageUrl,
        validUntil: item.validUntil,
        active: item.active,
      })),
    });
  }
  counts.promotions = promotions.length;

  const deliveryRates = await tx.deliveryRate.findMany({ where: { tenantId: sourceTenantId } });
  if (deliveryRates.length) {
    await tx.deliveryRate.createMany({
      data: deliveryRates.map((item) => ({
        tenantId: targetTenantId,
        vehicleName: item.vehicleName,
        payload: item.payload,
        maxVolume: item.maxVolume,
        basePrice: item.basePrice,
        sortOrder: item.sortOrder,
      })),
    });
  }
  counts.deliveryRates = deliveryRates.length;

  const services = await tx.service.findMany({ where: { tenantId: sourceTenantId } });
  for (const service of services) {
    const slug = namespacedSlug(service.slug, targetSlug);
    await tx.service.create({
      data: {
        tenantId: targetTenantId,
        slug,
        title: service.title,
        description: service.description,
        content: service.content,
        price: service.price,
        unit: service.unit,
        image: service.image,
        icon: service.icon,
        active: service.active,
        sortOrder: service.sortOrder,
      },
    });
    serviceSlugMap.set(service.slug, slug);
  }
  counts.services = services.length;

  const posts = await tx.post.findMany({ where: { tenantId: sourceTenantId } });
  if (posts.length) {
    await tx.post.createMany({
      data: posts.map((post) => ({
        tenantId: targetTenantId,
        slug: namespacedSlug(post.slug, targetSlug),
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        published: post.published,
        featured: post.featured,
        aiGenerated: post.aiGenerated,
        topic: post.topic,
        readTime: post.readTime,
        views: 0,
      })),
    });
  }
  counts.posts = posts.length;

  return { counts, serviceSlugMap };
}

async function cloneOperationalLayers(
  tx: CloneTx,
  sourceTenantId: string,
  targetTenantId: string,
) {
  const counts: Record<string, number> = {};
  const roleMap = new Map<string, string>();

  const roles = await tx.businessRole.findMany({ where: { tenantId: sourceTenantId } });
  for (const role of roles) {
    const created = await tx.businessRole.create({
      data: {
        tenantId: targetTenantId,
        roleKey: role.roleKey,
        label: role.label,
        description: role.description,
        baseRole: role.baseRole,
        scope: role.scope,
        roleKind: role.roleKind,
        permissions: toJson(role.permissions),
        notificationSeed: toJson(role.notificationSeed),
        isSystem: role.isSystem,
        isActive: role.isActive,
      },
      select: { id: true },
    });
    roleMap.set(role.id, created.id);
  }
  counts.businessRoles = roles.length;

  const rolePreferences = await tx.notificationRolePreference.findMany({ where: { tenantId: sourceTenantId } });
  if (rolePreferences.length) {
    await tx.notificationRolePreference.createMany({
      data: rolePreferences.map((item) => ({
        tenantId: targetTenantId,
        role: item.role,
        eventKey: item.eventKey,
        enabled: item.enabled,
        channels: toJson(item.channels),
        quietHoursEnabled: item.quietHoursEnabled,
      })),
    });
  }
  counts.notificationRolePreferences = rolePreferences.length;

  const roleSchedules = await tx.notificationRoleSchedule.findMany({ where: { tenantId: sourceTenantId } });
  if (roleSchedules.length) {
    await tx.notificationRoleSchedule.createMany({
      data: roleSchedules.map((item) => ({
        tenantId: targetTenantId,
        role: item.role,
        quietHoursEnabled: item.quietHoursEnabled,
        quietStart: item.quietStart,
        quietEnd: item.quietEnd,
        weekendsMuted: item.weekendsMuted,
      })),
    });
  }
  counts.notificationRoleSchedules = roleSchedules.length;

  const audiencePreferences = await tx.notificationAudiencePreference.findMany({ where: { tenantId: sourceTenantId } });
  if (audiencePreferences.length) {
    await tx.notificationAudiencePreference.createMany({
      data: audiencePreferences.map((item) => ({
        tenantId: targetTenantId,
        audienceKey: item.audienceKey,
        audienceLabel: item.audienceLabel,
        businessRoleId: item.businessRoleId ? roleMap.get(item.businessRoleId) || null : null,
        eventKey: item.eventKey,
        enabled: item.enabled,
        channels: toJson(item.channels),
        quietHoursEnabled: item.quietHoursEnabled,
        quietStart: item.quietStart,
        quietEnd: item.quietEnd,
        weekendsMuted: item.weekendsMuted,
        metadata: toJson(item.metadata),
      })),
    });
  }
  counts.notificationAudiencePreferences = audiencePreferences.length;

  const moduleStates = await tx.arayModuleState.findMany({ where: { tenantId: sourceTenantId } });
  if (moduleStates.length) {
    await tx.arayModuleState.createMany({
      data: moduleStates.map((item) => ({
        tenantId: targetTenantId,
        moduleId: item.moduleId,
        enabled: item.enabled,
        locked: item.locked,
        rolePolicy: toJson(item.rolePolicy),
        subscriptionPlan: item.subscriptionPlan,
        connectorPolicy: toJson(item.connectorPolicy),
        reason: item.reason,
        updatedById: item.updatedById,
      })),
    });
  }
  counts.arayModuleStates = moduleStates.length;

  const connectors = await tx.terminalConnector.findMany({ where: { tenantId: sourceTenantId } });
  if (connectors.length) {
    await tx.terminalConnector.createMany({
      data: connectors.map((item) => ({
        tenantId: targetTenantId,
        name: item.name,
        type: item.type,
        provider: item.provider,
        status: item.status,
        trustLevel: item.trustLevel,
        direction: item.direction,
        mode: item.mode,
        capabilities: item.capabilities,
        settings: toJson(item.settings),
        health: toJson(item.health),
        lastSyncAt: null,
      })),
    });
  }
  counts.terminalConnectors = connectors.length;

  const workflows = await tx.workflow.findMany({ where: { tenantId: sourceTenantId } });
  if (workflows.length) {
    await tx.workflow.createMany({
      data: workflows.map((item) => ({
        tenantId: targetTenantId,
        name: item.name,
        description: item.description,
        active: item.active,
        trigger: item.trigger,
        conditions: toJson(item.conditions),
        actions: toJson(item.actions),
        delayMinutes: item.delayMinutes,
        category: item.category,
        nicheTag: item.nicheTag,
        sortOrder: item.sortOrder,
        executionCount: 0,
        lastExecutedAt: null,
      })),
    });
  }
  counts.workflows = workflows.length;

  const documentTemplates = await tx.documentTemplate.findMany({ where: { tenantId: sourceTenantId } });
  if (documentTemplates.length) {
    await tx.documentTemplate.createMany({
      data: documentTemplates.map((item) => ({
        tenantId: targetTenantId,
        name: item.name,
        type: item.type,
        content: item.content,
        variables: toJson(item.variables),
        active: item.active,
        isDefault: item.isDefault,
        nicheTag: item.nicheTag,
        sortOrder: item.sortOrder,
      })),
    });
  }
  counts.documentTemplates = documentTemplates.length;

  const reportSchedules = await tx.reportSchedule.findMany({ where: { tenantId: sourceTenantId } });
  if (reportSchedules.length) {
    await tx.reportSchedule.createMany({
      data: reportSchedules.map((item) => ({
        tenantId: targetTenantId,
        name: item.name,
        type: item.type,
        schedule: item.schedule,
        recipients: toJson(item.recipients),
        filters: toJson(item.filters),
        active: item.active,
        lastRunAt: null,
        nextRunAt: item.nextRunAt,
      })),
    });
  }
  counts.reportSchedules = reportSchedules.length;

  const crmHints = await tx.crmHint.findMany({ where: { tenantId: sourceTenantId } });
  if (crmHints.length) {
    await tx.crmHint.createMany({
      data: crmHints.map((item) => ({
        tenantId: targetTenantId,
        role: item.role,
        section: item.section,
        title: item.title,
        text: item.text,
        icon: item.icon,
        priority: item.priority,
        active: item.active,
      })),
    });
  }
  counts.crmHints = crmHints.length;

  return { counts, roleMap };
}

async function cloneStories(
  tx: CloneTx,
  input: {
    sourceTenantId: string;
    targetTenantId: string;
    productMap: Map<string, string>;
    productSlugMap: Map<string, string>;
    serviceSlugMap: Map<string, string>;
  },
) {
  const storyMap = new Map<string, string>();
  const stories = await tx.storeStory.findMany({
    where: { tenantId: input.sourceTenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  function mapEntity(entityType: string | null, entityId: string | null) {
    if (!entityType || !entityId) return entityId;
    if (entityType === "product") return input.productMap.get(entityId) || input.productSlugMap.get(entityId) || entityId;
    if (entityType === "service") return input.serviceSlugMap.get(entityId) || entityId;
    return entityId;
  }

  for (const story of stories) {
    const created = await tx.storeStory.create({
      data: {
        tenantId: input.targetTenantId,
        type: story.type,
        title: story.title,
        subtitle: story.subtitle,
        description: story.description,
        mediaUrl: story.mediaUrl,
        posterUrl: story.posterUrl,
        ctaLabel: story.ctaLabel,
        ctaUrl: story.ctaUrl,
        entityType: story.entityType,
        entityId: mapEntity(story.entityType, story.entityId),
        placement: story.placement,
        active: story.active,
        pinned: story.pinned,
        sortOrder: story.sortOrder,
        startsAt: story.startsAt,
        endsAt: story.endsAt,
      },
      select: { id: true },
    });
    storyMap.set(story.id, created.id);
  }

  const relations = await tx.storeStoryRelation.findMany({
    where: { tenantId: input.sourceTenantId },
  });
  for (const relation of relations) {
    const storyId = storyMap.get(relation.storyId);
    if (!storyId) continue;
    await tx.storeStoryRelation.create({
      data: {
        tenantId: input.targetTenantId,
        storyId,
        entityType: relation.entityType,
        entityId: mapEntity(relation.entityType, relation.entityId) || relation.entityId,
        label: relation.label,
        image: relation.image,
        ctaUrl: relation.ctaUrl,
        sortOrder: relation.sortOrder,
      },
    });
  }

  return { stories: stories.length, storyRelations: relations.length };
}

export async function createArayMultisiteClone(
  input: ArayMultisiteCloneInput,
): Promise<ArayMultisiteCloneResult> {
  const sourceTenantId = cleanString(input.sourceTenantId, 40) || DEFAULT_SOURCE_TENANT_ID;
  const siteName = cleanString(input.siteName, 160) || "Новый сайт ARAY";
  const targetSlug = await resolveTargetSlug(input, sourceTenantId);
  const requestedDomain = cleanDomain(input.domain);
  const draftDomain = requestedDomain || `${targetSlug}.${DRAFT_DOMAIN_SUFFIX}`;
  const businessType = inferBusinessType({
    businessType: input.businessType,
    brief: input.brief,
    siteName,
  });
  const brief = cleanString(input.brief, 2000);
  const now = new Date().toISOString();
  const adminHref = `/admin/site/constructor?tenant=${encodeURIComponent(targetSlug)}`;
  const previewHref = buildPreviewHref({
    name: siteName,
    targetSlug,
    domain: draftDomain,
    businessType,
    sourceTenantId,
  });

  const domainOwner = requestedDomain
    ? await prisma.tenant.findUnique({ where: { domain: requestedDomain }, select: { slug: true } })
    : null;
  if (domainOwner && domainOwner.slug !== targetSlug) {
    throw new Error("Этот домен уже закреплен за другим сайтом");
  }

  const sourceTenant = await prisma.tenant.findUnique({
    where: { slug: sourceTenantId },
    select: { slug: true, name: true, logoUrl: true, primaryColor: true, settings: true },
  });
  if (!sourceTenant) {
    throw new Error("Базовый шаблон ARAY CMS не найден");
  }

  const warnings: string[] = [
    "Личные пользователи, клиенты, заказы, оплаты и история уведомлений не копируются: новый сайт стартует чисто.",
    "Публичные услуги и новости пока получают служебные slug, пока старые модели переводятся на tenant-slug как каталог.",
  ];
  const seedCatalog = normalizeSeedCatalog(input, businessType);

  const result = await prisma.$transaction(async (tx) => {
    await clearTargetTenantData(tx, targetSlug);

    const targetSiteSettings = buildTargetSiteSettingOverrides({
      siteName,
      requestedDomain,
      draftDomain,
      businessType,
      city: input.city,
      brief,
    });
    const catalog = seedCatalog
      ? await createSeedCatalog(tx, targetSlug, seedCatalog, businessType)
      : await cloneCatalog(tx, sourceTenantId, targetSlug);
    const simple = await cloneSimpleLayers(tx, sourceTenantId, targetSlug, targetSlug, targetSiteSettings);
    const operations = await cloneOperationalLayers(tx, sourceTenantId, targetSlug);
    const stories = await cloneStories(tx, {
      sourceTenantId,
      targetTenantId: targetSlug,
      productMap: catalog.productMap,
      productSlugMap: catalog.productSlugMap,
      serviceSlugMap: simple.serviceSlugMap,
    });

    const counts = {
      categories: catalog.categories,
      products: catalog.products,
      ...simple.counts,
      ...operations.counts,
      ...stories,
    };

    const existing = await tx.tenant.findUnique({
      where: { slug: targetSlug },
      select: { settings: true },
    });
    const settingsRoot = asRecord(existing?.settings);
    const constructorSettings = {
      createdBy: "aray-production",
      status: "draft",
      referralSource: "ARAY CMS",
      networkMode: "network",
      networkId: "aray-network",
      networkName: "ARAY CMS",
      siteCode: targetSlug,
      businessType,
      city: cleanString(input.city, 120),
      contactName: cleanString(input.contactName, 160) || siteName,
      phone: cleanString(input.phone, 80),
      email: cleanString(input.email, 120),
      warehouse: "",
      workHours: "",
      delivery: "Уточняется в Brief под новый бизнес.",
      payment: "Платежи и счета включаются только после подтверждения.",
      logoName: "",
      priceFileName: "",
      priceFileSize: 0,
      managerName: "ARAY",
      referralCode: targetSlug,
      rewardPlan: "ARAY site factory",
      notes: [
        "Новый сайт создан в ARAY CMS как отдельный рабочий проект.",
        brief ? `Brief: ${brief}` : "Brief будет заполнен перед сменой сферы и контента.",
        `Подготовлено: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(", ")}.`,
      ].join("\n"),
      updatedById: input.userId,
      updatedAt: now,
    };
    const cloneSettings: CloneTenantSettings = {
      source: "aray-multisite-clone",
      sourceTenantId,
      cloneMode: "aray-cms-full-contour-draft",
      status: "draft",
      requestedDomain,
      draftDomain,
      businessType,
      brief,
      counts,
      warnings,
      adminHref,
      previewHref,
      createdAt: now,
      updatedById: input.userId,
    };

    const tenant = await tx.tenant.upsert({
      where: { slug: targetSlug },
      create: {
        slug: targetSlug,
        name: siteName,
        domain: requestedDomain || null,
        logoUrl: sourceTenant.logoUrl,
        primaryColor: sourceTenant.primaryColor || "hsl(var(--primary))",
        plan: "free",
        active: false,
        settings: toJson({
          ...settingsRoot,
          storeConstructor: constructorSettings,
          arayMultisiteClone: cloneSettings,
        }),
      },
      update: {
        name: siteName,
        domain: requestedDomain || null,
        logoUrl: sourceTenant.logoUrl,
        primaryColor: sourceTenant.primaryColor || "hsl(var(--primary))",
        active: false,
        settings: toJson({
          ...settingsRoot,
          storeConstructor: constructorSettings,
          arayMultisiteClone: {
            ...cloneSettings,
            updatedAt: now,
          },
        }),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        active: true,
      },
    });

    await tx.task.create({
      data: {
        tenantId: targetSlug,
        title: `ARAY: проверить новый сайт — ${siteName}`,
        description: [
          "ARAY создал новый сайт в ARAY CMS как черновик перед запуском.",
          `Сайт: ${targetSlug}.`,
          `Домен: ${draftDomain}.`,
          `Brief: ${brief || "нужно заполнить и сменить сферу/контент"}.`,
          `Админка: ${adminHref}.`,
          `Сайт: ${previewHref}.`,
          "Следующий шаг: открыть Brief, заменить сферу, товары/услуги, фото, тексты, контакты и проверить запуск.",
        ].join("\n"),
        status: "TODO",
        priority: "HIGH",
        createdById: input.userId,
        tags: [
          "ARAY",
          "ARAY_CMS_SITE",
          "ARAY_LAUNCH",
          `SITE:${targetSlug}`,
        ],
      },
    });

    return { tenant, counts };
  }, { timeout: 60_000 });

  return {
    site: {
      id: result.tenant.id,
      tenantId: result.tenant.slug,
      slug: result.tenant.slug,
      name: result.tenant.name,
      status: result.tenant.active ? "published" : "draft",
      domain: draftDomain,
      requestedDomain,
      adminHref,
      previewHref,
    },
    report: {
      sourceTenantId,
      targetTenantId: result.tenant.slug,
      counts: result.counts,
      warnings,
      adminHref,
      previewHref,
    },
  };
}
