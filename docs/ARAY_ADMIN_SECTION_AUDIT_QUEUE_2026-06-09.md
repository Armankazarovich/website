# ARAY Admin Section Audit Queue

Date: 2026-06-09
Project: `D:\проект\pilorus\website`
Production domain: `pilo-rus.ru`

## Ground Rules

- This chat works on ARAY Production / PiloRus only.
- `D:\Zeder` and `zaidr.ru` are separate work and are not the source of truth here.
- Local `http://localhost:3101` must run from `D:\проект\pilorus\website`.
- Every section is checked in the same rhythm: open, load data, try safe action, save draft if possible, reload, check mobile/tablet/desktop, record status.
- Dangerous actions are not executed without confirmation: delete, publish, domain, payments, release, mass destructive import.

## Already Verified On 2026-06-09

- Correct folder confirmed: `D:\проект\pilorus\website`.
- Local 3101 switched away from Zeder to PiloRus.
- Production `pilo-rus.ru` health was checked earlier and responded healthy.
- Local health core works: database and orders are OK. Local status is degraded only because local Telegram token and Google AI secret are not configured.
- TypeScript passed: `npx tsc --noEmit`.
- Admin navigation passed: `npm run nav:check`.
- ARAY modules registry passed: `npm run modules:check`.
- Module navigation contract passed: `npm run module-nav:check`.
- Release smoke passed: `npm run release:smoke`.
- Release readiness passed: `npm run release:check`.
- ARAY assistant passed: `npm run aray:assistant`.
- Cart checkout contract passed: `npm run cart:check`.
- Store constructor contract passed: `npm run constructor:check`.
- Content tools passed: `npm run content:check`.
- Release protection passed: `npm run protection:check`.
- PWA icons passed: `npm run pwa:check`.
- Analytics passed: `npm run analytics:check`.
- Finance integration passed: `npm run finance:check`.
- Yandex Direct integration passed: `npm run direct:check`.
- Dynamic Role OS passed: `npm run role-os:check`.
- Popup layer guard passed: `npm run popups:check`.
- Store stories contract passed: `npm run stories:check`.
- Section approval protocol passed: `npm run section-approval:check`.
- Architecture audit passed: `npm run architecture:check`.
- Browser cart flow passed on local server: `npm run browser:cart:check:prod`.
- Browser mobile store flow passed on local server: `npm run browser:mobile:check:prod`.
- Browser stories responsive passed on local server: `npm run browser:stories:check:prod`.
- Design system guard was fixed and now passes: `npm run design:check`.

## Fixed In This Pass

- Old forbidden radii were moved to approved `rounded-xl` / `rounded-2xl` patterns.
- Hardcoded UI colors were moved toward design tokens and CSS variables.
- Permanent small/medium/large shadows and backdrop blur violations were removed from changed UI surfaces.
- Destructive inline alerts were moved to `admin-alert admin-alert-danger`.
- Filled selected states in ARAY CMS controls were softened to token-based selected styles.
- ARAY A mark colors now use CSS variables instead of raw hex/rgb values.

## Queue Order

### 1. Catalog Core

Status: completed in this pass.

