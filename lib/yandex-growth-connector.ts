import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveDirectPublicBaseUrl } from "@/lib/direct-public-url";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getYandexDirectStatus } from "@/lib/yandex-direct";
import {
  ARAY_METRIKA_GOAL_SPECS,
  createYandexMetrikaCounter,
  ensureArayMetrikaGoals,
  getStoredMetrikaCounterId,
  getStoredMetrikaGoals,
  getYandexMetrikaStatus,
  type ArayMetrikaGoals,
} from "@/lib/yandex-metrika";
import { getYandexUnifiedOAuthApp } from "@/lib/yandex-oauth-app";

type SettingsMap = Record<string, string>;

type YandexGrowthAction =
  | "connect_yandex"
  | "connect_direct"
  | "connect_metrika"
  | "save_counter"
  | "ensure_metrika_goals"
  | "confirm_organization"
  | "set_public_domain"
  | "ready";

export type YandexGrowthConnectorOverview = Awaited<ReturnType<typeof buildYandexGrowthConnectorOverview>>;

function digitsOnly(value: unknown) {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

function businessProfileId(settings: SettingsMap) {
  return digitsOnly(
    settings.yandex_business_id ||
      settings.yandex_maps_business_id ||
      settings.direct_business_id ||
      "",
  );
}

function countStoredGoals(goals: ArayMetrikaGoals) {
  return ARAY_METRIKA_GOAL_SPECS.filter((spec) => Boolean(goals[spec.key])).length;
}

function siteHostFromUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    return baseUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

function connectorSiteName(settings: SettingsMap) {
  return (
    settings.store_name ||
    settings.site_name ||
    settings.company_name ||
    settings.brand_name ||
    "PiloRus"
  ).trim();
}

function hasUnifiedYandexOAuthApp() {
  return Boolean(getYandexUnifiedOAuthApp());
}

function metrikaGoalsReady(goals: ArayMetrikaGoals) {
  const hasPrimaryGoal = Boolean(goals.order || goals.lead);
  const hasMicroGoal = Boolean(
    goals.phone || goals.messenger || goals.cart || goals.checkout || goals.engaged,
  );
  return hasPrimaryGoal && hasMicroGoal;
}

async function readContext(req: Request) {
  const tenantId = getCurrentTenantId();
  const [settingsRows, tenant] = await Promise.all([
    prisma.siteSettings.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId } }).catch(() => null),
  ]);
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value])) as SettingsMap;
  const requestUrl = new URL(req.url);
  const publicUrl = resolveDirectPublicBaseUrl({ settings, tenant, requestUrl });

  return { tenantId, settings, publicUrl };
}

async function saveSetting(tenantId: string, key: string, value: string) {
  await prisma.siteSettings.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value },
    update: { value },
  });
}

function nextAction({
  directConnected,
  directConfigured,
  metrikaConnected,
  metrikaConfigured,
  counterReady,
  goalsReady,
  organizationReady,
  publicDomainReady,
}: {
  directConnected: boolean;
  directConfigured: boolean;
  metrikaConnected: boolean;
  metrikaConfigured: boolean;
  counterReady: boolean;
  goalsReady: boolean;
  organizationReady: boolean;
  publicDomainReady: boolean;
}): { action: YandexGrowthAction; label: string } {
  if (hasUnifiedYandexOAuthApp() && (!directConnected || !metrikaConnected)) {
    return {
      action: "connect_yandex",
      label: "Подключить Яндекс один раз для Direct и Метрики",
    };
  }
  if (!directConnected) {
    return {
      action: "connect_direct",
      label: directConfigured ? "Подключить Direct через OAuth" : "Настроить OAuth-приложение Direct",
    };
  }
  if (!metrikaConnected) {
    return {
      action: "connect_metrika",
      label: metrikaConfigured ? "Подключить Метрику через OAuth" : "Настроить OAuth-приложение Метрики",
    };
  }
  if (!counterReady) return { action: "save_counter", label: "Сохранить найденный счетчик Метрики" };
  if (!goalsReady) return { action: "ensure_metrika_goals", label: "Создать недостающие цели Метрики" };
  if (!publicDomainReady) return { action: "set_public_domain", label: "Указать публичный домен" };
  if (!organizationReady) return { action: "confirm_organization", label: "Подтвердить организацию Яндекс Бизнеса" };
  return { action: "ready", label: "Яндекс-контур готов" };
}

