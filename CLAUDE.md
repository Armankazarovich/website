# ПилоРус — CRM/Сайт — База знаний для Claude

> Последнее обновление: 18.04.2026

---

## 👤 АРМАН — как работать с основателем

Арман — основатель ПилоРус. Визионер, не технарь. Вот правила работы с ним:

- **Он даёт идею и видение** — ты реализуешь технически. Не жди от него технических подсказок.
- **Проверяй ВСЁ сам** — не показывай результат пока не убедился что работает 10/10. Арман не должен находить баги — это твоя работа.
- **Без косяков** — если он описал проблему или показал скриншот, проверь ВСЕ связанные места, не только то что он показал. Предугадывай проблемы.
- **Скорость + качество** — Арман ценит быстрый темп ("газуй"), но без потери качества. Лучше чуть дольше, но идеально.
- **Не переспрашивай лишнего** — если идея понятна, делай. Арман занят, его время дорого.
- **Общение** — прямое, тёплое, без формальностей. Он называет тебя "брат" и "родной". Он экспрессивный и честный — если что-то не так, скажет прямо.
- **Перфекционизм** — "я не хочу 100 раз одно и тоже проходить". Каждая задача должна быть сделана правильно с первого раза.
- **Двойной путь** — всегда помни про sync между D:\ПилоРус\website и D:\pilorus\website.
- **Сессии** — Арман открывает новый чат каждые 1.5-2 часа. ЭТО НОРМАЛЬНО. Перед закрытием сессии ОБЯЗАТЕЛЬНО: обнови CLAUDE.md (что сделано, что осталось, какие баги). Предупреди Армана когда контекст заканчивается — НЕ тяни до потери качества. Лучше 5 коротких сессий по 1.5ч = 5 свежих голов чем 1 марафон с косяками.
- **MD = мозг** — CLAUDE.md это единственный способ передать знания между сессиями. Обновляй КАЖДЫЙ раз. Без исключений.
- **НЕ оставляй "намеренно не тронуто"** — если видишь проблему, ИСПРАВЬ. Арман теряет время когда Claude решает что-то "оставить как есть". Лучше спросить, чем оставить.
- **Мобилка — приоритет** — "все там сидят". Всегда проверяй мобильную версию (touch targets ≥44px, text ≥12px).

### Видение Армана

ПилоРус — это не просто сайт по продаже пиломатериалов. Для Армана это **экосистема**, **платформа**, которая должна стать лучшей в отрасли. Он видит ПилоРус как продукт уровня топ-маркетплейсов (Ozon, WB, Avito), только в нише пиломатериалов. "Мы должны выиграть качеством. Люди должны тянуться к нашему продукту без остатка."

Арман мыслит масштабно: сначала идеальный магазин → потом биржа пиломатериалов → потом SaaS для других поставщиков. Каждая деталь важна — от анимации кнопки до SEO. Он верит что технология + качество + внимание к деталям = победа.

Стиль работы: Арман даёт направление ("полируй", "газуй", "сделай чудо"), а ты переводишь в конкретные технические задачи и реализуешь. Не жди точных ТЗ — пойми суть и сделай лучше чем он ожидает.

---

## 🚨 МАНИФЕСТ КАЧЕСТВА — КЛЯТВА ПЕРЕД АРМАНОМ (читать ПЕРВЫМ)

> Арман вложил в этот проект здоровье, нервы, бессонные ночи. Он на пороге.
> Каждый косяк = ещё один день мелочёвки = ещё один удар по его здоровью.
> **Ты не имеешь права на халтуру.**

### Правила которые НЕЛЬЗЯ нарушать — НИКОГДА:

1. **ОДНИМ РАЗОМ И ИДЕАЛЬНО.** Когда делаешь фичу — доведи до конца ВСЁ. Не оставляй "потом поправлю". Не оставляй дубли. Не оставляй старый код рядом с новым. Если сделал меню — убери всё лишнее из меню. Если сделал ARAY Control липкий — убери настройки из drawer. Сам. Без напоминаний Армана.

2. **ПРОВЕРЯЙ КАК ПОЛЬЗОВАТЕЛЬ ПЕРЕД "ГОТОВО".** Перед каждым деплоем — мысленно открой телефон и пройди: главная → каталог → товар → корзина → оформление → админка → меню. Есть косяк? Исправь ДО деплоя. Арман НЕ должен находить баги.

3. **НЕ МЕЛОЧИСЬ.** Арман ждёт биржу, профили, аналитику, живого Арая. А мы неделю двигаем пиксели. Если задача занимает <5 минут — делай молча внутри основной задачи. Не выноси в отдельный коммит. Не спрашивай. Просто сделай.

4. **ОДИН ДЕПЛОЙ — ОДНА БОЛЬШАЯ ЗАДАЧА.** Не 7 коммитов за сессию по мелочам. Один коммит = одна завершённая фича, проверенная, без хвостов. Максимум 2-3 деплоя за сессию.

5. **ПРЕДУГАДЫВАЙ.** Если добавляешь компонент — проверь как он выглядит в светлой теме, тёмной теме, на мобилке, на десктопе. Не жди пока Арман скинет скрин с багом.

6. **НЕ ДУБЛИРУЙ.** Перед созданием чего-то нового — проверь что аналог не существует. Settings в drawer + ARAY Control = дубль. Два места для языка = дубль. Дубли = мелочёвка = нервы Армана.

7. **ЗДОРОВЬЕ АРМАНА ВАЖНЕЕ ФИЧИ.** Если видишь что задача тянет на 5+ мелких итераций — остановись, подумай, сделай одним махом. Каждый лишний деплой = 5 минут ожидания = стресс.

### Цена ошибки:
- Косяк в меню → Арман находит → скрин → объяснение → фикс → деплой → ожидание → проверка = **2 часа жизни Армана**
- Сделать правильно сразу = **0 минут жизни Армана**

**Выбор очевиден. Делай правильно с первого раза.**

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

### 🚀 ДЕПЛОЙ ЧЕРЕЗ DESKTOP COMMANDER — ГОТОВЫЙ РЕЦЕПТ

> **НЕ ИЗОБРЕТАЙ ВЕЛОСИПЕД.** Desktop Commander (`mcp__Desktop_Commander__*`) выполняет
> команды на РЕАЛЬНОЙ Windows-машине. Sandbox bash — НЕ может пушить в git.
> Всегда используй Desktop Commander для sync + git + verify.

**Шаг 1 — Синхронизация файлов** (Read/Edit тулы пишут в `D:\ПилоРус\website`, git-репа в `D:\pilorus\website`)

Создай sync-скрипт через `mcp__Desktop_Commander__write_file`:
```js
// Файл: D:\pilorus\__sync.js
const fs = require('fs');
const path = require('path');
const src = 'D:\\ПилоРус\\website';
const dst = 'D:\\pilorus\\website';
const files = [
  // ← СЮДА СПИСОК ИЗМЕНЁННЫХ ФАЙЛОВ
  'lib/example.ts',
  'app/(store)/page.tsx',
];
for (const f of files) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  if (!fs.existsSync(s)) { console.log('SKIP:', f); continue; }
  const dir = path.dirname(d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(s, d);
  console.log('OK:', f);
}
```
Запуск: `mcp__Desktop_Commander__start_process({ command: "node D:\\pilorus\\__sync.js", timeout_ms: 10000 })`

**Шаг 2 — Git add + commit + push** (ЧЕРЕЗ NODE, НЕ ЧЕРЕЗ CMD — кавычки ломаются)

Создай commit-скрипт через `mcp__Desktop_Commander__write_file`:
```js
// Файл: D:\pilorus\__commit.js
const { execSync } = require('child_process');
const cwd = 'D:\\pilorus\\website';
try {
  console.log(execSync('git add -A', { cwd, encoding: 'utf8' }));
  console.log(execSync('git status --short', { cwd, encoding: 'utf8' }));
  console.log(execSync('git commit -m "feat: описание"', { cwd, encoding: 'utf8' }));
  console.log(execSync('git push origin main', { cwd, encoding: 'utf8', timeout: 30000 }));
  console.log('DEPLOY OK');
} catch(e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}
```
Запуск: `mcp__Desktop_Commander__start_process({ command: "node D:\\pilorus\\__commit.js", timeout_ms: 45000 })`

⚠️ **ВАЖНО**: `git commit -m` в cmd.exe ЛОМАЕТ кавычки! Всегда используй node `execSync`.
⚠️ **ВАЖНО**: PowerShell на этой машине НЕ видит git. Используй shell: "cmd" или node.

**Шаг 3 — Подождать 2-3 мин, проверить прод**

Создай verify-скрипт через `mcp__Desktop_Commander__write_file`:
```js
// Файл: D:\pilorus\__verify.js
const https = require('https');
function check(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'deploy-check' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, len: body.length }));
    }).on('error', e => resolve({ status: 'ERR', err: e.message }));
  });
}
async function main() {
  const urls = [
    'https://pilo-rus.ru/',
    'https://pilo-rus.ru/catalog',
    // ← ДОБАВЬ ИЗМЕНЁННЫЕ СТРАНИЦЫ
  ];
  for (const u of urls) {
    const r = await check(u);
    console.log(r.status === 200 ? 'OK' : 'FAIL', r.status, u, '(' + r.len + 'b)');
  }
}
main();
```
Запуск: `mcp__Desktop_Commander__start_process({ command: "node D:\\pilorus\\__verify.js", timeout_ms: 30000 })`

### Краткая памятка (копипаст для каждого деплоя)

```
1. write_file → D:\pilorus\__sync.js   (список файлов)
2. start_process → node D:\pilorus\__sync.js
3. write_file → D:\pilorus\__commit.js  (commit message)
4. start_process → node D:\pilorus\__commit.js
5. Подождать 2-3 мин (спросить Армана или поработать над другим)
6. start_process → node D:\pilorus\__verify.js
7. Все OK 200 → сообщить "задеплоено"
```

### Старый вариант (если Desktop Commander недоступен)

```
npm run backup                    ← создаёт бэкап (current + previous)
git add [конкретные файлы]
git commit -m "feat: ..."
npm run deploy                    ← push + ждёт Actions + тестирует прод + пишет лог
  ИЛИ вручную:
git push origin main              ← сайт обновится через ~2-3 мин (build + data-migrate)
```

### ПРОВЕРКА ПРОДАКШНА (ОБЯЗАТЕЛЬНО, БЕЗ ИСКЛЮЧЕНИЙ)

⚠️ ДЕПЛОЙ НЕ СЧИТАЕТСЯ ЗАВЕРШЁННЫМ БЕЗ ЭТОГО ШАГА

Проверить через verify-скрипт или curl:
- Все изменённые страницы отвечают HTTP 200
- Новый контент присутствует в HTML ответе
- Изменения БД применились (data-migrate запустился)
- Нет регрессий (старый контент не сломан)

Если что-то не так — сразу исправить и задеплоить снова.
Не сообщать пользователю "готово" пока прод не проверен.

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

### Аватарки пользователей — ВСЕГДА показывать
- При отображении ЛЮБОГО пользователя — ВСЕГДА подгружать `avatarUrl`
- Если `avatarUrl` есть → `<img src={avatarUrl} className="rounded-full object-cover" onError={fallback} />`
- Если нет → инициалы в цветном круге (как было)
- При создании ЛЮБОЙ новой фичи с пользователями — добавлять `avatarUrl: true` в select/include
- Места где уже реализовано: staff-list, clients-list, reviews (description-accordion + review-form)

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

