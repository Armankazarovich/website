export function getServiceImageUrls(raw?: string | null) {
  if (!raw) return [];

  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.startsWith("/") || item.startsWith("http://") || item.startsWith("https://"))
    .slice(0, 8);
}
