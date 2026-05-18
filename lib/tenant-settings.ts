import "server-only";

type SiteSettingRow = {
  key: string;
  value: string;
};

type TenantWithSettings = {
  settings?: unknown;
};

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
