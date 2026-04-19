# ПилоРус — Дорожная карта масштабирования

> Цель: выдержать миллионы пользователей + мультитенантность (биржа пиломатериалов для любого поставщика).
> Последнее обновление: 19.04.2026

---

## 🎯 Видение

ПилоРус → экосистема → SaaS-платформа для ВСЕЙ отрасли.
Каждый поставщик получает свой магазин на нашей платформе: supplier1.pilorus.ru, supplier2.pilorus.ru.
Один код — тысячи тенантов. Биржа сравнивает, рейтинг, отзывы.

---

## 📊 Текущее состояние (19.04.2026)

**Что работает крепко:**
- Next.js 14 App Router + TypeScript
- Prisma 5 + PostgreSQL (44 модели)
- NextAuth 5 beta (JWT + PrismaAdapter)
- 73 страницы + 77 API routes
- SEO готов (robots, sitemap, schema.org)
- Security headers на месте (CSP, HSTS)
- CI/CD через GitHub Actions с auto-rollback

**Что ломается на росте:**
1. ❌ Нет multi-tenancy (tenantId отсутствует во всех моделях)
2. ❌ Файлы на диске (`fs.writeFile` в `/public/uploads/`) — не переживут горизонтальное масштабирование
3. ❌ DB connection pool = 10 (дефолт Prisma) — на пиках упадёт
4. ❌ Session в БД через PrismaAdapter — не Redis, перегрузит PostgreSQL
5. ❌ Bundle раздут: Fabric (~500KB) + ExcelJS (~2MB) + googleapis (~10MB unpacked) в основном chunk
6. ❌ Кэширование несогласованное: force-dynamic на одном endpoint, случайный кэш на других
7. ❌ VPS 3GB RAM = потолок (билд съедает всё)
8. ❌ Нет CDN (картинки идут с того же сервера)
9. ❌ NextAuth 5 beta в проде (риск breaking changes)
10. ❌ Нет database partitioning (Order, ArayTokenLog, ArayMessage вырастут на миллионы)

---

## 🗺️ Дорожная карта — 4 этапа

### ЭТАП 1: КОД-ОПТИМИЗАЦИИ (1-2 сессии, БЕЗ новой инфры)
> Всё что можно сделать ПРЯМО СЕЙЧАС, без трат на сервера.
> Результат: сайт готов принять 10x трафика без падения.

**1.1 Prisma connection pooling**
- `lib/prisma.ts` — добавить pool config через env
- DATABASE_URL → `?connection_limit=20&pool_timeout=20&connect_timeout=10`
- Добавить `log: ["warn", "error"]` вместо `["error"]` для prod диагностики

**1.2 Индексы БД (дополнительно к существующим)**
- User: `@@index([email])`, `@@index([phone])` — для быстрого поиска
- Product: `@@index([slug])`, `@@index([name])` — SEO + поиск
- Order: `@@index([guestPhone])`, `@@index([telegramMessageId])` — webhook lookups
- Review: `@@index([userId, createdAt])` — мои отзывы в кабинете
- PushSubscription: `@@index([endpoint])` — дедупликация

**1.3 force-dynamic консистентность**
- Пройтись по всем `app/api/admin/**/*.ts`
- Добавить `export const dynamic = "force-dynamic"` единообразно
- Или вынести в `app/api/admin/layout.ts` (если Next.js поддерживает)

**1.4 Bundle оптимизация**
- `@react-pdf/renderer` → уже external, OK
- Fabric → dynamic import только в редакторе изображений
- ExcelJS → dynamic import только в экспорте
- googleapis → external в serverComponentsExternalPackages
- `next.config.js`: проверить `output: "standalone"` для Docker-ready

**1.5 tenantId подготовка (без активации)**
- Добавить поле `tenantId String @default("pilorus")` в ключевые модели: User, Product, Order, Category, Review, Post
- Единичный tenant пока = "pilorus"
- Индексы с tenantId в начале: `@@index([tenantId, createdAt])`
- Это подготовка — когда добавим второго клиента, миграция будет бесшовной

**1.6 Middleware для tenant detection (скелет)**
- `middleware.ts` в корне — читает hostname, пишет в request headers tenant
- `supplier1.pilo-rus.ru` → tenant: "supplier1"
- `pilo-rus.ru` → tenant: "pilorus" (дефолт)
- Пока просто логирует, реальное разделение позже

**1.7 Health checks и мониторинг**
- `/api/health` уже есть → добавить DB latency, Redis latency (когда будет), diskspace
- UptimeRobot — настроить Арману (external monitoring, бесплатно)
- Sentry для error tracking — `@sentry/nextjs` пакет

**Деплоев в этапе:** 3-4 (один коммит = одна большая тема)
**Сроки:** 1-2 сессии.
**Риск:** низкий (всё обратно-совместимо).

---

### ЭТАП 2: ИНФРАСТРУКТУРА (VPS + S3 + CDN + Redis)
> Апгрейд железа и отделение слоёв.
> Результат: сайт готов к 100k DAU + безопасное горизонтальное масштабирование.

