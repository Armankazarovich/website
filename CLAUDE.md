# ПилоРус — CRM/Сайт — База знаний для Claude

> Последнее обновление: 13.04.2026

---

## 👤 АРМАН — как работать с основателем

Арман — основатель ПилоРус. Визионер, не технарь. Вот правила работы с ним:

- **Он даёт идею и видение** — ты реализуешь технически. Не жди от него технических подсказок.
- **Проверяй ВСЁ сам** — не показывай результат пока не убедился что работает 10/10. Арман не должен находить баги — это твоя работа.
- **Без косяков** — если он описал проблему или показал скриншот, проверь ВСЕ связанные места, не только то что он показал. Предугадывай проблемы.
- **Скорость + качество** — Арман ценит быстрый темп ("газуй"), но без потери качества. Лучше чуть дольше, но идеально.
- **Не переспрашивай лишнего** — если идея понятна, делай. Арман занят, его время дорого.
- **Общение** — прямое, тёплое, без формальностей. Он называет тебя "брат". Он экспрессивный и честный — если что-то не так, скажет прямо.
- **Перфекционизм** — "я не хочу 100 раз одно и тоже проходить". Каждая задача должна быть сделана правильно с первого раза.
- **Двойной путь** — всегда помни про sync между D:\ПилоРус\website и D:\pilorus\website.
- **Сессии** — Арман открывает новый чат каждые 1.5-2 часа. ЭТО НОРМАЛЬНО. Перед закрытием сессии ОБЯЗАТЕЛЬНО: обнови CLAUDE.md (что сделано, что осталось, какие баги). Предупреди Армана когда контекст заканчивается — НЕ тяни до потери качества. Лучше 5 коротких сессий по 1.5ч = 5 свежих голов чем 1 марафон с косяками.
- **MD = мозг** — CLAUDE.md это единственный способ передать знания между сессиями. Обновляй КАЖДЫЙ раз. Без исключений.

---

## ⚡ ОБЯЗАТЕЛЬНО ПРИ СТАРТЕ КАЖДОЙ СЕССИИ

1. **Прочитай `ROADMAP.md`** — там чеклисты всех фаз. Продолжай с первого незавершённого пункта.
2. **Не начинай новые фичи** пока Фаза 0 (Полировка) не завершена на 100%.
3. **Обновляй чеклисты** — после каждой выполненной задачи ставь `[x]` в ROADMAP.md.
4. **Единые стили** — используй glass-классы (`.glass-popup`, `.glass-card`, `.glass-control`, `.glass-pill`) вместо хардкод rgba. См. `app/globals.css`.
5. **TypeScript** — session.user типизирован через `types/next-auth.d.ts`. НЕ использовать `as any` для session.
6. **ARAY экономика** — модели выбираются автоматически (`lib/aray-router.ts`): Sonnet 4.6 основная (90% задач), Opus 4.6 для сложного анализа. Haiku убран — Арай премиум ассистент.
7. **Дух ARAY** — свет, правда, честность, любовь, внимание, отзывчивость, осознанность. Зашито в промпты (`lib/aray-agent.ts`).
8. **Двойной путь** — файловые тулы видят `D:\ПилоРус\website`, git-репа в `D:\pilorus\website`. Синхронизируй через node.js скрипт (CMD не работает с кириллицей).

---

## 🗂️ Расположение проекта

```
D:\pilorus\                              ← ГЛАВНАЯ ПАПКА (всегда работаем здесь)
├── website\                             ← КОД САЙТА (этот репозиторий)
├── scripts\
│   ├── backup.js                        ← Скрипт авто-бэкапов
│   ├── apply-belarus-changes.js         ← Разовый скрипт изменений клиента Беларусь (выполнен)
│   ├── fix-hours.js                     ← Разовый скрипт режима работы (выполнен)
│   └── generate-report.py              ← Python скрипт PDF отчёта (py -3 generate-report.py)
├── backups\                             ← Бэкапы (current + previous)
├── reports\                             ← PDF отчёты для клиентов
│   └── belarus-changes-report.pdf       ← Отчёт по изменениям для клиента (29.03.2026)
└── docs\                                ← Документы, брендбук, сертификат
```

## 🔄 Workflow разработки (ОБЯЗАТЕЛЬНО следовать)

```
ШАГ 1 — ЛОКАЛЬНО
  Вносим изменения в D:\pilorus\website
  Тестируем: localhost:3000 (npm run dev)
  Проверяем curl/snapshot все затронутые страницы

ШАГ 2 — ПОДТВЕРЖДЕНИЕ
  Показываем результат пользователю (скриншот или curl вывод)
  Ждём "ок, деплоим"

ШАГ 3 — БЭКАП + ДЕПЛОЙ
  npm run backup                    ← создаёт бэкап (current + previous)
  git add [конкретные файлы]
  git commit -m "feat: ..."
  npm run deploy                    ← push + ждёт Actions + тестирует прод + пишет лог
    ИЛИ вручную:
  git push origin main              ← сайт обновится через ~2-3 мин (build + data-migrate)

ШАГ 4 — ПРОВЕРКА ПРОДАКШНА (ОБЯЗАТЕЛЬНО, БЕЗ ИСКЛЮЧЕНИЙ)
  ⚠️  ДЕПЛОЙ НЕ СЧИТАЕТСЯ ЗАВЕРШЁННЫМ БЕЗ ЭТОГО ШАГА

  Проверить через curl или npm run deploy:
  - Все изменённые страницы отвечают HTTP 200
  - Новый контент присутствует в HTML ответе
  - Изменения БД применились (data-migrate запустился)
  - Нет регрессий (старый контент не сломан)

  Если что-то не так — сразу исправить и задеплоить снова.
  Не сообщать пользователю "готово" пока прод не проверен.
```

### ⚠️ ПРАВИЛА КОТОРЫЕ НЕЛЬЗЯ НАРУШАТЬ

