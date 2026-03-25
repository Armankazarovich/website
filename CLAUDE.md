# ПилоРус — CRM/Сайт — База знаний для Claude

> Последнее обновление: 25.03.2026

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
      subscribe/route.ts — Сохранить подписку
      send/route.ts      — Отправить по сегменту (all/registered/guests/inactive/no-orders)
      debug/route.ts     — Диагностика VAPID + подписчики

components/
  admin/
    order-edit-panel.tsx — Редактирование заказа (поля клиента, items, deliveryCost, saleUnit)
    admin-nav.tsx        — Навигация (включая /admin/clients для ADMIN/MANAGER)
    order-status-select.tsx — Включает COMPLETED
    auto-refresh.tsx     — Client component: router.refresh() каждые N мс

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
- `public/sw.js` — Service Worker, слушает `push` событие, показывает notification
- `components/sw-register.tsx` — регистрирует SW на всех страницах сайта
- `components/push-subscription.tsx` — подписывает браузер на push, сохраняет в БД
- `lib/push.ts` — sendPushToAll, sendPushToStaff, sendPushToUser
- VAPID ключи: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_KEY`

### Автоматические push
- Новый заказ → сотрудникам (`sendPushToStaff`)
- Смена статуса → клиенту (`sendPushToUser`)

### Ручная рассылка
- `/admin/notifications` → выбрать сегмент → заголовок + текст → отправить

### Как подписать своё устройство
1. Зайти на `pilo-rus.ru` (НЕ в админку) с телефона/браузера
2. Браузер спросит "Разрешить уведомления" → нажать **Разрешить**
3. Подписка сохраняется в БД, push будут приходить

### Диагностика (admin/notifications)
- "SW: X" — нет SW в текущем браузере (нажать "Подписаться сейчас" для починки)
- "Подписка: X" — браузер не подписан
- "VAPID ✓ Настроены" — ключи есть, отправка работает
- "ошибок: 1" при отправке — одна подписка устарела (норма, браузеры сбрасывают)

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

### Сессия 25.03.2026 (текущая)
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

## На следующую сессию (план)

### 1. Аналитика с фильтром дат (приоритет: высокий)
- Дашборд → клиентский компонент с DatePicker (от/до)
- Быстрые кнопки: Сегодня / 7 дней / 30 дней / Этот месяц
- API `GET /api/admin/analytics?from=...&to=...` → revenue, orders, byDay[], topProducts[]
- Экспорт Excel (.xlsx через SheetJS — `npm install xlsx`)
- Экспорт PDF отчёта (через @react-pdf/renderer)

### 2. Права сотрудников (приоритет: средний)
- Гибкие права через `permissions String[]` на User модели
- Константы: orders.view, orders.edit, products.view, analytics.view...
- UI в `/admin/staff`: чекбоксы для каждого сотрудника
- Скрывать пункты меню по правам в layout.tsx

### 3. Форма телефона с фиксированным +7 (приоритет: средний)
- Компонент `PhoneInput` с фиксированным префиксом "+7" и маской
- Применить в формах регистрации (сайт + join-страница сотрудников)
- Пользователь вводит только 10 цифр, +7 нельзя стереть

### 4. Удаление устаревших Push-подписок (приоритет: низкий)
- При отправке push: если сервер вернул 410 (Gone) → удалять подписку из БД
- Сейчас счётчик "ошибок" растёт из-за expired подписок

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
