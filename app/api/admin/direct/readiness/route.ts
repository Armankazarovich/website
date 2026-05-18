export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID, getCurrentTenantId } from "@/lib/tenant-context";
import { mergeTenantSettings, settingsRecord } from "@/lib/tenant-settings";

const GOAL_SETTING_KEYS = {
  order: "yandex_metrika_goal_order_id",
  lead: "yandex_metrika_goal_lead_id",
  phone: "yandex_metrika_goal_phone_id",
  messenger: "yandex_metrika_goal_messenger_id",
  cart: "yandex_metrika_goal_cart_id",
  checkout: "yandex_metrika_goal_checkout_id",
  engaged: "yandex_metrika_goal_engaged_id",
} as const;

type GoalKey = keyof typeof GOAL_SETTING_KEYS;

function digitsOnly(value: unknown) {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

function normalizeOrigin(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function originHost(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeRegionIds(value: unknown) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[\s,;]+/g)
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0),
    ),
  ).join(",");
}

async function readSettings() {
  const tenantId = getCurrentTenantId();
  const [rows, tenant] = await Promise.all([
    prisma.siteSettings.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId } }).catch(() => null),
  ]);
  return {
    tenantId,
    tenant,
    settings: mergeTenantSettings(tenant, rows),
  };
}

function buildPayload(settings: Record<string, string>, tenant?: { domain?: string | null } | null) {
  return {
    ok: true,
    publicBaseUrl:
      settings.yandex_direct_public_url ||
      settings.direct_public_url ||
      settings.public_site_url ||
      settings.site_url ||
      tenant?.domain ||
      "",
    directRegionIds:
      settings.yandex_direct_region_ids ||
      settings.direct_region_ids ||
      "",
    metrikaCounterId:
      settings.yandex_metrika_id ||
      settings.yandex_metrika_counter_id ||
      settings.metrika_counter_id ||
      "",
    businessProfileId:
      settings.yandex_business_id ||
      settings.yandex_maps_business_id ||
      settings.direct_business_id ||
      "",
    goals: Object.fromEntries(
      Object.entries(GOAL_SETTING_KEYS).map(([goal, key]) => [
        goal,
        settings[key] || "",
      ]),
    ) as Record<GoalKey, string>,
  };
}

async function saveSetting(tenantId: string, key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { key },
    create: {
      id: key,
      tenantId,
      key,
      value,
    },
    update: {
      tenantId,
      value,
    },
  });
}

async function saveTenantSettings(tenantId: string, patch: Record<string, string>) {
  if (!Object.keys(patch).length) return;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) return;
  await prisma.tenant.update({
    where: { slug: tenantId },
    data: {
      settings: {
        ...settingsRecord(tenant.settings),
        ...patch,
      },
    },
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { settings, tenant } = await readSettings();
  return NextResponse.json(buildPayload(settings, tenant), {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { tenantId } = await readSettings();
  const publicBaseUrl = normalizeOrigin(body?.publicBaseUrl);
  const directRegionIds = normalizeRegionIds(body?.directRegionIds);
  const counterId = digitsOnly(body?.metrikaCounterId);
  const businessProfileId = digitsOnly(body?.businessProfileId);
  const goals = (body?.goals || {}) as Record<string, unknown>;

  if (typeof body?.publicBaseUrl === "string" && body.publicBaseUrl.trim() && !publicBaseUrl) {
    return NextResponse.json({ error: "Укажите корректный публичный домен сайта" }, { status: 400 });
  }

  if (typeof body?.directRegionIds === "string" && body.directRegionIds.trim() && !directRegionIds) {
    return NextResponse.json({ error: "Укажите числовой ID региона Direct" }, { status: 400 });
  }

  const tenantPatch: Record<string, string> = {
    yandex_metrika_id: counterId,
    yandex_business_id: businessProfileId,
  };

  if (publicBaseUrl) {
    tenantPatch.site_url = publicBaseUrl;
    tenantPatch.direct_public_url = publicBaseUrl;
    tenantPatch.yandex_direct_public_url = publicBaseUrl;
  }

  if (directRegionIds) {
    tenantPatch.direct_region_ids = directRegionIds;
    tenantPatch.yandex_direct_region_ids = directRegionIds;
  }

  for (const [goal, key] of Object.entries(GOAL_SETTING_KEYS)) {
    tenantPatch[key] = digitsOnly(goals[goal]);
  }

  await saveTenantSettings(tenantId, tenantPatch);

  if (publicBaseUrl) {
    const domain = originHost(publicBaseUrl);
    if (domain) {
      await prisma.tenant.update({
        where: { slug: tenantId },
        data: { domain },
      }).catch(() => null);
    }
  }

  if (tenantId === DEFAULT_TENANT_ID) {
    if (publicBaseUrl) {
      await saveSetting(tenantId, "site_url", publicBaseUrl);
      await saveSetting(tenantId, "direct_public_url", publicBaseUrl);
      await saveSetting(tenantId, "yandex_direct_public_url", publicBaseUrl);
    }
    if (directRegionIds) {
      await saveSetting(tenantId, "direct_region_ids", directRegionIds);
      await saveSetting(tenantId, "yandex_direct_region_ids", directRegionIds);
    }
    await saveSetting(tenantId, "yandex_metrika_id", counterId);
    await saveSetting(tenantId, "yandex_business_id", businessProfileId);
    for (const [goal, key] of Object.entries(GOAL_SETTING_KEYS)) {
      await saveSetting(tenantId, key, digitsOnly(goals[goal]));
    }
  }

  const { settings, tenant } = await readSettings();
  return NextResponse.json(buildPayload(settings, tenant));
}
