# ARAY Continue Prompt

Use this prompt at the start of a new Codex chat to continue ARAY / PiloRus from the current project state.

```text
Привет, брат. Продолжаем ARAY / ПилоРус.

Рабочая папка:
D:\проект\pilorus\website

Сначала обязательно прочитай по порядку:
0. docs/ARAY_NIGHT_MEMORY_2026-05-08.md
1. docs/ARAY_ADMIN_START_HERE.md
2. docs/ARAY_PRODUCT_BRAIN_INDEX_2026-05-07.md
3. docs/aray-module-system-law-2026-05-07.md
4. docs/aray-module-roadmap-2026-05-07.md
5. docs/aray-admin-live-checklist-2026-05-02.md

Потом проверь:
git status --short

Важные законы проекта:
- Не откатывай чужие изменения и не чисти dirty worktree без прямой просьбы.
- Не деплоим кривое. Сначала локально доводим release-slice до проверок.
- Перед изменением существующего раздела прочитай `docs/SECTION_CHANGE_PROTOCOL.md`, назови раздел, сделай snapshot через `npm run section:snapshot -- --file <path> --section <name> --reason <reason>`, после изменений покажи результат Арману и не считай раздел принятым без его явного "ок".
- Все серьезные функции делаем как модули: Module Passport, registry, настройки, права, подписка, ARAY skills, поиск, события, checks.
- Popup System является core module: все попапы/drawer/sheet/picker/confirm только через общий popup law и overlay guard.
- ARAY должен быть интерфейсом действий: понимает страницу, роль, устройство, включенные модули, объясняет и просит подтверждение для рискованных действий.
- Не выдумывать аналитику, цены, спрос, рейтинги, рекламные результаты. Если нет источника, показывать "нет данных".
- Если можно сделать легче через фабрику, registry, validator, scaffolder или модульный закон, первым предложи этот путь.

Текущий стратегический фокус:
1. Закончить ARAY foundation.
2. Сделать Module Control Center и Module Registry.
3. Упаковать существующие разделы в module passports.
4. После этого газовать модулями: Yandex Direct Pro, Ads Hub, SEO Autopilot, Smart Import/Export, Marketplace Analytics, Ratings/Reputation, Constructor.

Стиль работы:
- Не останавливайся на предложении, если можно безопасно сделать.
- Работай маленькими проверяемыми слоями.
- После изменений запускай релевантные проверки.
- Обновляй checklist/docs, чтобы мысли Армана не терялись.
- Финальный отчет короткий: что сделал, где смотреть, что проверил, следующий шаг.

Начни с чтения документов и статуса, потом продолжай по live-checklist и текущему самому важному P0.
Газуем, брат.
```

## 2026-05-09 Constructor / Tenant Context Reminder

Any future ARAY admin section must be designed as shared-platform UI that adapts to the current business/site/tenant.

- Read the current `tenantId` / site context first.
- Filter catalog, categories, orders, CRM, settings, integrations and API tokens by that tenant.
- Derive brand names, regions, links, currencies, empty states and external accounts from the current business settings.
- Treat PiloRus-specific values as current tenant data or fallback/demo only, never as permanent platform logic.
- Mark hard-coded sections as migration targets before calling them constructor-ready.

## 2026-05-09 Promotion / Ads Hub DRAFT

- `/admin/promotion` is in DRAFT until Arman explicitly approves the visual result.
- Current direction: Ads Hub / advertising assistant, not a static PiloRus-only Direct page.
- Yandex Direct is the first real API channel; VK Ads/target and Google Ads are visible as planned channels.
- The Direct generator is tenant-aware and can build drafts by category or by product with limits for groups, ads and keywords.
- Product links, region, company name, budget hint, schedule and product images come from current tenant/site/catalog data where available.
- One-click export must remain safe: create campaign/group/ad/keyword objects only after owner confirmation, with no paid launch flow until a separate approved step exists.
- Professional workflow target: category selection -> feed/filter setup -> ad generation -> recommended campaign settings -> draft/export history -> honest analytics from Direct/Metrika. Do not scatter all controls in one flat panel.
- UX law for Ads Hub: first screen should start with one clear action, "Собрать РК с ARAY". Advanced settings appear only after the user opens the guided wizard or directologist controls.
- Readability law for owner-facing modules: first show the current safe action, real status and next confirmation; hide professional controls behind a clearly named `Pro` / advanced block. Do not force a normal owner to choose categories/products manually when ARAY can safely use the current catalog and explain the result.
- Yandex Direct connection rule: never ask for or store the user's Yandex password. The business owner/directologist connects their own Direct account through Yandex OAuth; ARAY stores an encrypted token scoped to the current business.
- Ads Pro target: directologists should later manage client campaigns from ARAY with roles, access scopes, generation history, change log, performance metrics, and no invented analytics.
- 2026-05-09 update: the accepted direction is one quiz, not a flat Direct clone. Flow: `Собрать РК с ARAY` -> choose catalog/feed/campaign/ad settings -> choose export parts with checkboxes -> confirm owner consent -> connect Direct by OAuth if needed -> export safe draft to Direct. Anything not connected/tested must be shown as a short honest instruction, not fake functionality.
- 2026-05-09 safety note: do not simplify `/admin/promotion` down to "feed + Direct button" or delete visible value blocks unless Arman explicitly says "да, удаляем". If Arman is tired or distressed, pause destructive UI edits, preserve the current section, and only restore from snapshots or make clearly reversible small changes.