Pages:
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]`
- `/admin/products/audit`
- `/admin/products/import-prices`
- `/admin/import`
- `/admin/categories`
- `/admin/product-types`

What to verify:
- product list loads fast and filters/search do not break;
- create/edit product draft works;
- variant, price, stock, image, category, SEO fields save and survive reload;
- import/export gives clear preview and does not silently overwrite;
- product audit explains missing images/prices/categories;
- mobile layout does not hide important actions.

Manual audit progress:
- `Fixed` `/admin/products` on 2026-06-09: opened locally at `http://localhost:3101/admin/products`, product data loaded (60 products), mobile layout kept key actions visible, hidden-products filter worked (`3 из 60`), browser console had no app errors. Added URL-persisted product search by name, slug, category, and variant size; search survived reload (`q=ЦСП`), clear action returned to the full list, and filtered selection now drops products hidden by the current filter/search. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/products/new` on 2026-06-09: opened locally, categories loaded, required fields and variant controls were available, and a safe hidden draft was created: `ARAY audit draft 20260609131253` (`cmq6nv61s000212uizacm77fn`, `active: false`). Verified saved name, slug, category, inactive status, short/SEO descriptions, variant size, price per m³, price per piece, pieces per m³, and in-stock state in the database and after browser reload. Fixed the mobile save panel so it no longer overlays form fields, made status/recommended toggles stateful and accessible, and changed the hidden draft public link label from `На сайте` to `Предпросмотр`. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `OK` `/admin/products/[id]` on 2026-06-09: edited the same hidden audit draft safely, saved a new short description and changed the variant price per piece from `75` to `80`. Browser save returned `Сохранено`, reload preserved the values, and database verification confirmed the product stayed hidden (`active: false`) with size `25×100×6000`, price per m³ `12345`, price per piece `80`, pieces per m³ `67`, and `inStock: true`.
- `Fixed` `/admin/products/audit` on 2026-06-09: opened locally after first-load compile, data loaded (121 products, 967 variants, 171 issues), and the audit clearly explained variants without prices, products without photos, and empty categories. No catalog-changing action was executed. Fixed row-level audit actions so single `Скрыть` / `Показать` / `Деактивировать` actions now ask for confirmation before changing catalog data, matching the existing bulk-action protection. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/products/import-prices` on 2026-06-09: opened locally, CSV instructions and upload/paste field loaded, preview stayed disabled on empty input, and a safe supplier-price preview was run without applying changes. Preview showed matched rows, old/new prices, changed count, and zero unmatched rows for the test product `Брус обрезной 1 сорт ГОСТ (Сосна/Ель)`. Verified the two-step apply protection (`Применить изменения` → `Да, применить` / `Отмена`) and canceled before applying; database prices remained unchanged (`100×100×6000`: `17000` / `1065`). Fixed the mobile apply panel so it sits above the admin bottom navigation and confirmation buttons are reachable. Verified with `npx tsc --noEmit` and `npm run design:check`.

- `Fixed` `/admin/import` on 2026-06-09: opened locally at `http://localhost:3101/admin/import`, Google Sheets and Excel/CSV blocks loaded, export links were visible, and the Excel/CSV apply button stayed disabled before a file preview. Fixed the product import flow so uploaded CSV/XLSX files now run through a server-side `preview=1` dry run before any write, show rows/updated/created/errors in the UI, and require a second explicit confirmation before applying. The import API now skips all catalog writes during preview, returns preview counts, scopes variant/product/category lookup to the current tenant, revalidates catalog paths only after a real import, and rejects real imports with no matched changes. Verified a safe authenticated preview with a one-row CSV (`updated: 1`, `created: 0`, no errors) and confirmed the checked variant price stayed unchanged in the database. Cleaned table whitespace in `/admin/products/import-prices` preview tables to avoid React table hydration warnings. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Input received` `/admin/import` on 2026-06-11: received WooCommerce CSV `wc-product-export-11-6-2026-1781182114661.csv` from the user and parsed it safely without applying changes. File contains 1,937 product rows: 350 variable products, 1,250 variations, and 337 simple products. Next step is a dry-run mapping/import preview against the PiloRus catalog before any catalog write.
- `Fixed` `/admin/categories` on 2026-06-09: local in-app browser automation was unavailable after the `/admin/import` check, so this pass used authenticated local HTTP/API checks plus code review. The page responded 200, the categories API loaded 6 tenant-scoped categories, and an invalid empty-category create attempt returned 400 with the database count unchanged. Fixed the category UI so new categories start hidden from menu/footer by default instead of being silently published, and the row-level `show` / `hide` action now asks for confirmation before changing public navigation. Existing delete protection remains in place and the API blocks deleting categories with products or child categories. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/product-types` on 2026-06-09: verified locally through authenticated HTTP/API checks after the in-app browser automation became unavailable. The page responded 200, the product-types API loaded 22 items, and an invalid PATCH without an items array returned 400 with the saved `product_type_settings` value unchanged. Fixed the main save action so changes to catalog filters, SEO text, and sitemap now require an explicit confirmation before being written. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Started` `/admin/suppliers` multivendor foundation on 2026-06-11: added first controlled marketplace layer without changing the public catalog checkout path. New Prisma models `Supplier` and `SupplierOffer` attach seller offers to existing `ProductVariant` rows, so PiloRus keeps one SEO/catalog surface while admins can track vendor prices, stock, lead time, and preferred offers per size. Added admin page `/admin/suppliers`, supplier and offer APIs, navigation/search/permissions wiring, catalog action link, business settings link, `npm run multivendor:check`, and release readiness coverage. Verified with `npm run multivendor:check`, `npm run nav:check`, `npx tsc --noEmit --pretty false`, `npm run design:check`, `npm run text:check`, and `npm run release:check`. Local `prisma db push` is blocked until disk `C:` has free space because local PostgreSQL reports `No space left on device`; production deploy should apply schema where the server DB has space.
- `Fixed` marketplace home and seller offers on 2026-06-12: added public `/marketplace` as **ПилоРус Биржа пиломатериалов**, wired it into desktop/tablet/mobile navigation, and seeded the current PiloRus catalog as seller N1 offers without duplicating products. Candidate sellers `derevotrade`, `pilmos`, `derevo-lider`, and `faneragroup` now have source URLs/contact profiles and preliminary offer rows with controlled +/- 1-5% retail price spread for preview only. Added unpublished `marketing-draft` review templates with `approved: false` so real public reviews still require source verification. Updated `npm run multivendor:check` to guard marketplace home, no-duplicate offer seeding, review draft safety, and public navigation.
- `Fixed` storefront/admin launch hardening on 2026-06-11: production checks showed intermittent slow HTTPS/static responses and a draft public product at `/product/bad-krasivyy`. Added explicit no-store headers for `/admin`, `/cabinet`, `/checkout`, `/login`, and `/api/admin`, bumped the PiloRus service-worker cache version so old PWA caches are purged on activate, and added an idempotent data migration that deactivates the draft storefront slugs `bad-krasivyy`, `bad-krasivy`, and `bad-krasivyj`. Server/network latency still needs VPS-level monitoring because even static assets sometimes respond slowly from production.
- `Fixed` `/admin/products/[id]` publication status on 2026-06-11: hidden products no longer show the misleading `Товар готов к публикации` readiness line or a public preview link that opens a 404. The editor now shows `Скрыт с сайта` and explains that the public page is unavailable until the product is activated. Verified with `npx tsc --noEmit --pretty false` and `npm run design:check`. In-app browser automation could not run because the local `C:` drive is full and the browser runtime fails with `Недостаточно места на диске`.