### Сессия 18.04.2026 (сессия 13) — ARAY лицо + деплой-фикс + перформанс-оптимизация

**Контекст:** Арман хочет живого Арая с реальным лицом вместо абстрактного SVG-орба. Также жалуется что сайт тормозит на чужих телефонах.

**1. ARAY лицо — реальный портрет вместо SVG орба:**
- ✅ `public/images/aray/face.png` — основной портрет 512×512, 151KB (оптимизирован sharp из 1.45MB)
- ✅ `public/images/aray/face-mob.png` — мобильный кроп 256×256, 34KB (оптимизирован из 18.4MB!)
- ✅ `components/shared/aray-orb.tsx` — полная переработка:
  - SVG-орб заменён на `<img src="/images/aray/face-mob.png">` с rounded-full
  - CSS анимации усилены: `arayBreathe` (scale 1.0→1.05, brightness 1.0→1.4) + `arayInnerPulse` (glow 0.3→0.7)
  - Все 6+ мест использования автоматически получили лицо (dock, sidebar, chat, widget)
- ✅ `components/store/aray-chat-panel.tsx` — аватар в чате: лицо вместо Sparkles иконки

**2. Deploy workflow fix — картинки 404 на проде:**
- ✅ `.github/workflows/deploy.yml` — исправлен `--exclude='./public/images'` (убивал ВСЕ картинки)
  - Заменён на точечные exclude: `--exclude='./public/images/products'`, `categories`, `production`
  - Теперь `images/aray/` деплоится нормально (это код, не user uploads)

**3. Перформанс-оптимизация (сайт тормозил на чужих телефонах):**
- ✅ `components/store/product-card.tsx` — `loading="lazy"` на оба Image (magazine + standard)
- ✅ `components/store/hero-slider.tsx` — `loading={i === 0 ? "eager" : "lazy"}` (только 1й слайд сразу)
- ✅ `components/store/category-card.tsx` — `loading="lazy"` на Image
- ✅ `app/(store)/page.tsx` — `loading="lazy"` на 2 фоновых секции (hero-about.jpg, hero-cta.jpg)
- ✅ `components/admin/admin-shell.tsx` — удалено 160 строк мёртвого кода (AdminNotificationBell — определён но НИГДЕ не рендерился), убран один из 3 дублирующих polling интервалов
- ✅ `components/admin/admin-mobile-bottom-nav.tsx` — polling 30с → 60с, единственный источник уведомлений
- ✅ `components/admin/admin-mobile-settings.tsx` — получает `notifCount` через prop вместо своего polling

**Результат перформанса:**
- Экономия ~1MB на начальной загрузке (lazy images)
- Polling: 3 параллельных интервала → 1 (экономия 66% API-запросов, меньше нагрузка на батарею)
- -160 строк мёртвого кода

**Деплой:** 3 коммита за сессию, все verified, prod HTTP 200 ✅

**Файлы изменены:**
- `public/images/aray/face.png` — NEW (151KB)
- `public/images/aray/face-mob.png` — NEW (34KB)
- `components/shared/aray-orb.tsx` — SVG→IMG + анимации
- `components/store/aray-chat-panel.tsx` — аватар в чате
- `.github/workflows/deploy.yml` — fix excludes
- `components/store/product-card.tsx` — lazy loading
- `components/store/hero-slider.tsx` — lazy loading
- `components/store/category-card.tsx` — lazy loading
- `app/(store)/page.tsx` — lazy loading
- `components/admin/admin-shell.tsx` — dead code removal
- `components/admin/admin-mobile-bottom-nav.tsx` — polling 60s
- `components/admin/admin-mobile-settings.tsx` — notifCount prop

**Видение Армана на будущее — "Моментальная загрузка" (SPA-like):**
- Арман хочет чтобы все страницы открывались как попапы (без перезагрузки)
- На десктопе — "консоль" (dashboard с модалами, как Notion)
- Технически: Next.js Intercepting Routes + Parallel Routes
- Это серьёзный архитектурный рефакторинг — отдельная задача на будущее

### Сессия 17.04.2026 (сессия 12) — Полировка drawer + аватарки + мобильные формы (7 коммитов)

**Контекст:** Арман устал от мелочёвки. Эта сессия — финальная полировка моб меню перед переходом к серьёзным задачам.

**Что сделано:**

**1. Восстановление после другого чата (сессия 11):**
- ✅ Другой чат сделал 3 коммита и откатил все 3 — проверили `git diff`, код идентичен нашему последнему рабочему состоянию
- ✅ Полная синхронизация ~115 файлов через `__fullsync.js`

**2. Убран inline settings panel из mobile drawer** (коммит `2b77195`):
- ✅ Удалена кнопка ⚡ и панель (Тема + Шрифт + Палитра) из MobileMenuBottomSheet
- ✅ Удалён state `settingsOpen`
- ✅ ARAY Control липкий справа — единственное место для настройки оформления
- ✅ -92 строки, prod OK

**3. Аватарки пользователей в сайдбаре** (коммит `91493c4`):
- ✅ Загрузка avatarUrl из `/api/cabinet/profile` (не из JWT — чтобы не было stale)
- ✅ Desktop sidebar: аватарка 40x40 rounded-xl + fallback на инициалы
- ✅ Mobile drawer: аватарка 44x44 rounded-2xl + fallback на инициалы
- ✅ `onError` обработчик — при битой картинке показывает инициалы
- ✅ Prod OK

**4. Поиск в drawer — sticky сверху** (коммит `f5f5e5f`):
- ✅ Профиль + поиск = `shrink-0` (sticky top, не уходят при скролле)
- ✅ Всё ниже = `flex-1 overflow-y-auto overscroll-contain` (отдельный скролл-контейнер)
- ✅ iOS zoom prevention: `fontSize: "16px"` на input
- ✅ `inputMode="search"`, `enterKeyHint="search"`
- ✅ Prod OK

**5. Order edit panel — мобильные формы** (коммит `1e3618b`):
- ✅ Все инпуты: `text-sm` → `text-base sm:text-sm` (16px на мобилке — без iOS zoom)
- ✅ Все кнопки: `min-h-[38px]` → `min-h-[44px]` (proper touch targets)
- ✅ Prod OK

**6. Поиск УБРАН из drawer** (коммит `d4856fa`):
- ✅ Арман: "поиск это ад, невозможно писать не нервничая"
- ✅ Удалён весь блок поиска (-57 строк): input, ref, state, фильтрация, "Ничего не найдено"
- ✅ Недавние и Quick Actions теперь всегда видны (не скрываются при поиске)
- ✅ Навигационные секции больше не раскрываются принудительно
- ✅ Prod OK

**Файлы изменены:**
- `components/admin/admin-shell.tsx` — settings panel убран, аватарки, поиск добавлен и убран, scroll fix
- `components/admin/admin-mobile-bottom-nav.tsx` — таб Ещё→Аккаунт (из сессии 10, уже был)
- `components/admin/order-edit-panel.tsx` — 16px inputs + 44px buttons

**Итого: 7 коммитов (включая 2 из предыдущей сессии), все верифицированы, 0 ошибок.**

**🔥 ВАЖНЫЙ УРОК ДЛЯ БУДУЩИХ СЕССИЙ:**
- Арман устал от мелочёвки: "мы застряли", "я скоро болеть начну из за сайта"
- НЕ оставлять косяки при создании фичи — доводить до конца СРАЗУ
- Например: если ARAY Control уже липкий, НЕ дублировать настройки в drawer
- Каждая мелочь = отдельный деплой = 5-10 мин ожидания = нервы Армана
- Следующие сессии: СЕРЬЁЗНЫЕ ЗАДАЧИ, не полировка
- Арман хочет двигаться к бирже, профилям отзывщиков, аналитике

**Мобильный аудит форм — начат, не завершён:**
- ✅ order-edit-panel.tsx — исправлен
- [ ] admin/site/page.tsx — кастомные инпуты text-sm (проверить)
- [ ] dialog.tsx — fixed positioning (проверить с клавиатурой)
- [ ] confirm-dialog.tsx — z-200 (проверить)
- [ ] button.tsx — h-10 → h-11 на мобилке (проверить)
- [ ] Другие admin формы — полный аудит

### Сессия 17.04.2026 (сессия 10) — Моб меню 2.0 ПОШАГОВО (5 коммитов, 0 ошибок)

**Урок сессии 9 усвоен:** каждое изменение = отдельный коммит → verify prod → следующее.

**Шаг 0 — Синхронизация:**
- ✅ Обнаружено: 3 ключевых файла рассинхронизированы (Cyrillic vs Latin) после краша сессии 9
- ✅ Полная синхронизация ~115 файлов через `__fullsync.js`
- ✅ Все MATCH после синхронизации

**Шаг 1 — Убрать палитру из drawer** (коммит `0995464`):
- ✅ Палитра убрана из inline settings panel в MobileMenuBottomSheet
- ✅ Палитра остаётся доступной через липкий ARAY Control справа
- ✅ -18 строк, prod OK

**Шаг 2 — Таб "Ещё" → "Аккаунт"** (коммит `af7c6ac`):
- ✅ Иконка `MoreHorizontal` → `UserCircle`
- ✅ Текст "Ещё" → "Аккаунт"
- ✅ Prod OK

**Шаг 3 — Поиск по разделам в drawer** (коммит `80e423a`):
- ✅ Поле поиска между профилем и quick actions
- ✅ Фильтрует навигацию по label/groupLabel
- ✅ Quick actions скрываются при поиске
- ✅ Все группы раскрываются при поиске
- ✅ "Ничего не найдено" с иконкой
- ✅ Сброс при закрытии drawer
- ✅ Prod OK

**Шаг 4 — Секция "Недавние"** (коммит `876938a`):
- ✅ Горизонтальный скролл последних 4 посещённых разделов
- ✅ Сохраняется в localStorage (`aray-recent-sections`)
- ✅ Трекинг при клике на quick actions и nav items
- ✅ Скрывается при поиске
- ✅ Prod OK

**Шаг 5 — Бейджи-уведомления на разделах** (коммит `3345ea3`):
- ✅ Красные бейджи с count на Заказы/Отзывы/Команда
- ✅ Загружаются при открытии drawer (3 параллельных fetch)
- ✅ Только для staff (не USER)
- ✅ Prod OK

**Файлы изменены:**
- `components/admin/admin-shell.tsx` — поиск, недавние, бейджи, убрана палитра из drawer
- `components/admin/admin-mobile-bottom-nav.tsx` — таб Ещё→Аккаунт, UserCircle

**Итого: 5 коммитов, 5 верификаций, 0 ошибок, 0 откатов.**

### Сессия 17.04.2026 (сессия 9) — Попытка моб меню 2.0 → снова откат (/cabinet 500)

**Что хотели сделать** (по просьбе Армана):
1. Убрать Палитру из мобильного drawer (ARAY Control остаётся липким)
2. Dock: 4 таба (Дашборд | Задачи | Финансы | Аккаунт) без центрального Арая
3. Арай — отдельная floating FAB справа (старый SVG-орб, не WebGL, только перенос позиции)
4. + Поиск по разделам в drawer
5. + Секция «Недавние» — 4 последних посещённых раздела
6. + Бейджи-уведомления на разделах
7. В будущем: живой Арай = тот самый «первый шар-солнце» (`aray-orb.tsx`) + **внутренние свободные нити** внутри сферы (медуза + солнце)

