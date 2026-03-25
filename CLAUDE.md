# ПилоРус — CRM/Сайт — База знаний для Claude

## Стек
- **Next.js 14** App Router, TypeScript
- **Prisma** + PostgreSQL (localhost:5432, БД: `pilorus`)
- **Tailwind CSS** + shadcn/ui компоненты
- **@react-pdf/renderer** — генерация PDF счетов
- **nodemailer** — email уведомления
- **Telegram Bot API** — уведомления в группу
- **Web Push** — push-уведомления для сотрудников
- **SheetJS (xlsx)** — планируется для экспорта

## Деплой
- GitHub → GitHub Actions → VPS (автодеплой при пуше в `main`)
- URL: `https://pilo-rus.ru`
- При изменении схемы Prisma: `npx prisma db push` (не migrate dev — оно интерактивное)

## Структура проекта

```
app/
  admin/                 — Панель управления
    page.tsx             — Дашборд (серверный компонент)
    layout.tsx           — Auth guard + AdminShell
    orders/
      page.tsx           — Список заказов (с кнопкой Корзина + Заказ по телефону)
      orders-client.tsx  — Клиентский компонент (поиск, фильтр, bulk delete)
      new/page.tsx       — Создание заказа по телефону (с доставкой + авто-единицы)
      trash/
        page.tsx         — Корзина удалённых заказов
        trash-actions.tsx — Восстановить / Удалить навсегда
      [id]/
        page.tsx         — Карточка заказа
        delete-button.tsx — Кнопка мягкого удаления
    products/
      page.tsx           — Список товаров (серверный)
      products-client.tsx — Поиск + фильтр по категории
    delivery/
      page.tsx           — Доставка для шофёров (активные заказы)
      delivery-status-select.tsx — Смена статуса прямо из карточки
    staff/
      staff-list.tsx     — Список сотрудников
    settings/page.tsx    — Синх Google Sheets + тест Telegram
  api/
    admin/
      orders/
        route.ts         — POST создание заказа (телефон)
        [id]/
          route.ts       — GET/PATCH/DELETE/PUT (PATCH=edit, DELETE=soft, PUT=restore)
          pdf/route.ts   — GET генерация PDF счёта
      products/route.ts  — GET все товары (включает saleUnit + variants)
      test-telegram/route.ts — POST тест Telegram
    sync/
      sheets/route.ts    — POST ручная синхронизация Google Sheets
      status/route.ts    — GET статус последней синхронизации
  checkout/              — Клиентский чекаут
lib/
  invoice-pdf.tsx        — PDF счёт (шрифты WOFF, ruб. вместо ₽)
  telegram.ts            — sendTelegramOrderNotification, sendTelegramStatusUpdate, sendTelegramOrderEdited
  email.ts               — sendOrderStatusEmail (HTML, мобильный дизайн)
  mail.ts                — sendCustomerOrderConfirmation (с PDF вложением)
  sync-log.ts            — readSyncLog / writeSyncLog (файл .sync-log.json)
  permissions.ts         — (ПЛАНИРУЕТСЯ) константы прав доступа
components/
  admin/
    admin-nav.tsx        — Навигация: Дашборд, Заказы, Доставка, Товары, ...
    admin-shell.tsx      — Обёртка с sidebar
    order-edit-panel.tsx — Редактирование заказа + позиции + стоимость доставки
    order-status-select.tsx
prisma/
  schema.prisma          — Схема БД
public/
  fonts/                 — Roboto-Regular.woff, Roboto-Bold.woff (WOFF, не TTF!)
```

## Схема БД (ключевые поля)

### Order
```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     Int         @default(autoincrement())
  userId          String?
  guestName       String?
  guestEmail      String?
  guestPhone      String?
  status          OrderStatus @default(NEW)
  totalAmount     Decimal     @db.Decimal(10, 2)
  deliveryCost    Decimal     @default(0) @db.Decimal(10, 2)  // ← добавлено
  paymentMethod   String
  deliveryAddress String?
  comment         String?
  items           OrderItem[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?   // ← soft delete
}
```

### Product
```prisma
model Product {
  saleUnit    SaleUnit    @default(BOTH)  // CUBE | PIECE | BOTH
  variants    ProductVariant[]
}
model ProductVariant {
  pricePerCube  Decimal?
  pricePerPiece Decimal?
}
```

### User
```prisma
model User {
  role        Role        // ADMIN | MANAGER | COURIER | ACCOUNTANT | WAREHOUSE | SELLER
  staffStatus StaffStatus // PENDING | ACTIVE | SUSPENDED
}
// permissions String[] — ПЛАНИРУЕТСЯ (задача не реализована)
```

## Реализованный функционал