1. **Никогда не говорить "задеплоено" без проверки прода** — проверяем curl/snapshot обязательно
2. **Изменения БД ≠ изменения кода** — data-migrate.ts применяет данные на продакшн при деплое
3. **Добавлять новые data-миграции в prisma/data-migrate.ts** — все idempotent (проверяют перед изменением)
4. **Деплой лог** автоматически пишется в D:\pilorus\docs\DEPLOYMENTS.md при npm run deploy

## 💾 Система бэкапов

- Скрипт: `D:\pilorus\scripts\backup.js`
- Команда: `npm run backup` (из папки website) или `node D:/pilorus/scripts/backup.js`
- Всегда хранит **2 версии**: `backup-current-ДАТА` + `backup-previous-ДАТА`
- Содержимое zip: весь код БЕЗ node_modules, .next, .env
- JSON экспорт БД: категории, товары, заказы, пользователи, настройки
- VPS снапшот: управляет пользователь вручную в панели Beget (не автоматизировано)

## 🗺️ Дорожная карта (Roadmap)

### Ближайшие задачи
- Аналитика с фильтром дат (дашборд, Excel/PDF экспорт)
- Права сотрудников (гибкие permissions)
- Мониторинг `/admin/monitor` (health check БД, Telegram, Email, Push)

### Средний приоритет
- Яндекс.Метрика — подключение через настройки
- Яндекс.Маркет — YML фид `/api/yandex-market.xml`
- SEO + Яндекс.Вебмастер верификация

### Долгосрочные (SaaS)
- ЭДО (Диадок/СБИС) — электронный документооборот
- Склад и инвентаризация — учёт остатков, приход/расход
- Себестоимость — реальная наценка с учётом расходов
- Мультитенантность — один код, много магазинов

---

## Стек

- **Next.js 14** App Router, TypeScript
- **Prisma** + PostgreSQL (localhost:5432, БД: `pilorus`)
- **Tailwind CSS** + shadcn/ui компоненты
- **@react-pdf/renderer** — генерация PDF счетов (WOFF шрифты, не TTF)
- **nodemailer** — email уведомления (SMTP Beget)
- **Telegram Bot API** — уведомления + смена статусов через кнопки
- **web-push** — push-уведомления через VAPID
- **bcryptjs** — хеширование паролей

## Деплой

- GitHub → GitHub Actions → VPS (автодеплой при пуше в `main`)
- URL: `https://pilo-rus.ru`
- Build script: `"build": "prisma db push --accept-data-loss && next build"` — автомигрирует схему при каждом деплое
- При изменении схемы Prisma НИКОГДА не использовать `migrate dev` (интерактивный), только `db push`
- После пуша ждать ~2 мин до завершения деплоя
- **SCP оптимизация**: `exclude: "node_modules,.next,*.log"` — деплой ~2 мин вместо 14+ мин (было 500MB → стало 5MB)
- **concurrency**: `cancel-in-progress: true` — новый пуш отменяет предыдущий зависший деплой
- ⚠️ Если деплой завис >5 мин — пушим пустой коммит или исправление, старый деплой отменится автоматически

---

## Структура проекта