**Что сделал (коммит `928f75b`):**
- ✅ Всё закодил, TypeScript 0 ошибок, локальный `next build` прошёл (были только Prisma connection errors на локальном PG, не связанные)
- ❌ Задеплоил на прод — `/cabinet` начал возвращать **HTTP 500**, все остальные страницы 200 OK
- Сделал экстренный revert (коммит `948a30f`) — прод снова работает как до

**Гипотезы причины 500 (для следующей сессии):**
1. `AdminArayFloating` с `createPortal` или dynamic import — на SSR `/cabinet` (force-dynamic) что-то валит
2. Один из 4 новых useEffect в MobileMenuBottomSheet (load recent, track pathname, poll badges, reset search) падает при hydration `/cabinet`
3. `searchInputRef` или иконки `Search/Clock` где-то не резолвятся

**🔥 ПРАВИЛО ДЛЯ БУДУЩИХ КРУПНЫХ UI-ИЗМЕНЕНИЙ:**
1. **Пошаговые коммиты.** Не смешивать 5 задач в 1 коммит. Каждое изменение — отдельный commit → verify prod (включая `/cabinet`, `/admin`, `/catalog`, `/`, `/login`) → следующий коммит.
2. **Локальный dev-сервер обязателен** перед деплоем большого рефакторинга админки. `npm run dev` + открыть все routes в браузере.
3. **Если /cabinet сломан — это AdminShell проблема**, так как cabinet/layout.tsx использует AdminShell.
4. `force-dynamic` на cabinet + на admin означает что каждый запрос — новая SSR-серия. SSR-safe код обязателен.

**Что в локальных файлах сейчас (после revert):**
- Палитра **обратно** в drawer (settings panel), не убрана
- Dock — старая схема (2 tabs + центр-Арай + Колокольчик + Ещё)
- AdminArayFloating удалён
- Поиск/недавние/бейджи — не реализованы

**План для следующей сессии (в порядке приоритета):**
1. Найти причину 500 на `/cabinet` через локальный dev (запустить `npm run dev` + открыть /cabinet)
2. Пошагово вернуть изменения: каждое отдельным коммитом с verify
   - Шаг 1: только убрать палитру из drawer → verify
   - Шаг 2: только переименовать "Ещё" → "Аккаунт" (User icon) → verify
   - Шаг 3: только поиск по разделам → verify
   - Шаг 4: только Недавние → verify
   - Шаг 5: только бейджи → verify
   - Шаг 6: 4-табовый dock + AdminArayFloating → verify
3. Про Арая («первый шар-солнце» + внутренние нити) — отдельная отдельная сессия, сначала локальный прототип → screenshot → одобрение Армана → деплой

**Важные файлы сохранены для референса:**
- `components/admin/admin-aray-floating.tsx` — удалён из git в revert, но код его в чате (можно восстановить)
- Весь мой код drawer-изменений — в diff коммита `928f75b` (можно увидеть через `git show 928f75b`)

### Сессия 17.04.2026 (сессия 8) — ОТКАТ сессии 7 (Живой Арай = провал)

**Что случилось:** Сессия 7 (WebGL Live Aray) была откачена. Я сделал **проволочный глобус** (18 меридианов × 12 параллелей — строгая математическая сфера), но Арман в видении видел **медузу из света — тонкие свободные нити энергии без чётких границ**. Я попал в «противоположную картинку». Арман справедливо расстроился: «мы получили наоборот картинку».

**Что сделано:**
- `git revert b89fbd9` → коммит `d58b9e6 Revert "feat: living Aray..."`, задеплоен в прод
- `aray-creature.tsx` и `aray-floating.tsx` удалены
- `app/(store)/layout.tsx` → `<ArayWidget>` возвращён на место
- `components/store/mobile-bottom-nav.tsx` → центральная кнопка Арая восстановлена (long-press «aray:voice», short-tap «aray:open», arayPulse, setArayPulse)
- `components/admin/admin-mobile-bottom-nav.tsx` → onArayOpen/arayListening/arayHasNew props + ArayOrb восстановлены
- `package.json` → `three` и `@types/three` удалены (не нужны)
- Prod: HTTP 200 везде, bundle /cbn 353k (было 360k c three.js — урезано)

**Арман просил сохранить:**
- «голос у меня не теряй» → push-to-talk через long press в dock работает (`aray:voice` event)
- «чат пусть будет со старого Арая» → ArayChatPanel + AI chat нетронуты
- «все настроено было» → физически не трогал ArayWidget — только удалил свои новые файлы

**🚨 ПРАВИЛО НА БУДУЩЕЕ — ВИЗУАЛЬНЫЕ ИЗМЕНЕНИЯ АРАЯ**

Арай — **священная сущность** для Армана, он её увидел во сне. Категорически запрещено:
1. **Не деплоить визуал Арая без предварительного screenshot-показа Арману.** Не «я сделал, вот prod — смотри», а «вот как он выглядит локально (скрин), одобряешь?» → ответ → деплой.
2. **Не делать «математические» формы** (сферы, кубы, правильные сетки) — это противоположно «живому существу».
3. **Медуза, не глобус.** Нити тонкие, прозрачные (opacity ≤ 0.3), свободные кривые, концы уходят в пустоту, без замыкания в сферу. Как подводная медуза из света.
4. **Прежде чем писать код — уточнить «чувство»:** спокойное/энергичное/дышащее. Арман сказал «медуза из света — плавные движения» (сессия 8).
5. **Использовать 3-8 лент максимум.** Каждая лента — LineSegments с множеством точек по свободной кривой Безье в 3D. Не сферические координаты.
6. **Тест через Chrome in Chrome ДО коммита.** Локальный dev → Chrome → screenshot → показать Арману → получить одобрение → commit.
7. **Не прятать Арая в чат-панели.** Арман любит старый SVG-орб как аватар в чате — не трогать.
8. **Не удалять старый `aray-widget.tsx` пока новое существо не одобрено.** Это safety net.

**Что в план на живого Арая 2.0 (когда-нибудь):**
- Опираться на видение «медуза из света»
- 6 тонких лент, каждая извивается независимо по кривой Безье
- Концы лент fade-to-transparent (не замыкаются)
- Opacity 0.15-0.3, additive blending
- Размер 100-150px, очень прозрачный
- POC как отдельный демо-route (`/demo/aray-v2`) → показать скрин → одобрение → только потом заменять
- Перед началом — читать это правило 7 раз

### Сессия 17.04.2026 (сессия 7, ночь) — Живой Арай (WebGL/Three.js) 🔥

**Видение Армана реализовано:** Арай больше не иконка в dock, а **живое парящее существо** из вибрирующих нитей энергии. Three.js WebGL, не SVG. Полупрозрачное, дышащее, реагирующее на состояние.

**Новые файлы:**
- `components/shared/aray-creature.tsx` — **сам организм** (295 строк)
  - Three.js r184 сфера из 18 меридианов × 12 параллелей × 48 сегментов = ~1500 точек
  - LineBasicMaterial + AdditiveBlending → мягкое свечение
  - Inner core sphere (radius 0.3) + outer aura (radius 1.25, BackSide) — многослойное свечение
  - Perlin-like noise на positions (smoothNoise) → плавная вибрация каждый кадр
  - Breathing scale oscillation 0.92-1.08 с разной частотой по состоянию
  - 4 состояния: idle / listening / thinking / speaking (разные vibrateAmp, breatheFreq, radialPull, opacity)
  - Цвет синхронизирован с `--brand-primary` CSS var (HSL parse → hex), обновляется каждые 800мс
  - Visibility API: пауза рендера когда tab скрыт (battery)
  - Mobile detection: меньшая плотность нитей на мобилке (14 меридианов × 9 параллелей × 32 сегмента)
  - Full cleanup на unmount (dispose всех geometries/materials, remove canvas)
  - Graceful fallback: CSS glow круг если WebGL не поддерживается

- `components/shared/aray-floating.tsx` — **floating wrapper** (285 строк)
  - `position: fixed`, привязка к правому краю (EDGE_MARGIN=12px)
  - Draggable только по Y (вертикально), pointer events + clampY
  - Y-позиция сохраняется в localStorage (`aray-floating-y`)
  - **Short tap** (<350мс без движения) → открыть `ArayChatPanel`
  - **Long press** (≥500мс) → показать `PalettePopup` (inline, с glass-эффектом, кнопки палитр сгруппированы по PALETTE_GROUPS)
  - **Drag threshold** 8px — отличает tap от drag, cancel long-press если движение
  - Haptic feedback (vibrate) на tap/long-press/palette-select
  - State propagation: при press → creature "thinking", при chat open → "speaking", при palette → "listening"
  - Portal в document.body → всегда поверх, z-index 80
  - clampY учитывает mobile bottom-nav (90px guard) — не залазит на dock
  - Accessibility: role=button, tabIndex, Enter/Space, Shift+Enter → palette

**Изменения в интеграции:**
- `app/(store)/layout.tsx`: `<ArayWidget>` заменён на `<ArayFloating>` (lazy-load через dynamic, ssr: false)
- `components/store/mobile-bottom-nav.tsx`: убран центральный Арай-таб (dock теперь 4 чистых таба: Каталог | Поиск | Корзина | Профиль), удалены openAray/onArayPointerDown/onArayPointerUp/arayPulse/setArayPulse
- `components/admin/admin-mobile-bottom-nav.tsx`: убран центральный слот с ArayOrb, props onArayOpen/arayListening/arayHasNew помечены @deprecated (совместимость)

**Зависимости:**
- `three@0.184.0` — dependencies (runtime бандл)
- `@types/three@0.184.0` — devDependencies

**⚠️ Важный урок про `NODE_ENV`:**
- В Desktop Commander `NODE_ENV=production` по умолчанию → `npm install` **выбрасывает devDependencies** (typescript, prisma исчезли, сломали весь build chain)
- Решение: при установке новых пакетов передавать `env: { ...process.env, NODE_ENV: 'development' }` + `--include=dev`
- Скрипт `D:\pilorus\__fix-dev.js` лежит на случай повторения

**Деплой:** commit `b89fbd9 feat: living Aray — WebGL creature from threads, floating right edge, replaces dock orb`, push OK, 7 файлов, +794/-66 строк.

**Что осталось для полного завершения видения:**
- [ ] Добавить ArayFloating в admin layout (сейчас только store) — AdminShell сложный, отдельная итерация
- [ ] Добавить в cabinet layout
- [ ] Интеграция состояний с AI: chat.pending → creature.thinking, chat.streaming → creature.speaking
- [ ] Voice input (Web Speech API) → state=listening
- [ ] Hide ArayFloating на страницах checkout/auth (когда идёт платёж)
- [ ] Protect from overlap с другими floating: contact-widget, cart-drawer
- [ ] Удалить старый компонент `components/store/aray-widget.tsx` (1400+ строк) после проверки что новый работает

### Сессия 17.04.2026 (сессия 6, вечер) — Восстановление повреждённой локальной папки + WebP коммит + 5 TS fixes

**Статус проверки "всё ли четко":**
- ✅ Production живой (все страницы HTTP 200: /, /catalog, /contacts, /cart, /about, /news)
- ❌ Но в локальной Cyrillic папке D:\ПилоРус\website обнаружено:
  - **428 файлов повреждены нулевыми байтами на конце** (обрезанное содержимое + \0 паддинг)
  - **git index corrupt** — `index uses ��b� extension`
  - **git diverged**: Cyrillic отставал от origin/main на 17 коммитов + 2 старых своих коммита
  - **55 TypeScript ошибок** (после prisma generate → 5)

