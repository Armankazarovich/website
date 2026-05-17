# ARAY / ПилоРус — проверка боеспособности

Дата: 17.05.2026  
Контур: локально `http://localhost:3101` + production smoke `https://pilo-rus.ru`

## Что проверено

- PWA: манифесты витрины и админки, PWA-иконка, service worker, контекстная установка ARAY-приложений.
- Уведомления: центр уведомлений, счетчик, лента, push-контур, health-сигналы.
- Задачи: страница задач, мобильная раскладка, API задач, навигация.
- CRM: лиды, канбан заказов, мобильная версия, API CRM.
- Терминал: новый заказ, каталог терминала, профиль, смены, рабочие места, мобильная версия.
- Мини-корзина / корзина / checkout: загрузка корзины из БД, мобильная корзина, оформление заказа.
- Витрина ПилоРус: карточки товара, price/list/grid views, мобильные и десктопные popup-окна выбора размеров, светлая и темная темы.
- Аналитика: API, UI, готовность, Direct/Метрика-сигналы, валидатор интеграции.
- Финансы: API, UI на планшете, расчетный контур, валидатор финансов.
- Админ-навигация и модули: структура, мобильная адаптивность, popup-слои, производительность.
- Production: публичные страницы, auth-редиректы, API, SEO/static/PWA/security.

## Что улучшено

- Исправлен слой cookie-баннера: теперь он не перекрывает мобильные popup/sheet-окна выбора размеров.
- Стабилизированы карточки размеров товара на телефонах: на узких iPhone размеры больше не сжимаются, цена не наезжает на единицу измерения, длинные размеры имеют `title`.
- Укреплен popup выбора размеров в карточках и price/list-режиме: сетка стала адаптивной, без горизонтального переполнения и с нормальным скроллом.
- В CRM-автоматизациях убраны декоративные emoji из названий и описаний, чтобы раздел выглядел взрослее и не спорил с интерфейсом.
- В терминале укорочен placeholder поиска: на телефоне больше нет ощущения срезанного текста.
- Терминальный поиск переведен на стабильный компактный размер текста.
- `npm run test:prod` и `npm run backup` переведены со старого `D:/pilorus/...` на относительные пути, чтобы команды работали из текущего проекта `D:\проект\pilorus`.

## Результаты проверок

- `npx tsc --noEmit --pretty false` — PASS.
- `npm run lint` — PASS, остались только старые предупреждения по hooks/alt text, не от текущих правок.
- `npm run quality` — PASS.
- `npm run build:ci` — PASS, production-сборка успешно создана.
- `npm run design:check` — PASS.
- `npm run nav:check` — PASS.
- `npm run modules:check` — PASS.
- `npm run module-nav:check` — PASS.
- `npm run popups:check` — PASS.
- `npm run analytics:check` — PASS.
- `npm run finance:check` — PASS.
- `npm run role-os:check` — PASS.
- `node scripts/validate-admin-responsive.js` — PASS.
- `node scripts/validate-admin-ui-integrity.js` — PASS.
- `node scripts/validate-admin-performance.js` — PASS.
- `npm run aray:assistant` — PASS.
- `npm run direct:check` — PASS.
- `npm run test:prod` — PASS: 44 проверки, 42 OK, 2 предупреждения.
- Мобильный popup размеров: проверены первые 10 карточек на ширинах 390 и 430 px — критичных наложений и обрезаний не найдено.
- Публичные страницы: проверены 8 ключевых страниц на 390 и 1280 px — горизонтального переполнения и runtime-ошибок не найдено.
- Админка: проверены 12 ключевых разделов на 390 и 768 px — мобильных/планшетных переполнений и login-loop не найдено.
- CRM automation: проверена на 390, 768 и 1280 px — лишние emoji в карточках сценариев убраны.

## Живые API

Локально с админской сессией получили `200 OK`:

- `/api/pwa/manifest?app=aray-workspace`
- `/api/pwa/icon?s=192`
- `/api/admin/health`
- `/api/admin/notifications/count`
- `/api/admin/notifications/feed`
- `/api/admin/tasks`
- `/api/admin/crm/leads`
- `/api/admin/crm/orders-kanban`
- `/api/admin/terminal/catalog`
- `/api/admin/terminal/profile`
- `/api/admin/terminal/workstations`
- `/api/admin/terminal/shifts`
- `/api/admin/analytics?range=30`
- `/api/admin/finance`
- `/api/cart/load`

## Проверенные страницы

Публичная витрина:

- `/`
- `/catalog?view=list`
- `/cart`
- `/checkout`
- `/contacts`
- `/delivery`
- `/privacy`
- `/terms`

Админка:

- `/admin`
- `/admin/orders/new`
- `/admin/crm`
- `/admin/crm/automation`
- `/admin/tasks`
- `/admin/notifications`
- `/admin/terminals`
- `/admin/analytics`
- `/admin/finance`
- `/admin/promotion`
- `/admin/aray/connectors`
- `/admin/products`

## Что держим на контроле

- `npm run aray:keys` показывает недостающие обязательные ключи: `YANDEX_API_KEY`, `YANDEX_FOLDER_ID`, `YANDEX_SEARCH_API_TOKEN`, `YANDEX_WORDSTAT_TOKEN`.
- Локальный health дает предупреждения: dev-память, SMTP, Telegram, watermark backup.
- Production smoke дает 2 предупреждения: телефоны не найдены в HTML главной, возможно из-за динамического вывода. Нужно отдельно решить, хотим ли продублировать телефоны в статическом SEO-слое.
- Метрика OAuth в аналитике пока отображается как не подключенная, если токен/цели не настроены.
- Юридическая чистота документов и процессов требует отдельной проверки по актуальным требованиям. Текущая проверка была технической, не юридическим заключением.
- Перед платным трафиком нужно финально сверить публичную оферту, правила возврата, доставку/оплату, реквизиты продавца, согласие на обработку персональных данных и доступность политики на всех формах сбора данных.

## Юридические ориентиры для отдельной проверки

- Персональные данные: ст. 18.1 152-ФЗ требует доступный документ о политике обработки персональных данных для сайтов, где идет сбор данных: https://www.consultant.ru/document/cons_doc_LAW_61801/eeeebe22bf738fd65bb66b95cc278911ae2525ee/
- Дистанционная продажа: ст. 26.1 закона о защите прав потребителей требует заранее раскрывать информацию о продавце, товаре, цене, доставке, оплате и возврате: https://www.consultant.ru/document/cons_doc_LAW_305/1525b1a2f037db240c8e6a749619f86e53857f13/

## Итог

Технически проект в хорошем состоянии: основные разделы открываются, API отвечают, сборка проходит, production сейчас живой. Для полного боевого режима осталось закрыть внешние ключи и каналы связи: Yandex AI/Search/Wordstat, SMTP, Telegram, backup оригинальных фото, SEO-дублирование телефонов и отдельный юридический документный проход перед платным трафиком.
