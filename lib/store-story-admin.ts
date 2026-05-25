import "server-only";

const STORY_TYPES = new Set(["IMAGE", "VIDEO", "LIVE"]);
const ENTITY_TYPES = new Set(["", "product", "service", "promotion", "review", "company", "general"]);
const RELATION_ENTITY_TYPES = new Set(["product", "service", "promotion", "review", "company"]);

export const storyRelationsInclude = {
  relations: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 1000) : fallback;
}

function nullableText(value: unknown, max = 1000) {
  const cleaned = typeof value === "string" ? value.trim().slice(0, max) : "";
  return cleaned || null;
}

function safeActionUrl(value: unknown) {
  const cleaned = nullableText(value, 500);
  if (!cleaned) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned;
  if (/^https:\/\/[^\s]+$/i.test(cleaned)) return cleaned;
  if (/^tel:\+?[0-9()\-\s]+$/i.test(cleaned)) return cleaned.replace(/\s+/g, "");
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(cleaned)) return cleaned;
  return null;
}

function safeMediaUrl(value: unknown) {
  const cleaned = nullableText(value, 500);
  if (!cleaned) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned;
  if (/^(blob:|data:image\/|data:video\/)/i.test(cleaned)) return cleaned;
  if (/^https:\/\/[^\s]+$/i.test(cleaned)) return cleaned;
  return null;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function int(value: unknown, fallback = 100) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function nullableDate(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function storyData(body: any) {
  const type = STORY_TYPES.has(body?.type) ? body.type : "IMAGE";
  const entityTypeRaw = text(body?.entityType).toLowerCase();
  const entityType = ENTITY_TYPES.has(entityTypeRaw) && entityTypeRaw !== "general" ? entityTypeRaw : null;
  const title = text(body?.title).slice(0, 140);

  return {
    type,
    title: title || "Новая сторис",
    subtitle: nullableText(body?.subtitle, 180),
    description: nullableText(body?.description, 600),
    mediaUrl: safeMediaUrl(body?.mediaUrl),
    posterUrl: safeMediaUrl(body?.posterUrl),
    ctaLabel: nullableText(body?.ctaLabel, 80),
    ctaUrl: safeActionUrl(body?.ctaUrl),
    entityType,
    entityId: entityType ? nullableText(body?.entityId, 160) : null,
    placement: text(body?.placement, "site").slice(0, 80) || "site",
    active: bool(body?.active, true),
    pinned: bool(body?.pinned, false),
    sortOrder: int(body?.sortOrder, 100),
    startsAt: nullableDate(body?.startsAt),
    endsAt: nullableDate(body?.endsAt),
  };
}

function relationData(item: any, sortOrder: number) {
  const entityType = text(item?.entityType).toLowerCase();
  const entityId = text(item?.entityId, "").slice(0, 160);
  if (!RELATION_ENTITY_TYPES.has(entityType) || !entityId) return null;

  return {
    entityType,
    entityId,
    label: nullableText(item?.label, 180),
    image: safeMediaUrl(item?.image),
    ctaUrl: safeActionUrl(item?.ctaUrl),
    sortOrder: int(item?.sortOrder, sortOrder),
  };
}

function relationKey(relation: { entityType: string; entityId: string }) {
  return `${relation.entityType}:${relation.entityId}`;
}

export function buildStoryWrite(body: any) {
  const data = storyData(body);
  const incoming = Array.isArray(body?.relations) ? body.relations : [];
  const relations = incoming
    .map((item: any, index: number) => relationData(item, (index + 1) * 10))
    .filter(Boolean) as Array<ReturnType<typeof relationData> & {}>;
  const seen = new Set<string>();
  const uniqueRelations = relations.filter((relation) => {
    const key = relationKey(relation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (data.entityType && data.entityId && RELATION_ENTITY_TYPES.has(data.entityType)) {
    const primaryKey = relationKey({ entityType: data.entityType, entityId: data.entityId });
    if (!seen.has(primaryKey)) {
      uniqueRelations.unshift({
        entityType: data.entityType,
        entityId: data.entityId,
        label: null,
        image: null,
        ctaUrl: data.ctaUrl,
        sortOrder: 0,
      });
    }
  }

  return { data, relations: uniqueRelations };
}