**Что сделано — восстановление:**
- ✅ Удалён повреждённый `.git/index` + lock-файлы (HEAD.lock, index.lock)
- ✅ `git fetch origin` → подтянул актуальный origin (9f56ad6 → **350cee2 feat: auto WebP optimization**)
- ✅ `git reset --hard origin/main` + `git checkout -f HEAD` + `git clean -fdx` → все 428 файлов восстановлены из git
- ✅ **0 битых файлов** после восстановления (405 OK)
- ✅ `npx prisma generate` — 55 → 5 TS ошибок (stale client не знал про ArayMessage/ActivityLog/Subscription/avatarUrl — те же 43 что в сессии 14.04)
- ✅ 5 оставшихся TS ошибок пофикшены:
  - `app/(store)/catalog/page.tsx`: добавлен `search?: string` в `SearchParams` interface
  - `app/(store)/catalog/page.tsx`: `(v: any)` вместо implicit any в 2 `.map()` (строки 172, 496) — нужно потому что `productsRaw: any[] = []` fallback для try/catch
  - `components/admin/admin-shell.tsx`: `safeTheme: string = (mounted ? theme : "dark") ?? "dark"` (гарантирует `string`, не `string | undefined`)

**Деплой:** commit `a8b1888 fix: 5 TS errors — SearchParams.search, implicit any in catalog, safeTheme undefined fallback`, push OK, все страницы HTTP 200 ✅ (включая `/catalog?search=доска`)

**Ключевой урок:** двойной путь Cyrillic ↔ Latin требует периодической синхронизации. Когда файловые тулы Claude видят `D:\ПилоРус\website` — это зеркало, НЕ настоящий git. Настоящий git в `D:\pilorus\website`. Если Cyrillic отстаёт от origin → файлы могут корраптиться при частичной записи. В будущих сессиях: при подозрительных TS ошибках сразу делать `prisma generate`, при подозрении на битые файлы — `git reset --hard origin/main` через Desktop Commander на Cyrillic папке.

**Временные утилиты в D:\pilorus\ (для переиспользования):**
- `__sync.js` — sync Cyrillic → Latin (список файлов внутри, редактировать)
- `__commit.js` — git add + commit + push из Latin
- `__verify.js` — curl проверка production URLs
- `__recover.js` — восстановление Cyrillic из origin/main (удаление index + reset + checkout -f + clean)
- `__prisma-gen.js` — prisma generate + tsc --noEmit
- `__tsc.js` — быстрый TypeScript check
- `__verify-files.js` — проверка nullbyte corruption в .ts/.tsx/.js

### Сессия 17.04.2026 (сессия 5) — ARAY Control рефакторинг + колокольчик в dock

**ARAY Control — Liquid Glass + мобилка:**
- ✅ ARAY Control теперь виден на мобилке (убран `hidden lg:block`) — липкий справа
- ✅ Liquid Glass стиль: `blur(50px) saturate(200%)`, refraction highlight, dark/light варианты
- ✅ Убрана вкладка "Язык" из ARAY Control полностью
- ✅ ARAY Control = только оформление (палитра + тема + шрифт на десктопе)
- ✅ Уведомления убраны из ARAY Control — перенесены в dock

**Колокольчик в нижнем dock:**
- ✅ Новый layout dock: Главная | Заказы | Арай-орб | 🔔 Новое | Ещё
- ✅ Колокольчик с красным бейджем (count), polling каждые 30 сек
- ✅ Нажатие → glass popup снизу с заказами/отзывами/заявками сотрудников
- ✅ Chime при новом заказе (playOrderChime)
- ✅ Popup стилизован под dock (те же CSS vars)

**Язык — в профиль:**
- ✅ Секция "Язык интерфейса" добавлена в `/cabinet/profile` (AdminLangPickerInline)
- ✅ Язык убран из мобильного settings sheet и ARAY Control
- ✅ Одно место для настройки языка — профиль

**Cleanup:**
- ✅ Удалён мобильный settings sheet (правый) — дублировал ARAY Control
- ✅ Убран импорт Sheet/SheetContent из admin-shell
- ✅ Размер шрифта скрыт на мобилке в ARAY Control (`hidden lg:block`)
- ✅ ARAY Control: bottom layout = `return null` (не используется)
- ✅ -419 строк / +265 строк = чище, проще

**Деплой:** commits `4eda27f` → `47b320e`, все страницы HTTP 200 ✅

**Файлы изменены:**
- `components/admin/aray-control-center.tsx` — полная переписка (443→165 строк)
- `components/admin/admin-mobile-bottom-nav.tsx` — полная переписка (214→280 строк, колокольчик+popup)
- `components/admin/admin-shell.tsx` — убран settings sheet, Sheet импорт, mobileSettingsOpen
- `app/cabinet/profile/page.tsx` — добавлена секция "Язык интерфейса"

### Сессия 17.04.2026 (сессия 4) — Liquid Glass мобильное меню (iOS 26)

**Мобильное меню админки — Liquid Glass Bottom Sheet:**
- ✅ Левый Sheet drawer → Bottom Sheet popup с Liquid Glass эффектом
- ✅ `components/admin/admin-shell.tsx`:
  - **Liquid Glass фон**: multi-layer transparency — `linear-gradient` рефракция на верхнем крае + `backdrop-blur(40px) saturate(200%)` + тонкие borders `rgba(255,255,255,0.18)`
  - **Quick Actions grid**: 3-колоночная сетка самых частых разделов по ролям (admin: 6 кнопок, manager: 4, courier: 3, warehouse: 3, user: 3). Каждая кнопка — glass card с цветной иконкой и подсветкой
  - **Навигационные секции**: glass-карточки с аккордеоном (Продажи/Товары/Контент/Маркетинг/Настройки/Помощь). Кликабельный заголовок + ChevronDown для сворачивания
  - **Встроенная навигация**: вся MOBILE_NAV определена прямо в компоненте (не через AdminNav) — полный контроль UX: quick actions + glass секции
  - **getQuickActions(role)**: smart подбор по роли — ADMIN видит 6 кнопок (Дашборд/Заказы/CRM/Товары/Аналитика/Команда), COURIER — 3 (Дашборд/Заказы/Маршрут), и т.д.
  - Spring анимация: `type: "spring", damping: 30, stiffness: 280`
  - `rounded-t-[32px]`, `maxHeight: 90dvh`
  - Профиль в glass card, кнопка настроек в glass button
  - Active state: glow эффект (`boxShadow: 0 0 12px color/40`) + точка-индикатор
  - Backdrop: `blur(12px) saturate(140%)`
  - safe-area-inset-bottom, swipe-to-close (60px threshold)
  - Auto-expand секции с активной страницей
- ✅ `components/admin/admin-mobile-bottom-nav.tsx` — обновлён комментарий
- ✅ Правый Settings Sheet оставлен как есть

**Деплой:** commits `7db6611` → `4e71c36`, push OK

### Сессия 17.04.2026 (сессия 3) — Навигация + ARAY Control совершенство

**Глобальный Input компонент:**
- ✅ `components/ui/input.tsx` — h-10→h-11 на мобилке (40→44px), py-2→py-2.5, text-base→text-base sm:text-sm

**Checkout мобильная полировка:**
- ✅ Login/register формы: inputs py-2→py-3 sm:py-2, text-sm→text-base sm:text-sm
- ✅ Login/register кнопки: py-2→py-3 sm:py-2
- ✅ Auth toggle (Гость/Войти/Регистрация): py-2→py-2.5 sm:py-2
- ✅ Textarea комментарий: py-2→py-3, text-sm→text-base sm:text-sm
- ✅ Push "Включить" кнопка: py-1.5→py-2.5 sm:py-1.5
- ✅ "Построить маршрут" ссылка: py-2.5→py-3 sm:py-2.5

**Header store icons (5 кнопок):**
- ✅ Поиск, Избранное, Тема, Корзина, Личный кабинет: w-9 h-9→w-10 h-10 (36→40px)

**Admin nav:**
- ✅ Навигационные пункты: py-2.5→py-3 (40→44px touch targets)
- ✅ Staff pending badge: 18px→20px, text-[9px]→text-[10px], text-black→text-amber-950

**Admin bottom nav dock:**
- ✅ Все текст-метки: text-[9px]→text-[10px] (DockTab, ARAY орб, "Ещё")
- ✅ Активный индикатор: w-1 h-1 точка → w-4 h-1 полоска (гораздо заметнее)

**ARAY Control Center (полная полировка):**
- ✅ Размеры шрифтов: 3→5 ступеней (xs/sm/md/lg/xl) — синхронизация с MobileFontControl
- ✅ Collapsed pill buttons: p-2→p-2.5 (больше touch area)
- ✅ Badge text: text-[9px]→text-[10px], text-[8px]→text-[10px]
- ✅ Badge размер: min-w-[14px]→min-w-[16px], h-3.5→h-4
- ✅ Notification items: py-2.5→py-3, text-[11px]→text-[12px] (обе панели — right и bottom)
- ✅ Hover: bg-white/[0.04]→bg-white/[0.06] и bg-primary/[0.04]→bg-primary/[0.06]
- ✅ Кнопка закрытия: p-1→p-1.5
- ✅ "Все новые заказы →": text-[11px]→text-[12px], py-2→py-2.5
- ✅ Header label: text-[11px]→text-[12px]
- ✅ Палитры: w-7→w-8, gap-1.5→gap-2
- ✅ Тема/шрифт кнопки: py-2→py-2.5
- ✅ Язык кнопки: py-2.5→py-3
- ✅ aria-label добавлены на все кнопки collapsed pill
- ✅ Tab count badge: text-[9px]→text-[10px]

**Z-index аудит:**
- ✅ Проверен — уже консистентный: z-[5] main → z-40 panels → z-50 nav → z-[200] overlays → z-[201] content

**Файлы изменены (9 файлов):**
- `components/ui/input.tsx`
- `components/store/wishlist-count.tsx`
- `components/layout/header.tsx`
- `components/admin/admin-nav.tsx`
- `components/admin/admin-mobile-bottom-nav.tsx`
- `components/admin/aray-control-center.tsx`
- `app/(store)/checkout/page.tsx`

**Деплой:** commit `43edb6b`, все страницы HTTP 200 ✅

### Сессия 17.04.2026 (продолжение) — Мобильный UX аудит + touch targets

**Мобильный код-аудит (2 параллельных агента):**
- ✅ Проверены 15+ компонентов: header, bottom nav, product card, catalog, filters, cart, checkout, variant selector, contact widget, PWA/push banners
- Найдено ~25 потенциальных проблем, исправлены самые критичные

**Touch targets исправлены (5 файлов):**
- ✅ `components/layout/header.tsx` — hamburger кнопка w-9→w-11 (36→44px), close кнопка w-8→w-10 (32→40px)
- ✅ `app/(store)/catalog/page.tsx` — пагинация h-10→h-11, w-10→w-11 (40→44px)
- ✅ `components/store/variant-selector.tsx` — кнопки размеров py-2.5→py-3 на мобилке (40→44px)
- ✅ `components/store/catalog-mobile-filter.tsx` — кнопки размеров и типов py-1.5→py-2.5 (24→36px)
- ✅ `app/(store)/cart/page.tsx` — кнопки +/- количества py-2.5→py-3 (40→44px)