### 2. Inventory And Media

Status: completed in this pass.

Pages:
- `/admin/inventory`
- `/admin/images/fix`
- `/admin/media`
- `/admin/watermark`
- `/admin/watermark/recovery`

What to verify:
- stock table loads and edits safely;
- low stock/on order/out of stock states are clear;
- image repair tools do not damage good images;
- media upload/search/gallery actions are understandable;
- watermark recovery has confirmation and rollback path.

Manual audit progress:
- `Fixed` `/admin/inventory` on 2026-06-09: local in-app browser automation was unavailable, so this pass used authenticated local HTTP/API checks plus code review. The page responded 200 and the movement journal endpoint loaded through the page. Fixed the inventory page to show only variants for the current tenant and to allow only inventory roles. Fixed warehouse CSV import so selecting a file now runs a server-side `preview=1` dry run first, shows the selected file and update count, and requires a second explicit confirmation before applying stock/status/threshold changes. Verified dry-run import with English and Russian CSV headers (`updated: 1`, `rows: 1`, no errors) and confirmed the checked variant stayed unchanged in the database. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/images/fix` on 2026-06-09: verified locally through authenticated HTTP/API checks after in-app browser automation stayed unavailable. The page responded 200 and the image diagnostic API returned 60 tenant products with zero duplicates, zero broken refs, zero missing images, and zero wm duplicates. Fixed the `remove_wm_duplicates` repair action so it removes only a `wm-` image that has a matching original image beside it, instead of removing every `wm-` image whenever any original exists on the product. The UI now shows the wm repair action only when exact wm duplicates are detected, and products with only wm-duplicate issues appear in the problem list. No repair action was executed. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/media` on 2026-06-09: verified locally through authenticated HTTP/API checks. The page responded 200 and the media API returned 115 files without hitting the 1000-file limit (`hasMore: false`), with 69 used and 46 free. Single and bulk delete controls are limited to files the API reports as unused and still require confirmation. Fixed media usage detection so reviews, promotions, and site settings are included before a file can be shown/deleted as free; `media_alt_map` and `watermark_backup` are intentionally ignored so ALT metadata and rollback snapshots do not block cleanup. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/watermark` and `/admin/watermark/recovery` on 2026-06-09: verified locally through authenticated HTTP/API checks. `/admin/watermark`, `/api/admin/watermark`, `/admin/watermark/recovery`, and `/api/admin/watermark-recovery` responded 200. Recovery reported 60 tenant products, 10 orphaned originals, 0 orphaned `wm-` files, and 0 products needing restore; smart restore dry-run returned 0 matches and 0 unmatched, and no restore/apply/cleanup action was executed. Fixed `/admin/watermark` so only `SUPER_ADMIN` and `ADMIN` can open the page, matching the API. Hardened watermark upload/settings/apply: uploaded logos are now validated as PNG/WebP/SVG up to 5MB and converted to real PNG, watermark options are normalized server-side, and unsafe image paths are rejected (`/images/../secret.png` returned 400). Fixed watermark recovery API to scope all product reads/writes to the current tenant and to validate manual recovery image URLs before saving. Verified with `npx tsc --noEmit` and `npm run design:check`.

### 3. Orders And Clients

Status: completed in this pass.

Pages:
- `/admin/orders`
- `/admin/orders/new`
- `/admin/orders/[id]`
- `/admin/orders/trash`
- `/admin/clients`
- `/admin/crm`
- `/admin/crm/automation`

What to verify:
- new order can be created from safe test data;
- status, manager, client, payment, delivery and comments save;
- trash/restore flow is protected;
- client card shows orders/history;
- CRM pipeline and automation do not expose fake buttons.

Manual audit progress:
- `Fixed` `/admin/orders` on 2026-06-09: opened locally through authenticated HTTP/API checks after in-app browser automation was unavailable. The page responded 200, order data loaded, and URL-persisted search was added for order number, client, phone, address/place, status/source labels, and UTM fields. Bulk delete now returns the actual deleted count, selection resets when search/filter changes, and API edits are blocked for trashed orders. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/orders/new` on 2026-06-09: page responded 200, product picker now uses the sellable public terminal catalog instead of raw admin products, and an authenticated safe audit order was created locally then cancelled. Verified item creation, invalid empty order rejection, and no stock drift for the tested variant. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/orders/[id]` on 2026-06-09: detail page responded 200, client/payment/delivery/comment edits saved and survived reload/API read. Added server validation so manually added order items can only use public, sellable variants from visible categories. Active orders can no longer be permanently deleted through the hard-delete endpoint. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/orders/trash` on 2026-06-09: page responded 200. Restore now has its own confirmation dialog, permanent delete is allowed only for orders already in trash, and restore only targets actually trashed orders. No destructive trash action was executed. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/clients` on 2026-06-09: page responded 200 and client history/contact data loaded. A temporary client address edit was saved then restored. Managers can edit basic client contacts, but password reset, delete, and staff promotion controls are hidden from them; the API also blocks manager role promotion and scopes client update/delete to the current tenant. Invalid admin promotion returned 400/403 without changing the user role. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/crm` on 2026-06-09: page responded 200 and CRM leads/orders APIs responded 200. Invalid lead create requests now return 400 for empty name, bad stage, and invalid assignee; assignees are validated as active staff in the current tenant. The order kanban no longer mutates trashed orders, repeated same-status updates return `unchanged` without re-sending side effects, order status changes from CRM now trigger real workflow events, and syncing orders into leads now requires confirmation. Existing active workflows were detected, so no audit lead was created to avoid triggering real automations. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/crm/automation` on 2026-06-09: page responded 200 and workflow/log APIs responded 200. Workflows and workflow logs are now tenant-scoped, missing workflow PATCH returns 404, preset application requires confirmation, new preset workflows are created disabled, and toggling a workflow active/inactive requires confirmation. The workflow engine now filters active rules by tenant and executes lead/order/task/document actions within the same tenant. Lead-created, lead-stage-changed, and CRM order-status-changed triggers are now wired to real events instead of being only visible labels. Verified with `npx tsc --noEmit` and `npm run design:check`.

### 4. Operations

Status: completed in this pass.

Pages:
- `/admin/tasks`
- `/admin/workflows`
- `/admin/messenger`
- `/admin/notifications`
- `/admin/staff`
- `/admin/director`
- `/admin/health`

What to verify:
- tasks can be created/assigned/closed;
- workflow statuses are visible;
- messenger opens without blocking admin;
- notifications settings and bell are consistent;
- staff roles are understandable and protected;
- health page separates critical and optional services.

Manual audit progress:
- `Fixed` `/admin/tasks` on 2026-06-10: verified locally through authenticated HTTP/API checks. The page responded 200, task API loaded, invalid status returned 400, and a safe audit task was created then closed: `ARAY Operations audit task 20260610151509` (`cmq817hh90006slwngxo10l6y`). A comment save check also returned 200, and a blank-title PATCH returned 400. Hardened task APIs so reads/writes are tenant-scoped, deleted orders cannot be attached, blank titles/sort order/date/status/priority are validated server-side, assignees must belong to the current tenant, and task relation hrefs are limited to internal admin/cabinet links. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/workflows` on 2026-06-10: page and workflow API responded 200. Empty workflow names now return 400. A safe disabled audit workflow draft was created and saved: `ARAY audit workflow 20260610151509` (`cmq817iu60009slwn3nye444z`, `active: false`). Workflow list/update/delete APIs are now tenant-scoped, new workflows are created disabled by default, default workflow seeding deduplicates by tenant/name and creates disabled rules, and enable/disable in the UI now requires confirmation. No workflow was activated. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `OK` `/admin/messenger` on 2026-06-10: page responded 200 and the route is protected for staff communication roles. The page only opens the embedded ARAY Messenger shell with URL-driven search/dial context and does not mutate data on load. No blocking behavior was found during code/API review and local page check.
- `Fixed` `/admin/notifications` on 2026-06-10: page, notification center, settings, push debug, and subscriber APIs responded 200; an empty push-send request returned 400 without sending. Added confirmations before manual push broadcast, duplicate cleanup, and Telegram webhook setup. Push send/debug/subscribers/cleanup now scope registered users to the current tenant, validate broadcast segment, trim title/body, and force notification URLs to internal paths. Telegram setup remains admin-only. No push broadcast, cleanup, or webhook setup action was executed. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` order status notifications on 2026-06-11: changing order status from `/admin/orders/[id]` or the CRM order kanban now records a guaranteed internal staff notification, passes previous status to workflows, records push deliveries with order metadata, and surfaces zero push subscribers as a visible failed delivery instead of a silent queued event. The admin bell feed now includes unread order-status events, and order-status notification settings are enabled for staff roles by default. PiloRus address remains `Химки, ул. Заводская 2А, стр.28`; customer status/email/Telegram texts use that address. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/staff` on 2026-06-10: page and staff API responded 200, and invalid status updates returned 400 without changing staff data. Removed predictable role default passwords (`admin123`, etc.); selecting a role now generates a random password only when the field is empty. Staff status changes now require confirmation before opening or blocking access, and staff APIs return 400 for malformed JSON instead of falling through. Delete still has an explicit inline confirmation and self-delete remains blocked. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `OK` `/admin/director` on 2026-06-10: page responded 200. Director metrics and role-specific panels are tenant-scoped and respect smart-cabinet visibility for finance, staff, tasks, inventory, CRM, and operations links. No data-changing action was available or executed.
- `Fixed` `/admin/health` on 2026-06-10: page and health API responded 200. Health counters for products, orders, users, variants, SMTP settings, push subscribers, product image/price checks, and stale orders now use the current tenant. The missing ARAY AI provider key is now reported as a warning/optional capability instead of a critical system error, so health separates core breakage from optional integrations more honestly. Verified with `npx tsc --noEmit` and `npm run design:check`.