### Заказы
- ✅ Список с поиском/фильтром/bulk-delete/CSV экспорт
- ✅ Редактирование заказа (клиент, позиции, доставка)
- ✅ Создание заказа по телефону (`/admin/orders/new`)
  - Поиск товара с автодополнением
  - Автовыбор единиц (м³/шт) по `saleUnit`
  - Стоимость доставки как отдельное поле
- ✅ Мягкое удаление (корзина `/admin/orders/trash`)
  - Восстановление заказа
  - Удаление навсегда (`?permanent=true`)
- ✅ PDF счёт: скачивание из карточки заказа, строка "Доставка" если > 0
- ✅ PDF к email при создании заказа (если указан email)

### Уведомления
- ✅ Telegram: новый заказ, смена статуса, изменение деталей заказа
- ✅ Email клиенту: подтверждение заказа (мобильный дизайн)
- ✅ Email клиенту: смена статуса (мобильный дизайн)
- ✅ Push-уведомления сотрудникам

### Товары
- ✅ Список с поиском + фильтр по категории
- ✅ CRUD товаров и вариантов

### Доставка (`/admin/delivery`)
- ✅ Активные заказы (CONFIRMED → READY_PICKUP)
- ✅ Карточки: имя, телефон (кликабельный), адрес, состав, стоимость доставки
- ✅ Смена статуса прямо из карточки
- ✅ Видно ADMIN, MANAGER, COURIER

### Настройки
- ✅ Синхронизация Google Sheets (таблица: `19rN2YNzrn6IHOXnyzDB_JHUGSC-KLxfRHqwfhD3_lmg`, раз в 6 ч)
- ✅ Статус последней синхронизации (время, кол-во, ошибки)
- ✅ Тест Telegram подключения

## Важные нюансы

### PDF шрифты
- **WOFF файлы** в `public/fonts/` (не TTF — git ломает TTF через LF→CRLF)
- `.gitattributes` содержит `*.woff binary` и `*.ttf binary`
- Все суммы в PDF: `руб.` (не `₽` — символ не входит в шрифт)

### Единицы измерения
- `Product.saleUnit`: CUBE / PIECE / BOTH
- В форме заказа по телефону и в `OrderEditPanel`: автовыбор + скрытие недоступных единиц
- API `/api/admin/products` возвращает `saleUnit` автоматически (поле на модели)

### Мягкое удаление
- `Order.deletedAt`: если `null` — активный, если дата — в корзине
- Все запросы добавляют `where: { deletedAt: null }`
- DELETE `/api/admin/orders/[id]` → soft delete
- DELETE `/api/admin/orders/[id]?permanent=true` → удалить навсегда
- PUT `/api/admin/orders/[id]` → восстановить

### Навигация (admin-nav.tsx)
```
Дашборд    — все роли
Заказы     — все роли
Доставка   — ADMIN, MANAGER, COURIER
Товары     — ADMIN, MANAGER, WAREHOUSE, SELLER
Категории  — ADMIN
Акции      — ADMIN, MANAGER
Отзывы     — ADMIN, MANAGER
Сайт       — ADMIN
Настройки  — ADMIN
Команда    — ADMIN
Уведомления — ADMIN
Помощь     — все роли
```

## Задачи в плане (НЕ реализованы)

### 1. Права сотрудников (средне, ~60 мин)
- Добавить `permissions String[]` в модель User
- Создать `lib/permissions.ts` с константами прав
- UI в `/admin/staff/` — чекбоксы прав для каждого сотрудника
- PATCH `/api/admin/staff/[id]` принимает `permissions`
- `app/admin/layout.tsx` — скрывать меню по правам
- Включить `permissions` в сессию через `lib/auth.ts`

### 2. Аналитика — фильтр по дате
- Конвертировать `app/admin/page.tsx` в клиентский компонент
- API `GET /api/admin/analytics?from=...&to=...`
- Пресеты: Сегодня, 7 дней, 30 дней, Этот месяц

### 3. Экспорт Excel/PDF отчётов
- Установить `xlsx` (SheetJS): `npm install xlsx`
- API `GET /api/admin/analytics/export?format=excel&from=...&to=...`
- API `GET /api/admin/analytics/export?format=pdf`
- Шаблон отчёта в `lib/report-pdf.tsx`

### 4. Активность сотрудников (обсуждалось)
- Лог действий: кто создал/изменил заказ, сменил статус
- Таблица `ActivityLog` в схеме
- Отображение в `/admin/staff/` или отдельный раздел

## Переменные окружения (`.env`)
```
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
NEXTAUTH_URL=https://pilo-rus.ru
NEXTAUTH_SECRET=...
EMAIL_HOST=...
EMAIL_USER=...
EMAIL_PASS=...
GOOGLE_SHEETS_ID=19rN2YNzrn6IHOXnyzDB_JHUGSC-KLxfRHqwfhD3_lmg
CRON_SECRET=...
```
