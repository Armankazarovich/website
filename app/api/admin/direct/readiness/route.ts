export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

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

async function readSettings() {
  const tenantId = getCurrentTenantId();
  const rows = await prisma.siteSettings.findMany({ where: { tenantId } });
  return {
    tenantId,
    settings: Object.fromEntries(rows.map((row) => [row.key, row.value])),
  };
}

function buildPayload(settings: Record<string, string>) {
  return {
    ok: true,
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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { settings } = await readSettings();
  return NextResponse.json(buildPayload(settings), {
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
  const counterId = digitsOnly(body?.metrikaCounterId);
  const businessProfileId = digitsOnly(body?.businessProfileId);
  const goals = (body?.goals || {}) as Record<string, unknown>;

  await saveSetting(tenantId, "yandex_metrika_id", counterId);
  await saveSetting(tenantId, "yandex_business_id", businessProfileId);

  for (const [goal, key] of Object.entries(GOAL_SETTING_KEYS)) {
    await saveSetting(tenantId, key, digitsOnly(goals[goal]));
  }

  const { settings } = await readSettings();
  return NextResponse.json(buildPayload(settings));
}
