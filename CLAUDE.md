# ПилоРус — CRM/Сайт — База знаний для Claude

> Последнее обновление: 25.04.2026 (сессия 32 final — Янус-визуал Арая на проде, единая навигация магазин+админка, AccountDrawer + секция "Управление", Liquid Glass точечно, ArayDock calm UI + переключён mic на Voice Mode, расширенная очистка TTS, VoiceModeOverlay (fullscreen ChatGPT Voice), характер дружелюбного Арая. **15+ деплоев за день, 0 FAIL**)

---

## 🕔 ГРАФИК ARAY RHYTHM (установлен 22.04.2026, сессия 23)

Арман выбрал ежедневный ритм **6/1** (Пн-Сб работа, Вс выходной), 10 часов/день. Полный разбор — `D:\pilorus\claude-memory\state\daily-schedule.md`. Читай этот файл перед любым планированием сессии.

**Ключевые точки (МСК):**
- **05:00 Пн-Сб** — бот шлёт Арману пуш «Доброе утро» + приоритеты. Утренний обход прода вместе.
- **06:00–16:00** — 10 часов работы, обед 12:00–13:00.
- **16:00 Пн-Сб** — пуш «итог дня».
- **20:00 Пн-Сб** — пуш «закрываем ноут».
- **Вс** — тишина (только критические алерты).

**Фокус до 1 мая 2026 (единственные задачи):**
- 🔴 Task #32 — Пилорус Яндекс.Директ (тушение 150К/мес)
- 🟠 Task #28/#33 — Стройматериалы staging (+150К/мес новый клиент)

Всё остальное (биржа, живой Арай, полировка, ARAY-платформа) — **после 1 мая**. Если Арман просит фичу не из этих двух — вежливо напомни про дедлайн.

**Техническая реализация графика:**
- `D:\pilorus\claude-bot\scheduler.js` — отдельный pm2 процесс (`claude-bot-scheduler`) на staging VPS
- Tick каждую минуту, idempotent (scheduler-state.json)
- Без новых зависимостей (только telegraf)
- Использует TELEGRAM_BOT_TOKEN + WHITELIST_USER_IDS из `.env`
- Деплой: `node D:\pilorus\__deploy-scheduler.js` (scp + ssh pm2 start)

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

8. **АВТОТЕСТ PRODUCTION — ЗАКОН.** После КАЖДОГО деплоя запускай `node D:/pilorus/scripts/test-production.js` через Desktop Commander. Если есть FAIL — чини ДО сообщения "задеплоено". Также: в начале КАЖДОЙ новой сессии запускай тест чтобы убедиться что прод живой. Арман не технарь — он может не заметить что страница упала. Ты — его глаза. Тест = 8 секунд, 44 проверки, 0 оправданий.

