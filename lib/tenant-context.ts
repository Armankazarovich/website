/**
 * tenant-context.ts — Multi-tenancy context layer (Stage 3, день 1, 27.04.2026).
 *
 * Цели:
 * 1. Дать helper getCurrentTenantId() который работает в Server Components,
 *    API routes и middleware-обёрнутых хендлерах.
 * 2. Дать tenantWhere() — явный helper для добавления tenantId в Prisma where.
 * 3. Дать withTenant(tenantId, fn) — обёртка для случаев когда headers() недоступны
 *    (cron, фоновые задачи, инициализация).
 * 4. Дать isTenantFilterEnabled() — флаг активации auto-фильтрации в Prisma extension.
 *
 * ВАЖНО:
 * - middleware.ts (Edge Runtime) ставит x-tenant-id header в request.
 *   AsyncLocalStorage в Edge не работает, но header работает везде.
 * - В Server Components и API routes используем next/headers().get("x-tenant-id").
 * - AsyncLocalStorage используется как fallback (фоновые задачи, тесты).
 * - По умолчанию ENABLE_TENANT_FILTER не установлен → фильтрация выключена,
 *   все запросы продолжают работать как раньше. Безопасный деплой.
 */

export const DEFAULT_TENANT_ID = "pilorus";

// AsyncLocalStorage работает только в Node.js runtime (API routes, Server Components).
// В Edge runtime и client bundle модуль "async_hooks" отсутствует — статический import
// крашил бы webpack build. Используем lazy require + try/catch.
// next.config.js + webpack fallback "async_hooks: false" гарантирует что в client bundle
// require("async_hooks") вернёт пустой модуль (no-op), не падая.
type StorageLike = {
  getStore: () => { tenantId: string } | undefined;
  run: <T>(store: { tenantId: string }, fn: () => T) => T;
};

let _storage: StorageLike | null = null;
let _storageProbed = false;

function getStorage(): StorageLike | null {
  if (_storageProbed) return _storage;
  _storageProbed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("async_hooks");
    if (mod && typeof mod.AsyncLocalStorage === "function") {
      _storage = new mod.AsyncLocalStorage() as StorageLike;
    }
  } catch {
    // async_hooks недоступен (Edge runtime / client bundle) — OK,
    // getCurrentTenantId упадёт на fallback через next/headers.
  }
  return _storage;
}

/**
 * Запустить функцию в контексте конкретного tenant.
 * Используй для фоновых задач и тестов где нет HTTP request.
 * В client bundle / Edge runtime — fallback на прямой вызов без storage (контекст не сохраняется).
 */
export function withTenant<T>(tenantId: string, fn: () => T): T {
  const storage = getStorage();
  if (!storage) {
    // Без AsyncLocalStorage просто запускаем функцию — контекст не пробрасывается.
    // Это допустимо в client/edge т.к. там tenant определяется через headers().
    return fn();
  }
  return storage.run({ tenantId }, fn);
}

/**
 * Получить tenantId из текущего request context.
 * Порядок поиска: AsyncLocalStorage → next/headers → дефолт "pilorus".
 *
 * Безопасно вызывать из любого места — если контекста нет, вернётся "pilorus".
 */
export function getCurrentTenantId(): string {
  // 1. AsyncLocalStorage (фоновые задачи, явный withTenant) — только server runtime.
  const storage = getStorage();
  const fromStorage = storage?.getStore()?.tenantId;
  if (fromStorage) return fromStorage;

  // 2. Next.js headers() — работает в Server Components и API routes (Node.js runtime)
  // Динамический require чтобы lib не падал в Edge runtime контексте.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { headers } = require("next/headers");
    const h = headers();
    const fromHeader = h.get("x-tenant-id");
    if (fromHeader && /^[a-z0-9-]{2,40}$/.test(fromHeader)) return fromHeader;
  } catch {
    // headers() недоступен (например, во время build или в edge runtime) — ОК.
  }

  return DEFAULT_TENANT_ID;
}

/**
 * Утилита для добавления tenantId в Prisma where.
 * Используется для постепенной миграции запросов до полной активации extension.
 *
 * Пример:
 *   const orders = await prisma.order.findMany({
 *     where: { ...tenantWhere(), status: "NEW" }
 *   });
 *
 * После активации extension (ENABLE_TENANT_FILTER=1) этот helper можно
 * удалить и оставить запросы без tenantId — extension добавит его автоматически.
 */
export function tenantWhere(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { tenantId: getCurrentTenantId(), ...extra };
}

/**
 * Проверка активации auto-фильтрации в Prisma extension.
 * По умолчанию ENABLE_TENANT_FILTER не установлен → фильтрация выключена.
 * Включается явным заданием ENABLE_TENANT_FILTER=1 в env.
 *
 * Пока ВСЕ существующие данные имеют tenantId="pilorus" (default),
 * включение фильтрации НЕ приведёт к потере данных для дефолтного тенанта.
 * Но опасно если запрос идёт без request context — тогда вернётся "pilorus" (дефолт).
 */
export function isTenantFilterEnabled(): boolean {
  return process.env.ENABLE_TENANT_FILTER === "1";
}

/**
 * Список Prisma моделей с колонкой tenantId.
 * Используется в tenant-prisma extension для определения какие операции фильтровать.
 *
 * Источник правды: prisma/schema.prisma (поиск `tenantId` + `@@index([tenantId])`).
 * При добавлении новой tenant-aware модели — обновить здесь.
 */
export const TENANT_AWARE_MODELS = new Set<string>([
  "user",
  "category",
  "product",
  "order",
  "review",
  "promotion",
  "deliveryRate",
  "siteSettings",
  "newsletterSubscriber",
  "promoCode",
  "partnershipLead",
  "expense",
  "task",
  "lead",
  "workflow",
  "post",
  "service",
  "documentTemplate",
  "reportSchedule",
  "crmHint",
  "nicheTemplate",
]);
