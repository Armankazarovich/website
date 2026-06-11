export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { mergeTenantSettings, settingsRecord } from "@/lib/tenant-settings";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";
import {
  ARAY_METRIKA_GOAL_SPECS,
  ensureArayMetrikaGoals,
  getStoredMetrikaCounterId,
} from "@/lib/yandex-metrika";

async function saveSetting(tenantId: string, key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value },
    update: { value },
  });
}

async function saveTenantSettings(tenantId: string, patch: Record<string, string>) {
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

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const tenantId = getCurrentTenantId();
  const [settingsRows, tenant] = await Promise.all([
    prisma.siteSettings.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId } }).catch(() => null),
  ]);
  const settings = mergeTenantSettings(tenant, settingsRows);
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const requestedCounterId = Number(String(body.counterId || "").replace(/[^\d]/g, ""));
  const counterId = requestedCounterId || getStoredMetrikaCounterId(settings);

  if (!counterId) {
    return NextResponse.json(
      { ok: false, error: "Сначала подключите Метрику или укажите номер счетчика" },
      { status: 400 },
    );
  }

  try {
    const result = await ensureArayMetrikaGoals({ settings, counterId });
    const patch: Record<string, string> = {
      yandex_metrika_id: String(result.counterId),
    };
    for (const spec of ARAY_METRIKA_GOAL_SPECS) {
      const goalId = result.goals[spec.key];
      if (goalId) patch[spec.settingKey] = goalId;
    }
    await saveTenantSettings(tenantId, patch);
    for (const [key, value] of Object.entries(patch)) {
      await saveSetting(tenantId, key, value);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось создать цели Метрики",
      },
      { status: 500 },
    );
  }
}
