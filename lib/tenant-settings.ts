import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

type SiteSettingRow = {
  key: string;
  value: string;
};

type TenantWithSettings = {
  settings?: unknown;
};

export function siteSettingWhere(key: string, tenantId = getCurrentTenantId()) {
  return {
    tenantId_key: {
      tenantId,
      key,
    },
  };
}

export function siteSettingCreateData(key: string, value: string, tenantId = getCurrentTenantId()) {
  return {
    tenantId,
    key,
    value,
  };
}

export function getSiteSetting(key: string, tenantId = getCurrentTenantId()) {
  return prisma.siteSettings.findUnique({
    where: siteSettingWhere(key, tenantId),
  });
}

export function upsertSiteSetting(key: string, value: string, tenantId = getCurrentTenantId()) {
  return prisma.siteSettings.upsert({
    where: siteSettingWhere(key, tenantId),
    create: siteSettingCreateData(key, value, tenantId),
    update: { value },
  });
}

export function settingsRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([, item]) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean",
      )
      .map(([key, item]) => [key, String(item)]),
  );
}

export function mergeTenantSettings(
  tenant: TenantWithSettings | null | undefined,
  rows: SiteSettingRow[],
) {
  return {
    ...settingsRecord(tenant?.settings),
    ...Object.fromEntries(rows.map((row) => [row.key, row.value])),
  };
}
