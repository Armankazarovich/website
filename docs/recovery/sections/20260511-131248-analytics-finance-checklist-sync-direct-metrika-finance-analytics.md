# ARAY Admin live checklist

## Update 07.05.2026 - Module System Law

- `DESIGNED` Created `docs/aray-module-system-law-2026-05-07.md`.
- `DESIGNED` Created `docs/aray-module-roadmap-2026-05-07.md` for ARAY foundation, Module Control Center, Yandex Direct Pro, Ads Hub, SEO Autopilot, Smart Import/Export, Marketplace Analytics and existing module packaging.
- `DESIGNED` Accepted platform rule: every serious feature is a module with Module Passport, enable/disable lifecycle, permissions, billing, ARAY skills, search, events and quality checks.
- `DESIGNED` Popup System is a core module: all future modal/drawer/sheet/picker surfaces must use shared popup primitives and overlay guard.
- `READY_LOCAL` Motion System is a core module: admin page transitions now use one light bottom-to-top journal flow with reduced-motion support.
- `READY_LOCAL` App Identity / PWA System is a core module: ARAY Production logo powers admin/module favicons and PWA icons, module routes sync manifest/title/start URL automatically, and install works per module instead of per scattered page.
- `DESIGNED` Ratings module law: platform semantic colors for rating levels, editable through admin controls, with manual/verified/partner/premium sources and legacy color preservation.
- `DESIGNED` Module Control Center law: every module needs toggles, smart search, filters, health, subscription state, usage analytics, connector status, settings and ARAY explanation.
- `DESIGNED` Module Storefront law: modules can appear on ARAY Production storefront with price/status/preview/install, but install still follows permissions, billing and connector confirmation.
- `DESIGNED` Dream law: Arman asks for the final product in normal language, and Codex/ARAY turns it into a finished standard module with passport, UI, toggles, permissions, billing, ARAY skills, events, responsive support and checks.
- `READY_LOCAL` 08.05.2026: first engineering step is implemented in `lib/aray-module-registry.ts` with Module Passport types and first passports for Design System, Popup System, Motion System, App Identity / PWA System, Notifications, ARAY Voice, Terminal and Marketplace.
- `READY_LOCAL` 08.05.2026: added `scripts/validate-aray-modules.js`, `npm run modules:check`, and wired the module registry validation into `npm run quality`.
- `READY_LOCAL` 08.05.2026: first Module Control Center is available at `/admin/aray/modules`; it reads `arayModuleRegistry`, shows summary, search, filters, status/health, dependencies, rights, data sources, ARAY skills and passport modal through shared `AdminModal`.
- `READY_LOCAL` 08.05.2026: added `/api/admin/aray/modules` for registry payload and connected `/admin/aray/modules` to route classification, ARAY quick actions and admin smart search context.
- `READY_LOCAL` 08.05.2026: module guard now protects the registry, Module Control Center page/component/API and navigation model entry.
- `READY_LOCAL` 08.05.2026: Module Control Center human-language pass: Russian module names, plain explanations, pill filters instead of native selects, no fake enable/disable switches, and technical passport details moved behind `AdminModal`.
- `READY_LOCAL` Checks: `node scripts/validate-aray-modules.js`, `node scripts/validate-admin-navigation-model.js`, `npx tsc --noEmit --pretty false`, `npm run quality`.
- `NEXT` Next module step: add persistent enable/disable state, role/subscription visibility and connector status on top of registry, without fake toggles.

## Update 07.05.2026 - Touch Popup Guard

- `READY_LOCAL` Added shared `useAdminOverlayGuard(open)` contract: all real modal/drawer surfaces can mark `body[data-admin-overlay-open="true"]`.
- `READY_LOCAL` `AdminModal`, `SidePanel`, Radix `Dialog` / `Sheet`, terminal overlays, ARAY settings, media picker/bulk confirm, ARAY costs subscription form, store cart/search/filter/account drawers now participate in the shared overlay guard.
- `READY_LOCAL` Admin and store mobile docks now observe the shared overlay state and move away while popups are open, so touch-screen actions stay reachable.
- `READY_LOCAL` UI integrity guard now checks the shared overlay hook, admin dock, store dock, and CSS hiding rule.

## Update 07.05.2026 - Voice / Weekends / Popup Audit

- `READY_LOCAL / DEVICE_LOCAL` Голос ARAY: добавлен общий локальный контракт `lib/aray-voice-preferences.ts`.
- `READY_LOCAL` Панель уведомлений получила настройки голоса на этом устройстве: голосовые ответы, рабочее окно, выходные, статус активности.
- `READY_LOCAL` `components/store/aray-chat-host.tsx` уважает расписание при озвучке ответов: вне рабочего окна автоматический голос молчит.
- `IMPORTANT` Микрофон нельзя включать скрыто. Браузерное разрешение и явное действие пользователя остаются обязательными; будущий always-on режим делать только через прозрачный consent, stop-кнопку и журнал доступа.
- `ACCEPTED` Agent Halley провел popup-аудит. Следующий безопасный popup-pass: `app/admin/media/media-client.tsx` media picker/delete confirm -> `app/admin/orders/new/page.tsx` cash/settings modals -> ARAY settings/mobile sheets.
- `NEXT` После этого продолжать единый popup standard: новые панели делать через `AdminModal` / notification-style right panel, без новых ручных `fixed inset` оверлеев.
- `READY_LOCAL` UI pass: header refresh перенесен вправо рядом с уведомлениями, mobile header показывает поиск/refresh/bell, back-кнопка стала единым compact contour с фирменным hover-glow.
- `READY_LOCAL` Overlay law усилен: `AdminModal`, `SidePanel` и терминальные скрытые panels ставят общий `data-admin-overlay-open`, mobile dock/PWA launcher уходят вниз и больше не перекрывают действия попапов.
- `READY_LOCAL` Mobile dock стал умнее: левые быстрые пункты берутся из текущего контекста/ARAY navigation model, ARAY стабильно остается центром, меню получило install-app promo card с крестиком.

Дата старта: 02.05.2026

Этот файл обновляется после каждого рабочего захода. Он нужен, чтобы не делать один раздел два раза и чтобы новый чат сразу видел, где мы стоим.

Статусы: `TODO`, `DESIGNED`, `IN_PROGRESS`, `BETA`, `READY_LOCAL`, `NEEDS_REVIEW`, `DEPLOY_READY`, `DONE`, `BLOCKED`.

## Текущий спринт

1. `IN_PROGRESS` Память проекта: start file, master roadmap, live checklist.
2. `IN_PROGRESS` Дизайн-система: единый modal/footer/alert/readability.
3. `BETA` Терминал: касса, корзина, настройки, обучение, смены.
4. `BETA` Заказы: list/detail/quick view/mobile/CRM status sync.
5. `BETA` Настройки: разнести по мегаразделам, убрать свалку.
6. `IN_PROGRESS` Управление бизнесом: nav, settings page, категории/склад на AdminModal.
7. `DESIGNED` Arai Fill: единая кнопка "Заполнить с Араем" для форм и SEO.
8. `IN_PROGRESS` Маркетинг: продвижение, акции, отзывы, рассылки.
9. `READY_LOCAL` База знаний: переосмыслить помощь как центр обучения.

## Ежедневная automation

- [x] Создана automation `aray-daily-admin-checklist` на каждый день 10:00.
- [x] Создана automation `aray-admin-workday-pulse` каждые 4 часа.
- [x] `npm run deploy` переведен на относительный путь `../scripts/deploy.js`, а deploy script больше не привязан к старому `D:/pilorus`.
- [ ] Каждый день выбирать один главный раздел дня.
- [ ] Каждый день фиксировать, какие агенты запущены, что они делают и что приняли.
- [ ] После работы агентов Main Codex проверяет diff и quality-gate.
- [ ] После приемки Main Codex показывает Арману только проверенный результат.

## Формат отчета Арману

- [x] Отчеты пишем человеческим языком: где смотреть, что сделано, что работает, что beta, что проверено, что дальше.
- [x] В каждом финальном отчете давать ссылки на страницы/файлы, где можно посмотреть результат.
- [x] В каждом финальном отчете явно говорить, какие требования Армана внесены в roadmap/checklist, чтобы он не переживал, что мы потеряли мысль.

### Закон отчетов по разделам

С 04.05.2026 каждый раздел принимается только через понятный отчет:

- раздел и текущий статус: `TODO`, `BETA`, `READY_LOCAL`, `DEPLOY_READY` или честный `BLOCKED`;
- кто работал: Main Codex или агент, владение агента, какие файлы/страницы он трогал или проверял;
- где смотреть: локальная ссылка и конкретный сценарий для проверки глазами;
- что реально работает: пользовательские действия, а не только дизайн;
- что beta / чего еще нет: только честные ограничения без маскировки;
- проверки: TypeScript, lint, quality, browser, mobile, console errors, если проходили;
- мнение Main Codex: что лишнее, чего не хватает, какой следующий лучший шаг.

Агенты не закрывают задачу сами. Main Codex принимает их отчет, проверяет diff/страницу/quality и только после этого меняет статус в checklist.

## Журнал агентов

Формат записи:

```text
Дата:
Раздел:
Agent:
Владение:
Статус:
Итог:
Проверено Main Codex:
Checklist обновлен:
```

### 02.05.2026

Раздел: roadmap/admin audit

- Agent Ramanujan: аудит `/admin/promotion`, `/admin/promotions`, `/admin/reviews`, `/admin/email`. Статус: completed. Итог внесен в master roadmap и checklist.
- Agent Ptolemy: аудит `/admin/settings`, `/admin/help`, `/admin/finance`, `/admin/aray`. Статус: completed. Итог внесен в master roadmap и checklist.
- Agent Cicero: аудит `/admin/orders`, `/admin/orders/new`, `/admin/tasks`, `/admin/delivery`, `/admin/clients`, `/admin/crm`, `/admin/crm/automation`. Статус: completed. Итог внесен в master roadmap и checklist.
- Agent Euler: аудит синхронизации терминала с каталогом сайта. Статус: completed. Итог принят Main Codex: терминал должен брать только публичные/активные товары и сервер должен повторно проверять позиции при создании заказа.
- Agent Newton: аудит блока "Управление бизнесом" (товары, категории, склад, импорт, медиа). Статус: completed. Итог принят Main Codex: товары/каталог/склад идут в горячий приоритет после терминала.
- Agent Halley: аудит паттерна "Заполнить с Араем". Статус: completed. Итог принят Main Codex: создан единый контракт `docs/aray-ai-fill-pattern-2026-05-02.md`.

### 04.05.2026

Раздел: дизайн-система + Управление бизнесом

- Agent Business Core: аудит `/admin/business/settings`, nav/i18n и mobile nav. Статус: completed. Итог принят Main Codex: страница подключена в shell title и permissions, mobile menu по коду показывает группу "Управление бизнесом".
- Agent QA/Design: аудит P0.2 дизайн-системы. Статус: completed. Итог принят Main Codex: `ConfirmDialog` переведен на header/footer `AdminModal`; список следующих design cleanup сохранен для следующих проходов.
- Agent Terminal/Ops: аудит `/admin/orders/new`. Статус: completed. Итог принят Main Codex: QR-действия больше не выглядят рабочими без провайдера, hook warnings по терминальным файлам закрыты; P1-риск кассовой смены записан в терминал.
- Agent Mobile UX: аудит мобильного UX, кнопок и форм. Статус: completed. Итог принят Main Codex: исправлены touch targets и переполнения в header/status/forms; остался общий визуальный прогон перед деплоем.
- Agent Back/Search QA: read-only аудит лишних кнопок назад и поиска. Статус: completed. Итог принят Main Codex: найден список локальных back-кнопок для удаления после проверки; поиск требует защиты от гонок и единого реестра маршрутов.
- Agent Performance: read-only аудит скорости. Статус: completed. Итог принят Main Codex: PWA cache cleanup начат, крупные загрузки и `logo.png` оставлены как must-fix перед деплоем.
- Agent ARAY AI QA: read-only аудит ARAY AI. Статус: completed. Итог принят Main Codex: главная ARAY должна стать рабочим ChatGPT-like чатом, мутационные действия требуют подтверждения.
- Agent Branding QA: read-only аудит логотипов. Статус: completed. Итог принят Main Codex: PiloRus остается брендом магазина/PWA, админка/ARAY/ARAY Production используют ARAY Production, тяжелый `logo.png` убрать из UI где возможно.
- Agent Marketing/Promotion: `/admin/promotion`. Статус: completed. Владение: `app/admin/promotion/page.tsx`. Итог принят Main Codex: раздел стал рабочим центром продвижения с готовностью каталога, рекламными каналами, фидами, генератором черновиков, SEO/sitemap/метрикой, минус-словами и Arai-prompt. Browser QA на `http://127.0.0.1:3100/admin/promotion` прошел без overlay и console errors.
- Agent Bohr: `/admin/promotions` и API акций. Статус: completed. Владение: `app/admin/promotions/page.tsx`, `app/admin/promotion/page.tsx`, `app/api/admin/promotions/route.ts`, `app/api/admin/promotions/[id]/route.ts`. Итог принят Main Codex: карточки акций, статусы, mobile forms, медиа, безопасная валидация API, честный beta-roadmap по товарам/шаблонам/рассылкам. Targeted lint и `npx tsc --noEmit --pretty false` прошли.
- Agent Wegener: mobile UX/nav/popup/back sweep. Статус: running. Владение: read-only аудит админки, без правок. Цель: найти несостыковки по mobile, модалкам, навигации и лишним back-кнопкам.
- Agent Avicenna: performance/functionality/search sweep. Статус: running. Владение: read-only аудит скорости, client/server импортов, PWA/cache и поиска, без правок.
- Agent Heisenberg: ARAY AI audit. Статус: completed. Владение: read-only аудит `app/admin/aray`, `components/store/aray-chat-host.tsx`, API `/api/ai/chat*`. Итог принят Main Codex: найден корень дублей — отдельная страница ARAY и глобальный ChatHost жили параллельно; принято решение: один нижний ввод, одна серверная история, ARAY page как рабочее окно переписки и настроек.
- Agent Sagan: финансы. Статус: completed. Владение: `app/admin/finance/page.tsx`. Итог принят Main Codex только как `BETA`: расходы/P&L/банк/личные финансы получили рабочий каркас, но UX и mobile еще не приняты как готовый продукт.
- Agent Laplace: иерархия меню. Статус: completed. Владение: `components/admin/admin-nav-structure.ts`, `components/admin/admin-nav.tsx`, `components/admin/admin-mobile-bottom-nav.tsx`, `lib/admin-i18n.ts`. Итог принят Main Codex: roadmap-порядок меню, "Рабочий стол" вместо "Дашборд", ARAY AI под рабочим столом, мобильная карта админки. Проверено: `npx tsc --noEmit --pretty false`, `npm run quality`, поиск старых пользовательских подписей.
- Main Codex: ARAY AI page/dock. Статус: `BETA / READY_LOCAL каркас`. Владение: `components/shared/aray-orb.tsx`, `components/store/aray-chat-host.tsx`, `components/store/aray-dock.tsx`, `components/store/mobile-bottom-nav.tsx`, `components/admin/admin-mobile-bottom-nav.tsx`, `components/admin/admin-shell.tsx`, `components/admin/admin-deferred-client-tools.tsx`, `components/admin/admin-pwa-install.tsx`, `app/api/admin/pwa-icon/route.tsx`, `public/admin-manifest.json`. Итог: убран фиксированный desktop dock из админки, существующий ARAY-чат оставлен единым сервисом, mic переведен на push-to-talk без fullscreen popup, старый `VoiceModeOverlay` снят с монтирования в store/cabinet/admin, mobile ARAY-кнопки больше не дергают `aray:voice`, действия copy/play/like/dislike оставлены только на ответах ARAY, TTS идет через `/api/ai/tts` и singleton `lib/aray-audio.ts`, создан живой ARAY-orb без лица/монеты/букв, admin PWA icon генерируется тем же orb-стилем, видимые английские подписи `Arai` заменены на `ARAY`. Проверено: `npx tsc --noEmit --pretty false`, `npm run quality`, `/admin` отвечает 307 на `/login`, `/api/admin/pwa-icon?s=192` отвечает 200.