export async function buildYandexGrowthConnectorOverview(req: Request) {
  const { tenantId, settings, publicUrl } = await readContext(req);
  const [direct, metrika] = await Promise.all([
    getYandexDirectStatus(settings),
    getYandexMetrikaStatus(settings),
  ]);

  const storedGoals = getStoredMetrikaGoals(settings);
  const storedCounterId = getStoredMetrikaCounterId(settings);
  const goalReadyCount = countStoredGoals(storedGoals);
  const goalsReady = metrikaGoalsReady(storedGoals);
  const organizationId = businessProfileId(settings);
  const counterId = storedCounterId || metrika.selectedCounterId;
  const organizationReady = Boolean(organizationId);
  const counterReady = Boolean(storedCounterId);
  const unifiedConfigured = hasUnifiedYandexOAuthApp();

  const checklist = [
    {
      id: "yandex",
      label: "Яндекс в один клик",
      ready: unifiedConfigured && direct.connected && metrika.connected,
      note:
        unifiedConfigured
          ? direct.connected && metrika.connected
            ? "Единый вход Яндекса выдал доступы для Direct и Метрики"
            : "Единый вход настроен; владелец может подключить Яндекс одной кнопкой"
          : "Для единой кнопки нужны YANDEX_OAUTH_CLIENT_ID / YANDEX_OAUTH_CLIENT_SECRET",
    },
    {
      id: "direct",
      label: "Direct OAuth",
      ready: direct.connected,
      note: direct.connected
        ? `Direct подключен, кампаний видно: ${direct.campaignsCount}`
        : direct.configured
          ? "OAuth-приложение готово; владельцу нужно подключить Direct"
          : "Не хватает настроек OAuth-приложения Direct",
    },
    {
      id: "metrika",
      label: "Метрика OAuth",
      ready: metrika.connected,
      note: metrika.connected
        ? `Метрика подключена, счетчиков видно: ${metrika.counters.length}`
        : metrika.configured
          ? "OAuth-приложение готово; владельцу нужно подключить Метрику"
          : "Не хватает настроек OAuth-приложения Метрики",
    },
    {
      id: "counter",
      label: "Счетчик Метрики",
      ready: counterReady,
      note: counterReady
        ? `Счетчик #${storedCounterId} сохранен`
        : metrika.counters.length
          ? "Я могу сохранить первый найденный счетчик"
          : "Сначала подключите Метрику, затем я увижу счетчики",
    },
    {
      id: "goals",
      label: "Цели Метрики",
      ready: goalsReady,
      note: goalsReady
        ? `${goalReadyCount}/${ARAY_METRIKA_GOAL_SPECS.length} целей сохранено`
        : `${goalReadyCount}/${ARAY_METRIKA_GOAL_SPECS.length} целей сохранено; после OAuth Метрики я создам недостающие`,
    },
    {
      id: "domain",
      label: "Публичный домен",
      ready: publicUrl.isPublic,
      note: publicUrl.isPublic
        ? `Домен для рекламы: ${publicUrl.baseUrl}`
        : "Для экспорта рекламы нужен публичный домен, не localhost",
    },
    {
      id: "organization",
      label: "Организация Яндекс Бизнеса",
      ready: organizationReady,
      note: organizationReady
        ? `ID организации сохранен: ${organizationId}`
        : "Организацию подтверждаем вручную, пока не подключен официальный доступ",
    },
  ];

  const readyCount = checklist.filter((item) => item.ready).length;
  const next = nextAction({
    directConnected: direct.connected,
    directConfigured: direct.configured,
    metrikaConnected: metrika.connected,
    metrikaConfigured: metrika.configured,
    counterReady,
    goalsReady,
    organizationReady,
    publicDomainReady: publicUrl.isPublic,
  });

  return {
    ok: true,
    tenantId,
    checkedAt: new Date().toISOString(),
    readiness: {
      readyCount,
      totalCount: checklist.length,
      ready: readyCount === checklist.length,
      nextAction: next,
      checklist,
    },
    actions: {
      yandexOauthUrl: "/api/admin/aray/connectors/yandex/oauth/start",
      directOauthUrl: "/api/admin/direct/oauth/start",
      metrikaOauthUrl: "/api/admin/metrika/oauth/start",
      googleConnectUrl: "/api/admin/aray/connectors/google/oauth/start",
      yandexBusinessUrl: "https://business.yandex.ru/",
      promotionUrl: "/admin/promotion",
    },
    direct,
    metrika: {
      ...metrika,
      selectedCounterId: counterId,
      storedCounterId,
      storedGoals,
      goalReadyCount,
      goalTotalCount: ARAY_METRIKA_GOAL_SPECS.length,
      goalsReady,
    },
    publicUrl,
    organization: {
      id: organizationId || null,
      ready: organizationReady,
      mode: "manual-until-official-api",
    },
    safety:
      "Я могу сохранять ID и создавать цели Метрики после OAuth. Запуск рекламы, публичные изменения и ответы на отзывы остаются только после подтверждения владельца.",
  };
}

