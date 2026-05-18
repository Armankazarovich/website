export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { buildYandexDirectDraft, normalizeDirectDraftOptions } from "@/lib/direct-campaign-draft";
import { getYandexDirectStatus } from "@/lib/yandex-direct";
import { resolveRegionIds } from "@/lib/yandex-direct-export";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { resolveDirectPublicBaseUrl } from "@/lib/direct-public-url";
import { mergeTenantSettings } from "@/lib/tenant-settings";
import { buildArayDirectPackage } from "@/lib/aray-direct-package";

async function readDraftOptions(req: Request) {
  const requestUrl = new URL(req.url);
  const fromQuery = Object.fromEntries(requestUrl.searchParams.entries());

  if (req.method !== "POST") {
    return normalizeDirectDraftOptions(fromQuery);
  }

  const body = await req.json().catch(() => ({}));
  return normalizeDirectDraftOptions({
    ...fromQuery,
    ...((body?.options || body) as Record<string, unknown>),
  });
}

function resolveMetrikaCounterIds(settings: Record<string, string>) {
  const raw =
    settings.yandex_metrika_id ||
    settings.yandex_metrika_counter_id ||
    settings.metrika_counter_id ||
    "";

  return raw
    .split(/[\s,;]+/g)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function resolveMetrikaGoals(settings: Record<string, string>) {
  return {
    order: settings.yandex_metrika_goal_order_id || "",
    lead: settings.yandex_metrika_goal_lead_id || "",
    phone: settings.yandex_metrika_goal_phone_id || "",
    messenger: settings.yandex_metrika_goal_messenger_id || "",
    cart: settings.yandex_metrika_goal_cart_id || "",
    checkout: settings.yandex_metrika_goal_checkout_id || "",
    engaged: settings.yandex_metrika_goal_engaged_id || "",
  };
}

function resolveBusinessProfileId(settings: Record<string, string>) {
  const raw =
    settings.yandex_business_id ||
    settings.yandex_maps_business_id ||
    settings.direct_business_id ||
    "";
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function resolveDraftRegionIds(
  settings: Record<string, string>,
  draft: ReturnType<typeof buildYandexDirectDraft>,
) {
  try {
    return {
      ids: resolveRegionIds(settings, draft),
      error: null,
    };
  } catch (error) {
    return {
      ids: [] as number[],
      error:
        error instanceof Error
          ? error.message
          : "Не удалось определить регионы Direct",
    };
  }
}

type DraftSelectionProduct = {
  id: string;
  name: string;
  slug?: string | null;
  images?: string[];
  active?: boolean | null;
  category?: { name?: string | null; slug?: string | null } | null;
  variants?: Array<{ pricePerCube?: unknown; pricePerPiece?: unknown; inStock?: boolean | null }>;
};

function getSelectionProductPrice(product: DraftSelectionProduct) {
  const prices = (product.variants || [])
    .flatMap((variant) => [variant.pricePerCube, variant.pricePerPiece])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return prices.length ? Math.min(...prices) : null;
}

function getSelectionProductInStock(product: DraftSelectionProduct) {
  const variants = product.variants || [];
  return !variants.length || variants.some((variant) => variant.inStock !== false);
}

function getProductReadiness(products: DraftSelectionProduct[]) {
  const activeProducts = products.filter((product) => product.active !== false);
  return {
    productCount: activeProducts.length,
    productsWithPrice: activeProducts.filter((product) => getSelectionProductPrice(product)).length,
    productsInStock: activeProducts.filter(getSelectionProductInStock).length,
    productsWithImages: activeProducts.filter((product) => (product.images || []).length > 0).length,
  };
}

function buildDraftSelection(products: DraftSelectionProduct[]) {
  const activeProducts = products.filter((product) => product.active !== false);
  const categories = new Map<string, { name: string; slug: string | null; productsCount: number }>();

  for (const product of activeProducts) {
    const name = product.category?.name || "Каталог";
    const slug = product.category?.slug || null;
    const current = categories.get(name) || { name, slug, productsCount: 0 };
    current.productsCount += 1;
    categories.set(name, current);
  }

  return {
    categories: Array.from(categories.values()).sort((a, b) => b.productsCount - a.productsCount),
    products: activeProducts.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug || null,
      category: product.category?.name || "Каталог",
      categorySlug: product.category?.slug || null,
      price: getSelectionProductPrice(product),
      inStock: getSelectionProductInStock(product),
    })),
  };
}

async function buildDraftPayload(req: Request) {
  const options = await readDraftOptions(req);
  const tenantId = getCurrentTenantId();
  const [products, settingsRows, tenant] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, active: true },
      include: { category: true, variants: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.siteSettings.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId } }).catch(() => null),
  ]);

  const settings = mergeTenantSettings(tenant, settingsRows);
  const direct = await getYandexDirectStatus(settings);
  const requestUrl = new URL(req.url);
  const { baseUrl, isPublic } = resolveDirectPublicBaseUrl({ settings, tenant, requestUrl });
  const productReadiness = getProductReadiness(products);
  const draft = buildYandexDirectDraft({
    products,
    settings,
    baseUrl,
    tenant,
    options,
  });
  const directRegion = resolveDraftRegionIds(settings, draft);
  const metrikaCounterIds = resolveMetrikaCounterIds(settings);
  const metrikaGoals = resolveMetrikaGoals(settings);
  const businessName = tenant?.name || settings.site_name || settings.company_name || "PiloRus";
  const directPackage = buildArayDirectPackage({
    siteMode: "owned-site",
    domain: baseUrl,
    businessName,
    directConnected: direct.connected,
    publicBaseUrlReady: isPublic,
    regionIds: directRegion.ids,
    ...productReadiness,
    ymlUrl: isPublic ? `${baseUrl.replace(/\/+$/, "")}/api/yml` : "",
    metrikaCounterIds,
    metrikaGoals,
    activeCampaignNames: direct.campaigns
      .filter((campaign) => campaign.state.toUpperCase() === "ON")
      .map((campaign) => campaign.name),
  });

  return {
    ok: true,
    mode: "draft-only",
    direct,
    draft,
    selection: buildDraftSelection(products),
    publicBaseUrl: baseUrl,
    publicBaseUrlReady: isPublic,
    directRegionIds: directRegion.ids,
    directRegionError: directRegion.error,
    metrikaCounterIds,
    metrikaGoals,
    businessProfileId: resolveBusinessProfileId(settings),
    directPackage,
    safety: isPublic
      ? "ARAY готовит структуру и тексты. Создание/запуск платной рекламы требует отдельного подтверждения владельца."
      : "ARAY готовит черновик, но для выгрузки в Direct нужен публичный домен сайта вместо localhost.",
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(await buildDraftPayload(req), {
    headers: {
      "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(await buildDraftPayload(req));
}