### 05.05.2026

Раздел: ARAY AI + дизайн-система

- Main Codex: единый ARAY ChatHost. Статус: `BETA / READY_LOCAL fix`. Владение: `components/admin/admin-shell.tsx`. Итог: `/admin/aray` теперь тоже монтирует тот же глобальный `LazyAdminAray`, события `aray:open` с home-actions/mobile nav не теряются и не создают дубль чата; TTS/ElevenLabs не тронуты и остаются через `/api/ai/tts` + `lib/aray-audio.ts`.
- Main Codex: ARAY edge-hover. Статус: `READY_LOCAL эталон для карточек`. Владение: `app/globals.css`, `DESIGN_SYSTEM.md`. Итог: hover Армана из 4AYKA адаптирован как единый `admin-liquid-interactive` edge-ring: 1px по краю, цвет от выбранной палитры (`--primary`, `--atmo-accent`, `--atmo-glow`), без внешних теней, без переноса на кнопки/формы, с `prefers-reduced-motion`.
- Main Codex: admin PWA icon. Статус: `READY_LOCAL fix`. Владение: `app/api/admin/pwa-icon/route.tsx`. Итог: генерация PWA-иконки переведена на node runtime + `sharp`, чтобы не падать на кириллическом пути workspace; `admin-manifest.json` и `/api/admin/pwa-icon?s=192` отвечают 200.
- Main Codex: delivery table warning. Статус: `READY_LOCAL fix`, не переводит раздел в готовый. Владение: `app/admin/delivery/page.tsx`. Итог: убраны whitespace text nodes внутри таблицы архива, React/Next предупреждение по `<table>/<thead>/<tbody>/<tr>` больше не появляется при открытии `/admin/delivery`.
- Browser QA: `http://127.0.0.1:3100/admin` открыт в in-app browser, проверены dark/light/палитровый hover на карточках dashboard, кнопочный эксперимент откатан, затем прогнаны 22 admin route: новых console errors, runtime overlay и fatal screens не обнаружено.
- Проверено Main Codex: `npx tsc --noEmit --pretty false`, `npm run quality`.
- Main Codex: восстановление старого PiloRus ARAY assistant surface. Статус: `BETA / READY_LOCAL restored UI`. Владение: `components/admin/lazy-components.tsx`, `components/admin/admin-shell.tsx`, `components/store/aray-widget.tsx`, `components/store/aray-dock.tsx`, `components/admin/admin-mobile-bottom-nav.tsx`, `app/globals.css`. Итог: админка снова использует старый voice-first `ArayWidget` с орбом, "Нажми на орб — говори", перепиской и нижним вводом; `ArayChatHost` в админке не монтируется, дубля чата нет. ElevenLabs/TTS сохранен через `/api/ai/tts`, чат идет через `/api/ai/chat`, события `aray:open`, `aray:prompt`, `aray:voice` сохранены.
- Main Codex: ARAY abilities static QA. Статус: `READY_LOCAL static check`. Итог: в `lib/aray-agent.ts` найдено 29 tools, все 29 имеют обработчики в `app/api/ai/chat/route.ts`; 10 mutating admin tools (`update_order_status`, `create_task`, `update_task`, `update_product_price`, `toggle_product_active`, `send_push_notification`, `create_lead`, `create_product`, `create_category`, `update_stock`) возвращают confirmation draft и не выполняются без подтверждения сотрудника.
- Main Codex: ARAY action confirm cards. Статус: `READY_LOCAL core safety`. Владение: `app/api/ai/chat/route.ts`, `components/store/aray-widget.tsx`. Итог: mutating ARAY tools теперь отдают скрытый `__ARAY_CONFIRM__`, виджет показывает карточку с деталями действия и кнопками "Отмена" / "Подтвердить"; подтверждение идет отдельным `confirmAction` в тот же `/api/ai/chat`, с проверкой роли через `getToolsForRole`. Проверено: `npx tsc --noEmit --pretty false`, `npm run quality`. Browser visual pass не выполнен: текущая in-app вкладка недоступна в Browser Use runtime.
- Main Codex: mobile ARAY entry + glass bottom nav. Статус: `READY_LOCAL browser visual pass`. Итог: фиксированный `ArayDock` на мобильной админке скрыт (`hidden lg:block`), вход в ARAY на mobile снова только через центральную кнопку нижнего меню; tap открывает старый voice-first ARAY panel, long-press вызывает `aray:voice`. Нижнее меню получило стеклянный фон из 4AYKA-сниппета: blur/saturate, мягкий верхний блик, без тяжелых теней. Проверено в in-app browser на `http://127.0.0.1:3100/admin`: `[data-admin-mobile-dock]` виден, ARAY-кнопка открывает панель с орбом, "Арай / Онлайн", "Нажми — говори" и перепиской.
- Main Codex: global admin hover layer. Статус: `READY_LOCAL global surface standard`. Владение: `app/globals.css`, `components/admin/admin-shell.tsx`, `DESIGN_SYSTEM.md`. Итог: причина кривых углов найдена — старый `translateY(-0.5px)` давал полпиксельный сдвиг рамки; для edge-hover закреплено `transform: none !important`, добавлен `isolation: isolate`, а `admin-content-root` получил безопасный глобальный CSS-слой для рабочих surface/card во всех разделах. Кнопки, формы, таблицы, shell/nav, fixed/absolute/sticky overlay и mobile bottom dock исключены.
- Проверено Main Codex после restoration/global hover pass: `npx tsc --noEmit --pretty false` прошел, `npm run quality` прошел. In-app browser подключен к авторизованной вкладке; проверены `/admin`, `/admin/delivery`, `/admin/products`, `/admin/clients`, `/admin/finance`, `/admin/orders` без новых console errors, ARAY panel проверен визуально.
- Main Codex: `/admin` Рабочий стол polish. Статус: `READY_LOCAL first-section pass`. Владение: `app/admin/page.tsx`, `components/admin/dashboard-aray-advice.tsx`, `components/admin/dashboard-metrics.tsx`, `components/admin/dashboard-chart.tsx`. Итог: после согласования с Арманом добавлен блок "Сегодня важно", умные пустые состояния для старта продаж, быстрый пункт `Email` переименован в `Рассылки`, добавлен `ARAY совет дня` с отправкой промпта в единый старый ARAY assistant (`aray:prompt`). Mobile верх стал плотнее: quick actions `58px` на mobile и `64px` на desktop/tablet. Проверено: `npx tsc --noEmit --pretty false`, `npm run quality`, in-app browser `/admin`, ARAY advice click открывает панель "Арай" и отправляет prompt без дубля чата.
- Main Codex: ARAY Speech Core. Статус: `READY_LOCAL code fix / NEEDS_AUDIO_LISTEN`. Владение: `lib/aray-speech.ts`, `lib/tts-clean.ts`, `lib/aray-audio.ts`, `components/store/aray-widget.tsx`, `components/store/aray-chat-host.tsx`, `app/api/ai/chat/route.ts`, `app/api/ai/tts/route.ts`. Итог: добавлен единый normalizer речи, исправлены `рубль/рубля/рублей` и `руб/м³`, старый `ArayWidget` переведен на audio singleton без локальных `Audio()` дублей, browser fallback замедлен до `0.92`, voice-mode теперь передается в `/api/ai/chat`, Cloudflare TTS proxy получает тот же `model_id`/`voice_settings`, что direct ElevenLabs. Проверено: sample cleaner (`1 ₽`, `2 ₽`, `5 ₽`, `9500 руб/м³`), `npx tsc --noEmit --pretty false`, `npm run quality`. Честно: физически голос на колонках/микрофоне еще надо прослушать в браузере; Browser plugin в момент проверки не увидел активную in-app pane.
- Main Codex: ARAY pronunciation pack. Статус: `READY_LOCAL code fix / NEEDS_AUDIO_LISTEN`. Владение: `lib/aray-speech.ts`, `lib/tts-clean.ts`, `lib/aray-audio.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/tts/route.ts`. Итог: расширены единицы и символы для речи: метр/квадратный метр/кубометр/погонный метр, кг/г/литр/тонна/штука/проценты, `№`/`#` как номер, `°C`, `±`, `≈`, больше/меньше/равно, нормальные паузы между размером и ценой. Добавлены живые произношения `ARAY`, `PWA`, `CRM`, `API`, `SEO`, `SMS`, `PDF`, `ГОСТ`, `ООО`, `ИП`, `ИНН`, `НДС`, WhatsApp/Telegram/email. TTS темп снижен до `0.91`, browser fallback до `0.88`, voice-mode prompt просит теплый спокойный тон и паузы. Проверено sample cleaner, `npx tsc --noEmit --pretty false`, `npm run quality`; browser smoke не выполнен, потому что Browser plugin не увидел активную pane.
- Main Codex: ARAY capsule + smart navigation + marketplace terminal pass. Статус: `BETA / READY_LOCAL code pass`. Владение: `components/store/aray-widget.tsx`, `components/store/aray-browser.tsx`, `components/admin/admin-shell.tsx`, `components/admin/admin-search-panel.tsx`, `components/admin/admin-aray-navigation.ts`, `components/store/account-drawer.tsx`, `app/admin/orders/new/page.tsx`, `app/api/ai/chat/route.ts`, `lib/aray-agent.ts`, `lib/aray-audio.ts`, `app/api/ai/tts/route.ts`, `app/globals.css`. Итог: ARAY и меню работают как единая капсула со сдвигом, правые попапы открываются с правой стороны, страницы админки получают короткий slide-переход и touch-swipe, ARAY быстрее открывает очевидные разделы локально без AI-вызова (`Открыл.`), на mobile после быстрого перехода капсула сворачивается. Терминал получил режим `Биржа`: категории -> магазины/исполнители -> товары, компактная sticky-навигация под поиском, правый блок котировок/аналитики, корзина и оформление вынесены в липкий выездной drawer. Голос ускорен: ElevenLabs speed `0.96`, browser fallback `0.94`. Проверено: `npm run lint` прошел с существующими warnings.

### 06.05.2026

Раздел: PWA по сферам, ARAY-футер, биржевая аналитика, роли/аккаунты

- Agent Avicenna: read-only аудит ролей, аккаунтов, клиентов, сегментов и intent-memory. Статус: completed. Владение: без правок. Итог принят Main Codex: уже есть `User`, enum `Role`, `StaffStatus`, статические права в `lib/permissions.ts`, навигационные роли в `components/admin/admin-navigation-registry.ts`, клиенты сейчас через `User.role = USER` + гостевые поля заказов/CRM `Lead`, ARAY память через `ArayMemory/ArayMessage/ArayTokenLog`. Риски записаны: `ADMIN` может потенциально повысить роль до `SUPER_ADMIN` при update staff, права навигации и API местами расходятся, `LeadSource` UI может не совпадать с Prisma enum, ad-hoc migrate route опасен, новые поля делать только additive/nullable после текущего дедлайна.
- Agent Meitner: read-only аудит нижнего футера/мобильного меню. Статус: completed. Владение: без правок. Итог принят Main Codex: ARAY-капсулу держать ближе к `MobileBottomNav` и футеру ПилоРус - нейтральная поверхность, тонкая primary-линия, safe-area, 1-2 складки-аккордеона, без радужных градиентов и без большого рекламного блока внутри строки.
- Main Codex: динамические PWA-сферы и ARAY-футер. Статус: `READY_LOCAL / BROWSER_CHECKED`. Владение: `lib/pwa-install-context.ts`, `lib/pwa-install-events.ts`, `app/api/pwa/manifest/route.ts`, `components/pwa-manifest-sync.tsx`, `components/store/aray-dock.tsx`, `components/admin/admin-pwa-install.tsx`, `app/layout.tsx`, `app/admin/layout.tsx`. Итог: один контекст установки выбирает `ARAY Биржа`, `ARAY Терминал`, `ARAY CRM`, `ARAY Каталог`, `ARAY Заказы`, `ARAY Настройки`, клиентский сайт/каталог; рабочие приложения используют ARAY-глобус, сайтовые - логотип сайта; ARAY-док стал минимальным футером с маленькими кнопками и складками "установить" / "быстро", без перегруза.
- Main Codex: умная аналитика цены. Статус: `READY_LOCAL first slice`. Владение: `lib/market-price-intelligence.ts`, `app/admin/orders/new/page.tsx`. Итог: добавлен единый расчет по единицам и сценариям: м³/шт сейчас, с готовыми слотами м²/кг/услуги/работы; в аналитике показываются розница, оптовой ориентир, услуги и работы без фейковых данных, только из доступных цен каталога и текущего спроса в заказе.
- Main Codex: спрос из интернета и тепловая карта регионов. Статус: `READY_LOCAL честный каркас`. Владение: `lib/market-demand-intelligence.ts`, `app/api/admin/market-demand/route.ts`, `app/admin/orders/new/page.tsx`. Итог: добавлен общий слой под Yandex Wordstat и Google Keyword Planner: провайдеры, лимиты, регионы, язык, список запросов по товарам/категории/виду деятельности и тепловая карта регионов. Без токенов UI показывает "нужен токен" и не рисует выдуманный спрос.

## Память требований Армана 04.05.2026

- Main Codex: ARAY audit + voice stop + dashboard desktop width. Статус: `READY_LOCAL fixes / BETA automation`. Владение: `components/store/aray-widget.tsx`, `app/admin/page.tsx`, `app/globals.css`, audit `app/api/ai/chat/history/route.ts`, `lib/workflow-engine.ts`, `lib/aray-agent.ts`. Итог: подтверждено, что админка монтирует один восстановленный `ArayWidget` через `LazyAdminAray`, история сохраняется в `/api/ai/chat/history` по user/session, но realtime cross-tab sync пока нет. Исправлен стоп озвучки в кнопке сообщения: если ARAY говорит, клик теперь останавливает TTS, а не запускает озвучку заново. Dashboard ограничен до более читабельной ширины на wide/ultrawide, верхняя сетка "Сегодня важно + ARAY совет" больше не разъезжается на широком desktop. Workflow-engine проверен: обычные event workflows есть, delayed workflows пока честно beta без cron/scheduler. Проверено: `npx tsc --noEmit --pretty false`, `npm run quality`.