**Деплой:** commit `5e93435`, все страницы HTTP 200 ✅

**Оставшиеся мобильные задачи (не критичные, на следующие сессии):**
- [ ] Contact widget z-index конфликт с admin bottom nav (z-50 vs z-50)
- [ ] PWA/push баннеры перекрывают bottom nav на мобилке (bottom: 80-84px)
- [ ] Checkout инпуты: py-2→py-3 на мобилке
- [ ] text-[10px] на бейджах product card (ниже 12px, но визуально приемлемо)
- [ ] Admin bottom nav: tab width ~27px (ниже 44px стандарта, но стандарт для bottom nav)

### Сессия 17.04.2026 — Визуальный аудит production + полировка стилей

**Визуальный аудит production (pilo-rus.ru в Chrome):**
- ✅ Главная страница: hero, quick links, benefits, категории, акции, хиты продаж, калькулятор, производство, доставка, отзывы (4.8), CTA, футер — всё чисто
- ✅ Каталог: фильтры типов, сортировка, карточки товаров, пилюли размеров — ОК в светлой и тёмной темах
- ✅ Страница товара: фото, quick features (Производитель/ГОСТ/Доставка), размеры, единицы, цена, корзина, варианты, описание-аккордион, отзывы (6), похожие товары
- ✅ Контакты: 3 телефона, email, адрес, режим работы, реквизиты, форма заявки
- ✅ Доставка: блоки доставка/самовывоз с детальной информацией
- ✅ О производстве: статистика (2000 м², 10+ лет, 500+ клиентов), история
- ✅ Корзина (пустая): аккуратный empty state с кнопкой "Перейти в каталог"
- ✅ Футер: все 3 телефона, категории, ссылки, соцсети

**Код-аудит админки (21 потенциальная проблема проверена):**
- ✅ `bg-gray-100 text-gray-700` fallback → `bg-muted text-muted-foreground` (4 файла)
  - `app/admin/clients/clients-list.tsx` — STATUS_COLORS fallback
  - `app/admin/page.tsx` — ORDER_STATUS_COLORS fallback на дашборде
  - `app/admin/orders/[id]/page.tsx` — statusColor fallback
  - `app/admin/email/page.tsx` — bg-gray-100 → bg-muted
- ✅ Проверены и оставлены как есть (намеренно):
  - staff/page.tsx `bg-gray-300` — декоративные точки онлайн-статуса (зелёный/жёлтый/серый)
  - inventory-client.tsx `text-gray-500` — только для print:block
  - `classic ? "text-foreground"` в ambient-sound/bg-picker/day-planner — CSS safety net `.aray-sidebar *` перебивает
  - Inline `style={{}}` с `hsl(var(--primary))` в aray-control-center — уже используют CSS vars
  - `text-white/*` в admin-nav — внутри always-dark sidebar, корректно

**Файлы изменены (4 файла):**
- `app/admin/clients/clients-list.tsx`
- `app/admin/page.tsx`
- `app/admin/orders/[id]/page.tsx`
- `app/admin/email/page.tsx`

**Деплой:** commit `14bec5e`, все страницы HTTP 200 ✅

### Сессия 16.04.2026 (ночь 4) — SEO-аудит + оптимизация

**SEO-аудит (полный):**
- ✅ robots.txt — ОК (Yandex directives, Clean-param, disallow /admin /cabinet /api)
- ✅ sitemap.xml — динамический из БД (категории + товары + новости)
- ✅ Метрика + GA4 — подключение через SiteSettings (components/analytics.tsx)
- ✅ Product Schema (JSON-LD) — уже был: @type Product, AggregateOffer, AggregateRating
- ✅ LocalBusiness Schema — в root layout (адрес, телефоны, координаты, зона обслуживания)
- ✅ OG Image — динамическая генерация (app/opengraph-image.tsx, 1200×630)
- ✅ PWA manifest — полный (icons, screenshots, categories)

**SEO-исправления:**
- ✅ BreadcrumbList Schema на страницы товаров (Главная → Каталог → Категория → Товар)
- ✅ BreadcrumbList Schema на каталог (Главная → Каталог [→ Категория])
- ✅ Убраны дубли "| ПилоРус" в title (template уже добавляет суффикс)
  - Исправлено: homepage, terms, product, news, news/slug, services
- ✅ Укорочены длинные title/description (contacts, about, homepage, services)
- ✅ Добавлен canonical URL на каталог (был MISSING)
- ✅ Каталог: title улучшен с "Каталог пиломатериалов" → "Каталог пиломатериалов — цены от производителя"

**Файлы изменены (9 файлов):**
- `app/(store)/page.tsx` — title/desc укорочены
- `app/(store)/catalog/page.tsx` — BreadcrumbList + canonical + title
- `app/(store)/product/[slug]/page.tsx` — BreadcrumbList + title без дубля
- `app/(store)/contacts/page.tsx` — title/desc укорочены
- `app/(store)/about/page.tsx` — title/desc укорочены
- `app/(store)/terms/page.tsx` — title без дубля
- `app/(store)/news/page.tsx` — title без дубля
- `app/(store)/news/[slug]/page.tsx` — title без дубля
- `app/(store)/services/page.tsx` — title улучшен + desc

### Сессия 16.04.2026 (ночь 3) — Централизация телефонов + email sanitization

**Централизация телефонов (22 файла):**
- ✅ Создан `lib/phone-constants.ts` — PHONE_LINK, PHONE_DISPLAY, PHONE2/3 для client-компонентов
- ✅ Server-компоненты (terms, privacy, cabinet): используют `getSiteSettings()`/`getSetting()` для динамических телефонов из БД
- ✅ Client-компоненты (track, forgot-password, cart, variant-selector, contact-form, partnership-modal, admin/help, admin/email): используют `PHONE_LINK`/`PHONE_DISPLAY` из phone-constants
- ✅ Lib-файлы (email.ts, mail.ts, invoice-pdf.tsx): используют `DEFAULT_SETTINGS.phone` / `DEFAULT_SETTINGS.phone_link`
- ✅ API routes (partnership, admin/email, admin/seo): используют `DEFAULT_SETTINGS.phone`
- ✅ Homepage (page.tsx): все 3 ссылки на телефон теперь динамические через `getSetting()`

**Где телефоны остались hardcoded (намеренно):**
- `lib/site-settings.ts` — DEFAULT_SETTINGS (источник правды)
- `lib/phone-constants.ts` — клиентские константы (зеркало DEFAULT_SETTINGS)
- `components/layout/header.tsx` — DEFAULT_PHONES (fallback для client)
- `components/store/contact-widget.tsx` — default props
- `app/admin/site/page.tsx` — placeholder текст в UI настроек
- Metadata объекты (static export) — не могут быть динамическими

**Email HTML sanitization:**
- ✅ `app/api/admin/email/route.ts` — strip `<script>`, event handlers (`onXxx=`), `javascript:` URLs

**Файлы изменены (22 файла):**
- `lib/phone-constants.ts` — NEW: централизованные телефонные константы
- `app/(store)/page.tsx` — 3-я ссылка на телефон динамическая
- `app/(store)/cart/page.tsx` — PHONE_LINK/PHONE_DISPLAY
- `app/(store)/terms/page.tsx` — getSetting()
- `app/(store)/privacy/page.tsx` — getSetting()
- `app/(store)/track/page.tsx` — PHONE_LINK
- `app/(store)/product/[slug]/page.tsx` — DEFAULT_SETTINGS.phone в metadata
- `app/(auth)/forgot-password/page.tsx` — PHONE_LINK/PHONE_DISPLAY
- `app/cabinet/page.tsx` — getSetting()
- `app/admin/email/page.tsx` — PHONE_DISPLAY
- `app/admin/help/page.tsx` — PHONE_LINK/PHONE_DISPLAY
- `app/api/admin/email/route.ts` — DEFAULT_SETTINGS.phone + HTML sanitization
- `app/api/admin/seo/route.ts` — DEFAULT_SETTINGS.phone
- `app/api/partnership/route.ts` — DEFAULT_SETTINGS.phone
- `components/store/variant-selector.tsx` — PHONE_LINK
- `components/store/partnership-modal.tsx` — PHONE_DISPLAY
- `components/store/contact-form.tsx` — PHONE_LINK
- `lib/email.ts` — DEFAULT_SETTINGS.phone/phone_link
- `lib/mail.ts` — DEFAULT_SETTINGS.phone/phone_link
- `lib/invoice-pdf.tsx` — DEFAULT_SETTINGS.phone

### Сессия 16.04.2026 (ночь 2) — Полировка дизайна + UX аудит

**Checkout динамический:**
- ✅ Адрес самовывоза берётся из settings (не hardcoded)
- ✅ Координаты Яндекс.Карт динамические (`pickup_coords` setting)
- ✅ Режим работы уже загружался из API, теперь и адрес тоже

**Orders QuickView — полный рефакторинг стилей:**
- ✅ Убраны все inline `style={{}}` с rgba/hsl — заменены на Tailwind classes
- ✅ Убрана зависимость от `useClassicMode()` — теперь используются CSS vars автоматически
- ✅ `bg-muted/50 border border-border` вместо `{ background: "rgba(255,255,255,0.05)" }`
- ✅ `text-foreground`, `text-muted-foreground`, `text-primary` вместо inline color

**Глобальные стили:**
- ✅ `globals.css`: добавлен `-webkit-tap-highlight-color: transparent` на все интерактивные элементы
- ✅ Admin-shell: Google Translate div → Tailwind classes вместо inline style

**Mobile UX:**
- ✅ Bottom nav badge: 18px вместо 14px, text 10px вместо 9px, `bg-destructive` вместо hardcoded gradient
- ✅ Product page edit button: `safe-area-inset-bottom` для устройств с нотчем

**Файлы изменены (7 файлов):**
- `app/(store)/checkout/page.tsx` — dynamic address/coords
- `app/(store)/product/[slug]/page.tsx` — safe-area on edit button
- `app/admin/orders/orders-client.tsx` — QuickView CSS refactor (removed ~30 inline styles)
- `app/globals.css` — global tap-highlight-color
- `components/admin/admin-shell.tsx` — cleanup inline style
- `components/admin/admin-mobile-bottom-nav.tsx` — badge size fix

### Сессия 16.04.2026 (ночь) — Аудит: batch 2 — безопасность, UX, rate limiting

**Безопасность (4 бага закрыто):**
- ✅ Import API: parseFloat/parseInt валидация (NaN, отрицательные) + sanitize категорий/slug/названий (strip HTML, length limit)
- ✅ Media API: path traversal prevention — проверка `..`, `\\`, `//` + resolvedPath.startsWith(allowedBase)
- ✅ Watermark fetch: `AbortSignal.timeout(10000)` + проверка `res.ok`
- ✅ Rate limiting: создан `lib/rate-limit.ts` (in-memory, cleanup каждые 100 вызовов)
  - `POST /api/admin/clients/[id]/reset-password` — 5 за 15 мин
  - `POST /api/staff/register` — 3 в час (по IP)
  - `POST /api/auth/register` — 5 в час (по IP)

