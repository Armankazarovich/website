/**
 * tenant-prisma.ts — Prisma Client extension для авто-фильтрации по tenantId.
 *
 * Стратегия:
 * - Extension определён, но НЕ применяется к основному prisma клиенту по умолчанию.
 * - Включается через ENABLE_TENANT_FILTER=1 (см. lib/tenant-context.ts).
 * - Работает на уровне READ-операций (findMany, findFirst, findUnique, count, aggregate, groupBy).
 * - WRITE-операции (create, update, delete) пока НЕ трогаем — это требует более тонкой работы:
 *   create — нужно автоматически проставлять tenantId в data
 *   update/delete — нужно фильтровать where по tenantId
 *   Эти операции добавим в Stage 4 после стабилизации READ.
 *
 * Безопасность:
 * - Если ENABLE_TENANT_FILTER не установлен — extension становится no-op.
 * - Только модели из TENANT_AWARE_MODELS фильтруются.
 * - tenantId берётся из getCurrentTenantId() — при отсутствии контекста дефолт "pilorus".
 */

import { Prisma } from "@prisma/client";
import {
  getCurrentTenantId,
  isTenantFilterEnabled,
  TENANT_AWARE_MODELS,
} from "./tenant-context";

const FILTERED_OPERATIONS = new Set<string>([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

/**
 * Преобразует имя модели Prisma (PascalCase) в camelCase для сравнения с TENANT_AWARE_MODELS.
 * Пример: "User" → "user", "DeliveryRate" → "deliveryRate".
 */
function modelKey(model: string | undefined): string {
  if (!model) return "";
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Prisma extension для автоматической фильтрации по tenantId.
 *
 * Применение:
 *   const tenantClient = basePrisma.$extends(tenantExtension);
 *
 * После этого все findMany/findFirst/etc на TENANT_AWARE_MODELS будут
 * автоматически дополняться `where: { tenantId: <current> }`.
 *
 * Если where уже содержит tenantId — НЕ перезаписываем (поддерживаем явное переопределение).
 */
export const tenantExtension = Prisma.defineExtension({
  name: "tenant-filter",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // 1. Если фильтр выключен — пропускаем.
        if (!isTenantFilterEnabled()) {
          return query(args);
        }

        // 2. Если модель не tenant-aware — пропускаем.
        if (!TENANT_AWARE_MODELS.has(modelKey(model))) {
          return query(args);
        }

        // 3. Если операция не фильтруемая — пропускаем.
        if (!FILTERED_OPERATIONS.has(operation)) {
          return query(args);
        }

        // 4. Добавляем tenantId в where (если его там ещё нет).
        const tenantId = getCurrentTenantId();
        const a = (args || {}) as { where?: Record<string, unknown> };
        const existingWhere = (a.where || {}) as Record<string, unknown>;

        // Если в where уже есть tenantId — оставляем как есть (явное переопределение).
        if ("tenantId" in existingWhere) {
          return query(args);
        }

        const newArgs = {
          ...a,
          where: { ...existingWhere, tenantId },
        };
        return query(newArgs);
      },
    },
  },
});