- [ ] Не терять требования: каждый новый пункт Армана фиксировать здесь или в master roadmap до деплоя.
- [ ] Навигация desktop/mobile/account drawer должна совпадать с roadmap: один порядок, понятные группы, "Дашборд" везде называется "Рабочий стол".
- [ ] ARAY AI должен быть под "Рабочим столом" первым рабочим AI-разделом: чат как ChatGPT, история, голос, агенты, расходы, настройки, безопасные подтверждения действий.
- [ ] У каждого большого раздела должны быть свои настройки: терминальные настройки внутри терминала, CRM настройки внутри CRM, маркетинговые настройки внутри маркетинга; все, что не относится никуда, идет в общие настройки бизнеса.
- [ ] Меню одиночных разделов на rail/mobile должно давать красивую подсказку до клика, чтобы человек понимал назначение.
- [ ] Кнопки "назад" не дублируются, если возврат уже есть в header; кнопка оформления/checkout при повторном нажатии должна работать как умная кнопка назад туда, откуда клиент пришел.
- [ ] Поиск должен знать все живые разделы, товары, заказы, клиентов, настройки, но уважать роли и не показывать лишние данные.
- [ ] PWA/cache: сделать мощную очистку кэша интерфейса без потери авторизации и данных пользователя.
- [ ] Производительность - преимущество проекта: не тащить тяжелые изображения/видео в UI, проверить скорость перед деплоем.
- [x] Брендинг: магазин, клиентская витрина и установка PiloRus остаются с логотипом PiloRus; админка, ARAY AI и ARAY Production используют единый ARAY-слой. 04.05.2026: для admin header/PWA поставлен живой ARAY-orb; ARC/coin и лицо не используются как основной знак помощника.
- [x] Закон 04.05.2026: Арман не повторяет требования в каждом чате. Единый источник правды — `docs/ARAY_ADMIN_START_HERE.md`, roadmap, live-checklist, agency OS, design system и `docs/codex-control-memory-2026-05-01.md`.
- [x] Закон качества: раздел нельзя называть готовым без дизайна, функций, desktop/tablet/mobile/PWA, скорости, навигации, TypeScript, `npm run quality`, проверки сценариев и честного отчета.
- [x] Закон срока: рабочий дедлайн 1 раздел = 1 час. Если раздел больше, Main Codex сам дробит его на подзадачи, ставит агентов на непересекающиеся файлы и принимает результат.
- [x] Закон 06.05.2026: Арман может говорить раздел/скрин/ощущение без технического ТЗ; Codex сам ищет документы, код, логи, mobile/desktop, дизайн-систему, предлагает план, подключает агентов, делает главный кусок, тестирует, обновляет checklist и дает отчет. Рабочий быстрый проход: 15-30 минут; большой раздел делится на несколько проходов.
- [x] Закон 06.05.2026: в каждом плане Codex добавляет свою профессиональную рекомендацию и одну уникальную ARAY/ПилоРус-фичу, чтобы раздел был не копией обычной CRM, а нашим продуктом.
- [x] Закон 06.05.2026: каждый план обязан покрывать архитектуру, закон раздела, дизайн, функции, оптимизацию, автоматизацию/ARAY, выполнение агентами, тесты, проверку логов/устройств и показ результата Арману.
- [x] Закон 06.05.2026: агенты двигаются только по плану с дедлайнами, владением и приемкой Main Codex; Арман получает не сырые агентские заметки, а принятый результат.
- [x] Закон ускорения 1.5x от 06.05.2026: перед крупным разделом запускать `npm run preflight:section -- <section>`; preflight/план 3-5 минут, read-only агент 4-7 минут, маленький patch-agent 8-15 минут, сложный slice 15-25 минут. Скорость и повышенный расход вычислений допустимы, но не отменяют дизайн-систему, mobile/tablet/desktop, логи, роли, TypeScript и `npm run quality`.
- [x] Закон детальной приемки 06.05.2026: пока работа не проверена подробно, ее нельзя сдавать Арману как готовую. Проверять быстрые действия/запросы, браузерный сценарий, mobile/tablet/desktop smoke, TypeScript, `npm run quality`, серверные/браузерные логи и честно писать beta/риски.
- [x] Закон continuity 06.05.2026: каждый новый чат восстанавливает нашу систему работы из `docs/ARAY_ADMIN_START_HERE.md`, live-checklist, roadmap, agency OS, design system и `CLAUDE.md`; Арман не повторяет договоренности заново.
- [x] Закон автоматизации новых разделов 06.05.2026: каждый новый раздел или фича подключается к единым системам через центральные модели и реестры. Раздел добавляется один раз и сразу попадает в навигацию, поиск, ARAY-контекст, mobile/tablet/desktop smoke и quality-gates; ручные дубли запрещены без причины, а Codex молча автоматизирует повторяемые места для будущих разделов.
- [x] Закон Automation Passport 07.05.2026: каждая новая функция, логика и сущность получает паспорт автоматизации: `Entity`, `Actions`, `Permissions`, `Events`, `Relations`, `ARAY`, `One-click`, `Quality`. Если связка пока невозможна, Codex записывает follow-up в checklist, но не оставляет сущность без будущего подключения.
- [x] Требование 05.05.2026: hover-эффект Армана фиксируем как эталон только для карточек/интерактивных surface; кнопки, формы и контролы не переводим на второй glow-эффект.
- [x] Требование 05.05.2026: мобильная фикс-панель ARAY в админке не нужна; на mobile вход в ARAY только через центральную кнопку нижней навигации.
- [x] Требование 05.05.2026: стеклянный фон из нижней мобильной навигации 4AYKA-сниппета применен к `components/admin/admin-mobile-bottom-nav.tsx` / `.admin-mobile-dock`.
- [ ] Требование 05.05.2026: отдельно попробовать стекло на dashboard-карточках. Это эксперимент: если читабельность, скорость или общий стиль проседают, не фиксируем как стандарт.
- [x] Требование 05.05.2026: ARAY edge-hover перенесен по всей админке через безопасный глобальный слой `admin-content-root`: рабочие карточки/контейнеры получают тонкую палитровую рамку, кнопки/формы/таблицы/shell/mobile dock не тронуты. Остается точечная визуальная доводка тех разделов, где конкретная карточка выглядит слишком тихо или слишком активно.
- [x] Требование 05.05.2026: боковое меню и ARAY-капсула должны быть одной системой: стекло, общий цветфон, единые отступы, один главный orb, без второго маленького orb в header чата, hover только там где важно.
- [x] Требование 05.05.2026, обновлено 11.05.2026: ARAY должен быстро открывать релевантные страницы сам, без долгого ответа и без дублирования текста; после действия отвечает коротко, но тепло: `Открыл нужный раздел. Проверь, пожалуйста.` или `Показал рядом. Проверь, пожалуйста.`, не одним холодным словом.
- [x] Требование 11.05.2026: ARAY-навигация должна видеть не только верхние пункты меню, но и служебные рабочие страницы админки (`Подключения ARAY`, `Модули ARAY`, `Лимиты`, `Импорт цен`, `Тарифы доставки`, `Ремонт изображений`). Новые страницы попадают в ARAY через общий navigation registry / route classifications, без ручного хаоса.
- [x] Требование 05.05.2026: мобильный ARAY после быстрого перехода должен свернуться, чтобы человек работал на странице и заново открывал ARAY через нижнюю кнопку.
- [x] Требование 05.05.2026: все попапы кроме ARAY-капсулы открываются справа с slide/listing-эффектом; desktop/touch получает swipe между разделами.
- [x] Закон 07.05.2026: page-slide должен быть лёгким ощущением слоя (`transform + opacity`), будто ARAY открыл/показал экран. Не анимировать тяжело весь контент, таблицы, формы и текстовые блоки; уважать `prefers-reduced-motion`.
- [x] Требование 05.05.2026: режим `Биржа` в терминале: категории как липкая навигация под поиском, магазины/исполнители, товары/услуги, справа аналитика/котировки, корзина и оформление как отдельный выездной drawer.
- [ ] Требование 05.05.2026: умная биржевая аналитика без фейка: история цены, спрос/предложение, продажи, отзывы, рейтинг, просмотры, подписчики, куплено/остатки - только из реальных событий; где событий нет, показывать `нет данных`.
- [ ] Требование 06.05.2026: умная ценовая аналитика по единицам и сценариям: м³, штука, м², кг, услуги, работы/фриланс; отдельные ориентиры розница/опт/услуга/работа; без фейковых котировок, только из каталога, заказов, спроса, истории и подключенных событий.
- [ ] Требование 05.05.2026: ARAY должен после успешных заказов помогать просить отзывы у клиентов и готовить короткие сообщения.
- [ ] Требование 05.05.2026: ARAY Voice Always-On: встроенный микрофон как у Алисы, wake/listen режим, устройство по умолчанию, расписание включения/выключения, режим тишины, напоминание включить разговор/микрофон, отдельные настройки для кассы, ТВ и сенсорных мониторов.
- [ ] Требование 05.05.2026: единая автоматизация пользователей биржи, клиентов, сотрудников и ARAY: роли, рейтинги, релевантные доступы, задачи, уведомления, события и сервисы синхронно связаны.
- [ ] Требование 06.05.2026: ARAY Intent Memory: внутренняя поведенческая аналитика как cookie/события без каши. Собирать структурно: поиск, просмотр, выбор товара, корзина, изменение цены, роль, раздел, клиент, цель действия; ARAY и поиск читают короткий профиль намерения, а не сырой лог.
- [ ] Требование 06.05.2026: Customer Intent/Status слой: новый клиент, постоянный, оптовик, VIP, ищет дешевле, ищет качество, срочно, спящий, проблемный, поставщик, исполнитель, сотрудник; рекомендации показывают что предложить и почему, финальное изменение цен подтверждает человек.
- [ ] Требование 06.05.2026: рекламные аудитории и сегменты: новые, постоянные, опт, качество, бюджет, срочно, спящие, VIP, по категориям интереса, ручные сегменты. В акциях/рассылках выбирать понятную аудиторию без технических терминов.
- [ ] Требование 06.05.2026: роли и действия по ролям: для каждой сферы (биржа, терминал, каталог, CRM, финансы, настройки, маркетинг, доставка) определить кто что видит, что может менять, какие подсказки получает, какие действия требуют подтверждения.
- [ ] Требование 06.05.2026: аккаунты/профили расширить для заполнения: контакты, должность/роль, бизнес-сфера, ценовой тип, интересы, предпочтения качество/скорость/цена, согласия на связь, рекламные сегменты, история обращений и заметки менеджера.
- [ ] Требование 06.05.2026: ARAY Business Network / социально-деловой слой: аккаунт связан с публичным профилем, бизнесами, товарами, услугами, портфолио, историями, лентой, блогом/влогом, отзывами, подписчиками, лайками, просмотрами, монетизацией и настройками публичности. Пользователь сам выбирает, какие данные публиковать и чем делиться.
- [ ] Требование 06.05.2026: автоматизация по популярным нишам и видам бизнеса: для каждой ниши шаблоны ролей, профиля, товаров/услуг, терминала, CRM, рекламы, сайта, ленты, аналитики, аудиторий и ARAY-подсказок. Примеры: пиломатериалы, ресторан, салон, стройка, услуги, фриланс, маркетплейс, доставка, обучение.
- [ ] Требование 06.05.2026: установка любимых приложений должна жить в трех местах: 1) ARAY-футер - быстрый контекст "установить текущий раздел"; 2) аккаунт/личный кабинет - "Мои приложения" со списком установленных/доступных приложений и стартовых страниц; 3) настройки бизнеса/роли - админ включает, какие приложения доступны сотрудникам/клиентам. Не разбрасывать кнопки по всем страницам.
- [ ] Требование 06.05.2026: единый ARAY ID / аккаунт везде: один профиль для покупателя, сотрудника, владельца бизнеса, фрилансера и партнера. Внутри: любимые магазины, свои бизнесы, специалисты, история покупок, расходы, отчеты, задачи, ARAY, приложения, заявки "работать у нас", возможность создать бизнес или стать фрилансером. Роли/видимые блоки меняются по статусу человека.
- [ ] Требование 06.05.2026: умный Dashboard OS: главный экран строится по роли, статусу человека и текущему контексту. Покупателю - покупки, любимые магазины, расходы, рекомендации и ARAY; менеджеру - заказы, клиенты, задачи, следующий лучший шаг; владельцу - деньги, реклама, риски, команда, приложения; фрилансеру/специалисту - заявки, услуги, портфолио, выплаты. Нули заменять полезными действиями и честными пустыми состояниями.
- [ ] Требование 06.05.2026: спрос из интернета для биржи и любых ниш: подключить Yandex Wordstat и Google Keyword Planner как честные источники по товарам, категориям, видам деятельности, регионам, странам и языкам. Сначала кеш, ручное/плановое обновление, дата последней синхронизации и лимиты; без токенов не рисовать выдуманные цифры.
- [ ] Требование 06.05.2026: тепловая карта спроса по регионам: для каждой категории/товара показывать, где выше интерес, какие запросы растут, какие регионы подходят для рекламы и доставки. Поддержать Россию через Wordstat и мировые регионы через Google Ads API; данные использовать для умных фильтров, рекламы и ARAY-подсказок.
- [ ] Требование 06.05.2026: ARAY footer/capsule должна быть фирменным минимальным нижним футером: ARAY-чат по центру, одна-две складки-аккордеона ("установить", "быстро/меню"), safe-area, мягкая анимация, нейтральный фон, тонкая primary-линия, без перегруза, без радуги и без больших рекламных плашек внутри строки.
- [x] Требование 07.05.2026: создан единый мозг проекта `docs/ARAY_PRODUCT_BRAIN_INDEX_2026-05-07.md` и подключен в `docs/ARAY_ADMIN_START_HERE.md`. В нем закреплены: северная звезда продукта, единый язык системы, ARAY ID, биржа как главный вход, сайты-витрины бизнеса, аккаунты, корзины, история, счета, покупки, аналитика, интеграции, вход/регистрация, ARAY-умения и автоматизация развития.
- [ ] Требование 07.05.2026: сверить старые vision/roadmap/checklist файлы с новым Product Brain Index и перенести все полезные идеи по разделам: Терминал, Биржа, CRM, Заказы, Каталог, Акции, Аналитика, Настройки, Аккаунт, ARAY.
- [ ] Требование 07.05.2026: автоматизировать добавление функций по единому языку системы: навигация, роли, поиск, ARAY-контекст, события аналитики, responsive smoke, checklist/roadmap и quality-gate.
- [ ] Требование 07.05.2026: ARAY media/catalog intelligence: принимать фото, скриншоты, GIF, видео, аудио, документы, таблицы, архивы; по фото/бумажному списку/QR/штрих-коду/артикулу готовить черновик товара и каталога; студийные фото/баннеры/видео/буклеты/таблицы генерировать через отдельный подтверждаемый pipeline.
- [ ] Требование 07.05.2026: легкая анимация контента вместо тяжелого листания страниц: единый CSS enter для существующих и будущих экранов, без swipe-навигации между страницами, с `prefers-reduced-motion`.
- [ ] Память 06.05.2026: все, что не успеваем в текущем кодовом заходе, фиксировать здесь до финального отчета. Нельзя оставлять в переписке неперенесенные идеи Армана: PWA по сферам, ARAY-футер, умные цены, роли, статусы клиента, сегменты рекламы, аккаунты и поведенческая память.
- [ ] Требование 05.05.2026: будущий ARAY Constructor: фото товаров/услуг студийного качества по промпту, видео-реклама, логотипы, брендбуки, нейминг, домен, хостинг, сайт и блоки сайта в один клик.
- [ ] Требование 05.05.2026: поиск должен стать сенсорным и умным: релевантные быстрые кнопки, акции/скидки, категории, страницы и действия без клавиатуры.
- [ ] Требование 06.05.2026: поиск должен быть релевантным и контекстным на каждой странице: понимать текущий раздел, показывать уникальные быстрые переходы/фильтры/действия, находить реальные сущности, уважать роли, помогать без клавиатуры на touch-устройствах и не создавать дубли локальных поисков.

