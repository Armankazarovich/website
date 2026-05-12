import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveDirectPublicBaseUrl } from "@/lib/direct-public-url";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getGoogleUnifiedOAuthApp } from "@/lib/google-oauth-app";

type SettingsMap = Record<string, string>;

export type GoogleGrowthConnectorOverview = Awaited<ReturnType<typeof buildGoogleGrowthConnectorOverview>>;

function isFilled(value: string | undefined | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized && !normalized.includes("your-") && normalized !== "..." && normalized !== "todo");
}

function settingValue(settings: SettingsMap, keys: string[]) {
  for (const key of keys) {
    const value = settings[key]?.trim();
    if (value) return value;
  }
  return "";
}

function hasGoogleStoredToken(settings: SettingsMap) {
  return Boolean(
    settingValue(settings, [
      "google_oauth_refresh_token",
      "google_oauth_access_token",
      "google_ads_refresh_token",
      "google_ads_access_token",
      "google_analytics_refresh_token",
      "google_search_console_refresh_token",
    ]) ||
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN ||
      process.env.GOOGLE_ADS_REFRESH_TOKEN,
  );
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

export async function buildGoogleGrowthConnectorOverview(req: Request) {
  const { tenantId, settings, publicUrl } = await readContext(req);
  const oauthConfigured = Boolean(getGoogleUnifiedOAuthApp());
  const oauthConnected = hasGoogleStoredToken(settings);
  const adsReady = Boolean(
    oauthConnected &&
      isFilled(process.env.GOOGLE_ADS_DEVELOPER_TOKEN) &&
      (isFilled(process.env.GOOGLE_ADS_CUSTOMER_ID) ||
        isFilled(settingValue(settings, ["google_ads_customer_id"]))),
  );
  const analyticsReady = Boolean(
    oauthConnected &&
      (isFilled(process.env.GOOGLE_ANALYTICS_PROPERTY_ID) ||
        isFilled(settingValue(settings, ["google_analytics_property_id", "ga4_property_id"]))),
  );
  const searchConsoleReady = Boolean(
    oauthConnected &&
      (isFilled(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL) ||
        isFilled(settingValue(settings, ["google_search_console_site_url"])) ||
        publicUrl.isPublic),
  );

  const checklist = [
    {
      id: "oauth-app",
      label: "OAuth-приложение Google",
      ready: oauthConfigured,
      note: oauthConfigured
        ? "Client ID и Secret настроены, владелец может подключить Google одной кнопкой"
        : "Нужны GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET",
    },
    {
      id: "google-token",
      label: "Единый доступ Google",
      ready: oauthConnected,
      note: oauthConnected
        ? "Токен сохранен для Ads, Analytics и Search Console"
        : "Владелец еще не подтвердил доступ через Google",
    },
    {
      id: "ads",
      label: "Google Ads",
      ready: adsReady,
      note: adsReady
        ? "Developer token, customer ID и OAuth готовы"
        : "Для Google Ads нужен OAuth, GOOGLE_ADS_DEVELOPER_TOKEN и customer ID",
    },
    {
      id: "analytics",
      label: "Google Analytics",
      ready: analyticsReady,
      note: analyticsReady
        ? "Можно читать аналитику GA4"
        : "Нужен OAuth и GOOGLE_ANALYTICS_PROPERTY_ID",
    },
    {
      id: "search-console",
      label: "Search Console",
      ready: searchConsoleReady,
      note: searchConsoleReady
        ? "Можно готовить SEO-проверки и индексацию по сайту"
        : "Нужен OAuth и публичный подтвержденный сайт",
    },
  ];
  const readyCount = checklist.filter((item) => item.ready).length;

  return {
    ok: true,
    tenantId,
    checkedAt: new Date().toISOString(),
    readiness: {
      readyCount,
      totalCount: checklist.length,
      ready: readyCount === checklist.length,
      checklist,
      nextAction:
        !oauthConfigured
          ? "Настроить OAuth-приложение Google"
          : !oauthConnected
            ? "Подключить Google одной кнопкой"
            : !adsReady
              ? "Добавить developer token и customer ID Google Ads"
              : !analyticsReady
                ? "Указать GA4 property ID"
                : !searchConsoleReady
                  ? "Подтвердить сайт в Search Console"
                  : "Google-контур готов",
    },
    actions: {
      googleOauthUrl: "/api/admin/aray/connectors/google/oauth/start",
      promotionUrl: "/admin/promotion",
      analyticsUrl: "/admin/analytics",
    },
    safety:
      "Я читаю данные и готовлю рекомендации. Изменения в рекламе, профиле бизнеса и индексации выполняются только после подтверждения владельца.",
  };
}