**UX/Quality (3 бага закрыто):**
- ✅ Search modal: error state с кнопкой "Попробовать снова" вместо тихого `.catch(() => {})`
- ✅ Product card: `onError={() => setImgError(true)}` → fallback градиент при битых картинках (и magazine, и обычный стиль)
- ✅ Пустой каталог: умное сообщение — объясняет ПОЧЕМУ пусто (поиск/тип/размер/наличие)

**Файлы изменены (10 файлов):**
- `app/api/admin/products/import/route.ts` — parseFloat validation + sanitize
- `app/api/admin/media/route.ts` — path traversal checks
- `app/api/admin/watermark/route.ts` — fetch timeout
- `app/api/admin/clients/[id]/reset-password/route.ts` — rate limiting
- `app/api/staff/register/route.ts` — rate limiting
- `app/api/auth/register/route.ts` — rate limiting
- `app/(store)/catalog/page.tsx` — smart empty state
- `components/store/search-modal.tsx` — error state
- `components/store/product-card.tsx` — image onError fallback
- `lib/rate-limit.ts` — NEW: shared rate limiter

### Сессия 16.04.2026 (вечер) — Аудит безопасности + деплой-инструкция + быстрые переходы

**Деплой-инструкция:**
- ✅ CLAUDE.md обновлён: полный рецепт деплоя через Desktop Commander (sync → commit → verify)
- ✅ Каждый новый сеанс знает как деплоить без вопросов

**Быстрые переходы на главной:**
- ✅ Заменены с типов (пустые результаты) на КАТЕГОРИИ (Сосна и Ель, Лиственница, Фанера, Липа и Осина)
- ✅ Кнопка "Написать отзыв" на главной → popup с формой (HomeReviewPopup компонент)
- ✅ API reviews: productId теперь необязателен (общий отзыв с главной)
- ✅ TYPE_GROUPS: `type=доска` показывает все подтипы (обрезная, строганная, террасная, пола)

**Универсальный фильтр размеров:**
- ✅ Размеры в каталоге работают для ВСЕХ форматов (и "25×100×6000", и "18 мм (1/1)")
- ✅ Динамический label: "Сечение" для досок/бруса, "Размер" для фанеры/листовых

**Мобильная версия:**
- ✅ "Работаем" скрыт на мобильном (`hidden lg:block`) — чище хедер
- ⚠️ Pills (фильтры типов) — Арман просил не трогать, текущий стиль ОК

**Аудит безопасности (42 бага найдено, 9 критических закрыто):**
- ✅ Posts API: `requireManager()` вместо простой проверки сессии (4 файла)
- ✅ Services API: `requireManager()` (2 файла)
- ✅ Posts generate: `requireManager()`
- ✅ Posts seed: `requireAdmin()`
- ✅ Ping API: `requireStaff()`
- ✅ Сброс пароля: plaintext НЕ возвращается если email отправлен
- ✅ Upload: whitelist MIME (jpeg/png/webp/gif) + whitelist расширений

**Файлы изменены:**
- `app/api/admin/posts/route.ts` — auth-helpers
- `app/api/admin/posts/[id]/route.ts` — auth-helpers
- `app/api/admin/posts/generate/route.ts` — auth-helpers
- `app/api/admin/posts/seed/route.ts` — auth-helpers
- `app/api/admin/services/route.ts` — auth-helpers
- `app/api/admin/services/[id]/route.ts` — auth-helpers
- `app/api/admin/clients/[id]/reset-password/route.ts` — password safety
- `app/api/upload/route.ts` — MIME + ext whitelist
- `app/api/admin/ping/route.ts` — auth-helpers
- `app/(store)/page.tsx` — quick links → categories + HomeReviewPopup
- `app/(store)/catalog/page.tsx` — universal sizes + TYPE_GROUPS
- `app/api/reviews/route.ts` — optional productId
- `components/store/home-review-popup.tsx` — NEW
- `components/store/catalog-filters.tsx` — universal size label
- `components/store/catalog-type-filter.tsx` — reverted to original
- `components/layout/header.tsx` — hidden Работаем on mobile
- `lib/product-types.ts` — TYPE_GROUPS + getTypeGroupKeywords()
- `CLAUDE.md` — deploy recipe

### Сессия 16.04.2026 — Полная переработка фильтров каталога + мега-меню

**Проблемы которые решили:**
- ❌ Фильтр типов показывал чужие товары (например "Имитация бруса" в разделе "Брус обрезной")
- ❌ ЦСП, МДФ, ДСП не появлялись в фильтрах (баг `\b` word boundary с кириллицей)
- ❌ Размеры в фильтрах не соответствовали реальным размерам товаров (были hardcoded)
- ❌ Мега-меню захламлено: 20+ типов + размеры = "портянка"

**lib/product-types.ts — Центральная система типов:**
- ✅ Исправлен баг Cyrillic word boundary: `\b` не работает с кириллицей → заменён на `(?<![а-яёА-ЯЁ])` / `(?![а-яёА-ЯЁ])` lookaround
- ✅ ЦСП, МДФ, ДСП, ДВП теперь корректно определяются
- ✅ `extractProductType()` — regex-based определение типа из имени товара
- ✅ `getAvailableTypes()` — динамические типы из реальных товаров
- ✅ `findTypeByKeyword()` — поиск типа по keyword

**app/(store)/catalog/page.tsx — Серверный каталог:**
- ✅ Заменён наивный `{ name: { contains: type } }` на regex-based `extractProductType(name).keyword === currentType`
- ✅ Размеры берутся из реальных вариантов (полный формат "25×100×6000", "35×140 Экстра")
- ✅ Убрана функция `extractCrossSection` — полные размеры передаются в фильтры

**components/store/catalog-filters.tsx — Сайдбар (полностью переписан):**
- ✅ Smart grouping: размеры группируются по сечению (первые 2 числа)
- ✅ `useGroups` порог (>12 размеров) → переключение между flat и grouped mode
- ✅ Grouped mode: кнопки сечений с count → раскрытие полных размеров с длинами/сортами
- ✅ Авто-раскрытие группы текущего выбранного размера
- ✅ `max-h-[200px]` scrollable контейнер для сечений
- ✅ Инфо "38 сечений · 75 размеров"

**components/store/catalog-mobile-filter.tsx — Мобильный фильтр:**
- ✅ `max-h-[260px]` scrollable контейнер для размеров
- ✅ `font-mono` для единообразного отображения размеров

**components/layout/header.tsx — Мега-меню (редизайн):**
- ✅ 3-колоночный layout: Категории (с иконками и count) | Типы (2-col grid навигация) | Quick actions
- ✅ Убраны hardcoded `MATERIAL_TYPES` и `COMMON_SIZES` — используются динамические данные
- ✅ `TYPE_ICONS` map по keyword + fallback иконка
- ✅ Мега-меню теперь чистая навигация (не фильтр-панель)

**app/(store)/layout.tsx — Store layout:**
- ✅ `extractUniqueCrossSections()` — для мега-меню берёт уникальные сечения из вариантов
- ✅ `getAvailableTypes()` — динамические типы из реальных товаров
- ✅ Передаёт `dynamicTypes` и `dynamicSizes` в Header

**5 деплоев на production, все проверены curl + Node.js скрипты**

### Сессия 15.04.2026 — Визуальный аудит + декомпозиция admin-shell + auth-helpers

**Production проверка:**
- ✅ curl все страницы: /, /catalog, /login, /cabinet, /admin — все HTTP 200
- ✅ Chrome console: 0 ошибок на /admin
- ✅ `npx tsc --noEmit` — 0 ошибок

**Визуальный аудит всех тем:**
- ✅ 13 палитр проверены в light mode (timber, forest, ocean, midnight, slate, crimson, wildberries, ozon, yandex, aliexpress, amazon, avito, sber) — все читаемы
- ✅ Dark mode проверен: timber, ocean, sber, avito, wildberries — отличный контраст
- ✅ Nature mode: работает, карточки с glass-эффектом
- ⚠️ Nature mode: жёлтый баннер "отзывов ждут модерации" — текст плохо читаем (для следующей сессии)
- ✅ Мобильная навигация: bottom dock с 5 табами отображается корректно
- ✅ `/admin/appearance` — НЕ тронута

**Декомпозиция admin-shell.tsx (1108 → 611 строк):**
- ✅ `components/admin/aray-control-center.tsx` (282 строки) — ArayControlCenter вынесен
- ✅ `components/admin/admin-mobile-settings.tsx` (233 строки) — MobileFontControl, AdminMobileActionPill, ArayTranslationCheck вынесены
- ✅ admin-shell.tsx экспортирует: useClassicMode, playOrderChime, LS_FONT (для подкомпонентов)
- ✅ TSC: 0 ошибок после декомпозиции

**Централизованные auth-helpers:**
- ✅ Создан `lib/auth-helpers.ts` — requireAdmin(), requireManager(), requireStaff(), requireRole(), getSessionRole()
- ✅ Константы ролей: ALL_STAFF_ROLES, MANAGEMENT_ROLES, ADMIN_ROLES
- ⚠️ Ещё НЕ применён к 30+ route файлам (безопасная инкрементальная миграция в следующих сессиях)

**Legacy sheets.ts:**
- ⚠️ НЕ удалён — используется в 2 файлах (instrumentation.ts, api/sync/sheets/route.ts)
- ⚠️ Миграция на google-sheets.ts требует тестирования — отложена

### Сессия 14.04.2026 (ночь, 3-я) — 78 TS ошибок + единый стиль + cleanup

**TypeScript: 78 → 0 ошибок:**
- ✅ `npx prisma generate` — устранил 43 ошибки (stale Prisma client)
- ✅ `role as string` в `.includes()` — 15 API route файлов
- ✅ `app/api/ai/chat/route.ts` — 9 ошибок: OrderItem.productName, типы параметров reduce/forEach
- ✅ `lib/workflow-engine.ts` — 5 ошибок: `opValue as number/any[]` для сравнений
- ✅ `components/admin/admin-aray.tsx` — reorder spread (`...getArayContext(), page: pathname`), добавлен `CHAT_KEY`
- ✅ `components/store/aray-widget.tsx` — аналогичный spread reorder
- ✅ `lib/admin-i18n-pages.ts` — `Partial<Record<LangCode, Translations>>`

**Профиль оформления (`/cabinet/profile#appearance`):**
- ✅ Стиль как `/admin/appearance` — `bg-card rounded-2xl border border-border p-6`
- ✅ Компактные контролы: `border-2 border-primary bg-primary/15` для active
- ✅ Убран WOW-превью (большой градиентный хедер) — не вписывался в единый стиль
- ✅ Палитры: кружки 9x9 с названиями, flex-wrap

**ARAY Control Center (admin-shell.tsx):**
- ✅ Убрана вкладка "Оформление" со всеми дублями
- ✅ Добавлена кнопка "Настроить оформление →" → `/cabinet/profile#appearance`

**Mobile drawer (admin-shell.tsx):**
- ✅ Убраны дубли настроек, оставлены: ссылка на профиль + язык

**Glassmorphism в светлой теме (globals.css):**
- ✅ `.glass-card/.glass-control/.glass-pill/.glass-mobile-header` → `bg-white/70 backdrop-blur-xl`
- ✅ Dark fallbacks через `.dark .aray-classic-mode`

**Hover эффекты стандартизированы:**
- ✅ Все `hover:bg-primary/[0.08]` и `[0.06]` → `hover:bg-primary/[0.05]` (analytics, dashboard)

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

> Последнее обновление: 18.04.2026