## Системная память

- [x] Создать `docs/ARAY_ADMIN_START_HERE.md`.
- [x] Создать `docs/aray-admin-master-roadmap-2026-05-02.md`.
- [x] Создать этот live-checklist.
- [x] Создать `docs/aray-production-agency-os-2026-05-02.md` - как работает наш отдел/агентство.
- [x] Создать `docs/aray-ai-fill-pattern-2026-05-02.md` - единый закон кнопки "Заполнить с Араем".
- [x] Добавить ссылку на новые файлы в `CLAUDE.md`.
- [x] Добавить ссылку на новые файлы в `docs/codex-control-memory-2026-05-01.md`.
- [x] После каждого захода обновлять статусы.

## Arai Fill

Статус: `DESIGNED`

- [x] Зафиксирован единый контракт: один компонент, один API, предпросмотр, ручное сохранение.
- [x] Зафиксированы первые места подключения: категории, товары, медиа, статьи, услуги, акции, рассылки.
- [ ] Реализовать `ArayFillButton`.
- [ ] Реализовать `POST /api/admin/aray/fill`.
- [ ] Подключить к категориям: SEO title/description/slug.
- [ ] Подключить к товарам: описание/SEO/характеристики/alt.

## Дизайн-система

- [x] Записан запрет тратить время на сломанный Codex browser.
- [x] Добавлен общий компонент `AdminModal`.
- [x] `ConfirmDialog` использует `AdminModal`.
- [x] `ConfirmDialog` передает title/description в header `AdminModal`, а кнопки живут в `admin-modal-footer`.
- [x] Добавлены классы `admin-alert`.
- [x] `.admin-modal-footer` flex/mobile-safe.
- [x] Пройти `npm run quality` - прошло 02.05.2026, 04.05.2026 и 05.05.2026.
- [x] Пройти `npx tsc --noEmit` - прошло 02.05.2026, 04.05.2026 и 05.05.2026.
- [x] 05.05.2026: согласован и установлен ARAY edge-hover для админских surface: глобальный слой внутри `admin-content-root` + opt-in `admin-liquid-interactive` / `admin-edge-hover`, 1px по краю, палитровые цвета, без внешней тени; кнопки, формы, таблицы и shell остаются на стандартных паттернах.
- [x] 05.05.2026: admin PWA manifest/icon smoke: `admin-manifest.json` 200, `/api/admin/pwa-icon?s=192` 200 после перевода иконки на `sharp`.
- [ ] Постепенно заменить самодельные warnings на `admin-alert`.
- [ ] Убрать тяжелые желтые кнопки там, где это не primary action.
- [ ] Убрать нечитаемый muted/opacity текст на рабочих экранах.

## Терминал `/admin/orders/new`

Статус: `BETA`

- [x] Терминал выделен как отдельная beta-фича.
- [x] Добавлены настройки терминала и релевантные модули.
- [x] Добавлен cash/cassa layer для открытия кассы.
- [x] Добавлена идея смен, отчетов, устройств, статусов trust.
- [x] Терминал переведен на отдельный каталог `/api/admin/terminal/catalog`: скрытые, неактивные, без фото, без цены и не в наличии больше не должны попадать в кассу.
- [x] Создание заказа дополнительно проверяет позиции на сервере, чтобы снятый с продажи товар нельзя было пробить через старую корзину.
- [x] QR/ссылка больше не показывают фальшиво-рабочие кнопки без подключенного провайдера.
- [x] Закрыты hook warnings по автопереключению единицы товара и рабочему пульту терминала.
- [x] P1: кассовая продажа должна попадать в активную смену: `Payment.shiftId`, итоги смены, журнал операций.
- [x] 06.05.2026: кассовая продажа из терминала передает активную смену на сервер; сервер проверяет `OPEN` смену, записывает `Payment.shiftId`, обновляет `CashShift.salesTotal/expectedCash/orderCount`, создает `ShiftOperation ORDER_CREATED`, а печать/производственный job получают `shiftId/workstationId`.
- [x] 06.05.2026: биржа в терминале очищена от английского/маркетингового шума: `marketplace intelligence`, `API key`, `webhook`, `USB-HID`, `Terminal ID` заменены на понятные русские формулировки, правая область показывает честную сводку и `нет данных` без имитации аналитики.
- [ ] Упростить верх терминала: меньше рядов, понятные режимы.
- [ ] Проверить, что корзина не теряется при переходе к оформлению и назад.
- [ ] Сделать корзину и оформление понятнее на desktop.
- [ ] Проверить mobile flow терминала.
- [ ] Закрытие кассы: отчет, суммы, расхождения, PDF.
- [ ] Подключить статусы уведомлений: QR, оплата, заказ создан/изменен.
- [ ] Вынести монолит `page.tsx` на модули.
- [ ] Связать терминал с задачами производства/сборки.

## Заказы `/admin/orders`

Статус: `TODO`

- [ ] Проверить список заказов: лишние back/header/search, дизайн, mobile.
- [ ] Quick view должен быть на `AdminModal`.
- [ ] Удаление/корзина должны иметь единый modal и понятный результат.
- [ ] Order detail привести к единой системе.
- [ ] Добавить/проверить PDF и трекинг-ссылку.
- [ ] Пагинация или серверные фильтры вместо загрузки всех заказов.
- [ ] Единый сервис смены статуса.
- [ ] Синхронизация `Order.status -> Lead.stage`.
- [x] API создания заказа защищен от скрытых/неактивных/непродаваемых вариантов.

## Задачи `/admin/tasks`

Статус: `TODO`

- [ ] Проверить дизайн канбана.
- [ ] Mobile list mode вместо тяжелого horizontal board.
- [ ] Автоматические задачи из заказов/CRM/доставки.
- [ ] Защита от дублей.
- [ ] Напоминания.
- [ ] Arai может создавать, объяснять и закрывать задачи.
- [ ] Фильтры по исполнителю, дате, заказу.

## Операции / доставка `/admin/delivery`

Статус: `TODO`

- [x] 05.05.2026: исправлено React/Next предупреждение таблицы архива доставки: whitespace text nodes внутри `<table>/<thead>/<tbody>/<tr>` убраны, `/admin/delivery` повторно открыт в браузере без новых console errors.
- [ ] Решить название: доставка или универсальные операции/производство.
- [ ] Разделить доставку, самовывоз, сборку, производство.
- [ ] Touch-friendly режим для склада/кухни.
- [ ] Курьеры, рейсы, маршруты, зоны, слоты.
- [ ] Уведомления ролям.
- [ ] Архив и отчеты.
- [ ] Синхронизация с заказами и задачами.

## Клиенты `/admin/clients`

Статус: `TODO`

- [ ] Быстрый поиск клиента.
- [ ] История заказов и повторный заказ.
- [ ] Сегменты и ценность клиента.
- [ ] Связь с терминалом: автозаполнение по телефону.
- [ ] Mobile.
- [ ] Arai действия по клиенту.

## CRM `/admin/crm`

Статус: `BETA / READY_LOCAL UX pass`

- [x] Лиды, заявки, заказы в одной логике.
- [x] Воронки под сферу бизнеса.
- [x] Настройки CRM внутри CRM.
- [ ] Arai доступ к настройкам CRM.
- [ ] Автоочистка задач при завершении заказа.
- [ ] История и архив.
- [x] Mobile.
- [x] 06.05.2026: быстрый просмотр заказа в CRM переведен из затемняющего центрального попапа в боковую рабочую карточку, карточки заказов стали шире, текст товара не режется, `CUBE` показывается как `м³`.

## CRM автоматизация `/admin/crm/automation`

Статус: `BETA / READY_LOCAL wording pass`

- [x] Роботы и тоннели привести к понятной структуре.
- [x] Документы и отчеты.
- [ ] Scheduler для delayed workflows или честный beta.
- [x] Шаблон "Пиломатериалы".
- [ ] Arai объясняет ошибки и настраивает.

## Аналитика `/admin/analytics`

Статус: `TODO`

- [ ] Переименовать в "Аналитика".
- [ ] Продажи, клиенты, источники, посещения.
- [ ] Яндекс.Метрика, Яндекс.Директ, Google Ads.
- [ ] Автоматические сегменты.
- [ ] Исправить формулы выручки/отмененных заказов.
- [ ] Mobile.
- [ ] Arai объясняет выводы.

## Финансы `/admin/finance`

Статус: `TODO`

- [ ] Личные и бизнес-финансы.
- [ ] Расходы и P&L.
- [ ] Обучение финансовой грамотности.
- [ ] Банки и счета.
- [ ] Mobile wallet UX.
- [ ] Доступы для ролей.

## ARC кошелек

Статус: `TODO`

- [ ] Найти материалы ARC/Arccoin в vision папках.
- [ ] Спроектировать credits/loyalty, не биржевое обещание.
- [ ] Баланс, история, начисления, списания.
- [ ] Виджет на dashboard.
- [ ] Связь с финансами и Arai costs.

## Arai AI `/admin/aray`

Статус: `BETA`

- [x] Сделать страницу-чата как дом ARAY.
- [x] Единая серверная история для страницы ARAY и глобального нижнего чата.
- [x] Один основной нижний ввод на desktop; на mobile отдельный ввод страницы поднят над нижним меню.
- [x] Убрать дубли логотипов внутри самой chat-card: логотип остается в shell/header и основном dock/nav.
- [x] Настройки рядом с чатом называются по-настоящему: "Агенты и качество", "Бюджет и лимиты ARAY", "База знаний".
- [x] Скрыть/убрать лабораторный шум с главного экрана ARAY, если функция не готова.
- [x] Voice/TTS foundation: ElevenLabs/TTS endpoint не потерян, озвучка ответов ARAY идет через единый audio singleton; push-to-talk отправляет текст в тот же чат без отдельного popup.
- [x] 05.05.2026: `/admin/aray` монтирует тот же глобальный ChatHost, что нижний ARAY-чат; события открытия больше не уходят в пустоту и не создают второй чат.
- [x] 05.05.2026: Speech Core fix — единый normalizer для TTS, правильные рубли/единицы, `ArayWidget` использует `lib/aray-audio.ts`, voice-mode реально попадает в chat prompt, proxy получает настройки ElevenLabs.
- [x] 05.05.2026: Pronunciation pack — метры/квадраты/кубы/погонные, кг/г/л/т/шт/проценты, номера, градусы, символы и частые сокращения идут в TTS как нормальная русская речь.
- [ ] Прослушать реальный ElevenLabs/браузерный fallback после фикса: темп, паузы, `руб/м³`, `м²`, `м`, `№`, отсутствие дублей при reopen/close.
- [x] Actions ARAY tools через permissions и подтверждения: 05.05.2026 добавлены role-check + UI confirm cards для mutating tools в едином `/api/ai/chat`.
- [ ] Настоящие агенты и бюджет: не карточки-заглушки, а статусы, лимиты, задачи, журнал и контроль качества.
- [ ] ARAY умеет объяснять и настраивать каждый раздел по базе знаний.

## Управление бизнесом

Статус: `IN_PROGRESS`

- [x] Переименовать группу "Товары" в "Управление бизнесом" в nav/i18n.
- [x] Добавить `/admin/business/settings`.
- [x] Добавить настройки бизнеса в nav structure.
- [x] Подключить `/admin/business/settings` в title shell и permissions.
- [x] Проверить mobile nav после переименования по коду: группа и пункт есть, старого видимого "Товары" в mobile menu не найдено.
- [x] Причесать страницу бизнес-настроек после quality: убрать ложную кнопку автозаполнения и честно отметить Arai/constructor как следующий шаг.
- [ ] Визуально проверить mobile drawer на 390px в браузере или по скрину Армана.
- [ ] Связать с будущим конструктором сайта.

## Товары и редактирование товара

Статус: `TODO`

- [x] 06.05.2026: `/admin/products/audit` приведен к спокойному рабочему дизайну без красно-оранжевой "радуги": нейтральные карточки, локальный спокойный тон, предупреждения точечно, кнопки без ядовитых заливок.
- [ ] Проверить desktop/mobile.
- [ ] Добавить SEO блок.
- [ ] Проверить галерею и статусы публикации.
- [ ] Упростить верхние actions.
- [ ] Arai генерирует описание/SEO/фото.

## Категории

Статус: `IN_PROGRESS`

- [x] Перевод modal категории на `AdminModal` начат.
- [ ] Проверить TypeScript после перехода.
- [ ] Сделать actions понятными, не только маленькие иконки.
- [ ] Mobile layout.
- [ ] SEO/навигация/футер/подкатегории.

## Склад / остатки

Статус: `IN_PROGRESS`

- [x] Modal порога переводится на `AdminModal`.
- [ ] Проверить TypeScript после перехода.
- [ ] Mobile cards/table mode.
- [ ] Автоматическое списание/резерв.
- [ ] Пороги и уведомления.
- [ ] Импорт/экспорт остатков.

## Импорт / экспорт

Статус: `TODO`

- [ ] Упростить Google Sheets шаги.
- [ ] Excel/CSV шаблоны.
- [ ] Arai импорт из таблицы/фото/прайса.
- [ ] Интеграции 1C/CRM/CMS как ready/beta/planned.
- [ ] Перенос сайта по домену как beta/planned с инструкцией.
- [ ] Mobile.

## Медиабиблиотека

Статус: `TODO`

- [ ] Личное и бизнес-медиа.
- [ ] Фото, видео, PDF, документы.
- [ ] Alt text/search.
- [ ] SEO только для бизнес-медиа.
- [ ] Mobile как фото-приложение.
- [ ] Arai подписи/генерация/поиск.

## Статьи и новости

Статус: `TODO`

- [ ] Blog/news UX.
- [ ] Фото/видео/SEO.
- [ ] Только внутренние ссылки.
- [ ] Лайки, просмотры, подписчики.
- [ ] Заявки из статей.
- [ ] Arai генерация и публикация.