### 5. ARAY Production

Status: completed in this pass.

Pages:
- `/admin/aray`
- `/admin/aray/orders`
- `/admin/aray/builder`
- `/admin/aray/briefs`
- `/admin/aray/modules`
- `/admin/aray/connectors`
- `/admin/aray/partners`
- `/admin/aray/brand-kit`
- `/admin/aray/requisites`
- `/admin/aray/costs`
- `/admin/aray/arc`
- `/admin/aray/agents`

What to verify:
- ARAY orders move from lead to brief to builder;
- builder creates a clear site plan from blocks;
- modules show passport/status/route truthfully;
- connectors do not pretend connected services are active;
- partners/requisites/costs are protected;
- assistant opens the right admin section and asks confirmation for dangerous actions.

Manual audit progress:
- `Fixed` ARAY Production on 2026-06-10: verified locally through authenticated HTTP/API checks. All section pages responded 200: `/admin/aray`, `/admin/aray/orders`, `/admin/aray/builder`, `/admin/aray/briefs`, `/admin/aray/modules`, `/admin/aray/connectors`, `/admin/aray/partners`, `/admin/aray/brand-kit`, `/admin/aray/requisites`, `/admin/aray/costs`, `/admin/aray/arc`, and `/admin/aray/agents`. Read APIs for modules, connectors, costs, subscriptions, and release responded 200; `/api/admin/aray` is POST-only and returned 405 on GET as expected. Fixed ARAY order/brief/builder/partner reads so leads, tasks, task relations, connectors, and partner applications are scoped to the current tenant. Hardened public ARAY marketing and partnership forms so malformed JSON and invalid name/phone return 400, user text is length-limited, partnership email HTML is escaped, and created CRM records carry the current tenant. Added confirmation requirements before preparing launch tasks, saving block plans, creating site shells, creating sites from scan, cloning ARAY CMS sites, changing module state/policy, running Yandex connector write actions, and changing ARAY budget subscriptions; matching APIs now reject unconfirmed writes with 400. Removed inactive fake builder buttons and replaced them with honest non-clickable status rows. No site clone, site shell, module toggle, Yandex goal creation, subscription create/delete, or destructive action was executed. Verified with `npx tsc --noEmit`, `npm run design:check`, authenticated page/API smoke checks, and negative no-confirm POST/PATCH/DELETE checks.