```
app/
  admin/
    page.tsx             — Дашборд (серверный + AutoRefresh каждые 60s)
                           выручка = totalAmount + deliveryCost (без CANCELLED)
                           показывает счётчик "Отменено" отдельно
    layout.tsx           — Auth guard + AdminShell + обновляет lastActiveAt при каждом заходе
    orders/
      page.tsx           — Список заказов (deletedAt: null)
      orders-client.tsx  — Поиск, фильтр статуса, bulk soft-delete, CSV, AutoRefresh 30s
      new/page.tsx       — Создание заказа по телефону
                           (saleUnit logic, deliveryCost + калькулятор)
      trash/
        page.tsx             — Корзина (deletedAt: { not: null })
        trash-actions.tsx    — Восстановить (PUT) / Удалить навсегда (DELETE?permanent=true)
        clear-trash-button.tsx — Кнопка "Очистить корзину" (ADMIN only)
      [id]/
        page.tsx         — Карточка заказа
        delete-button.tsx — Soft delete (без ?permanent)
    delivery/
      page.tsx           — Доставка: активные + самовывоз + архив, AutoRefresh 30s
                           ARCHIVE_STATUSES = [DELIVERED, COMPLETED, CANCELLED]
      delivery-status-select.tsx — Смена статуса (включая COMPLETED)
      rates/
        page.tsx         — Тарифы: калькулятор объёма + CRUD
    products/
      page.tsx           — Список товаров (серверный)
      products-client.tsx — Поиск + фильтр по категории
    staff/
      page.tsx           — Список сотрудников (include lastActiveAt)
      staff-list.tsx     — Карточки с онлайн-статусом, редактирование, удаление
                           🟢 Онлайн (<5 мин) / 🟡 X мин назад / ⚫ X дн назад
    clients/
      page.tsx           — Клиенты (role: USER) — stats + ClientsList (ADMIN only)
      clients-list.tsx   — Поиск, история заказов, сброс пароля, назначить роль, редактировать, удалить
    settings/page.tsx    — Синх Google Sheets + тест Telegram
    notifications/page.tsx — Push уведомления: рассылка + подписчики + диагностика
                             Кнопка "Очистить дубли" → POST /api/push/cleanup

  api/
    admin/
      orders/
        route.ts             — POST создание заказа (телефон)
                               Telegram сохраняет telegramMessageId после отправки
        [id]/
          route.ts       — PATCH: смена статуса → если FINAL_STATUS → deleteTelegramMessage
                                  обновляет поля + deliveryCost + items → Telegram + PDF + Email
                           DELETE: soft / hard (?permanent=true)
                           PUT: restore
          pdf/route.ts   — GET генерация PDF счёта
      clients/
        [id]/
          route.ts           — PATCH (edit fields + promote role) / DELETE (только USER)
          reset-password/route.ts — POST генерирует пароль → bcrypt → email + показывает в UI
      products/
        route.ts         — GET все товары (include saleUnit, variants)
        [id]/route.ts    — PATCH/DELETE товара
      staff/
        route.ts         — POST создать сотрудника (ADMIN)
        [id]/route.ts    — PATCH (role, staffStatus, name, phone нормализован) / DELETE
      delivery-rates/
        route.ts         — GET/POST
        [id]/route.ts    — PATCH/DELETE
    auth/
      register/route.ts  — Регистрация клиента (normalizePhone)
    staff/
      register/route.ts  — Саморегистрация сотрудника (normalizePhone, Telegram уведомление)
    orders/
      route.ts           — Клиентский checkout (telegramMessageId сохраняется)
    telegram/
      route.ts           — Webhook: кнопки статусов, одобрение сотрудников, /help
                           при FINAL_STATUS → deleteMessage из группы
    push/
      subscribe/route.ts   — Сохранить подписку (гость или залогиненный)
      send/route.ts        — Отправить по сегменту (all/registered/guests/inactive/no-orders)
      debug/route.ts       — Диагностика VAPID + подписчики
      cleanup/route.ts     — Дедупликация: оставляет макс 3 подписки на userId (DELETE старые)
      unsubscribe/route.ts — Отписка по endpoint (DELETE из БД)

  cabinet/
    notifications/page.tsx — Управление push в личном кабинете клиента
                             Статус (включены/выключены) + кнопка включить + список что приходит

components/
  admin/
    order-edit-panel.tsx     — Редактирование заказа (поля клиента, items, deliveryCost, saleUnit)
    admin-nav.tsx            — Навигация (включая /admin/clients для ADMIN/MANAGER)
    order-status-select.tsx  — Включает COMPLETED
    auto-refresh.tsx         — Client component: router.refresh() каждые N мс
    admin-push-prompt.tsx    — Кнопка "Подписаться на уведомления" в сайдбаре adminки
                               показывает только если permission === "default"

lib/
  invoice-pdf.tsx        — PDF счёт (@react-pdf/renderer, WOFF шрифты)
  email.ts               — Email новый заказ / смена статуса / обновление (isUpdate)
  telegram.ts            — Весь Telegram: send, edit, delete, keyboard, help
  push.ts                — Web Push (sendPushToAll, sendPushToStaff, sendPushToUser)
  phone.ts               — normalizePhone(raw) → +7XXXXXXXXXX / null
                           formatPhone(phone) → +7 (977) 136-77-47
  prisma.ts              — Prisma client
  auth.ts                — NextAuth

prisma/schema.prisma     — Схема БД
public/
  sw.js                  — Service Worker для Push уведомлений
  fonts/                 — Roboto-Regular.woff + Roboto-Bold.woff (для PDF)
```

---

## Схема БД — актуальные модели

### User
```prisma
model User {
  id           String             @id @default(cuid())
  name         String?
  email        String             @unique
  phone        String?            // Хранится в формате +7XXXXXXXXXX
  passwordHash String
  role         Role               @default(USER)
  staffStatus  StaffStatus?       // PENDING / ACTIVE / SUSPENDED
  customRole   String?
  address      String?
  orders       Order[]
  reviews      Review[]
  pushSubs     PushSubscription[]
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  lastActiveAt DateTime?          // ← НОВОЕ: обновляется при каждом заходе в админку
}
```

### Order
```prisma
model Order {
  id                String      @id @default(cuid())
  orderNumber       Int         @default(autoincrement())
  userId            String?
  user              User?
  guestName         String?
  guestEmail        String?
  guestPhone        String?
  status            OrderStatus @default(NEW)
  totalAmount       Decimal     @db.Decimal(10, 2)
  deliveryCost      Decimal     @default(0) @db.Decimal(10, 2)  // ← отдельно!
  paymentMethod     String      @default("Наличные / Счёт")
  deliveryAddress   String?
  comment           String?
  items             OrderItem[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?   // ← soft delete
  telegramMessageId String?     // ← НОВОЕ: ID сообщения в Telegram группе
}
```

### OrderStatus enum
```prisma
enum OrderStatus {
  NEW
  CONFIRMED
  PROCESSING
  SHIPPED
  IN_DELIVERY
  READY_PICKUP
  DELIVERED
  COMPLETED    // ← НОВОЕ: Завершён (самовывоз — клиент забрал)
  CANCELLED
}
```

---

## Telegram — как работает

### Новый заказ
1. `sendTelegramOrderNotification()` → отправляет в группу, возвращает `message_id`
2. `message_id` сохраняется в `Order.telegramMessageId`
3. Сообщение содержит кнопки статусов (inline keyboard)

### Смена статуса через Telegram кнопку
- Webhook `/api/telegram` принимает callback
- Обновляет статус в БД
- Если НЕ финальный → `editMessageText` (обновляет сообщение, видно кто изменил)
- Если ФИНАЛЬНЫЙ → `deleteMessage` (удаляет из группы)

### Смена статуса через AdminPanel
- PATCH `/api/admin/orders/[id]` → если статус FINAL_STATUS → `deleteTelegramMessage(telegramMessageId)` + очищает поле в БД

### FINAL_STATUSES = ["CANCELLED", "DELIVERED", "COMPLETED"]
- При финальном статусе сообщение **автоматически удаляется** из Telegram группы
- Так группа всегда содержит только **активные** заказы

### Кнопки в Telegram
- Кнопка "🏁 Завершён — клиент забрал" появляется **только** при `READY_PICKUP`
- Кнопка "❌ Отменить" скрыта при финальных статусах
- Кнопка "📋 Открыть в админке" всегда внизу

---

## Push-уведомления — как работает