## Услуги и заявки

Статус: `TODO`

- [ ] Услуги как Яндекс.Услуги.
- [ ] Заявки как отдельный поток, связанный с CRM.
- [ ] Записи/бронирования.
- [ ] Исполнители.
- [ ] История/просмотры/интерес.
- [ ] Mobile.

## Акции `/admin/promotions`

Статус: `BETA`

- [x] Единый дизайн карточек акций.
- [x] Mobile формы: основные действия и поля приведены к touch-friendly `44px`.
- [ ] Товары в акции: нужен отдельный schema/API для привязки товаров и расчета промо-цен.
- [x] Баннеры и медиа: выбор из медиатеки, загрузка, URL и удаление изображения в карточке.
- [ ] Шаблоны акций ARAY Production: пока зафиксированы как roadmap-блок без нерабочих кнопок.
- [ ] Arai генерация текста/баннера: пока честная beta, нужен общий Arai Fill API.
- [ ] Связь с рассылками и продвижением: есть переходы, автоматической связки еще нет.
- [x] API акций валидирует title/discount/date/active и возвращает понятные 400 вместо Prisma-ошибок.
- [x] Browser QA: `http://127.0.0.1:3100/admin/promotions` открывается без Next overlay и console errors.
- [x] Проверки: targeted lint по файлам акций и `npx tsc --noEmit --pretty false`.

## Продвижение `/admin/promotion`

Статус: `READY_LOCAL`

- [x] Проверить дизайн и mobile: страница переведена на `admin-page-frame admin-page-frame-fluid`, сетки резиновые, actions 44px.
- [x] Яндекс.Директ сценарий: пошаговый ручной запуск, копирование шагов и черновиков.
- [x] Google Ads с региональным предупреждением: канал помечен limited, без ложного обещания автоматического запуска.
- [x] Инструкции для неподключенных сервисов: Яндекс Бизнес, Google Business, 2GIS, внешние кабинеты.
- [x] Автообъявления из каталога: генератор черновиков по товару с UTM для Яндекс/Google/Авито.
- [x] Sitemap/Метрика/SEO/описания: готовность, ручные/безопасные действия и подтверждение перед массовым SEO-действием.
- [x] Arai готовит кампанию и объясняет: есть Arai-prompt и переход в `/admin/aray`.
- [x] Browser QA: `http://127.0.0.1:3100/admin/promotion` открывается без Next overlay и console errors.
- [ ] Внешние рекламные кабинеты не подключены по API; запуск, оплата, модерация и юридические ограничения остаются ручными.

## Отзывы `/admin/reviews`

Статус: `TODO`

- [ ] Разделить отзывы пользователя и отзывы бизнеса.
- [ ] Единый дизайн карточек.
- [ ] Mobile.
- [ ] Внешние платформы.
- [ ] Arai ответы и модерация.
- [ ] Связь с будущей биржей.

## Рассылки `/admin/email`

Статус: `TODO`

- [ ] Переименовать в "Рассылки".
- [ ] Добавить push-уведомления в этот контур.
- [ ] Шаблоны, картинки, видео, скидки.
- [ ] Сегменты и журнал отправки.
- [ ] SMTP настройки понятнее.
- [ ] Arai создает кампанию.
- [ ] Mobile.

## Настройки `/admin/settings`

Статус: `BETA / READY_LOCAL map pass`

- [x] Убрать терминалы из общей свалки, оставить в терминале.
- [ ] Уведомления перенести к рассылкам.
- [x] Команду вынести отдельным разделом.
- [x] Оформление связать с сайтом/витриной.
- [ ] Системные вещи оставить только админам.
- [x] Сделать страницу-карту мегаразделов.
- [x] 06.05.2026: ARAY перенесен внутрь настроек как единый раздел; настройки очищены от каталога/импорта/маркетинга и видимые `SEO`, `Title`, `Email / SMTP`, `AI`, `CacheStorage` заменены на понятные русские подписи.

## База знаний `/admin/help`

Статус: `READY_LOCAL scenario pass`

- [ ] Переименовать в "База знаний" или "Центр обучения".
- [x] Разделы по каждому модулю.
- [x] Поиск и роли.
- [x] Пошаговые инструкции.
- [ ] Вынести данные из компонента.
- [ ] Arai использует базу знаний.
- [x] 06.05.2026: `/admin/help` пересобран из папочного вида в рабочие сценарии для команды, без `API/roadmap/desktop/beta/Email` в видимом тексте.

## Admin launch polish pass - 2026-05-06

Статус: `READY_LOCAL / QUALITY_GREEN`

- [x] Товарный редактор `/admin/products/new` и `/admin/products/[id]`: убрана нижняя фиксированная панель сохранения, действия перенесены внутрь формы сверху и снизу, ARAY-док больше не перекрывает сохранение.
- [x] Заказ detail `/admin/orders/[id]`: редактирование заказа вынесено из header-action в нормальную рабочую область, сверху и снизу есть понятные действия сохранения.
- [x] CRM `/admin/crm`: быстрый просмотр заказа больше не затемняет доску, карточки заказов шире и читаемее, единицы товара показываются по-русски.
- [x] Настройки `/admin/settings`: раздел ARAY собран в один понятный пункт, настройки разложены по мегаразделам и очищены от лишних технических слов.
- [x] Помощь `/admin/help`: принята работа агента Pascal, раздел стал центром рабочих инструкций с поиском, ролями и раскрывающимися сценариями.
- [x] CRM wording/API pass: принята работа агента Darwin, CRM и CRM-автоматизация сверены с checklist/roadmap, видимые технические термины заменены на понятные.
- [x] Performance/logs: `app/opengraph-image.tsx` заменен статичным `app/opengraph-image.png`, `lastActiveAt` в admin layout throttled, API товаров сериализует Decimal перед JSON.
- [x] Автоматизация качества: добавлены `scripts/validate-admin-responsive.js` и `scripts/validate-admin-performance.js`, оба подключены в `npm run quality`.
- [x] Browser smoke: проверены `/admin/crm`, `/admin/products/new`, `/admin/help`, `/admin/settings`, `/admin/delivery/rates`, `/admin/appearance`; свежие page-specific console errors не найдены.
- [x] Проверено: `npx tsc --noEmit --pretty false`, `npm run quality`.

## Section 9 settings/site/staff/health/help audit - 2026-05-06

Статус: `READY_LOCAL / QUALITY_GREEN`

- [x] Проверен role matrix drift: `/admin/staff` больше не показывает устаревший ручной список доступов, матрица и подсказки берут разделы из `lib/permissions`.
- [x] Проверен SMTP false error: quick test в `/admin/settings` теперь понимает `{ ok: true }` от `/api/admin/email` и показывает текст ошибки из API, а не ложный красный статус.
- [x] Проверен site false saved: `/admin/site` сохраняет только свои whitelisted keys, проверяет `res.ok/data.ok/rejected` и показывает ошибку вместо ложного `Сохранено`.
- [x] Проверен health hardcoded checks: `/admin/health` больше не обещает 10/15 зашитых проверок, показывает количество из API, добавляет ARAY-категорию и честно проверяет SMTP verify, а не только наличие host.
- [x] Проверен help text mismatch: `/admin/help` переименован в базу знаний, кнопка `Спросить ARAY` отправляет актуальное событие `aray:prompt`.
- [x] Mobile/buttons pass по `/admin/staff`: основные действия ролей/паролей/блокировки/подтверждения подняты до более безопасных touch targets.
- [x] Проверено: `npx eslint app/admin/settings/page.tsx app/admin/site/page.tsx app/admin/staff/page.tsx app/admin/health/page.tsx app/api/admin/health/route.ts app/admin/help/page.tsx` без ошибок.
- [x] 06.05.2026 перепроверено при старте нового захода: `npx tsc --noEmit --pretty false --incremental false` прошел, старый блокер в `app/api/admin/analytics/route.ts` больше не воспроизводится.

## Финальный контроль перед деплоем

- [x] `npx tsc --noEmit`
- [x] `npm run quality`
- [x] Проверить mobile/tablet/desktop ключевых разделов.
- [x] Обновить checklist.
- [ ] Написать Арману короткий отчет.

## Smart Search v2 / Command Center - 2026-05-06

Статус: `DESIGNED / NEXT_IMPLEMENTATION`

Цель: поиск в админке должен быть не просто строкой, а умным помощником навигации и действий. Он подстраивается под текущую страницу, помогает быстро найти данные и предлагает релевантные следующие шаги.

- [ ] Один источник правды для поиска: убрать дубли между `AdminHeaderSearch`, `AdminSearchPanel` и старым `admin-search.tsx`, вынести общий контракт результатов/скоринга/quick-actions.
- [ ] Релевантность: точные совпадения номера заказа/телефона/артикула выше, затем текущий раздел, затем живые сущности, затем страницы/настройки/действия.
- [ ] Контекст страницы: на `/admin/orders` первыми идут заказы, статусы, доставка, клиенты и создание заказа; на `/admin/products` - товары, категории, склад, фото, импорт цен; на `/admin/clients` - клиент, телефон, история заказов; на marketing - акции/рассылки/отзывы/аналитика.
- [ ] Touch-first: на mobile/tablet показывать быстрые кнопки и фильтры без обязательного ввода с клавиатуры.
- [ ] API: `/api/admin/search` расширить до заказов, товаров, клиентов, задач, настроек/разделов, акций/рассылок/отзывов/уведомлений по ролям. Если данных нет - честно пусто.
- [ ] Производительность: debounce, AbortController против гонок, лимиты, быстрые select-поля, без тяжелых запросов на 1 символ кроме локальных разделов.
- [ ] Логи/QA: проверить dev logs, browser console, mobile drawer, desktop dropdown, `Ctrl+K`, Escape/Enter/Arrow keys, роли STAFF/ADMIN/USER.
- [x] ARAY: поиск и ARAY должны говорить одним языком быстрых действий: если можно открыть раздел сразу - открыть и сказать коротко, что сделано; если нужно действие с риском - через подтверждение. Обновлено 11.05.2026: ARAY получает карту всех видимых `aray` routes и алиасы обычным языком.
- [ ] Уникальная фича для поиска: `ARAY контекстное действие` - после поиска показывать одну умную рекомендацию только по реальному сигналу: открыть найденную сущность, создать задачу, перейти к связанному заказу/клиенту, включить фильтр или спросить ARAY, но без лишнего текста, generic fillers и фейковых данных.

## Navigation OS / ARAY identity - 2026-05-06

Статус: `IN_PROGRESS / LOCAL_QA`

- [x] Вынесен единый реестр админ-навигации в `components/admin/admin-navigation-registry.ts`: desktop rail, mobile dock, popup/menu, поиск и ARAY-контекст должны брать разделы оттуда.
- [x] Добавлен закон ARAY identity: ARAY-навигация использует общий `ArayOrb`/`ArayIcon`, без случайных lucide-иконок; если место перегружено, выбирается спокойная текстовая подпись или отдельное согласование.
- [x] Mobile bottom dock начал строить ролевые вкладки из навигационной модели, чтобы новые разделы не требовали ручных правок меню.
- [x] Quality gate `npm run nav:check` проверяет наличие навигационной модели, route classification, ARAY identity и отсутствие локального дубля `ArayIcon` в виджете.
- [ ] Следующий slice: визуально дополировать ARAY Context Capsule, account drawer и нижнее мобильное меню как единую систему быстрых переходов.

## ARAY sync/voice polish - 2026-05-05

Status: `READY_LOCAL / BETA`

- [x] Added lightweight `lib/aray-sync.ts` events for shared ARAY history refresh and global stop.
- [x] `ArayWidget` now loads chat history through one loader, listens for history updates, emits updates after save/delete, and starts a new chat reliably after clearing history.
- [x] ARAY stop buttons and panel close now stop TTS/mic locally and notify other ARAY instances.
- [x] `ArayChatHost` is connected to history/stop events without history-save loops.
- [x] Dashboard top cards: "Today important" and "ARAY advice" aligned by height/rhythm for wide desktop.
- [x] Checks: `npx tsc --noEmit --pretty false`, `npm run quality`.
- [ ] Full visual browser-use desktop/tablet/mobile/PWA pass remains next: local `/admin` returns HTTP 200, but the active in-app browser pane was not available for automated inspection earlier.

## ARAY single global shell - 2026-05-05

Status: `READY_LOCAL / BETA_VISUAL`

- [x] Added `components/store/aray-global-assistant.tsx` as the single mounted ARAY shell: desktop `ArayDock` + voice-first `ArayWidget`.
- [x] Admin shell now mounts one `LazyAdminArayAssistant` instead of separate dock/widget lazy components.
- [x] Store and cabinet layouts now use the same `ArayGlobalAssistant`; legacy `ArayChatHost` is no longer mounted anywhere.
- [x] Design decision: one quiet glass dock entry, one live-orb assistant panel, mobile entry only through bottom nav ARAY button, no second fixed mobile panel.
- [x] Checks: `npx tsc --noEmit --pretty false`, `npm run quality`.
- [ ] Next visual pass: open ARAY on desktop/mobile and tune panel shadow/border only if it feels heavier than the new admin hover language.

## ARAY orb and panel polish - 2026-05-05

Status: `READY_LOCAL / BETA_VISUAL`