### 6. Site Factory And Settings

Status: completed in this pass.

Pages:
- `/admin/site`
- `/admin/site/constructor`
- `/admin/site/releases`
- `/admin/site/benchmarks`
- `/admin/appearance`
- `/admin/settings`
- `/admin/business/settings`
- `/admin/delivery`
- `/admin/delivery/rates`
- `/admin/email`

What to verify:
- site settings save and are visible on public pages;
- constructor has a clear next step and preview;
- releases are protected;
- delivery and email settings do not expose secrets;
- appearance changes do not break the design system.

Manual audit progress:
- `Fixed` Site Factory And Settings on 2026-06-10: verified locally through authenticated HTTP/API checks. Pages responded 200: `/admin/site`, `/admin/site/constructor`, `/admin/site/releases`, `/admin/site/benchmarks`, `/admin/appearance`, `/admin/settings`, `/admin/business/settings`, `/admin/delivery`, `/admin/delivery/rates`, and `/admin/email`. Read APIs responded 200 for site settings, appearance, site constructor blueprints/sites, delivery rates, email, SMTP settings, PiloRus PWA manifest, favicon, apple-touch, and 192px icon assets. Hardened site settings, appearance, site constructor, delivery rates, delivery status changes, and email tools so important writes require explicit confirmation, settings are tenant-scoped, SMTP secrets stay masked, email send/import/register paths are bounded and tenant-aware, HTML is sanitized, and email URL scanning blocks localhost/private/internal targets. Unified PiloRus PWA/favicons so `public/logo.png` is the single source: the generator now also writes a valid `public/favicon.ico` with 16/32/48 PNG entries, the static manifest uses install-safe icons, and the site icon cache version was bumped. Negative no-confirm checks returned 400 for site settings, appearance, site constructor save, delivery rate create/delete, email SMTP save/send/import, and private URL scan. No publish, site clone, delivery tariff write, SMTP save, email send, email import/register, or destructive action was executed. Verified with `npx tsc --noEmit`, `npm run design:check`, `npm run pwa:check`, authenticated page/API smoke checks, and negative no-confirm checks.