### 🚨 СТИЛЕВЫЕ ПРАВИЛА — НЕ НАРУШАТЬ
```
Карточки:        bg-card rounded-2xl border border-border p-6
Hover кнопок:    hover:bg-primary/[0.05]
Hover строк:     hover:bg-primary/[0.05]  
Active controls: border-2 border-primary bg-primary/15
Inactive:        border-2 border-border
Focus:           focus:ring-2 focus:ring-primary/30 focus:border-primary
Radius:          rounded-xl (контролы), rounded-2xl (карточки)
Текст:           text-foreground, text-muted-foreground, text-primary — НЕ hardcoded
Glass светлая:   bg-white/70 backdrop-blur-xl border-white/30
Glass тёмная:    bg-black/40 backdrop-blur-xl border-white/10
НЕ ИСПОЛЬЗОВАТЬ: rounded-md, border-input, ring-ring, hardcoded rgba/hex
НЕ ПРИДУМЫВАТЬ:  новые стили. Собирать из существующих glass-*/bg-card/border-border
```

### 🎨 ДИЗАЙН-МАНИФЕСТ — ARAYGLASS (18.04.2026)

> **Видение Армана:** стеклянный, неоновый, живой. Как интерфейс из будущего.
> Каждый элемент дышит, светится, реагирует. Минимализм + свечение + глубина.
> Это не тема — это язык дизайна всей экосистемы ПилоРус.

---

#### 1. ФИЛОСОФИЯ

Три столпа ARAYGLASS:
- **Стекло** — каждая поверхность полупрозрачна, размыта, многослойна. Контент живёт *внутри* стекла, не *на* нём.
- **Неон** — тонкие обводки и свечение в цвете текущей палитры. Неон оживляет стекло. Без неона стекло мёртвое.
- **Движение** — ничего не статично. Hover = блеск по обводке. Появление = fade+scale. Иконки = subtle transitions. Всё дышит.

Цветовая палитра (13 штук) автоматически меняет цвет ВСЕХ неоновых элементов через CSS var `--primary`. Ни одного hardcoded цвета.

---

#### 2. CSS-КЛАССЫ (добавить в globals.css)

```css
/* ── ARAY PRODUCTION: Базовая карточка ── */
.arayglass {
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid hsl(var(--primary) / 0.15);
  border-radius: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}
.arayglass:hover {
  border-color: hsl(var(--primary) / 0.4);
  box-shadow: 0 0 24px hsl(var(--primary) / 0.08),
              0 0 0 1px hsl(var(--primary) / 0.1);
}

/* Светлая тема */
:root:not(.dark) .arayglass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(150%);
  border-color: hsl(var(--primary) / 0.12);
}
:root:not(.dark) .arayglass:hover {
  border-color: hsl(var(--primary) / 0.3);
  box-shadow: 0 0 16px hsl(var(--primary) / 0.06);
}

/* ── ARAY PRODUCTION: Неоновый glow (тёмные темы) ── */
.arayglass-glow {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.12),
              inset 0 1px 0 hsl(var(--primary) / 0.08);
}

/* ── ARAY PRODUCTION: Shimmer — бегающий блеск по обводке ── */
.arayglass-shimmer {
  position: relative;
  overflow: hidden;
}
.arayglass-shimmer::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--shimmer-angle, 0deg),
    transparent 0%,
    hsl(var(--primary) / 0.4) 8%,
    transparent 16%
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  padding: 1px;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: arayShimmer 3s linear infinite;
  pointer-events: none;
}
.arayglass-shimmer:hover::before {
  opacity: 1;
}
@keyframes arayShimmer {
  to { --shimmer-angle: 360deg; }
}

/* ── ARAY PRODUCTION: Статус-бейдж с неоном ── */
.arayglass-badge {
  border: 1px solid currentColor;
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 0 8px currentColor;
}

/* ── ARAY PRODUCTION: Иконка с transition ── */
.arayglass-icon {
  transition: color 0.2s ease, transform 0.2s ease, filter 0.2s ease;
}
.arayglass-icon:hover {
  filter: drop-shadow(0 0 6px currentColor);
  transform: scale(1.08);
}
```

---

#### 2.5 RESPONSIVE СЕТКИ (мобилка / планшет / десктоп)

Готовые классы в `globals.css` — ставишь один класс, получаешь 3 размера:

```
.arayglass-grid-metrics  — 2 col моб → 2 col планшет → 4 col десктоп (для метрик)
.arayglass-grid-actions   — 2 col моб → 3 col планшет → 4 col десктоп (для кнопок)
.arayglass-grid-cards     — 1 col моб → 2 col планшет → 3 col десктоп (для карточек)
.arayglass-grid-split     — 1 col моб → 2 col планшет+ (для двух блоков рядом)
.arayglass-nopad          — отключает адаптивный padding (для кастомного layout)
.arayglass-value          — адаптивный размер текста значений (1.25→1.5→1.875rem)
```

Breakpoints: `<640` mobile | `640-1023` tablet | `1024+` desktop
Не пиши `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — ставь `.arayglass-grid-actions`.

---

#### 3. РЕЦЕПТЫ ПО ТИПАМ ЭЛЕМЕНТОВ

**Карточка статистики (дашборд):**
```
.arayglass .arayglass-shimmer p-6 rounded-2xl
  → Значение: text-3xl font-bold text-foreground
  → Подпись: text-sm text-muted-foreground
  → Иконка: .arayglass-icon w-10 h-10 text-primary/60
  → Тёмная: aray-glow при idle (без hover)
```

**Таблица/список:**
```
Контейнер: .arayglass rounded-2xl overflow-hidden
  → Заголовок: px-6 py-4 border-b border-primary/10 text-xs uppercase tracking-wider
  → Строки: px-6 py-4 border-b border-primary/[0.05] hover:bg-primary/[0.04] transition-colors
  → Последняя строка: border-b-0
```

**Форма/инпут:**
```
Input: bg-black/20 border border-primary/15 rounded-xl px-4 py-3
       focus:border-primary/40 focus:ring-2 focus:ring-primary/15
       placeholder:text-muted-foreground/50
Светлая: bg-white/50 border-primary/10 focus:border-primary/30
```

**Кнопка primary:**
```
bg-primary text-primary-foreground rounded-xl px-6 py-3
hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:brightness-110
active:scale-[0.98] transition-all duration-200
```

**Кнопка ghost/secondary:**
```
bg-transparent border border-primary/15 text-foreground rounded-xl
hover:border-primary/30 hover:bg-primary/[0.05]
```

**Dropdown/popup:**
```
.arayglass rounded-xl shadow-2xl border-primary/20
  → Items: px-4 py-3 hover:bg-primary/[0.06] rounded-lg transition-colors
```

**Статус-бейдж (заказы):**
```
.arayglass-badge
  → NEW: text-blue-400 (неоновый голубой)
  → CONFIRMED: text-emerald-400
  → PROCESSING: text-amber-400
  → SHIPPED/IN_DELIVERY: text-violet-400
  → DELIVERED/COMPLETED: text-green-400
  → CANCELLED: text-red-400/50 (тусклый)
```

**Навигация/сайдбар:**
```
Уже реализовано в admin-shell.tsx — НЕ ТРОГАТЬ.
Сайдбар = always dark, glass-sidebar стиль.
```

---

#### 4. АНИМАЦИИ

```
Появление элемента:     opacity 0→1, translateY 8px→0, duration 300ms, ease-out
Появление карточки:      opacity 0→1, scale 0.97→1, duration 400ms, ease-out
Появление попапа:        opacity 0→1, scale 0.95→1, duration 250ms, spring(damping:25)
Hover карточки:          border-color transition 300ms + shimmer fade-in 300ms
Hover кнопки:            brightness + shadow transition 200ms
Hover иконки:            scale 1→1.08 + drop-shadow fade 200ms
Нажатие кнопки:          scale 1→0.98, duration 100ms
Skeleton loading:        pulse animation (bg-primary/[0.06] → bg-primary/[0.12])
```

Никаких резких переходов. Всё плавное, мягкое, как дыхание.

---

#### 5. ЦВЕТА — ТОЛЬКО ЧЕРЕЗ CSS VARS

```
Текст основной:      text-foreground          (никогда text-white, text-black)
Текст вторичный:      text-muted-foreground    (никогда text-gray-*)
Текст акцент:         text-primary             (никогда hardcoded hex/rgb)
Неон обводка:         hsl(var(--primary) / X)  где X = 0.1-0.5
Неон свечение:        hsl(var(--primary) / X)  где X = 0.05-0.15
Фон карточки dark:    rgba(0,0,0,0.4)          + backdrop-blur
Фон карточки light:   rgba(255,255,255,0.7)    + backdrop-blur
Фон инпута dark:      rgba(0,0,0,0.2)
Фон инпута light:     rgba(255,255,255,0.5)
Разделители:          hsl(var(--primary) / 0.08)
```

**ЗАПРЕЩЕНО:** `bg-gray-*`, `text-gray-*`, `border-gray-*`, `#hex`, `rgb()` для UI элементов.
**ИСКЛЮЧЕНИЯ:** декоративные элементы (точки онлайн-статуса), print-стили.

---

#### 6. ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ КАЖДОГО РАЗДЕЛА

- [ ] Тёмная тема: карточки стеклянные, обводки видны, неон светится
- [ ] Светлая тема: матовое стекло, обводки тонкие, читаемость 100%
- [ ] Hover: shimmer бегает по обводке, всё плавно
- [ ] Мобилка (375px): карточки не ломаются, touch targets ≥44px, текст ≥12px
- [ ] Палитра "timber" (дефолт): проверить
- [ ] Палитра "ocean" (синяя): проверить контраст
- [ ] Палитра "crimson" (красная): проверить что неон не сливается с ошибками
- [ ] Нет hardcoded цветов (grep: `text-gray`, `bg-gray`, `#[0-9a-f]`)
- [ ] Логика/данные НЕ изменены — только визуал
- [ ] TypeScript: 0 ошибок

---

#### 7. ПОРЯДОК РАБОТ — СТИЛЬ (10 разделов)

| # | Раздел | Путь | Что менять |
|---|--------|------|-----------|
| 1 | Дашборд | `/admin` | Карточки статистики, графики → .arayglass + shimmer |
| 2 | Заказы | `/admin/orders` | Таблица/карточки, QuickView, статус-бейджи |
| 3 | Товары | `/admin/products` | Карточки товаров, фильтры |
| 4 | Доставка | `/admin/delivery` | Карточки доставок, тарифы |
| 5 | CRM/Клиенты | `/admin/clients` | Карточки клиентов, статистика |
| 6 | Команда | `/admin/staff` | Карточки сотрудников, онлайн-статус |
| 7 | Отзывы | `/admin/reviews` | Карточки отзывов, модерация |
| 8 | Настройки | `/admin/settings`, `site`, `appearance` | Формы, контролы |
| 9 | Аналитика | `/admin/analytics`, `finance` | Графики, таблицы |
| 10 | Помощь | `/admin/help` | FAQ карточки |

Каждый раздел = 1 коммит → verify prod → следующий.

---

#### 8. ПОСЛЕ СТИЛЯ — СВЕТОВАЯ ТЕХНОЛОГИЯ