**2.1 VPS upgrade (Beget)**
- Текущий: 3GB RAM, 50GB диск
- Цель: 8GB RAM, 160GB NVMe SSD, 4 vCPU
- Бэкап → миграция → DNS → верификация

**2.2 S3-совместимое хранилище (Yandex Object Storage)**
- Тариф: ~1₽/GB/месяц + трафик
- Bucket: `pilorus-uploads` (публичный read, приватный write)
- Папки: `/products/`, `/reviews/`, `/avatars/`, `/categories/`, `/news/`, `/documents/`
- Миграция: скрипт `scripts/migrate-uploads-to-s3.js` (перенос + обновление URL в БД)
- Код: `lib/storage.ts` — абстракция (upload, delete, getUrl) через AWS SDK
- Все `fs.writeFile` → `storage.upload()`

**2.3 CDN (Cloudflare Free tier)**
- Подключение через DNS (nameservers на Cloudflare)
- Правила кэширования: статика → 1 год, HTML → 5 минут, API → no-cache
- Free SSL (уже есть через Beget, но Cloudflare тоже даёт)
- DDoS protection бонусом
- Page Rules: `cdn.pilo-rus.ru/*` → принудительный кэш

**2.4 Redis (для сессий + кэш)**
- Managed Redis на Beget или Yandex Cloud
- Сессии NextAuth → Redis (быстрее БД в 100+ раз)
- `lib/redis.ts` — singleton client
- Использовать как кэш для hot data (featured products, categories, settings)
- TTL: settings 1h, categories 5min, featured 10min

**2.5 pgBouncer (connection pooling на уровне инфры)**
- Связка: App → pgBouncer → PostgreSQL
- Transaction mode (Prisma support)
- Позволяет 10x больше одновременных подключений

**2.6 Managed PostgreSQL (опционально, если рост)**
- Beget managed PG или Yandex Cloud PostgreSQL
- Автобэкапы, replication, failover
- Стоит дороже, но снимает головняк

**Стоимость этапа (ориентировочно в ₽/мес):**
- VPS upgrade: +500-1000
- S3: ~200 (10GB uploads)
- CDN: 0 (Cloudflare Free)
- Redis: +500 (managed)
- pgBouncer: 0 (self-hosted)
- **Итого: ~1500-2000 ₽/мес дополнительно**

**Сроки:** 2-3 сессии + ручная работа Армана (DNS, тарифы).
**Риск:** средний (миграция данных требует downtime окно).

---

### ЭТАП 3: MULTI-TENANCY (SaaS-архитектура)
> Превращаем ПилоРус в платформу для других поставщиков.
> Результат: можем продавать магазин-под-ключ любому лесопромышленнику.

**3.1 Tenant model**
- `model Tenant { id, slug, name, plan, ownerId, domain, customDomain, settings Json, createdAt, suspended }`
- Plans: FREE (1 категория, 50 товаров), PRO (unlimited + features), ENTERPRISE (whitelabel)
- Billing model: `model Subscription { tenantId, plan, status, expiresAt, stripeId }`

**3.2 Активация tenantId во всех моделях**
- Миграция существующих данных: все записи → tenantId = "pilorus"
- Middleware определяет tenant по hostname/subdomain
- Prisma middleware добавляет `where: { tenantId }` автоматически
- Или: Row Level Security (RLS) в PostgreSQL — более надёжно

**3.3 Subdomain routing**
- `middleware.ts` парсит `supplier1.pilorus.ru`
- Next.js rewrites: все запросы идут в одно приложение
- Динамические метаданные: title, favicon, brandName из БД по tenantId

**3.4 Custom domains**
- Tenant может подключить свой домен (woodworks.ru → наш сервер)
- SSL через Let's Encrypt на fly (автоматически)
- Каждый тенант = whitelabel вариант ПилоРус

**3.5 Tenant admin UI**
- `/admin/tenants` (для SUPER_ADMIN)
- CRUD тенантов, смена тарифов, просмотр статистики
- Suspend/activate (если не платит)

**3.6 Биржа**
- `/marketplace` — публичный список всех активных тенантов
- Фильтры: регион, типы пиломатериалов, рейтинг
- Переход на конкретный магазин
- Сравнение цен между поставщиками (агрегация)

**Сроки:** 4-6 сессий (это большая работа).
**Риск:** высокий (миграция активной БД на multi-tenant).

---

### ЭТАП 4: ENTERPRISE-УРОВЕНЬ (когда реально миллионы)
> Готовность к росту в 100-1000x от текущего.

**4.1 Database partitioning**
- `Order` по createdAt — partition по месяцам (старые данные на холодное хранилище)
- `ArayMessage`, `ArayTokenLog` — то же
- PostgreSQL native partitioning + pg_partman

**4.2 Read replicas**
- Master для write, replicas для read-heavy (каталог, поиск)
- Prisma read replicas preview feature

**4.3 Full-text search (Meilisearch / Elasticsearch)**
- Поиск по товарам, отзывам, постам вне PostgreSQL
- Мгновенный поиск с опечатками, синонимами