### 7. Marketing And Content

Status: completed in this pass.

Pages:
- `/admin/promotion`
- `/admin/promotions`
- `/admin/posts`
- `/admin/stories`
- `/admin/reviews`
- `/admin/services`
- `/admin/help`
- `/admin/analytics`
- `/admin/finance`
- `/admin/exchange`
- `/admin/terminals`
- `/admin/terminals/training`

What to verify:
- promotion pages show real campaigns and next action;
- posts/stories/reviews/services can be edited safely;
- analytics and finance explain missing integrations;
- terminals/training have a usable path for managers.

Manual audit progress:
- `Fixed` Marketing And Content on 2026-06-11: verified locally through authenticated HTTP/API checks. Pages responded 200: `/admin/promotion`, `/admin/promotions`, `/admin/posts`, `/admin/stories`, `/admin/reviews`, `/admin/services`, `/admin/help`, `/admin/analytics`, `/admin/finance`, `/admin/terminals`, and `/admin/terminals/training`; `/admin/exchange` returned its expected 307 redirect. Public `/contacts` and `/about` responded 200 after contact/requisite updates. Hardened marketing/content writes so promotions, posts, stories, reviews, services, review admin replies, finance expenses, Direct readiness, Metrika goals, SEO actions, terminal integrations, terminal autoconfig, workstations, shifts, payments, print jobs, and ARAY terminal module actions require explicit confirmation server-side and in the UI where applicable. Confirmed no-confirm negative checks returned 400 for all newly protected endpoints. Updated PiloRus contacts and requisites to `ООО «ДЕРЕВОЛИДЕР»`, hotline `+7 (499) 372-04-41`, support `+7 (495) 135-02-03`, Sberbank requisites, and MAX link; PiloRus address remains `Химки, ул. Заводская 2А, стр.28`. Added the new legal/bank fields to `/admin/site`, public contacts/about pages, defaults, footer, and current tenant site settings. Rechecked PWA/favicons with `npm run pwa:check`. Verified with `npx tsc --noEmit`, `npm run design:check`, `npm run pwa:check`, authenticated page/API smoke checks, and contact HTML checks.
- `Deploy data` Marketing And Content on 2026-06-11: added an idempotent `prisma/data-migrate.ts` settings step so production deploy also upserts the new PiloRus phones, address, legal requisites, bank details, and MAX link for the default tenant instead of relying only on code defaults.
- `Fixed` PWA icons and Direct legal readiness on 2026-06-11: regenerated PiloRus PWA/favicons from the clean transparent `logo.svg` mark instead of the detailed full logo tile, bumped the site icon cache version, and updated the release guard. Cleaned public legal identity for launch: `/privacy`, `/terms`, schema.org, `/about`, home FAQ/about text, product JSON-LD seller, footer/header fallbacks, and the legacy admin migrate helper now use `ООО «ДЕРЕВОЛИДЕР»`, OGRN/INN/KPP and the existing PiloRus address `Химки, ул. Заводская 2А, стр.28`. Added explicit personal-data consent to public contact, service, product request, promo, checkout registration, account drawer registration, registration page, product review and home review forms; matching public APIs now reject missing consent for contacts, orders, promo requests, registration, and reviews. Verified old `ООО «ПИТИ»`/old phones are no longer found in public code, and checked against official Yandex Direct requirements for page correctness and seller/contact data. Verified with `npx tsc --noEmit --pretty false`, `npm run design:check`, `npm run pwa:check`, `npm run direct:check`, `npm run text:check`, `npm run cart:check`, `npm run release:check`, and `npm run release:smoke`.
- `Needs mapped sync` pil-mos catalog parity on 2026-06-11: found a reliable public source at `https://pil-mos.ru/wp-json/wc/store/products`; it returned 176 products while current PiloRus admin API returned 60 products, and automatic slug/name matching found 0 safe matches. No mass catalog import was applied in this Marketing pass because it would create a second catalog beside the current one instead of safely updating existing products. Next Catalog Core follow-up should build an explicit pil-mos -> PiloRus mapping/import preview before applying assortment and price changes, with prices equal or up to 2% lower as requested.