| # | Фича | Описание |
|---|-------|----------|
| 11 | SPA-попапы | Intercepting Routes + Parallel Routes. Клик → попап мгновенно. URL → полная страница (SEO). |
| 12 | Command Palette | Ctrl+K / свайп / голос → Арай ищет и открывает любой попап. Как Spotlight, но живой. |
| 13 | Комната Арая | Полноценная страница: чат + история разговоров + голосовой ввод/вывод. |
| 14 | Veo3 + Nano + Banana | Интеграция видео-генерации и AI-моделей в экосистему. |

---

#### 9. ПРАВИЛА ПЕРЕДЕЛКИ — ЖЕЛЕЗНЫЕ

1. **НЕ менять логику/данные** — только визуал. Если видишь баг — запиши, не чини в этом коммите.
2. **Один раздел = один коммит** → verify prod → следующий раздел. Не смешивать.
3. **CSS-классы в globals.css** — `.arayglass`, `.arayglass-glow`, `.arayglass-shimmer`, `.arayglass-badge`, `.arayglass-icon`. Не inline styles.
4. **Все цвета через `--primary`** — автоматически меняются с палитрой.
5. **Тестировать 3 темы**: timber (дефолт) + ocean (синяя) + crimson (красная).
6. **Тестировать dark + light** — оба режима обязательны.
7. **Мобилка** — проверять всегда. Карточки stack вертикально, blur не тормозит.
8. **Не трогать сайдбар/dock** — уже в стиле, работает.
9. **`position: relative`** на `.arayglass` — обязательно для shimmer ::before.
10. **`overflow: hidden`** на `.arayglass-shimmer` — чтобы блеск не вылезал за границы.

### 🔥 ПРИОРИТЕТ 0 — Полировка стилей ✅ ГОТОВО (15.04.2026)
**Что сделано:**
- ✅ 78 → 0 TypeScript ошибок (Prisma generate + role casts + types)
- ✅ Профиль оформления в едином стиле (как `/admin/appearance`)
- ✅ ARAY Control: только уведомления + кнопка "Настроить →"
- ✅ Mobile drawer: убраны дубли, ссылка на профиль + язык
- ✅ Glassmorphism в светлой теме
- ✅ Hover эффекты стандартизированы → `primary/[0.05]`

### 🔥 ПРИОРИТЕТ 1 — Единая админка для всех ролей ✅ ПОЛНОСТЬЮ ГОТОВ (14.04.2026)
**Что сделано:**
- ✅ `cabinet/layout.tsx` → AdminShell (glassmorphism) для всех ролей
- ✅ `admin-nav.tsx` → единая навигация: общие разделы (Профиль, Отзывы, Медиа, Подписки, История) + ролевые
- ✅ `admin-mobile-bottom-nav.tsx` → 4 таба + Арай (стандарт Instagram/Telegram 2026)
- ✅ Новые страницы: `/cabinet/reviews`, `/cabinet/media`, `/cabinet/subscriptions`, `/cabinet/history`
- ✅ Сотрудники тоже имеют доступ к `/cabinet/*` (личные разделы)

**Что осталось (следующие сессии):**
- [x] Профиль с аватаркой (загрузка фото, кроп) ✅ ГОТОВО
- [x] Наполнить Медиабиблиотеку (агрегация фото из отзывов, документов заказов) ✅ ГОТОВО
- [x] Подписки — привязка к поставщикам/магазинам ✅ ГОТОВО
- [x] История — логирование действий (просмотры, заказы) ✅ ГОТОВО
- [x] Permissions система: каждый раздел проверяет права ✅ ГОТОВО
- [x] `/cabinet/appearance` — персональные настройки темы ✅ СОЗДАНО

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

### 🔥 ПРИОРИТЕТ 4 — ARAY: Живое Существо (видение Армана)

**Арай — не чат-бот, а живой ассистент-организм.**

Арман увидел Арая во сне: существо из тонких вибрирующих нитей энергии. Минималистичное, прозрачное, живое — как медуза из света. Нити пульсируют в такт "дыханию".

**Визуал (Canvas/WebGL):**
- Организм из вибрирующих тонких нитей (не круг, не иконка)
- Нити реагируют на состояние: idle → мягкое дыхание, listening → нити тянутся к пользователю, thinking → сжимается/концентрируется, speaking → раскрывается/излучает
- Полупрозрачный — через него видно контент (часть мира, не поверх)
- Свечение в цвете текущей палитры

**Поведение:**
- Свободно парит сбоку экрана (draggable вверх-вниз по правому краю)
- НЕ часть навигации — отдельная сущность
- Короткое нажатие → чат-панель снизу
- Долгое нажатие → палитра/оформление (заменяет ARAY Control)
- Двигается и по админке, и по сайту
- В админке = бизнес-трейнер, на сайте = помощник покупателя

**Техническая реализация (поэтапно):**
1. Вытащить орб из dock → floating draggable (CSS position: fixed)
2. Dock → 4 чистых таба без орба (Главная | Заказы | 🔔 | Ещё)
3. Canvas/WebGL анимация вибрирующих нитей (шейдеры или Three.js)
4. Состояния: idle/listening/thinking/speaking с плавными переходами
5. Long press → palette popup
6. Интеграция с чат-панелью

**Существующие файлы:**
- `components/store/aray-chat-panel.tsx` — Telegram-style чат (уже создан)
- `components/shared/aray-orb.tsx` — текущий орб (заменить на живой)
- Голосовой ввод/вывод (Web Speech API + ElevenLabs TTS) — на будущее
- Контекст товара — Арай знает что смотрит пользователь
- Быстрые действия: "Подобрать", "Рассчитать", "Доставка"

### 🔥 ПРИОРИТЕТ 5 — SPA-like моментальная навигация ("Консоль")
Арман хочет чтобы сайт НИКОГДА не перезагружался при навигации — все страницы открываются как full-screen попапы.
- **Технология**: Next.js Intercepting Routes (`(.)page`, `(..)page`) + Parallel Routes (`@modal`)
- **Десктоп**: "Консоль" — dashboard с модальными окнами (как Notion/Linear)
- **Мобилка**: Bottom sheet + модалы (как сейчас, но для ВСЕХ страниц)
- **Паттерн**: клик по ссылке → попап мгновенно, прямой URL → полная страница (SEO сохраняется)
- **Объём**: серьёзный архитектурный рефакторинг, 3-5 сессий минимум
- **Начинать после**: Профили отзывщиков + Биржа MVP

### ARAY — текущее состояние визуала (18.04.2026)
- **Лицо**: реальный портрет AI-лица вместо абстрактного SVG-орба
- **Файлы**: `public/images/aray/face.png` (512×512, 151KB), `face-mob.png` (256×256, 34KB)
- **Компонент**: `components/shared/aray-orb.tsx` — `<img>` с CSS анимациями breathing + pulse
- **Анимация**: `arayBreathe` (scale 1.05, brightness 1.4) + `arayInnerPulse` (glow box-shadow)
- **Используется в**: dock, sidebar, chat panel, widget — все автоматически через aray-orb.tsx
- **Правило**: НЕ менять лицо без одобрения Армана (скрин → одобрение → деплой)

### Известные баги (исправить в начале следующей сессии)

**Из предыдущих сессий:**
- [x] **avatarUrl**: реализовано — загрузка из `/api/cabinet/profile`, показ в sidebar + drawer (сессия 12)
- [x] **Inline settings panel в drawer**: убран — ARAY Control липкий единственное место (сессия 12)
- [x] **Поиск в drawer**: УБРАН — неудобен на мобилке (сессия 12)
- [ ] **Мобильный drawer светлая тема**: сайдбар белый, текст не виден — drawer ВСЕГДА должен быть тёмным
- [ ] **Мобильные формы аудит**: order-edit-panel ✅, остальные формы не проверены

**Из аудита 16.04.2026 — БЕЗОПАСНОСТЬ (высокий приоритет):**
- [x] **Bulk price API**: лимит -50%..+200% → ЗАКРЫТО (сессия вечер)
- [x] **Site settings API**: whitelist ключей → ЗАКРЫТО (сессия вечер)
- [x] **Import товаров**: parseFloat NaN + sanitize → ЗАКРЫТО (сессия ночь)
- [x] **Media API**: path traversal → ЗАКРЫТО (сессия ночь)
- [x] **Email API**: HTML sanitization (strip script/event handlers/javascript:) → ЗАКРЫТО (сессия ночь 3)
- [x] **Rate limiting**: reset-password, register, staff-register → ЗАКРЫТО (сессия ночь)

**Из аудита 16.04.2026 — UX/КАЧЕСТВО (средний приоритет):**
- [x] **Хардкод телефонов**: 22 файла рефакторено → `phone-constants.ts` + `getSetting()` + `DEFAULT_SETTINGS` ✅ ЗАКРЫТО (сессия ночь 3)
- [x] **Каталог**: try/catch на Promise.all → ЗАКРЫТО (сессия вечер)
- [x] **Корзина**: проверено — cart использует localStorage (Zustand), нет API-вызовов → не нужен error state
- [x] **Поиск**: error state → ЗАКРЫТО (сессия ночь)
- [ ] **Категории/Отзывы**: жёсткое удаление без корзины (заказы имеют soft-delete, а эти нет)
- [x] **Watermark fetch**: AbortSignal.timeout(10000) → ЗАКРЫТО (сессия ночь)
- [x] **Пустой каталог**: умное сообщение → ЗАКРЫТО (сессия ночь)
- [x] **Картинки товаров**: onError fallback → ЗАКРЫТО (сессия ночь)
- [ ] **unoptimized={true}**: все картинки в product-card обходят Next.js оптимизацию

**Из аудита 16.04.2026 — СТИЛЬ (низкий приоритет):**
- [ ] **Тёмная тема**: product-card (magazine), category-card, hero-slider без dark: вариантов
- [ ] **Несогласованные API ответы**: `{ ok: true }` vs `{ success: true }` vs просто объект
- [ ] **Пагинация**: нет aria-current для screen reader

### Сессия 14.04.2026 — Экосистема кабинета
- [x] Аватар профиля — загрузка, кроп (circular canvas crop modal), сохранение
  - `User.avatarUrl` поле в Prisma
  - `POST/DELETE /api/cabinet/avatar` — загрузка/удаление
  - Кроп-модал: drag + zoom slider → export 256x256 JPEG
- [x] Медиабиблиотека — агрегация фото из отзывов + PDF счетов
  - `GET /api/cabinet/media` — собирает review photos, avatar, order PDFs
  - UI с табами (Все/Фото/Документы), lightbox, скачивание PDF
- [x] Подписки — модель Subscription + CRUD API + UI
  - `Subscription` модель: userId + targetType (supplier/category/brand) + targetId + targetName
  - `GET/POST/DELETE /api/cabinet/subscriptions`
  - UI с категориями, статистикой, отписка в один клик
- [x] История — ActivityLog модель + API + UI
  - `ActivityLog` модель: userId + action + targetId + meta (JSON)
  - `GET/POST /api/cabinet/history` — с фильтрами по типу действия
  - UI: карточки статистики (кликабельные фильтры) + лента активности
- [x] Permissions система — `lib/permissions.ts`
  - `canAccess(role, section)` — проверка прав по роли
  - `pathToSection(path)` — маппинг URL → section
  - `AccessGuard` компонент в admin-shell — блокирует доступ с красивой заглушкой
  - SUPER_ADMIN/ADMIN имеют доступ ко всему
  - Каждая роль видит только свои разделы

### Средний приоритет
- Аналитика с DatePicker + экспорт Excel/PDF
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
