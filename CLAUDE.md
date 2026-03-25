# ПилоРус — CRM/Сайт — База знаний для Claude

> Последнее обновление: 25.03.2026

---

## Стек

- **Next.js 14** App Router, TypeScript
- **Prisma** + PostgreSQL (localhost:5432, БД: `pilorus`)
- **Tailwind CSS** + shadcn/ui компоненты
- **@react-pdf/renderer** — генерация PDF счетов (WOFF шрифты, не TTF)
- **nodemailer** — email уведомления
- **Telegram Bot API** — уведомления в группу
- **Web Push** — push-уведомления для сотрудников

## Деплой

- GitHub → GitHub Actions → VPS (автодеплой при пуше в `main`)
- URL: `https://pilo-rus.ru`
- Build script: `"build": "prisma db push --accept-data-loss && next build"` — автомигрирует схему при каждом деплое
- При изменении схемы Prisma НИКОГДА не использовать `migrate dev` (интерактивный), только `db push`

---

## Структура проекта

```
app/
  admin/
    page.tsx             — Дашборд (серверный, все stats с deletedAt: null)
    layout.tsx           — Auth guard + AdminShell + навигация
    orders/
      page.tsx           — Список заказов (deletedAt: null)
      orders-client.tsx  — Поиск, фильтр статуса, bulk soft-delete, CSV
      new/page.tsx       — Создание заказа по телефону
                           (saleUnit logic, deliveryCost + калькулятор)
      trash/
        page.tsx             — Корзина (deletedAt: { not: null }), кнопка Очистить
        trash-actions.tsx    — Восстановить (PUT) / Удалить навсегда (DELETE?permanent=true)
        clear-trash-button.tsx — Кнопка "Очистить корзину" (ADMIN only)
      [id]/
        page.tsx         — Карточка заказа
        delete-button.tsx — Soft delete (без ?permanent)
    delivery/
      page.tsx           — Доставка: активные заказы + самовывоз + архив
                           (PDF кнопка на каждой карточке, показывает deliveryCost)
      delivery-status-select.tsx — Смена статуса прямо из карточки
      rates/
        page.tsx         — Тарифы: калькулятор объёма + таблица тарифов
                           (добавить/редактировать/удалить тариф)
    products/
      page.tsx           — Список товаров (серверный)
      products-client.tsx — Поиск + фильтр по категории
    staff/
      page.tsx           — Список сотрудников
      staff-list.tsx     — Таблица с кнопками изменения роли
    settings/page.tsx    — Синх Google Sheets + тест Telegram

  api/
    admin/
      orders/
        route.ts             — POST создание заказа (телефон)
                               deliveryCost → Telegram + PDF + Email
        bulk-delete/route.ts — DELETE (soft delete, updateMany deletedAt)
        clear-trash/route.ts — DELETE навсегда все из корзины (ADMIN only)
        [id]/
          route.ts       — GET/PATCH/DELETE/PUT
                           PATCH: сохраняет все поля + deliveryCost + items
                                  → Telegram + PDF + Email если редактирование
                           DELETE: soft (deletedAt) / hard (?permanent=true)
                           PUT: restore (deletedAt: null)
          pdf/route.ts   — GET генерация PDF счёта
      products/
        route.ts         — GET все товары (include saleUnit, variants)
        [id]/route.ts    — PATCH/DELETE товара
      delivery-rates/
        route.ts         — GET все тарифы / POST создать / DELETE ?id=...
        [id]/route.ts    — PATCH обновить тариф (ADMIN only)
      analytics/
        route.ts         — (планируется)

components/
  admin/
    order-edit-panel.tsx — Редактирование заказа:
                           поля клиента, items (add/remove), deliveryCost
                           saleUnit logic: авто-выбор единиц по product.saleUnit
    admin-nav.tsx        — Навигация (роли: ADMIN, MANAGER, COURIER, ACCOUNTANT, WAREHOUSE, SELLER)
    order-status-select.tsx

lib/
  invoice-pdf.tsx        — PDF счёт (@react-pdf/renderer, WOFF шрифты)
                           включает строку Доставка если deliveryCost > 0
  mail.ts                — Email уведомления клиенту (с PDF attachment)
                           isUpdate: true → "Заказ обновлён" + "✏️ Обновлён" бейдж
                           показывает deliveryCost как отдельную строку
  telegram.ts            — sendTelegramOrderNotification + sendTelegramOrderEdited
                           + sendTelegramStatusUpdate
  email.ts               — Email смена статуса клиенту
  push.ts                — Web Push (sendPushToStaff, sendPushToUser)
  prisma.ts              — Prisma client
  auth.ts                — NextAuth

prisma/schema.prisma     — Схема БД
public/fonts/            — Roboto-Regular.woff + Roboto-Bold.woff (для PDF)
```

---

## Схема БД — ключевые модели

### Order
```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     Int         @default(autoincrement())
  status          String      @default("NEW")
  guestName       String?
  guestPhone      String?
  guestEmail      String?
  deliveryAddress String?
  paymentMethod   String      @default("Наличные")
  comment         String?
  totalAmount     Decimal     @db.Decimal(10, 2)
  deliveryCost    Decimal     @default(0) @db.Decimal(10, 2)  // ← отдельное поле!
  deletedAt       DateTime?   // ← soft delete
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  items           OrderItem[]
  userId          String?
  user            User?
}
```

### DeliveryRate
```prisma
model DeliveryRate {
  id          String @id @default(cuid())
  vehicleName String   // "Газель 3т"
  payload     String   // "до 3т"
  maxVolume   Float    // 10.0
  basePrice   Int      // 5000
  sortOrder   Int      @default(0)
}
```

---

## Ключевые правила