**4.4 Job queue (BullMQ + Redis)**
- Тяжёлые задачи: email, push, PDF генерация, import/export — в очередь
- Worker процессы отдельно от web
- Retry, priority, scheduled jobs

**4.5 Горизонтальное масштабирование**
- Docker/Kubernetes (или Fly.io, Railway)
- Load balancer перед N инстансами Next.js
- Sticky sessions не нужны (stateless + Redis sessions)

**4.6 Monitoring & Observability**
- Prometheus + Grafana (или Plausible для web analytics)
- Distributed tracing (OpenTelemetry)
- Error tracking (Sentry)
- Log aggregation (Logflare / Axiom)

**4.7 Security hardening**
- WAF (Cloudflare Pro)
- Rate limiting per-tenant
- DDoS mitigation
- Security audit (external pentest)

**Сроки:** 2026-2027 год (когда будет реальная нагрузка).
**Риск:** низкий (реактивная оптимизация).

---

## 🚦 С ЧЕГО НАЧИНАТЬ

### Рекомендация: ЭТАП 1 → проверить метрики → ЭТАП 2 → ЭТАП 3

**Почему не сразу инфра?**
- Этап 1 = дешевле (0 ₽ дополнительно)
- Даёт 10x запас прочности на текущем сервере
- Обратно-совместимо (если что — откатили)
- Готовит код к мультитенантности (tenantId поля)

**Когда нужна инфра (Этап 2)?**
- Когда билд упирается в память (уже было)
- Когда Google PageSpeed < 85 (CDN нужен)
- Когда БД 100k+ заказов (pgBouncer обязателен)

**Когда Этап 3 (multi-tenancy)?**
- Когда первый реальный клиент-поставщик согласен платить
- НЕ раньше — преждевременная оптимизация = потеря времени

---

## 📋 Чеклист прогресса

### Этап 1 — Код (цель: завершить за 2 сессии)
- [ ] 1.1 Prisma connection pooling
- [ ] 1.2 Дополнительные индексы БД
- [ ] 1.3 force-dynamic консистентность (все admin API)
- [ ] 1.4 Bundle оптимизация (dynamic imports)
- [ ] 1.5 tenantId поля во всех моделях (default "pilorus")
- [ ] 1.6 Middleware для tenant detection (скелет)
- [ ] 1.7 UptimeRobot + Sentry

### Этап 2 — Инфра (цель: 3 сессии + ручная работа Армана)
- [ ] 2.1 VPS upgrade (Beget 8GB)
- [ ] 2.2 S3 (Yandex Object Storage)
- [ ] 2.3 CDN (Cloudflare Free)
- [ ] 2.4 Redis (managed)
- [ ] 2.5 pgBouncer

### Этап 3 — Multi-tenancy (цель: 5 сессий)
- [ ] 3.1 Tenant model + Subscription
- [ ] 3.2 Активация tenantId везде
- [ ] 3.3 Subdomain routing
- [ ] 3.4 Custom domains
- [ ] 3.5 Tenant admin UI
- [ ] 3.6 Биржа

### Этап 4 — Enterprise (когда будет нагрузка)
- [ ] 4.1 Database partitioning
- [ ] 4.2 Read replicas
- [ ] 4.3 Full-text search (Meilisearch)
- [ ] 4.4 Job queue (BullMQ)
- [ ] 4.5 Kubernetes/Fly.io
- [ ] 4.6 Monitoring stack
- [ ] 4.7 Security audit

---

## 💰 Бюджет масштабирования (ориентировочно)

| Этап | Ежемесячно | Разово |
|------|-----------|--------|
| 1 | 0 ₽ (только код) | 0 ₽ |
| 2 | +1500-2000 ₽ (VPS, S3, Redis) | 0 ₽ |
| 3 | +500 ₽ (Stripe/ЮKassa для подписок) | 0 ₽ |
| 4 | +10000-50000 ₽ (когда реальная нагрузка) | 0 ₽ |

---

## 🔒 Безопасность при росте

- Row Level Security (RLS) в PostgreSQL — изоляция tenants на уровне БД
- Rate limiting per-IP, per-tenant, per-user
- Audit log (кто что изменил, когда)
- 2FA для админов
- Backup стратегия: daily + weekly + monthly retention
- Disaster recovery план (восстановление за 1 час)

---

## 📚 Технологии которые добавим

| Технология | Зачем | Когда |
|-----------|-------|------|
| AWS SDK / @aws-sdk/client-s3 | S3 uploads | Этап 2 |
| ioredis | Redis client | Этап 2 |
| @sentry/nextjs | Error tracking | Этап 1 |
| Meilisearch | Full-text search | Этап 4 |
| bullmq | Job queue | Этап 4 |
| @opentelemetry/* | Tracing | Этап 4 |
| stripe / юkassa | Billing for tenants | Этап 3 |

---

**Автор:** ARAY (Claude) для Армана.
**Дата создания:** 19.04.2026.
**Принцип:** Делаем поэтапно. Измеряем. Учимся. Растём.
