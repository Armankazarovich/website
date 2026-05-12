export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  ARAY_METRIKA_GOAL_SPECS,
  ensureArayMetrikaGoals,
  getStoredMetrikaCounterId,
} from "@/lib/yandex-metrika";

async function saveSetting(tenantId: string, key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { key },
    create: { id: key, key, value, tenantId },
    update: { value, tenantId },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const tenantId = getCurrentTenantId();
  const settingsRows = await prisma.siteSettings.findMany({ where: { tenantId } });
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const body = (await req.json().catch(() => ({}))) as { counterId?: string | number };
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
    await saveSetting(tenantId, "yandex_metrika_id", String(result.counterId));
    for (const spec of ARAY_METRIKA_GOAL_SPECS) {
      const goalId = result.goals[spec.key];
      if (goalId) await saveSetting(tenantId, spec.settingKey, goalId);
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