### Soft Delete
- Все запросы к заказам: `where: { deletedAt: null }`
- Удаление: `update({ data: { deletedAt: new Date() } })` (мягкое)
- Жёсткое: только `DELETE ?permanent=true` или `clear-trash`
- Восстановление: `PUT /api/admin/orders/[id]` → `update({ data: { deletedAt: null } })`

### deliveryCost
- Хранится ОТДЕЛЬНО от totalAmount в БД
- В UI (order-edit-panel): totalAmount = сумма позиций + deliveryCost
- При создании заказа (POST): передавать в Telegram, PDF, Email
- При редактировании (PATCH): то же самое
- В PDF: отдельная строка "Доставка X ₽" синим цветом
- В email: отдельная строка в таблице

### saleUnit на Product
- CUBE → только м³
- PIECE → только шт
- BOTH → оба варианта (фильтрация по pricePerCube/pricePerPiece)
- Реализовано в: `orders/new/page.tsx` и `order-edit-panel.tsx`

### Тарифы доставки (DeliveryRate)
- Данные в production-БД ПУСТЫЕ — нужно добавить через UI `/admin/delivery/rates`
- Администратор нажимает "+ Добавить" → заполняет форму в таблице
- Калькулятор: вводит объём м³ → показывает подходящие машины sorted по цене

### Дропдауны
- Всегда использовать CSS-переменные темы: `bg-popover border-border text-foreground`
- НЕ использовать хардкодные цвета типа `#1a1510`, `rgba(255,255,255,0.07)`, `text-white`

---

## Роли пользователей

| Роль | Доступ |
|------|--------|
| ADMIN | Всё, включая trash, тарифы, очистить корзину |
| MANAGER | Заказы, доставка, товары |
| COURIER | Заказы (просмотр), доставка |
| ACCOUNTANT | Заказы (просмотр) |
| WAREHOUSE | Заказы, товары |
| SELLER | Заказы |

---

## Статусы заказов

| Статус | Описание |
|--------|----------|
| NEW | Новый (только что создан) |
| CONFIRMED | Подтверждён менеджером |
| PROCESSING | В обработке/комплектации |
| SHIPPED | Отгружен |
| IN_DELIVERY | Доставляется |
| READY_PICKUP | Готов к самовывозу |
| DELIVERED | Доставлен ✓ |
| CANCELLED | Отменён |

Страница доставки показывает: CONFIRMED, PROCESSING, SHIPPED, IN_DELIVERY (активные), READY_PICKUP (самовывоз отдельно), DELIVERED + CANCELLED (архив).

---

## Известные состояния production

- **Тарифы доставки**: таблица DeliveryRate в production-БД ПУСТАЯ — нужно добавить через `/admin/delivery/rates` вручную
- **Шрифты PDF**: Roboto-Regular.woff и Roboto-Bold.woff в `public/fonts/` (WOFF формат, НЕ TTF)
- **Env vars на сервере**: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SMTP_*, VAPID_*, DATABASE_URL

---

## Что сделано (текущее состояние системы)

### ✅ Полностью работает
- Каталог товаров + категории + варианты + цены
- Заказы: список, фильтрация, поиск, CSV экспорт
- Заказы: редактирование всех полей (клиент, товары, доставка, оплата)
- Заказы по телефону: создание с поиском товара, saleUnit, калькулятором доставки
- Мягкое удаление + Корзина + Восстановление + Очистить корзину
- PDF счёт: генерация + скачивание + отправка на email при создании/обновлении
- Email уведомления: новый заказ, смена статуса, обновление заказа
- Telegram уведомления: новый заказ, смена статуса, редактирование
- Push-уведомления сотрудникам
- Страница доставки: активные + самовывоз + архив + PDF кнопка + статус смена
- Калькулятор тарифов: объём → машина + CRUD тарифов
- Дашборд: статистика (без удалённых заказов), статусы, выручка
- Отзывы: модерация
- Акции: управление
- Настройки: Google Sheets синхронизация, тест Telegram

### ❌ Не реализовано (план на следующую сессию)

**1. Аналитика с фильтром дат (приоритет: высокий)**
- Дашборд сейчас серверный, без выбора периода
- Нужно: клиентский компонент с DatePicker (от/до)
- Кнопки быстрого выбора: Сегодня / 7 дней / 30 дней / Этот месяц
- API: `GET /api/admin/analytics?from=...&to=...` → { revenue, orders, avgOrder, byDay[], topProducts[] }
- Экспорт Excel (.xlsx через SheetJS) — `npm install xlsx`
- Экспорт PDF отчёта (через @react-pdf/renderer)

**2. Права сотрудников (приоритет: средний)**
- Сейчас: все сотрудники одного доступа, только по роли
- Нужно: гибкие права через `permissions String[]` на User модели
- Константы: orders.view, orders.edit, products.view, analytics.view и т.д.
- UI в `/admin/staff`: чекбоксы прав для каждого сотрудника
- Скрывать пункты меню по правам
- Миграция: `prisma db push` после добавления поля

**3. Активность сотрудников (приоритет: низкий)**
- Лог действий: кто что сделал и когда
- Новая модель `ActivityLog` в Prisma
- Показывать на странице /admin/staff/[id]

---

## Частые проблемы и решения

| Проблема | Причина | Решение |
|----------|---------|---------|
| Production "Application error" | Схема Prisma не синхронизирована | `prisma db push` в build script ✅ уже добавлено |
| PDF ошибка 500 | Шрифты TTF сломаны git'ом | Использовать WOFF формат |
| Дропдаун тёмный фон в светлой теме | Хардкодные цвета | Использовать `bg-popover border-border` |
| Тарифы пустые в production | Seed только локально | Добавить через UI `/admin/delivery/rates` |
| Bulk delete навсегда удалял | `deleteMany` вместо `updateMany` | ✅ исправлено |
