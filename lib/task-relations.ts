export const TASK_RELATION_ENTITY_TYPES = [
  "TASK",
  "ORDER",
  "LEAD",
  "SUPPORT_INCIDENT",
  "REVIEW",
  "PRODUCT",
  "CLIENT",
  "SUPPLIER",
  "CATEGORY",
  "MARKETPLACE_LISTING",
  "BUSINESS",
  "USER",
] as const;

export type TaskRelationEntityType = (typeof TASK_RELATION_ENTITY_TYPES)[number];

export type NormalizedTaskRelation = {
  entityType: TaskRelationEntityType;
  entityId: string;
  label: string | null;
  href: string | null;
  metadata?: Record<string, unknown>;
};

export const TASK_RELATION_LABELS: Record<TaskRelationEntityType, string> = {
  TASK: "Задача",
  ORDER: "Заказ",
  LEAD: "Лид",
  SUPPORT_INCIDENT: "Обращение",
  REVIEW: "Отзыв",
  PRODUCT: "Товар",
  CLIENT: "Клиент",
  SUPPLIER: "Поставщик",
  CATEGORY: "Категория",
  MARKETPLACE_LISTING: "Объект биржи",
  BUSINESS: "Бизнес",
  USER: "Пользователь",
};

const TASK_RELATION_ALIASES: Record<string, TaskRelationEntityType> = {
  task: "TASK",
  задача: "TASK",
  order: "ORDER",
  заказ: "ORDER",
  lead: "LEAD",
  лид: "LEAD",
  request: "SUPPORT_INCIDENT",
  appeal: "SUPPORT_INCIDENT",
  ticket: "SUPPORT_INCIDENT",
  support: "SUPPORT_INCIDENT",
  обращение: "SUPPORT_INCIDENT",
  review: "REVIEW",
  отзыв: "REVIEW",
  product: "PRODUCT",
  товар: "PRODUCT",
  client: "CLIENT",
  customer: "CLIENT",
  клиент: "CLIENT",
  supplier: "SUPPLIER",
  поставщик: "SUPPLIER",
  category: "CATEGORY",
  категория: "CATEGORY",
  marketplace: "MARKETPLACE_LISTING",
  listing: "MARKETPLACE_LISTING",
  биржа: "MARKETPLACE_LISTING",
  business: "BUSINESS",
  бизнес: "BUSINESS",
  user: "USER",
  пользователь: "USER",
};

export function isTaskRelationEntityType(value: unknown): value is TaskRelationEntityType {
  return (
    typeof value === "string" &&
    TASK_RELATION_ENTITY_TYPES.includes(value.toUpperCase() as TaskRelationEntityType)
  );
}

export function normalizeTaskRelationType(value: unknown): TaskRelationEntityType | null {
  if (!isTaskRelationEntityType(value)) return null;
  return value.toUpperCase() as TaskRelationEntityType;
}

export function normalizeTaskRelationAlias(value: unknown): TaskRelationEntityType | null {
  if (typeof value !== "string") return null;
  const direct = normalizeTaskRelationType(value);
  if (direct) return direct;
  return TASK_RELATION_ALIASES[value.trim().toLowerCase()] ?? null;
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function normalizeTaskRelations(value: unknown): NormalizedTaskRelation[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const relations: NormalizedTaskRelation[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const entityType = normalizeTaskRelationAlias(source.entityType);
    const entityId = cleanString(source.entityId, 128);
    if (!entityType || !entityId) continue;

    const key = `${entityType}:${entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const metadata =
      source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? (source.metadata as Record<string, unknown>)
        : undefined;

    relations.push({
      entityType,
      entityId,
      label: cleanString(source.label, 160),
      href: cleanString(source.href, 260),
      metadata,
    });
  }

  return relations;
}

export function mergeTaskRelations(relations: NormalizedTaskRelation[]) {
  const seen = new Set<string>();
  return relations.filter((relation) => {
    const key = `${relation.entityType}:${relation.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildOrderTaskRelation(orderId: unknown, label?: unknown): NormalizedTaskRelation | null {
  const entityId = cleanString(orderId, 128);
  if (!entityId) return null;
  return {
    entityType: "ORDER",
    entityId,
    label: cleanString(label, 160),
    href: `/admin/orders/${entityId}`,
  };
}