### Архитектура
- `public/sw.js` — Service Worker: push событие, Badge API (setAppBadge/clearAppBadge), notificationclick
- `components/sw-register.tsx` — регистрирует SW на всех страницах сайта
- `components/push-subscription.tsx` — подписывает браузер на push + рендерит PushPromptBanner
  - Залогиненным: авто-запрос через 3s
  - Гостям: баннер через 8s (PushPromptBanner встроен в этот же файл)
- `lib/push.ts` — sendPushToAll, sendPushToStaff, sendPushToUser
- VAPID ключи: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_KEY`

### Автоматические push
- Новый заказ → сотрудникам (`sendPushToStaff`) + клиенту если залогинен
- Смена статуса → клиенту (`sendPushToUser`) + сотрудникам
- Push через Telegram callback (при смене статуса кнопками)

### Ручная рассылка
- `/admin/notifications` → выбрать сегмент → заголовок + текст → отправить
- Сегменты: все / зарегистрированные / гости / давно не заказывали / никогда не заказывали

### Badge API (значок на иконке приложения)
- При получении push → `self.navigator.setAppBadge(1)` → показывает "1" на иконке
- При клике на уведомление → `self.navigator.clearAppBadge()` → убирает значок
- Работает в Chrome Android и Edge (не поддерживается Safari/Firefox)

### PushPromptBanner (баннер для гостей)
- Показывается через 8s после открытия сайта
- Только если `Notification.permission === "default"`
- Не показывается 7 дней после dismiss (localStorage: `push_prompt_dismissed_at`)
- Рендерится через `<PushSubscription />` в root layout → не требует изменений в layouts

### PWA баннер (pwa-install.tsx)
- В PWA-режиме (`platform === "installed"`) → return null (ничего не показывает)
- В браузере: предлагает установить + опционально включить уведомления
- После включения уведомлений → push-строка исчезает из баннера
- "Уведомления включены ✓" нигде не показывается — управление только в `/cabinet/notifications`

### Дедупликация подписок
- `POST /api/push/cleanup` — оставляет макс 3 подписки на userId, удаляет старые
- Кнопка "Очистить дубли" в `/admin/notifications` → Диагностика
- Dead subscription cleanup: при 410/404 от push-сервиса → автоматически удаляется из БД

### Как подписать своё устройство
1. Зайти на `pilo-rus.ru` с телефона/браузера — через 8 сек появится баннер
2. Нажать "Включить" → разрешить уведомления в браузере
3. Придёт приветственное уведомление, подписка сохранится в БД
4. Или: `/cabinet/notifications` → кнопка "Включить уведомления"

### Диагностика (admin/notifications)
- "SW: X" — нет SW в текущем браузере (нажать "Подписаться сейчас" для починки)
- "Подписка: X" — браузер не подписан
- "VAPID ✓ Настроены" — ключи есть, отправка работает
- "ошибок: 1" при отправке — одна подписка устарела (норма, браузеры сбрасывают)
- Если уведомления заблокированы в браузере → Замочек в адресной строке → Уведомления → Разрешить

---

## Нормализация телефонов

### lib/phone.ts
```ts
normalizePhone("8 977 136-77-47")  → "+79771367747"
normalizePhone("+7 977 136 77 47") → "+79771367747"
normalizePhone("79771367747")      → "+79771367747"
normalizePhone("9771367747")       → "+79771367747"
```

### Где применяется
- `app/api/auth/register/route.ts` — регистрация клиента
- `app/api/staff/register/route.ts` — саморегистрация сотрудника
- `app/api/admin/staff/[id]/route.ts` — PATCH сотрудника
- `app/api/admin/clients/[id]/route.ts` — PATCH клиента

---

## Раздел "Клиенты" (новый)

**Путь:** `/admin/clients` — доступно только ADMIN и MANAGER

**Что показывает:**
- Все пользователи с `role: "USER"`
- Статистика: всего клиентов / с заказами / выручка от клиентов
- Поиск по имени, email, телефону
- На каждом клиенте: аватар, бейдж "X активных", заказов, потрачено

**Действия:**
- 🛍️ История заказов (раскрывается список с ссылками)
- 🔑 Сброс пароля → генерирует 10-символьный пароль → bcrypt → email + показ в UI
- 👔 Назначить сотрудником → выбор роли → PATCH → клиент пропадает из списка, появляется в /admin/staff
- ✏️ Редактировать (имя, телефон, адрес)
- 🗑️ Удалить (только USER, защита от удаления сотрудников)

**API:**
- `PATCH /api/admin/clients/[id]` — обновить поля + promote (role → staffStatus: ACTIVE)
- `DELETE /api/admin/clients/[id]` — только role: USER
- `POST /api/admin/clients/[id]/reset-password` → возвращает { newPassword, emailSent, email }

---

## Активность сотрудников

### Как работает
- `app/admin/layout.tsx` — при каждом заходе в админку вызывает:
  ```ts
  prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
  ```
- `app/admin/staff/page.tsx` — возвращает `lastActiveAt` в запросе
- `staff-list.tsx` — функция `getOnlineStatus(lastActiveAt)`:
  - `< 5 мин` → 🟢 **Онлайн** (зелёный)
  - `< 30 мин` → 🟡 **X мин назад** (жёлтый)
  - `< 2 ч` → 🟠 **X ч назад** (оранжевый)
  - `Сегодня` → ⚫ время визита (серый)
  - `> 1 дня` → ⚫ X дн назад (серый)

---

## Дашборд — как считает выручку

```ts
// Выручка = totalAmount + deliveryCost, без CANCELLED, без deletedAt
const revenue = await prisma.order.aggregate({
  where: { status: { not: "CANCELLED" }, deletedAt: null, createdAt: { gte: days30ago } },
  _sum: { totalAmount: true, deliveryCost: true }
});
const total = (revenue._sum.totalAmount ?? 0) + (revenue._sum.deliveryCost ?? 0);