- [x] Rebuilt `components/shared/aray-orb.tsx` from rotating abstract picture into a living neural globe: warm core, cool network paths, signal nodes, orbit impulses, state ring, reduced-motion support.
- [x] Added a `thinking` visual state for ARAY loading; listening/speaking/idle remain separate.
- [x] Reused the same orb identity for chat avatars through `ArayIcon`, so header, message bubbles, dock, and main panel no longer show competing ARAY faces.
- [x] Added subtle internal ARAY signature path and double state ring so the orb reads as a branded future-symbol, not a random energy sphere.
- [x] Improved small-size readability: compact orbs get stronger signature contrast, brighter core/ring, and slightly larger chat/header avatar sizes.
- [x] Removed the static white glass stripe; replaced it with soft color-reactive internal light so the orb no longer feels like a flat image under a dead highlight.
- [x] Added a gentle orb-only hover glow that strengthens the selected accent light without applying the admin card hover effect to the whole chat panel.
- [x] Added a living inner light sweep: the highlight now slowly orbits inside the sphere and speeds up subtly on hover.
- [x] Hover now also samples platform `--primary` for the ARAY signature/network glow, so the orb responds to the selected color theme without recoloring the whole identity.
- [x] Replaced the remaining muddy/noisy interior feeling with natural neural-light flows under the visible network, so dark areas read as depth instead of low-quality noise.
- [x] Strengthened the inner A signature into a bolder energy mark and added a tiny ARAY micro-word for medium/large orb sizes only.
- [x] Replaced pure black interior depth with clean chat-colored cosmic depth and sparse light points, keeping the orb premium instead of noisy.
- [x] Added a natural animated contour: only a thin energy flow moves around the orb edge, with platform-color hover support and faster state-aware motion.
- [x] Darkened ARAY panel idle glass and reduced the wide idle glow behind the orb so the center reads as deep space instead of a pale screen.
- [x] Reduced duplicate-ring feeling: idle now has one main moving contour, while the state ring stays quiet until listening/speaking/thinking.
- [x] Upgraded the warm core from a flat sun spot into a layered plasma light with rotating internal caustics, matching the neural side quality better.
- [x] Softened the warm core again after visual review so it reads less like a hard oval/egg and more like diffused living light.
- [x] Reduced the last bright panel wash by a few percent to preserve the deep-space feeling around ARAY.
- [x] Added an Apple-style moving specular glint on the orb rim, while dimming the outer contour so it reads as globe glass instead of double rings.
- [x] Removed the extra rotating outer contour completely; ARAY now uses one clean globe rim with a cosmic hover-style moving light sweep.
- [x] Gave the single globe rim a little more specular shine and added a subtle dark-space vignette inside the orb for cleaner depth.
- [x] Locked the current ARAY orb as the visual baseline/etalon: clean globe rim, cosmic inner depth, readable ARAY mark, and one premium moving edge-light.
- [x] Light theme hover now suppresses the broad turquoise outer shadow so the orb stays clean on white backgrounds while keeping the rim glint.
- [x] Tightened rim density so the moving light stays on the exact globe edge instead of spreading into a fuzzy extra outline.
- [x] Shifted the remaining black interior depth toward deep cosmic navy/blue so light theme reads like space instead of a black spot.
- [x] Tuned desktop/mobile ARAY panel glass and dock glass toward calmer premium depth with lighter shadows.
- [x] Checks: `npx tsc --noEmit --pretty false`, `npm run quality`, HTTP smoke `/` and `/admin` 200.
- [ ] Browser visual inspection remains manual/next because the in-app browser runtime did not expose an active pane during this pass.
- [ ] Talking human avatar is a future optional "consultant mode"; do not replace the orb as the primary ARAY identity until a real lip-sync/rights/performance path is chosen.

## ARAY chat launch polish - 2026-05-05

Status: `READY_LOCAL / BETA_VISUAL`

- [x] Desktop admin ARAY panel now opens on the left near the admin rail; store and cabinet keep the regular right-side assistant placement.
- [x] ARAY panel close/new chat/global stop now stops both TTS and microphone, so ARAY no longer keeps listening after close/reset.
- [x] Added visible stop affordance while ARAY is listening, not only while speaking.
- [x] `aray:voice` now starts listening when a conversation already exists; first-open greeting still handles the initial listen flow.
- [x] Auto-listen after greeting/answer now waits a little longer and checks that the panel is still open before starting the microphone.
- [x] Added first translation foundation: voice-mode prompt tells ARAY to answer with the translated phrase first, and browser TTS fallback receives the inferred speech language (`zh-CN`, `ja-JP`, `ko-KR`, `ar-SA`, `en-US`, `ru-RU`, etc.).
- [x] Checks after code changes: `npx tsc --noEmit --pretty false`, `npm run quality`.
- [ ] Manual browser/audio pass remains required: real ElevenLabs voice, browser fallback language, mobile mic permission, tablet layout, and admin-left panel comfort.

## ARAY next-generation roadmap - 2026-05-05

Status: `DESIGNED / NOT_IMPLEMENTED`

- [ ] Left-side admin chat work mode: persistent assistant workspace option, not only floating panel.
- [ ] Live voice translator mode: choose source/target languages, two-person conversation flow, speak translated line aloud, keep transcript.
- [ ] Multimodal input: photo, paper/document OCR, PDF/image text extraction, product/post draft generation from uploaded material.
- [ ] Business capture from conversation: create lead, reminder, task, deal/order draft from chat transcript with confirmation.
- [ ] Social/text helper: write posts, translate messages, prepare customer replies, and save useful drafts.
- [ ] Safety rule: any CRM/order/task/catalog mutation must remain confirmation-first.

## ARAY capsule, tasks and automation pass - 2026-05-05

Status: `READY_LOCAL / BETA_PRODUCT`

- [x] ARAY quick navigation no longer closes the capsule automatically on internal page transitions. User closes ARAY manually; side menu can still collapse separately.
- [x] Instant admin router now treats "биржа / биржа пиломатериалов / маркет" as Terminal MARKET mode and opens `/admin/orders/new?mode=market`.
- [x] Terminal page reads `?mode=market|order|register` and switches the right workspace without making ARAY explain the page.
- [x] Quick actions are capped: 3 smart prompt buttons + up to 3 nearby page buttons, so the capsule does not overload.
- [x] Tasks board now auto-refreshes every 12 seconds and on focus/visibility, so tasks created by ARAY after confirmation appear without manual reload.
- [x] Tasks board got search/filter controls and status chips for overdue, urgent, in work, unassigned and order-linked tasks.
- [x] `create_task` can link to an order by `orderId` or `orderNumber`, stores universal source tags for non-order entities, and attempts assignee push notification when a push subscription exists.
- [x] ARAY prompt now explicitly covers task source linking, user-to-user message transfer, translator mode, smart notification routing, voice/mic consent and touch-phone UX.
- [x] Mobile ARAY now behaves more like a phone sheet: drag handle closes by swipe down, backdrop tap no longer accidentally hides ARAY, tablet/mobile width is capped like a handset, and the input area shows only 3 contextual quick chips.
- [x] `TaskRelation` first slice: universal schema/API added, tasks can relate to order/product/client and ARAY `create_task` now writes real relation rows instead of only source tags.
- [ ] `TaskRelation` follow-up: embed related tasks on lead, review, category, supplier/business and marketplace object pages after those entity pages have stable screens.
- [x] Notification center v2 first slice: schema/API/UI delivery log, канал, статус, источник, сегмент, связь с сущностью и ARAY/manual push audit.
- [ ] Notification center v2 follow-up: true inbox, inbound channel accounts, reminders, repeats, read/archive, "ARAY сообщи пользователю" flow and per-user preferences.
- [ ] Translator mode UI: two-person conversation, language pair, voice schedule, transcript/archive, consent prompts.
- [ ] ARAY chat phone UX: hidden keyboard/T9 panel, chat archive/history sorting, hover subtitles above chat, unified page-slide animation.
- [ ] Responsive pass: desktop/tablet/mobile elastic screens for terminal, marketplace, tasks and ARAY capsule.

## TaskRelation first slice - 2026-05-07

Status: `BETA / TYPECHECK_GREEN`

- [x] Added `TaskRelation` model and `TaskRelationEntityType` enum for order, lead, support incident, review, product, client, supplier, category, marketplace listing, business and user.
- [x] Added shared relation normalizer in `lib/task-relations.ts`, including aliases from ARAY wording (`order`, `lead`, `request`, `product`, `client`, etc.).
- [x] `/api/admin/tasks` can create relation rows and filter tasks by `entityType/entityId`; old `orderId` filtering remains compatible.
- [x] `/api/admin/tasks/[id]` can replace task relations safely and keeps legacy `orderId` in sync for order tasks.
- [x] Tasks board shows relation badges, searches by relation label and opens `/admin/tasks?entityType=...&entityId=...` as a scoped task stream.
- [x] Added shared `RelatedTasksPanel` for source pages: create a task from the entity, see open/total counts, refresh and open scoped board.
- [x] Embedded related tasks on order detail, product edit and expanded client card.
- [x] ARAY `create_task` writes real relation rows for order/source entity links while keeping confirmation-first mutation safety.
- [x] Checks so far: `node scripts/next-build-safe.js --command db:push` and `npx tsc --noEmit --pretty false`.
- [ ] Browser visual smoke still needed for `/admin/orders/[id]`, `/admin/products/[id]`, `/admin/clients` and `/admin/tasks` after full quality gate.
- [ ] Next TaskRelation pass: lead detail/drawer, reviews, categories, support incident and marketplace/business entities.

## Notification center v2 first slice - 2026-05-07

Status: `BETA / QUALITY_GREEN`

- [x] Added `NotificationCenterEvent` schema with direction, channel, status, source, recipient, delivery counters, entity link, metadata and read/archive timestamps.
- [x] Added `/api/admin/notifications/center` for recent notification journal + summary counters.
- [x] Manual `/api/push/send` now records delivery results into the notification center and returns `notificationEventId`.
- [x] ARAY `send_push_notification` now writes the same delivery log, including failed VAPID configuration and cleaned dead subscriptions.
- [x] Push subscribers/debug/cleanup API now uses `canAccess(role, "notifications")`, matching the admin permission model instead of admin-only drift.
- [x] `/admin/notifications` opens with a new `Центр` tab showing totals, delivery status, channel, source, segment, linked entity and errors.
- [x] Checks: `node scripts/next-build-safe.js --command db:push`, `npx tsc --noEmit --pretty false`, `npm run quality`.
- [x] Header notifications: desktop admin header now has a calm right-side bell popover connected to the unified notification feed/count source; mobile bottom bell uses the same feed source.
- [ ] Next Notification pass: incoming Telegram/email/VK inbox model, channel accounts, reminder/repeat scheduler, read/archive actions and ARAY handoff cards.

## Notification header + role settings - 2026-05-07

Status: `BETA / QUALITY_GREEN`

- [x] Added `NotificationRolePreference` and `NotificationRoleSchedule` schema for role/event policies, channels and quiet hours.
- [x] Added server policy layer: event defaults, role labels, channel validation, quiet-hours evaluation and unified admin feed.
- [x] Added `/api/admin/notifications/feed` for header/mobile notification items and `/api/admin/notifications/settings` for role settings.
- [x] `/api/admin/notifications/count` now uses the same policy-aware source instead of separate hardcoded counters.
- [x] Desktop admin header has a right-side notification popover with recent signals, count badge, refresh and center link where role permits.
- [x] Mobile bottom `Новое` opens the same feed source, so count/items follow the role settings.
- [x] `/admin/notifications` center tab now includes settings: event matrix by role, channels, quiet hours, weekend mute.
- [x] Checks: `node scripts/next-build-safe.js --command db:push`, `npx tsc --noEmit --pretty false`, `npm run quality`, HTTP smoke `/admin/notifications` = 307 unauth, `/api/admin/notifications/feed` = 403 unauth, `/api/admin/notifications/settings` = 403 unauth.
- [x] Hotfix after screenshot: restarted dev server after Prisma schema generation, `/api/admin/notifications/feed?take=8` now returns 200 in authenticated runtime logs; feed route has safe degraded fallback so the header bell does not show a hard red failure on transient runtime errors.
- [x] Inbox action slice: `/api/admin/notifications/center` supports `PATCH` actions `read`, `unread`, `archive`; center UI shows read state and action buttons without overwriting delivery status on read.
- [x] Checks after inbox action slice: `npx tsc --noEmit --pretty false`, `npm run quality`, unauth `/api/admin/notifications/center` remains 403.
- [ ] Next pass: browser visual QA with an authenticated admin session, read/archive/unread actions, per-user preferences, ARAY "prepare/contact user" handoff, inbound inbox and channel accounts.

## ARAY motion and atmosphere notes - 2026-05-07

Status: `DESIGNED / SAFE_LIMITS`

- [x] Decision: do not restore old heavy neural backgrounds as a background engine. They looked rich, but added complexity, performance risk and readability pressure.
- [ ] Safe experiment: one optional `ARAY atmosphere` layer for admin dashboard/shell - lightweight CSS/static texture/soft glow only, no heavy filter loops, no canvas dependency, no impact on forms/tables.
- [ ] Motion law: route/page entry may use a very short `transform + opacity` transition so it feels like ARAY opened the layer; do not animate every inner card/table/form on every route.
- [ ] Unified slide law: panels/popups/account/menu/cart/browser use the same right/bottom slide language, with `prefers-reduced-motion` and no expensive blur/scale on text-heavy content.
- [ ] ARAY Guided Mode: when a page/tool opens for the first time or user asks for help, ARAY may softly highlight the next control with existing edge-hover/spotlight language and give one short hint. Must be dismissible, role-aware, `prefers-reduced-motion` friendly, no forced full-screen tour and no constant pulsing.

## New-chat handoff - 2026-05-06

Status: `HANDOFF_READY / NEXT_P0`

Арман попросил обновить память и чек-листы, чтобы открыть новый чат и продолжить быстро. Новый чат должен не начинать заново, а продолжить с этого порядка.

### Что уже сделано и не трогать без причины

- [x] ARAY capsule/menu visual baseline выбран: капсула, орб, стекло, спокойный hover, без разноцветной дискотеки.
- [x] ARAY не закрывается сам при переходах по страницам; закрывает только пользователь.
- [x] Быстрые действия ограничены: 3 умные prompt-кнопки + до 3 page-переходов.
- [x] Команды `заказы`, `задачи`, `биржа`, `биржа пиломатериалов` должны идти через быстрый локальный route, если есть понятный раздел.
- [x] `/admin/orders/new?mode=market` открывает терминал в режиме биржи/market.
- [x] Tasks board auto-refresh/search/filter/status chips подключены.
- [x] `create_task` умеет связать задачу с orderId/orderNumber и source-тегами, а также пытается отправить push исполнителю при наличии подписки.
- [x] Mobile ARAY phone sheet начат: drag handle, no accidental backdrop close, capped phone-like width, input quick chips.
- [x] ARAY prompt обновлен: короткие ответы, умная навигация, задачи, уведомления, переводчик, голос/mic consent, touch UX.

### P0 следующий проход

- [x] `TaskRelation` schema/API/UI first slice: нормальная связь задач с order/product/client, scoped tasks filter, shared related-tasks panel, ARAY create_task relation rows.
- [ ] `TaskRelation` entity coverage: lead, request/ticket, review, supplier, category, marketplace/business pages still need their own related task blocks.
- [x] Notification center v2 first slice: outbox/delivery log, recipient/segment, role access alignment, channel/source/status and ARAY/manual push audit.
- [x] Notification center v2 follow-up first slice: desktop right popover, unified mobile/header feed, role/event settings, channels and quiet-hours schedules.
- [ ] Notification center v2 next slice: true inbox, channel accounts, repeats, unread/read/archive and ARAY handoff message.
- [ ] ARAY phone UX v2: hidden keyboard/T9, chat archive/history sorting, pinned dialogs, hover-subtitle tips above chat, better message actions menu.
- [ ] Unified slide system: page transitions, right popups, account/menu panels, cart/checkout, browser panel and marketplace panels follow one phone-like slide language.
- [ ] ARAY atmosphere safe experiment: optional light branded background layer only; do not restore old heavy neural background engine without a measured reason.
- [ ] ARAY Guided Mode: page/tool opening can show one gentle hover/spotlight hint and a short ARAY instruction for the next click, only by context/first-run/user request.
- [ ] ARAY Companion 24/7: consent-based personal assistant mode with reminders, tasks, schedule, finance habits, analytics, fitness/wellbeing goals and gentle contact rules; must use notification settings, quiet hours, memory boundaries, audit log and confirmations for anything sent to people.
- [ ] Voice/mic settings: device choice, schedule, ARAY working hours, auto-listen reminder, wake/listen consent, per-user defaults.
- [ ] Manual browser/audio QA: ElevenLabs latency, browser SpeechRecognition, mic permissions, mobile keyboard, tablet layout.