### 8. Marketplace Direction And Vendor Core

Status: started.

Pages:
- `/admin`
- `/admin/products`
- `/admin/suppliers`
- `/admin/promotion`
- `/admin/analytics`
- `/admin/settings`
- service-only ARAY routes

What to verify:
- daily admin navigation starts from marketplace work, not old site-builder work;
- sellers/vendors are discoverable from menu, search, mobile menu, account drawer, and catalog quick actions;
- ARAY builder/project/release routes stay available for owner/service use but do not distract normal PiloRus operators;
- the next Vendor Core layer can build on `/admin/suppliers` without renaming confusion.

Manual audit progress:
- `Fixed` marketplace direction on 2026-06-12: created `docs/PILORUS_MARKETPLACE_LAW_2026-06-12.md` as the project law. It fixes PiloRus as the timber marketplace etalon, keeps future sport nutrition/biohacking on separate domains and servers, defines timber monetization as monthly service/ads-first, defines sport nutrition as future commission/referral-friendly, and sets the Vendor Core order.
- `Fixed` admin navigation packaging on 2026-06-12: changed visible admin language from generic shop/constructor toward marketplace terms. The products group is now `Биржа`, suppliers are shown as `Продавцы / Поставщики`, current site editing is `Редактор витрины`, and old ARAY launch/builder/project/release routes are service/search/direct-only instead of normal daily menu paths. Header search, side search, mobile menu, account drawer context, business settings, quick actions, nav rail subtitles, and the constructor guard now prioritize catalog, sellers, orders, Direct/SEO, analytics, roles, and current storefront settings. Verified with `npm run constructor:check`, `npm run nav:check`, `npm run multivendor:check`, `npx tsc --noEmit --pretty false`, `npm run design:check`, and `npm run text:check`.
- `Fixed` ARAY CMS visibility on 2026-06-12: decided to keep ARAY CMS as an internal platform engine for future cloning, separate servers, new niches, and owner/developer service routes, but remove it from daily PiloRus navigation. The desktop rail, mobile menu, and account drawer no longer expose the ARAY CMS group; the top active-site switcher was removed from the normal admin header so PiloRus operators see the marketplace workflow first. Direct/search/service access remains available for owner/developer work. Verified with `npm run nav:check`, `npx tsc --noEmit --pretty false`, and `npm run design:check`.
- `Fixed` Vendor Core storefront layer on 2026-06-12: extended sellers from supplier-price rows into marketplace profiles with source site URL, logo, public description, specialization, delivery summary, storefront publish flag, featured seller marker, and marketplace order. Added public seller pages `/vendors` and `/vendors/[slug]`, with PiloRus seeded as seller N1 and ДеревоТрейд, Pilmos, ДеревоЛидер, and ФанераГрупп seeded as scan candidates. `/admin/suppliers` now manages sellers, storefront readiness, source URLs for future scans, and seller offers. Seller PWA is accepted as a later layer after storefronts, permissions, and scan/import preview.

## Status Labels

- `OK`: opened, data loaded, safe action works, reload works, no obvious layout break.
- `Fixed`: issue found and repaired in this pass.
- `Needs work`: issue found, repair queued.
- `Blocked`: needs credential, production-only service, or user confirmation.

## Recommended Next Step

Start the next clean chat with this file and the first manual audit target:

`D:\проект\pilorus\website\docs\ARAY_ADMIN_SECTION_AUDIT_QUEUE_2026-06-09.md`

Next section to audit manually: Vendor Core on top of `/admin/suppliers`, then Catalog Core pil-mos assortment/price parity with a mapped import preview from the WooCommerce Store API.