// Счётчик отменённых (отдельно)
const cancelledCount = await prisma.order.count({
  where: { status: "CANCELLED", deletedAt: null, createdAt: { gte: days30ago } }
});
```

---

## AutoRefresh компонент

```tsx
// components/admin/auto-refresh.tsx
"use client";
export function AutoRefresh({ intervalMs = 30000 }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
```

Используется:
- `app/admin/page.tsx` — каждые 60 сек
- `app/admin/orders/orders-client.tsx` — каждые 30 сек
- `app/admin/delivery/page.tsx` — каждые 30 сек

---

## Ключевые правила

### Soft Delete
- Все запросы к заказам: `where: { deletedAt: null }`
- Удаление: `update({ data: { deletedAt: new Date() } })` (мягкое)
- Жёсткое: только `DELETE ?permanent=true` или `clear-trash`

### deliveryCost
- Хранится ОТДЕЛЬНО от totalAmount
- Выручка = totalAmount + deliveryCost
- В PDF, Email, Telegram — показывается отдельной строкой

### saleUnit на Product
- CUBE → только м³ | PIECE → только шт | BOTH → оба варианта
- Реализовано в `orders/new/page.tsx` и `order-edit-panel.tsx`

### Дропдауны
- Всегда: `bg-popover border-border text-foreground`
- Никогда: хардкодные цвета

### Телефоны
- Хранить в формате `+7XXXXXXXXXX`
- Всегда применять `normalizePhone()` при сохранении
- Никогда не сохранять 8-xxx или 7-xxx напрямую

---

## Роли пользователей

| Роль | Доступ |
|------|--------|
| ADMIN | Всё, включая /admin/clients, trash, тарифы |
| MANAGER | Заказы, доставка, товары, клиенты |
| COURIER | Заказы (просмотр), доставка |
| ACCOUNTANT | Заказы (просмотр) |
| WAREHOUSE | Заказы, товары |
| SELLER | Заказы |

---

## Статусы заказов (полный список)

| Статус | Описание | Финальный? |
|--------|----------|-----------|
| NEW | Новый | Нет |
| CONFIRMED | Подтверждён | Нет |
| PROCESSING | В обработке | Нет |
| SHIPPED | Отгружен | Нет |
| IN_DELIVERY | Доставляется | Нет |
| READY_PICKUP | Готов к самовывозу | Нет |
| DELIVERED | Доставлен | ✅ ДА → удаляет из Telegram |
| COMPLETED | Завершён (самовывоз) | ✅ ДА → удаляет из Telegram |
| CANCELLED | Отменён | ✅ ДА → удаляет из Telegram |

---

## Известные состояния production

- **Тарифы доставки**: таблица DeliveryRate в production-БД пустая → добавить через `/admin/delivery/rates`
- **Шрифты PDF**: Roboto-Regular.woff и Roboto-Bold.woff (WOFF, не TTF!)
- **Telegram бот**: @pilorus_orders_bot, должен быть администратором группы с правом "Удалять сообщения"
- **Push SW**: "SW: X" в диагностике — нормально для admin-браузера без подписки

---

## Env vars на сервере

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://pilo-rus.ru

SMTP_HOST=smtp.beget.com
SMTP_PORT=465
SMTP_USER=info@pilo-rus.ru
SMTP_PASSWORD=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_KEY=   # тот же что VAPID_PUBLIC_KEY, но для браузера
```

---

## Что сделано — полная история

### Сессия 14.04.2026 (вечер) — Единая экосистема + навигация + баги светлой темы

**Баги исправлены (6 штук):**
- ✅ ARAY CONTROL: показывает заказы + отзывы + заявки сотрудников, авто-обновление при каждом открытии
- ✅ Broken images в отзывах: base64 фильтруется, onError скрывает битые
- ✅ Health API 503: critical vs optional checks (aray_api/google_ai → optional)
- ✅ Desktop sidebar светлая тема: inline `sidebarBg` (hex) вместо CSS var
- ✅ Mobile drawer светлая тема: `sidebarBg` вместо `hsl(var(--brand-sidebar))`
- ✅ Виджет погоды: убраны light CSS vars, всегда rgba(white) в сайдбаре

**Единая навигация (стандарт Instagram/Telegram/Shopify 2026):**
- ✅ `admin-nav.tsx` → полная перестройка: общие разделы (Профиль, Отзывы, Медиа, Подписки, История) для ВСЕХ ролей + ролевые разделы
- ✅ `admin-mobile-bottom-nav.tsx` → 4 таба + Арай по центру (gold standard)
- ✅ Группы навигации: main → personal → sales → products → content → marketing → settings → help
- ✅ Коллапсируемые группы: settings, marketing, personal

**Новые страницы кабинета:**
- ✅ `/cabinet/reviews` — Мои отзывы (статистика + список с рейтингами)
- ✅ `/cabinet/media` — Медиабиблиотека (табы: все/фото/видео/документы)
- ✅ `/cabinet/subscriptions` — Подписки и подписчики
- ✅ `/cabinet/history` — История действий (просмотры, заказы, отзывы)

**Единая админка:**
- ✅ `cabinet/layout.tsx` → AdminShell для всех ролей (не только USER)
- ✅ `admin-shell.tsx` → "Клиент" бейдж, "Личный кабинет" заголовок
- ✅ ARAY Control для USER: только "Оформление" (без колокольчика)
- ✅ ARAY Control popup: sidebarHex вместо CSS var

**API обновлены:**
- ✅ `GET /api/admin/reviews?pending=true&limit=5` — для ARAY Control
- ✅ `GET /api/admin/staff?status=PENDING&limit=5` — фильтрация по статусу

### Сессия 14.04.2026 — Отзывы полноценные + баги + auto-refresh + антиспам (10 коммитов)

**Система отзывов (полная как Авито/Ozon):**
- ✅ `POST /api/reviews` — создание отзыва с валидацией (rating int 1-5, text 10-2000, email regex)
- ✅ `POST /api/upload` — загрузка фото отзывов → `/uploads/reviews/` (FormData, max 5MB)
- ✅ `PATCH /api/reviews/[id]` — лайк/дизлайк, ответ админа, одобрить/скрыть
- ✅ `DELETE /api/reviews/[id]` — удаление (ADMIN only)
- ✅ `components/store/review-form.tsx` — форма с фото (до 5 шт), звёзды, автозаполнение залогиненных (аватар+имя)
- ✅ `components/store/description-accordion.tsx` — единый аккордион: Описание + Отзывы + Форма
  - Панель 1: "Описание и характеристики" с тегами ГОСТ
  - Панель 2: "Отзывы покупателей (N)" — карточки с фото, лайки/дизлайки (ReviewLikes компонент), ответ магазина, звёзды
- ✅ `app/admin/reviews/reviews-client.tsx` — админка: фото превью (128x128), лайки, товар, кнопка "Ответить" с 5 шаблонами быстрых ответов
- ✅ Prisma schema: `images String[]`, `likes Int`, `dislikes Int`, `adminReply String?`, `adminReplyAt DateTime?`

**Антиспам (3 уровня, невидимый для людей):**
- ✅ Honeypot — скрытое поле `website`, боты заполняют → тихо "принимается" без сохранения
- ✅ Timing — форма <3 сек = бот → тихий reject
- ✅ Качество текста — повтор символов (aaaaaa), ссылки (http/www), ALL CAPS → блок

**Push-уведомления для отзывов:**
- ✅ Новый отзыв → push сотрудникам (`sendPushToStaff`)
- ✅ Админ ответил → push клиенту (`sendPushToUser`)
- ✅ Отзыв опубликован → push клиенту

**Auto-refresh (живые данные без перезагрузки):**
- ✅ Отзывы: 15 сек (`AutoRefresh` server)
- ✅ CRM: 30 сек (`fetchOrders()` client)
- Уже было: Дашборд 60с, Заказы 30с, Доставка 30с

**Баги исправлены:**
- ✅ Sidebar overlay — `ReactDOM.createPortal` to body (z-index 69)
- ✅ Sidebar glass — `--brand-sidebar` CSS var + blur(24px) saturate(180%)
- ✅ Контраст статусов — все 9 статусов `text-*-900` в light (WCAG AA)
- ✅ Finance page — hardcoded rgba → `hsl(var(--primary))`
- ✅ Confirm-dialog — фокус на cancel (безопаснее для destructive)
- ✅ Day-planner — dark mode variants на приоритетах
- ✅ Search badges — `hsl()` вместо `rgba()`
- ✅ Store nav z-index — z-[100] → z-50
- ✅ Product card touch targets — 44px+ (w-11 h-11)
- ✅ Review form loading — `setLoading(false)` после успеха
- ✅ Workflow dedup — `prisma.$transaction()` вместо check-then-create
- ✅ Reviews API — IP splitting, email regex, text limit 2000

### Сессия 30.03.2026 — Push + PWA + Тема админки
- ✅ `components/push-subscription.tsx` — добавлен `PushPromptBanner` inline (гости теперь видят предложение)
  - Баннер показывается через 8s, только если `Notification.permission === "default"`
  - 7 дней не показывается после dismiss (localStorage: `push_prompt_dismissed_at`)
  - Рендерится через `<PushSubscription />` в root layout — нет новых импортов в layouts
- ✅ `components/store/pwa-install.tsx` — упрощена логика:
  - В PWA-режиме (`platform === "installed"`) → `return null` немедленно (никакого баннера)
  - "Уведомления включены ✓" убрана навсегда — управление только в `/cabinet/notifications`
  - После включения push-строка исчезает из баннера
- ✅ `public/sw.js` — Badge API (setAppBadge/clearAppBadge) добавлен ранее, задеплоен
- ✅ `components/admin/admin-shell.tsx` — переключатель светлой/тёмной темы в сайдбаре
  - Иконки Sun/Moon, `useTheme()` из next-themes, кнопка в desktop и mobile drawer
- ✅ `.github/workflows/deploy.yml` — SCP оптимизация: `exclude: "node_modules,.next,*.log"`
  - Деплой сократился с 14+ мин до ~2 мин
- ✅ Webpack кэш баг: если dev-сервер показывает старые ошибки → `rm -rf .next/cache/webpack`
- ⚠️ Двойной путь проекта: ПРАВИЛЬНЫЙ `D:\pilorus\website\` (латиница), НЕ `D:\ПилоРус\website\`
  - `start-next.js` делает `process.chdir('D:/pilorus/website')` — всегда редактировать там
- 🔧 Нужно вручную: "Очистить дубли" в `/admin/notifications` → Диагностика (~30 дублей)

### Сессия 29.03.2026 (вечер) — 3 телефона + клиент Беларусь
- ✅ Добавлен 3-й телефон 8-977-606-80-20 (+79776068020) на весь сайт
- ✅ Создан централизованный компонент `components/shared/phone-links.tsx` (PhoneLinks)
  - Принимает `phones: PhoneItem[]` как prop — безопасен для client и server компонентов
  - Варианты: `footer` | `mobile-menu` | `inline` | `sidebar`
- ✅ `lib/site-settings.ts` — добавлены `phone2`, `phone2_link`, `phone3`, `phone3_link` в DEFAULT_SETTINGS + функция `getPhones(settings)`
- ✅ `components/layout/header.tsx` — DEFAULT_PHONES (3 телефона), prop `phones: PhoneItem[]`, мобильное меню через `<PhoneLinks variant="mobile-menu">`
- ✅ `components/layout/footer.tsx` — `<PhoneLinks phones={getPhones(settings)} variant="footer">`
- ✅ `app/(store)/about/page.tsx` — 3 телефона с разделителем ·
- ✅ `app/(store)/cart/page.tsx` — 3 телефона inline
- ✅ `app/(store)/catalog/page.tsx` — 3 телефона в сайдбаре (sidebar вариант)
- ✅ БД: phone2, phone2_link, phone3, phone3_link записи созданы в SiteSettings
- ✅ Изменения клиента Беларусь выполнены через скрипт:
  - Режим работы: Пн–Сб 09:00–20:00, Вс 09:00–18:00 (SiteSettings working_hours)
  - Категория «Кедр» деактивирована (7 товаров скрыты, данные сохранены)
  - 5 товаров из «ДСП, МДФ, ОСБ, ЦСП» → перемещены в «Фанера»
  - «Фанера» переименована в «Фанера, ДСП, МДФ, ОСБ» (теперь 10 товаров)
  - «ДСП, МДФ, ОСБ, ЦСП» скрыта (sortOrder=999)
- ✅ PDF отчёт для клиента создан: `D:\pilorus\reports\belarus-changes-report.pdf`

### Сессия 29.03.2026 (утро)
- ✅ CLAUDE.md обновлён — полная база знаний актуализирована
- ✅ PWA кнопка "Установить приложение" в сайдбаре админки (AdminPwaInstall) — уже была реализована
- ✅ Email обязателен в клиентском checkout (z.string().email(), поле со звёздочкой *)
- ✅ Push AbortError (sw.js) — не критичная ошибка, исправляется перезагрузкой страницы

### Сессия 25.03.2026
- ✅ Telegram авто-удаление: FINAL_STATUSES → deleteMessage из группы
- ✅ Статус COMPLETED "Завершён самовывоз" — добавлен везде
- ✅ telegramMessageId сохраняется в Order при создании
- ✅ Дашборд: выручка = totalAmount + deliveryCost, без CANCELLED
- ✅ Дашборд: счётчик "Отменено" отдельно
- ✅ AutoRefresh на Дашборде (60s), Заказах (30s), Доставке (30s)
- ✅ Раздел "Клиенты" — полный CRUD + история заказов
- ✅ Сброс пароля клиента (генерация + bcrypt + email + показ в UI)
- ✅ Назначение клиента сотрудником (исправлены типы Prisma + error handling)
- ✅ Онлайн-статус сотрудников (lastActiveAt + цветной индикатор)
- ✅ Нормализация телефонов → +7XXXXXXXXXX (lib/phone.ts)
- ✅ Push "Подписаться сейчас" — регистрирует SW если не зарегистрирован

### Предыдущие сессии
- ✅ Каталог товаров + категории + варианты + цены
- ✅ Заказы: список, фильтрация, поиск, CSV экспорт
- ✅ Заказы: редактирование всех полей
- ✅ Заказы по телефону + saleUnit + калькулятор доставки
- ✅ Soft delete + Корзина + Восстановление + Очистить корзину
- ✅ PDF счёт: генерация + скачивание + email при создании/обновлении
- ✅ Email: новый заказ, смена статуса, обновление
- ✅ Telegram: новый заказ, смена статуса через кнопки, редактирование
- ✅ Push-уведомления: сотрудники + клиенты + ручная рассылка
- ✅ Доставка: активные + самовывоз + архив + PDF + статус
- ✅ Калькулятор тарифов + CRUD тарифов
- ✅ Отзывы: модерация
- ✅ Акции: управление
- ✅ Настройки: Google Sheets + тест Telegram

---

## Тема (светлая/тёмная) в админке

**Файл:** `components/admin/admin-shell.tsx`
**Где:** нижняя часть сайдбара (desktop + mobile drawer), над кнопкой "На сайт"

**Реализация:**
```tsx
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors">
  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
  {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
</button>
```

**Примечания:**
- `next-themes` уже был в проекте (`ThemeProvider` в root layout)
- Тема сохраняется в localStorage и применяется к сайту И к adminке
- Кнопка видна в обоих вариантах сайдбара (desktop и mobile drawer)

---

## AdminPwaInstall — как работает

**Файл:** `components/admin/admin-pwa-install.tsx`
**Расположение:** нижняя часть сайдбара (desktop + mobile drawer) в `components/admin/admin-shell.tsx`

**Логика:**
- Определяет платформу: ios-safari / android / desktop-chrome
- Android/Chrome: кнопка "Установить" → `installPrompt.prompt()`
- iOS Safari: кнопка "Установить" → показывает 3 шага (Поделиться → На экран Домой → Добавить)
- iOS Others / desktop-other / установлено → скрывается
- После установки (`appinstalled`) исчезает из меню

**Стиль:** вписан в тему сайдбара (текст белый/полупрозрачный, `hover:bg-white/10`)

---

## На следующую сессию (план)

> Последнее обновление: 14.04.2026

### 🔥 ПРИОРИТЕТ 1 — Единая админка для всех ролей ✅ ФУНДАМЕНТ ГОТОВ (14.04.2026)
**Что сделано:**
- ✅ `cabinet/layout.tsx` → AdminShell (glassmorphism) для всех ролей
- ✅ `admin-nav.tsx` → единая навигация: общие разделы (Профиль, Отзывы, Медиа, Подписки, История) + ролевые
- ✅ `admin-mobile-bottom-nav.tsx` → 4 таба + Арай (стандарт Instagram/Telegram 2026)
- ✅ Новые страницы: `/cabinet/reviews`, `/cabinet/media`, `/cabinet/subscriptions`, `/cabinet/history`
- ✅ Сотрудники тоже имеют доступ к `/cabinet/*` (личные разделы)

**Что осталось (следующие сессии):**
- [ ] Профиль с аватаркой (загрузка фото, кроп)
- [ ] Наполнить Медиабиблиотеку (агрегация фото из отзывов, документов заказов)
- [ ] Подписки — привязка к поставщикам/магазинам
- [ ] История — логирование действий (просмотры, заказы)
- [ ] Permissions система: каждый раздел проверяет права
- [ ] `/cabinet/appearance` — персональные настройки темы

### 🔥 ПРИОРИТЕТ 2 — Профили отзывщиков + статусы (для биржи)
Система как Яндекс «Знаток города» / Google Local Guide:
- Уровни: Новичок → Покупатель → Активный → Знаток → Эксперт → Мастер ARAY
- Страница `/cabinet/reviews` — все отзывы пользователя, статус, прогресс
- Бейджи уровня на отзывах (видны всем)
- DB: `reviewerLevel Int`, `totalReviews Int`, `totalLikes Int`, `totalPhotos Int` на User
- Вес голоса зависит от уровня (Эксперт = 3x влияние на рейтинг)
- Ачивки: "Первое фото", "10 отзывов подряд", "Топ недели"

### 🔥 ПРИОРИТЕТ 3 — Биржа пиломатериалов (MVP)
- Шаблонные страницы поставщиков (копировать ПилоРус → менять бренд)
- Сравнение поставщиков по рейтингу
- Email рассылка: "Ваши пиломатериалы уже на бирже"
- Менеджеры звонят поставщикам → создают им страницы

### 🔥 ПРИОРИТЕТ 4 — ARAY Next Gen
- Telegram-style чат (`components/store/aray-chat-panel.tsx` уже создан)
- Голосовой ввод/вывод (Web Speech API + ElevenLabs TTS)
- Контекст товара — Арай знает что смотрит пользователь
- Быстрые действия: "Подобрать", "Рассчитать", "Доставка"

### Известные баги — ВСЕ ИСПРАВЛЕНЫ (сессия 14.04.2026 вечер)
- ✅ ARAY CONTROL панель: теперь показывает заказы + отзывы на модерации + заявки сотрудников. Авто-обновление при каждом открытии. Добавлен GET `/api/admin/reviews?pending=true&limit=5`, обновлён GET `/api/admin/staff?status=PENDING&limit=5`
- ✅ Фото отзывов: base64 data URLs фильтруются (не рендерятся), `onError` скрывает broken images. Файлы: `description-accordion.tsx`, `reviews-client.tsx`
- ✅ Health API: разделены critical (DB, orders, telegram, email, push) и optional (aray_api, google_ai, disk) проверки. Теперь 200 OK если critical ок, даже если API ключи не настроены

### Средний приоритет
- Аналитика с DatePicker + экспорт Excel/PDF
- Права сотрудников (permissions String[])
- Фото в отзывах — CDN/S3 вместо локального `/uploads/`
- PhoneInput с маской +7

### 6. Цветовые темы — оформление (сессия 31.03.2026) ✅ ГОТОВО
- 13 тем: 6 собственных + 7 цветовых (Пурпур, Сапфир, Уголь, Рубин, Янтарь, Лазурь, Малахит)
- `components/palette-provider.tsx` — PaletteProvider + enabledIds фильтрация
- `app/admin/appearance/` — страница управления темами для ADMIN
- `app/api/admin/appearance/` — GET/PATCH API
- `lib/cart-fly.ts` — анимация корзины читает `--brand-primary` из CSS-переменной
- `/cabinet/profile` — только разрешённые темы отображаются

---

## Телефонная система (3 номера)

### Как добавить/изменить телефоны
1. В БД: обновить `SiteSettings` записи `phone`, `phone2`, `phone3` (и `_link` варианты)
2. В коде (fallback): `lib/site-settings.ts` → `DEFAULT_SETTINGS` объект
3. В header.tsx (client fallback): `DEFAULT_PHONES` массив
4. Компонент `PhoneLinks` сам рендерит любое количество телефонов

### Где телефоны отображаются
| Место | Вариант | Источник |
|-------|---------|----------|
| Header desktop topbar | прямой рендер | phones prop → getPhones() |
| Header мобильное меню | mobile-menu | phones prop |
| Footer | footer | getPhones() из server component |
| Каталог сайдбар | sidebar | hardcoded 3 phones |
| Корзина | inline links | hardcoded 3 phones |
| Страница "О нас" | inline с · | hardcoded 3 phones |
| ContactWidget | только 1-й | getSetting("phone") |

### SiteSettings модель (внимание: id @default("default"))
```ts
// При upsert использовать:
try { await prisma.siteSettings.create({ data: { id: key, key, value } }) }
catch { await prisma.siteSettings.update({ where: { key }, data: { value } }) }
// НЕ использовать upsert() напрямую — unique constraint конфликт с id
```

---

## Частые проблемы и решения

| Проблема | Причина | Решение |
|----------|---------|---------|
| Production "Application error" | Схема не синхронизирована | `prisma db push` в build script ✅ уже есть |
| PDF ошибка 500 | Шрифты TTF сломаны git'ом | Использовать WOFF формат ✅ |
| Дропдаун прозрачный фон | Хардкодные цвета | `bg-popover border-border` ✅ |
| Тарифы пустые в production | Seed только локально | Добавить через UI `/admin/delivery/rates` |
| Telegram не удаляет сообщение | Бот не админ группы | Дать боту право "Удалять сообщения" |
| Назначение роли не работает | Record<string,any> с enum Prisma | Использовать явные типы + try/catch ✅ |
| Телефон "не найден" при логине | 8/7/+7 разные форматы | normalizePhone() при сохранении ✅ |
| "SW: X" в Push диагностике | SW не успел зарегистрироваться | Нажать "Подписаться сейчас" или обновить страницу |
| Push AbortError | Конфликт SW версий | Обновить страницу, очистить кеш браузера |
| Заказ без email в админке | Форма phone-order не требует email | Email необязателен в admin/orders/new (корректно — звонок по телефону) |
| HMR не обновляет client component | Webpack file watcher Windows | Перезапустить `npm run dev` или дождаться `✓ Compiled` |
| node -e падает с кириллицей | Encoding issue в Windows shell | Использовать .js файл вместо inline node -e |
| SiteSettings upsert конфликт | id @default("default") | try{create}catch{update} вместо upsert() |