### P1 после P0

- [ ] Marketplace/terminal polish: cart as sticky/right slide popup like PiloRus checkout; when cart hidden, right side shows readable analytics/quotes/charts.
- [ ] Marketplace data model: categories -> shops/performers -> products/services, with real events for views, followers, purchases, stock, rating, reviews, price history.
- [ ] Search UX: smarter relevance, touch-first quick results, no duplicate controls, space for promotions/discounts.
- [ ] Translator and conversation handoff UI: two-person live mode, transcript, archive, consent, message-to-user flow.
- [ ] ARAY builder future: product photos, ads/video, logo, brandbook, name, domain, hosting, site creation in one guided flow.
- [ ] Full responsive rubber pass for desktop/tablet/mobile/touch/TV/cash screen.

### Агентское разделение

- QA/koсяки: отдельный explorer/QA agent смотрит баги, риски, regressions, mobile/desktop issues.
- Product architecture: отдельный agent проверяет, не потеряны ли уведомления, задачи, роли, marketplace, voice, translator.
- Implementation: Main Codex принимает решение, чинит, проверяет, обновляет checklist и отвечает Арману. Агенты не заменяют финальную ответственность Main Codex.

### Definition of done for each next pass

- [ ] Код/UX сделан.
- [ ] Mobile/tablet/desktop просмотрены хотя бы smoke-level.
- [ ] `npm run quality` прошёл.
- [ ] Checklist обновлён.
- [ ] Арман получил короткий человеческий отчёт: что работает, где смотреть, что beta, следующий шаг.

## Store/cabinet shell UX/perf pass - 2026-05-06

Status: `READY_LOCAL / QUALITY_GREEN`

- [x] Store and cabinet layouts now share cached shell data through `getStoreShellData()`: menu categories, footer categories, site settings, phones, ARAY flag, dynamic types and sizes are loaded once per 60s cache window instead of duplicated in both layouts.
- [x] Account drawer logout no longer leaves stale protected UI: it closes the drawer, signs out without a full document redirect, sends `/admin` and `/cabinet` users to `/`, then refreshes the router.
- [x] Push prompts now have one policy: the PWA install banner no longer asks for push, and the global push prompt stays hidden on explicit notification settings pages.
- [x] Account drawer active states were checked and tightened: trailing slash is normalized and the profile card shows active state on `/cabinet/profile`.
- [x] Mobile bottom nav and tablet side rail now show real active states for search drawer, cart drawer/routes, account drawer/cabinet routes and wishlist.
- [x] Checks: touched-file ESLint passed; `git diff --check` passed; HTTP smoke on local dev server `http://localhost:3100` returned `/` 200, `/catalog` 200, `/cart` 200, `/cabinet` 307 -> `/login`.
- [x] 06.05.2026 startup recheck: full TypeScript now passes; old `app/api/admin/analytics/route.ts` blocker is no longer current.
- [ ] Manual visual pass still needed for real mobile/tablet screenshots: account drawer, logout, push banner timing, bottom nav and tablet rail.

## Admin Navigation OS - Slice 2 ARAY - 2026-05-06

Status: `READY_LOCAL / QUALITY_GREEN`

- [x] Shared ARAY event helper added: open, voice, close and prompt actions now have one client contract instead of scattered `aray:open` dispatches.
- [x] Desktop ARAY dock, admin shell and left capsule use the same helper; double open dispatch was removed.
- [x] Mobile menu uses the unified navigation/search context and generated section map; generic ARAY action card was later removed because it was not data-backed.
- [x] Account drawer staff navigation sections are generated from `admin-navigation-registry.ts`; generic ARAY contextual card was later removed because it duplicated menu noise.
- [x] Mobile role tabs now prefer registry `mobilePriority` / `mobileDock` data, so future sections join the dock without hardcoded role maps first.
- [x] ARAY budget moved into the ARAY navigation group and the capsule got a small text `AI` cue instead of another random icon.
- [x] Final checks for this slice: `npm run nav:check`, TypeScript, `npm run quality`, `npm run build`, clean fresh browser logs and server logs.
- [x] Browser smoke on `http://localhost:3000/admin?qa=aray-slice-2-fresh`: mobile menu shows contextual ARAY action, account drawer shows generated registry sections including `Сценарии` and `Настройки ARAY`, ARAY prompt opens and sends the current next-step request.
- [ ] Wider desktop/tablet visual pass remains useful after this slice because the in-app browser viewport was mobile-width during automated inspection; CSS/TS/build gates for desktop rail passed.

## Admin Navigation OS - Slice 3 Navigation Map - 2026-05-06

Status: `READY_LOCAL / QUALITY_GREEN`

- [x] Semantic navigation order rebuilt: Рабочий стол -> Продажи -> Магазин -> Маркетинг -> Финансы -> ARAY -> Настройки -> Помощь.
- [x] `/admin` moved to `main`, so Рабочий стол no longer lives inside Продажи.
- [x] `/admin/business/settings`, `/admin/site` and `/admin/appearance` moved from Магазин to Настройки.
- [x] `/admin/aray/costs` lives only in ARAY sections and quick links, not in generic settings/finance.
- [x] Desktop capsule panel is compact for small groups, so ARAY/help do not open as a tall empty drawer.
- [x] Mobile menu now uses the same section builder as desktop capsule and does not hide long groups behind a fake "more through search" shortcut.
- [x] Account drawer legacy manual staff lists were removed; staff navigation comes from `buildAdminNavigationGroups()`.
- [x] `npm run nav:check` now enforces Navigation OS placement, section ownership, no duplicate hrefs, no old quick-link mixing and no manual staff lists in account drawer.
- [x] Final local QA for this slice: `npm run nav:check`, TypeScript, `npm run quality`, `npm run build`, HTTP 200, clean fresh browser console after reload and clean server log.
- [x] Browser smoke on `http://localhost:3000/admin?qa=nav-slice-3`: mobile/tablet menu shows Рабочий стол, Продажи, Магазин, Финансы, ARAY AI, Настройки; Settings contains business/site/design/terminal/system without ARAY; ARAY contains ARAY AI/agents/Настройки ARAY without generic settings.

## Admin UI Integrity Lessons - 2026-05-06

Status: `IN_PROGRESS / GUARD_ADDED`

- [x] Урок зафиксирован: нельзя "улучшать" капсулу, ORB, hover или модалки без сравнения с уже понравившимся baseline.
- [x] Левая navigation capsule возвращена к стабильной высокой геометрии: короткие группы не включают compact mode.
- [x] ARAY rail ORB зафиксирован как `2.5rem` без scale-hover; убран лишний hover-контур вокруг ORB.
- [x] ARAY rail ORB cleaned again after visual note: removed the tiny `AI` badge/cue from the orb because the logo must stay pure at small size.
- [x] Popup-навигация возвращена к спокойному hover: `.admin-nav-panel-item` больше не использует conic/neon pseudo-elements.
- [x] `/admin/workflows` переименован в "Сценарии продаж", переведен на `AdminModal`, emoji заменены на lucide-чипы, seed sanitizes visible emoji before writing workflows.
- [x] Добавлен `scripts/validate-admin-ui-integrity.js` и подключен в `npm run quality`: guard проверяет capsule/ORB/nav hover/settings hub/workflows modal и блокирует новые manual overlay, native dialogs и visible emoji в admin UI.
- [x] Generic ARAY fillers removed from search quick actions, mobile menu, account drawer, dashboard advice and ARAY chips: no default `ARAY следующий шаг`, `Что срочно?`, `Оживить продажи`, `Проверить риски` without real context.
- [x] UI integrity guard now blocks those generic ARAY fillers in the source files that feed admin search, ARAY chips, dashboard advice, mobile menu and account drawer.
- [x] Balanced depth law added: light-theme shadows on left rail, navigation drawer, ARAY dock and ARAY panel were reduced so shadow supports hierarchy instead of becoming a dark/glow stain.
- [x] UI integrity guard now blocks the old over-strong shadow snippets from returning in navigation/ARAY surfaces.
- [x] Safe build automation added for Windows Prisma DLL locks: `npm run build` and `npm run build:ci` now route through `scripts/next-build-safe.js`, which releases local Next processes before Prisma/Next build and restarts the server after local builds.
- [x] UI integrity guard now checks that safe-build automation stays wired in `package.json` and the stopper script remains present.
- [ ] Legacy debt по старым попапам и emoji остается в allowlist: CRM, media, photo editor/search, posts, services, products, reviews, tasks, mobile settings. Чистить отдельными короткими проходами, не добавляя новых исключений без решения Армана.
- [ ] Wide desktop rail visual remains worth one human look on a wide monitor, because the active in-app browser viewport during this pass was mobile/tablet width; build/CSS/nav gates passed and compact desktop rail code is included.

## ARAY Social Business Platform Memory - 2026-05-07

Status: `RECORDED / CORE_SYNC_FIRST`

Главная формулировка: ARAY строится не только как админка магазина, а как единая social/business платформа. Люди, бизнесы, специалисты, услуги, контент, почты, мессенджеры, внешние кабинеты и рекламные аудитории связаны одним профилем, задачами, событиями и безопасными подтверждениями.

Поправка 07.05.2026: конструктор бизнеса рано ставить в P0. Сначала закрываем фундамент: синхронизации, ARAY core, биржа, аналитика, ключи, голос/разрешения, SEO/индексация, Direct own-account, единый inbox, бухгалтерия/налоги/ЭДО. Конструктор возвращается после этого как P2/future.

### P0 - без этого платформа будет неполной

- [x] Создана память: `docs/ARAY_PLATFORM_MEMORY_2026-05-07.md`.
- [x] В `.env.example` и `npm run aray:keys` добавлены будущие каналы: Telegram, VK, email/IMAP, WhatsApp Business, телефония, SMS, Yandex Direct own-account OAuth.
- [x] Добавлена матрица подключений ARAY: ключи, голос, SEO, реклама, inbox, бухгалтерия и внешние сервисы без показа секретов.
- [ ] Голос и разрешения: микрофон, устройства, график работы, тихие часы, кнопка стоп, журнал доступа, понятное объяснение ограничений браузера/PWA/нативной оболочки.
- [ ] SEO и индексация: Яндекс Вебмастер/Метрика, Google Search Console/Analytics/Business Profile, sitemap, robots, метатеги, понятные задачи для обычного владельца.
- [ ] Единый inbox data model: `Conversation`, `Message`, `ChannelAccount`, `MessageAttachment`, `ConversationActionLog`.
- [ ] Входящие Telegram/VK/Email должны превращаться в обращение, лид, задачу или связь с заказом; канал хранится отдельно от смысла обращения.
- [ ] Единая модель профиля: человек может быть покупателем, владельцем бизнеса, специалистом, фрилансером, блогером, сотрудником или партнером.
- [ ] Marketplace data model расширить до: бизнесы рядом, люди рядом, специалисты/фрилансеры/блогеры рядом, товары и услуги.
- [x] `TaskRelation` first slice связал задачи с клиентом, товаром и заказом через универсальную модель.
- [ ] `TaskRelation` должен дойти до бизнеса, услуги, специалиста, заявки, отзыва и marketplace-объекта на их стабильных страницах.
- [ ] Рекламная безопасность: аудитории и кампании только черновик + подтверждение владельца; деньги из кабинета бизнеса; токены зашифрованы.
- [ ] Yandex Direct own-account OAuth: пользователь нажимает "Подключить свой Директ", разрешает доступ, ARAY готовит черновики и не запускает бюджет без подтверждения.
- [ ] Бухгалтерия/налоги/ЭДО: СБИС, Контур/Диадок/Эльба, 1С, банки, расходы ARAY и напоминания оплат; юридически важные действия только после подтверждения.
- [ ] Provider/account matrix: Gmail/Workspace, Яндекс, VK, Google, Telegram, WhatsApp, телефония без смешивания личного и бизнес-доступа.
- [ ] Единые аккаунты и роли: один login, много ролей и бизнесов; доступы scoped по бизнесу, каналу, роли и действию.

### P1 - следующий слой пользы

- [ ] "Рядом" как отдельный сценарий: поиск и рекомендации по географии для бизнесов, людей, специалистов, услуг, магазинов и исполнителей.
- [ ] Сервисы бизнесов: товары, услуги, заявки, расписание/исполнители, отзывы, публикации, аудитории.
- [ ] VK/Yandex/Google sync: вход, кабинеты, группы, сообщения, отзывы, Метрика/Analytics/Search Console, Business/Maps/Profile.
- [ ] Рекламные аудитории из поведения: просмотры, поиск, корзина, заказы, отзывы, UTM, регион, интерес к цене/качеству/срочности.
- [ ] Публичный social/business профиль: био, ссылки, портфолио, товары, услуги, публикации, подписчики, лайки, просмотры.
- [ ] WhatsApp Business, телефония, SMS, сайт-чат ARAY и Avito/маркетплейсы как дополнительные каналы inbox; без серых интеграций и без отправки от имени бизнеса без прав канала.
- [ ] Конструктор рекламы: ARAY готовит аудиторию, ключи, минус-слова, UTM, тексты, бюджет и посадочную страницу; запуск только после явного подтверждения.

### P2 - после проверки API и пользы

- [ ] Контент-синхронизация: Дзен, YouTube, VK Clips/Видео, Google Business Profile, Yandex Business/Maps, Market.
- [ ] Блогеры и монетизация: публикации, сторис, аудитория, промо-размещения, партнерства с бизнесами.
- [ ] Умная лента/рекомендации: любимые магазины, специалисты, категории, услуги рядом, повторные покупки.
- [ ] ARAY builder future: собрать услугу, товар, пост, рекламу, сайт, профиль, каналы, аналитику и брендбук из одного guided flow.
- [ ] `aray.online` domain/constructor hosting: домен куплен в Beget; будущие сайты участников биржи идут как `{business-slug}.aray.online` через wildcard routing + wildcard SSL, без ручного поддомена на каждый сайт; собственные домены подключаются отдельным premium/pro flow.

## ARAY Knowledge OS / One-Click Automation - 2026-05-07

Status: `IN_PROGRESS / ARCHITECTURE_LOCKED`

