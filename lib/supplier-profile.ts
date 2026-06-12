export function cleanOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function cleanPositiveInt(value: unknown, fallback = 100): number {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : fallback;
}

export function cleanExternalUrl(value: unknown, maxLength = 300): string | null {
  const trimmed = cleanOptionalText(value, maxLength);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function cleanPublicAssetUrl(value: unknown, maxLength = 300): string | null {
  const trimmed = cleanOptionalText(value, maxLength);
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    if (trimmed.includes("..") || trimmed.includes("\\") || trimmed.includes("//")) return null;
    return trimmed;
  }

  return cleanExternalUrl(trimmed, maxLength);
}

export function hasRawValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function supplierStorefrontHref(slug: string): string {
  return `/vendors/${slug}`;
}

export function isPublicSupplierStorefront(supplier: {
  active: boolean;
  status: string;
  storefrontEnabled: boolean;
}): boolean {
  return supplier.active && supplier.status === "ACTIVE" && supplier.storefrontEnabled;
}
