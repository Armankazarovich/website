import { PrismaClient, Prisma } from "@prisma/client";
import { tenantExtension } from "./tenant-prisma";
import { isTenantFilterEnabled } from "./tenant-context";

// ── Connection pool tuning ──────────────────────────────────────────────────
// Если в DATABASE_URL не заданы параметры пула — добавляем дефолты.
// Это критично для масштабирования: Prisma по умолчанию использует ~10 коннектов,
// на пиках трафика этого не хватает и запросы падают с connection timeout.
// Подробности: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  // Если URL уже содержит connection_limit / pool_timeout — не трогаем.
  if (/[?&](connection_limit|pool_timeout)=/i.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    // BUILD-TIME vs RUNTIME: Next.js при SSG запускает много параллельных
    // рендер-воркеров, каждый создаёт свой PrismaClient. При connection_limit=20
    // и 5-10 воркерах PG быстро исчерпывается (max_connections=100 минус резерв).
    //
    // NEXT_PHASE_BUILD — Next.js выставляет `NEXT_PHASE=phase-production-build`
    // во время next build. В этом режиме используем connection_limit=3.
    //
    // Runtime: 20 коннектов под single Node-процесс достаточно под нагрузку.
    const isBuild =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-production-optimize";
    const defaultLimit = isBuild ? "3" : "20";
    const defaultPoolTimeout = isBuild ? "30" : "20";
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", defaultLimit);
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", defaultPoolTimeout);
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    return url.toString();
  } catch {
    // Если URL невалиден — возвращаем как есть, Prisma сама ругнётся.
    return raw;
  }
}

// В проде логируем warn+error (не только error) — это помогает ловить slow queries
// и проблемы соединения раньше, чем они станут критичными.
const logLevel: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["warn", "error"];

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = buildDatabaseUrl();

// Базовый клиент без extensions (всегда нужен — для миграций, сидов, фоновых задач).
const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
    ...(databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

// ── Multi-tenancy: условная активация фильтрации ────────────────────────────
// Если ENABLE_TENANT_FILTER=1 — оборачиваем клиент в tenantExtension, который
// автоматически добавляет tenantId в where для READ-операций tenant-aware моделей.
//
// По умолчанию (ENABLE_TENANT_FILTER не задан) extension становится no-op,
// клиент работает идентично базовому. Безопасно для деплоя — нет регрессии.
//
// Type cast к PrismaClient: $extends возвращает специальный тип расширенного клиента,
// который функционально совместим с PrismaClient но строго отличается типом.
// Cast допустим — extension не меняет API, только интерсептит запросы.
export const prisma = (
  isTenantFilterEnabled() ? basePrisma.$extends(tenantExtension) : basePrisma
) as unknown as PrismaClient;