- [x] В Product Brain записан главный принцип: любой новый раздел, кнопка, товар, действие, роль, событие, файл и внешний источник должны попадать в `Entity Index`, `Action Registry`, `Permission Map`, `Event Stream`, `Source Ledger`, `Tool Registry`.
- [x] В Product Brain записан закон интернет-поиска: сначала внутренняя память, потом Yandex/Google с источником, датой, регионом и без автоматического сохранения догадок.
- [x] В Product Brain записан media/document pipeline: фото, скрин, GIF, видео, аудио, PDF, Word, Excel, PowerPoint, CSV, архив, QR/штрих-код принимаются; чтение контента идёт через безопасный extractor; запись в каталог/акции/цены только черновиком и после подтверждения.
- [x] Матрица провайдеров расширена P0-блоками: `aray-knowledge-os`, `document-media-intelligence`, `federated-internet-search`.
- [x] `.env.example` получил заготовки для knowledge sync, event index, tool registry, document/media extractor, Vision OCR, Google Custom Search и search cache.
- [x] В Product Brain добавлен `Automation Passport`: новый универсальный контракт для функций/логики/сущностей, чтобы каждая новая часть платформы сразу проектировалась под one-click automation.
- [x] Липкий ARAY dock очищен: убраны встроенные установка и быстрые кнопки, чтобы чат был спокойным вводом.
- [x] Установка PWA вынесена в отдельную умную капсулу: контекст берётся из текущей страницы, manifest уже меняется под рабочий стол/биржу/терминал/CRM/каталог/заказы/сайт.
- [x] 07.05.2026: PWA install UX переведен из навязчивой автоплашки в постоянную тихую кнопку `Приложение` + правую `SidePanel`: закрытие больше не прячет установку навсегда и не вызывает повторный автопоказ, пользователь сам открывает капсулу, а ARAY подбирает текст и шаги под iPhone/Android/Chrome/Edge/другой браузер.
- [x] 07.05.2026: витринный PWA prompt тоже снят с таймеров `5s/25s`: вместо авто-баннера теперь постоянная капсула `Приложение`, системная установка запускается только по клику, ручные инструкции показываются под конкретное устройство.
- [x] 07.05.2026: ARAY PWA icon обновлен до ARAY-сферы с крупной золотой `A`; основной публичный путь `/api/pwa/icon?s=...`, старый `/api/admin/pwa-icon?s=...` оставлен совместимым. Production-logo с мелким текстом не используется как app icon, потому что на маленьких размерах он теряет читаемость.
- [x] 07.05.2026: проверено `npx tsc --noEmit --pretty false`, `npm run quality`, `/api/pwa/icon?s=192` 200, `/api/admin/pwa-icon?s=192` 200, `/api/pwa/manifest?app=aray-workspace` использует `/api/pwa/icon`.
- [x] Записана отдельная идея для обсуждения: `Биржа-витрина` по логике каталога ПилоРус с фото, отзывами и фильтрами, без ломки текущей терминальной биржи.
- [x] В Product Brain записан домен `aray.online`: основной домен платформы, wildcard-поддомены для сайтов участников, preview до публикации, custom domains как отдельный уровень и безопасный flow конструктора.
- [ ] Реализовать реальный extractor для DOCX/XLSX/PPTX/PDF: текст, таблицы, слайды, изображения, безопасные лимиты.
- [ ] Реализовать OCR/QR/штрих-код контур для фото товара, бумажных списков, накладных и каталогов.
- [ ] Реализовать audio/video pipeline: транскрипция, ключевые моменты, сценарии, привязка к задаче/товару/акции.
- [ ] Реализовать внутренний `Entity Index` и `Action Registry` как runtime API, а не только документ.
- [ ] Реализовать `Automation Passport` как runtime/schema helper: одна декларация сущности должна подсказывать route, search, permissions, events, TaskRelation, NotificationCenter, ARAY quick action и quality/preflight checks.
- [ ] Реализовать federated search API: внутренний поиск + Yandex Search + Google Custom Search + кеш + источник/дата/регион.
- [ ] Добавить в quality gate проверку: новая admin/store страница должна иметь PWA context, ARAY quick context, search context, role rules и responsive smoke.
- [ ] Visual pass умной PWA-капсулы на реальной logged-in сессии desktop/tablet/mobile: финально подогнать позицию кнопки относительно ARAY-чата, bottom nav, корзины, модалок и форм.

### Agent consolidation - 2026-05-07

- [x] Старые vision-документы сверены агентами: Apple/Yandex/Google/VK входы, inbox, Direct, SEO, бухгалтерия/налоги/ЭДО, voice/devices/calendar, медиа-документы и future constructor внесены в Product Brain.
- [x] `.env.example` и `npm run aray:keys` расширены группами: голос/устройства/календарь, SEO OAuth, бизнес-профили, карты, IndexNow, бухгалтерия, ЭДО, налоги и фискализация.
- [x] Зафиксирован порядок: сначала P0 core/sync/ARAY/биржа/аналитика/ключи/голос/SEO/inbox/accounting, потом P1 media/marketing/nearby/profiles, только после этого P2 constructor.

## Notification Drawer + Role Brain - 2026-05-07

Status: `READY_LOCAL / QUALITY_GREEN`

- [x] Header bell больше не открывает маленький absolute dropdown: уведомления перенесены в полноценный правый `SidePanel`, чтобы не ломать хедер.
- [x] В панели появились вкладки `Сигналы`, `Журнал`, `Архив`, `Настройки`.
- [x] Журнал поддерживает прочитано/непрочитано, архив и admin-only удаление с двухшаговым подтверждением в UI.
- [x] Страница `/admin/notifications` оставлена как рабочий центр рассылок и журнала; громоздкая таблица настроек убрана со страницы в popup.
- [x] Настройки ролей переведены на компактный iPhone-style UI: выбор роли, тихие часы, каналы и события через `aray-toggle`.
- [x] В матрицу добавлен `Клиент` и клиентские события: статус заказа, клиентская рассылка, напоминание ARAY.
- [x] Зафиксировано архитектурное правило: будущие роли не забивать навсегда в enum. Нужен Dynamic Role OS под бизнес: базовые роли + кастомные роли/группы/сегменты с настройками уведомлений.
- [x] Dynamic Role OS backend contract: добавлены schema-модели `BusinessRole`, `BusinessRoleMember`, `NotificationAudiencePreference` под кастомные роли, участников роли и audience-настройки уведомлений.
- [x] Добавлен `lib/dynamic-role-os.ts` с role templates для владельца, управляющего, продаж, склада, выезда, маркетинга, VIP-клиента и партнера.
- [x] `/api/admin/notifications/settings` через settings matrix теперь отдает `roleBlueprints`, а popup настроек показывает готовые шаблоны умных ролей без ломки текущей enum-матрицы.
- [x] Quality gate усилен: `scripts/validate-dynamic-role-os.js` подключен в `npm run quality`, чтобы новые чаты не потеряли schema/role/audience контракт.
- [x] Dynamic Role OS runtime slice: Prisma Client regenerated, DB synced; добавлен `/api/admin/business-roles` с create/update/archive/delete, template materialize, `sync_notifications`, `add_member/remove_member`.
- [x] `/admin/business/settings` получил `BusinessRoleOsPanel`: создание своей роли, подключение шаблонов ARAY, участники роли, синхронизация audience-настроек уведомлений.
- [x] Notification settings matrix теперь также отдает `businessRoleAudiences`, popup показывает подключенные кастомные роли и количество audience preferences рядом с текущей enum-матрицей.
- [x] Tenant-aware registry обновлен для `businessRole`, `businessRoleMember`, `notificationAudiencePreference`; Dynamic Role OS guard проверяет API, UI, settings bridge и tenant registry.
- [x] Checks: `node scripts/next-build-safe.js --command db:push`, `npx tsc --noEmit --pretty false`, `npm run quality`, dev smoke `GET /api/admin/business-roles` = 403 unauth, `/admin/business/settings` = 307 `/login`.
- [x] Dynamic Role OS staff binding: `BusinessRoleMember` получил `isPrimary`, `/api/admin/staff` теперь возвращает `primaryBusinessRoleId/businessRoles` и умеет назначать primary smart role при create/update сотрудника.
- [x] `/admin/staff` получил выбор `Умная роль ARAY`: выбранная бизнес-роль автоматически подставляет базовую enum-роль, должность и primary membership, не ломая старую ручную роль.
- [x] Добавлен первый scoped resolver `lib/business-role-access.ts`: собирает `roleKeys`, `actions`, `scopes`, `primaryRoleKey` и helper `canBusinessRoleAccessAction` поверх Dynamic Role OS.
- [x] Checks: `node scripts/next-build-safe.js --command db:push`, `npx tsc --noEmit --pretty false`, `node scripts/validate-dynamic-role-os.js`, `npm run quality`, dev smoke `GET /api/admin/staff` = 401 unauth, `/admin/staff` = 307 `/login`.
- [x] Dynamic Role OS permission bridge: `/api/admin/business-roles`, `/api/admin/notifications/settings` и `/api/admin/staff` умеют учитывать `canBusinessRoleAccessAction`/`canAccessWithBusinessRoles` для `roles.manage` и `notifications.manage`, сохраняя enum fallback.
- [x] Dynamic Role OS inline editing: `/admin/business/settings` теперь редактирует label/description/base role/scope/status прямо в карточке роли, а события и каналы notification seed переключаются через `aray-toggle`.
- [x] `/api/admin/business-roles` при изменении notification seed пересобирает audience preferences и гасит события, которые сняли с роли, чтобы старые уведомления не жили отдельно от UI.
- [x] Dynamic Role OS guard усилен проверкой inline editing. Checks: `npx tsc --noEmit --pretty false`, `node scripts/validate-dynamic-role-os.js`, `npm run quality`, dev smoke `GET /api/admin/business-roles` = 403, `/api/admin/notifications/settings` = 403, `/api/admin/staff` = 401, `/admin/business/settings` = 307.
- [ ] Следующий Dynamic Role OS slice: logged-in visual pass и постепенное подключение resolver к остальным живым permission checks разделов.
## ARAY Module Runtime Toggles - 2026-05-08

Status: `READY_LOCAL / TYPESCRIPT_GREEN`

- [x] Added `ArayModuleState` to Prisma and seeded local tenant rows for the first 8 module passports.
- [x] Module Control Center toggles now write to DB and compute requested/effective state from role policy, tenant plan, dependency graph and connector policy.
- [x] Core modules are locked from UI disable; business modules can be toggled by SUPER_ADMIN through `/api/admin/aray/modules`.
- [x] Terminal and Notifications now have server guards on pages/layouts and API routes.
- [x] Admin rail, mobile dock, search and ARAY navigation context receive disabled module ids from the server and hide disabled module routes.
- [x] PWA manifest/icon sync no longer removes Next-managed head icons; ARAY-managed icon links are tagged before client cleanup.
- [ ] Add module settings screens for role policy, subscription override and connector setup.
- [ ] Add module toggle history/audit log.
- [ ] Expand automatic quality gate to require route/API guard coverage for every runtime-controlled module.

## Night Memory / PiloRus Demo Slice - 2026-05-08

Status: `HANDOFF_RECORDED / QUALITY_GREEN`

- [x] Ночная память записана в `docs/ARAY_NIGHT_MEMORY_2026-05-08.md`.
- [x] `docs/ARAY_CONTINUE_PROMPT.md` теперь первым делом ведет к ночной памяти.
- [x] Зафиксирован главный утренний закон: не распыляться на весь космос; сначала довести demo/release slice ПилоРус.
- [x] Зафиксировано состояние Direct: API отвечает, кампания ПилоРус видна, запуск рекламы только после подтверждения владельца.
- [x] Зафиксировано состояние Метрики: UI-доступ есть, но API требует отдельный токен/scope; спрос и аналитику не выдумывать.
- [x] Зафиксирован спокойный PWA-закон: без капсулы, только тихий баннер/явный install intent, закрытие помнить.
- [x] Checks before sleep: `npm run quality` passed, `node scripts/audit-admin-routes.js` passed, `/admin/promotion` opened in browser without runtime overlay.
- [ ] Утром начать с `git status --short`, `npm run quality`, smoke основных страниц и P0-fix only.

## Section Approval Protocol - 2026-05-09

Status: `LOCKED / QUALITY_GUARDED`

- [x] Добавлен закон защиты разделов: `docs/SECTION_CHANGE_PROTOCOL.md`.
- [x] Добавлен журнал согласований: `docs/recovery/SECTION_CHANGE_LOG.md`.
- [x] Добавлен snapshot-инструмент: `npm run section:snapshot -- --file <path> --section <name> --reason <reason>`.
- [x] Добавлен guard: `scripts/validate-section-approval-protocol.js`.
- [x] `npm run quality` теперь проверяет, что протокол согласования разделов остается подключенным.
- [ ] После каждого изменения существующего раздела статус остается `DRAFT`, пока Арман явно не примет результат.
- [ ] Для `/admin/promotion` текущий Ads Hub DRAFT с генератором РК по категориям/товарам ожидает визуальное принятие Армана.

## ARAY Popup / Mobile / PWA Polish - 2026-05-07

Status: `IN_PROGRESS / FIRST_STANDARD_LOCKED`

- [x] Принят закон UI: новые admin popup/sheet идут через единый ARAY-стандарт (`AdminModal`, `SidePanel`, `admin-popup-liquid`, mobile bottom sheet). Новые ручные fixed/backdrop-попапы запрещены guard-ом.
- [x] `AdminModal` автоматически наследует `admin-popup-liquid`; `SidePanel` получил ARAY-default, общий blur-backdrop и одинаковую кнопку закрытия.
- [x] `scripts/validate-admin-ui-integrity.js` теперь проверяет ARAY popup standard: `AdminModal`, `SidePanel`, mobile sheet handle, bottom-slide animation и общий overlay flag для скрытия mobile dock.
- [x] Настройки терминала в терминале/бирже приведены к ARAY-popup виду: матовый blur overlay, `admin-popup-liquid`, аккуратная кнопка закрытия; drawer скриптов продаж тоже переведен на этот visual layer.
- [x] Мобильный dock закреплен как iPhone-style навигация: fixed center, ARAY по центру, подписи не ломают ширину, при открытом popup dock уходит вниз.
- [x] Терминал `/admin/orders/new`: мобильная корзина, скрипты продаж, настройки терминала, смена/касса и mobile variant sheet подключены к overlay law, чтобы нижняя панель не перекрывала кнопки.
- [x] Header polish: единая compact back-кнопка с hover-glow, refresh справа, уведомления доступны рядом с поиском на mobile, desktop search стал шире и резиновее для длинных заголовков.
- [x] Mobile menu polish: install-app card с закрытием, контекстные быстрые пункты из navigation/search context, ARAY центр не меняется.
- [x] Мобильное меню и мобильные уведомления стали полноценными ARAY bottom sheets: общий handle, blur backdrop, безопасные `safe-area`, wider sheet вместо тесной карточки.
- [x] В уведомлениях `Система` переименована в `Внутри ARAY`, чтобы человеку было понятно: это внутренний канал ARAY/app, не SMS и не Telegram.
- [x] В настройках уведомлений добавлен блок `Подключения каналов`: Push/PWA, Telegram, Email, SMS, Внутри ARAY. SMS честно помечен как канал, требующий провайдера.
- [x] PWA icon закреплен: ARAY/admin/app-контексты используют `/api/pwa/icon?s=...`, ПилоРус-витрина и основной favicon остаются на ПилоРус-логотипе. Push default icon выбирает ARAY для `/admin/*` и ПилоРус для публичного сайта.
- [ ] Следующий проход по popup debt: `admin-menu-popup`, `aray-settings-popup`, media/posts/services/products custom modals переводить короткими безопасными миграциями через `AdminModal`/`SidePanel`, без новых allowlist-исключений.
- [ ] Voice/mic settings next: отдельный ARAY sheet для графика голоса, устройства, выходных, тихих часов, согласия пользователя и стоп-кнопки.