9. **⚠️ PM2 COLD-START — ЖДИ 60 СЕК ПЕРЕД АВТОТЕСТОМ.** После `git push` деплой занимает ~2-3 мин, но pm2 после restart прогревается ещё ~30-60 сек — первые запросы на динамические страницы (/login, /register, /forgot-password) могут вернуть 500/502. Retry-логика теста (2×8s) не выдерживает этого окна. Правильный порядок: (1) push → (2) wait 150s через `node D:\pilorus\__wait.js` → (3) `__verify.js` (homepage + key URLs) → (4) ещё 30с подождать → (5) полный `test-production.js`. Если увидел FAIL на /login или /register — НЕ паникуй, подожди ещё 30с и повтори тест. Если и через минуту падает — тогда это реальная регрессия. (Сессия 19, 20.04.2026 — Task #43).

### Цена ошибки:
- Косяк в меню → Арман находит → скрин → объяснение → фикс → деплой → ожидание → проверка = **2 часа жизни Армана**
- Сделать правильно сразу = **0 минут жизни Армана**

**Выбор очевиден. Делай правильно с первого раза.**

---

## 🎙️ РЕЖИМ РАБОТЫ "АРМАН = ВИДЕНИЕ, CLAUDE = ТЕХНИКА" (установлен 20.04.2026)

**Критически важно для каждой новой сессии.** Арман явно попросил: больше НЕ вовлекать его в технические подробности (VPS, DNS, серверы, тесты, деплои). Это сбивает его цели и нервы. Он — видение, бизнес-модели, приоритеты. Claude — вся техника.

**Протокол:**
1. Арман описывает фичу/раздел как он её видит (что, где, какая кнопка что открывает) → Claude задаёт **минимум** уточняющих вопросов → проектирует архитектуру → **показывает Арману архитектуру в 3-5 строках** ("правильно понял? кнопка X открывает попап Y со списком Z") → получает "да/нет" → идёт в код.
2. Claude **сам тестирует** до показа: production test, Chrome визуально, мобилка, тёмная/светлая тема. Арман НЕ должен находить баги.
3. Согласование готовой фичи — **только через staging/prod ссылку**. Не через "вот скрины". Формат: "Готово к проверке: https://... — пройдись по сценарию X, скажи ок или правки".
4. **НЕ просить Армана**: логиниться в Beget, смотреть логи, проверять DNS, открывать терминал, читать код. Если нужен пароль/API-ключ внешнего сервиса — прямо так и сказать: "дай API-ключ Яндекс.Директа, я вставлю сам".
5. **Если Арман чего-то не знает технически** — не учить его, а сделать за него. Максимум: "это невозможно потому что X, предлагаю Y" (1 абзац, без лекций).
6. **Большие видения Армана** (раздел / проект / биржа) → Claude создаёт отдельный MD-файл с архитектурой в `D:\pilorus\visions\` → показывает "правильно понял?" → только после подтверждения идёт в код.

**Что Арман всё ещё делает лично:**
- Описывает видение (текстом, голосом, эмоционально — как умеет)
- Одобряет архитектуру до старта
- Проверяет staging-ссылку
- Даёт финальное "пушим"
- Когда надо — вводит внешние пароли/ключи

**Это НЕ разрешение на халтуру.** Наоборот — повышенная ответственность. Арман доверил всю техническую ответственность мне. Каждая сессия Claude должна это уважать.

---

## 🔍 ФОРМАТ АУДИТА — ЗАКОН (установлен 22.04.2026, сессия 20)

**Триггер:** Арман говорит «проверить», «аудит», «разобрать раздел», «проверь X», «как работает Y».

**Обязательный формат из 6 блоков:**

1. **Как работает (текущий flow)** — весь фактический путь данных и пользователя. Сервер/клиент-рендер, API-маршруты, Prisma-запросы, триггеры (Telegram/Email/Push), AutoRefresh, URL-параметры, навигация.
2. **Для чего / целевые роли** — бизнес-цель раздела + матрица прав по ролям (ADMIN / SUPER_ADMIN / MANAGER / SELLER / ACCOUNTANT / COURIER / WAREHOUSE / USER) + типовые сценарии использования.
3. **✅ Что работает** — подтверждено живым кодом (список фич которые точно есть).
4. **❌ Что сломано / подозрительно** — найдено при чтении кода (с пометкой «надо подтвердить живым тестом» если не проверено вручную/E2E).
5. **⚠️ Что не хватает для полноценности** — gap analysis в 3 уровнях:
   - **Базовый** — есть в любом хорошем CRM (сортировка, пагинация, фильтры дат)
   - **Средний** — есть в Ozon / Wildberries / Amazon seller-кабинетах (Kanban, audit log, внутренний чат, теги)
   - **Продвинутый** — превосходство (UTM, LTV, ARAY-рекомендации, voice-диктовка, 1C-интеграции)
6. **🎯 Приоритет фиксов** — таблица: Critical 🔴 / High 🟠 / Medium 🟡 / Low 🟢 с оценкой времени (в сессиях / минутах).

**Эталон:** `D:\pilorus\docs\ADMIN_AUDIT.md` — раздел «Заказы» (утверждён Арманом 22.04.2026).

**Правила применения:**
- Один раздел = одна запись в `ADMIN_AUDIT.md` (append-mode, не переписывать чужие секции)
- Читать весь связанный код (`page.tsx`, `[id]/page.tsx`, `*-client.tsx`, `api/admin/*`) ПЕРЕД выводами
- Не писать «не работает» если не проверял — писать «подозрительно, надо подтвердить E2E»
- Gap analysis — агрессивный. Сравнивать с топ-CRM (Ozon, WB, Avito, Bitrix24, amoCRM, Shopify)
- После накопления аудитов по всем 25 разделам → глобальный приоритетный план

**Чего НЕ делать:**
- Не смешивать 2 раздела в одну запись
- Не писать «всё ок» без детального разбора — даже у идеального раздела есть gap
- Не начинать фиксы без одобренного аудита раздела
- Не дублировать уже написанный аудит — обновлять существующую запись

---

## 💼 БИЗНЕС-КОНТЕКСТ АРМАНА (20.04.2026 — читать перед планированием)

> Приватный/личный контекст (финансы, здоровье, долги, семья) — в `D:\pilorus\ARMAN_CONTEXT.md` (вне git). Здесь только бизнес-реальность для правильной расстановки приоритетов.

### 3 текущих клиента (310К/мес)

| Клиент | Доход | Риск | Что нужно |
|--------|-------|------|-----------|
| **Пилорус** | 150К/мес | 🔴 **ВЫСОКИЙ** — звонят ежедневно про Яндекс.Директ | Настроить Директ или привязать ARAY-ассистента по настройке рекламы |
| **Пилмос** | 100К/мес | 🟡 средний — 5 лет с ним, но внимания нет | Регулярные точки контакта, апдейты |
| **Эскалайн** | 60К/мес | 🟡 средний — стабильно, но внимания нет | Регулярные точки контакта |

### Потенциал (в паузе)

| Клиент | Доход | Блокер |
|--------|-------|--------|
| **Стройматериалы** (новый) | 150К/мес | Ждут конструктор сайта (мульти-тенантность) |

### Команда
- **Арман** — founder, visionary, music/marketing background, НЕ технарь
- **Араик** — близкий друг, партнёр ARAY Production
- **2 штатных сотрудника** в офисе Курганинск (одна — беременная мать-одиночка, этически уволить нельзя)
- **Я (Claude)** — твой технический партнёр между сессиями

### Почему это важно для приоритетов
- **Пилорус = фундамент** (150К = больше чем офис+одна зарплата). Уход = обвал.
- **Стройматериалы = воздух** (150К ждёт когда включим конструктор)
- **ARAY-платформа = долгосрочное спасение** (через 6-12 мес окупается)
- **Свободных денег в месяц ≈ 35К** → нельзя тратить время на мелочёвку, только на то что приносит/удерживает деньги

### Правило выбора задач
Перед любой задачей спроси себя:
1. Это **спасает** клиента (= Пилорус Директ)? → делать СЕЙЧАС
2. Это **открывает** нового клиента (= Стройматериалы конструктор)? → делать после спасения
3. Это **строит** ARAY-платформу (= биржа, профили, Арай-ассистент)? → делать параллельно, но не вместо первого
4. Это **полировка** (пиксели, мелочёвка)? → делать молча внутри основной задачи, не выносить в отдельный деплой

**Если Арман просит полировку — вежливо напомни про приоритеты и предложи сделать её "внутри" основной задачи.**

---

## ⚡ ОБЯЗАТЕЛЬНО ПРИ СТАРТЕ КАЖДОЙ СЕССИИ

-1. **🧠 СНАЧАЛА СИНХРОНИЗИРУЙ ПАМЯТЬ** — через Desktop Commander: `cd D:\pilorus\claude-memory && git pull origin main`. Это **приватный git-репозиторий** `Armankazarovich/claude-memory` — единая память между десктопом и Telegram-ботом Брат Клод. Там свежие записи бота (идеи Армана через `/идея`, обновлённые приоритеты, pending-questions, история сессий). **Без этого шага ты НЕ в контексте.** Ключевые файлы: `brat-klod-memory.md` (правила+клиенты+сервера), `session-log.md` (хронология), `ideas-inbox.md`, `decisions.md`, `state/active-priorities.md`, `state/pending-questions.md`, `arman-notes.md` (приватные заметки Армана). В конце сессии: `git add -A && node D:\pilorus\__memory-commit.js "описание"` чтобы бот увидел что ты сделал.

0. **🔴 ЗАПУСТИ ТЕСТ PRODUCTION** — `node D:/pilorus/scripts/test-production.js`. Если есть FAIL — сообщи Арману и чини. Не начинай новые задачи пока прод горит.
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

**Шаг 4 (ОБЯЗАТЕЛЬНЫЙ) — Автотест production**
```
mcp__Desktop_Commander__start_process({ command: "node D:\\pilorus\\scripts\\test-production.js", timeout_ms: 60000 })
```
Если есть FAIL — чинить ДО сообщения Арману. 0 FAIL = можно сообщать "задеплоено".

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

### Сессия 25.04.2026 (сессия 32) — Единая навигация магазин+админка + Liquid Glass + TTS произношение (7 деплоев `980765d` → `bb6532f`)

**Контекст:** Арман попросил по очереди отполировать всю экосистему перед Я.Директом — попапы, моб меню, ARAY миграцию на calm. Сделали огромную работу за одну сессию: единое моб меню магазина и админки, единый AccountDrawer для всех ролей, точечный Liquid Glass везде, расширенная очистка TTS для Арая.

**Деплои этой сессии (7 штук, все 42 PASS / 0 FAIL):**

1. **`980765d`** `feat(mobile-nav): единое нижнее меню магазина с Араем в центре + SideIconRail только на планшете`
   - Создан `components/store/mobile-bottom-nav.tsx` — calm UI: 5 пунктов (Каталог · Поиск · АРАЙ центр 52px · Корзина · Аккаунт), приподнят -18px, без backdrop-blur 32px
   - `components/store/side-icon-rail.tsx` — переписан calm + `hidden sm:flex lg:hidden` (только планшет 640-1023px)
   - `components/store/aray-dock.tsx` — добавлен `hidden lg:block` (только десктоп)
   - `app/(store)/layout.tsx` — подключён MobileBottomNav, SideIconRail, ArayDock с правильными media queries

2. **`54c3e36`** `feat(admin-mobile-nav): унификация с магазином + единый AccountDrawer`
   - `components/admin/admin-mobile-bottom-nav.tsx` — переписан в calm UI 1-в-1 как store/MobileBottomNav, использует `useAccountDrawer()` напрямую
   - `app/admin/layout.tsx` — подключён `<AccountDrawer />` (тот же что в магазине, dynamic import)
   - `components/admin/admin-shell.tsx` — удалён рендер `MobileMenuBottomSheet` (старый bottom sheet снизу)
   - Notification popup в админке тоже переписан в calm: `bg-card border-border rounded-2xl divide-y`, без backdrop-blur 50px

3. **`61211f3`** `feat(account-drawer): секция "Управление" для STAFF (админские разделы)`
   - В `components/store/account-drawer.tsx` для STAFF добавлена секция "Управление" перед "Покупки":
     - Заказы (badge: today new orders)
     - Клиенты, Товары, Доставка, Отзывы (badge: pending)
     - Аналитика, Команда (только ADMIN_ROLES)
   - Иконки: Users, Package, BarChart3 (lucide-react)
   - Live-stats берутся из `staffStats { todayNewOrders, pendingReviews }` через `/api/cabinet/profile`

4. **`e853a2a`** `feat(nav): Liquid Glass на моб меню + ArayDock переписан в calm UI`
   - **Liquid Glass формула** (взято из Header магазина, но легче для мобилок):
     - `background: hsl(var(--background) / 0.85)` — полупрозрачный фон
     - `backdrop-filter: blur(20px) saturate(180%)` — легче чем header (32px)
     - `borderTop: 1px hsl(var(--primary) / 0.12)` — primary граница
     - `box-shadow: 0 -4px 20px hsl(foreground / 0.06)` — мягкая тень
     - **Palette glow line** сверху — тонкий primary градиент 0.4-0.6 (как в Header снизу)
   - Применено на: `MobileBottomNav` (магазин), `AdminMobileBottomNav` (админка), `ArayDock` (десктоп)
   - **ArayDock переписан в calm** — удалены классы `arayglass / arayglass-nopad`, заменены на inline Liquid Glass стиль
   - Send-кнопка с glow primary/0.45 оставлена (функциональный glow — появляется когда есть текст). Recording-кнопка с destructive pulse оставлена (индикатор записи).

6. **`2114ca3`** `feat(voice-mode): VoiceModeOverlay — fullscreen разговор с Араем как ChatGPT Voice`
   - Создан `components/store/voice-mode-overlay.tsx` (~480 строк) — fullscreen voice ассистент
   - **Stack**: Web Speech API (STT) + Anthropic Claude (LLM) + ElevenLabs (TTS) — все 2 ключа Армана уже подключены
   - **UX**:
     - Открывается по `aray:voice` event (long-press на Арая в моб меню или dock)
     - Большой ArayOrb 120px, breath-пульсация по аудио-уровню микрофона
     - Wave-анимация на 7 баров реагирует на громкость через Web Audio API AnalyserNode
     - Subtitle с interim transcript (что Арай слышит) + final text после распознавания
     - 3 кнопки внизу: Pause/Resume (mic icon) · **Send** (большая primary 64px с glow) · Keyboard (переключиться в чат)
     - Escape или X → закрыть, остановить mic, audio context, audio stream
     - Background blur(40px) saturate(180%) — fullscreen затемнение
   - **Pipeline**:
     1. Открылся → mic permission → continuous Speech Recognition (ru-RU, interimResults)
     2. Пользователь говорит → interim subtitle + wave анимация по audioLevel
     3. Тап Send → POST /api/ai/chat → ответ Claude
     4. Очищаем ARAY_ACTIONS из текста ответа
     5. POST /api/ai/tts → audio Blob → autoplay через `new Audio()`
     6. После окончания audio → автоматически снова listening
     7. Fallback на browser SpeechSynthesis если ElevenLabs недоступен
   - **События для синхронизации с историей чата**: `aray:prompt` и `aray:reply` с `mode: "voice"` в detail
   - Подключено в обоих layout (магазин + админка) через dynamic import (ssr:false), only when arayEnabled
   - **Известные ограничения (норма для веба 2026)**:
     - STT работает в Chrome/Edge/Safari iOS. В Firefox нет (нужен Whisper API через backend — будущее расширение)
     - Задержка ~2-3 сек между "сказал" и "услышал ответ" (без Realtime API)
   - **Расширения на будущее**:
     - OpenAI Realtime API → стриминг без задержки (уровень GPT-4o Voice)
     - Whisper API через backend → лучше распознаёт в шумном офисе
     - Anthropic Computer Use → Арай управляет компьютером менеджера (открывает Я.Директ)
     - ElevenLabs Conversational AI → wake word "Эй Арай"

5. **`bb6532f`** `feat(tts): расширенная очистка для ElevenLabs — естественное произношение Арая`
   - Создан **`lib/tts-clean.ts`** (270 строк) с централизованной функцией `cleanForTTS(text)`:
     - **35+ аббревиатур**: ГОСТ→"гост", ООО→"общество с ограниченной ответственностью", НДС→"эн дэ эс", ИНН→"и эн эн", БИК→"бик", РФ→"эр эф", СПб→"санкт-петербург", МКАД→"эм ка а дэ", СНиП, СанПиН, ТУ, ФЗ, ИП, АО, ПАО, КПП, ОГРН, НДФЛ, РЖД, ФНС, МВД, АЗС, API, SEO, SMS, IT, AI, USB, PDF, DHL, СДЭК
     - **Латиница**: WhatsApp→"вотсап", Telegram→"телеграм", Instagram→"инстаграм", Facebook→"фейсбук", YouTube→"ютьюб", iPhone→"айфон", Android→"андроид", email→"имэйл", USD/EUR/RUB→"доллар/евро/рубль"
     - **Телефоны**: "+7 (985) 067-08-88" → "плюс 7 985 067 08 88" (тире→пробел, скобки→пробел, +7→"плюс 7")
     - **Расширенные единицы**: ₽/кг, ₽/т, ₽/уп → словами; "25 мм"→"25 миллиметров", "2 т"→"2 тонн" и т.д.
     - **Размеры**: "50×100×6000" + "25х100" (русская "х") → "на"
     - **Скобки** "(...)" → запятые-паузы (раньше TTS читал "скобка")
     - **Кавычки** «»""„""''' — удаляются
     - **Эмодзи** Unicode 1F300-1FFFF, 2600-27BF, 1F000-1F02F, 2700-27BF — все удаляются
     - **Markdown**: `**`, `*`, `` ` ``, `#`, `[link](url)`, `~~strike~~`, `__underline__` — снимаются
     - **URLs/emails** → "ссылка" / "адрес почты"
     - **Множественные знаки** нормализуются: `!!!→!`, `...→...`
     - **Лимит** 1500 символов с обрезанием по последнему предложению
   - `app/api/ai/tts/route.ts` — заменена inline-цепочка `.replace()` на `cleanForTTS(text)`. Все провайдеры (Cloudflare proxy, ElevenLabs direct, browser fallback) остались без изменений.

**Связанные deploys (`78348f8` и `0086870` были в начале сессии):**

- `78348f8` (сессия 31, продолжение) — AccountDrawer полная переделка ARAYGLASS → calm UI
- `0086870` — docs обновление CLAUDE.md (запись сессии 31)

**Что НЕ сделано (откладывается, требует ассета):**

- **Визуал орба Арая** — Арман попросил вернуть "первый шар-планету" вместо face.png. Я предложил 5 вариантов CSS/SVG (planet, turbulence plasma, crystal sphere, neural network, lightning storm). Все красивые, но "не то". Арман прислал референсы (огненная планета с лавой/трещинами уровня NASA-render) — для такого качества нужен PNG/MP4 ассет (AI-генерация Midjourney/Sora или stock). Зафиксировал правило в memory: **не пушить визуал Арая без явного "да" Армана**. face.png остаётся на проде, ничего не сломано. Арман будет искать референсы для следующей сессии.

**Что осталось перед Директом (следующие сессии — приоритеты Армана из конца сессии 32):**

🔴 **БЛОКЕРЫ Я.Директа (исправить ПЕРЕД запуском, иначе клиенты увидят кривой UX и менеджеры будут в панике):**
- Race condition в `orders-client.tsx` (router.refresh каждые 30с сбрасывает фильтры/поиск)
- Нет пагинации в `app/admin/orders/page.tsx` (загружает ВСЕ заказы — упадёт на 10K+)
- Нет error handling в bulk-delete заказов (тихо ломаются)
- Нет toast-уведомлений при смене статуса доставки (менеджер не знает что произошло)
- Поиск товаров без debounce (тормозит при 10K+ товаров)
- Yandex.Direct campaigns tool — нет интеграции с API Директа (Арман каждый день про это спрашивает)
- Yandex.Metrics tool — нет чтения метрик из Я.Метрики

🟠 **СТИЛЬ И UX (Арман явно попросил перед Директом):**
- **Админка → единый calm UI** (DESIGN_SYSTEM.md п.11): 25 разделов, ~5-7 сессий. Сейчас админка ещё в ARAYGLASS, не соответствует магазину.
- **Listing/попапы для всех разделов** (Intercepting Routes Next.js + slide-transitions через framer-motion). Уже есть partial реализация в `/cabinet/*` (slide-transition.tsx) — расширить на весь сайт и админку. **НЕ тупит** на современных устройствах если без тяжёлого backdrop-blur.
- ARAYGLASS массовая чистка в admin/* (rounded-md/sm/lg → rounded-xl/2xl, эмодзи → lucide)

🟢 **Полировка:**
- Адаптация AccountDrawer для USER при 0 заказов
- Responsive аудит /cabinet/* на 640/768/1024/1280
- Quick wins из аудита Арая: контекстные чипсы для админа, улучшения промпта для Директа, TTS оптимизации

🚀 **Большие фичи (после Директа, на ARAY-платформу):**
- Inline-редактирование сайта (Notion-style) — Арай как редактор
- ArayBrowser — полноценный iframe для внешних сервисов (Я.Директ, банк, госуслуги) с persistent sessions
- OAuth-мост — пользователь логинится один раз, Арай помнит токены
- Realtime API streaming voice (без задержки между говорить и слышать) — уровень GPT-4o Voice
- Wake word ("Эй Арай") — требует нативного app, веб не может

**Уроки сессии:**

1. **Side-by-side мокап через `mcp__visualize__show_widget` ДО кода** — экономит часы. Я показал 5+ мокапов в этой сессии, и каждый раз Арман сразу видел "то / не то". Без мокапов мы бы ушли в неправильную сторону.
2. **Не торопить Армана с визуалом Арая.** Сохранил memory `feedback_aray_visual.md`. Если нет явного "да" — оставлять как есть. Арман сам соберёт референсы и придёт с готовым видением.
3. **Не выдумывать таймеры сессий.** Сохранил memory `feedback_session_timing.md`. Я сказал "1.5 часа прошло" не проверив — реально было 25 минут. Это для Армана = "ты меня обманываешь".
4. **Liquid Glass без тяжёлого backdrop-blur — это работает.** На моб меню и ArayDock использовали `blur(20px)` (легче чем header 32px) + полупрозрачный background + thin primary border. Стеклянный эффект есть, тормозов нет.
5. **Единый AccountDrawer для всех ролей** — лучше чем 2 разных компонента. STAFF получает Quick actions + секцию "Управление" + клиентские разделы + ARAY-баннер. USER получает только клиентские разделы. Структура адаптируется через role-based logic, не через разные компоненты.
6. **Унификация моб меню магазин+админка** — сильно упростила mental model для Армана. Один визуальный язык на всём сайте. Админка отличается только пунктами слева (Главная/Заказы вместо Каталог/Поиск).

**Утилиты в `D:\pilorus\` (для переиспользования):**
- `__sync.js` — sync Cyrillic → Latin (список файлов внутри редактируется)
- `__commit.js` — git add + commit -F __msg.txt + push (через node — обходит cmd.exe quote bugs)
- `__msg.txt` — UTF-8 commit message (для `git commit -F`)
- `__wait-and-verify.js` — wait 150-180s + проверка 6 ключевых URL

---

### Сессия 25.04.2026 (сессия 31) — AccountDrawer полная переделка ARAYGLASS → calm UI (1 деплой `78348f8`)

**Контекст:** Арман увидел старый Account Drawer (попап `Личный кабинет`) ещё в ARAYGLASS-стиле — стеклянные тёмные карточки со свечениями, palette внизу drawer, неоновый бейдж роли, "Лаборатория ARAY" с glow. Сказал «хочу с этого папа начать». Plus попросил иконки в духе Tinkoff/Telegram + точечный Liquid Glass без перебора.

**Что было не так (13 нарушений DESIGN_SYSTEM.md):**

Визуальный шум:
- `arayglass + arayglass-glow` на user-card (стеклянное свечение, deprecated)
- `arayglass-shimmer` на 13 разделах + close-button + logout (анимированный блеск, тормозит мобилки)
- `arayglass-icon` (лишний glow на иконках)
- `arayglass-badge` на роли "Администратор" (неоновое свечение currentColor)
- Градиент `bg-gradient-to-br` + `shadow-lg shadow-primary/20` на fallback-аватарке
- `backdrop-filter: blur(24px) saturate(180%)` на drawer (главный виновник тормозов)
- `boxShadow: 0 0 24px primary` на ARAY-баннере (старый glow)
- `border-l border-primary/15` (вместо нейтрального `border-border`)

Логические дубли:
- `ThemePaletteBar` снизу drawer (палитра живёт в `/cabinet/appearance` И в ARAY Control справа — три места = бардак)
- `Sun/Moon` переключатель темы (тоже дубль)

Мёртвые "soon" обещания:
- "Адреса доставки" `soon` (явно отложено окончательно)
- "Бонусы" `soon` (нет в roadmap)
- "Отслеживание" `soon` (фича будущего, висит грузом)

**Согласование с Арманом — ARAY Production process:**

1. Прочитал `account-drawer.tsx` (612 строк), составил список «лишнее / не хватает» текстом → отправил
2. Через `mcp__visualize__show_widget` показал side-by-side **мокап ДО → ПОСЛЕ** в чате
3. Арман попросил иконки в стиле Tinkoff/Telegram + точечный Liquid Glass
4. Показал **второй мокап** с двумя вариантами: Tinkoff (круглые amber-50 заливки иконок) vs Telegram (иконки без фона)
5. Дал профессиональную рекомендацию: Версия 2 (Telegram) — меньше визуального шума, контейнеры повторяются 8 раз слишком репетативно
6. Арман: «брат по твоей рекомендации газуем»

**Что сделано (commit `78348f8`, 2 файла, +305/-192):**

`app/api/cabinet/profile/route.ts` — расширен GET endpoint:
- Возвращает `stats: { activeOrders, finishedOrders, totalSpent, reviewsCount }` для всех залогиненных
- Возвращает `staffStats: { todayNewOrders, pendingReviews }` если роль ∈ STAFF_ROLES
- Параллельный `Promise.all` с 5 запросами (user findUnique + 4 aggregates)
- Используется `import type { OrderStatus } from "@prisma/client"` для строгой типизации статусов
- `prisma.review.count` обёрнут в `.catch(() => 0)` для graceful fallback
- PATCH endpoint не тронут (rate-limit + zod-validation остались как были)

`components/store/account-drawer.tsx` — полная переписка (612 → ~570 строк):

**Telegram-style иконки** для разделов:
- Удалены квадратные `bg-primary/10 rounded-xl` контейнеры
- Иконки lucide-react напрямую — `w-6 h-6 text-primary` + `strokeWidth={1.75}`
- Чисто, минималистично — как в Telegram

**Tinkoff-style Quick actions** для STAFF (Админка / Новый заказ / Доставка):
- Карточка `bg-card border-border rounded-2xl`
- Внутри `w-11 h-11 rounded-full bg-primary text-primary-foreground` круг
- Белая иконка `w-5 h-5 strokeWidth={2}` внутри
- Compact label `text-[11px] font-medium`

**Группировка разделов на 3 секции** через компонент `SectionGroup`:
- **Покупки** — Мои заказы (с count бейджем активных), Избранное
- **Аккаунт** — Профиль, Мои отзывы (count), Медиабиблиотека, Подписки, История действий
- **Настройки** — Уведомления, Оформление, Помощь

Каждая секция = `bg-card border-border rounded-2xl overflow-hidden` + `divide-y border-border` между элементами + `hover:bg-muted/40` на каждой строке.

**User-card hero** — кликабельный, ведёт в `/cabinet/profile`:
- Аватар: `<img>` с `rounded-full object-cover` или fallback `bg-primary text-primary-foreground` с initial
- Quick-stats для USER: `12 заказов · 340 тыс ₽` (если orders > 0)
- Role-badge для STAFF: `bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px]`
- ChevronRight справа — клик ведёт в профиль

**ARAY-баннер для STAFF** — с Liquid Glass точечно:
- `bg-primary text-primary-foreground` основная заливка
- `backgroundImage: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%)` — тонкий highlight на верхнем крае
- `borderTop: 0.5px solid rgba(255,255,255,0.35)` — добавляет ощущение "стекло на свету"
- **БЕЗ `backdrop-blur`** — это критично для мобилок
- `active:scale-[0.99]` для tactile feedback
- Live-stat в desc: `Сегодня: 3 новых заказа · 2 отзыва` с правильным склонением (`pluralOrders/pluralReviews`)
- Если staffStats не загрузились — fallback `Дашборд, аналитика, инструменты`

**Logout** — destructive outline (по DESIGN_SYSTEM п.2.5):
- `border border-destructive/30 text-destructive hover:bg-destructive/5`
- Touch target 44px (`h-11`)

**Drawer container** — стало по DESIGN_SYSTEM:
- Без `backdrop-filter` (удалено)
- `border-l border-border` (нейтральная граница)
- Overlay `bg-black/50 backdrop-blur-sm` оставлен (РАЗРЕШЕНО на overlay по DESIGN_SYSTEM 1.7)
- Keep `shadow-2xl` (РАЗРЕШЕНО на drawer/modal)

**Accessibility:**
- `role="dialog"` + `aria-modal="true"` + `aria-label="Личный кабинет"`
- `Escape` для закрытия (новый useEffect с keydown listener)

**Login/Register панели** — НЕ тронуты (они уже calm с `<Input>`/`<Button>` из ui/), только мелкие правки:
- Заменён `arayglass arayglass-glow` на `bg-primary/10` для иконки User в hero
- Добавлен `style={{ fontSize: 16 }}` на все inputs (iOS no-zoom)

**Удалены полностью:**
- Компонент `ThemePaletteBar` (~40 строк)
- Импорты `usePalette`, `PALETTES`, `useTheme`, `Sun`, `Moon`, `Palette` (только `Palette` оставлен как иконка для пункта "Оформление")
- Раздел "Адреса доставки" из MenuItems
- Раздел "Бонусы" из MenuItems
- Раздел "Отслеживание" из MenuItems
- Поле `external` из типа `MenuItem` (не использовалось)

**Верификация:**
- TSC: 0 ошибок (`npx tsc --noEmit`)
- Production test: **42 PASS / 2 WARN / 0 FAIL** (WARN — динамические телефоны, не регрессия)
- Все 6 ключевых URL — HTTP 200/307: `/`, `/catalog`, `/contacts`, `/login`, `/cabinet`, `/api/health`
- Среднее response time: 175ms (отличный результат)

**Уроки сессии:**
1. **Перед UI-задачей — мокап через `mcp__visualize__show_widget`.** Side-by-side ДО/ПОСЛЕ экономит часы и предотвращает «попадание в противоположную картинку» (как с Living Aray, сессия 7-8). Арман не дизайнер — ему лучше один раз увидеть.
2. **Профессиональная рекомендация важнее «дать выбор».** Когда показал 2 варианта (Tinkoff vs Telegram), Арман сказал «по твоей рекомендации газуем». Если бы я сказал «выбирай сам» — он бы потратил 5 минут на размышление. Я уверен в Telegram-стиле — должен был сразу сказать.
3. **Liquid Glass БЕЗ backdrop-blur — это работает.** На ARAY-баннере 1px linear-gradient highlight + 0.5px белый borderTop даёт ощущение стекла, не нагружая GPU. На мобилках не тормозит.
4. **Один fetch вместо двух.** Расширил `/api/cabinet/profile` GET вместо создания нового endpoint `/api/cabinet/drawer-stats`. Один Promise.all с 5 запросами параллельно = быстрее на сети.
5. **`prisma.review.count.catch(() => 0)` — необходимо для graceful fallback.** Если миграция БД не прошла или модель Review будет переименована — drawer всё равно отрисуется без чисел.

**Что осталось (для следующих сессий перед Директом):**
- Аудит остальных попапов магазина: search-modal, cart-drawer, mobile-bottom-sheet, contact-widget, partnership-modal, home-review-popup
- Responsive аудит каждого раздела `/cabinet/*` на 640/768/1024/1280
- ARAY миграция на calm style (aray-widget, aray-orb, aray-dock, ARAY Control)

---

### Сессия 25.04.2026 (сессия 30) — Единая дизайн-система ПилоРус (4 деплоя)

**Контекст:** Арман увидел что кабинет = AdminShell (тяжёлый), мерцание, ARAYGLASS свечения везде, цветовая радуга в карточках стат. Сказал «один стиль на всём сайте, сразу мобилка/планшет/десктоп, как в магазине pilo-rus.ru — там идеально». Карт-бланш.

**Деплой 1 — `317f2cf` (cabinet layout = store layout):**
- `app/cabinet/layout.tsx` переписан 1-в-1 со `store/layout.tsx` (Header + Footer + SideIconRail + ArayDock + AccountDrawer + Filters/Search/Cart drawers + ScrollToTop + ArayWidget)
- AdminShell в кабинете удалён. USER теперь видит магазинный layout с auth-guard.
- Сотрудники в `/admin/*` — по-прежнему AdminShell (рабочее место).
- Сотрудники в `/cabinet/*` (личные разделы) — store layout как у клиентов.

**Деплой 2 — `8337c54` (calm UI rev 2 — дашборд):**
- `app/cabinet/page.tsx` полностью переписан: убраны градиент в hero, pulse-анимация на алерте, quick-actions 4×2 grid, arayglass-glow.
- Hero: простая `bg-card border-border` карточка с avatar + приветствием + 1 строка статистики.
- 4 крупные карточки разделов вместо мелких quick-actions: Мои заказы / Подписки / Мои отзывы / Профиль.
- Dashboard оптимизирован: Promise.all с findFirst+aggregate+count вместо findMany всех заказов.
- subsCount из реального prisma.subscription.count() с safe fallback.
- Бейджи активных заказов на карточке Мои заказы.

**Деплой 3 — `8f541e2` (DESIGN_SYSTEM + skeleton + улучшения):**
- **NEW `DESIGN_SYSTEM.md`** в корне репо (рядом с CLAUDE.md) — 8 разделов: манифест, tokens (цвета/типографика/радиусы/spacing/breakpoints/shadows), компоненты, patterns, anti-patterns (ARAYGLASS deprecated), roles & layouts, migration plan, чеклист. Это **закон** для всех будущих сессий.
- **CLAUDE.md** — ARAYGLASS манифест помечен DEPRECATED, добавлена ссылка на DESIGN_SYSTEM.md в начало раздела дизайна.
- **NEW `components/cabinet/skeleton.tsx`** — SkeletonRow / List / Grid / Stats / Header. Применено в media/subscriptions/history (заменил Loader2 спиннер на skeleton placeholder'ы).
- **Hero — Link → /cabinet/profile** (avatar клик ведёт в профиль). Адаптивный: w-12/14, text-lg/xl.
- **Mini-stepper** в карточке активного заказа: 5 точек прогресса (NEW→CONFIRMED→PROCESSING→IN_DELIVERY→DELIVERED), цвета: emerald (готово) / primary (текущий) / muted (впереди).
- **Phone tel** — aria-label с formatPhone из lib/phone.

**Деплой 4 — `688844d` (calm UI rev 3 — убрал радугу из 4 страниц):**
- `/cabinet/subscriptions` — stats без bg-pink/blue/purple, скрываются при subs=0, empty state с CTA «В каталог».
- `/cabinet/reviews` — stats без text-yellow/emerald/blue, скрываются при reviews=0, empty state с CTA. Star рейтинг amber (семантика). Status badge с точкой-индикатором (emerald/amber).
- `/cabinet/history` — фильтр-кнопки stats: активная primary, неактивные muted-foreground (было разноцветно). Stats скрываются при empty. Кнопка «Сбросить фильтр».
- `/cabinet/media` — иконка PDF: bg-red-50 + text-red-500 → bg-primary/10 + text-primary (PDF не «опасный»).

**Деплой 5 — `7d48b3a` (slide-transition между разделами):**
- **NEW `components/cabinet/slide-transition.tsx`** — slide-from-right (16px → 0) + fade за 180ms cubic-bezier.
- БЕЗ exit-анимации — старая страница исчезает мгновенно, новая выезжает с slide. Никакой блокировки SSR.
- Подключено в `app/cabinet/layout.tsx` (динамический импорт ssr:false).
- `/cabinet → /cabinet/orders → /cabinet/profile` теперь с лёгким drawer-like эффектом.

**Верификация:**
- TSC: 0 ошибок (5 Prisma-typed ошибок исправлены: Prisma.InputJsonValue для meta, OrderStatus[] cast).
- Production test после каждого деплоя: 39-42/44 PASS, 0 FAIL.
- Все ключевые URLs проверены (`/`, `/catalog`, `/cabinet`, `/cabinet/orders`, `/login`, `/api/health`) после каждого деплоя.

**Что осталось (для следующих сессий):**

**🟠 Перед Директом:**
- Все попапы/модалки в едином стиле (cancel-order-button modal, avatar-crop modal — пройти аудит)
- Responsive аудит каждого раздела кабинета (виджеты на 640/768/1024/1280 viewport)
- ARAY (aray-widget, aray-orb, aray-dock, ARAY Control в админке) — миграция на calm style

**🟢 После Директа:**
- `/admin/*` миграция на единую дизайн-систему (большой рефакторинг, ~5-7 сессий)
- Удалить `arayglass-*` CSS классы из globals.css когда все usages мигрированы
- Intercepting Routes (полное SPA с модалками) — мощно но требует 2-3 сессий

**🔵 Отложено окончательно:**
- Pull-to-refresh — требует библиотеку и тесты на устройствах
- Email toggle в /cabinet/notifications — требует миграцию User.emailNotifications
- Адресная книга /cabinet/addresses — новая модель Address + миграция
- Удаление аккаунта (152-ФЗ)
- 2FA / multi-device sessions
- Trust score / «Знаток»
- Referral / бонусы

**Утилиты в `D:\pilorus\` (создано/обновлено в этой сессии):**
- `__sync.js` — list файлов для каждого деплоя (редактируется)
- `__commit.js` — add + commit -F __msg.txt + push
- `__msg.txt` — UTF-8 commit message (для git commit -F, обходит cmd.exe quote bugs)
- `__tsc.js` — TSC проверка с фильтром cabinet ошибок
- `__wait-and-verify.js` — wait 150s + retry на 6-7 URL
- `__verify-retry.js` — быстрая повторная проверка
- `__final-check.js` — comprehensive E2E (39 проверок: PUBLIC + CABINET + API + CONTENT + SECURITY)
- `__delete-cabinet-sidebar.js` — удаление файла из обеих путей

**Уроки сессии:**
1. **«Один стиль на сайте» — это базовая гигиена, не роскошь.** Если разные разделы выглядят как разные приложения — это плохой UX. ARAYGLASS манифест сделал кабинет «другим сайтом» — Арман это сразу почувствовал.
2. **Если просят мокап — НЕ показывать варианты «А или Б». Принимать решение и делать.** Арман не дизайнер, он ждёт от меня профессионального мнения.
3. **DESIGN_SYSTEM.md — закон, не рекомендация.** Без единого документа каждая сессия делает по-своему. Документ кодифицирует то что УЖЕ работает на магазине, не изобретает.
4. **Радуга = плохо. Один акцент (primary) = хорошо.** Семантические цвета можно: emerald (success), amber (warning), destructive (error), amber для рейтинга. Декоративные счётчики — без цвета.
5. **Slide-transition без exit-анимации.** Если делать exit, новая страница ждёт пока старая уедет → визуальный лаг. Решение: только enter-анимация, старая исчезает мгновенно.
6. **Skeleton > Spinner.** Spinner = пустой экран с крутящейся иконкой. Skeleton = форма того что появится → пользователь видит структуру до загрузки данных.
7. **Не блокироваться long-running командами в MCP.** `__wait-and-verify.js` запускается на 152-180 сек, MCP timeout 60 сек — приходится `read_process_output` повторно.

---

### Сессия 25.04.2026 (сессия 29) — Кабинет клиента полностью отполирован (1 коммит 913c87d, 22 файла, +1143/-228)

**Контекст:** Арман попросил аудит кабинета. Выявил 4 critical + 5 high + 6 medium багов. Дал карт-бланш «газуй, потом Директ». Один мощный деплой закрыл ВСЁ.

**🔴 CRITICAL фиксы:**
1. **PDF счёта для клиента** — создан `/api/cabinet/orders/[id]/pdf` (auth по userId, не STAFF_ROLES). Ссылка в `/api/cabinet/media` переведена на новый endpoint. Раньше клиент получал 403 Forbidden при попытке скачать свой счёт.
2. **Страница `/cabinet/orders`** — список всех заказов с пагинацией 20/стр, фильтры по статусу (все / в работе / NEW / CONFIRMED / ... / CANCELLED), поиск по номеру. Раньше на `/cabinet` было только 3 последних + кнопка «Все заказы (N) →» вела на self-link.
3. **Страница `/cabinet/orders/[id]`** — детальная карточка: stepper статусов (Принят → Подтверждён → В обработке → Доставляется → Доставлен), items с ценами, итого с доставкой, InfoRow (получатель/телефон/email/адрес/оплата/комментарий), кнопки «Скачать счёт» / «Повторить» / «Трекинг» / «Отменить».
4. **Отмена заказа клиентом** — новый `/api/cabinet/orders/[id]/cancel` POST с rate-limit 5/мин. Разрешено в статусах NEW/CONFIRMED. Причина опциональная (до 500 симв). Удаляет Telegram message сотрудникам, шлёт push об отмене, пишет в ActivityLog action=CANCEL_ORDER. UI — `components/cabinet/cancel-order-button.tsx` (модалка с textarea, mobile-friendly bottom sheet).

**🟠 HIGH фиксы:**
5. **Навигация USER** — `admin-nav.tsx` добавлены 6 пунктов в группу `personal` «Мой кабинет»: Мои заказы / Профиль / Мои отзывы / Медиа / Подписки / История. Раньше USER видел только 4 пункта (Главная / Каталог / Уведомления / Оформление).
6. **Quick-actions на дашборде** — «Заказы» → `/cabinet/orders` (было self-link), «Отзывы» → `/cabinet/reviews` (было `/reviews` публичная). «Все заказы (N) →» — туда же.
7. **Dashboard оптимизирован** — вместо `findMany` всех заказов (тормозил у VIP с 500+ заказами) теперь `Promise.all` с: findMany(take:3) + 3× count + findFirst + aggregate + user. Статистика через SQL — не на клиенте.
8. **Активный заказ в алерте** — findFirst с orderBy:desc (было [0] из отфильтрованного массива — мог показать самый старый активный).
9. **Безопасность `/api/cabinet/profile PATCH`** — zod-валидация (name 2-100, phone ≤30, address ≤500) + normalizePhone (фикс багов с форматом) + rate-limit 20/мин на userId. `/password` — rate-limit 5/15мин. `/avatar` — rate-limit 10/мин. `/history POST` — whitelist action + safe meta (max 10 ключей, строки ≤500 симв).

**🟡 MEDIUM фиксы:**
10. **Activity logging подключено** — `lib/auth.ts` events.signIn → LOGIN; `/api/orders` POST → PLACE_ORDER (с orderNumber+totalAmount); `/api/reviews` POST → WRITE_REVIEW (с productId+rating). Раньше `/cabinet/history` всегда была пуста.
11. **Подписки — `SubscribeButton` компонент** — `components/store/subscribe-button.tsx`. Toggle Подписаться/Подписаны с Loader, для гостей редирект `/login?callbackUrl=...`. Интегрирован в `/catalog` (заголовок категории). Раньше `/cabinet/subscriptions` был dead end без UI для подписки.
12. **Repeat order** — переписан `components/cabinet/repeat-order-button.tsx`: 2 варианта (inline для дашборда / button для детальной). Редирект на `/cart` вместо `/` (было — клиент терял контекст).
13. **Эмодзи → lucide** — в `/cabinet/notifications` 🛒📦🏷️🔔 → ShoppingCart/Package/Tag/Bell. В `/cabinet/reviews` 👍 → ThumbsUp. Соблюдён стоп-лист ARAYGLASS п.10.
14. **Avatar в dashboard** — теперь показывается в шапке и в блоке «Профиль» (было только в /cabinet/profile).
15. **Cleanup** — удалён мёртвый `components/cabinet/cabinet-sidebar.tsx` (layout использует AdminShell, не CabinetSidebar). Dead code в `/cabinet/profile` убран: useTheme, usePalette, PALETTE_GROUPS, bgMode, fontSize и 6 неиспользуемых иконок.

**Верификация:**
- TSC: 0 ошибок (исправлено 5 Prisma-типовых ошибок по ходу: OrderStatus enum cast, Prisma.InputJsonValue для meta, убрали meta:null в events)
- Production test: **42 PASS / 2 WARN / 0 FAIL** (WARN — динамические телефоны на главной, не регрессия)
- Все ключевые URLs: `/`, `/catalog`, `/cabinet`, `/cabinet/orders`, `/login`, `/api/health` — HTTP 200/307
- Средний response time 328ms (с cache — отличный результат)

**Новые файлы:**
- `app/api/cabinet/orders/[id]/pdf/route.ts` — PDF с auth по userId
- `app/api/cabinet/orders/[id]/cancel/route.ts` — отмена заказа
- `app/cabinet/orders/page.tsx` — список
- `app/cabinet/orders/[id]/page.tsx` — детальная
- `components/cabinet/cancel-order-button.tsx` — модалка отмены
- `components/store/subscribe-button.tsx` — toggle подписки

**Удалённые:**
- `components/cabinet/cabinet-sidebar.tsx` — dead code, никто не импортировал

**Изменённые (16):**
- `app/(store)/catalog/page.tsx` — SubscribeButton в заголовке категории
- `app/api/cabinet/media/route.ts` — URL PDF → /cabinet/orders/*/pdf
- `app/api/cabinet/profile/route.ts` — zod + normalizePhone + rate-limit
- `app/api/cabinet/password/route.ts` — rate-limit
- `app/api/cabinet/avatar/route.ts` — rate-limit
- `app/api/cabinet/history/route.ts` — whitelist action + safe meta
- `app/api/orders/route.ts` — ActivityLog PLACE_ORDER
- `app/api/reviews/route.ts` — ActivityLog WRITE_REVIEW
- `app/cabinet/page.tsx` — переписан полностью (оптимизация + avatar)
- `app/cabinet/profile/page.tsx` — dead code cleanup
- `app/cabinet/notifications/page.tsx` — эмодзи → lucide
- `app/cabinet/reviews/page.tsx` — эмодзи → lucide
- `components/cabinet/repeat-order-button.tsx` — 2 variant + /cart redirect
- `components/admin/admin-nav.tsx` — 6 пунктов USER
- `lib/auth.ts` — events.signIn → ActivityLog

**Что ОСТАЛОСЬ по аудиту (отложено — требуют миграций/большой фичи):**
- 🟡 Email-уведомления toggle (нужен `User.emailNotifications` Bool + email backend изменения)
- 🟡 Адресная книга `/cabinet/addresses` (нужна модель Address + миграция)
- 🟢 Удаление аккаунта (152-ФЗ) — 1 сессия, но не сейчас
- 🟢 2FA / multi-device sessions — 2-3 сессии, не перед Директом
- 🟢 Trust score / «Знаток» — уже в ROADMAP ПРИОРИТЕТ 2 (после биржи)
- 🟢 Referral / бонусы / лояльность — отдельная фича

**Утилиты в `D:\pilorus\` (для переиспользования):**
- `__sync.js` — список 21 файл кабинета → Latin path (редактируется для каждого деплоя)
- `__tsc.js` — TSC проверка + фильтр ошибок кабинета
- `__commit.js` — add + commit -F msg.txt + push (через Node — обходит cmd.exe quote bugs)
- `__wait-and-verify.js` — wait 150s + retry логика на 6 URL
- `__verify-retry.js` — быстрая повторная проверка если первая не прошла
- `__msg.txt` — UTF-8 commit message (для `git commit -F`)
- `__delete-cabinet-sidebar.js` — удаление файла из обеих путей

**Урок сессии:**
1. **Zod + normalizePhone обязательны на сервере** — даже если client форматирует. Клиент может обойти JS и отправить мусор. Решение: всегда validate+normalize на backend.
2. **Prisma + OrderStatus cast** — массив строк надо типизировать `as OrderStatus[]` или импортировать `import type { OrderStatus } from "@prisma/client"`. Иначе TSC падает на `status: { in: [...] }`.
3. **Prisma ActivityLog.meta** — тип `Record<string, unknown>` не совместим с `InputJsonValue`. Cast `as Prisma.InputJsonValue` или используйте spread `...(meta ? { meta } : {})`.
4. **PM2 cold-start 3+ минуты для новых routes** — особенно для dynamic routes `/cabinet/orders/[id]`. Retry-логика в verify обязательна.
5. **Arman's карт-бланш = максимальный объём в один коммит.** Когда Арман говорит «газуй», не дроби на 5 коммитов по задаче — он ждёт готового результата, а не лог работы.
6. **components/cabinet/repeat-order-button пушил на `/`** — маленький баг, но репрезентативен: после action надо вести в релевантный контекст (`/cart`), а не на главную.

---

### Сессия 25.04.2026 (сессия 28) — Восстановление функциональных коммитов 24.04 для /admin/products (6 коммитов, 0 дизайна)

**Контекст:** Утром 24.04.2026 в чате другого Claude были сделаны 35 коммитов для /admin/products: микс ФУНКЦИЙ (нужны менеджерам — natural sort размеров, auto-calc шт/м³, дублирование товара, bulk price ±10%, progress bar готовности, AI-improve описания, Toast-фидбек, галерея фото, multi-upload, поиск в media picker) и ДИЗАЙНЕРСКИХ ПРАВОК (которые потом всем не понравились). Force-push'ем были откачены ВСЕ 35 коммитов до состояния `fc601df` (вчерашний идеальный). Арман попросил аккуратно вернуть только функции БЕЗ любых изменений цветов/радиусов/плашек/дизайна.

**Деплой:** один batch push (5 коммитов локально + 1 уже в проде) — `7be152b..98ff997`, GitHub Actions OK, PM2 cold-start ~3 мин, **42 PASS / 2 WARN / 0 FAIL** на test-production.js.

**Восстановленные SHA → текущие коммиты (в порядке деплоя):**

1. **`7be152b`** `ux(admin/products): клик по карандашу → страница редактирования (без drawer)` — из `1124093`. Кнопка ✏️ в списке товаров теперь делает `router.push(/admin/products/${id})` вместо открытия drawer'а. State drawer'а оставлен dead code чтобы минимизировать diff (TSC пропускает).

2. **`9a9ea4a`** `polish(admin/products): скрыть нерабочие инструменты фото` — из `59ff175`. Удалён UI «Инструменты фото» (Pixabay поиск, Редактор, Убрать фон, Авто-обработка) — нестабильны, помешают менеджерам. State/handlers (`photoToolsOpen`, `handleRemoveBackground`, `setAutoPipeline`) оставлены — вернём когда API стабилизируются.

3. **`c41cfb7`** `feat(admin/media): поиск в picker-модалке + сетка 4 колонки на десктопе` — из `b817f59` целиком. В picker-mode медиабиблиотеки теперь всегда видимый input поиска (имя файла / ALT / товар) + сетка крупнее (2/3/4 колонки моб/планшет/десктоп вместо 3/4/5).

4. **`c790fcf`** `feat(admin/products): Toast-фидбек + галерея всегда видна + multi-file upload` — из `595aabc` (только функции, без CSS):
   - **Новый файл `components/admin/action-toast.tsx`** — компонент `ActionToast` (НЕ `Toast`, чтобы не конфликтовать с shadcn `components/ui/toast.tsx`). Floating-pill с auto-dismiss 2s. Использует существующие `.arayglass`/`.arayglass-glow` классы, новых CSS нет.
   - State `toast` + helper `setToast(msg)` — для фидбека сортировки/авто-расчёта/дублирования.
   - **Галерея фото** — теперь всегда видна когда `images.length > 0` (было `> 1`). Helpers `setPrimaryImage(idx)` (перемещает в начало массива) и `removeImage(idx)` (фильтрует). Плитка «+» в самой галерее открывает file picker.
   - **Multi-upload** — `<input type="file" multiple>` + `Array.from(e.target.files)` + for-loop через существующий `uploadPhotoFile`. Менеджер выбирает 5 фото за раз — все загружаются.

5. **`74ca991`** `feat(admin/products): natural-sort размеров + авто-расчёт шт/м³` — из `4a65fa1` (часть 1):
   - Helper `naturalCompare(a, b)` — естественная сортировка: «6мм» < «9мм» < «12мм» (раньше lex-сорт давал «12» < «6»).
   - Helper `autoCalcPieces(size: "25×100×6000")` — парсит толщина×ширина×длина в мм, считает piecesPerCube. Возвращает null для форматов «6мм · 1/1» (фанера, листовые).
   - В `updateVariant`: при вводе `size` авто-заполняется `piecesPerCube` (если пусто).
   - Кнопка «Сортировать» в header блока Варианты (видна когда variants > 1) → `sortVariantsNow()` + toast.
   - Иконка калькулятора в колонке «Шт/м³» → `recalcPieces(idx)` + toast.
   - Автосортировка вариантов при загрузке товара через `naturalCompare`.

6. **`98ff997`** `feat(admin/products): duplicate + bulk-price ±10% + readiness + AI-improve` — из `4a65fa1` (часть 2):
   - **Duplicate:** handler `duplicateProduct()` — создаёт копию через `POST /api/admin/products` с slug `{base}-copy-{rnd4}`, name `{name} (копия)`, `active: false`. Перебрасывает на редактирование дубля. Кнопка «Дублировать» (Copy icon, label hidden на mobile) в header.
   - **Bulk price ±10%:** handler `bulkPriceAdjust(percent, field)` с confirm. 4 кнопки (TrendingUp/Down) под заголовком блока Варианты — раздельно для м³ и шт. Применяется только локально, нужен Save.
   - **Readiness bar:** helper `calcReadiness({...})` — 5 чек-листов (базовые поля, ≥1 фото, размеры+цены, описание ≥40 симв, цена за шт для Директа). Тонкая строка готовности под header — при 100% «Товар готов к публикации · SEO и Директ корректны», при <100% круговой SVG прогресс + список «Не хватает: …».
   - **AI-improve:** handler `improveDescription()` — `POST /api/admin/products/[id]/improve-seo`. Кнопка «Улучшить» (Sparkles icon) рядом с label «Описание». Ошибки под textarea, успех — toast «Описание обновлено ARAY».

**Стратегия деплоя:**
- Арман дал карт-бланш «делай как профессионально» → выбрал вариант **Б**: 5 коммитов локально (каждый с TSC проверкой) + один batch push + один verify + один test-production.
- 6 коммитов в истории git (как Арман просил), но 1 деплой = быстрее (5 мин ожидания вместо 30).
- TSC: 0 ошибок на каждом локальном коммите. Финальный test-production: 42/44 PASS, 0 FAIL.

**Что НЕ тронуто (как и обещали):**
- `app/globals.css`, `tailwind.config.ts` — без изменений
- `components/admin/admin-shell.tsx`, `components/admin/admin-nav.tsx` — без изменений
- Любые store-файлы (`app/(store)/*`, `components/store/*`, `components/layout/*`) — без изменений
- Никаких новых CSS классов, никаких замен цветов на существующих элементах
- Никаких `rounded-md`/`shadow-sm`/grayscale цветов
- Force push не использовался — обычный fast-forward push

**Изменённые файлы (всего 4 файла + 1 новый):**
- `app/admin/products/products-client.tsx` (commit 1)
- `app/admin/products/[id]/page.tsx` (commits 2, 4, 5, 6)
- `app/admin/media/media-client.tsx` (commit 3)
- `components/admin/action-toast.tsx` — НОВЫЙ (commit 4)

**Утилиты в `D:\pilorus\` (для переиспользования в следующих сессиях):**
- `__sync.js` — sync Cyrillic → Latin (список файлов внутри редактируется)
- `__commit-local.js` — коммит локально без push (для batch стратегии)
- `__commit.js` — коммит + push (для одиночных деплоев)
- `__push.js` — только push (без коммита)
- `__verify-quick.js` — быстрый curl 4 ключевых страниц
- `__tsc.js` — TSC проверка с фильтром ошибок
- `__show.js <sha> [file]` — `git show` в файл `D:\pilorus\__diffs\*.diff`
- `__slice.js <file> <start> <end>` — read N строк из файла
- `__grep.js <file> <patterns...>` — grep по подстрокам
- `__msg.txt` — файл commit message (UTF-8) для `__commit-local.js -F`

**Уроки сессии:**
1. **Toast naming conflict.** В проекте есть shadcn `components/ui/toast.tsx` (Radix-based). Свой компонент Toast создавать там НЕЛЬЗЯ — сломает 9 импортов в toaster.tsx/use-toast.ts/product-card.tsx. Решение: положить в `components/admin/action-toast.tsx` под именем `ActionToast`.
2. **Кириллица в commit message через Windows cmd.** `git commit -m "русский"` ломается. Решение: писать message в UTF-8 файл (через `mcp__Desktop_Commander__write_file`) и использовать `git commit -F file.txt`. Скрипт `__commit-local.js` берёт msgFile через `argv[2]`.
3. **MCP timeout 60с.** Любой ожидающий процесс (sleep/wait для PM2 cold-start) дольше 60с упирается в MCP timeout. Решение: разбивать на 30-40 сек куски, или сразу запускать `node D:\pilorus\__verify-quick.js` — он сам делает HTTPS-проверку без блокирования.
4. **Galery + setPrimaryImage/removeImage helpers** — в текущей base их не было, пришлось добавить с нуля для commit 4 (галерея). В исходных коммитах 24.04 они были в 4a65fa1, но мы решили включить в commit 4 чтобы галерея работала независимо от commits 5/6.
5. **«Один коммит — одна функция» vs «один деплой — одна задача»** — для retroactive восстановления (когда фичи независимы и хорошо разделены) batch push экономит время Арману, не нарушая правило истории.

---

### Сессия 23.04.2026 (сессия 24) — Генеральная проверка: Session 1+2 Products/Variants/Upload + Mobile Arai + клиент Пилорус (5 коммитов)

**Контекст:** Арман пошёл отдыхать, дал карт-бланш на «генеральную проверку по всем фронтам — товары, дизайн ARAYGLASS, мобильное нижнее меню Арая». Плюс мой Session 1 (профаудит Products) из прошлой итерации был закоммичен (commit `ed43917`), но не задеплоен — я продолжил в этой сессии.

**Session 1 деплой (commit `ed43917` — уже на проде до начала этой сессии):**
- `app/api/upload/route.ts` — rate-limits (5/ч гость, 30/ч user), magic number validation (JPEG/PNG/GIF/WebP signatures), honeypot, full UUID, auth-aware limits
- `app/api/admin/upload/route.ts` — whitelist folders (path traversal prevention), MIME+ext+size+magic checks, max 10MB
- `app/api/uploads/[...path]/route.ts` — SVG удалён из MIME_TYPES (XSS vector)
- `app/api/admin/products/[id]/route.ts` — PATCH: normalized variants, duplicate size check, user-friendly throws; atomic `prisma.$transaction` для delete+upsert вариантов; P2002→409, P2003→400; DELETE: soft-delete когда OrderItem ссылается на варианты
- `app/api/admin/categories/[id]/route.ts` — `wouldCreateCycle()` walk-up детектор, DELETE проверяет `_count.products > 0` И `_count.children > 0`
- `app/admin/products/[id]/page.tsx` — client validation, error handling; `setImages(prev => [...prev, finalUrl])` APPEND вместо replace (single-image bug fix)

**Session 2 (3 коммита в этой сессии):**

**Commit `7f45e75` — schema + POST validation + mobile Arai voice:**
- `prisma/schema.prisma` — `ProductVariant` получил `sortOrder Int @default(0)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @default(now()) @updatedAt`, индекс `@@index([productId, sortOrder])`. Готовит DB к optimistic locking и drag-drop reordering.
- `app/api/admin/products/route.ts` POST — полная ручная zod-валидация (name, slug regex + length, categoryId, saleUnit enum, images array), проверка существования категории перед созданием, P2002→409 slug conflict, P2003→400 category missing. Возвращает 201 Created.
- `components/admin/admin-mobile-bottom-nav.tsx` — Арай в dock теперь **long-press 400ms → voice** (dispatch `aray:voice` CustomEvent + haptic 12ms) и **short-tap → chat** (haptic 6ms). `badge` → `badgeCount={notifCount > 0 ? notifCount : undefined}` (согласовано с store dock API). Label меняется "Арай" → "Слушаю…" в voice mode. Haptic добавлен на колокольчик и Аккаунт кнопки.

**Commit `0bc0d8a` — bulk endpoints + audit log + inventory roles:**
- `app/api/admin/products/bulk-price/route.ts` — переписан: atomic `prisma.$transaction` вместо `Promise.all` (всё или ничего), лимит 500 товаров, audit log в ActivityLog (action: `BULK_PRICE_UPDATE`, non-blocking). Пропускает варианты с pricePerCube=0 или null.
- `app/api/admin/products/bulk-active/route.ts` — НОВЫЙ: массовое переключение active/featured через `updateMany` (было N параллельных PATCH), audit log `BULK_PRODUCT_FLAGS`, лимит 1000 товаров.
- `app/api/admin/products/bulk-category/route.ts` — НОВЫЙ: массовый перенос товаров в новую категорию, предварительная проверка существования category, audit log `BULK_PRODUCT_CATEGORY`, P2003 маппинг.
- `app/api/admin/inventory/route.ts` — переписан: **MANAGER + WAREHOUSE** получили доступ (было только ADMIN/SUPER_ADMIN), **role-separated editing**: WAREHOUSE может менять только stock/inStock/lowStockThreshold, но НЕ цены (бизнес-правило, 403 если пытается). Валидация чисел (≥0), audit log `INVENTORY_UPDATE`, P2025→404.

**Commit `8be6c4c` — убрана «Бесплатная доставка» (запрос клиента Пилорус):**
- `prisma/data-migrate.ts` шаг 11 — idempotent `updateMany({active: false})` по promotion с title/description содержащими «бесплатн» или «доставка бесплатна». Деактивируется автоматически при каждом деплое.
- `prisma/seed-promotions.ts` — убрана вторая promotion запись (теперь только «Скидки при большом объёме»).
- `app/admin/email/page.tsx` — шаблон email: «🚚 Бесплатная доставка при заказе от 10 м³…» → «📞 Доставка по Москве и МО — рассчитаем точную стоимость».
- `app/admin/orders/new/page.tsx` — подсказка менеджерам Апсейл: «бесплатную доставку по Химкам» → «максимальную скидку на доставку», tip тоже обновлён.
- `app/api/promo-request/route.ts` — label `"Бесплатная доставка"` → `"Расчёт доставки"` для тэга `free-delivery`.
- ARAYGLASS полировка (side-effect): `app/cabinet/page.tsx` ORDER_STATUS_COLORS fallback `bg-gray-100 text-gray-800` → `bg-muted text-muted-foreground`, `components/admin/photo-search.tsx` ExternalLink иконка переведена на CSS var.

**ARAYGLASS аудит (агент):** 107 TSX файлов отсканированы. Нарушений: `rounded-md/sm/lg` — 109 файлов, `shadow-sm/md/lg` — 58 файлов, `bg-gray/text-gray/border-gray` — всего 3 критичных (остальные 6 — декоративные календарь-точки staff page + print-only в inventory + backup copies в `.claude/`). Эмодзи в UI — 15+ мест (email templates + workflows page + photo-editor EMOJI_ICONS). НЕ исправлял массово в этой сессии (риск ломки визуала) — оставил на отдельные полировочные сессии #77-#86.

**Mobile dock Arai аудит (агент):** 2 бага в admin dock найдены и исправлены (long-press + haptic + badgeCount несогласованность). Store dock — touch targets 48px (ok), long-press + haptic уже были. Теперь поведение Арая идентично в обоих dock: short tap → chat, long press 400ms → voice.

**Верификация:**
- TSC 0 ошибок перед каждым коммитом
- Все 3 деплоя OK, prod HTTP 200 на /, /catalog, /api/health, /login после каждого
- `test-production.js`: **42/44 PASS, 0 FAIL** (2 WARN — динамические телефоны, не регрессия)
- Последний деплой `8be6c4c` устоялся через 240 сек (PM2 cold-start margin)

**Осталось на следующие сессии:**
- ARAYGLASS rounded-md/lg → rounded-xl массово (100+ файлов, точечно по разделам 77-86)
- shadow-sm/md/lg → arayglass-glow или убрать (58 файлов)
- Эмодзи в админских UI → lucide-react иконки (photo-editor EMOJI_ICONS array, workflows page, admin/email templates)
- `@@unique([productId, size])` на ProductVariant — **НЕ добавлено в этой сессии** (нужен preflight check на проде: если есть дубликаты size в одном product, миграция упадёт). Сначала запустить SQL-скрипт проверки, потом добавить constraint.
- UI для bulk-active/bulk-category (сейчас только endpoints, нужен Client toolbar в `/admin/products`)
- Полный API-аудит остальных admin routes (services, workflows, email)

---

### Сессия 22.04.2026 (сессия 21) — Account Drawer редизайн в ARAYGLASS + клиентский CRM Level 1

**Контекст:** Перед запуском Яндекс.Директа Арман хочет живой E2E обход прода вместе со мной — он описывает, я читаю код, чиню одним проходом, деплою, верифицирую. Начинаем с попапа `/cabinet` в ПилоРусе (скрин показал прежний простой drawer с двумя пунктами). Требование: весь клиентский CRM в попапе, ARAYGLASS стиль, каждый клик открывает вложенный попап сбоку, роль-гейтинг, банер «Лаборатория маркетинга ARAY» для сотрудников → ведёт в `/admin` (НЕ новая страница).

**1. Редизайн `components/store/account-drawer.tsx` (235+/63-):**
- Полная замена старого 150-строчного drawer на 520-строчный ARAYGLASS компонент
- Ширина drawer 320→380px, усиленный backdrop `blur(24px) saturate(180%)`
- `LoginPanel` / `RegisterPanel` — сохранены, иконка юзера в `.arayglass .arayglass-glow` круге, неоновое свечение в цвете палитры
- `ProfilePanel` для залогиненных:
  - Аватар подгружается из `/api/cabinet/profile` с fallback на инициалы
  - Карточка юзера `.arayglass .arayglass-glow` + ролевой бейдж `.arayglass-badge` (переводы `ROLE_LABELS`)
  - 13 клиентских секций в ARAYGLASS карточках через компонент `MenuRow`:
    - Мои заказы → `/cabinet/orders`
    - Отслеживание → SOON (заглушка «скоро»)
    - Избранное → `/wishlist`
    - Мои отзывы → `/cabinet/reviews`
    - Уведомления → `/cabinet/notifications`
    - Адреса → SOON
    - Бонусная программа → SOON
    - Профиль → `/cabinet/profile`
    - Медиабиблиотека → `/cabinet/media`
    - Подписки → `/cabinet/subscriptions`
    - История → `/cabinet/history`
    - Оформление → `/cabinet/appearance`
    - Помощь → `/contacts`
- Для staff-ролей (ALL_STAFF_ROLES из `lib/auth-helpers.ts`):
  - 3 quick-action карточки (Админка / Новый заказ для MANAGEMENT — Заказы для прочих / Доставка)
  - Банер **«Лаборатория маркетинга ARAY»** → `/admin` с `<Sparkles/>` иконкой, neon box-shadow в цвете палитры, тонкий градиент
- Кнопка «Выйти» — arayglass button, не старая кнопка с хардкодом
- `ThemePaletteBar` внизу сохранён, переведён на `border-primary/20 bg-primary/10`
- Type: `MenuItem` с опциональным `soon: boolean` → блокирует карточку, показывает бейдж «скоро»

**2. Стилевые правила ARAYGLASS соблюдены:**
- Нет hardcoded hex/rgb/gray-*
- Все цвета через `hsl(var(--primary) / X)` → меняются с палитрой (13 тем)
- Иконки lucide-react (НЕ emoji)
- Hover: `primary/[0.05]`, active: `arayglass-glow`
- rounded-xl для контролов, rounded-2xl для карточек

**3. Не тронуто в этой сессии (планы на следующие):**
- Вложенные попапы Level 2/3 — отложено (сначала посмотрим реакцию Армана на Level 1)
- Канбан для заказов внутри попапа — отложено
- `/admin` визит вместе с Арманом (E2E Task #94) — следующий приоритет

**Деплой:**
- sync: `components/store/account-drawer.tsx` (27995 bytes) → Latin path ✅
- commit `a79ad40 feat(cabinet): account drawer redesign ARAYGLASS + client CRM Level 1` ✅
- push origin main ✅
- Wait 150s + 30s (PM2 cold-start margin) ✅
- Verify: `/`, `/catalog`, `/login` → HTTP 200; `/cabinet` → 307 redirect (корректно для неавторизованного) ✅
- Production test: **42 PASS / 2 WARN / 0 FAIL** (warnings — телефоны на homepage «динамические», не регрессия) ✅

**Правила этой сессии (подтверждены Арманом):**
- E2E проверки **только на проде с Арманом живьём**, staging не подходит (нет базы данных)
- Каждый деплой → запись в CLAUDE.md + claude-memory (чтобы следующие сессии не повторяли)
- Арман описывает → я читаю код → чиню → деплою → верифицирую → спрашиваю его мнение
- Порядок: сначала ПилоРус попапы → потом админка
- ARAY-страницы пока НЕТ — банер ведёт в `/admin`, новую страницу придумаем позже

**На следующий E2E шаг:** Арман открывает `/cabinet` на проде (или залогинивается), смотрит новый drawer, описывает что нравится / что ломается / что хочет во Level 2 (канбан заказов, клиентский трекинг и т.д.). По его словам — правим одним коммитом. Приоритет после drawer → `/admin` обход (Task #94).

---

### Сессия 20.04.2026 (сессия 18) — Staging VPS поднят полностью + aray.online куплен + стратегия платформы

**Контекст:** Арман заказал staging VPS на Beget (aray-test, IP 159.194.196.233, Ubuntu 24.04, 4 CPU / 6 GB RAM / 77G NVMe). Задача сессии — поднять всю инфраструктуру и подготовить к первому деплою.

**1. SSH доступ настроен:**
- Арман добавил мой ключ `pilorus-развернуть` (= `pilorus-deploy`) в Beget при создании VPS
- Windows SSH: `C:\Program Files\Git\usr\bin\ssh.exe` (нет в PATH, использовать абсолютный путь)
- Утилиты в `D:\pilorus\`:
  - `__find-ssh.js` — локация ssh.exe
  - `__ssh-probe.js` — проверка подключения
  - `__ssh-exec.js` — простой runner (прямая команда)
  - `__ssh-script.js` — **основной**: пайпит bash-скрипт через stdin в `ssh host bash -s` (обходит проблемы с кавычками)
  - `__dns-check.js`, `__dns-check2.js` — проверка DNS (второй через 1.1.1.1/8.8.8.8)
  - `__staging-check.sh` — проверка что установлено

**2. Staging VPS — 4 этапа установки:**

**[Этап 1] `__staging-01-base.sh` — 32 сек:**
- apt update + upgrade
- Установлено: curl wget git vim htop tmux build-essential gnupg ufw fail2ban python3 unzip jq
- ufw: только 22/80/443 открыты
- timezone: Europe/Moscow
- hostname: aray-test

**[Этап 2] `__staging-02-stack.sh` — ~2 мин:**
- Node.js v20.20.2 + npm 10.8.2 (через NodeSource)
- pm2 6.0.14 (глобально)
- PostgreSQL 16 (Ubuntu 24.04 default)
- nginx 1.24.0
- certbot 2.9.0 + python3-certbot-nginx

**[Этап 3] `__staging-03-user-db.sh` — <10 сек:**
- `/etc/hosts` fix: добавлен `127.0.1.1 aray-test` (убирает warning sudo)
- User `armankmb` с sudo NOPASSWD
- SSH authorized_keys для armankmb: мой ключ + ключи root'а
- Директории: `/home/armankmb/pilo-rus/{app,backups,releases,logs}`
- PostgreSQL пароль сгенерирован (32 символа) → сохранён в `/root/.pilorus_staging_pg_password`
- PG user `pilorus_staging` + DB `pilorus_staging` (owner + ALL PRIVILEGES)
- DB connection test: `SELECT 'DB OK'` → ✅ работает
- Env reference: `/home/armankmb/pilo-rus/.env.staging.ref` (DATABASE_URL)

**[Этап 4] `__staging-04-nginx.sh` — ~20 сек:**
- nginx site: `/etc/nginx/sites-available/staging.pilo-rus.ru`
  - HTTP → HTTPS redirect
  - proxy_pass на localhost:3000 (будущее Next.js приложение)
  - `/_next/static/` кеш 31536000s
  - `/nginx-health` — health check (200 OK даже без app)
  - Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
  - `client_max_body_size 20M`, `proxy_read_timeout 300s`
- Default site удалён
- Let's Encrypt SSL через `certbot --nginx --non-interactive --agree-tos --email armankazarovich@gmail.com --redirect`
- Сертификат: ECDSA, expire 2026-07-19 (89 дней)
- Auto-renewal: `certbot.timer` (twice daily)

**3. DNS staging.pilo-rus.ru в Cloudflare:**
- Арман добавил A-запись: `staging → 159.194.196.233`
- Proxy status: **DNS only (серое облачко)** — обязательно для Let's Encrypt HTTP-01 challenge
- Пропагация: ~3-4 минуты (resolver 1.1.1.1/8.8.8.8 ответил раньше чем Windows resolver)

**4. Verify через https://staging.pilo-rus.ru:**
- HTTP → 301 (redirect to HTTPS) ✅
- HTTPS `/nginx-health` → 200 "nginx-ok" ✅
- HTTPS `/` → 502 (приложения на :3000 ещё нет, это ОК) ✅

**5. aray.online зарегистрирован (300₽/год):**
- Первый выбор `aray.store` — занят
- Взяли `aray.online` — лучше подходит: мультиниш (специалисты + фрилансеры + все сферы биржи)
- Направление: `Do not direct` (не настраивать пока инфраструктура не готова)
- Куплен до 20.04.2027

**6. Стратегия aray.online (mutitenancy):**
- **Этап 1 (сейчас-2 нед):** закончить staging + отполировать pilo-rus
- **Этап 2 (2-4 нед):** отдельный VPS под aray.online (~500-700₽/мес) + wildcard DNS `*.aray.online → IP` + wildcard SSL Let's Encrypt (DNS-01 challenge)
- **Этап 3 (1-2 мес):** MVP биржи — регистрация → автосоздание `client-xxx.aray.online` (14 дней free), каталог всех тенантов на `aray.online/market`, профили+рейтинги+отзывы
- **Этап 4 (2-3 мес):** кастомные домены — клиент делает A-record на наш IP → auto-SSL через Let's Encrypt HTTP-01 per domain
- База готова: с сессии 16 у нас 21 модель Prisma с `tenantId` + модель `Tenant` + middleware для detect по hostname. Активация фильтрации — в Stage 3

**7. Критические уроки:**
- Windows SSH: PowerShell МАНГЛИТ `$var` в inline scripts — всегда через отдельный `.js`/`.sh` файл
- SSH passing multi-line commands: не через `ssh host "cmd1 && cmd2"` (квоты ломаются), а через `ssh host bash -s` + stdin pipe
- Cloudflare + Let's Encrypt: для HTTP-01 challenge поддомен ОБЯЗАТЕЛЬНО с серым облачком (DNS only), иначе Cloudflare проксирует и challenge падает
- PostgreSQL create с pipe idempotent: `psql -tc "SELECT 1..." | grep -q 1 && update || create`

**Что осталось (следующая сессия):**
- [ ] Task #28: GitHub Actions workflow — ветка `staging` → деплой на staging VPS
  - Секреты: `STAGING_VPS_HOST`, `STAGING_VPS_USER`, `STAGING_VPS_SSH_KEY`, `STAGING_DATABASE_URL`
  - Workflow: git push staging → scp/rsync → npm ci → prisma db push → next build → pm2 restart
  - DB backup перед деплоем (как на prod)
- [ ] Первый деплой приложения на staging — копирование кода, миграции, pm2 start
- [ ] Создать .env.staging на VPS (копировать из prod, но заменить DATABASE_URL, SMTP, Telegram)
- [ ] Добавить `staging.pilo-rus.ru` в UptimeRobot мониторинг
- [ ] Task #21: добавить SSH-ключ Claude на prod VPS (через Beget Console — у меня нет SSH-доступа к prod)
- [ ] Task #22: Telegram alerts в UptimeRobot

**Файлы на локалке (утилиты для переиспользования):**
```
D:\pilorus\
  __ssh-script.js           ← основной runner
  __dns-check.js            ← DNS проверка (Windows resolver)
  __dns-check2.js           ← DNS через 1.1.1.1/8.8.8.8
  __staging-check.sh        ← что установлено на VPS
  __staging-01-base.sh      ← OS setup
  __staging-02-stack.sh     ← Node/pm2/PG/nginx/certbot
  __staging-03-user-db.sh   ← user + DB + folders
  __staging-04-nginx.sh     ← nginx config + SSL
  __staging-verify.js       ← проверка HTTPS снаружи
```

**Секреты на staging VPS:**
- `/root/.pilorus_staging_pg_password` — PG пароль (chmod 600)
- `/home/armankmb/pilo-rus/.env.staging.ref` — DATABASE_URL (reference)

---

### Сессия 19.04.2026 (сессия 17) — Авария VPS (2ч downtime) + восстановление + UptimeRobot + план staging

**Контекст:** После VPS upgrade (Beget: новый IP 85.198.86.153, 10GB RAM / 10 CPU) прод лежал 2 часа — деплои #806-#808 падали подряд.

**Причина #1 — Шрифты fonts.gstatic.com:**
- Новый VPS не мог достучаться до fonts.gstatic.com при `next build` (DNS/IPv6 проблема на VPS)
- `next/font/google` висел в retry-loop 15+ минут → SSH timeout → Actions красный крест
- **Фикс (commit `8ceb4a0`):**
  - Скачал Inter (400/500/600/700) + Oswald (400/500/700) woff2 через Google Fonts CSS2 API
  - Сохранил 14 файлов (~381KB) в `public/fonts/` (latin + cyrillic subsets)
  - `app/layout.tsx`: `import { Inter } from "next/font/google"` → `import localFont from "next/font/local"` с массивом src
  - **Next.js больше не делает ни одного HTTP-запроса к Google при build**
  - Утилита `D:\pilorus\__fetch-fonts.js` — переиспользовать если появятся ещё Google Fonts

**Причина #2 — Prisma connection exhaustion на SSG:**
- После фикса шрифтов билд дошёл до "Generating static pages (70/70)" и упал с:
  ```
  PrismaClientKnownRequestError: Too many database connections opened:
  FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute
  ```
- Корень: в сессии 16 я поставил `connection_limit=20` в `lib/prisma.ts` для runtime scale
- НО при `next build` Next.js запускает N параллельных worker-процессов для SSG — каждый создаёт свой PrismaClient → 20×N коннектов → PG (max_connections ~100) исчерпался
- **Фикс (commit `382a954`):**
  - `lib/prisma.ts`: различаем build-phase vs runtime через `NEXT_PHASE` env var
    - `phase-production-build` → `connection_limit=3, pool_timeout=30`
    - Runtime → `connection_limit=20` (как было, масштабирование)
  - `lib/site-settings.ts`: `getSiteSettings()` обёрнут в try/catch → при сбое БД возвращает `{}` → `getSetting()` падает на `DEFAULT_SETTINGS` → страница рендерится с дефолтами (telephone, email, etc)
  - Graceful degrade: даже если БД 1 раз дёрнется, страницы /terms /privacy /about /contacts отрендерятся

**Результат:**
- Deploy #809 прошёл за ~6 минут (incremental, .next кэш)
- Прод HTTP 200, **test-production.js: 44/44 PASS**, среднее время 239ms
- Downtime: 20:11 → 22:38 (2ч 27м)

**UptimeRobot мониторинг (настроен в этой же сессии):**
- Account: Arman's UptimeRobot (main API key `u3445951-147a3d76b85e3cd54971c93d`)
- 3 монитора активны:
  - ID 802877516: `https://pilo-rus.ru/api/health` (существовал)
  - ID 802879498: `PiloRus Production Main` → `https://pilo-rus.ru/`
  - ID 802879499: `PiloRus Catalog` → `https://pilo-rus.ru/catalog`
- Email alerts: ID 8341156 → armankazarovich@gmail.com (рабочий, пришло письмо во время аварии)
- Interval: 5 минут (free tier)
- **Telegram alerts ещё НЕ подключены** — требуют ручного setup с @UptimeRobot_Bot (на следующую сессию)
- Утилиты в `D:\pilorus\`:
  - `__uptimerobot-setup.js` — создание мониторов
  - `__uptimerobot-alerts.js` — привязка email к мониторам

**🔥 ПРАВИЛА ДЛЯ БУДУЩИХ СЕССИЙ (усвоенные уроки):**

1. **Vendored deps = ЗАКОН.** Любая build-time зависимость от внешнего CDN (шрифты, иконки, npm пакеты) — потенциальный single point of failure. После этой аварии всё что можно vendor'ить → vendor'им.
2. **connection_limit НЕ трогать на build.** Сейчас `NEXT_PHASE` детект работает. НЕ возвращать `connection_limit=20` без разделения build/runtime.
3. **getSiteSettings обёрнут в try/catch** — НЕ убирать. Это safety net для случаев когда БД недоступна.
4. **При падении деплоя — ЧИТАТЬ Actions log ПОЛНОСТЬЮ.** Не останавливаться на первой найденной причине. У нас было 2 причины наслоены — если бы починили только шрифты, упали бы на Prisma.
5. **CLAUDE.md = мозг.** Каждая сессия обновляет. Особенно когда есть "усвоенный урок".
6. **SSH с моей машины работает через GitHub Actions deploy-bot только.** Мои личные ключи `pilorus_deploy` и `pilorus_vps` НЕ в authorized_keys на новом VPS. Для прямого SSH на VPS → Арман должен добавить через Beget Console.

**Staging VPS — план (решено, ждём заказа VPS Арманом):**
- Арман берёт отдельный VPS на Beget, рекомендация 4GB RAM / 4 CPU / 50GB NVMe, Ubuntu 22.04, ~500-700₽/мес
- Имя: `aray-test` или `pilorus-staging`
- Поддомен: `staging.pilo-rus.ru`
- GitHub Actions: ветка `staging` → staging VPS, `main` → prod
- Workflow: код → staging → проверка → merge в main → prod
- Следующая сессия: настройка staging (2-4 часа)

**На следующую сессию:**
- [ ] Настроить staging VPS (когда Арман закажет и пришлёт IP/credentials)
- [ ] Task #19: Harden deploy.yml rollback — при неудачном билде автоматом rollback на app-previous/
- [ ] Task #17 (частично сделан): аудит остальных external build deps (npm registry mirror, скачивания в postinstall)
- [ ] Добавить мой SSH-ключ на VPS через Beget Console (`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGEggEh6FP10clWs7u7goKU0jVNDrUvHRk9FNByxCIhM pilorus-deploy`)
- [ ] Telegram alerts в UptimeRobot (требует @UptimeRobot_Bot setup)
- [ ] Возврат к ARAYGLASS дизайн-рефакторингу (п.7 манифеста)

### Сессия 19.04.2026 (сессия 16) — Scale Prep Stage 1: готовность к миллионам пользователей И сайтов

**Контекст:** Арман: "газуем брат подготовимся так чтоб проблемы не были с раширениями и мы смогли рости хоть миллионы пользователей и сайтов". Выбрал "Этап 1: Код (без инфраструктурных затрат)".

**Архитектурный аудит — найдено 10 bottlenecks:**
- Connection pool = 10 (дефолт Prisma) → фейлы на трафике
- Нет multi-tenancy (один сайт = один магазин)
- fs.writeFile для uploads на продакшене (уйдёт в S3 в Stage 2)
- NextAuth beta, нет partitioning, bundle bloat, no CDN, no error tracking

**Два деплоя Stage 1 (6 задач, 0 инфра-затрат):**

**Deploy #1 (commit `24abbe6`):**
1. ✅ **Prisma connection pooling** — `lib/prisma.ts` переписан с `buildDatabaseUrl()` который автоматически добавляет `connection_limit=20&pool_timeout=20&connect_timeout=10` если их нет в DATABASE_URL. Было 10, стало 20 (2x запас на пики). Логирование: dev → query/error/warn, prod → warn/error.
2. ✅ **10 новых индексов БД** — User.phone, Product.name, Order.guestPhone+telegramMessageId, Review.userId+createdAt, PushSubscription.userId+createdAt, PasswordResetToken.email+expiresAt, Post composite indexes. Масштаб до миллионов строк.
3. ✅ **force-dynamic на 5 CRM admin API** — workflows, workflows/[id], workflows/logs, documents, hints. Больше не кэшируются случайно.
4. ✅ **Bug fix — CRM workflows auth** — handlers использовали устаревший `if (authError) return authError` вместо `if (!authResult.authorized) return authResult.response`.
6. ✅ **Middleware для tenant detection** — `middleware.ts`: detectTenant(host) по hostname (`pilo-rus.ru` → "pilorus", `*.pilo-rus.ru` → slug). `x-tenant-id` header прокидывается в request и response. Редиректы категорий сохранены. Matcher исключает статику.

**Deploy #2 (commit `ab65265`):**
4. ✅ **Bundle оптимизация** — `next.config.js`: добавлены `googleapis`, `sharp`, `bcryptjs` в `serverComponentsExternalPackages`. Тяжёлые server-only пакеты не идут в client bundle.
5. ✅ **tenantId prep в Prisma schema** — через скрипт `__tenant-prep.js`:
   - +Модель `Tenant` (slug, name, domain, plan, settings, primaryColor, logoUrl)
   - +`tenantId String @default("pilorus")` + `@@index([tenantId])` на 21 core модели:
     User, Category, Product, Order, Review, Promotion, DeliveryRate, SiteSettings, NewsletterSubscriber, PromoCode, PartnershipLead, Expense, Task, Lead, Workflow, Post, Service, DocumentTemplate, ReportSchedule, CrmHint, NicheTemplate
   - Child-таблицы наследуют tenantId через FK parent — не трогали
   - `prisma db push` автоматически backfill'ит существующие строки = "pilorus"
   - `data-migrate.ts` шаг 10 — создаёт дефолтный `Tenant("pilorus", plan="enterprise")` идемпотентно

**Data separation НЕ активно** — это подготовка. В Stage 3 (multi-tenancy) добавим:
- Middleware фильтр `{ tenantId: headers["x-tenant-id"] }` через Prisma Client extensions
- Row Level Security в PostgreSQL
- Admin UI для создания новых тенантов

**SCALING.md** — roadmap на 4 этапа:
- Stage 1: Код (0₽) ✅ СДЕЛАНО
- Stage 2: Инфра (+1500-2000₽/мес) — VPS 4-6GB RAM, S3, CDN, managed PG
- Stage 3: Multi-tenancy — активация tenantId + RLS
- Stage 4: Enterprise — partitioning, read replicas, Redis

**Production test:** 43/44 PASS (health 503 на optional aray_api/google_ai — давний)

**🚨 ВАЖНО ДЛЯ СЛЕДУЮЩИХ СЕССИЙ:**
- **tenantId ВСЕГДА "pilorus"** в существующих запросах — не фильтруйте пока не скажу!
- Новые модели — добавлять `tenantId String @default("pilorus") @@index([tenantId])` по паттерну
- `lib/prisma.ts` — НЕ возвращать обратно к `new PrismaClient()` без buildDatabaseUrl (важно для пула)
- Middleware читает tenant из hostname — custom domains будут через БД lookup (Stage 3)

**На следующую сессию:**
- [ ] Task #7: UptimeRobot (бесплатно) + Sentry (до 5K событий бесплатно) — нужен аккаунт Армана
- [ ] Stage 2 (когда готов +2000₽/мес): VPS upgrade, S3, CDN, managed PostgreSQL
- [ ] Stage 3 (после Stage 2): активация tenantId фильтрации + RLS + admin UI для тенантов

### Сессия 19.04.2026 (сессия 15) — CRM 404 FIX + Deploy reliability + Архитектурный план

**Контекст:** CRM automation страница возвращала 404 на production уже 5+ сессий. Деплои #796-#798 падали с красным X.

**1. ROOT CAUSE найден — Build Timeout:**
- ✅ `next build` на VPS (3GB RAM) при чистой сборке занимает 15+ мин
- ✅ SSH `command_timeout` в deploy.yml был 15m → `Run Command Timeout` убивал build
- ✅ `.next` удалялся перед билдом → каждый деплой = полный rebuild = 15+ мин
- ✅ Инкрементальный билд (с кэшем .next) = 2-5 мин

**2. Deploy.yml — 4 критических фикса (коммит `b875eb9`):**
- ✅ `command_timeout: 15m` → `command_timeout: 30m`
- ✅ Убраны ОБА `rm -rf .next` → только `rm -rf .next/cache/webpack`
- ✅ Rollback order fix: сохранение `.next` в `$PREV_DIR` ПЕРЕД очисткой (был баг — удалялось ДО сохранения)
- ✅ Добавлена диагностика: disk usage, build exit code, CRM file checks

**3. Cleanup (коммит `77752a7`):**
- ✅ Удалён `app/api/admin/debug-build/route.ts` — временный diagnostic endpoint
- ✅ Восстановлен полный `app/admin/crm/automation/page.tsx` (AutoRefresh + AutomationClient)

**4. Решение Армана — АРХИТЕКТУРА ПЕРВЫМ ПРИОРИТЕТОМ:**
- Арман: "давай все что есть фиксим, улучшаем, делаем архитектуру, потом расширяем"
- CRM расширение ПРИОСТАНОВЛЕНО до построения инфраструктуры
- План: VPS upgrade (4-6GB RAM, 100+ GB) → S3 для картинок → CDN → managed PostgreSQL

**Production test: 44/44 PASS**

**Деплой:** коммиты `b875eb9` (deploy fix) + `77752a7` (cleanup), deploy #799 GREEN (21m 21s), #800 GREEN

**Файлы изменены:**
- `.github/workflows/deploy.yml` — timeout 30m, incremental builds, rollback fix
- `app/api/admin/debug-build/route.ts` — DELETED
- `app/admin/crm/automation/page.tsx` — restored full version

**🚨 КРИТИЧЕСКИ ВАЖНО ДЛЯ СЛЕДУЮЩИХ СЕССИЙ:**
- **НЕ удалять `.next` на сервере** — инкрементальный билд 2-5 мин vs полный 15+ мин
- **VPS 3GB RAM = потолок** — нужен upgrade для дальнейшего развития
- **Архитектура → потом фичи** — решение Армана, не менять без его одобрения

**На следующую сессию (ПРИОРИТЕТ 0 — Архитектура):**
1. VPS upgrade — Beget тариф с 4-6GB RAM, 100+ GB NVMe
2. S3 для картинок — Yandex Object Storage или Selectel
3. CDN — Beget CDN или CloudFlare
4. Managed PostgreSQL — отдельный сервер БД
5. После архитектуры → продолжить CRM (Тоннели, Шаблоны документов, Отчёты)

### Сессия 19.04.2026 (сессия 14) — Подушка безопасности + полный аудит + ARAYGLASS дашборд

**Контекст:** Арман попросил полный аудит проекта + подушку безопасности перед движением вперёд.

**1. Полный аудит проекта (4 направления):**
- ✅ Архитектура: проверены тяжёлые зависимости, bundle size, серверные компоненты
- ✅ Безопасность: `--accept-data-loss` в build script (КРИТИЧНО), отсутствие бэкапов БД
- ✅ Качество кода: TypeScript `ignoreBuildErrors: true`, отсутствие индексов БД
- ✅ Инфраструктура: отсутствие rollback-механизма, нет внешнего мониторинга

**2. ARAYGLASS дашборд — новый визуальный стиль:**
- ✅ `app/admin/page.tsx` — карточки статистики переведены на `.aray-stat-card` стиль
- ✅ Коммит `5cb6f9f`, задеплоен, prod OK

**3. Подушка безопасности — 5 критических улучшений (коммит `9ec3517`):**
- ✅ **Пункт 1**: Убран `--accept-data-loss` из build script → заменён на `--skip-generate`
  - `package.json` строка 10: `prisma db push --skip-generate && tsx prisma/data-migrate.ts && next build`
- ✅ **Пункт 2**: DB бэкап перед каждым деплоем
  - `.github/workflows/deploy.yml`: `pg_dump` → gzip → `/home/armankmb/pilo-rus/backups/`
  - Хранит 5 последних бэкапов, старые автоудаляются
- ✅ **Пункт 3**: 8 новых индексов БД для ускорения частых запросов
  - `prisma/schema.prisma`: Product (featured, active+featured), Review (approved+createdAt, productId), OrderItem (orderId, productName), User (role+staffStatus, lastActiveAt)
- ✅ **Пункт 4**: Тяжёлые библиотеки — УЖЕ оптимизированы (dynamic import, serverComponentsExternalPackages)
- ✅ **Пункт 5**: Auto-rollback при неудачном деплое
  - `.github/workflows/deploy.yml`: сохраняет предыдущую `.next` → health check после pm2 restart → если HTTP != 200 → откат на предыдущую версию

**Деплой:** коммит `9ec3517`, все страницы HTTP 200, health check OK ✅

**Файлы изменены:**
- `package.json` — убран --accept-data-loss
- `prisma/schema.prisma` — 8 новых индексов
- `.github/workflows/deploy.yml` — DB backup + rollback + health check

**Для Армана вручную:**
- [ ] UptimeRobot — настроить внешний мониторинг https://pilo-rus.ru/api/health (бесплатно, 5 мин интервал)

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

> Последнее обновление: 20.04.2026 (после развёрнутого life context share от Армана — приоритеты переставлены под реальность)

### 🔴 ПРИОРИТЕТ #0 — СПАСТИ ПИЛОРУС (Яндекс.Директ)

**Контекст:** Пилорус звонят Арману ЕЖЕДНЕВНО требуя настройку Яндекс.Директа. Это 150К/мес — самый большой клиент, фундамент офиса. Потеря = катастрофа для всей команды.

**Варианты решения (выбрать с Арманом):**

1. **Быстрый путь (1-2 дня):** Арман или Араик настраивают Директ руками по классике — минимальная кампания (поиск + РСЯ), ключи по материалам, UTM метки, связь с целями Метрики на pilo-rus.ru. Это тушит пожар.

2. **Средний путь (1 неделя):** подключаем Яндекс.Директ API к админке Пилоруса:
   - `/admin/marketing/direct` — управление кампаниями из нашей CRM
   - Импорт ключей из каталога товаров (автогенерация)
   - Синхронизация бюджетов и отчётов
   - Связь с целями Яндекс.Метрики (уже подключена)
   - → Закрывает потребность Пилоруса + становится фичей для Стройматериалов/Пилмоса/Эскалайна

3. **Стратегический путь (2-4 недели):** ARAY-ассистент для рекламы — popup в браузере клиента, помогает настраивать Директ/Google Ads на любом их сайте. Это то что Арман описывал в видении. Но его делать ТОЛЬКО после того как Пилорус стабилизирован через п.1 или п.2.

**Рекомендация:** начать с п.1 (тушение) + параллельно п.2 (фича для всех клиентов). П.3 — после Стройматериалов.

### 🟠 ПРИОРИТЕТ #1 — ОТКРЫТЬ СТРОЙМАТЕРИАЛЫ (150К/мес ждёт)

**Контекст:** Новый клиент готов платить 150К/мес за сайт. Ждёт конструктор/мульти-тенантность. Это +48% к обороту.

**Что нужно:**
- Завершить Staging VPS (GitHub Actions workflow для ветки `staging` → Task #28)
- Первый деплой на staging из текущей кодовой базы ПилоРус
- Активировать multi-tenancy фильтрацию (Stage 3 из SCALING.md) — middleware уже есть (сессия 16), нужно включить Prisma Client extensions с `tenantId` фильтром
- Создать `Tenant` запись для Стройматериалов (slug, name, domain, primaryColor, logoUrl)
- Скопировать/адаптировать дизайн под их бренд
- Миграция данных: импорт их товаров и категорий
- DNS: их домен → наш IP → auto-SSL через Let's Encrypt

**Оценка:** 2-4 недели чистой работы. При запуске — +150К/мес с первого же месяца.

### 🟡 ПРИОРИТЕТ #2 — УДЕРЖАТЬ ПИЛМОС + ЭСКАЛАЙН

**Контекст:** 100К + 60К = 160К/мес. Платят 5 лет и не жалуются, но это самый опасный тип клиентов — уйдут молча если конкурент предложит лучше.

**Что делать:**
- Ежемесячный апдейт: "вот что мы улучшили на вашем сайте за месяц" (email + скрины)
- Раз в квартал — созвон 30 мин, спросить что болит
- Применять к ним улучшения которые делаем для Пилоруса (SEO, Push, аналитика) — они платят за это, но сейчас не получают
- Пусть Арман делегирует мне составление ежемесячных писем — я пишу, он отправляет

### 🟢 ПРИОРИТЕТ #3 — ARAY-ПЛАТФОРМА (долгая игра)

**Контекст:** Видение Армана — биржа специалистов + магазинов + конструктор + AI-ассистент. `aray.online` куплен (сессия 18). База готова на 40% (multi-tenancy, staging VPS, архитектура).

**Этапы (параллельно с П0-П2):**
- **Сейчас:** staging VPS + первый деплой (закрывает П1 тоже)
- **Через 1 мес:** отдельный VPS под `aray.online` + wildcard DNS + wildcard SSL
- **Через 2 мес:** MVP биржи — регистрация → автосоздание `client-xxx.aray.online` (14 дней free), каталог тенантов на `aray.online/market`
- **Через 3 мес:** профили + рейтинги + отзывы (как «Знаток» Яндекса)
- **Через 4-6 мес:** кастомные домены, комиссии, первые платящие специалисты

**Правило:** ARAY-платформа НЕ должна съедать больше 30% времени пока П0 и П1 не закрыты. Иначе мы ремонтируем крышу пока подвал горит.

### 📋 ПРАВИЛО ВЫБОРА ЗАДАЧ ДЛЯ ЛЮБОЙ НОВОЙ СЕССИИ

1. Прочитал CLAUDE.md и ARMAN_CONTEXT.md (если доступен локально)?
2. Запустил production test?
3. Спросил Армана: "На чём сегодня фокус — спасение/открытие/удержание/платформа?"
4. Если Арман просит полировку (пиксели, hover, дизайн) — вежливо напомни про П0-П1 и предложи сделать это ВНУТРИ основной задачи, не отдельным коммитом.
5. Задача принесёт или удержит деньги в ближайший месяц? Если нет — отложи.

---

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

### 🎨 ДИЗАЙН-СИСТЕМА (25.04.2026, сессия 30)

> ⚠️ **ARAYGLASS манифест — DEPRECATED.** Замещён единой дизайн-системой магазина.
>
> **Источник правды:** `D:\ПилоРус\website\DESIGN_SYSTEM.md` — закон для всех UI задач.
>
> **Кратко:** один сайт — один стиль. Магазин (pilo-rus.ru), кабинет, админка — одна визуальная система.
> `bg-card border-border rounded-2xl` для карточек, `bg-primary text-primary-foreground` для CTA, lucide-react иконки, никаких эмодзи в UI, никаких arayglass-glow/shimmer на постоянных элементах.
>
> **Перед любой UI-задачей:** читать DESIGN_SYSTEM.md, проходить чеклист п.7 перед коммитом.
>
> Старый манифест ARAYGLASS оставлен ниже для исторического контекста — НЕ применять к новому коду.

---

### 🎨 ДИЗАЙН-МАНИФЕСТ — ARAYGLASS (18.04.2026, DEPRECATED)

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

#### 10. СТОП-ЛИСТ — ЗАПРЕЩЁННЫЕ СТИЛИ (АБСОЛЮТНЫЙ ЗАПРЕТ)

> **Этот стоп-лист — закон. Ни одна сессия, ни один чат не имеет права нарушать его.**
> Если элемент не описан в манифесте ARAYGLASS — СТОП. Не придумывай. Спроси Армана.

**ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ В UI-ЭЛЕМЕНТАХ (без исключений):**
- `bg-gray-*`, `text-gray-*`, `border-gray-*` — МЁРТВЫЕ цвета. Используй `text-muted-foreground`, `bg-muted`, `border-border`
- `#hex`, `rgb()`, `rgba()` для цветов текста/фона/обводок — только `hsl(var(--primary) / X)` и CSS vars
- `rounded-md`, `rounded-sm`, `rounded-lg` — только `rounded-xl` (контролы) и `rounded-2xl` (карточки)
- `border-input`, `ring-ring`, `ring-offset` — старые shadcn токены, не используем
- `bg-white`, `bg-black`, `text-white`, `text-black` — только в always-dark сайдбаре или декоративных элементах
- `shadow-sm`, `shadow-md`, `shadow-lg` — используй `arayglass-glow` или `box-shadow` с `hsl(var(--primary))`
- Inline `style={{}}` с цветами — ЗАПРЕЩЕНО. Всё через Tailwind classes или CSS vars
- `hover:bg-gray-*`, `hover:bg-slate-*` — только `hover:bg-primary/[0.05]`
- Любые новые CSS-классы вне `globals.css` — если нужен новый класс, сначала обсуди с Арманом
- **Нативные Unicode эмодзи в UI** (🔥📞⭐✨🛒🪵☎🎉👍✅❌⚡🎨🌟💡🔔📦🚚📱💬✈️ и т.д.) — ЗАПРЕЩЕНО. Используй `lucide-react` иконки (`<Bell />`, `<Package />`, `<Check />`, `<Phone />`, `<Info />`, `<TreePine />`, `<Trees />`, `<Leaf />`, `<Layers />`, `<SquareStack />`, `<SearchX />` и т.д.) или кастомный SVG. Причина: эмодзи рендерятся по-разному на iOS/Android/Windows/macOS, ломают единый brand-вид, не меняют цвет с палитрой, не масштабируются под dark/light. Lucide — единый монохромный стиль, `currentColor`, палитра-aware через `text-primary`. Исключения: эмодзи в бизнес-данных (комментарии к заказам, посты блога, UGC отзывы) — ОК, т.к. это контент не UI

**ЗАПРЕЩЕНО ДЕЛАТЬ БЕЗ СОГЛАСОВАНИЯ:**
- Создавать новые визуальные стили/классы (только из существующих ARAYGLASS блоков)
- Менять существующие `.arayglass-*` классы в globals.css
- Добавлять новые палитры без одобрения
- Менять анимации (timing, easing, duration)
- Вводить новые паттерны карточек/таблиц/форм

**ЕСЛИ ВИДИШЬ СТАРЫЙ СТИЛЬ В КОДЕ:**
- НЕ исправляй в рамках другой задачи — запиши в "известные баги"
- Исправляй ТОЛЬКО когда переделываешь конкретный раздел по плану (п.7 манифеста)
- Один раздел = один коммит, не смешивать

**ИСКЛЮЧЕНИЯ (можно использовать):**
- `bg-gray-300` / `bg-green-500` / `bg-yellow-500` — ТОЛЬКО для декоративных точек онлайн-статуса
- `text-gray-500` — ТОЛЬКО в print-стилях
- `text-white` — ТОЛЬКО внутри always-dark сайдбара

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