export async function runYandexGrowthConnectorAction(req: Request, body: Record<string, unknown>) {
  const { tenantId, settings, publicUrl } = await readContext(req);
  const action = String(body.action || "");

  if (action === "save_counter") {
    const counterId = digitsOnly(body.counterId);
    if (!counterId) throw new Error("Metrika counter ID is missing");
    await saveSetting(tenantId, "yandex_metrika_id", counterId);
    return { ok: true, action, message: `Счетчик #${counterId} сохранен` };
  }

  if (action === "save_business_profile") {
    const organizationId = digitsOnly(body.organizationId);
    if (!organizationId) throw new Error("Не передан ID организации Яндекс Бизнеса");
    await saveSetting(tenantId, "yandex_business_id", organizationId);
    return { ok: true, action, message: `Организация #${organizationId} сохранена` };
  }

  if (action === "ensure_metrika_goals") {
    const counterId =
      Number(digitsOnly(body.counterId)) ||
      (await getYandexMetrikaStatus(settings)).selectedCounterId;
    if (!counterId) throw new Error("Сначала подключите Метрику или сохраните счетчик");

    const result = await ensureArayMetrikaGoals({ settings, counterId });
    await saveSetting(tenantId, "yandex_metrika_id", String(result.counterId));
    for (const spec of ARAY_METRIKA_GOAL_SPECS) {
      const goalId = result.goals[spec.key];
      if (goalId) await saveSetting(tenantId, spec.settingKey, goalId);
    }

    return {
      ok: true,
      action,
      message: `Цели Метрики готовы: ${Object.keys(result.goals).length}`,
      result,
    };
  }

  if (action === "auto_prepare") {
    const metrika = await getYandexMetrikaStatus(settings);
    if (!metrika.connected) {
      return {
        ok: false,
        action,
        needsOAuth: "metrika",
        message: "Сначала подключите Метрику через OAuth; затем я сохраню счетчик и создам цели.",
      };
    }

    let counterId = metrika.selectedCounterId || Number(metrika.counters[0]?.id || 0);
    let createdCounterName = "";
    if (!counterId && publicUrl.isPublic) {
      const counter = await createYandexMetrikaCounter({
        settings,
        name: `${connectorSiteName(settings)} — ARAY`,
        site: siteHostFromUrl(publicUrl.baseUrl),
      });
      counterId = Number(counter.id || 0);
      createdCounterName = counter.name || `Счетчик #${counterId}`;
    }

    if (!counterId) {
      return {
        ok: false,
        action,
        message: publicUrl.isPublic
          ? "Метрика подключена, но в аккаунте не видно счетчика."
          : "Метрика подключена, но для автосоздания счетчика нужен публичный домен, не localhost.",
      };
    }

    await saveSetting(tenantId, "yandex_metrika_id", String(counterId));
    const result = await ensureArayMetrikaGoals({ settings, counterId });
    for (const spec of ARAY_METRIKA_GOAL_SPECS) {
      const goalId = result.goals[spec.key];
      if (goalId) await saveSetting(tenantId, spec.settingKey, goalId);
    }

    return {
      ok: true,
      action,
      message: `${createdCounterName ? `${createdCounterName} создан, ` : ""}счетчик #${counterId} сохранен, целей готово: ${Object.keys(result.goals).length}`,
      result,
    };
  }

  throw new Error(`Неизвестное действие Яндекс-коннектора: ${action}`);
}
